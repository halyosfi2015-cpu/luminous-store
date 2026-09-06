/**
 * PART 2 — CONTENT OPERATIONS STORE
 * =================================
 * Deterministic repository with durable Supabase persistence.
 *
 * Canonical source of truth after Phase 10 Part 2 Step 2:
 *   10 durable tables (content_items, content_versions, content_schedules,
 *   content_publications, content_campaigns, content_plans, content_ideas,
 *   published_content, content_audit_log, content_performance_events)
 *   — mirror of db/migration_content_ops_persistence.sql.
 *
 * Backward compatibility:
 *   - Hydration tries Supabase tables first; falls back to the legacy
 *     site_settings blob (content_operations_state_v1) if tables are empty or
 *     the migration has not been applied.
 *   - Persistence writes to BOTH durable tables (best-effort) and the legacy
 *     blob so a rolling deployment never loses data.
 *   - Tests stay deterministic: when Supabase is unavailable the in-memory
 *     store is authoritative.
 */

import {
  getSetting,
  setSetting,
} from "@/src/lib/site-settings";
import { createAdminClient } from "@/src/lib/supabase";
import type {
  ContentOpsItem,
  ContentSchedule,
  ContentPublication,
  ContentCampaign,
  ContentPerformanceEvent,
  ContentPlan,
  ContentAuditEntry,
  ContentIdeaRecord,
  PublishedContent,
  ContentOpsSettings,
} from "./types";
import { DEFAULT_CONTENT_OPS_SETTINGS } from "./types";

export const CONTENT_STATE_SETTINGS_KEY = "content_operations_state_v1";

export interface ContentStore {
  items: Map<string, ContentOpsItem>;
  schedules: Map<string, ContentSchedule>;
  publications: Map<string, ContentPublication>;
  campaigns: Map<string, ContentCampaign>;
  events: Map<string, ContentPerformanceEvent>;
  plans: Map<string, ContentPlan>;
  ideas: Map<string, ContentIdeaRecord>;
  published: Map<string, PublishedContent>;
  audit: ContentAuditEntry[];
  settings: ContentOpsSettings;
  version: number;
}

export function createMemoryStore(): ContentStore {
  return {
    items: new Map(),
    schedules: new Map(),
    publications: new Map(),
    campaigns: new Map(),
    events: new Map(),
    plans: new Map(),
    ideas: new Map(),
    published: new Map(),
    audit: [],
    settings: { ...DEFAULT_CONTENT_OPS_SETTINGS, autoPublishCategories: [], autoPublishContentTypes: [...DEFAULT_CONTENT_OPS_SETTINGS.autoPublishContentTypes], enabledChannels: [...DEFAULT_CONTENT_OPS_SETTINGS.enabledChannels], connectedChannels: [...DEFAULT_CONTENT_OPS_SETTINGS.connectedChannels], defaultTimes: [...DEFAULT_CONTENT_OPS_SETTINGS.defaultTimes] },
    version: 0,
  };
}

/** Serializable snapshot for persistence. */
export function serializeStore(store: ContentStore): unknown {
  return {
    items: [...store.items.values()],
    schedules: [...store.schedules.values()],
    publications: [...store.publications.values()],
    campaigns: [...store.campaigns.values()],
    events: [...store.events.values()],
    plans: [...store.plans.values()],
    ideas: [...store.ideas.values()],
    published: [...store.published.values()],
    audit: store.audit,
    settings: store.settings,
  };
}

/** Rehydrate a store from a serialized snapshot (best-effort). */
export function hydrateStore(store: ContentStore, snapshot: unknown): void {
  if (!snapshot || typeof snapshot !== "object") return;
  const s = snapshot as Record<string, unknown>;
  if (Array.isArray(s.items)) for (const it of s.items as ContentOpsItem[]) store.items.set(it.id, it);
  if (Array.isArray(s.schedules)) for (const it of s.schedules as ContentSchedule[]) store.schedules.set(it.id, it);
  if (Array.isArray(s.publications)) for (const it of s.publications as ContentPublication[]) store.publications.set(it.id, it);
  if (Array.isArray(s.campaigns)) for (const it of s.campaigns as ContentCampaign[]) store.campaigns.set(it.id, it);
  if (Array.isArray(s.events)) for (const it of s.events as ContentPerformanceEvent[]) store.events.set(it.id, it);
  if (Array.isArray(s.plans)) for (const it of s.plans as ContentPlan[]) store.plans.set(it.id, it);
  if (Array.isArray(s.ideas)) for (const it of s.ideas as ContentIdeaRecord[]) store.ideas.set(it.ideaId, it);
  if (Array.isArray(s.published)) for (const it of s.published as PublishedContent[]) store.published.set(it.contentId, it);
  if (Array.isArray(s.audit)) store.audit = s.audit as ContentAuditEntry[];
  if (s.settings && typeof s.settings === "object") {
    store.settings = { ...DEFAULT_CONTENT_OPS_SETTINGS, ...(s.settings as Partial<ContentOpsSettings>) };
  }
}

/* ------------------------------------------------------------------------ */
/* Supabase durable helpers                                                  */
/* ------------------------------------------------------------------------ */

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function hydrateFromSupabase(store: ContentStore): Promise<boolean> {
  try {
    const supabase: any = createAdminClient();
    let hasAny = false;

    // Helper: safe select (returns [] if table missing, error, or timeout)
    const safeSelect = async (table: string): Promise<any[]> => {
      try {
        const result = await withTimeout(
          supabase.from(table).select("*").limit(5000) as any,
          8000,
          { data: null, error: { message: "timeout" } },
        );
        if (result.error || !result.data) return [];
        return result.data as any[];
      } catch {
        return [];
      }
    };

    const [itemsRows, versionsRows, schedulesRows, pubsRows, campaignsRows, plansRows, ideasRows, publishedRows, auditRows, eventsRows] = await Promise.all([
      safeSelect("content_items"),
      safeSelect("content_versions"),
      safeSelect("content_schedules"),
      safeSelect("content_publications"),
      safeSelect("content_campaigns"),
      safeSelect("content_plans"),
      safeSelect("content_ideas"),
      safeSelect("published_content"),
      safeSelect("content_audit_log"),
      safeSelect("content_performance_events"),
    ]);

    // Items: data holds full ContentOpsItem
    if (itemsRows.length > 0) {
      hasAny = true;
      for (const r of itemsRows) {
        const item = (r.data as ContentOpsItem) ?? null;
        if (item?.id) store.items.set(item.id, item);
        else if (r.id && r.data) store.items.set(r.id, r.data as ContentOpsItem);
      }
    }

    // Versions: stored separately but also embedded in items.data. If versions table has data,
    // we keep items.versions as authoritative already; otherwise hydrate from data.
    // No extra action needed — versions are inside items.

    // Schedules
    if (schedulesRows.length > 0) {
      hasAny = true;
      for (const r of schedulesRows) {
        const s = (r.data as ContentSchedule) ?? r;
        if (s?.id) store.schedules.set(s.id, s as ContentSchedule);
      }
    }

    // Publications (idempotency key)
    if (pubsRows.length > 0) {
      hasAny = true;
      for (const r of pubsRows) {
        const p = (r.data as ContentPublication) ?? r;
        if (p?.id) store.publications.set(p.id, p as ContentPublication);
      }
    }

    // Campaigns
    if (campaignsRows.length > 0) {
      hasAny = true;
      for (const r of campaignsRows) {
        const c = (r.data as ContentCampaign) ?? r;
        if (c?.id) store.campaigns.set(c.id, c as ContentCampaign);
      }
    }

    // Plans
    if (plansRows.length > 0) {
      hasAny = true;
      for (const r of plansRows) {
        const p = (r.data as ContentPlan) ?? r;
        if (p?.id) store.plans.set(p.id, p as ContentPlan);
      }
    }

    // Ideas: PK is idea_id
    if (ideasRows.length > 0) {
      hasAny = true;
      for (const r of ideasRows) {
        const it = (r.data as ContentIdeaRecord) ?? r;
        const key = (it as any)?.ideaId ?? r.idea_id ?? r.id;
        if (key) store.ideas.set(key, it as ContentIdeaRecord);
      }
    }

    // Published
    if (publishedRows.length > 0) {
      hasAny = true;
      for (const r of publishedRows) {
        const p = (r.data as PublishedContent) ?? r;
        const key = (p as any)?.contentId ?? r.content_id ?? r.id;
        if (key) store.published.set(key, p as PublishedContent);
      }
    }

    // Audit
    if (auditRows.length > 0) {
      hasAny = true;
      // auditRows sorted by acted_at asc already; push in order
      const sorted = [...auditRows].sort((a, b) => String(a.acted_at ?? a.data?.at ?? "").localeCompare(String(b.acted_at ?? b.data?.at ?? "")));
      for (const r of sorted) {
        const e = (r.data as ContentAuditEntry) ?? r;
        if (e?.id) store.audit.push(e as ContentAuditEntry);
      }
    }

    // Events
    if (eventsRows.length > 0) {
      hasAny = true;
      for (const r of eventsRows) {
        const e = (r.data as ContentPerformanceEvent) ?? r;
        if (e?.id) store.events.set(e.id, e as ContentPerformanceEvent);
      }
    }

    // Versions are embedded in items; if the new durable schema was used,
    // versionsRows length will be >0 but we don't need separate hydration
    // because items already contain versions. Keep for completeness.
    if (versionsRows.length > 0 && !hasAny) hasAny = true;

    return hasAny;
  } catch {
    return false;
  }
}

async function persistToSupabase(store: ContentStore): Promise<void> {
  try {
    const supabase: any = createAdminClient();

    const chunk = <T>(arr: T[], size = 100): T[][] => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    const safeUpsert = async (table: string, records: any[], onConflict?: string) => {
      if (records.length === 0) return;
      for (const batch of chunk(records)) {
        try {
          const opts: any = onConflict ? { onConflict } : undefined;
          const { error } = await supabase.from(table).upsert(batch as never, opts as never);
          if (error) {
            // table may not exist yet (migration not applied) — swallow
            if (String(error.message ?? "").toLowerCase().includes("does not exist") || String(error.code ?? "") === "42P01") return;
          }
        } catch {
          // swallow
        }
      }
    };

    // Build records
    const itemRecords = [...store.items.values()].map((it) => ({
      id: it.id,
      status: it.status,
      campaign_id: it.campaignId,
      idea_id: it.ideaId,
      created_at: it.createdAt,
      updated_at: it.updatedAt,
      data: it,
    }));

    const versionRecords = [...store.items.values()].flatMap((it) =>
      it.versions.map((v) => ({
        id: v.id,
        item_id: v.itemId,
        version_number: v.versionNumber,
        status: v.status,
        editor: v.editor,
        created_at: v.createdAt,
        data: v,
      }))
    );

    const scheduleRecords = [...store.schedules.values()].map((s) => ({
      id: s.id,
      item_id: s.itemId,
      version_id: s.versionId,
      channel: s.channel,
      scheduled_for: s.scheduledFor,
      timezone: s.timezone,
      campaign_id: s.campaignId,
      status: s.status,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
      data: s,
    }));

    const pubRecords = [...store.publications.values()].map((p) => ({
      id: p.id,
      item_id: p.itemId,
      version_id: p.versionId,
      channel: p.channel,
      schedule_id: p.scheduleId,
      status: p.status,
      attempted_at: p.attemptedAt,
      completed_at: (p as any).completedAt ?? null,
      data: p,
    }));

    const campaignRecords = [...store.campaigns.values()].map((c) => ({
      id: c.id,
      name: c.name,
      objective: c.objective,
      status: c.status,
      priority: c.priority,
      start_at: c.startAt,
      end_at: c.endAt,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      data: c,
    }));

    const planRecords = [...store.plans.values()].map((p) => ({
      id: p.id,
      kind: p.kind,
      label: p.label,
      generated_at: p.generatedAt,
      data: p,
    }));

    const ideaRecords = [...store.ideas.values()].map((it) => ({
      idea_id: it.ideaId,
      status: it.status,
      content_type: it.contentType,
      objective: it.objective,
      priority: it.priority,
      category_id: it.categoryId,
      created_at: it.createdAt,
      data: it,
    }));

    const publishedRecords = [...store.published.values()].map((p) => ({
      content_id: p.contentId,
      publication_id: p.publicationId,
      channel: p.channel,
      published_at: p.publishedAt,
      visible: p.visible,
      category_id: p.categoryId,
      data: p,
    }));

    const auditRecords = store.audit.map((a) => ({
      id: a.id,
      content_id: a.contentId,
      version_id: a.versionId,
      actor: a.actor,
      action: a.action,
      previous_status: a.previousStatus,
      new_status: a.newStatus,
      channel: (a as any).channel ?? null,
      reason: (a as any).reason ?? null,
      publication_result: (a as any).publicationResult ?? null,
      acted_at: a.at,
      data: a,
    }));

    const eventRecords = [...store.events.values()].map((e) => ({
      id: e.id,
      content_id: e.contentId,
      product_id: e.productId,
      campaign_id: e.campaignId,
      category_id: e.categoryId,
      metric: e.metric,
      occurred_at: e.occurredAt,
      source: e.source,
      value: (e as any).value ?? null,
      data: e,
    }));

    await Promise.all([
      safeUpsert("content_items", itemRecords, "id"),
      safeUpsert("content_versions", versionRecords, "id"),
      safeUpsert("content_schedules", scheduleRecords, "id"),
      safeUpsert("content_publications", pubRecords, "id"),
      safeUpsert("content_campaigns", campaignRecords, "id"),
      safeUpsert("content_plans", planRecords, "id"),
      safeUpsert("content_ideas", ideaRecords, "idea_id"),
      safeUpsert("published_content", publishedRecords, "content_id"),
      safeUpsert("content_audit_log", auditRecords, "id"),
      safeUpsert("content_performance_events", eventRecords, "id"),
    ]);

    // Bridge to generic audit_log for cross-system visibility (best-effort)
    // Keep last 20 audits synced to audit_log entity_type=content_ops
    const recentAudits = store.audit.slice(-20);
    if (recentAudits.length > 0) {
      const bridge = recentAudits.map((a) => ({
        id: `content_ops_${a.id}`,
        actor: a.actor,
        action: a.action,
        entity_type: "content_ops",
        entity_id: a.contentId ?? a.id,
        details: a as unknown as never,
        created_at: a.at,
      }));
      try {
        await supabase.from("audit_log").upsert(bridge as never, { onConflict: "id" } as never);
      } catch {}
    }
  } catch {
    // swallow — blob persistence still covers
  }
}

/* ------------------------------------------------------------------------ */
/* Default (lazy singleton) store + optional Supabase sync                   */
/* ------------------------------------------------------------------------ */

let defaultStore: ContentStore | null = null;
let hydrationPromise: Promise<void> | null = null;

export function getContentStoreSync(): ContentStore {
  if (!defaultStore) defaultStore = createMemoryStore();
  return defaultStore;
}

/**
 * Resolve the singleton store, hydrating once from durable Supabase tables
 * if available, falling back to the legacy site_settings blob.
 * Never throws — falls back to the in-memory store.
 */
export async function getContentStore(): Promise<ContentStore> {
  const store = getContentStoreSync();
  if (!hydrationPromise) {
    hydrationPromise = (async () => {
      const supabaseHydrated = await hydrateFromSupabase(store);
      // A partial durable schema (for example audit/version rows without
      // content_items) must not suppress the legacy snapshot fallback. The
      // snapshot also remains the canonical home for Content Ops settings.
      const needsLegacySnapshot = !supabaseHydrated || store.items.size === 0;
      if (!needsLegacySnapshot) return;
      try {
        const snapshot = await withTimeout(
          getSetting<unknown>(CONTENT_STATE_SETTINGS_KEY, null),
          5000,
          null,
        );
        if (snapshot) {
          hydrateStore(store, snapshot);
          // One-time migration: blob had data but Supabase was empty — push to durable tables
          if (store.items.size > 0 || store.campaigns.size > 0 || store.audit.length > 0) {
            await withTimeout(persistToSupabase(store), 10000, undefined);
          }
        }
      } catch {
        /* blob unavailable — in-memory store is authoritative */
      }
    })().catch(() => {
      /* Supabase unavailable — in-memory store is authoritative */
    });
  }
  await withTimeout(hydrationPromise, 15000, undefined);
  return store;
}

/** Best-effort persist the full state: durable Supabase tables + legacy blob. */
export async function persistContentStore(store: ContentStore): Promise<void> {
  store.version++;
  // durable first, then blob (so blob always reflects latest even if durable fails)
  await persistToSupabase(store);
  try {
    await setSetting(CONTENT_STATE_SETTINGS_KEY, serializeStore(store));
  } catch {
    /* persistence is best-effort */
  }
}

export function resetContentStore(): void {
  defaultStore = null;
  hydrationPromise = null;
}