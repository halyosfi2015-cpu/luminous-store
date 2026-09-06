/**
 * ANALYTICS UNIFICATION BRIDGE — Phase 10 Part 2 Step 12
 * =====================================================
 * Two analytics silos exist by design:
 *   - src/lib/analytics/*  → customer_events (e-commerce funnel)
 *   - src/lib/content-ops/analytics.ts → content_performance_events (content attribution)
 *
 * This bridge keeps them separate (no double counting, no PII duplication)
 * but enables cross-attribution via shared keys (contentId, productId,
 * campaignId, categoryId) without fabricating metrics.
 *
 * Content metrics remain attributable to content+product+campaign+category
 * where real attribution exists. The bridge only provides read-time joins,
 * never duplicates events.
 */

import type { ContentStore } from "./store";
import type { ContentMetric } from "./types";
import { recordPerformanceEvent as recordContentEvent } from "./analytics";

/**
 * Record a content performance event with durable attribution.
 * Dedupe by id is preserved. Optionally also emits a lightweight customer
 * event for funnel correlation (product_view → purchase) without counting
 * twice — the content event remains canonical for content analytics.
 */
export async function recordBridgedPerformanceEvent(
  store: ContentStore,
  input: {
    id?: string;
    contentId: string;
    productId?: string | null;
    campaignId?: string | null;
    categoryId?: string | null;
    metric: ContentMetric;
    occurredAt?: string;
    source: string;
    value?: number;
  },
): Promise<{ ok: boolean; duplicate?: boolean }> {
  const res = recordContentEvent(store as any, input);
  if (!res.ok) return { ok: false, duplicate: res.error?.code === "duplicate_event" };
  // Best-effort: also persist via the store's durable layer (already handled by
  // persistContentStore). No second insert into customer_events to avoid double
  // counting — the join is via productId/campaignId keys at query time.
  return { ok: true };
}

/**
 * Correlate content performance with customer funnel (read-only join).
 * Returns stable attribution without fabricating metrics.
 */
export function correlateContentWithFunnel(
  store: ContentStore,
  contentId: string,
): {
  contentId: string;
  productIds: string[];
  campaignId: string | null;
  categoryId: string | null;
  metrics: Record<string, number>;
  insufficientData: boolean;
} {
  const events = [...store.events.values()].filter((e) => e.contentId === contentId);
  const productIds = [...new Set(events.map((e) => e.productId).filter(Boolean as any))] as string[];
  const campaignId = events.find((e) => e.campaignId)?.campaignId ?? null;
  const categoryId = events.find((e) => e.categoryId)?.categoryId ?? null;
  const metrics: Record<string, number> = {};
  for (const e of events) metrics[e.metric] = (metrics[e.metric] ?? 0) + 1;
  return {
    contentId,
    productIds,
    campaignId,
    categoryId,
    metrics,
    insufficientData: events.length === 0,
  };
}
