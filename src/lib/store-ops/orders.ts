/**
 * PART 4 — ORDER INTELLIGENCE
 * ===========================
 * Order overview: counts by status, completion/cancellation/return rates,
 * average order value, order trends and delayed orders. Deterministic; rates
 * return "insufficient_data" without a real denominator.
 */

import type { Order } from "@/types/cart";
import type { OrderIntelligence } from "./types";
import { isRevenueOrder } from "./aggregate";

export function computeOrderIntelligence(orders: Order[], now: string, delayDays = 3): OrderIntelligence {
  const byStatus: Record<string, number> = {};
  for (const order of orders) {
    const status = order.status;
    byStatus[status] = (byStatus[status] ?? 0) + 1;
  }

  const total = orders.length;
  const completed = orders.filter((o) => isRevenueOrder(o) && o.status !== "pending").length;
  const cancelled = orders.filter((o) => o.status === "cancelled").length;

  const delayed: OrderIntelligence["delayedOrders"] = [];
  for (const order of orders) {
    // DB allows "processing" even though the TS union omits it — tolerate it.
    const status: string = order.status;
    if (status === "confirmed" || status === "processing" || status === "pending") {
      const days = Math.floor((Date.parse(now) - Date.parse(order.createdAt)) / 86400000);
      if (Number.isFinite(days) && days >= delayDays) {
        delayed.push({ orderId: order.id, createdAt: order.createdAt, status, daysPending: days });
      }
    }
  }
  delayed.sort((a, b) => b.daysPending - a.daysPending);

  const revenue = orders
    .filter((o) => isRevenueOrder(o) && o.status !== "pending")
    .reduce((n, o) => n + (o.subtotal ?? 0), 0);

  return {
    byStatus,
    completionRate: completed > 0 ? Math.round((completed / total) * 10000) / 100 : "insufficient_data",
    cancellationRate: total > 0 ? Math.round((cancelled / total) * 10000) / 100 : "insufficient_data",
    returnRate: "insufficient_data",
    averageOrderValueYER: completed > 0 ? Math.round(revenue / completed) : "insufficient_data",
    delayedOrders: delayed,
    hasOrders: total > 0,
  };
}