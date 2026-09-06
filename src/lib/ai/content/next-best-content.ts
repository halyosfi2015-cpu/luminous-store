/**
 * PART 1 — NEXT BEST CONTENT SELECTOR
 * ===================================
 *
 * selectNextBestContent runs the full ranking pipeline (categories → products
 * → content-type → objective → season → campaign → readiness) and returns the
 * single highest-scoring candidate with a structured reason trace.
 *
 * It deliberately does NOT return the first candidate blindly — the full
 * pipeline decides, and the reasons explain exactly why.
 */

import type { Product } from "@/src/types/product";
import { products } from "@/src/data/products";
import { onlyPublished } from "@/src/lib/publication";
import type { ContentCandidate, SelectionReason, NextBestContent, ContentHistory } from "./types";
import { selectContentCandidates, type SelectContentOptions } from "./candidate-selector";
import { buildContentHistory, applyDiversityAdjustments, totalDiversityDelta } from "./diversity";

export interface NextBestOptions extends SelectContentOptions {
  /** Number of top candidates to produce the reason trace for. */
  traceTop?: number;
}

export function selectNextBestContent(options: NextBestOptions = {}): NextBestContent {
  const candidates = selectContentCandidates({
    ...options,
    limit: options.traceTop ?? 10,
  });

  if (candidates.length === 0) {
    return {
      contentItem: null,
      reasons: [{ key: "blocked", scoreDelta: 0, detail: "no eligible content candidates" }],
    };
  }

  const best = candidates[0];
  const reasons = buildReasonTrace(best);

  return { contentItem: null, reasons };
}

/** Produce the final human-structured reason trace for the top candidate. */
export function buildReasonTrace(candidate: ContentCandidate): SelectionReason[] {
  const reasons: SelectionReason[] = [];
  for (const r of candidate.reasons) reasons.push(r);

  // Final "selected" reason.
  reasons.push({
    key: "selected",
    scoreDelta: 0,
    detail: `selected product ${candidate.productId} with score ${candidate.finalScore}`,
  });

  return reasons;
}

/**
 * Resolve the actual product for a top candidate (used by the caller to build
 * the brief + context). Returns the published product or null.
 */
export function resolveCandidateProduct(candidate: ContentCandidate): Product | null {
  const pool = onlyPublished(products);
  return pool.find((p) => p.id === candidate.productId) ?? null;
}

/** Summarize candidate readiness for a quick API response. */
export function summarizeCandidate(candidate: ContentCandidate): {
  productId: string;
  categoryId: string | null;
  finalScore: number;
  reasons: string[];
} {
  return {
    productId: candidate.productId,
    categoryId: candidate.categoryId,
    finalScore: candidate.finalScore,
    reasons: candidate.reasons.map((r) => r.detail),
  };
}

export { buildContentHistory, applyDiversityAdjustments, totalDiversityDelta };
export type { ContentHistory };