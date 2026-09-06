/**
 * PART 4 — ALERT CENTER
 * =====================
 * Configurable business alerts derived from deterministic engines. Every
 * actionable alert has a clear reason. Alerts are deduplicated by a stable id
 * so acknowledge/snooze/dismiss state survives regeneration.
 */

import type { Product } from "@/src/types/product";
import type { Order } from "@/types/cart";
import type {
  BusinessAlert,
  AlertCategory,
  AlertSeverity,
  AlertStatus,
  StoreOpsState,
  OrderIntelligence,
  CustomerStats,
} from "./types";
import { appendBusinessAudit, makeBusinessAudit } from "./audit";
import { persistStoreOps } from "./store";
import type { InventoryOverview } from "./inventory";
import type { PriceIntelligenceResult } from "./price";
import type { BusinessAnomaly } from "./types";
import type { ProductStockInfo } from "./types";

export interface AlertsInput {
  products: Product[];
  orders: Order[];
  now: string;
  inventory: InventoryOverview;
  price: PriceIntelligenceResult;
  ordersInfo: OrderIntelligence;
  customers: CustomerStats;
  anomalies: BusinessAnomaly[];
}

export const ALERT_LABELS: Record<string, string> = {
  inventory: "مخزون",
  sales: "مبيعات",
  orders: "طلبات",
  price: "أسعار",
  products: "منتجات",
  customers: "عملاء",
  marketing: "تسويق",
  campaigns: "حملات",
  system: "نظام",
};

export const SEVERITY_LABELS: Record<string, string> = {
  critical: "حرج",
  high: "عالية",
  medium: "متوسطة",
  info: "معلومات",
};

function alertId(code: string, entityId: string | null): string {
  return `${code}:${entityId ?? "all"}`.replace(/[^a-zA-Z0-9:_-]/g, "_");
}

function stockAlert(
  info: ProductStockInfo,
  severity: AlertSeverity,
  messageAr: string,
  actionLabel: string | null,
  actionRoute: string | null,
): BusinessAlert {
  return {
    id: alertId(`stock:${info.status}`, info.productId),
    category: "inventory",
    severity,
    code: `stock:${info.status}`,
    messageAr,
    entityType: "product",
    entityId: info.productId,
    createdAt: "",
    status: "open",
    reason: info.statusLabelAr,
    evidence: `currentStock=${info.currentStock} ads=${info.averageDailySales} coverage=${info.coverageDays ?? "n/a"}`,
    actionable: actionLabel ? { labelAr: actionLabel, action: "open-product", route: actionRoute ?? "/admin/store-ops/inventory" } : null,
  };
}

const MAX_PER_GROUP = 50;

/** Generate a fresh alert snapshot (ids stable, so state is preserved). */
export function generateAlerts(input: AlertsInput): BusinessAlert[] {
  const alerts: BusinessAlert[] = [];

  // Inventory alerts
  const pushStock = (list: ProductStockInfo[], status: "OUT_OF_STOCK" | "LOW_STOCK" | "AT_RISK" | "DEAD_STOCK" | "OVERSTOCK") => {
    for (const info of list.slice(0, MAX_PER_GROUP)) {
      const { severity, msg, action, route } =
        status === "OUT_OF_STOCK"
          ? { severity: "critical" as const, msg: `🔴 المنتج نفد من المخزون`, action: "مراجعة المنتج", route: "/admin/store-ops/inventory" }
          : status === "LOW_STOCK"
            ? { severity: "high" as const, msg: `🟠 المنتج قريب من النفاد`, action: "إعادة الطلب", route: "/admin/store-ops/inventory" }
            : status === "AT_RISK"
              ? { severity: "medium" as const, msg: `🟡 المنتج يحتاج إعادة طلب`, action: "إعادة الطلب", route: "/admin/store-ops/inventory" }
              : status === "DEAD_STOCK"
                ? { severity: "info" as const, msg: `🔵 المنتج راكد`, action: "إنشاء محتوى", route: "/admin/ai/content" }
                : { severity: "info" as const, msg: `🟣 المخزون أعلى من معدل الحركة`, action: null, route: null };
      alerts.push(stockAlert(info, severity, msg, action, route));
    }
  };
  pushStock(input.inventory.outOfStock, "OUT_OF_STOCK");
  pushStock(input.inventory.lowStock, "LOW_STOCK");
  pushStock(input.inventory.atRisk, "AT_RISK");
  pushStock(input.inventory.deadStock, "DEAD_STOCK");
  pushStock(input.inventory.overstock, "OVERSTOCK");

  // Price alerts
  for (const row of input.price.rejected.slice(0, 30)) {
    alerts.push({
      id: alertId("price:rejected", row.productId),
      category: "price",
      severity: "high",
      code: "price:rejected",
      messageAr: `سعر المنتج غير صالح — يحتاج مراجعة`,
      entityType: "product",
      entityId: row.productId,
      createdAt: "",
      status: "open",
      reason: row.issues.join("؛ ") || "سعر مرفوض",
      evidence: `price=${row.price}`,
      actionable: { labelAr: "مراجعة السعر", action: "open-product", route: "/admin/store-ops/products" },
    });
  }

  // Order alerts
  for (const d of input.ordersInfo.delayedOrders.slice(0, 20)) {
    alerts.push({
      id: alertId("orders:delayed", d.orderId),
      category: "orders",
      severity: "medium",
      code: "orders:delayed",
      messageAr: `طلب متأخر عن المعالجة (${d.daysPending} يوم)`,
      entityType: "order",
      entityId: d.orderId,
      createdAt: "",
      status: "open",
      reason: "تجاوز مدة المعالجة",
      evidence: `status=${d.status} days=${d.daysPending}`,
      actionable: { labelAr: "فتح الطلبات", action: "open-orders", route: "/admin/orders" },
    });
  }

  // Anomaly alerts
  for (const a of input.anomalies) {
    alerts.push({
      id: alertId(a.kind, a.entityId),
      category: a.kind === "sales_drop" || a.kind === "sales_spike" ? "sales" : a.kind === "cancellation_increase" || a.kind === "delayed_orders" ? "orders" : a.kind === "price_inconsistency" ? "price" : "system",
      severity: a.severity,
      code: a.kind,
      messageAr: a.messageAr,
      entityType: a.entityType as BusinessAlert["entityType"],
      entityId: a.entityId,
      createdAt: "",
      status: "open",
      reason: "يحتاج تحقيق",
      evidence: a.evidence,
      actionable: null,
    });
  }

  return alerts;
}

/** Merge the fresh snapshot into the store, preserving acknowledged/snoozed/dismissed state. */
export async function syncAlerts(state: StoreOpsState, fresh: BusinessAlert[], now: string): Promise<void> {
  for (const alert of fresh) {
    const existing = state.alerts[alert.id];
    if (existing) {
      existing.createdAt = existing.createdAt || now;
      continue;
    }
    alert.createdAt = alert.createdAt || now;
    state.alerts[alert.id] = alert;
  }
  // Drop alerts that no longer apply (keep only acknowledged/dismissed/snoozed history cap).
  const relevant = new Set(fresh.map((a) => a.id));
  for (const id of Object.keys(state.alerts)) {
    if (!relevant.has(id) && state.alerts[id].status === "open") delete state.alerts[id];
  }
  await persistStoreOps(state);
}

export type AlertAction = "acknowledge" | "snooze" | "dismiss";

export async function applyAlertAction(
  state: StoreOpsState,
  id: string,
  action: AlertAction,
  actor: string,
  now?: string,
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  const alert = state.alerts[id];
  if (!alert) return { ok: false, error: { code: "not_found", message: "التنبيه غير موجود" } };
  const at = now ?? new Date().toISOString();
  const status: AlertStatus = action === "acknowledge" ? "acknowledged" : action === "snooze" ? "snoozed" : "dismissed";
  alert.status = status;
  appendBusinessAudit(
    state,
    makeBusinessAudit({
      actor,
      action: action === "acknowledge" ? "ALERT_ACKNOWLEDGED" : action === "snooze" ? "ALERT_SNOOZED" : "ALERT_DISMISSED",
      entityType: "alert",
      entityId: id,
      previous: null,
      new: status,
      at,
      reason: alert.code,
    }),
  );
  await persistStoreOps(state);
  return { ok: true };
}

export function openAlerts(state: StoreOpsState): BusinessAlert[] {
  return Object.values(state.alerts).filter((a) => a.status === "open");
}

export function attentionSummary(state: StoreOpsState): Array<{ code: string; labelAr: string; count: number; severity: AlertSeverity }> {
  const open = openAlerts(state);
  const byCode = new Map<string, { count: number; severity: AlertSeverity; code: string }>();
  for (const a of open) {
    const cur = byCode.get(a.code) ?? { count: 0, severity: a.severity, code: a.code };
    cur.count += 1;
    if (SEVERITY_RANK[a.severity] < SEVERITY_RANK[cur.severity]) cur.severity = a.severity;
    byCode.set(a.code, cur);
  }
  return [...byCode.values()]
    .map((c) => ({ code: c.code, labelAr: c.code, count: c.count, severity: c.severity }))
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2, info: 3 };

export function alertCategoryLabel(category: AlertCategory): string {
  return ALERT_LABELS[category] ?? category;
}