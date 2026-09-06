/**
 * PART 4 — INVENTORY INTELLIGENCE
 * ===============================
 * Deterministic stock calculation, classification, velocity, reorder logic,
 * and the controlled movement ledger. Canonical stock comes from the product
 * catalog; the ledger records every movement; the available quantity is always
 * derived (never silently mutated).
 */

import { randomUUID } from "node:crypto";
import type { Product } from "@/src/types/product";
import { onlyPublished } from "@/src/lib/publication";
import type { Order } from "@/types/cart";
import {
  aggregateProductSales,
  isRevenueOrder,
  ordersBetween,
} from "./aggregate";
import {
  appendBusinessAudit,
  makeBusinessAudit,
} from "./audit";
import type {
  MovementDirection,
  MovementReason,
  ProductStockInfo,
  ReorderRecommendation,
  StockMovement,
  StockStatus,
  StoreOpsState,
} from "./types";
import { persistStoreOps } from "./store";

/* ------------------------------------------------------------------------ */
/* MOVEMENT LEDGER                                                           */
/* ------------------------------------------------------------------------ */

export interface RecordMovementInput {
  productId: string;
  quantity: number;
  direction: MovementDirection;
  reason: MovementReason;
  actor: string;
  source?: string;
  reference?: string | null;
  note?: string | null;
  now?: string;
}

export type MovementResult =
  | { ok: true; movement: StockMovement; currentStock: number }
  | { ok: false; error: { code: string; message: string } };

/**
 * Append a stock movement. Every mutation goes through the ledger; negative
 * stock is refused unless explicitly allowed by settings. Audited.
 */
export async function recordMovement(
  state: StoreOpsState,
  input: RecordMovementInput,
): Promise<MovementResult> {
  const at = input.now ?? new Date().toISOString();
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { ok: false, error: { code: "invalid_quantity", message: "الكمية يجب أن تكون رقماً موجباً" } };
  }

  const netBefore = netMovement(state, input.productId);
  const applied = input.direction === "in" ? input.quantity : -input.quantity;
  const next = netBefore + applied;
  if (next < 0 && !state.settings.allowNegativeStock) {
    return {
      ok: false,
      error: {
        code: "negative_stock_blocked",
        message: `لا يمكن خصم ${input.quantity} — المخزون سيصبح سالباً (السماح بالمخزون السالب معطل)`,
      },
    };
  }

  const movement: StockMovement = {
    id: randomUUID(),
    productId: input.productId,
    quantity: input.quantity,
    direction: input.direction,
    reason: input.reason,
    timestamp: at,
    source: input.source ?? "admin",
    actor: input.actor,
    reference: input.reference ?? null,
    note: input.note ?? null,
  };
  state.movements.push(movement);

  appendBusinessAudit(
    state,
    makeBusinessAudit({
      actor: input.actor,
      action: "MOVEMENT_RECORDED",
      entityType: "product",
      entityId: input.productId,
      previous: netBefore,
      new: next,
      at,
      reason: `${input.direction}:${input.reason}:${input.quantity}`,
    }),
  );
  await persistStoreOps(state);
  return { ok: true, movement, currentStock: next };
}

/** Net movement (in - out) for a product from the ledger. */
export function netMovement(state: StoreOpsState, productId: string): number {
  return state.movements.reduce((n, m) => {
    if (m.productId !== productId) return n;
    return n + (m.direction === "in" ? m.quantity : -m.quantity);
  }, 0);
}

/** Quantity currently reserved (out-movements with reason reservation). */
export function reservedQuantity(state: StoreOpsState, productId: string): number {
  return state.movements.reduce(
    (n, m) => (m.productId === productId && m.reason === "reservation" && m.direction === "out" ? n + m.quantity : n),
    0,
  );
}

export function canonicalStock(product: Product): number {
  return Math.max(0, product.stockQuantity ?? product.stock ?? 0);
}

/* ------------------------------------------------------------------------ */
/* STOCK FACTS                                                               */
/* ------------------------------------------------------------------------ */

export interface InventoryInput {
  products: Product[];
  orders: Order[];
  now: string;
}

export function unitsSoldWindow(orders: Order[], productId: string, windowDays: number, now: string): number {
  const start = new Date(Date.parse(now) - windowDays * 86400000).toISOString();
  const inWindow = ordersBetween(orders, start, now);
  let units = 0;
  for (const order of inWindow) {
    if (!isRevenueOrder(order)) continue;
    for (const item of order.items) {
      if (item.productId === productId) units += item.quantity;
    }
  }
  return units;
}

export function averageDailySales(orders: Order[], productId: string, windowDays: number, now: string): number {
  const units = unitsSoldWindow(orders, productId, windowDays, now);
  if (units <= 0) return 0;
  return Math.round((units / windowDays) * 1000) / 1000;
}

export function coverageDays(currentStock: number, ads: number): number | null {
  if (ads <= 0) return null;
  return Math.round((currentStock / ads) * 10) / 10;
}

export function stockStatusLabelAr(status: StockStatus): string {
  switch (status) {
    case "OUT_OF_STOCK":
      return "نفد المخزون";
    case "LOW_STOCK":
      return "مخزون منخفض";
    case "AT_RISK":
      return "خطر النفاد";
    case "OVERSTOCK":
      return "مخزون زائد";
    case "DEAD_STOCK":
      return "مخزون راكد";
    default:
      return "طبيعي";
  }
}

/** Deterministic stock classification for one product. */
export function classifyStock(
  canonical: number,
  ads: number,
  unitsInWindow: number,
  hasOrderData: boolean,
  settings: StoreOpsState["settings"],
): StockStatus {
  if (canonical <= 0) return "OUT_OF_STOCK";
  if (canonical <= settings.lowStockThreshold) return "LOW_STOCK";
  if (ads > 0) {
    const cov = coverageDays(canonical, ads);
    if (cov !== null && cov <= settings.reorderLeadTimeDays) return "AT_RISK";
    if (cov !== null && cov > settings.stockCoverageTargetDays * settings.overstockCoverageMultiple) return "OVERSTOCK";
  }
  if (hasOrderData && unitsInWindow === 0) return "DEAD_STOCK";
  return "NORMAL";
}

export function getProductStockInfo(
  state: StoreOpsState,
  product: Product,
  orders: Order[],
  now: string,
): ProductStockInfo {
  const base = canonicalStock(product);
  const reserved = reservedQuantity(state, product.id);
  const net = netMovement(state, product.id);
  let current = base + net - reserved;
  if (!state.settings.allowNegativeStock && current < 0) current = 0;
  const ads = averageDailySales(orders, product.id, state.settings.velocityWindowDays, now);
  const units = unitsSoldWindow(orders, product.id, state.settings.velocityWindowDays, now);
  const status = classifyStock(current, ads, units, orders.length > 0, state.settings);
  return {
    productId: product.id,
    canonicalStock: base,
    reserved,
    movementNet: net,
    currentStock: current,
    availableStock: Math.max(0, current - 0),
    status,
    statusLabelAr: stockStatusLabelAr(status),
    coverageDays: coverageDays(current, ads),
    averageDailySales: ads,
    unitsSoldWindow: units,
  };
}

/* ------------------------------------------------------------------------ */
/* INVENTORY OVERVIEW                                                        */
/* ------------------------------------------------------------------------ */

export interface InventoryOverview {
  totalProducts: number;
  outOfStock: ProductStockInfo[];
  lowStock: ProductStockInfo[];
  atRisk: ProductStockInfo[];
  overstock: ProductStockInfo[];
  deadStock: ProductStockInfo[];
  normal: ProductStockInfo[];
  movementCount: number;
  hasOrderData: boolean;
}

export function buildInventoryOverview(state: StoreOpsState, input: InventoryInput): InventoryOverview {
  const published = onlyPublished(input.products);
  const hasOrderData = input.orders.length > 0;
  const groups: Record<StockStatus, ProductStockInfo[]> = {
    OUT_OF_STOCK: [],
    LOW_STOCK: [],
    AT_RISK: [],
    OVERSTOCK: [],
    DEAD_STOCK: [],
    NORMAL: [],
  };
  for (const product of published) {
    const info = getProductStockInfo(state, product, input.orders, input.now);
    groups[info.status].push(info);
  }
  return {
    totalProducts: published.length,
    outOfStock: groups.OUT_OF_STOCK,
    lowStock: groups.LOW_STOCK,
    atRisk: groups.AT_RISK,
    overstock: groups.OVERSTOCK,
    deadStock: groups.DEAD_STOCK,
    normal: groups.NORMAL,
    movementCount: state.movements.length,
    hasOrderData,
  };
}

/* ------------------------------------------------------------------------ */
/* REORDER INTELLIGENCE                                                      */
/* ------------------------------------------------------------------------ */

export function computeReorderRecommendation(
  state: StoreOpsState,
  product: Product,
  orders: Order[],
  now: string,
): ReorderRecommendation | null {
  if (!state.settings.reorderSuggestionEnabled) return null;
  const info = getProductStockInfo(state, product, orders, now);
  const coverage = info.coverageDays;
  const threshold = state.settings.reorderLeadTimeDays;
  const needsReorder =
    info.status === "OUT_OF_STOCK" ||
    info.status === "LOW_STOCK" ||
    (info.status === "AT_RISK" && coverage !== null && coverage <= threshold);

  if (!needsReorder) return null;

  // Suggested quantity brings stock back to the coverage target (in units).
  const target = state.settings.stockCoverageTargetDays;
  let suggested = 0;
  if (info.averageDailySales > 0) {
    suggested = Math.ceil(info.averageDailySales * (target + threshold) - info.currentStock);
  } else {
    // No velocity data: fall back to a default batch relative to threshold.
    suggested = Math.max(1, Math.round(state.settings.lowStockThreshold * 2));
  }
  suggested = Math.max(1, suggested);

  const reasonAr =
    info.status === "OUT_OF_STOCK"
      ? "المنتج نفد من المخزون"
      : info.status === "LOW_STOCK"
        ? `المخزون أقل من الحد الأدنى (${state.settings.lowStockThreshold})`
        : `التغطية المتوقعة (${coverage ?? 0} يوم) أقل من مدة إعادة الطلب (${threshold} يوم)`;

  return {
    id: randomUUID(),
    productId: product.id,
    currentStock: info.currentStock,
    averageDailySales: info.averageDailySales,
    coverageDays: coverage,
    reorderLeadTimeDays: threshold,
    suggestedQuantity: suggested,
    reasonAr,
    createdAt: now,
    status: "open",
  };
}

export function computeReorderRecommendations(
  state: StoreOpsState,
  input: InventoryInput,
): ReorderRecommendation[] {
  const published = onlyPublished(input.products);
  const recs: ReorderRecommendation[] = [];
  for (const product of published) {
    const rec = computeReorderRecommendation(state, product, input.orders, input.now);
    if (rec) recs.push(rec);
  }
  return recs.sort((a, b) => a.currentStock - b.currentStock);
}

/** Upsert a computed recommendation into the store (status preserved). */
export async function storeReorderRecommendation(
  state: StoreOpsState,
  rec: ReorderRecommendation,
  _actor: string,
): Promise<void> {
  const existing = state.reorder[rec.productId];
  state.reorder[rec.productId] = existing ? { ...rec, status: existing.status } : rec;
  await persistStoreOps(state);
}

/* ------------------------------------------------------------------------ */
/* CONTROLLED ACTIONS                                                        */
/* ------------------------------------------------------------------------ */

export type ReorderAction = "acknowledge" | "execute" | "dismiss";

export async function applyReorderAction(
  state: StoreOpsState,
  productId: string,
  action: ReorderAction,
  actor: string,
  now?: string,
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  const rec = state.reorder[productId];
  if (!rec) return { ok: false, error: { code: "not_found", message: "لا توجد توصية إعادة طلب لهذا المنتج" } };
  const at = now ?? new Date().toISOString();
  const status = action === "acknowledge" ? "acknowledged" : action === "execute" ? "executed" : "dismissed";
  rec.status = status;
  appendBusinessAudit(
    state,
    makeBusinessAudit({
      actor,
      action: action === "acknowledge" ? "REORDER_ACKNOWLEDGED" : action === "execute" ? "REORDER_EXECUTED" : "REORDER_DISMISSED",
      entityType: "product",
      entityId: productId,
      previous: null,
      new: status,
      at,
      reason: `suggestedQuantity=${rec.suggestedQuantity}`,
    }),
  );
  await persistStoreOps(state);
  return { ok: true };
}

/** One-click inventory adjustment (admin-controlled, audited). */
export function adjustStock(
  state: StoreOpsState,
  input: Omit<RecordMovementInput, "reason" | "direction"> & { delta: number },
): Promise<MovementResult> {
  const direction: MovementDirection = input.delta >= 0 ? "in" : "out";
  return recordMovement(state, {
    productId: input.productId,
    quantity: Math.abs(input.delta),
    direction,
    reason: "manual_adjustment",
    actor: input.actor,
    source: input.source ?? "admin",
    reference: input.reference ?? null,
    note: input.note ?? null,
    now: input.now,
  });
}

export { aggregateProductSales };

/** Convenience: sales map used by several engines. */
export function productAggregates(orders: Order[], windowDays: number, now: string): Map<string, ReturnType<typeof aggregateProductSales> extends Map<string, infer V> ? V : never> {
  const start = new Date(Date.parse(now) - windowDays * 86400000).toISOString();
  return aggregateProductSales(ordersBetween(orders, start, now));
}