/**
 * PART 4 — ANOMALY DETECTION
 * ==========================
 * Detects unusual patterns (sudden sales drop/spike, unusual cancellation
 * increase, abnormal order volume, price inconsistency). Every anomaly says
 * "يحتاج تحقيق" — it never concludes fraud or wrongdoing automatically.
 */

import type { Order } from "@/types/cart";
import type { BusinessAnomaly } from "./types";
import { ordersBetween, sumRevenue } from "./aggregate";

export interface AnomalyInput {
  orders: Order[];
  now: string;
  sensitivity: "low" | "medium" | "high";
  rejectedPriceCount?: number;
  delayedOrderCount?: number;
}

const SENSITIVITY_BANDS: Record<string, { drop: number; spike: number; cancel: number; volume: number }> = {
  low: { drop: 0.6, spike: 2.5, cancel: 0.3, volume: 2.5 },
  medium: { drop: 0.4, spike: 2.0, cancel: 0.2, volume: 2.0 },
  high: { drop: 0.25, spike: 1.5, cancel: 0.12, volume: 1.5 },
};

export function detectAnomalies(input: AnomalyInput): BusinessAnomaly[] {
  const anomalies: BusinessAnomaly[] = [];
  const { orders, now, sensitivity, rejectedPriceCount = 0, delayedOrderCount = 0 } = input;
  const band = SENSITIVITY_BANDS[sensitivity] ?? SENSITIVITY_BANDS.medium;
  const week = 7 * 86400000;
  const weekStart = new Date(Date.parse(now) - week).toISOString();
  const prevStart = new Date(Date.parse(now) - 2 * week).toISOString();

  const thisWeek = ordersBetween(orders, weekStart, now);
  const prevWeek = ordersBetween(orders, prevStart, weekStart);

  const revenueThis = sumRevenue(thisWeek);
  const revenuePrev = sumRevenue(prevWeek);
  if (revenuePrev > 0) {
    const delta = (revenueThis - revenuePrev) / revenuePrev;
    if (delta <= -band.drop) {
      anomalies.push({
        id: "anomaly:sales_drop",
        kind: "sales_drop",
        messageAr: `⚠️ انخفاض المبيعات هذا الأسبوع بنسبة ${Math.round(Math.abs(delta) * 100)}% مقارنة بالأسبوع السابق — يحتاج تحقيق.`,
        entityType: "system",
        entityId: null,
        severity: "high",
        evidence: `thisWeek=${revenueThis} prevWeek=${revenuePrev}`,
        at: now,
      });
    }
    if (delta >= band.spike) {
      anomalies.push({
        id: "anomaly:sales_spike",
        kind: "sales_spike",
        messageAr: `⚠️ ارتفاع مفاجئ في المبيعات هذا الأسبوع بنسبة ${Math.round(delta * 100)}% — يحتاج تحقيق.`,
        entityType: "system",
        entityId: null,
        severity: "info",
        evidence: `thisWeek=${revenueThis} prevWeek=${revenuePrev}`,
        at: now,
      });
    }
  }

  const cancelled = orders.filter((o) => o.status === "cancelled").length;
  const total = orders.length;
  if (total > 0 && cancelled / total >= band.cancel) {
    anomalies.push({
      id: "anomaly:cancellation_increase",
      kind: "cancellation_increase",
      messageAr: `⚠️ ارتفاع غير معتاد في إلغاء الطلبات (${Math.round((cancelled / total) * 100)}%) — يحتاج تحقيق.`,
      entityType: "system",
      entityId: null,
      severity: "high",
      evidence: `cancelled=${cancelled} total=${total}`,
      at: now,
    });
  }

  const todayStart = now.slice(0, 10);
  const todayOrders = orders.filter((o) => o.createdAt.slice(0, 10) === todayStart).length;
  const prevDays = ordersBetween(orders, prevStart, weekStart).length;
  if (prevDays > 0 && todayOrders > 0 && todayOrders >= prevDays * band.volume) {
    anomalies.push({
      id: "anomaly:order_volume",
      kind: "order_volume",
      messageAr: `⚠️ حجم طلبات غير معتاد اليوم (${todayOrders} مقابل متوسط ${Math.round(prevDays)}) — يحتاج تحقيق.`,
      entityType: "system",
      entityId: null,
      severity: "info",
      evidence: `today=${todayOrders} prevWeekAvg=${prevDays}`,
      at: now,
    });
  }

  if (rejectedPriceCount > 0) {
    anomalies.push({
      id: "anomaly:price_inconsistency",
      kind: "price_inconsistency",
      messageAr: `⚠️ يوجد ${rejectedPriceCount} منتج بسعر غير صالح/مرفوض — يحتاج تحقيق.`,
      entityType: "products",
      entityId: null,
      severity: "high",
      evidence: `rejectedPriceCount=${rejectedPriceCount}`,
      at: now,
    });
  }

  if (delayedOrderCount > 0) {
    anomalies.push({
      id: "anomaly:delayed_orders",
      kind: "delayed_orders",
      messageAr: `⚠️ يوجد ${delayedOrderCount} طلب متأخر عن المعالجة — يحتاج تحقيق.`,
      entityType: "orders",
      entityId: null,
      severity: "medium",
      evidence: `delayedOrderCount=${delayedOrderCount}`,
      at: now,
    });
  }

  return anomalies;
}

export function anomaliesForDashboard(anomalies: BusinessAnomaly[]): BusinessAnomaly[] {
  return anomalies.filter((a) => a.severity === "critical" || a.severity === "high");
}