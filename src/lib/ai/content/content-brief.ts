/**
 * PART 1 — CONTENT BRIEF BUILDER
 * ==============================
 *
 * buildContentBrief builds the deterministic AI input BEFORE generation:
 *  - selected product IDs (from the selector — never the AI)
 *  - content type + objective + category
 *  - channel-neutral flag (fixed true)
 *  - verified facts (from buildContentContext)
 *  - image/price requirements from the content-type taxonomy
 *  - prohibited claims + tone from the brand voice config
 *  - CTA
 */

import { randomUUID } from "crypto";
import { CONTENT_BRIEF_VERSION } from "./types";
import type {
  ContentBrief,
  ContentType,
  ContentObjective,
  ContentLanguage,
  VerifiedProductFact,
  ImageRequirement,
  PriceRequirement,
} from "./types";
import { CONTENT_TYPE_META } from "./taxonomy";
import { LUMINOUS_BRAND_VOICE } from "./brand-voice";

export interface ContentBriefInput {
  categoryId?: string | null;
  subcategoryId?: string | null;
  contentType: ContentType;
  objective: ContentObjective;
  productIds: string[];
  audience?: string | null;
  language?: ContentLanguage;
  verifiedFacts: VerifiedProductFact[];
  cta?: string | null;
  id?: string;
}

export function buildContentBrief(input: ContentBriefInput): ContentBrief {
  const meta = CONTENT_TYPE_META[input.contentType];
  const language = input.language ?? "ar";
  const cta = input.cta ?? defaultCta(input.contentType, input.objective);

  return {
    id: input.id ?? randomUUID(),
    categoryId: input.categoryId ?? null,
    subcategoryId: input.subcategoryId ?? null,
    contentType: input.contentType,
    objective: input.objective,
    productIds: [...new Set(input.productIds)],
    audience: input.audience ?? null,
    language,
    channelNeutral: true,
    verifiedFacts: input.verifiedFacts,
    imageRequirement: meta.imageRequirement,
    priceRequirement: meta.priceRequirement,
    prohibitedClaims: LUMINOUS_BRAND_VOICE.prohibitions,
    tone: LUMINOUS_BRAND_VOICE.tone,
    cta,
    briefVersion: CONTENT_BRIEF_VERSION,
  };
}

export function defaultCta(contentType: ContentType, objective: ContentObjective): string | null {
  switch (contentType) {
    case "PRODUCT_SPOTLIGHT":
    case "COMMERCIAL":
    case "NEW_PRODUCT":
      return objective === "AWARENESS" ? "اكتشف المنتج" : "تسوق الآن";
    case "COMPARISON":
      return "قارن بين المنتجين";
    case "ROUTINE":
      return "ابدأ روتينك";
    case "GIFTING":
      return "اكتشف الهدية";
    default:
      return "اكتشف المزيد";
  }
}

export type { ImageRequirement, PriceRequirement };