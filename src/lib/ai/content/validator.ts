/**
 * PART 1 — CONTENT VALIDATOR
 * ==========================
 *
 * Post-generation validation gates:
 *  - Fact validation: every claim in the AI output must map to a verified fact.
 *  - Pricing validation: price claims must match canonical runtime pricing.
 *  - Discount validation: only genuine discounts; never the -200 YER rule.
 *  - Language validation: Arabic-first, no English leakage / contamination.
 *  - Brand/safety validation: prohibited claims absent.
 *
 * Structured review reason codes:
 *  UNSUPPORTED_CLAIM, MISSING_PRODUCT_FACT, STALE_PRICE, LANGUAGE_CONTAMINATION,
 *  INSUFFICIENT_EVIDENCE, PRODUCT_NOT_PUBLISHED, IDENTITY_MISMATCH, IMAGE_NOT_READY,
 *  ORIGINALITY_FAILURE.
 */

import { normalizeName, tokenize } from "@/src/lib/product-name";
import type {
  ContentValidation,
  ClaimMapping,
  ReviewReasonCode,
  VerifiedProductFact,
} from "./types";
import { PROHIBITED_CLAIM_RE } from "@/src/lib/product-description";

/* ------------------------------------------------------------------------ */
/* FACT VALIDATION                                                           */
/* ------------------------------------------------------------------------ */

export interface FactValidationResult {
  passed: boolean;
  claimMappings: ClaimMapping[];
  reasons: Array<{ code: ReviewReasonCode; message: string }>;
}

const CLAIM_SPLIT_RE = /(?<=[.۔.!؟])/g;

function splitClaims(body: string): string[] {
  return body
    .split(CLAIM_SPLIT_RE)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

/** Script of a claim — claims validate against facts in the SAME language. */
function claimScript(text: string): "ar" | "en" {
  const ar = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const en = (text.match(/[A-Za-z]/g) ?? []).length;
  return ar >= en ? "ar" : "en";
}

function factTokenSet(fact: VerifiedProductFact, script: "ar" | "en"): Set<string> {
  const text = script === "ar" ? fact.statementAr : (fact.statementEn ?? "");
  return new Set(tokenize(normalizeName(text)).filter((t) => t.length > 1));
}

/** Map a claim to the verified fact that best supports it (token overlap). */
export function mapClaimToFact(claim: string, facts: VerifiedProductFact[]): ClaimMapping {
  const script = claimScript(claim);
  const claimTokens = tokenize(normalizeName(claim)).filter((t) => t.length > 1);
  if (claimTokens.length === 0) {
    return { claim, matchedFact: null, supported: false, reason: "empty claim" };
  }

  let best: VerifiedProductFact | null = null;
  let bestScore = 0;
  for (const fact of facts) {
    const ft = factTokenSet(fact, script);
    if (ft.size === 0) continue;
    const inter = claimTokens.filter((t) => ft.has(t)).length;
    const union = new Set([...claimTokens, ...ft]).size;
    const score = inter / union;
    if (score > bestScore) {
      bestScore = score;
      best = fact;
    }
  }

  // Identity/category facts are strong anchors; a claim with >= 40% token
  // overlap with a verified fact is considered supported.
  const supported = bestScore >= 0.4 && best !== null;

  if (supported && best) {
    return {
      claim,
      matchedFact: best.statementAr,
      supported: true,
      reason: `matched fact "${best.statementAr}" (overlap ${Math.round(bestScore * 100)}%)`,
    };
  }
  return {
    claim,
    matchedFact: null,
    supported: false,
    reason: best ? `insufficient overlap (${Math.round(bestScore * 100)}%) with "${best.statementAr}"` : "no matching verified fact",
  };
}

export function validateContentFacts(body: string, facts: VerifiedProductFact[]): FactValidationResult {
  const reasons: Array<{ code: ReviewReasonCode; message: string }> = [];
  const claims = splitClaims(body);

  if (facts.length === 0) {
    reasons.push({ code: "INSUFFICIENT_EVIDENCE", message: "no verified facts provided to validate against" });
  }

  const claimMappings = claims.map((c) => mapClaimToFact(c, facts));
  const unsupported = claimMappings.filter((m) => !m.supported);

  let passed = unsupported.length === 0;
  if (unsupported.length > 0) {
    passed = false;
    for (const u of unsupported.slice(0, 5)) {
      reasons.push({ code: "UNSUPPORTED_CLAIM", message: `unsupported claim: "${u.claim.slice(0, 80)}" — ${u.reason}` });
    }
  }

  return { passed, claimMappings, reasons };
}

/* ------------------------------------------------------------------------ */
/* PRICING + DISCOUNT VALIDATION                                             */
/* ------------------------------------------------------------------------ */

export interface PricingValidationResult {
  passed: boolean;
  reasons: Array<{ code: ReviewReasonCode; message: string }>;
}

const PRICE_TOKEN_RE = /(\d[\d.,،]*)\s*(ريال|ير|yemeni|yer)/gi;

/** Detect price references in body and compare against canonical price. */
export function validateContentPricing(
  body: string,
  canonicalPrice: number | null,
  canonicalDiscountPercent: number | null,
): PricingValidationResult {
  const reasons: Array<{ code: ReviewReasonCode; message: string }> = [];
  const matches = [...body.matchAll(PRICE_TOKEN_RE)];

  if (matches.length === 0) return { passed: true, reasons: [] };

  // No canonical price → any price claim is unsupported.
  if (canonicalPrice === null) {
    reasons.push({ code: "UNSUPPORTED_CLAIM", message: "content mentions a price but no canonical price is available" });
    return { passed: false, reasons };
  }

  for (const m of matches) {
    const claimed = parseNumber(m[1]);
    if (claimed === null) continue;
    if (Math.abs(claimed - canonicalPrice) > 1) {
      reasons.push({ code: "STALE_PRICE", message: `claimed price ${claimed} differs from canonical ${canonicalPrice}` });
    }
  }

  // Discount % — genuine only (never the -200 rule).
  const discountMatch = body.match(/(\d{1,2})\s*%\s*(خصم|تخفيض)|خصم\s*(\d{1,2})\s*%/i);
  if (discountMatch) {
    const claimedDiscount = parseInt(discountMatch[1] ?? discountMatch[3] ?? "", 10);
    if (Number.isNaN(claimedDiscount)) {
      reasons.push({ code: "UNSUPPORTED_CLAIM", message: "unparseable discount percentage" });
    } else if (canonicalDiscountPercent === null) {
      reasons.push({ code: "UNSUPPORTED_CLAIM", message: "content claims a discount but no genuine discount exists" });
    } else if (claimedDiscount !== canonicalDiscountPercent) {
      reasons.push({ code: "STALE_PRICE", message: `claimed discount ${claimedDiscount}% differs from canonical ${canonicalDiscountPercent}%` });
    }
  }

  // -200 rule / "وفّر 200" / "خصم 200" — never allowed.
  if (/\b(وفّ?ر|خصم|تخفيض)\s*200\b|\b200\s*(ريال)?\s*(خصم|تخفيض)/i.test(body)) {
    reasons.push({ code: "UNSUPPORTED_CLAIM", message: "content presents the -200 YER base rule as a discount/saving" });
  }

  return { passed: reasons.length === 0, reasons };
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[.,،]/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------------ */
/* LANGUAGE VALIDATION                                                       */
/* ------------------------------------------------------------------------ */

export interface LanguageValidationResult {
  passed: boolean;
  language: "ar" | "en" | "mixed";
  reasons: Array<{ code: ReviewReasonCode; message: string }>;
}

const ARABIC_RE = /[\u0600-\u06FF]/;
const LATIN_RE = /[A-Za-z]/;

const ALLOWED_LATIN_TOKENS = new Set([
  "luminous", "spf", "pa", "yer", "ml", "g", "kg", "cm", "mm", "vitamin",
  "skin", "hair", "face", "body",
]);

/** Exported so the hybrid self engine and the validator share ONE allowed set. */
export { ALLOWED_LATIN_TOKENS };

/** English-token leak detection: Latin words outside the allowed brand/spec set. */
export function validateContentLanguage(body: string, expectedLanguage: "ar" | "en" = "ar"): LanguageValidationResult {
  const reasons: Array<{ code: ReviewReasonCode; message: string }> = [];
  const hasArabic = ARABIC_RE.test(body);
  const hasLatin = LATIN_RE.test(body);

  if (expectedLanguage === "ar") {
    if (!hasArabic) {
      reasons.push({ code: "LANGUAGE_CONTAMINATION", message: "Arabic-first content contains no Arabic text" });
    }
    if (hasLatin) {
      const words = body.split(/\s+/).filter((w) => LATIN_RE.test(w) && !ARABIC_RE.test(w));
      const leaked = words.filter((w) => {
        const base = w.toLowerCase().replace(/[^a-z]/g, "");
        return !ALLOWED_LATIN_TOKENS.has(base) && base.length > 2;
      });
      if (leaked.length > 0) {
        reasons.push({ code: "LANGUAGE_CONTAMINATION", message: `unexpected Latin text in Arabic content: ${[...new Set(leaked)].slice(0, 5).join(", ")}` });
      }
    }
  } else {
    if (!hasLatin) {
      reasons.push({ code: "LANGUAGE_CONTAMINATION", message: "English content contains no Latin text" });
    }
    if (hasArabic && body.replace(ARABIC_RE, "").trim().length < body.length * 0.5) {
      reasons.push({ code: "LANGUAGE_CONTAMINATION", message: "English content contains significant Arabic text" });
    }
  }

  const language: "ar" | "en" | "mixed" = hasArabic && hasLatin ? "mixed" : hasArabic ? "ar" : "en";
  return { passed: reasons.length === 0, language, reasons };
}

/* ------------------------------------------------------------------------ */
/* PROHIBITED CLAIMS (brand/safety)                                          */
/* ------------------------------------------------------------------------ */

export function validateProhibitedClaims(body: string): Array<{ code: ReviewReasonCode; message: string }> {
  const reasons: Array<{ code: ReviewReasonCode; message: string }> = [];
  if (PROHIBITED_CLAIM_RE.test(body)) {
    reasons.push({ code: "UNSUPPORTED_CLAIM", message: "content contains a prohibited medical/guarantee claim" });
  }
  return reasons;
}

/* ------------------------------------------------------------------------ */
/* COMPOSITE                                                                 */
/* ------------------------------------------------------------------------ */

export interface ContentValidationOptions {
  canonicalPrice?: number | null;
  canonicalDiscountPercent?: number | null;
  expectedLanguage?: "ar" | "en";
}

export function validateGeneratedContent(
  body: string,
  facts: VerifiedProductFact[],
  options: ContentValidationOptions = {},
): ContentValidation {
  const reasons: Array<{ code: ReviewReasonCode; message: string }> = [];

  const factResult = validateContentFacts(body, facts);
  const pricingResult = validateContentPricing(body, options.canonicalPrice ?? null, options.canonicalDiscountPercent ?? null);
  const languageResult = validateContentLanguage(body, options.expectedLanguage ?? "ar");
  const prohibited = validateProhibitedClaims(body);

  reasons.push(...factResult.reasons, ...pricingResult.reasons, ...languageResult.reasons, ...prohibited);

  const passed = factResult.passed && pricingResult.passed && languageResult.passed && prohibited.length === 0;
  const status: ContentValidation["status"] = passed ? "VALID" : reasons.some((r) => r.code === "STALE_PRICE" || r.code === "ORIGINALITY_FAILURE") ? "REVIEW_REQUIRED" : "FAILED";

  return {
    passed,
    status,
    claimMappings: factResult.claimMappings,
    pricingValidated: pricingResult.passed,
    discountValidated: pricingResult.passed,
    languageValid: languageResult.passed,
    reasons,
  };
}

export { PROHIBITED_CLAIM_RE };