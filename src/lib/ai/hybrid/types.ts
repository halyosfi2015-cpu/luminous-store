/**
 * PART 3 — HYBRID AI ENGINE — TYPES
 * ==================================
 * Canonical types for the hybrid provider layer. `HybridAIProviderName` is
 * owned by the Part 2 domain model (settings persistence) and re-exported here
 * so the whole AI layer shares one spelling.
 *
 * Design invariant: the provider switch ONLY changes which engine produces the
 * raw insight. Every downstream rule (fact validation, originality, pricing,
 * language, eligibility, approval, scheduling, publishing) is shared Part 1/2
 * code and is NEVER modified by the active provider.
 */

import type { HybridAIProviderName } from "../../content-ops/types";
import type { ContentType, ContentObjective, ContentIdea } from "../content/types";

export type { HybridAIProviderName };

export const HYBRID_AI_ENGINE_VERSION = "content_hybrid_part3_v1";

/* ------------------------------------------------------------------------ */
/* PROVIDER STATUS                                                           */
/* ------------------------------------------------------------------------ */

export interface HybridProviderStatus {
  version: string;
  /** What the admin selected. */
  selected: HybridAIProviderName;
  /** What will actually be used for generation right now. */
  effective: HybridAIProviderName;
  /** True when the effective provider differs from the selected one. */
  fallbackUsed: boolean;
  /** OpenAI is only "configured" when a server-side API key exists. */
  openaiConfigured: boolean;
  /** The self engine is always available. */
  selfAvailable: boolean;
  /** True when generation can actually run right now. */
  ready: boolean;
  /** Human message (Arabic-first) shown in the admin UI. */
  messageAr: string;
  messageEn: string;
}

/* ------------------------------------------------------------------------ */
/* SCORED CREATIVE IDEA                                                      */
/* ------------------------------------------------------------------------ */

export interface CreativeAngleRef {
  /** Machine key of the creative angle. */
  key: string;
  labelAr: string;
}

export interface ScoredContentIdea extends ContentIdea {
  /** 0..1 composite score used to rank the idea board. */
  score: number;
  /** 0..1 fatigue-based novelty (higher = fresher). */
  novelty: number;
  /** 0..1 seasonal relevance (higher = more timely). */
  seasonalRelevance: number;
  /** True when the idea targets an active campaign's product(s). */
  campaignAligned: boolean;
  /** Where the idea came from. */
  source: "taxonomy" | "creative" | "external";
  /** The creative angle when source === "creative". */
  angle?: CreativeAngleRef;
  /** When non-null, this idea was demoted as near-duplicate of another. */
  nearDuplicateOf?: string;
}

export interface GenerateBestIdeasInput {
  /** Up to this many ranked ideas to return. */
  limit?: number;
  /** Maximum creative (non-taxonomy) ideas to inject. */
  creativeLimit?: number;
  /** Content types to favor (diversity distribution). */
  contentTypes?: ContentType[];
  /** Objectives to favor. */
  objectives?: ContentObjective[];
  /** Published product ids to restrict to (empty = all published). */
  productIds?: string[];
  /** Active campaign products (boost). */
  campaignProductIds?: string[];
  /** IDs already over-exposed (fatigue). */
  fatiguedProductIds?: string[];
  /** ISO timestamp for seasonality. */
  now?: string;
}