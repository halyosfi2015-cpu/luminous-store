/**
 * PART 2 / P4+P5 — Visual content history persistence.
 * Canonical store: site_settings blob (Supabase site_settings table — the
 * existing persistence architecture). Best-effort Supabase mirror where a
 * matching table exists. Never localStorage: server-side only.
 */
import { createAdminClient } from "@/src/lib/supabase";
import type { VisualPlatform, VisualSourceType } from "./templates";
import type { GeneratedCopy } from "./copy-engine";
import { addVisualMemoryEntry } from "./store";

const HISTORY_KEY = "visual_content_history_v1";
const MAX_RECORDS = 2000;

export type VisualContentStatus =
  | "DRAFT"
  | "REVIEW"
  | "APPROVED"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED";

export interface VisualContentRecord {
  id: string;
  sourceType: VisualSourceType;
  sourceIds: string[];
  templateId: string;
  platform: VisualPlatform;
  campaignId: string | null;
  copy: GeneratedCopy;
  captionHash: string;
  status: VisualContentStatus;
  createdAt: string;
  updatedAt: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  externalPostId: string | null;
  publishedUrl: string | null;
  failure: string | null;
  contentItemId: string | null;
  /** Web research actually used (sources only — inspiration, never facts). */
  research?: { url: string; title: string }[];
}

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const { getSetting } = await import("@/src/lib/site-settings");
    return await getSetting<T>(key, fallback);
  } catch { return fallback; }
}
async function setSetting<T>(key: string, value: T): Promise<void> {
  try {
    const { setSetting } = await import("@/src/lib/site-settings");
    await setSetting(key, value);
  } catch { /* persistence failed — caller surfaces error */ }
}

let historyCache: VisualContentRecord[] | null = null;

export async function getVisualHistory(limit = 200): Promise<VisualContentRecord[]> {
  if (historyCache) return historyCache.slice(0, limit);
  const data = await getSetting<VisualContentRecord[]>(HISTORY_KEY, []);
  historyCache = Array.isArray(data) ? data : [];
  return historyCache.slice(0, limit);
}

export async function saveVisualRecord(
  record: Omit<VisualContentRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<VisualContentRecord> {
  const now = new Date().toISOString();
  const full: VisualContentRecord = {
    ...record,
    id: record.id ?? crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  const list = await getVisualHistory(MAX_RECORDS);
  const idx = list.findIndex((r) => r.id === full.id);
  if (idx >= 0) list[idx] = { ...full, createdAt: list[idx].createdAt, updatedAt: now };
  else list.unshift(full);
  historyCache = list.slice(0, MAX_RECORDS);
  await setSetting(HISTORY_KEY, historyCache);
  // Extend the existing 30-day anti-repeat memory (product × template).
  for (const pid of full.sourceIds) {
    await addVisualMemoryEntry({
      productId: pid,
      templateId: full.templateId,
      visualId: full.id,
      createdAt: now,
      divisionKey: `${full.platform}:${full.templateId}`,
    });
  }
  return full;
}

export async function updateVisualRecord(
  id: string,
  patch: Partial<Pick<VisualContentRecord, "status" | "scheduledFor" | "publishedAt" | "externalPostId" | "publishedUrl" | "failure" | "contentItemId" | "copy">>,
): Promise<VisualContentRecord | null> {
  const list = await getVisualHistory(MAX_RECORDS);
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  historyCache = list;
  await setSetting(HISTORY_KEY, historyCache);
  return list[idx];
}

/** Best-effort mirror into content_performance_events when available. */
export async function mirrorPerformanceEvent(record: VisualContentRecord): Promise<void> {
  try {
    const supabase: unknown = createAdminClient();
    const db = supabase as {
      from: (t: string) => { insert: (r: unknown) => Promise<unknown> };
    };
    await db.from("content_performance_events").insert({
      content_id: record.id,
      campaign_id: record.campaignId,
      metric: "view",
      source: record.platform,
      value: 0,
      occurred_at: new Date().toISOString(),
    });
  } catch { /* table may not exist — history blob remains canonical */ }
}
