/**
 * PART 2 — CONTENT PERFORMANCE ANALYTICS
 * ======================================
 * Real, event-driven performance tracking for published content. No fabricated
 * numbers: every metric is derived from recorded events, and rate-style
 * metrics return "insufficient_data" (never 0%) when there is no data to
 * compute them from.
 *
 * Attribution: a single event can attribute to content + product + campaign +
 * category simultaneously, so aggregations sum the same underlying event
 * without double counting (each event has a unique dedupe id).
 *
 * Reuses the Part 1 fatigue vocabulary so next-best selection can consume it.
 */

import type {
  ContentMetric,
  ContentPerformanceEvent,
  ContentStoreLike,
  PerformanceSummary,
} from "./types";
import { CONTENT_METRICS } from "./types";

export const MIN_RATE_SAMPLE = 1;

/* ------------------------------------------------------------------------ */
/* RECORDING (dedupe by event id)                                            */
/* ------------------------------------------------------------------------ */

export interface RecordPerformanceInput {
  id?: string;
  contentId: string;
  productId?: string | null;
  campaignId?: string | null;
  categoryId?: string | null;
  metric: ContentMetric;
  occurredAt?: string;
  source: string;
  value?: number;
}

/**
 * Record one performance event. The event id is the dedupe key — the same
 * event delivered twice is ignored, never counted twice.
 */
export function recordPerformanceEvent(
  store: ContentStoreLike,
  input: RecordPerformanceInput,
): { ok: boolean; data?: ContentPerformanceEvent; error?: { code: string; message: string } } {
  const id = input.id ?? `${input.contentId}:${input.metric}:${input.occurredAt ?? Date.now()}:${input.source}`;
  if (store.events.has(id)) {
    return { ok: false, error: { code: "duplicate_event", message: "Event already recorded" } };
  }
  const event: ContentPerformanceEvent = {
    id,
    contentId: input.contentId,
    productId: input.productId ?? null,
    campaignId: input.campaignId ?? null,
    categoryId: input.categoryId ?? null,
    metric: input.metric,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    source: input.source,
    value: input.value,
  };
  store.events.set(id, event);
  return { ok: true, data: event };
}

export function getEvents(store: ContentStoreLike, contentId: string): ContentPerformanceEvent[] {
  return [...store.events.values()].filter((e) => e.contentId === contentId);
}

/* ------------------------------------------------------------------------ */
/* AGGREGATION HELPERS                                                       */
/* ------------------------------------------------------------------------ */

export function countMetric(events: ContentPerformanceEvent[], metric: ContentMetric): number {
  return events.reduce((n, e) => (e.metric === metric ? n + 1 : n), 0);
}

export function sumValue(events: ContentPerformanceEvent[], metric: ContentMetric): number {
  return events.reduce((n, e) => (e.metric === metric ? n + (typeof e.value === "number" ? e.value : 0) : n), 0);
}

/** Rate with a real denominator. Returns "insufficient_data" when no data. */
export function rate(numerator: number, denominator: number): number | "insufficient_data" {
  if (denominator < MIN_RATE_SAMPLE) return "insufficient_data";
  return Math.round((numerator / denominator) * 10000) / 100;
}

function summarize(events: ContentPerformanceEvent[]): PerformanceSummary {
  const counts: Record<ContentMetric, number> = Object.fromEntries(
    CONTENT_METRICS.map((m) => [m, countMetric(events, m)]),
  ) as Record<ContentMetric, number>;

  const impressions = counts.impression;
  const engagement = counts.like + counts.comment + counts.share + counts.save;
  const clicks = counts.click;

  return {
    contentId: events[0]?.contentId ?? "none",
    counts,
    sampleSize: impressions,
    impressions: counts.impression,
    views: counts.view,
    likes: counts.like,
    comments: counts.comment,
    shares: counts.share,
    saves: counts.save,
    clicks: counts.click,
    productViews: counts.product_view,
    addToCarts: counts.add_to_cart,
    wishlists: counts.wishlist,
    checkouts: counts.checkout,
    purchases: counts.purchase,
    repeatPurchases: counts.repeat_purchase,
    revenueYER: sumValue(events, "purchase") + sumValue(events, "checkout"),
    engagementRate: rate(engagement, impressions),
    clickThroughRate: rate(clicks, impressions),
    conversionRate: rate(counts.purchase, clicks),
  };
}

/* ------------------------------------------------------------------------ */
/* ATTRIBUTION AGGREGATIONS                                                  */
/* ------------------------------------------------------------------------ */

export function getContentPerformance(store: ContentStoreLike, contentId: string): PerformanceSummary {
  return summarize(getEvents(store, contentId));
}

export function getProductPerformance(store: ContentStoreLike, productId: string): PerformanceSummary {
  const events = [...store.events.values()].filter((e) => e.productId === productId);
  return summarize(events);
}

export function getCampaignPerformance(store: ContentStoreLike, campaignId: string): PerformanceSummary {
  const events = [...store.events.values()].filter((e) => e.campaignId === campaignId);
  return summarize(events);
}

export function getCategoryPerformance(store: ContentStoreLike, categoryId: string): PerformanceSummary {
  const events = [...store.events.values()].filter((e) => e.categoryId === categoryId);
  return summarize(events);
}

/* ------------------------------------------------------------------------ */
/* DASHBOARD                                                                 */
/* ------------------------------------------------------------------------ */

export interface PerformanceDashboard {
  totalEvents: number;
  uniqueContent: number;
  totals: PerformanceSummary;
  topByEngagement: Array<{ contentId: string; engagementRate: number | "insufficient_data"; engagements: number }>;
  topProducts: Array<{ productId: string; purchases: number; revenueYER: number }>;
  byContentType: Array<{ categoryId: string | null; impressions: number; engagements: number }>;
}

export function getPerformanceDashboard(store: ContentStoreLike): PerformanceDashboard {
  const events = [...store.events.values()];
  const contentIds = [...new Set(events.map((e) => e.contentId))];
  const totals = summarize(events);

  const perContent = contentIds.map((id) => {
    const sum = getContentPerformance(store, id);
    const engagements = sum.likes + sum.comments + sum.shares + sum.saves;
    return {
      contentId: id,
      engagementRate: sum.engagementRate,
      engagements,
    };
  });

  const productMap = new Map<string, { purchases: number; revenueYER: number }>();
  for (const e of events) {
    if (!e.productId) continue;
    const cur = productMap.get(e.productId) ?? { purchases: 0, revenueYER: 0 };
    if (e.metric === "purchase") cur.purchases += 1;
    if (e.metric === "purchase" && typeof e.value === "number") cur.revenueYER += e.value;
    productMap.set(e.productId, cur);
  }

  const categoryMap = new Map<string, { impressions: number; engagements: number }>();
  for (const e of events) {
    const key = e.categoryId ?? "none";
    const cur = categoryMap.get(key) ?? { impressions: 0, engagements: 0 };
    if (e.metric === "impression") cur.impressions += 1;
    if (e.metric === "like" || e.metric === "comment" || e.metric === "share" || e.metric === "save") cur.engagements += 1;
    categoryMap.set(key, cur);
  }

  return {
    totalEvents: events.length,
    uniqueContent: contentIds.length,
    totals,
    topByEngagement: perContent.sort((a, b) => b.engagements - a.engagements).slice(0, 10),
    topProducts: [...productMap.entries()]
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.revenueYER - a.revenueYER)
      .slice(0, 10),
    byContentType: [...categoryMap.entries()].map(([categoryId, v]) => ({ categoryId: categoryId === "none" ? null : categoryId, ...v })),
  };
}

/* ------------------------------------------------------------------------ */
/* CONTENT FATIGUE (feeds Part 1 next-best selection)                        */
/* ------------------------------------------------------------------------ */

export interface ContentFatigueReport {
  contentId: string;
  impressions: number;
  engagements: number;
  engagementRate: number | "insufficient_data";
  lastEventAt: string | null;
  ageDays: number | null;
  fatigueScore: number;
  recommendation: "healthy" | "watch" | "refresh" | "rest";
}

/**
 * Fatigue heuristic per published content unit. Higher score = more fatigued.
 * Drives Part 1's performance/diversity decisions without fabricating data.
 */
export function analyzeContentFatigue(
  store: ContentStoreLike,
  opts: { now?: string; minImpressions?: number } = {},
): ContentFatigueReport[] {
  const now = opts.now ?? new Date().toISOString();
  const minImpressions = opts.minImpressions ?? MIN_RATE_SAMPLE;
  const byContent = new Map<string, ContentPerformanceEvent[]>();
  for (const e of store.events.values()) {
    const list = byContent.get(e.contentId) ?? [];
    list.push(e);
    byContent.set(e.contentId, list);
  }

  const reports: ContentFatigueReport[] = [];
  for (const [contentId, events] of byContent) {
    const sum = summarize(events);
    const lastEventAt = events.map((e) => e.occurredAt).sort().at(-1) ?? null;
    const publishedAt = store.published.get(contentId)?.publishedAt ?? null;
    const ageDays = publishedAt ? Math.max(0, (Date.parse(now) - Date.parse(publishedAt)) / 86400000) : null;
    const engagements = sum.likes + sum.comments + sum.shares + sum.saves;

    // Fatigue score (0..100): heavy impressions + low engagement + age = fatigued.
    let score = 0;
    if (sum.impressions >= minImpressions) {
      const rateVal = sum.engagementRate;
      if (rateVal !== "insufficient_data") {
        score += Math.max(0, 60 - rateVal);
      }
      score += Math.min(25, Math.log2(Math.max(1, sum.impressions)) * 4);
    }
    if (ageDays !== null) score += Math.min(25, ageDays * 2);

    const recommendation: ContentFatigueReport["recommendation"] =
      score >= 80 ? "rest" : score >= 55 ? "refresh" : score >= 30 ? "watch" : "healthy";

    reports.push({
      contentId,
      impressions: sum.impressions,
      engagements,
      engagementRate: sum.engagementRate,
      lastEventAt,
      ageDays,
      fatigueScore: Math.round(score),
      recommendation,
    });
  }

  return reports.sort((a, b) => b.fatigueScore - a.fatigueScore);
}

/* ------------------------------------------------------------------------ */
/* STORE-FREE HELPERS FOR THE TEST SUITE                                     */
/* ------------------------------------------------------------------------ */

export function summarizeEvents(events: ContentPerformanceEvent[]): PerformanceSummary {
  return summarize(events);
}