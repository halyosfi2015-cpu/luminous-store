/**
 * PART 1 — CONTENT DIVERSITY, BALANCE & FATIGUE
 * =============================================
 *
 * Deterministic exposure tracking for categories, products and content types.
 * Rules:
 *  - Category balancing/rotation via lookback over ContentItems (exposure
 *    counts + last appearance). No random selection.
 *  - Product fatigue (appearances 24h/7d/30d + last appearance). Configurable
 *    thresholds; NO permanent ban (products reappear on campaign/season/
 *    performance/time-passed).
 *  - Content-type diversity (prevent repeated types / CTA / topic in a row).
 */

import type {
  ContentItem,
  ContentType,
  ContentHistory,
  CategoryExposure,
  ProductExposure,
  ContentTypeExposure,
} from "./types";

/** Minimal shape consumed by buildContentHistory — allows lightweight callers. */
export type ContentHistoryLike = {
  id: string;
  categoryId: string | null;
  productIds: string[];
  contentType: ContentType;
  createdAt: string;
};

/* ------------------------------------------------------------------------ */
/* DIVERSITY CONFIG                                                          */
/* ------------------------------------------------------------------------ */

export interface DiversityConfig {
  /** Max exposures of the same category before it is considered overexposed. */
  categoryOverexposureThreshold: number;
  /** Exposures below which a category is underexposed (boosted). */
  categoryUnderexposureThreshold: number;
  /** Penalty applied per appearance over the threshold (relative to weight scale). */
  categoryOverexposurePenalty: number;
  /** Boost applied per appearance under the threshold. */
  categoryUnderexposureBoost: number;
  /** Product appearances in the last 24h that trigger strong fatigue. */
  productFatigue24h: number;
  /** Product appearances in the last 7d that trigger medium fatigue. */
  productFatigue7d: number;
  /** Product appearances in the last 30d that trigger weak fatigue. */
  productFatigue30d: number;
  /** Strong fatigue penalty (same product published today). */
  productFatigueStrongPenalty: number;
  /** Medium fatigue penalty. */
  productFatigueMediumPenalty: number;
  /** Weak fatigue penalty. */
  productFatigueWeakPenalty: number;
  /** Freshness boost when a product has not appeared in a long time. */
  productFreshBoost: number;
  /** Number of same content-type in a row that triggers a diversity penalty. */
  contentTypeRepeatThreshold: number;
  /** Penalty for breaking the content-type diversity rule. */
  contentTypeRepeatPenalty: number;
}

export const DEFAULT_DIVERSITY_CONFIG: DiversityConfig = {
  categoryOverexposureThreshold: 5,
  categoryUnderexposureThreshold: 1,
  categoryOverexposurePenalty: 10,
  categoryUnderexposureBoost: 8,
  productFatigue24h: 1,
  productFatigue7d: 3,
  productFatigue30d: 5,
  productFatigueStrongPenalty: 20,
  productFatigueMediumPenalty: 10,
  productFatigueWeakPenalty: 5,
  productFreshBoost: 4,
  contentTypeRepeatThreshold: 2,
  contentTypeRepeatPenalty: 15,
};

/* ------------------------------------------------------------------------ */
/* HOURS HELPERS                                                             */
/* ------------------------------------------------------------------------ */

export function hoursSince(iso: string | null, now: string): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  const n = new Date(now).getTime();
  if (Number.isNaN(t) || Number.isNaN(n)) return Infinity;
  return (n - t) / (1000 * 60 * 60);
}

function inHours(iso: string, hours: number, now: string): boolean {
  return hoursSince(iso, now) <= hours;
}

/* ------------------------------------------------------------------------ */
/* HISTORY BUILDING                                                          */
/* ------------------------------------------------------------------------ */

export function buildContentHistory(items: ContentHistoryLike[], now: string): ContentHistory {
  const categories = new Map<string, CategoryExposure>();
  const products = new Map<string, ProductExposure>();
  const contentTypes = new Map<ContentType, ContentTypeExposure>();

  for (const item of items) {
    const catKey = item.categoryId ?? "__none__";

    const cat = categories.get(catKey) ?? {
      categoryId: item.categoryId,
      exposureCount: 0,
      lastAppearanceAt: null,
    };
    cat.exposureCount++;
    if (!cat.lastAppearanceAt || new Date(item.createdAt) > new Date(cat.lastAppearanceAt)) {
      cat.lastAppearanceAt = item.createdAt;
    }
    categories.set(catKey, cat);

    const type = contentTypes.get(item.contentType) ?? {
      contentType: item.contentType,
      exposureCount: 0,
      lastAppearanceAt: null,
    };
    type.exposureCount++;
    if (!type.lastAppearanceAt || new Date(item.createdAt) > new Date(type.lastAppearanceAt)) {
      type.lastAppearanceAt = item.createdAt;
    }
    contentTypes.set(item.contentType, type);

    for (const pid of item.productIds) {
      const pe = products.get(pid) ?? {
        productId: pid,
        appearances24h: 0,
        appearances7d: 0,
        appearances30d: 0,
        lastAppearanceAt: null,
      };
      if (inHours(item.createdAt, 24, now)) pe.appearances24h++;
      if (inHours(item.createdAt, 24 * 7, now)) pe.appearances7d++;
      if (inHours(item.createdAt, 24 * 30, now)) pe.appearances30d++;
      if (!pe.lastAppearanceAt || new Date(item.createdAt) > new Date(pe.lastAppearanceAt)) {
        pe.lastAppearanceAt = item.createdAt;
      }
      products.set(pid, pe);
    }
  }

  return {
    items: items as ContentItem[],
    categories: [...categories.values()].filter((c) => c.categoryId !== null),
    products: [...products.values()],
    contentTypes: [...contentTypes.values()],
  };
}

/* ------------------------------------------------------------------------ */
/* SCORE ADJUSTMENTS                                                         */
/* ------------------------------------------------------------------------ */

export interface DiversityAdjustments {
  categoryDelta: number;
  productDelta: number;
  contentTypeDelta: number;
  reasons: Array<{ key: string; delta: number; detail: string }>;
}

/**
 * Apply category balance + product fatigue + content-type diversity to a
 * candidate's base score. Pure and deterministic.
 */
export function applyDiversityAdjustments(input: {
  categoryId: string | null;
  productId: string;
  contentType: ContentType;
  history: ContentHistory;
  config?: Partial<DiversityConfig>;
  now: string;
}): DiversityAdjustments {
  const cfg: DiversityConfig = { ...DEFAULT_DIVERSITY_CONFIG, ...(input.config ?? {}) };
  const reasons: Array<{ key: string; delta: number; detail: string }> = [];
  let categoryDelta = 0;
  let productDelta = 0;
  let contentTypeDelta = 0;

  // Category balance
  const cat = input.categoryId
    ? input.history.categories.find((c) => c.categoryId === input.categoryId)
    : undefined;
  if (cat) {
    if (cat.exposureCount > cfg.categoryOverexposureThreshold) {
      const penalty = cfg.categoryOverexposurePenalty;
      categoryDelta -= penalty;
      reasons.push({ key: "category_overexposed", delta: -penalty, detail: `category exposed ${cat.exposureCount}x` });
    } else if (cat.exposureCount <= cfg.categoryUnderexposureThreshold) {
      const boost = cfg.categoryUnderexposureBoost;
      categoryDelta += boost;
      reasons.push({ key: "category_underexposed", delta: boost, detail: `category exposed ${cat.exposureCount}x (underexposed)` });
    }
  }

  // Product fatigue + freshness
  const pe = input.history.products.find((p) => p.productId === input.productId);
  if (pe) {
    if (pe.appearances24h >= cfg.productFatigue24h) {
      productDelta -= cfg.productFatigueStrongPenalty;
      reasons.push({ key: "product_fatigue", delta: -cfg.productFatigueStrongPenalty, detail: `product appeared ${pe.appearances24h}x in 24h` });
    } else if (pe.appearances7d >= cfg.productFatigue7d) {
      productDelta -= cfg.productFatigueMediumPenalty;
      reasons.push({ key: "product_fatigue", delta: -cfg.productFatigueMediumPenalty, detail: `product appeared ${pe.appearances7d}x in 7d` });
    } else if (pe.appearances30d >= cfg.productFatigue30d) {
      productDelta -= cfg.productFatigueWeakPenalty;
      reasons.push({ key: "product_fatigue", delta: -cfg.productFatigueWeakPenalty, detail: `product appeared ${pe.appearances30d}x in 30d` });
    } else if (!pe.lastAppearanceAt || hoursSince(pe.lastAppearanceAt, input.now) > 24 * 7) {
      productDelta += cfg.productFreshBoost;
      reasons.push({ key: "product_not_used_recently", delta: cfg.productFreshBoost, detail: "product not featured recently (freshness boost)" });
    }
  }

  // Content-type diversity — consecutive same-type detection
  const typeCount = input.history.contentTypes.find((t) => t.contentType === input.contentType)?.exposureCount ?? 0;
  if (typeCount >= cfg.contentTypeRepeatThreshold) {
    contentTypeDelta -= cfg.contentTypeRepeatPenalty;
    reasons.push({ key: "diversity_penalty", delta: -cfg.contentTypeRepeatPenalty, detail: `content-type ${input.contentType} already used ${typeCount}x` });
  }

  return { categoryDelta, productDelta, contentTypeDelta, reasons };
}

/** Convenience: total delta from diversity adjustments. */
export function totalDiversityDelta(adj: DiversityAdjustments): number {
  return adj.categoryDelta + adj.productDelta + adj.contentTypeDelta;
}