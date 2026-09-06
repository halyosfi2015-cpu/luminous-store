/**
 * PART 1 — CONTENT GENERATOR
 * ==========================
 *
 * generateContent:
 *   1. Build a prompt from SYSTEM/POLICY + VOICE + BRIEF + VERIFIED FACTS +
 *      CHANNEL-NEUTRAL FORMAT RULES.
 *   2. Call the AI provider (injectable for tests; defaults to createAIProvider()).
 *   3. Parse the structured JSON output.
 *   4. Validate (fact / pricing / discount / language / prohibited claims).
 *   5. Validate originality against the source editorial text (if any).
 *   6. Regenerate with targeted corrective instructions on failure (max retries).
 *   7. On exhaustion → REVIEW_REQUIRED with structured reason codes.
 *   8. Decide publishing eligibility (deterministic, auditable).
 */

import { randomUUID } from "crypto";
import type { AIProvider, RawAIResult } from "@/src/lib/ai/provider";
import { createAIProvider } from "@/src/lib/ai/provider";
import { getAIConfig } from "@/src/lib/ai/config";
import type {
  ContentBrief,
  ContentItem,
  GeneratedContentPayload,
  ContentStatus,
  PublishingEligibility,
  ReviewReasonCode,
  MediaReference,
} from "./types";
import { CONTENT_ENGINE_VERSION, CONTENT_BRIEF_VERSION } from "./types";
import { buildBrandVoicePrompt, buildVerifiedFactsPolicy, LUMINOUS_BRAND_VOICE } from "./brand-voice";
import { validateGeneratedContent } from "./validator";
import { validateContentOriginality } from "./originality";
import type { ContentContext } from "./context";
import { serializeContentContext } from "./context";

export const CONTENT_PROMPT_VERSION = "CONTENT_GENERATION_V1";
export const DEFAULT_MAX_GENERATION_RETRIES = 2;

/**
 * Reference-inspired social style: editorial pharmacy content with a clear
 * product hero, concise Arabic copy, and a calm vertical-first composition.
 * These are style constraints only; product facts remain canonical.
 */
export const LUMINOUS_SOCIAL_STYLE_RULES = [
  "REFERENCE-INSPIRED SOCIAL STYLE:",
  " - Write for a vertical social post: one clear hook, one product focus, and one practical benefit grounded in verified facts.",
  " - Keep Arabic copy concise, warm, and editorial; prefer short sentences and a readable rhythm suitable for an image overlay.",
  " - Make the product the visual hero; do not describe a scene, substitute imagery, or add decorative claims that are not in the facts.",
  " - Use a soft, premium pharmacy tone with a clear problem-to-routine angle and a restrained call to action.",
  " - Never use the phrase or claim that the product is recommended by dermatologists/doctors unless that exact verified fact exists.",
  " - Do not include platform-specific hashtags, copied slogans, competitor names, or text from reference accounts.",
].join("\n");

/* ------------------------------------------------------------------------ */
/* PROMPT ASSEMBLY                                                           */
/* ------------------------------------------------------------------------ */

export interface GenerationContextInput {
  brief: ContentBrief;
  context: ContentContext;
  sourceEditorialAr?: string;
  sourceEditorialEn?: string;
}

export function buildContentPrompt(input: GenerationContextInput): { system: string; user: string } {
  const { brief, context } = input;
  const voice = buildBrandVoicePrompt(LUMINOUS_BRAND_VOICE);
  const policy = buildVerifiedFactsPolicy();
  const meta = {
    contentType: brief.contentType,
    objective: brief.objective,
    categoryId: brief.categoryId,
    productIds: brief.productIds,
    language: brief.language,
    imageRequirement: brief.imageRequirement,
    priceRequirement: brief.priceRequirement,
    cta: brief.cta,
  };

  const system = [
    voice,
    policy,
    LUMINOUS_SOCIAL_STYLE_RULES,
    "CHANNEL-NEUTRAL FORMAT RULES:",
    " - Output STRICT JSON only, with exactly these keys: title, body, callToAction, language, selectedProductIds, factualClaims, status.",
    " - body is the full editorial content (Arabic-first by default).",
    " - Do NOT include markdown, code fences, or keys beyond the listed ones.",
    " - Do NOT mention that you are an AI, a model, or that this text was generated.",
    " - Never add fake urgency, scarcity, popularity or social proof.",
    " - Never invent prices, discounts, percentages or results.",
  ].join("\n");

  const user = [
    "CONTENT BRIEF (JSON):",
    JSON.stringify(meta, null, 2),
    "",
    LUMINOUS_SOCIAL_STYLE_RULES,
    "",
    "VERIFIED FACTS (the ONLY allowed factual source):",
    serializeContentContext(context),
    "",
    "INSTRUCTIONS:",
    " - Write the content using ONLY the verified facts above.",
    ` - Content type: ${brief.contentType}. Objective: ${brief.objective}.`,
    ` - Default language: ${brief.language}.`,
    ` - Image requirement: ${brief.imageRequirement}; price requirement: ${brief.priceRequirement}.`,
    " - If a needed fact is missing, omit the claim instead of inventing it.",
    " - Output the strict JSON described in the system prompt.",
  ].join("\n");

  return { system, user };
}

/* ------------------------------------------------------------------------ */
/* OUTPUT PARSING                                                           */
/* ------------------------------------------------------------------------ */

export interface ParsedGeneration {
  payload: GeneratedContentPayload | null;
  error: { code: "ai_invalid_response" | "ai_provider_error" | "ai_not_configured"; message: string } | null;
}

export function parseGeneratedContent(raw: string): ParsedGeneration {
  if (!raw || typeof raw !== "string") {
    return { payload: null, error: { code: "ai_invalid_response", message: "empty provider response" } };
  }
  let text = raw.trim();
  // Strip possible code fences
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { payload: null, error: { code: "ai_invalid_response", message: "response is not valid JSON" } };
  }
  if (!parsed || typeof parsed !== "object") {
    return { payload: null, error: { code: "ai_invalid_response", message: "response is not an object" } };
  }
  const o = parsed as Record<string, unknown>;
  if (typeof o.body !== "string" || o.body.trim().length === 0) {
    return { payload: null, error: { code: "ai_invalid_response", message: "response body is empty" } };
  }
  const language = (o.language as "ar" | "en" | "mixed") || "ar";
  const productIds = Array.isArray(o.selectedProductIds) ? (o.selectedProductIds as string[]).filter((x) => typeof x === "string") : [];

  const payload: GeneratedContentPayload = {
    title: typeof o.title === "string" && o.title.trim() ? o.title : null,
    body: o.body as string,
    callToAction: typeof o.callToAction === "string" && o.callToAction.trim() ? o.callToAction : null,
    language,
    selectedProductIds: productIds,
    factualClaims: [],
    status: "GENERATED",
  };
  return { payload, error: null };
}

/* ------------------------------------------------------------------------ */
/* ELIGIBILITY DECISION                                                      */
/* ------------------------------------------------------------------------ */

export function decideEligibility(input: {
  validationPassed: boolean;
  originalityPassed: boolean;
  contentTypeRisk: "low" | "medium" | "high";
  status: ContentStatus;
  reasonCodes: ReviewReasonCode[];
}): PublishingEligibility {
  const { validationPassed, originalityPassed, contentTypeRisk, status, reasonCodes } = input;

  if (!validationPassed || !originalityPassed) {
    return "BLOCKED";
  }
  if (status === "REVIEW_REQUIRED") {
    return "ADMIN_REVIEW_REQUIRED";
  }
  // Fully validated low-risk content is auto-publish eligible.
  if (contentTypeRisk === "low") {
    return "AUTO_PUBLISH_ELIGIBLE";
  }
  // Medium/high risk requires human sign-off even when valid.
  if (contentTypeRisk === "medium") {
    return reasonCodes.length === 0 ? "ADMIN_REVIEW_REQUIRED" : "ADMIN_REVIEW_REQUIRED";
  }
  return "ADMIN_REVIEW_REQUIRED";
}

/* ------------------------------------------------------------------------ */
/* MAIN GENERATOR                                                            */
/* ------------------------------------------------------------------------ */

export interface GenerateContentOptions {
  provider?: AIProvider;
  maxRetries?: number;
  sourceEditorialAr?: string;
  sourceEditorialEn?: string;
  allowedOverlapTokens?: string[];
  now?: string;
}

export interface GenerateContentResult {
  item: ContentItem | null;
  error: { code: string; message: string } | null;
  retriesUsed: number;
}

export async function generateContent(
  brief: ContentBrief,
  context: ContentContext,
  options: GenerateContentOptions = {},
): Promise<GenerateContentResult> {
  const provider = options.provider ?? createAIProvider();
  const config = getAIConfig();
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_GENERATION_RETRIES;
  const now = options.now ?? new Date().toISOString();

  if (context.products.length === 0 || !context.allProductsResolved) {
    return {
      item: null,
      error: { code: "invalid_request", message: "context has no resolved products" },
      retriesUsed: 0,
    };
  }

  let lastRaw: RawAIResult | null = null;
  let payload: GeneratedContentPayload | null = null;
  let validationResult = null as ReturnType<typeof validateGeneratedContent> | null;
  let originalityResult = null as ReturnType<typeof validateContentOriginality> | null;
  let used = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    used = attempt;
    const prompt = buildContentPrompt({ brief, context, sourceEditorialAr: options.sourceEditorialAr, sourceEditorialEn: options.sourceEditorialEn });

    // Add corrective instructions on retries
    if (attempt > 0 && validationResult) {
      const correction = correctionFor(validationResult, originalityResult);
      prompt.user += "\n\nCORRECTIVE INSTRUCTION FROM PREVIOUS ATTEMPT:\n" + correction;
    }

    lastRaw = await provider.generateInsight(prompt.system, prompt.user, config);
    if (lastRaw.error || !lastRaw.rawContent) {
      continue;
    }

    const parsed = parseGeneratedContent(lastRaw.rawContent);
    if (!parsed.payload) {
      continue;
    }
    payload = parsed.payload;

    const canonicalPrice = firstPrice(brief);
    const canonicalDiscount = firstDiscount(brief);

    validationResult = validateGeneratedContent(payload.body, brief.verifiedFacts, {
      canonicalPrice,
      canonicalDiscountPercent: canonicalDiscount,
      expectedLanguage: brief.language === "en" ? "en" : "ar",
    });

    originalityResult = validateContentOriginality({
      candidateAr: payload.body,
      sourceAr: options.sourceEditorialAr ?? "",
      sourceEn: options.sourceEditorialEn ?? "",
      allowedOverlapTokens: options.allowedOverlapTokens ?? brief.productIds,
    });

    if (validationResult.passed && originalityResult.passed) {
      break;
    }
  }

  if (!payload || !validationResult || !originalityResult) {
    return {
      item: null,
      error: { code: lastRaw?.error?.code ?? "ai_invalid_response", message: lastRaw?.error?.message ?? "generation failed" },
      retriesUsed: used,
    };
  }

  const status: ContentStatus = validationResult.passed && originalityResult.passed ? "APPROVED" : "REVIEW_REQUIRED";
  const reasonCodes = validationResult.reasons.map((r) => r.code);

  const eligibility = decideEligibility({
    validationPassed: validationResult.passed,
    originalityPassed: originalityResult.passed,
    contentTypeRisk: contentTypeRisk(brief.contentType),
    status,
    reasonCodes,
  });

  const item: ContentItem = {
    id: randomUUID(),
    categoryId: brief.categoryId,
    subcategoryId: brief.subcategoryId,
    contentType: brief.contentType,
    objective: brief.objective,
    productIds: payload.selectedProductIds.length > 0 ? payload.selectedProductIds : brief.productIds,
    title: payload.title,
    body: payload.body,
    callToAction: payload.callToAction,
    language: payload.language,
    mediaReference: resolveMediaReference(context),
    contentBriefId: brief.id,
    promptVersion: CONTENT_PROMPT_VERSION,
    sourceFacts: brief.verifiedFacts.map((f) => ({ evidence: f.evidence, source: f.source })),
    validation: validationResult,
    originality: originalityResult,
    status,
    eligibility,
    createdAt: now,
    updatedAt: now,
  };

  return { item, error: null, retriesUsed: used };
}

function correctionFor(
  validation: ReturnType<typeof validateGeneratedContent>,
  originality: ReturnType<typeof validateContentOriginality> | null,
): string {
  const parts: string[] = [];
  if (!validation.passed) {
    for (const r of validation.reasons.slice(0, 3)) {
      parts.push(` - ${r.code}: ${r.message}`);
    }
  }
  if (originality && !originality.passed) {
    parts.push(` - ORIGINALITY_FAILURE: ${originality.reasons.join("; ")}`);
  }
  if (parts.length === 0) parts.push(" - no specific defect recorded; rewrite independently using only the verified facts");
  return "Rewrite the content so that ALL of the following are fixed:\n" + parts.join("\n");
}

function firstPrice(brief: ContentBrief): number | null {
  const priceFact = brief.verifiedFacts.find((f) => f.kind === "price");
  return priceFact?.price ?? null;
}

function firstDiscount(brief: ContentBrief): number | null {
  const discountFact = brief.verifiedFacts.find((f) => f.kind === "discount");
  if (discountFact?.isDiscount && discountFact.discountPercent !== undefined) return discountFact.discountPercent;
  return null;
}

function contentTypeRisk(type: ContentBrief["contentType"]): "low" | "medium" | "high" {
  switch (type) {
    case "COMMERCIAL":
      return "high";
    case "PRODUCT_SPOTLIGHT":
    case "NEW_PRODUCT":
    case "COMPARISON":
    case "CUSTOM_OTHER":
      return "medium";
    default:
      return "low";
  }
}

/** Canonical image resolution: prefer the first product with a resolved image. */
function resolveMediaReference(context: ContentContext): MediaReference {
  for (const p of context.products) {
    if (p.image) {
      return { kind: "product_image", productId: p.id, imageUrl: p.image };
    }
  }
  return { kind: "none" };
}

export { CONTENT_ENGINE_VERSION, CONTENT_BRIEF_VERSION };