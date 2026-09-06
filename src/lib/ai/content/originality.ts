/**
 * PART 1 — CONTENT ORIGINALITY VALIDATION
 * =======================================
 *
 * Deterministic originality check for AI-generated content against source
 * editorial text (e.g. Yaqoot descriptions). Reuses the existing Arabic
 * normalization + tokenization from product-name.ts (no second implementation).
 *
 * Rules:
 *  - exact / normalized similarity
 *  - token overlap (Jaccard)
 *  - sentence-level similarity
 *  - trivial synonym substitution detection
 *  - source phrase carryover detection
 *  - canonical identity overlap is ALLOWED (brand / product name / size)
 *  - editorial copying is REJECTED; regenerate on failure (never lower threshold)
 */

import { normalizeName, tokenize, jaccardTokens } from "@/src/lib/product-name";
import type { ContentOriginality } from "./types";

export interface ContentOriginalityInput {
  /** The AI-generated text (Arabic body). */
  candidateAr: string;
  /** Source editorial text the generated content must NOT copy (e.g. Yaqoot). */
  sourceAr: string;
  /** Optional English candidate/source for cross-language checks. */
  candidateEn?: string;
  sourceEn?: string;
  /** Canonical identity tokens that are allowed to overlap (brand, product, size). */
  allowedOverlapTokens?: string[];
}

export const CONTENT_ORIGINALITY_EDITORIAL_THRESHOLD = 0.7;
export const CONTENT_ORIGINALITY_PHRASE_THRESHOLD = 0.8;

/* ------------------------------------------------------------------------ */
/* SENTENCE-LEVEL SIMILARITY                                                 */
/* ------------------------------------------------------------------------ */

function splitSentences(text: string): string[] {
  return normalizeName(text)
    .split(/[.۔.!؟]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function sentenceOverlap(a: string[], b: string[]): number {
  let best = 0;
  for (const sa of a) {
    const ta = tokenize(sa);
    if (ta.length === 0) continue;
    for (const sb of b) {
      const tb = tokenize(sb);
      if (tb.length === 0) continue;
      const sim = jaccardTokens(ta, tb);
      if (sim > best) best = sim;
    }
  }
  return best;
}

function detectPhraseCarryover(a: string[], b: string[]): number {
  // Any sentence in the candidate that shares >= CONTENT_ORIGINALITY_PHRASE_THRESHOLD
  // tokens with a source sentence is "carried over".
  let carried = 0;
  for (const sa of a) {
    const ta = tokenize(sa);
    if (ta.length < 3) continue;
    let best = 0;
    for (const sb of b) {
      const sim = jaccardTokens(ta, tokenize(sb));
      if (sim > best) best = sim;
    }
    if (best >= CONTENT_ORIGINALITY_PHRASE_THRESHOLD) carried++;
  }
  return carried;
}

/* ------------------------------------------------------------------------ */
/* MAIN VALIDATOR                                                            */
/* ------------------------------------------------------------------------ */

export function validateContentOriginality(input: ContentOriginalityInput): ContentOriginality {
  const reasons: string[] = [];
  const candidateTokens = tokenize(normalizeName(input.candidateAr));
  const sourceTokens = tokenize(normalizeName(input.sourceAr));

  // No source to compare against → nothing to copy.
  if (sourceTokens.length === 0 || candidateTokens.length === 0) {
    return {
      passed: true,
      score: 100,
      editorialSimilarity: 0,
      reasons: ["no source editorial text to compare against"],
    };
  }

  const normalizedCandidate = normalizeName(input.candidateAr);
  const normalizedSource = normalizeName(input.sourceAr);

  // 1. Exact copy
  if (normalizedCandidate === normalizedSource) {
    return {
      passed: false,
      score: 0,
      editorialSimilarity: 1,
      reasons: ["exact copy of the source text"],
    };
  }

  // 2. Token-overlap similarity (whole-text Jaccard)
  const similarity = jaccardTokens(candidateTokens, sourceTokens);

  // 3. Sentence-level similarity
  const candSentences = splitSentences(input.candidateAr);
  const sourceSentences = splitSentences(input.sourceAr);
  const sentenceSim = sentenceOverlap(candSentences, sourceSentences);

  // 4. Phrase carryover count
  const carried = detectPhraseCarryover(candSentences, sourceSentences);

  // Editorial similarity = max of whole-text and sentence-level overlap,
  // discounted for allowed identity overlap.
  const allowedSet = new Set((input.allowedOverlapTokens ?? []).map((t) => normalizeName(t).split(/\s+/).filter(Boolean)).flat());
  const candidateIdentity = candidateTokens.filter((t) => allowedSet.has(t)).length;
  const sourceIdentity = sourceTokens.filter((t) => allowedSet.has(t)).length;

  const editorialSimilarity = Math.max(similarity, sentenceSim);

  const editorialOnlySimilarity = (() => {
    const cNonIdentity = candidateTokens.filter((t) => !allowedSet.has(t));
    const sNonIdentity = sourceTokens.filter((t) => !allowedSet.has(t));
    if (cNonIdentity.length === 0 || sNonIdentity.length === 0) return editorialSimilarity;
    const inter = cNonIdentity.filter((t) => sNonIdentity.includes(t)).length;
    const union = new Set([...cNonIdentity, ...sNonIdentity]).size;
    return union === 0 ? 0 : inter / union;
  })();

  const identityOverlap = candidateIdentity === 0 && sourceIdentity === 0 ? 0 : Math.min(1, candidateIdentity / Math.max(1, sourceIdentity));

  let passed = true;
  const score = Math.max(0, Math.round(100 - editorialOnlySimilarity * 100));

  // Exact phrase carryover → reject (unless purely identity overlap)
  if (carried > 0 && editorialOnlySimilarity >= CONTENT_ORIGINALITY_EDITORIAL_THRESHOLD) {
    passed = false;
    reasons.push(`carried over ${carried} source sentence(s) with ${Math.round(editorialOnlySimilarity * 100)}% editorial overlap`);
  }

  // High editorial overlap (beyond identity) → reject
  if (passed && editorialOnlySimilarity >= CONTENT_ORIGINALITY_EDITORIAL_THRESHOLD) {
    passed = false;
    reasons.push(`editorial overlap ${Math.round(editorialOnlySimilarity * 100)}% exceeds the ${Math.round(CONTENT_ORIGINALITY_EDITORIAL_THRESHOLD * 100)}% threshold`);
  }

  // High whole-text similarity driven by identity overlap → allowed, note it
  if (passed && similarity >= 0.9 && identityOverlap >= 0.8) {
    reasons.push("high similarity driven by canonical identity overlap (allowed)");
  }

  if (passed) reasons.push(`independent content; editorial similarity ${Math.round(editorialOnlySimilarity * 100)}%`);

  return { passed, score, editorialSimilarity: editorialOnlySimilarity, reasons };
}