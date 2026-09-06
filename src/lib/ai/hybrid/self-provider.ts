/**
 * PART 3 — SELF AI PROVIDER (DETERMINISTIC IN-APP ENGINE)
 * ========================================================
 * A real, always-available provider that implements the exact same
 * `AIProvider.generateInsight` contract used by the OpenAI adapter. It parses
 * the fixed Part 1 prompt envelope (CONTENT BRIEF + VERIFIED FACTS) and emits
 * the strict JSON payload the Part 1 generator expects.
 *
 * The self engine composes editorial copy ONLY from the verified facts it was
 * given — one fact per sentence, so the downstream validator maps every claim
 * to a fact with full overlap. It never invents facts, prices, discounts or
 * results. Creative richness comes from the OpenAI adapter and the creative
 * idea engine; the self engine is deterministic on purpose so the full
 * validation/originality/safety pipeline stays testable offline.
 */

import type { AIProvider, RawAIResult } from "../../ai/provider";
import type { AIProviderConfig, AIProviderMetrics } from "../../ai/types";
import type {
  ContentLanguage,
  PriceRequirement,
  VerifiedProductFact,
} from "../content/types";
import { ALLOWED_LATIN_TOKENS } from "../content/validator";
import { HYBRID_AI_ENGINE_VERSION } from "./types";

export const SELF_PROVIDER_LABEL = "self";

const SELF_MODEL = "self-engine-part3-v1";

/* ------------------------------------------------------------------------ */
/* PROMPT PARSING (markers are part of the fixed Part 1 prompt)              */
/* ------------------------------------------------------------------------ */

interface ParsedBriefMeta {
  contentType: string;
  objective: string;
  categoryId: string | null;
  productIds: string[];
  language: string;
  imageRequirement: string;
  priceRequirement: string;
  cta: string | null;
}

interface ParsedProduct {
  id: string;
  nameAr: string;
  nameEn: string;
  brand: string;
  category: string | null;
  image: string | null;
  facts: VerifiedProductFact[];
}

interface ParsedContext {
  version: string;
  products: ParsedProduct[];
}

const BRIEF_MARKER = "CONTENT BRIEF (JSON):";
const FACTS_MARKER = "VERIFIED FACTS (the ONLY allowed factual source):";
const INSTRUCTIONS_MARKER = "INSTRUCTIONS:";

function extractSection(text: string, start: string, end: string | null): string | null {
  const startIdx = text.indexOf(start);
  if (startIdx === -1) return null;
  const from = startIdx + start.length;
  const endIdx = end ? text.indexOf(end, from) : text.length;
  if (endIdx === -1) return null;
  return text.slice(from, endIdx).trim();
}

function extractJsonObject(text: string, start: string, end: string | null): string | null {
  const section = extractSection(text, start, end);
  if (!section) return null;
  const open = section.indexOf("{");
  const close = section.lastIndexOf("}");
  if (open === -1 || close <= open) return null;
  return section.slice(open, close + 1).trim();
}

function parseBriefMeta(user: string): ParsedBriefMeta | null {
  const raw = extractJsonObject(user, BRIEF_MARKER, FACTS_MARKER);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    return {
      contentType: typeof o.contentType === "string" ? o.contentType : "CUSTOM_OTHER",
      objective: typeof o.objective === "string" ? o.objective : "DISCOVERY",
      categoryId: typeof o.categoryId === "string" ? o.categoryId : null,
      productIds: Array.isArray(o.productIds) ? (o.productIds as string[]).filter((x) => typeof x === "string") : [],
      language: typeof o.language === "string" ? o.language : "ar",
      imageRequirement: typeof o.imageRequirement === "string" ? o.imageRequirement : "optional",
      priceRequirement: typeof o.priceRequirement === "string" ? o.priceRequirement : "forbidden",
      cta: typeof o.cta === "string" && o.cta.trim() ? o.cta : null,
    };
  } catch {
    return null;
  }
}

function parseContext(user: string): ParsedContext | null {
  const raw = extractJsonObject(user, FACTS_MARKER, INSTRUCTIONS_MARKER);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { version?: string; products?: unknown[] };
    const products = Array.isArray(o.products)
      ? o.products
          .map((p): ParsedProduct | null => {
            const r = p as Record<string, unknown>;
            if (!r || typeof r !== "object") return null;
            return {
              id: typeof r.id === "string" ? r.id : "unknown",
              nameAr: typeof r.nameAr === "string" ? r.nameAr : "",
              nameEn: typeof r.nameEn === "string" ? r.nameEn : "",
              brand: typeof r.brand === "string" ? r.brand : "",
              category: typeof r.category === "string" ? r.category : null,
              image: typeof r.image === "string" ? r.image : null,
              facts: Array.isArray(r.facts) ? (r.facts as VerifiedProductFact[]) : [],
            };
          })
          .filter((p): p is ParsedProduct => p !== null)
      : [];
    return { version: typeof o.version === "string" ? o.version : "unknown", products };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------------ */
/* TITLE BUILDER                                                             */
/* ------------------------------------------------------------------------ */

function selfTitle(contentType: string, nameAr: string): string {
  switch (contentType) {
    case "PRODUCT_SPOTLIGHT":
      return `تعرف على ${nameAr}`;
    case "NEW_PRODUCT":
      return `جديدنا: ${nameAr}`;
    case "COMPARISON":
      return `قارن بين منتجاتنا`;
    case "ROUTINE":
      return `روتين العناية بمنتجاتنا`;
    case "FAQ":
      return `أسئلة شائعة عن ${nameAr}`;
    case "MYTH_FACT":
      return `خرافة وحقيقة: ${nameAr}`;
    case "GIFTING":
      return `فكرة هدية: ${nameAr}`;
    case "SEASONAL":
      return `${nameAr} لهذا الموسم`;
    case "ENGAGEMENT":
      return `شاركنا تجربتك مع ${nameAr}`;
    case "COMMERCIAL":
      return `عرض على ${nameAr}`;
    case "EDUCATIONAL":
      return `دليلك إلى ${nameAr}`;
    default:
      return `لمسة جديدة من ${nameAr}`;
  }
}

/* ------------------------------------------------------------------------ */
/* BODY BUILDER — every sentence is a verified fact statement                */
/* ------------------------------------------------------------------------ */

const PRICE_FORBIDDEN: readonly string[] = ["forbidden"];

/**
 * True when a statement contains Latin tokens that the Arabic-first language
 * validator would flag (mirrors validateContentLanguage with the SAME allowed
 * set). The self engine skips such fact sentences so its output always passes
 * language validation — brand names that only exist in Latin are carried by the
 * title, never injected as a failed claim.
 */
function hasUnexpectedLatin(text: string): boolean {
  const words = text.split(/\s+/).filter((w) => /[A-Za-z]/.test(w) && !/[\u0600-\u06FF]/.test(w));
  return words.some((w) => {
    const base = w.toLowerCase().replace(/[^a-z]/g, "");
    return !ALLOWED_LATIN_TOKENS.has(base) && base.length > 2;
  });
}

function factSentence(fact: VerifiedProductFact, language: "ar" | "en" | "mixed"): string | null {
  const text =
    language === "en" ? fact.statementEn : language === "mixed" ? fact.statementAr : fact.statementAr;
  if (!text || text.trim().length === 0) return null;
  // Arabic-first output must never leak unapproved Latin (deterministic guard).
  if (language !== "en" && hasUnexpectedLatin(text)) return null;
  return `${text.trim()}.`;
}

export function buildSelfContentBody(
  products: ParsedProduct[],
  options: { language: ContentLanguage; priceRequirement: PriceRequirement },
): string {
  const language = options.language === "en" ? "en" : options.language === "mixed" ? "mixed" : "ar";
  const lines: string[] = [];

  for (const product of products) {
    if (!product.facts || product.facts.length === 0) continue;
    const blocks: string[] = [];

    const identity = product.facts.filter((f) => f.kind === "identity");
    const category = product.facts.filter((f) => f.kind === "category");
    const benefits = product.facts.filter((f) => f.kind === "benefit").slice(0, 4);
    const usage = product.facts.filter((f) => f.kind === "usage");
    const size = product.facts.filter((f) => f.kind === "size");
    const ingredients = product.facts.filter((f) => f.kind === "ingredient").slice(0, 5);
    const pricingAllowed = !PRICE_FORBIDDEN.includes(options.priceRequirement);
    const price = pricingAllowed ? product.facts.filter((f) => f.kind === "price") : [];
    const discount = pricingAllowed ? product.facts.filter((f) => f.kind === "discount" && f.isDiscount) : [];

    for (const f of [...identity, ...category]) {
      const s = factSentence(f, language);
      if (s) blocks.push(s);
    }
    for (const f of benefits) {
      const s = factSentence(f, language);
      if (s) blocks.push(s);
    }
    for (const f of usage) {
      const s = factSentence(f, language);
      if (s) blocks.push(s);
    }
    if (size.length > 0) {
      const s = factSentence(size[0], language);
      if (s) blocks.push(s);
    }
    if (ingredients.length > 0) {
      const s = factSentence(ingredients[0], language);
      if (s) blocks.push(s);
    }
    for (const f of [...price, ...discount]) {
      const s = factSentence(f, language);
      if (s) blocks.push(s);
    }

    if (blocks.length > 0) lines.push(blocks.join("\n"));
  }

  return lines.join("\n\n");
}

/* ------------------------------------------------------------------------ */
/* PAYLOAD BUILDER                                                           */
/* ------------------------------------------------------------------------ */

export function buildSelfContentPayload(
  brief: ParsedBriefMeta,
  context: ParsedContext,
): { title: string | null; body: string; callToAction: string | null; language: ContentLanguage; selectedProductIds: string[] } | null {
  if (!context.products || context.products.length === 0) return null;

  const language = (brief.language === "en" || brief.language === "mixed" ? brief.language : "ar") as ContentLanguage;
  const priceRequirement = (brief.priceRequirement === "required" || brief.priceRequirement === "optional"
    ? brief.priceRequirement
    : "forbidden") as PriceRequirement;

  const body = buildSelfContentBody(context.products, { language, priceRequirement });
  if (!body || body.trim().length === 0) return null;

  const primary = context.products[0];
  const title = selfTitle(brief.contentType, language === "en" && primary.nameEn ? primary.nameEn : primary.nameAr || primary.brand);

  return {
    title,
    body,
    callToAction: brief.cta ?? null,
    language,
    selectedProductIds: brief.productIds.length > 0 ? brief.productIds : context.products.map((p) => p.id),
  };
}

/* ------------------------------------------------------------------------ */
/* SELF PROVIDER (implements the canonical AIProvider contract)              */
/* ------------------------------------------------------------------------ */

export class SelfAIProvider implements AIProvider {
  constructor(private readonly engineVersion = HYBRID_AI_ENGINE_VERSION) {}

  async generateInsight(
    _systemPrompt: string,
    userMessage: string,
    _config: AIProviderConfig,
  ): Promise<RawAIResult> {
    const brief = parseBriefMeta(userMessage);
    const context = parseContext(userMessage);
    const metrics: AIProviderMetrics = {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      latencyMs: 0,
      model: SELF_MODEL,
    };

    if (!brief || !context) {
      return {
        rawContent: null,
        error: { code: "ai_invalid_response", message: "self engine could not parse the prompt envelope" },
        metrics,
      };
    }
    if (context.products.length === 0) {
      return {
        rawContent: null,
        error: { code: "ai_invalid_response", message: "self engine received an empty verified product context" },
        metrics,
      };
    }

    const payload = buildSelfContentPayload(brief, context);
    if (!payload) {
      return {
        rawContent: null,
        error: { code: "ai_invalid_response", message: "self engine could not build content from the verified facts" },
        metrics,
      };
    }

    return {
      rawContent: JSON.stringify({
        title: payload.title,
        body: payload.body,
        callToAction: payload.callToAction,
        language: payload.language,
        selectedProductIds: payload.selectedProductIds,
        factualClaims: [],
        status: "GENERATED",
      }),
      error: null,
      metrics,
    };
  }
}

export function createSelfAIProvider(): AIProvider {
  return new SelfAIProvider();
}

export type { ParsedBriefMeta, ParsedProduct, ParsedContext };
export { SELF_MODEL };