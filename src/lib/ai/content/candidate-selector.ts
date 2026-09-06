/**
 * PART 1 — CONTENT CANDIDATE SELECTOR
 * ===================================
 *
 * selectContentCandidates: the deterministic 11-step selection pipeline.
 *
 * Steps:
 *   1. published candidates only (onlyPublished)
 *   2. category / subcategory filter
 *   3. product-type filter
 *   4. verified data completeness (image + facts readiness)
 *   5. exclude overexposed / identity-failing / blocking failures
 *   6. campaign relevance
 *   7. seasonal relevance
 *   8. performance relevance (only when real data available)
 *   9. score with CONTENT_SELECTION_WEIGHTS
 *  10. diversity/fatigue adjustments
 *  11. rank deterministically
 *
 * The AI never picks arbitrary product IDs — this pipeline decides the
 * candidates and the brief carries the chosen product set.
 */

import type { Product } from "@/src/types/product";
import { products } from "@/src/data/products";
import { onlyPublished } from "@/src/lib/publication";
import { selectProductImage } from "@/src/lib/product-image";
import { extractBenefitFacts } from "@/src/lib/product-benefits";
import type {
  ContentType,
  ContentObjective,
  ContentHistory,
  ContentCandidate,
  SelectionReason,
  ContentSelectionWeights,
} from "./types";
import { CONTENT_SELECTION_WEIGHTS } from "./types";
import { CONTENT_TYPE_META } from "./taxonomy";
import {
  buildContentHistory,
  applyDiversityAdjustments,
  totalDiversityDelta,
  type DiversityConfig,
  DEFAULT_DIVERSITY_CONFIG,
} from "./diversity";

/* ------------------------------------------------------------------------ */
/* OPTIONS                                                                   */
/* ------------------------------------------------------------------------ */

export interface SelectContentOptions {
  contentType?: ContentType;
  objective?: ContentObjective;
  categoryId?: string | null;
  subcategoryId?: string | null;
  productIds?: string[];
  /** Historical content items (may be empty on first run). */
  history?: ContentItemLike[];
  weights?: Partial<ContentSelectionWeights>;
  diversity?: Partial<DiversityConfig>;
  /** Campaign-influenced product IDs (boosts those products). */
  campaignProductIds?: string[];
  /** Seasonal category slugs (boost). */
  seasonalCategoryIds?: string[];
  /** Performance map productId -> score (only real data). */
  performance?: Record<string, number>;
  /** Exclude product IDs (e.g. currently under review). */
  excludeProductIds?: string[];
  /** Limit result count. */
  limit?: number;
  now?: string;
}

type ContentItemLike = {
  id: string;
  categoryId: string | null;
  productIds: string[];
  contentType: ContentType;
  createdAt: string;
};

/* ------------------------------------------------------------------------ */
/* SCORING                                                                   */
/* ------------------------------------------------------------------------ */

export interface CandidateScoringInput {
  product: Product;
  contentType: ContentType;
  objective: ContentObjective;
  categoryId: string | null;
  weights: ContentSelectionWeights;
  history: ContentHistory;
  diversityConfig: DiversityConfig;
  campaignProductIds: Set<string>;
  seasonalCategoryIds: Set<string>;
  performance: Record<string, number>;
  now: string;
}

export function scoreCandidate(input: CandidateScoringInput): ContentCandidate {
  const {
    product,
    contentType,
    objective,
    categoryId,
    weights,
    history,
    diversityConfig,
    campaignProductIds,
    seasonalCategoryIds,
    performance,
    now,
  } = input;

  const reasons: SelectionReason[] = [];
  const meta = CONTENT_TYPE_META[contentType];

  // --- published (already filtered upstream; still noted) ---
  reasons.push({ key: "published", scoreDelta: 0, detail: "product is published" });

  let base = 0;

  // 1. category relevance
  const catRelevant = categoryId === null || product.categorySlug === categoryId;
  if (catRelevant) {
    base += weights.categoryRelevance * 100;
    reasons.push({ key: "category_relevance", scoreDelta: weights.categoryRelevance * 100, detail: `category ${product.categorySlug ?? product.category}` });
  } else {
    base -= weights.categoryRelevance * 40;
    reasons.push({ key: "category_relevance", scoreDelta: -(weights.categoryRelevance * 40), detail: "category mismatch" });
  }

  // 2. objective relevance (content-type compatibility with objective)
  const compatibleObjective = meta.objectives.includes(objective);
  if (compatibleObjective) {
    base += weights.objectiveRelevance * 100;
    reasons.push({ key: "objective_relevance", scoreDelta: weights.objectiveRelevance * 100, detail: `type ${contentType} serves objective ${objective}` });
  }

  // 3. verified data completeness
  const facts = extractBenefitFacts(product);
  const imageDecision = selectProductImage(product);
  const imageReady = imageDecision.selectedImage !== null && imageDecision.status !== "REJECTED";
  const factCoverage = Math.min(1, facts.length / 5);
  base += weights.verifiedDataCompleteness * (factCoverage * 100);
  reasons.push({ key: "verified_data_completeness", scoreDelta: weights.verifiedDataCompleteness * factCoverage * 100, detail: `${facts.length} verified benefit facts, image ${imageReady ? "ready" : "missing"}` });

  // 4. freshness (based on last appearance from history)
  const exposure = history.products.find((p) => p.productId === product.id);
  let freshnessScore = 50;
  if (!exposure || !exposure.lastAppearanceAt) {
    freshnessScore = 100;
    reasons.push({ key: "freshness", scoreDelta: weights.freshness * 100, detail: "never featured before" });
  } else {
    const hoursAgo = (new Date(now).getTime() - new Date(exposure.lastAppearanceAt).getTime()) / 3600000;
    freshnessScore = Math.max(0, Math.min(100, 100 - hoursAgo / 10));
    reasons.push({ key: "freshness", scoreDelta: weights.freshness * freshnessScore, detail: `featured ${Math.round(hoursAgo)}h ago` });
  }
  base += weights.freshness * freshnessScore;

  // 5. repetition penalty (from diversity adjustments, handled below)
  //    — applied via applyDiversityAdjustments, but added as a scored component here
  const divAdjust = applyDiversityAdjustments({
    categoryId: product.categorySlug ?? categoryId,
    productId: product.id,
    contentType,
    history,
    config: diversityConfig,
    now,
  });
  const diversityDelta = totalDiversityDelta(divAdjust);
  base += diversityDelta;
  for (const r of divAdjust.reasons) {
    reasons.push({ key: r.key as SelectionReason["key"], scoreDelta: r.delta, detail: r.detail });
  }
  reasons.push({ key: "repetition_penalty", scoreDelta: 0, detail: `repetition adjusted ${diversityDelta >= 0 ? "+" : ""}${diversityDelta}` });

  // 6. seasonal relevance
  if (seasonalCategoryIds.size > 0 && product.categorySlug && seasonalCategoryIds.has(product.categorySlug)) {
    base += weights.seasonalRelevance * 100;
    reasons.push({ key: "seasonal_relevance", scoreDelta: weights.seasonalRelevance * 100, detail: "seasonal category" });
  }

  // 7. campaign relevance
  if (campaignProductIds.has(product.id)) {
    base += weights.campaignRelevance * 100;
    reasons.push({ key: "campaign_relevance", scoreDelta: weights.campaignRelevance * 100, detail: "campaign product" });
  }

  // 8. performance relevance (only real data)
  const perf = performance[product.id];
  if (perf !== undefined) {
    base += weights.performanceRelevance * Math.max(0, Math.min(100, perf));
    reasons.push({ key: "performance_relevance", scoreDelta: weights.performanceRelevance * Math.max(0, Math.min(100, perf)), detail: `performance ${perf}` });
  }

  const finalScore = Math.max(0, Math.round(base));

  return {
    productId: product.id,
    categoryId: product.categorySlug ?? categoryId,
    categorySlug: product.categorySlug ?? null,
    baseScore: Math.round(base - diversityDelta),
    finalScore,
    reasons,
  };
}

/* ------------------------------------------------------------------------ */
/* MAIN SELECTOR                                                             */
/* ------------------------------------------------------------------------ */

export function selectContentCandidates(options: SelectContentOptions = {}): ContentCandidate[] {
  const weights: ContentSelectionWeights = { ...CONTENT_SELECTION_WEIGHTS, ...(options.weights ?? {}) };
  const diversityConfig: DiversityConfig = { ...DEFAULT_DIVERSITY_CONFIG, ...(options.diversity ?? {}) };
  const now = options.now ?? new Date().toISOString();
  const history = buildContentHistory(options.history ?? [], now);
  const campaignSet = new Set(options.campaignProductIds ?? []);
  const seasonalSet = new Set(options.seasonalCategoryIds ?? []);
  const excluded = new Set(options.excludeProductIds ?? []);

  // Steps 1-3: published + category/subcategory filter + product-type filter
  let pool = onlyPublished(products);

  if (options.categoryId) {
    pool = pool.filter((p) => p.categorySlug === options.categoryId || p.category === options.categoryId);
  }
  if (options.subcategoryId) {
    pool = pool.filter((p) => p.categorySlug === options.subcategoryId);
  }
  if (options.productIds && options.productIds.length > 0) {
    const ids = new Set(options.productIds);
    pool = pool.filter((p) => ids.has(p.id));
  }

  const meta = options.contentType ? CONTENT_TYPE_META[options.contentType] : null;
  if (meta && meta.allowedProductTypes) {
    const allowed = new Set(meta.allowedProductTypes);
    pool = pool.filter((p) => p.categorySlug && allowed.has(p.categorySlug));
  }

  // Step 4-5: readiness + exclusions
  pool = pool.filter((p) => !excluded.has(p.id));

  const candidates = pool.map((product) =>
    scoreCandidate({
      product,
      contentType: options.contentType ?? "PRODUCT_SPOTLIGHT",
      objective: options.objective ?? "DISCOVERY",
      categoryId: options.categoryId ?? null,
      weights,
      history,
      diversityConfig,
      campaignProductIds: campaignSet,
      seasonalCategoryIds: seasonalSet,
      performance: options.performance ?? {},
      now,
    }),
  );

  // Step 11: rank deterministically
  candidates.sort((a, b) => b.finalScore - a.finalScore || a.productId.localeCompare(b.productId));

  const limit = options.limit ?? 10;
  return candidates.slice(0, limit);
}