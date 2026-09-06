/**
 * PART 1 — AI CONTENT & CAMPAIGN INTELLIGENCE — CORE TYPES
 * =========================================================
 *
 * Canonical types for the Content Intelligence Engine:
 *  - ContentItem (the persisted, validated content unit)
 *  - ContentBrief (the AI input, built deterministically BEFORE generation)
 *  - Content taxonomy (types, objectives)
 *  - Selection weights + exposure tracking
 *  - Structured reason codes + autonomous publishing eligibility
 *
 * The engine is server-side only, deterministic, and reuses the existing
 * verified-fact pipelines (publication, source-hierarchy, product-pricing,
 * product-image, product-name/description). The AI is NEVER the source of
 * truth — it generates editorial copy from verified facts, then validation
 * gates that copy.
 */

export const CONTENT_ENGINE_VERSION = "content_engine_part1_v1";
export const CONTENT_BRIEF_VERSION = "content_brief_v1";

/* ------------------------------------------------------------------------ */
/* LANGUAGE                                                                  */
/* ------------------------------------------------------------------------ */

export type ContentLanguage = "ar" | "en" | "mixed";

/* ------------------------------------------------------------------------ */
/* CONTENT TYPE TAXONOMY                                                     */
/* ------------------------------------------------------------------------ */

export type ContentType =
  | "EDUCATIONAL"
  | "PRODUCT_SPOTLIGHT"
  | "NEW_PRODUCT"
  | "COMPARISON"
  | "ROUTINE"
  | "FAQ"
  | "MYTH_FACT"
  | "ENGAGEMENT"
  | "GIFTING"
  | "SEASONAL"
  | "COMMERCIAL"
  | "CUSTOM_OTHER";

/**
 * PART 3 — Creative intelligence marker. The `CUSTOM_OTHER` type exists so the
 * creative idea engine is NOT artificially limited to the 11 base taxonomy
 * types. It is intentionally absent from `CONTENT_TYPES` (which stays a
 * 11-type taxonomy) — the union simply allows the engine to express "a new,
 * valid creative angle that fits no fixed slot". Any item generated from a
 * CUSTOM_OTHER idea still passes the exact same validation/originality/
 * safety pipeline, and because its taxonomy risk is medium it can never be
 * auto-published without admin review.
 */
export const CUSTOM_CONTENT_TYPE = "CUSTOM_OTHER" as const;

export const CONTENT_TYPES: readonly ContentType[] = [
  "EDUCATIONAL",
  "PRODUCT_SPOTLIGHT",
  "NEW_PRODUCT",
  "COMPARISON",
  "ROUTINE",
  "FAQ",
  "MYTH_FACT",
  "ENGAGEMENT",
  "GIFTING",
  "SEASONAL",
  "COMMERCIAL",
];

/* ------------------------------------------------------------------------ */
/* CONTENT OBJECTIVE TAXONOMY                                                */
/* ------------------------------------------------------------------------ */

export type ContentObjective =
  | "AWARENESS"
  | "EDUCATION"
  | "DISCOVERY"
  | "ENGAGEMENT"
  | "CONVERSION"
  | "RETENTION"
  | "CROSS_SELL"
  | "UPSELL"
  | "REACTIVATION";

export const CONTENT_OBJECTIVES: readonly ContentObjective[] = [
  "AWARENESS",
  "EDUCATION",
  "DISCOVERY",
  "ENGAGEMENT",
  "CONVERSION",
  "RETENTION",
  "CROSS_SELL",
  "UPSELL",
  "REACTIVATION",
];

/* ------------------------------------------------------------------------ */
/* CONTENT ITEM STATUS                                                       */
/* ------------------------------------------------------------------------ */

/**
 * Part 1 statuses only. Scheduling/publishing (live/queued/sent) belongs to
 * Part 2 and is intentionally NOT part of this model yet.
 */
export type ContentStatus =
  | "GENERATED"
  | "VALIDATING"
  | "REVIEW_REQUIRED"
  | "APPROVED";

/* ------------------------------------------------------------------------ */
/* IMAGE REQUIREMENT (brief-level, mirrors the canonical image resolver)     */
/* ------------------------------------------------------------------------ */

export type ImageRequirement = "required" | "optional" | "none";
export type PriceRequirement = "forbidden" | "optional" | "required";

/* ------------------------------------------------------------------------ */
/* REVIEW REASON CODES (structured, deterministic, auditable)                */
/* ------------------------------------------------------------------------ */

export type ReviewReasonCode =
  | "UNSUPPORTED_CLAIM"
  | "ORIGINALITY_FAILURE"
  | "MISSING_PRODUCT_FACT"
  | "STALE_PRICE"
  | "IMAGE_NOT_READY"
  | "PRODUCT_NOT_PUBLISHED"
  | "IDENTITY_MISMATCH"
  | "LANGUAGE_CONTAMINATION"
  | "INSUFFICIENT_EVIDENCE";

export const REVIEW_REASON_CODES: readonly ReviewReasonCode[] = [
  "UNSUPPORTED_CLAIM",
  "ORIGINALITY_FAILURE",
  "MISSING_PRODUCT_FACT",
  "STALE_PRICE",
  "IMAGE_NOT_READY",
  "PRODUCT_NOT_PUBLISHED",
  "IDENTITY_MISMATCH",
  "LANGUAGE_CONTAMINATION",
  "INSUFFICIENT_EVIDENCE",
];

/* ------------------------------------------------------------------------ */
/* AUTONOMOUS PUBLISHING ELIGIBILITY (Part 2 can run fully autonomously)     */
/* ------------------------------------------------------------------------ */

/**
 * Decision applied to EVERY generated content item. Deterministic and
 * auditable via the structured `reasons`. The AI never overrides validation
 * rules; a low-risk, fully-validated item is AUTO_PUBLISH_ELIGIBLE and does
 * NOT require manual admin approval (Part 2 may auto-publish it).
 */
export type PublishingEligibility =
  | "AUTO_PUBLISH_ELIGIBLE"
  | "ADMIN_REVIEW_REQUIRED"
  | "BLOCKED";

/* ------------------------------------------------------------------------ */
/* VERIFIED FACT + SOURCE REFERENCE                                          */
/* ------------------------------------------------------------------------ */

export interface SourceFactRef {
  /** Machine source key, e.g. "category:serums" | "ingredient:جلسرين" | "price" | "usage". */
  evidence: string;
  /** Human-readable source label. */
  source: string;
}

export interface ClaimMapping {
  /** The claim as written in the AI output. */
  claim: string;
  /** The verified fact it maps to, or null when unsupported. */
  matchedFact: string | null;
  supported: boolean;
  reason: string;
}

/* ------------------------------------------------------------------------ */
/* MEDIA REFERENCE (canonical image only — never AI-invented URLs)           */
/* ------------------------------------------------------------------------ */

export interface MediaReference {
  kind: "product_image" | "category_image" | "none";
  productId?: string;
  imageUrl?: string;
}

/* ------------------------------------------------------------------------ */
/* VALIDATION + ORIGINALITY RESULTS                                          */
/* ------------------------------------------------------------------------ */

export interface ContentValidation {
  passed: boolean;
  status: "VALID" | "REVIEW_REQUIRED" | "FAILED";
  claimMappings: ClaimMapping[];
  pricingValidated: boolean;
  discountValidated: boolean;
  languageValid: boolean;
  reasons: Array<{ code: ReviewReasonCode; message: string }>;
}

export interface ContentOriginality {
  passed: boolean;
  score: number; // 0..100, higher = more independent
  editorialSimilarity: number; // 0..1
  reasons: string[];
}

/* ------------------------------------------------------------------------ */
/* CONTENT ITEM (canonical persisted unit)                                   */
/* ------------------------------------------------------------------------ */

export interface ContentItem {
  id: string;
  categoryId: string | null;
  subcategoryId: string | null;
  contentType: ContentType;
  objective: ContentObjective;
  productIds: string[];
  title: string | null;
  body: string;
  callToAction: string | null;
  language: ContentLanguage;
  mediaReference: MediaReference;
  contentBriefId: string;
  promptVersion: string;
  sourceFacts: SourceFactRef[];
  validation: ContentValidation;
  originality: ContentOriginality;
  status: ContentStatus;
  eligibility: PublishingEligibility;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------------ */
/* CONTENT BRIEF (built BEFORE AI generation)                                */
/* ------------------------------------------------------------------------ */

export interface ContentBrief {
  id: string;
  categoryId: string | null;
  subcategoryId: string | null;
  contentType: ContentType;
  objective: ContentObjective;
  productIds: string[];
  audience: string | null;
  language: ContentLanguage;
  channelNeutral: true;
  verifiedFacts: VerifiedProductFact[];
  imageRequirement: ImageRequirement;
  priceRequirement: PriceRequirement;
  prohibitedClaims: string[];
  tone: string[];
  cta: string | null;
  briefVersion: string;
}

/* ------------------------------------------------------------------------ */
/* VERIFIED PRODUCT FACT (source of truth the AI must use)                   */
/* ------------------------------------------------------------------------ */

export interface VerifiedProductFact {
  kind:
    | "identity"
    | "category"
    | "ingredient"
    | "benefit"
    | "usage"
    | "price"
    | "discount"
    | "size"
    | "image";
  /** Normalized Arabic-first statement, e.g. "يرطب البشرة بعمق". */
  statementAr: string;
  /** English statement where available. */
  statementEn: string | null;
  /** Machine evidence key for the canonical source. */
  evidence: string;
  /** Human-readable source label. */
  source: string;
  /** When the fact is price-related, the canonical runtime price used. */
  price?: number;
  /** True when the fact is a genuine promotional discount (never the -200 rule). */
  isDiscount?: boolean;
  /** The genuine discount percentage (only when isDiscount). */
  discountPercent?: number;
}

/* ------------------------------------------------------------------------ */
/* SELECTION WEIGHTS (single deterministic config object)                    */
/* ------------------------------------------------------------------------ */

export interface ContentSelectionWeights {
  categoryRelevance: number;
  objectiveRelevance: number;
  verifiedDataCompleteness: number;
  freshness: number;
  repetitionPenalty: number;
  seasonalRelevance: number;
  campaignRelevance: number;
  performanceRelevance: number;
}

export const CONTENT_SELECTION_WEIGHTS: ContentSelectionWeights = {
  categoryRelevance: 0.25,
  objectiveRelevance: 0.2,
  verifiedDataCompleteness: 0.15,
  freshness: 0.1,
  repetitionPenalty: 0.12,
  seasonalRelevance: 0.08,
  campaignRelevance: 0.06,
  performanceRelevance: 0.04,
};

/* ------------------------------------------------------------------------ */
/* EXPOSURE / FATIGUE TRACKING                                               */
/* ------------------------------------------------------------------------ */

export interface CategoryExposure {
  categoryId: string | null;
  exposureCount: number;
  lastAppearanceAt: string | null;
}

export interface ProductExposure {
  productId: string;
  appearances24h: number;
  appearances7d: number;
  appearances30d: number;
  lastAppearanceAt: string | null;
}

export interface ContentTypeExposure {
  contentType: ContentType;
  exposureCount: number;
  lastAppearanceAt: string | null;
}

export interface ContentHistory {
  items: ContentItem[];
  categories: CategoryExposure[];
  products: ProductExposure[];
  contentTypes: ContentTypeExposure[];
}

/* ------------------------------------------------------------------------ */
/* SELECTION RESULT + REASON TRACE                                           */
/* ------------------------------------------------------------------------ */

export interface SelectionReason {
  key:
    | "published"
    | "category_relevance"
    | "objective_relevance"
    | "verified_data_completeness"
    | "freshness"
    | "repetition_penalty"
    | "seasonal_relevance"
    | "campaign_relevance"
    | "performance_relevance"
    | "diversity_penalty"
    | "category_underexposed"
    | "category_overexposed"
    | "product_not_used_recently"
    | "product_fatigue"
    | "blocked"
    | "selected";
  scoreDelta: number;
  detail: string;
}

export interface ContentCandidate {
  productId: string;
  categoryId: string | null;
  categorySlug: string | null;
  baseScore: number;
  finalScore: number;
  reasons: SelectionReason[];
}

export interface NextBestContent {
  contentItem: ContentItem | null;
  reasons: SelectionReason[];
}

/* ------------------------------------------------------------------------ */
/* IDEA (planner output)                                                     */
/* ------------------------------------------------------------------------ */

export interface ContentIdea {
  title: string;
  categoryId: string | null;
  contentType: ContentType;
  objective: ContentObjective;
  productIds: string[];
  reason: string;
  priority: "high" | "medium" | "low";
}

/* ------------------------------------------------------------------------ */
/* GENERATION INPUT / OUTPUT                                                 */
/* ------------------------------------------------------------------------ */

export interface ContentGenerationRequest {
  briefId?: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  contentType: ContentType;
  objective: ContentObjective;
  productIds: string[];
  language?: ContentLanguage;
  campaignId?: string | null;
}

export interface GeneratedContentPayload {
  title: string | null;
  body: string;
  callToAction: string | null;
  language: ContentLanguage;
  selectedProductIds: string[];
  factualClaims: ClaimMapping[];
  status: ContentStatus;
}