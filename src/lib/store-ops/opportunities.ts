/**
 * PART 4 — OPPORTUNITY ENGINE
 * ===========================
 * Suggests commercial opportunities (restock, cross-sell, bundle, content).
 * Opportunities are SUGGESTIONS — they never take action on their own unless
 * an Admin action (or an explicitly configured automation) executes them.
 */

import type { Product } from "@/src/types/product";
import { onlyPublished } from "@/src/lib/publication";
import type { Order } from "@/types/cart";
import type { CrossSellSet, BundleCandidate, Opportunity } from "./types";
import { getProductStockInfo } from "./inventory";
import type { StoreOpsState } from "./types";
import { salesByProduct } from "./sales";
import { ordersBetween, sumRevenue } from "./aggregate";
import { appendBusinessAudit, makeBusinessAudit } from "./audit";
import { persistStoreOps } from "./store";

export interface OpportunityInput {
  products: Product[];
  orders: Order[];
  now: string;
  contentCountByProduct?: Record<string, number>;
  campaignCountByProduct?: Record<string, number>;
}

function rid(kind: string, entity: string): string {
  return `opp:${kind}:${entity.replace(/[^a-zA-Z0-9:_-]/g, "_")}`;
}

export function scoreOpportunity(o: Omit<Opportunity, "score">): Opportunity {
  const impact = Math.max(0, Math.min(1, o.impact));
  const urgency = Math.max(0, Math.min(1, o.urgency));
  const confidence = Math.max(0, Math.min(1, o.confidence));
  return { ...o, score: Math.round((impact * 0.5 + urgency * 0.3 + confidence * 0.2) * 1000) / 1000 };
}

/* ------------------------------------------------------------------------ */
/* CROSS-SELL / BUNDLE                                                       */
/* ------------------------------------------------------------------------ */

function pairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

/** Co-purchase frequency across orders (only revenue orders). */
export function detectCrossSell(orders: Order[], products: Product[]): CrossSellSet[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const pairCount = new Map<string, number>();
  const productCount = new Map<string, number>();
  for (const order of orders) {
    if (!["delivered", "confirmed", "processing", "shipped", "completed"].includes(order.status)) continue;
    const ids = [...new Set(order.items.map((i) => i.productId).filter(Boolean))];
    for (const id of ids) productCount.set(id, (productCount.get(id) ?? 0) + 1);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = pairKey(ids[i], ids[j]);
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
      }
    }
  }
  const sets: CrossSellSet[] = [];
  for (const [key, count] of pairCount) {
    if (count < 2) continue;
    const [a, b] = key.split("::");
    const pa = byId.get(a);
    const pb = byId.get(b);
    if (!pa || !pb) continue;
    const support = productCount.get(a) ?? 0;
    sets.push({
      productIds: [a, b],
      productNamesAr: [pa.name?.ar ?? a, pb.name?.ar ?? b],
      frequency: count,
      support: support > 0 ? Math.round((count / support) * 10000) / 100 : "insufficient_data",
    });
  }
  return sets.sort((x, y) => y.frequency - x.frequency).slice(0, 30);
}

export function buildBundleCandidates(crossSell: CrossSellSet[], products: Product[]): BundleCandidate[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return crossSell.slice(0, 10).map((s) => {
    const a = byId.get(s.productIds[0]);
    const b = byId.get(s.productIds[1]);
    const aPrice = a?.pricing?.price ?? 0;
    const bPrice = b?.pricing?.price ?? 0;
    const total = aPrice + bPrice;
    const discount = Math.round(total * 0.05);
    return {
      id: `bundle:${s.productIds.join("_")}`,
      productIds: s.productIds,
      productNamesAr: s.productNamesAr,
      frequency: s.frequency,
      rationaleAr: `تم شراء المنتجين معاً ${s.frequency} مرة — اقتراح باقة بخصم ${discount} YER`,
    };
  });
}

/* ------------------------------------------------------------------------ */
/* OPPORTUNITIES                                                             */
/* ------------------------------------------------------------------------ */

export function detectOpportunities(state: StoreOpsState, input: OpportunityInput): Opportunity[] {
  const opportunities: Opportunity[] = [];
  const published = onlyPublished(input.products);
  const hasOrderData = input.orders.length > 0;
  const now = input.now;
  const contentMap = input.contentCountByProduct ?? {};
  const campaignMap = input.campaignCountByProduct ?? {};

  // High demand / low stock
  if (hasOrderData) {
    const sales = salesByProduct(input.orders);
    const salesMap = new Map(sales.map((s) => [s.productId, s]));
    for (const product of published) {
      const info = getProductStockInfo(state, product, input.orders, now);
      const sold = salesMap.get(product.id);
      if (!sold) continue;
      const isHighDemand = sold.units >= 5 || sold.revenueYER >= 150000;
      if (isHighDemand && (info.status === "LOW_STOCK" || info.status === "AT_RISK" || info.status === "OUT_OF_STOCK")) {
        const urgency = info.status === "OUT_OF_STOCK" ? 1 : info.status === "LOW_STOCK" ? 0.7 : 0.4;
        opportunities.push(
          scoreOpportunity({
            id: rid("high_demand_low_stock", product.id),
            kind: "high_demand_low_stock",
            titleAr: `إعادة طلب: ${product.name?.ar ?? product.id}`,
            descriptionAr: `منتج عالي الطلب (${sold.units} قطعة / ${sold.revenueYER} YER) بمخزون منخفض (${info.currentStock}).`,
            impact: 0.8,
            confidence: 0.7,
            urgency,
            evidence: [`units=${sold.units}`, `revenue=${sold.revenueYER}`, `stock=${info.currentStock}`, `status=${info.status}`],
            commercialValueYER: sold.revenueYER,
            productIds: [product.id],
            categorySlug: product.categorySlug ?? null,
            actionLabelAr: "إنشاء طلب إعادة",
            actionRoute: "/admin/store-ops/inventory",
          }),
        );
      }
    }
  }

  // High stock / low demand (only when order data exists)
  if (hasOrderData) {
    const sales = salesByProduct(input.orders);
    const salesMap = new Map(sales.map((s) => [s.productId, s]));
    for (const product of published) {
      const info = getProductStockInfo(state, product, input.orders, now);
      if (info.status !== "OVERSTOCK" && info.status !== "NORMAL") continue;
      const sold = salesMap.get(product.id);
      const units = sold?.units ?? 0;
      const revenue = sold?.revenueYER ?? 0;
      if (units <= 1 && info.currentStock >= 10) {
        opportunities.push(
          scoreOpportunity({
            id: rid("high_stock_low_demand", product.id),
            kind: "high_stock_low_demand",
            titleAr: `مخزون أعلى من الطلب: ${product.name?.ar ?? product.id}`,
            descriptionAr: `المنتج لم يُبع إلا ${units} مرة لكن مخزونه ${info.currentStock} قطعة.`,
            impact: 0.4,
            confidence: 0.6,
            urgency: 0.2,
            evidence: [`units=${units}`, `revenue=${revenue}`, `stock=${info.currentStock}`],
            commercialValueYER: null,
            productIds: [product.id],
            categorySlug: product.categorySlug ?? null,
            actionLabelAr: "إنشاء محتوى ترويجي",
            actionRoute: "/admin/ai/content",
          }),
        );
      }
    }
  }

  // Rising product (trend > threshold, positive sales)
  if (hasOrderData) {
    const trend = state.settings.trendWindowDays;
    const trendStart = new Date(Date.parse(now) - trend * 86400000).toISOString();
    const recentSales = new Map(salesByProduct(ordersBetween(input.orders, trendStart, now)).map((s) => [s.productId, s]));
    const byId = new Map(published.map((p) => [p.id, p]));
    for (const [id, s] of recentSales) {
      const product = byId.get(id);
      if (!product) continue;
      const info = getProductStockInfo(state, product, input.orders, now);
      if (s.units >= 3 && s.revenueYER >= 50000 && info.status !== "OUT_OF_STOCK") {
        const contentCount = contentMap[id] ?? 0;
        opportunities.push(
          scoreOpportunity({
            id: rid("rising_product", id),
            kind: "rising_product",
            titleAr: `منتج صاعد: ${product.name?.ar ?? id}`,
            descriptionAr: `ارتفاع الطلب على المنتج مؤخراً (${s.units} قطعة / ${s.revenueYER} YER).`,
            impact: 0.6,
            confidence: 0.6,
            urgency: 0.4,
            evidence: [`recentUnits=${s.units}`, `recentRevenue=${s.revenueYER}`, `contentCount=${contentCount}`],
            commercialValueYER: s.revenueYER,
            productIds: [id],
            categorySlug: product.categorySlug ?? null,
            actionLabelAr: "إنشاء محتوى",
            actionRoute: "/admin/ai/content",
          }),
        );
      }
    }
  }

  // Rising category
  if (hasOrderData) {
    const trend = state.settings.trendWindowDays;
    const trendStart = new Date(Date.parse(now) - trend * 86400000).toISOString();
    const recent = sumRevenue(ordersBetween(input.orders, trendStart, now));
    const previous = sumRevenue(input.orders) - recent;
    if (previous > 0 && recent / previous >= 1.5) {
      opportunities.push(
        scoreOpportunity({
          id: rid("rising_category", "all"),
          kind: "rising_category",
          titleAr: "نمو إجمالي في المبيعات",
          descriptionAr: `المبيعات خلال الفترة الأخيرة (${recent} YER) أعلى بنسبة ${Math.round((recent / previous) * 100)}% من بقية الفترة.`,
          impact: 0.5,
          confidence: 0.5,
          urgency: 0.3,
          evidence: [`recent=${recent}`, `previous=${previous}`],
          commercialValueYER: recent,
          productIds: [],
          categorySlug: null,
          actionLabelAr: "مراجعة التقارير",
          actionRoute: "/admin/store-ops",
        }),
      );
    }
  }

  // Content opportunity (high demand product with no published content)
  if (hasOrderData) {
    const sales = salesByProduct(input.orders);
    const byId = new Map(published.map((p) => [p.id, p]));
    for (const s of sales.slice(0, 20)) {
      const product = byId.get(s.productId);
      if (!product) continue;
      const contentCount = contentMap[s.productId] ?? 0;
      const campaignCount = campaignMap[s.productId] ?? 0;
      if (s.units >= 3 && contentCount === 0) {
        opportunities.push(
          scoreOpportunity({
            id: rid("content_opportunity", s.productId),
            kind: "content_opportunity",
            titleAr: `فرصة محتوى: ${product.name?.ar ?? s.productId}`,
            descriptionAr: `منتج مطلوب (${s.units} قطعة) دون أي محتوى منشور — مناسب لإنشاء محتوى تسويقي.`,
            impact: 0.5,
            confidence: 0.6,
            urgency: 0.3,
            evidence: [`units=${s.units}`, `contentCount=${contentCount}`, `campaignCount=${campaignCount}`],
            commercialValueYER: s.revenueYER,
            productIds: [s.productId],
            categorySlug: product.categorySlug ?? null,
            actionLabelAr: "إنشاء محتوى",
            actionRoute: "/admin/ai/content",
          }),
        );
      }
    }
  }

  // Campaign opportunity
  if (hasOrderData) {
    const sales = salesByProduct(input.orders);
    const byId = new Map(published.map((p) => [p.id, p]));
    for (const s of sales.slice(0, 15)) {
      const product = byId.get(s.productId);
      if (!product) continue;
      const campaignCount = campaignMap[s.productId] ?? 0;
      if (s.units >= 4 && campaignCount === 0) {
        opportunities.push(
          scoreOpportunity({
            id: rid("campaign_opportunity", s.productId),
            kind: "campaign_opportunity",
            titleAr: `فرصة حملة: ${product.name?.ar ?? s.productId}`,
            descriptionAr: `منتج أداء جيد دون حملة تسويقية مسجلة — مناسب لإدراجه في حملة.`,
            impact: 0.6,
            confidence: 0.5,
            urgency: 0.3,
            evidence: [`units=${s.units}`, `campaignCount=${campaignCount}`],
            commercialValueYER: s.revenueYER,
            productIds: [s.productId],
            categorySlug: product.categorySlug ?? null,
            actionLabelAr: "إنشاء حملة",
            actionRoute: "/admin/campaigns",
          }),
        );
      }
    }
  }

  // Cross-sell opportunities
  const crossSell = detectCrossSell(input.orders, published);
  for (const set of crossSell.slice(0, 10)) {
    opportunities.push(
      scoreOpportunity({
        id: rid("cross_sell", set.productIds.join("_")),
        kind: "cross_sell",
        titleAr: `توصية مزدوجة: ${set.productNamesAr.join(" + ")}`,
        descriptionAr: `تم شراء المنتجين معاً ${set.frequency} مرة — اقتراح عرض "اشتري معاً".`,
        impact: 0.4,
        confidence: 0.7,
        urgency: 0.2,
        evidence: [`frequency=${set.frequency}`, `support=${set.support}`],
        commercialValueYER: null,
        productIds: set.productIds,
        categorySlug: null,
        actionLabelAr: "عرض في المتجر",
        actionRoute: null,
      }),
    );
  }

  return opportunities.sort((a, b) => b.score - a.score);
}

export async function applyOpportunityAction(
  state: StoreOpsState,
  opportunityId: string,
  action: "acknowledge" | "dismiss",
  actor: string,
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  appendBusinessAudit(
    state,
    makeBusinessAudit({
      actor,
      action: action === "acknowledge" ? "OPPORTUNITY_ACKNOWLEDGED" : "ALERT_DISMISSED",
      entityType: "opportunity",
      entityId: opportunityId,
      previous: null,
      new: action,
      at: new Date().toISOString(),
      reason: "إجراء يدوي من المدير",
    }),
  );
  await persistStoreOps(state);
  return { ok: true };
}