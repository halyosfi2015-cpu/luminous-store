/**
 * PART 4 — SALES INTELLIGENCE
 * ===========================
 * Deterministic sales engine over canonical orders. Every metric has a
 * canonical source; rate-style metrics return "insufficient_data" when the
 * denominator does not exist. With zero orders, sales facts are simply empty.
 */

import type { Product } from "@/src/types/product";
import { onlyPublished } from "@/src/lib/publication";
import type { Order } from "@/types/cart";
import {
  aggregateProductSales,
  isCancelledOrder,
  isRevenueOrder,
  ordersBetween,
  salesByDay,
  sumItemCount,
  sumRevenue,
  sumShipping,
  toProductSalesRows,
} from "./aggregate";
import type {
  BrandPerformance,
  BrandSalesRow,
  CategoryPerformance,
  CategorySalesRow,
  ProductPerformance,
  ProductSalesRow,
  SalesSummary,
} from "./types";
import { getProductStockInfo } from "./inventory";
import type { StoreOpsState } from "./types";

export { salesByDay };

export function computeSalesSummary(orders: Order[]): SalesSummary {
  const revenueOrders = orders.filter(isRevenueOrder);
  const gross = sumRevenue(orders);
  const cancelled = sumRevenue(orders.filter(isCancelledOrder));
  const net = Math.max(0, gross - cancelled);
  const completed = orders.filter((o) => isRevenueOrder(o) && o.status !== "pending");
  const itemCount = sumItemCount(revenueOrders);

  return {
    orderCount: orders.length,
    completedOrderCount: completed.length,
    cancelledOrderCount: orders.filter(isCancelledOrder).length,
    itemCount,
    grossSalesYER: gross,
    cancelledSalesYER: cancelled,
    netSalesYER: net,
    shippingYER: sumShipping(orders),
    averageOrderValueYER: completed.length > 0 ? Math.round(net / completed.length) : "insufficient_data",
    averageItemsPerOrder: completed.length > 0 ? Math.round((itemCount / completed.length) * 100) / 100 : "insufficient_data",
    discountImpact: {
      available: orders.some((o) => typeof (o as { discount_total?: number }).discount_total === "number"),
      noteAr: "لا توجد بيانات خصومات مسجلة",
      amountYER: null,
    },
    returnImpact: {
      available: false,
      noteAr: "لا توجد بيانات مرتجعات مسجلة",
      amountYER: null,
    },
    hasOrders: orders.length > 0,
  };
}

export interface SalesEngineInput {
  products: Product[];
  orders: Order[];
  now: string;
  velocityWindowDays?: number;
  trendWindowDays?: number;
}

export function salesByProduct(orders: Order[]): ProductSalesRow[] {
  return toProductSalesRows(aggregateProductSales(orders)).sort((a, b) => b.revenueYER - a.revenueYER);
}

export function salesByCategory(orders: Order[], products: Product[]): CategorySalesRow[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const rows = new Map<string, CategorySalesRow>();
  for (const row of salesByProduct(orders)) {
    const product = byId.get(row.productId);
    const slug = product?.categorySlug ?? "uncategorized";
    const catAr = product?.categoryAr ?? "غير مصنف";
    const cur = rows.get(slug) ?? { categorySlug: slug, categoryAr: catAr, units: 0, revenueYER: 0 };
    cur.units += row.units;
    cur.revenueYER += row.revenueYER;
    rows.set(slug, cur);
  }
  return [...rows.values()].sort((a, b) => b.revenueYER - a.revenueYER);
}

export function salesByBrand(orders: Order[], products: Product[]): BrandSalesRow[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const rows = new Map<string, BrandSalesRow>();
  for (const row of salesByProduct(orders)) {
    const product = byId.get(row.productId);
    const brand = product?.brand ?? "غير معروف";
    const cur = rows.get(brand) ?? { brand, units: 0, revenueYER: 0 };
    cur.units += row.units;
    cur.revenueYER += row.revenueYER;
    rows.set(brand, cur);
  }
  return [...rows.values()].sort((a, b) => b.revenueYER - a.revenueYER);
}

/* ------------------------------------------------------------------------ */
/* PRODUCT PERFORMANCE                                                       */
/* ------------------------------------------------------------------------ */

export function productClassificationLabelAr(c: ProductPerformance["classification"]): string {
  switch (c) {
    case "STAR":
      return "نجم";
    case "GROWING":
      return "نمو";
    case "STABLE":
      return "مستقر";
    case "WEAK":
      return "ضعيف";
    case "AT_RISK":
      return "خطر";
    case "DEAD_STOCK":
      return "مخزون راكد";
    default:
      return "بيانات غير كافية";
  }
}

/** Deterministic product classification from sales + inventory facts. */
export function classifyProduct(
  input: {
    revenueYER: number;
    units: number;
    averageDailySales: number;
    trend: number | null;
    stockStatus: string;
    hasOrderData: boolean;
  },
): ProductPerformance["classification"] {
  if (!input.hasOrderData) return "INSUFFICIENT";
  if (input.stockStatus === "DEAD_STOCK") return "DEAD_STOCK";
  if (input.revenueYER <= 0 && input.units <= 0) return "DEAD_STOCK";
  if (input.stockStatus === "OUT_OF_STOCK") return "AT_RISK";
  if (input.trend !== null && input.trend >= 0.25) return "GROWING";
  if (input.revenueYER >= 250000) return "STAR";
  if (input.trend !== null && input.trend <= -0.25) return "AT_RISK";
  if (input.averageDailySales <= 0.05) return "WEAK";
  return "STABLE";
}

export function computeProductPerformance(state: StoreOpsState, input: SalesEngineInput): ProductPerformance[] {
  const published = onlyPublished(input.products);
  const allSales = salesByProduct(input.orders);
  const salesMap = new Map(allSales.map((s) => [s.productId, s]));
  const hasOrderData = input.orders.length > 0;
  const trend = input.trendWindowDays ?? state.settings.trendWindowDays;

  const now = input.now;
  const trendStart = new Date(Date.parse(now) - trend * 86400000).toISOString();
  const recent = ordersBetween(input.orders, trendStart, now);
  const recentAgg = aggregateProductSales(recent);

  const results: ProductPerformance[] = [];
  for (const product of published) {
    const info = getProductStockInfo(state, product, input.orders, now);
    const s = salesMap.get(product.id) ?? { productId: product.id, units: 0, revenueYER: 0, orderCount: 0 };
    const previous = (s.units - (recentAgg.get(product.id)?.units ?? 0));
    const nowUnits = recentAgg.get(product.id)?.units ?? 0;
    const trendValue = previous > 0 ? Math.round(((nowUnits - previous) / previous) * 1000) / 1000 : nowUnits > 0 ? 1 : 0;
    const classification = classifyProduct({
      revenueYER: s.revenueYER,
      units: s.units,
      averageDailySales: info.averageDailySales,
      trend: trendValue > 0 ? trendValue : trendValue < 0 ? trendValue : null,
      stockStatus: info.status,
      hasOrderData,
    });
    results.push({
      productId: product.id,
      nameAr: product.name?.ar ?? product.id,
      brand: product.brand ?? "",
      categorySlug: product.categorySlug ?? "uncategorized",
      unitsSold: s.units,
      revenueYER: s.revenueYER,
      orderCount: s.orderCount,
      averageDailySales: info.averageDailySales,
      trend: trendValue === 0 ? null : trendValue,
      stockStatus: info.status,
      currentStock: info.currentStock,
      classification,
      classificationLabelAr: productClassificationLabelAr(classification),
    });
  }
  return results.sort((a, b) => b.revenueYER - a.revenueYER);
}

/* ------------------------------------------------------------------------ */
/* CATEGORY PERFORMANCE                                                      */
/* ------------------------------------------------------------------------ */

export function computeCategoryPerformance(state: StoreOpsState, input: SalesEngineInput): CategoryPerformance[] {
  const published = onlyPublished(input.products);
  const bySlug = new Map<string, Product[]>();
  for (const p of published) {
    const slug = p.categorySlug ?? "uncategorized";
    const list = bySlug.get(slug) ?? [];
    list.push(p);
    bySlug.set(slug, list);
  }
  const catSales = salesByCategory(input.orders, published);
  const completedOrders = input.orders.filter((o) => isRevenueOrder(o) && o.status !== "pending").length;
  const now = input.now;
  const trend = input.trendWindowDays ?? state.settings.trendWindowDays;
  const trendStart = new Date(Date.parse(now) - trend * 86400000).toISOString();

  return catSales.map((row): CategoryPerformance => {
    const products = bySlug.get(row.categorySlug) ?? [];
    const recent = salesByCategory(ordersBetween(input.orders, trendStart, now), published);
    const recentRow = recent.find((r) => r.categorySlug === row.categorySlug);
    const prevRevenue = row.revenueYER - (recentRow?.revenueYER ?? 0);
    const trendValue = prevRevenue > 0 ? (recentRow?.revenueYER ?? 0) / prevRevenue - 1 : recentRow ? 1 : 0;
    return {
      categorySlug: row.categorySlug,
      categoryAr: row.categoryAr,
      productCount: products.length,
      unitsSold: row.units,
      revenueYER: row.revenueYER,
      averageOrderContributionYER: completedOrders > 0 ? Math.round(row.revenueYER / completedOrders) : "insufficient_data",
      trend: trendValue === 0 ? null : Math.round(trendValue * 1000) / 1000,
      lowStockCount: products.filter((p) => getProductStockInfo(state, p, input.orders, now).status === "LOW_STOCK").length,
      outOfStockCount: products.filter((p) => getProductStockInfo(state, p, input.orders, now).status === "OUT_OF_STOCK").length,
      topProducts: salesByProduct(input.orders.filter((o) =>
        o.items.some((i) => i.productId && (byIdOf(published, i.productId)?.categorySlug ?? null) === row.categorySlug),
      )).slice(0, 5),
    };
  }).sort((a, b) => b.revenueYER - a.revenueYER);
}

function byIdOf(products: Product[], id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

/* ------------------------------------------------------------------------ */
/* BRAND PERFORMANCE                                                         */
/* ------------------------------------------------------------------------ */

export function computeBrandPerformance(state: StoreOpsState, input: SalesEngineInput): BrandPerformance[] {
  const published = onlyPublished(input.products);
  const brandSales = salesByBrand(input.orders, published);
  const now = input.now;
  const trend = input.trendWindowDays ?? state.settings.trendWindowDays;
  const trendStart = new Date(Date.parse(now) - trend * 86400000).toISOString();

  return brandSales.map((row) => {
    const products = published.filter((p) => p.brand === row.brand);
    const recent = salesByBrand(ordersBetween(input.orders, trendStart, now), published);
    const recentRow = recent.find((r) => r.brand === row.brand);
    const prevRevenue = row.revenueYER - (recentRow?.revenueYER ?? 0);
    const trendValue = prevRevenue > 0 ? (recentRow?.revenueYER ?? 0) / prevRevenue - 1 : recentRow ? 1 : 0;
    return {
      brand: row.brand,
      brandAr: products[0]?.brandAr ?? row.brand,
      productCount: products.length,
      unitsSold: row.units,
      revenueYER: row.revenueYER,
      trend: trendValue === 0 ? null : Math.round(trendValue * 1000) / 1000,
      lowStockCount: products.filter((p) => getProductStockInfo(state, p, input.orders, now).status === "LOW_STOCK").length,
      outOfStockCount: products.filter((p) => getProductStockInfo(state, p, input.orders, now).status === "OUT_OF_STOCK").length,
      topProducts: salesByProduct(input.orders.filter((o) =>
        o.items.some((i) => i.productId && published.some((p) => p.id === i.productId && p.brand === row.brand)),
      )).slice(0, 5),
    };
  }).sort((a, b) => b.revenueYER - a.revenueYER);
}