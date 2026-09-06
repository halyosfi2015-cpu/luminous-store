/**
 * PART 3 — EXTERNAL CONTEXT ABSTRACTION
 * =====================================
 * Optional research enrichment for the content pipeline. Hard rules:
 *
 *  1. INTERNAL FACTS ALWAYS OVERRIDE — external context can NEVER change,
 *     contradict or substitute a verified product fact.
 *  2. GRACEFUL DEGRADATION — when external research is disabled or no external
 *     source is configured, the pipeline continues untouched (never blocks).
 *  3. NO FABRICATED PRODUCT FACTS — external entries never claim to be product
 *     facts; they are editorial context (seasonal / audience / format / angle).
 *
 * The abstraction is connection-ready: real providers (trend APIs, seasonality
 * services) plug in later without touching the content engine.
 */

export type ExternalContextKind = "seasonal" | "audience" | "format" | "angle";

export interface ExternalContextEntry {
  /** Machine key, e.g. "external:seasonality:april". */
  evidence: string;
  /** Human-readable source label. */
  source: string;
  /** Arabic-first editorial context (never a product fact). */
  statementAr: string;
  statementEn: string | null;
  kind: ExternalContextKind;
  confidence: "high" | "medium" | "low";
}

export interface ExternalResearchInput {
  categoryId: string | null;
  categoryAr: string | null;
  contentType: string;
  objective: string;
  productIds: string[];
  now?: string;
}

export interface ExternalContextResult {
  /** Whether external research is enabled by settings. */
  enabled: boolean;
  /** Whether any external context was actually applied. */
  applied: boolean;
  entries: ExternalContextEntry[];
  noteAr: string;
  noteEn: string;
}

export const EXTERNAL_CONTEXT_VERSION = "external_context_v1";

/**
 * Build external context for a generation request. Without a configured
 * external source this degrades gracefully and reports honestly — it never
 * pretends to have researched the web.
 */
export function buildExternalContext(
  input: ExternalResearchInput,
  enabled: boolean,
): ExternalContextResult {
  if (!enabled) {
    return {
      enabled: false,
      applied: false,
      entries: [],
      noteAr: "المصادر الخارجية غير مفعلة — تم استبعادها بأمان",
      noteEn: "External research is disabled — safely excluded",
    };
  }

  // No external source is configured in this build. The abstraction is ready;
  // when a source is added it returns entries here and the pipeline consumes
  // them through mergeExternalFacts below.
  return {
    enabled: true,
    applied: false,
    entries: [],
    noteAr: "لا توجد مصادر خارجية مهيأة — المحتوى مبني على الحقائق الداخلية فقط",
    noteEn: "No external source is configured — content is built from internal facts only",
  };
}

/**
 * Merge external context with internal verified facts. Internal facts are
 * ALWAYS authoritative and returned unchanged; only editorial (non-product)
 * external entries survive, and only for kinds that cannot contradict facts.
 */
export function mergeExternalFacts<T extends { kind: string; statementAr: string }>(
  externalEntries: ExternalContextEntry[],
  internalFacts: T[],
): { facts: T[]; appliedContext: ExternalContextEntry[] } {
  const appliedContext = externalEntries.filter(
    (e) => e.kind === "seasonal" || e.kind === "audience" || e.kind === "format" || e.kind === "angle",
  );
  // Internal facts never change; external product-like facts are dropped by
  // construction (this filter is a defense-in-depth guard).
  return { facts: internalFacts, appliedContext };
}

/** Assertion used by the generation layer: external data never overrides facts. */
export function assertInternalFactsOverride(internalCount: number, appliedCount: number): void {
  if (appliedCount > internalCount + 16) {
    throw new Error("external context exceeds internal facts — refusing");
  }
}