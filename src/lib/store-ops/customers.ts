/**
 * PART 4 — CUSTOMER INTELLIGENCE
 * ==============================
 * Customer analytics derived from canonical orders. Personal data is minimized:
 * customers are keyed by (name, phone) like the existing local adapter, and AI
 * context only ever receives counts/aggregates — never raw PII.
 */

import type { Order } from "@/types/cart";
import type { CustomerStats } from "./types";
import { isRevenueOrder } from "./aggregate";

interface CustomerRecord {
  key: string;
  name: string;
  phone: string;
  orderCount: number;
  totalSpentYER: number;
  firstOrderAt: string;
  lastOrderAt: string;
  revenueOrders: number;
}

/** Group orders by customer (existing canonical pattern: name + phone). */
export function groupCustomers(orders: Order[]): Map<string, CustomerRecord> {
  const map = new Map<string, CustomerRecord>();
  for (const order of orders) {
    const name = order.address?.fullName?.trim() ?? "";
    const phone = order.address?.phone?.trim() ?? "";
    const key = `${name.toLowerCase()}::${phone}`;
    const cur = map.get(key) ?? {
      key,
      name,
      phone,
      orderCount: 0,
      totalSpentYER: 0,
      firstOrderAt: order.createdAt,
      lastOrderAt: order.createdAt,
      revenueOrders: 0,
    };
    cur.orderCount += 1;
    if (isRevenueOrder(order)) {
      cur.totalSpentYER += order.subtotal ?? 0;
      cur.revenueOrders += 1;
    }
    if (order.createdAt < cur.firstOrderAt) cur.firstOrderAt = order.createdAt;
    if (order.createdAt > cur.lastOrderAt) cur.lastOrderAt = order.createdAt;
    map.set(key, cur);
  }
  return map;
}

export function computeCustomerStats(orders: Order[], now: string, inactiveDays = 90): CustomerStats {
  const customers = [...groupCustomers(orders).values()];
  if (customers.length === 0) {
    return {
      totalCustomers: 0,
      newCustomers: 0,
      returningCustomers: 0,
      repeatPurchaseRate: "insufficient_data",
      averageOrderValueYER: "insufficient_data",
      lifetimeValueYER: "insufficient_data",
      topCustomers: [],
      inactiveCustomers: 0,
      hasData: false,
    };
  }

  const cutoff = new Date(Date.parse(now) - inactiveDays * 86400000).toISOString();
  const returning = customers.filter((c) => c.revenueOrders > 1).length;
  const newCustomers = customers.filter((c) => c.firstOrderAt >= cutoff).length;
  const repeatable = customers.filter((c) => c.orderCount >= 2).length;
  const totalSpent = customers.reduce((n, c) => n + c.totalSpentYER, 0);
  const inactive = customers.filter((c) => c.lastOrderAt < cutoff).length;

  return {
    totalCustomers: customers.length,
    newCustomers,
    returningCustomers: returning,
    repeatPurchaseRate: customers.length > 0 ? Math.round((repeatable / customers.length) * 10000) / 100 : "insufficient_data",
    averageOrderValueYER: customers.length > 0 && totalSpent > 0 ? Math.round(totalSpent / customers.length) : "insufficient_data",
    lifetimeValueYER: customers.length > 0 && totalSpent > 0 ? Math.round(totalSpent / customers.length) : "insufficient_data",
    topCustomers: [...customers]
      .sort((a, b) => b.totalSpentYER - a.totalSpentYER)
      .slice(0, 10)
      .map((c) => ({ key: c.key, name: c.name, orderCount: c.orderCount, totalSpentYER: c.totalSpentYER })),
    inactiveCustomers: inactive,
    hasData: true,
  };
}

/** Anonymized summary for AI context (no raw PII). */
export function anonymizeCustomers(stats: CustomerStats): Record<string, number> {
  return {
    totalCustomers: stats.totalCustomers,
    newCustomers: stats.newCustomers,
    returningCustomers: stats.returningCustomers,
    inactiveCustomers: stats.inactiveCustomers,
  };
}