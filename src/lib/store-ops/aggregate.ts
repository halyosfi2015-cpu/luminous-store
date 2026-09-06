/**
 * PART 4 — CANONICAL ORDER AGGREGATION
 * =====================================
 * Pure helpers that turn canonical orders (types/cart Order + DB "processing")
 * into per-product/per-day facts. Nothing here fabricates data: with zero
 * orders the aggregations are simply empty and rate metrics return
 * "insufficient_data".
 */

import type { Order } from "@/types/cart";
import type { ProductSalesRow, DaySalesRow } from "./types";

export interface ProductAggregate {
  units: number;
  revenueYER: number;
  orderCount: number;
  orderIds: string[];
}

/** DB allows "processing"; the TS OrderStatus type omits it — tolerate it. */
export function normalizeStatus(status: string): string {
  return status;
}

/** Orders that count toward revenue (everything except cancelled/failed). */
export function isRevenueOrder(order: Order): boolean {
  const status = normalizeStatus(order.status);
  return status !== "cancelled" && status !== "failed";
}

export function isCancelledOrder(order: Order): boolean {
  return normalizeStatus(order.status) === "cancelled";
}

export function aggregateProductSales(orders: Order[]): Map<string, ProductAggregate> {
  const map = new Map<string, ProductAggregate>();
  for (const order of orders) {
    if (!isRevenueOrder(order)) continue;
    for (const item of order.items) {
      const cur = map.get(item.productId) ?? { units: 0, revenueYER: 0, orderCount: 0, orderIds: [] as string[] };
      cur.units += item.quantity;
      cur.revenueYER += item.price * item.quantity;
      if (!cur.orderIds.includes(order.id)) {
        cur.orderIds.push(order.id);
        cur.orderCount += 1;
      }
      map.set(item.productId, cur);
    }
  }
  return map;
}

export function toProductSalesRows(map: Map<string, ProductAggregate>): ProductSalesRow[] {
  return [...map.entries()].map(([productId, a]) => ({
    productId,
    units: a.units,
    revenueYER: a.revenueYER,
    orderCount: a.orderCount,
  }));
}

export function ordersBetween(orders: Order[], start: string, end: string): Order[] {
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return [];
  return orders.filter((o) => {
    const t = Date.parse(o.createdAt);
    return Number.isFinite(t) && t >= s && t < e;
  });
}

/** Bucket order revenue by calendar day (YYYY-MM-DD). */
export function salesByDay(orders: Order[]): DaySalesRow[] {
  const map = new Map<string, DaySalesRow>();
  for (const order of orders) {
    if (!isRevenueOrder(order)) continue;
    const day = order.createdAt.slice(0, 10);
    const cur = map.get(day) ?? { date: day, orders: 0, revenueYER: 0 };
    cur.orders += 1;
    cur.revenueYER += order.total ?? 0;
    map.set(day, cur);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function sumRevenue(orders: Order[]): number {
  return orders.reduce((n, o) => (isRevenueOrder(o) ? n + (o.subtotal ?? 0) : n), 0);
}

export function sumShipping(orders: Order[]): number {
  return orders.reduce((n, o) => (isRevenueOrder(o) ? n + (o.shipping ?? 0) : n), 0);
}

export function sumItemCount(orders: Order[]): number {
  return orders.reduce((n, o) => (isRevenueOrder(o) ? n + o.items.reduce((m, i) => m + i.quantity, 0) : n), 0);
}