/**
 * PART 4 — STORE OPERATIONS STATE
 * ===============================
 * Durable operational persistence backed by canonical Supabase tables:
 *   store_ops_stock_movements / store_ops_alerts /
 *   store_ops_reorder_recommendations / store_ops_audit_log
 *
 * The in-memory state remains the working copy for the deterministic
 * engines; hydration loads it from Supabase once per server process and
 * persistStoreOps writes through with idempotent upserts keyed by the
 * engines' own stable IDs. Settings remain in site_settings.
 */

import { getSetting, setSetting } from "@/src/lib/site-settings";
import { createAdminClient } from "@/src/lib/supabase";
import type { StoreOpsSettings, StoreOpsState, StockMovement, BusinessAlert, ReorderRecommendation, BusinessAuditEntry } from "./types";
import { DEFAULT_STORE_OPS_SETTINGS } from "./types";

export const STORE_OPS_STATE_SETTINGS_KEY = "store_operations_state_v1";
/** Legacy single-blob key kept ONLY for one-time migration fallback. */
const LEGACY_BLOB_KEY = "store_operations_state_v1";

const MAX_LEDGER_ROWS = 2000;

export function createMemoryStore(): StoreOpsState {
  return {
    settings: { ...DEFAULT_STORE_OPS_SETTINGS },
    movements: [],
    alerts: {},
    reorder: {},
    audit: [],
    version: 0,
  };
}

export function serializeStore(state: StoreOpsState): unknown {
  return {
    settings: state.settings,
    movements: state.movements,
    alerts: Object.values(state.alerts),
    reorder: Object.values(state.reorder),
    audit: state.audit,
  };
}

export function hydrateStore(state: StoreOpsState, snapshot: unknown): void {
  if (!snapshot || typeof snapshot !== "object") return;
  const s = snapshot as Record<string, unknown>;
  if (Array.isArray(s.movements)) state.movements = s.movements as StockMovement[];
  if (Array.isArray(s.alerts)) {
    state.alerts = {};
    for (const a of s.alerts as BusinessAlert[]) state.alerts[a.id] = a;
  }
  if (Array.isArray(s.reorder)) {
    state.reorder = {};
    for (const r of s.reorder as ReorderRecommendation[]) state.reorder[r.productId] = r;
  }
  if (Array.isArray(s.audit)) state.audit = s.audit as BusinessAuditEntry[];
  if (s.settings && typeof s.settings === "object") {
    state.settings = { ...DEFAULT_STORE_OPS_SETTINGS, ...(s.settings as Partial<StoreOpsSettings>) };
  }
}

let defaultStore: StoreOpsState | null = null;
let hydrationPromise: Promise<void> | null = null;
/** Rows already written to Supabase — anything beyond these cursors is new. */
let syncedMovements = 0;
let syncedAudit = 0;

function rowFromMovement(m: StockMovement) {
  return {
    id: m.id,
    product_id: m.productId,
    quantity: m.quantity,
    direction: m.direction,
    reason: m.reason,
    moved_at: m.timestamp,
    actor: m.actor,
    source: m.source,
    data: m,
  };
}

export function getStoreOpsSync(): StoreOpsState {
  if (!defaultStore) defaultStore = createMemoryStore();
  return defaultStore;
}

async function hydrateFromSupabase(state: StoreOpsState): Promise<boolean> {
  const supabase = createAdminClient();

  const [movRes, alertsRes, reorderRes, auditRes] = await Promise.all([
    supabase.from("store_ops_stock_movements").select("data").order("moved_at", { ascending: true }).limit(MAX_LEDGER_ROWS),
    supabase.from("store_ops_alerts").select("data"),
    supabase.from("store_ops_reorder_recommendations").select("data"),
    supabase.from("store_ops_audit_log").select("data").order("acted_at", { ascending: true }).limit(MAX_LEDGER_ROWS),
  ]);

  const anyData =
    (movRes.data && movRes.data.length > 0) ||
    (alertsRes.data && alertsRes.data.length > 0) ||
    (reorderRes.data && reorderRes.data.length > 0) ||
    (auditRes.data && auditRes.data.length > 0);
  if (!anyData) return false;

  state.movements = ((movRes.data ?? []) as Array<{ data: StockMovement }>).map((r) => r.data);
  state.alerts = {};
  for (const r of (alertsRes.data ?? []) as Array<{ data: BusinessAlert }>) state.alerts[r.data.id] = r.data;
  state.reorder = {};
  for (const r of (reorderRes.data ?? []) as Array<{ data: ReorderRecommendation }>) state.reorder[r.data.productId] = r.data;
  state.audit = ((auditRes.data ?? []) as Array<{ data: BusinessAuditEntry }>).map((r) => r.data);
  return true;
}

/** Resolve the singleton store, hydrating once from canonical tables. Never throws. */
export async function getStoreOps(): Promise<StoreOpsState> {
  const state = getStoreOpsSync();
  if (!hydrationPromise) {
    hydrationPromise = (async () => {
      let hydrated = false;
      try {
        hydrated = await hydrateFromSupabase(state);
      } catch {
        hydrated = false;
      }

      // One-time legacy fallback: migrate the old site_settings blob.
      if (!hydrated) {
        const snapshot = await getSetting<unknown>(LEGACY_BLOB_KEY, null);
        if (snapshot) {
          hydrateStore(state, snapshot);
          // Push migrated rows to canonical tables immediately.
          syncedMovements = 0;
          syncedAudit = 0;
          await persistStoreOps(state);
        }
      }

      const settings = await getSetting<Partial<StoreOpsSettings> | null>(STORE_OPS_STATE_SETTINGS_KEY + "_settings", null);
      if (settings) state.settings = { ...DEFAULT_STORE_OPS_SETTINGS, ...settings };

      syncedMovements = Math.min(syncedMovements, state.movements.length);
      syncedAudit = Math.min(syncedAudit, state.audit.length);
    })().catch(() => {
      /* Supabase unavailable — in-memory store remains authoritative */
    });
  }
  await hydrationPromise;
  return state;
}

/**
 * Write-through persistence into canonical Supabase tables.
 * Idempotent upserts keyed by engine-stable IDs. Returns false when any
 * write fails so callers can surface a real error instead of faking success.
 */
export async function persistStoreOps(state: StoreOpsState): Promise<boolean> {
  state.version++;
  const supabase = createAdminClient();

  try {
    const alertRows = Object.values(state.alerts).map((a) => ({
      id: a.id,
      severity: a.severity,
      status: a.status,
      entity_id: a.entityId,
      updated_at: new Date().toISOString(),
      data: a,
    }));
    if (alertRows.length > 0) {
      const { error } = await supabase
        .from("store_ops_alerts")
        .upsert(alertRows as unknown as never[], { onConflict: "id" });
      if (error) return false;
    }

    const reorderRows = Object.values(state.reorder).map((r) => ({
      product_id: r.productId,
      status: r.status,
      updated_at: new Date().toISOString(),
      data: r,
    }));
    if (reorderRows.length > 0) {
      const { error } = await supabase
        .from("store_ops_reorder_recommendations")
        .upsert(reorderRows as unknown as never[], { onConflict: "product_id" });
      if (error) return false;
    }

    const newMovements = state.movements.slice(syncedMovements).map(rowFromMovement);
    if (newMovements.length > 0) {
      const { error } = await supabase
        .from("store_ops_stock_movements")
        .upsert(newMovements as unknown as never[], { onConflict: "id" });
      if (error) return false;
      syncedMovements = state.movements.length;
    }

    const newAudit = state.audit.slice(syncedAudit).map((a) => ({
      id: a.id,
      actor: a.actor,
      action: a.action,
      entity_type: a.entityType,
      entity_id: a.entityId,
      acted_at: a.at,
      previous: a.previous ?? null,
      new: a.new ?? null,
      reason: a.reason,
      data: a,
    }));
    if (newAudit.length > 0) {
      const { error } = await supabase
        .from("store_ops_audit_log")
        .upsert(newAudit as unknown as never[], { onConflict: "id" });
      if (error) return false;
      syncedAudit = state.audit.length;
    }

    await setSetting(STORE_OPS_STATE_SETTINGS_KEY + "_settings", state.settings);
    return true;
  } catch {
    return false;
  }
}

export function resetStoreOps(): void {
  defaultStore = null;
  hydrationPromise = null;
  syncedMovements = 0;
  syncedAudit = 0;
}
