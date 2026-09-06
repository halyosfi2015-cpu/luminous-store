/**
 * PART 4 — EXECUTIVE DASHBOARD
 * ============================
 * Composes the deterministic engines into a single executive view. Every
 * figure traces back to a canonical source; missing denominators render as
 * "insufficient_data" and unavailable figures as null with an explicit note.
 */

import type { Product } from "@/src/types/product";
import { onlyPublished } from "@/src/lib/publication";
import type { Order } from "@/types/cart";
import type { ExecutiveDashboard, StoreOpsState, StoreHealth } from "./types";
import { salesByProduct, salesByCategory } from "./sales";
import { computeFinanceSummary } from "./finance";
import { buildInventoryOverview } from "./inventory";
import { computeOrderIntelligence } from "./orders";
import { detectAnomalies } from "./anomalies";
import { attentionSummary, openAlerts } from "./alerts";
import { buildPriceIntelligence } from "./price";
import { detectContentInventoryConflicts, collectContentStats } from "./marketing";
import { isRevenueOrder, ordersBetween, sumRevenue } from "./aggregate";
import { getContentStoreSync } from "@/src/lib/content-ops/store";

const DAY = 86400000;

export interface DashboardInput {
  state: StoreOpsState;
  products: Product[];
  orders: Order[];
  now: string;
}

export function buildExecutiveDashboard(input: DashboardInput): ExecutiveDashboard {
  const { state, products, orders, now } = input;
  const published = onlyPublished(products);
  const today = now.slice(0, 10);
  const weekStart = new Date(Date.parse(now) - 7 * DAY).toISOString();
  const prevWeekStart = new Date(Date.parse(now) - 14 * DAY).toISOString();
  const monthStart = new Date(Date.parse(now) - 30 * DAY).toISOString();
  const prevMonthStart = new Date(Date.parse(now) - 60 * DAY).toISOString();

  /* TODAY */
  const todayOrders = orders.filter((o) => o.createdAt.slice(0, 10) === today);
  const todayRevenue = sumRevenue(todayOrders.filter((o) => isRevenueOrder(o) && o.status !== "pending"));
  const todayItems = todayOrders.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0);
  const todayTop = salesByProduct(todayOrders.filter((o) => isRevenueOrder(o))).slice(0, 5);

  /* WEEK */
  const weekOrders = ordersBetween(orders, weekStart, now);
  const prevWeekOrders = ordersBetween(orders, prevWeekStart, weekStart);
  const weekRevenue = sumRevenue(weekOrders.filter((o) => isRevenueOrder(o) && o.status !== "pending"));
  const prevWeekRevenue = sumRevenue(prevWeekOrders.filter((o) => isRevenueOrder(o) && o.status !== "pending"));
  const salesDelta = prevWeekRevenue > 0 ? Math.round(((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 10000) / 100 : "insufficient_data";
  const ordersDelta = prevWeekOrders.length > 0 ? Math.round(((weekOrders.length - prevWeekOrders.length) / prevWeekOrders.length) * 10000) / 100 : "insufficient_data";
  const weekSales = salesByProduct(weekOrders.filter((o) => isRevenueOrder(o)));
  const weekUnits = weekOrders.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0);
  const inventory = buildInventoryOverview(state, { products, orders, now });

  /* MONTH */
  const monthOrders = ordersBetween(orders, monthStart, now);
  const monthNet = sumRevenue(monthOrders.filter((o) => isRevenueOrder(o) && o.status !== "pending"));
  const prevMonthOrders = ordersBetween(orders, prevMonthStart, monthStart);
  const prevMonthNet = sumRevenue(prevMonthOrders.filter((o) => isRevenueOrder(o) && o.status !== "pending"));
  const growth = prevMonthNet > 0 ? Math.round(((monthNet - prevMonthNet) / prevMonthNet) * 10000) / 100 : "insufficient_data";
  const monthCompleted = monthOrders.filter((o) => isRevenueOrder(o) && o.status !== "pending").length;
  const finance = computeFinanceSummary({ netSalesYER: monthNet, settings: state.settings });

  /* ANOMALIES + ALERTS */
  const anomalies = detectAnomalies({
    orders,
    now,
    sensitivity: state.settings.anomalySensitivity,
    rejectedPriceCount: buildPriceIntelligence(products).rejected.length,
    delayedOrderCount: computeOrderIntelligence(orders, now).delayedOrders.length,
  });
  const criticalAnomalies = anomalies.filter((a) => a.severity === "critical" || a.severity === "high");
  const criticalAlerts = openAlerts(state).filter((a) => a.severity === "critical" || a.severity === "high").slice(0, 5);
  const marketingData = collectContentStats();
  const conflicts = detectContentInventoryConflicts(state, products, orders, now, marketingData);

  /* HEALTH */
  const health: StoreHealth =
    criticalAlerts.length > 0 || criticalAnomalies.length > 0 || inventory.outOfStock.length >= 5
      ? "critical"
      : inventory.lowStock.length + inventory.atRisk.length > 0 || anomalies.length > 0 || conflicts.length > 0
        ? "attention"
        : "good";
  const healthLabelAr =
    health === "critical" ? "يحتاج تدخلاً عاجلاً" : health === "attention" ? "يحتاج متابعة" : "أداء جيد";

  const dataNotes: string[] = [];
  if (orders.length === 0) dataNotes.push("لا توجد بيانات طلبات مسجلة — المؤشرات المستندة للطلبات غير متاحة.");
  if (!finance.available) dataNotes.push(finance.noteAr);
  if (conflicts.length > 0) dataNotes.push(`${conflicts.length} تعارض بين المحتوى والمخزون يحتاج مراجعة.`);
  if (inventory.movementCount === 0) dataNotes.push("سجل الحركات فارغ — الحركات المسجلة يدوياً فقط.");

  const topCampaigns = [...getContentStoreSync().campaigns.values()]
    .filter((c) => c.status === "running" || c.status === "completed")
    .slice(0, 5)
    .map((c) => ({ campaignId: c.id, name: c.name, revenueYER: null as number | null }));
  if (topCampaigns.length > 0 && orders.length === 0) dataNotes.push("لا توجد بيانات إسناد للربط بين الحملات والمبيعات.");

  return {
    health,
    healthLabelAr,
    today: {
      orderCount: todayOrders.length,
      netSalesYER: todayRevenue,
      itemsSold: todayItems,
      averageOrderValueYER: todayOrders.length > 0 && todayRevenue > 0 ? Math.round(todayRevenue / todayOrders.length) : "insufficient_data",
      topProducts: todayTop,
      attentionProducts: [
        ...inventory.outOfStock,
        ...inventory.lowStock,
      ]
        .filter((i) => salesByProduct(orders).some((s) => s.productId === i.productId && s.units > 0))
        .slice(0, 5)
        .map((i) => {
          const s = salesByProduct(orders).find((x) => x.productId === i.productId);
          return { productId: i.productId, units: s?.units ?? 0, revenueYER: s?.revenueYER ?? 0, orderCount: s?.orderCount ?? 0 };
        }),
      criticalAlerts,
    },
    week: {
      salesYER: weekRevenue,
      previousSalesYER: prevWeekOrders.length > 0 ? prevWeekRevenue : null,
      salesDeltaPercent: salesDelta,
      orderCount: weekOrders.length,
      previousOrderCount: prevWeekOrders.length > 0 ? prevWeekOrders.length : null,
      ordersDeltaPercent: ordersDelta,
      topProducts: weekSales.slice(0, 5),
      worstProducts: weekSales.slice(-5).reverse(),
      topCategories: salesByCategory(weekOrders.filter((o) => isRevenueOrder(o)), published).slice(0, 5),
      unitsMoved: weekUnits,
      deadStockCount: inventory.deadStock.length,
    },
    month: {
      netSalesYER: monthNet,
      orderCount: monthOrders.length,
      averageOrderValueYER: monthCompleted > 0 && monthNet > 0 ? Math.round(monthNet / monthCompleted) : "insufficient_data",
      grossProfitYER: finance.grossProfitYER,
      grossMarginPercent: finance.grossMarginPercent,
      growthPercent: growth,
      topProducts: salesByProduct(monthOrders.filter((o) => isRevenueOrder(o))).slice(0, 5),
      topCategories: salesByCategory(monthOrders.filter((o) => isRevenueOrder(o)), published).slice(0, 5),
      topCampaigns,
    },
    attention: attentionSummary(state),
    quickActions: [
      { labelAr: "مراجعة التنبيهات", action: "open-alerts", route: "/admin/store-ops/alerts" },
      { labelAr: "إعادة طلب المخزون", action: "open-reorder", route: "/admin/store-ops/inventory" },
      { labelAr: "التحليل الذكي", action: "open-analyst", route: "/admin/store-ops/analyst" },
      { labelAr: "التقارير", action: "open-reports", route: "/admin/store-ops/reports" },
    ],
    generatedAt: now,
    dataNotes,
  };
}