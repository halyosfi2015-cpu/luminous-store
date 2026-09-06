/**
 * PART 2 / P4 — Intelligent anti-repetition scoring. Pure module.
 * Advisory weights (never a permanent ban): time/platform/campaign aware.
 */
import type { VisualPlatform } from "./templates";

export interface HistoryRecord {
  id: string;
  templateId: string;
  productIds: string[];
  platform: VisualPlatform;
  campaignId: string | null;
  headline: string;
  hook: string;
  cta: string;
  captionHash: string;
  createdAt: string; // ISO
}

export interface RepeatCheck {
  templateId: string;
  productIds: string[];
  platform: VisualPlatform;
  campaignId: string | null;
  headline: string;
  hook: string;
  cta: string;
  caption: string;
}

export function hashCaption(caption: string): string {
  let h = 0;
  for (let i = 0; i < caption.length; i++) h = (h * 31 + caption.charCodeAt(i)) | 0;
  return `h${Math.abs(h).toString(36)}`;
}

function norm(s: string): string {
  return s.replace(/[\s\u064B-\u0652!"'؟?.,،:؛\-_()\[\]]+/g, "").trim();
}

function similarity(a: string, b: string): number {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // Jaccard over char bigrams — cheap, Arabic-safe.
  const grams = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const ga = grams(na);
  const gb = grams(nb);
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter++;
  const union = ga.size + gb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export interface RepeatResult {
  /** Total advisory penalty (higher = more repetitive). */
  penalty: number;
  /** Per-template penalties for the recommender. */
  penalties: Record<string, number>;
  noticesAr: string[];
  /** True only for exact same product+template+platform within 48h. */
  tooSoon: boolean;
}

/**
 * Score a candidate generation against history.
 * - Same template consecutively: −30 decaying over 14 days.
 * - Same headline/hook/CTA text: −25/−20/−10 by similarity.
 * - Same product same-style <7d: −15.
 * - Different platform or campaign halves most penalties.
 * - Same product reusable after 7 days (penalty → 0).
 */
export function checkRepetition(history: HistoryRecord[], check: RepeatCheck, now: number = Date.now()): RepeatResult {
  const DAY = 86400000;
  const penalties: Record<string, number> = {};
  const noticesAr: string[] = [];
  let total = 0;
  let tooSoon = false;

  const recent = history.filter((h) => now - Date.parse(h.createdAt) < 30 * DAY);
  const sameProductRecent = recent.filter((h) =>
    h.productIds.some((id) => check.productIds.includes(id)),
  );

  // Consecutive same-template use (decays over 14 days).
  const sameTemplate = recent
    .filter((h) => h.templateId === check.templateId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  if (sameTemplate) {
    const ageDays = (now - Date.parse(sameTemplate.createdAt)) / DAY;
    const base = Math.max(0, 30 * (1 - ageDays / 14));
    const sameCtx = sameTemplate.platform === check.platform &&
      (sameTemplate.campaignId ?? null) === (check.campaignId ?? null);
    const weighted = sameCtx ? base : base / 2;
    if (weighted >= 1) {
      penalties[check.templateId] = Math.round(weighted);
      total += weighted;
      noticesAr.push(`القالب ${check.templateId} استُخدم قبل ${Math.max(1, Math.round(ageDays))} يوم — يُقترح التنويع`);
    }
  }

  // Text similarity against same-product history (7-day window matters most).
  for (const h of sameProductRecent) {
    const ageDays = (now - Date.parse(h.createdAt)) / DAY;
    const freshness = ageDays <= 7 ? 1 : Math.max(0, 1 - (ageDays - 7) / 23);
    if (freshness <= 0) continue;
    const sameCtx = h.platform === check.platform && (h.campaignId ?? null) === (check.campaignId ?? null);
    const ctxFactor = sameCtx ? 1 : 0.5;
    const hs = similarity(h.headline, check.headline);
    const ks = similarity(h.hook, check.hook);
    const cs = h.cta.trim() === check.cta.trim() ? 1 : similarity(h.cta, check.cta);
    const ps = similarity(h.captionHash, hashCaption(check.caption)) === 1 ? 1 : 0;
    const add = (25 * hs + 20 * ks + 10 * cs + 15 * ps) * freshness * ctxFactor;
    if (add >= 3) {
      total += add;
      penalties[h.templateId] = Math.round((penalties[h.templateId] ?? 0) + add / 2);
    }
    if (
      h.templateId === check.templateId &&
      h.platform === check.platform &&
      ageDays * DAY < 2 * DAY &&
      hs > 0.85
    ) {
      tooSoon = true;
    }
  }

  // Same product, same style, <7d flat penalty.
  const sameStyleRecent = sameProductRecent.filter(
    (h) => h.templateId === check.templateId && now - Date.parse(h.createdAt) < 7 * DAY,
  );
  if (sameStyleRecent.length > 0 && !tooSoon) {
    total += 15;
    penalties[check.templateId] = (penalties[check.templateId] ?? 0) + 15;
    noticesAr.push("نفس المنتج بنفس القالب خلال أسبوع — فكّر بقالب مختلف");
  }

  if (total >= 1 && noticesAr.length === 0) {
    noticesAr.push("وجدنا تشابهاً مع محتوى سابق — راجع الصياغة قبل الاعتماد");
  }

  return { penalty: Math.round(total), penalties, noticesAr, tooSoon };
}
