/**
 * PART 4 — MARKETING ↔ COMMERCE BRIDGE
 * ====================================
 * Cross-domain insights: how published content/campaigns relate to product
 * performance and stock. Content↔commerce recommendations are deterministic;
 * the word "مرتبط بالأداء" (performance-linked) is used because the link is
 * observed from canonical order + content data, not AI attribution.
 */

import type { Product } from "@/src/types/product";
import { onlyPublished } from "@/src/lib/publication";
import type { Order } from "@/types/cart";
import type { MarketingCommerceInsight } from "./types";
import { getProductStockInfo, unitsSoldWindow } from "./inventory";
import type { StoreOpsState } from "./types";
import { getContentStoreSync } from "@/src/lib/content-ops/store";
import { listPublished } from "@/src/lib/content-ops/operations";

export interface MarketingDataInput {
  contentCountByProduct?: Record<string, number>;
  campaignCountByProduct?: Record<string, number>;
}

/** Collect published-content + campaign counts from the content-ops store. */
export function collectContentStats(): MarketingDataInput {
  const store = getContentStoreSync();
  const contentCountByProduct: Record<string, number> = {};
  const campaignCountByProduct: Record<string, number> = {};
  for (const p of listPublished(store)) {
    for (const pid of p.productIds ?? []) contentCountByProduct[pid] = (contentCountByProduct[pid] ?? 0) + 1;
  }
  for (const c of [...store.campaigns.values()]) {
    for (const pid of c.productIds ?? []) campaignCountByProduct[pid] = (campaignCountByProduct[pid] ?? 0) + 1;
  }
  return { contentCountByProduct, campaignCountByProduct };
}

export function buildMarketingCommerceInsights(
  state: StoreOpsState,
  products: Product[],
  orders: Order[],
  now: string,
  data: MarketingDataInput = {},
): MarketingCommerceInsight[] {
  const published = onlyPublished(products);
  const salesMap = new Map<string, number>();
  for (const order of orders) {
    if (!["delivered", "confirmed", "processing", "shipped", "completed"].includes(order.status)) continue;
    for (const item of order.items) {
      salesMap.set(item.productId, (salesMap.get(item.productId) ?? 0) + item.quantity);
    }
  }
  const window = state.settings.velocityWindowDays;
  const contentMap = data.contentCountByProduct ?? {};
  const campaignMap = data.campaignCountByProduct ?? {};

  const insights: MarketingCommerceInsight[] = [];
  for (const product of published) {
    const info = getProductStockInfo(state, product, orders, now);
    const windowUnits = unitsSoldWindow(orders, product.id, window, now);
    const contentCount = contentMap[product.id] ?? 0;
    const campaignCount = campaignMap[product.id] ?? 0;
    const hasPublishedContent = contentCount > 0;
    const demand = salesMap.get(product.id) ?? 0;

    let recommendationAr: string;
    if (info.status === "OUT_OF_STOCK" && demand > 0) {
      recommendationAr = hasPublishedContent
        ? "أعد الطلب فوراً — المحتوى المنشور يوجّه طلباً على منتج غير متوفر."
        : "أعد الطلب فوراً — المنتج مرتفع الطلب (مرتبط بالأداء).";
    } else if (info.status === "LOW_STOCK" && demand > 0) {
      recommendationAr = hasPublishedContent
        ? "أعد الطلب قريباً — المحتوى مرتبط بالأداء وقد ينفد المخزون."
        : "أعد الطلب — المنتج مرتفع الطلب (مرتبط بالأداء).";
    } else if (info.status === "DEAD_STOCK") {
      recommendationAr = "المخزون راكد — خفّض الكمية أو أنشئ عرضاً ترويجياً لتحريكه.";
    } else if (info.status === "OVERSTOCK" && windowUnits <= 1) {
      recommendationAr = "المخزون أعلى من الحركة — ضعه في حملة ترويجية.";
    } else if (demand >= 3 && !hasPublishedContent) {
      recommendationAr = "أنشئ محتوى تسويقي لهذا المنتج (مرتبط بالأداء).";
    } else {
      recommendationAr = "المستوى الحالي مناسب.";
    }

    insights.push({
      productId: product.id,
      nameAr: product.name?.ar ?? product.id,
      stockStatus: info.status,
      currentStock: info.currentStock,
      unitsSoldWindow: windowUnits,
      hasPublishedContent,
      contentCount,
      campaignCount,
      recommendationAr,
    });
  }
  return insights.sort((a, b) => b.unitsSoldWindow - a.unitsSoldWindow).slice(0, 500);
}

export interface ContentInventoryConflict {
  productId: string;
  nameAr: string;
  stockStatus: string;
  currentStock: number;
  publishedContentCount: number;
  activeCampaignCount: number;
  issueAr: string;
}

/** Content↔inventory conflicts (published content pointing at unavailable stock). */
export function detectContentInventoryConflicts(
  state: StoreOpsState,
  products: Product[],
  orders: Order[],
  now: string,
  data: MarketingDataInput = {},
): ContentInventoryConflict[] {
  const published = onlyPublished(products);
  const contentMap = data.contentCountByProduct ?? {};
  const campaignMap = data.campaignCountByProduct ?? {};
  const conflicts: ContentInventoryConflict[] = [];
  for (const product of published) {
    const info = getProductStockInfo(state, product, orders, now);
    const contentCount = contentMap[product.id] ?? 0;
    const campaignCount = campaignMap[product.id] ?? 0;
    if (contentCount === 0 && campaignCount === 0) continue;
    if (info.status === "OUT_OF_STOCK" || info.status === "LOW_STOCK") {
      conflicts.push({
        productId: product.id,
        nameAr: product.name?.ar ?? product.id,
        stockStatus: info.status,
        currentStock: info.currentStock,
        publishedContentCount: contentCount,
        activeCampaignCount: campaignCount,
        issueAr:
          info.status === "OUT_OF_STOCK"
            ? "يوجد محتوى/حملة تشير لمنتج غير متوفر — سيتحول الزوار إلى طلبات غير مكتملة."
            : "المخزون منخفض بينما المحتوى موجه للمنتج — أعد الطلب قبل نفاد الكمية.",
      });
    }
  }
  return conflicts.sort((a, b) => b.publishedContentCount - a.publishedContentCount);
}

export function conflictsForDashboard(conflicts: ContentInventoryConflict[]): ContentInventoryConflict[] {
  return conflicts.slice(0, 10);
}