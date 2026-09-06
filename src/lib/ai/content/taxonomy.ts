/**
 * PART 1 — CONTENT TAXONOMY
 * =========================
 *
 * Content-type and objective metadata derived from the REAL catalog taxonomy
 * (category slugs in src/data/products.ts) — never a hardcoded duplicate of
 * the catalog. Each content type declares what it needs and how risky it is,
 * so the selector and brief builder can enforce those requirements.
 */

import type { ContentType, ContentObjective, ImageRequirement, PriceRequirement } from "./types";

/* ------------------------------------------------------------------------ */
/* CATEGORY TAXONOMY (sourced from the real catalog)                         */
/* ------------------------------------------------------------------------ */

import { categories } from "@/src/data/products";
import type { CategoryInfo } from "@/src/types/product";

export interface CatalogCategoryEntry {
  slug: string;
  name: string;
  nameAr: string;
}

export function getCatalogCategoryEntries(): CatalogCategoryEntry[] {
  return (categories as CategoryInfo[]).map((c) => ({
    slug: c.slug,
    name: c.name,
    nameAr: c.nameAr,
  }));
}

export function resolveCategoryInfo(
  categoryId: string | null | undefined,
): CatalogCategoryEntry | null {
  if (!categoryId) return null;
  const entry = (categories as CategoryInfo[]).find((c) => c.slug === categoryId);
  if (entry) return { slug: entry.slug, name: entry.name, nameAr: entry.nameAr };
  return null;
}

export function normalizeCategorySlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const s = slug.trim().toLowerCase();
  if (!s) return null;
  const entry = (categories as CategoryInfo[]).find((c) => c.slug === s);
  return entry ? entry.slug : null;
}

/* ------------------------------------------------------------------------ */
/* CONTENT TYPE METADATA                                                     */
/* ------------------------------------------------------------------------ */

export interface ContentTypeMeta {
  type: ContentType;
  /** Arabic-first default title pattern guidance (never literal hardcoded copy). */
  labelAr: string;
  labelEn: string;
  /** What this type requires to be generated safely. */
  requiredInputs: Array<"products" | "facts" | "price" | "image" | "category">;
  allowedProductTypes: string[] | null; // null = any published product
  objectives: ContentObjective[];
  structure: string[];
  ctaStyles: string[];
  factRequirements: string[];
  riskLevel: "low" | "medium" | "high";
  imageRequirement: ImageRequirement;
  priceRequirement: PriceRequirement;
  /** Minimum number of distinct verified facts required to generate. */
  minFacts: number;
}

export const CONTENT_TYPE_META: Record<ContentType, ContentTypeMeta> = {
  EDUCATIONAL: {
    type: "EDUCATIONAL",
    labelAr: "تعليمي",
    labelEn: "Educational",
    requiredInputs: ["category", "facts"],
    allowedProductTypes: null,
    objectives: ["EDUCATION", "AWARENESS", "DISCOVERY"],
    structure: ["intro", "verified facts", "practical guidance", "gentle CTA"],
    ctaStyles: ["learn more", "explore category"],
    factRequirements: ["category-approved facts only", "no medical guarantees"],
    riskLevel: "low",
    imageRequirement: "optional",
    priceRequirement: "forbidden",
    minFacts: 2,
  },
  PRODUCT_SPOTLIGHT: {
    type: "PRODUCT_SPOTLIGHT",
    labelAr: "تسليط الضوء على منتج",
    labelEn: "Product Spotlight",
    requiredInputs: ["products", "facts", "image"],
    allowedProductTypes: null,
    objectives: ["DISCOVERY", "CONVERSION", "UPSELL"],
    structure: ["product intro", "verified benefits", "usage", "CTA"],
    ctaStyles: ["view product", "shop now"],
    factRequirements: ["product-specific benefits", "no generic benefits"],
    riskLevel: "medium",
    imageRequirement: "required",
    priceRequirement: "optional",
    minFacts: 3,
  },
  NEW_PRODUCT: {
    type: "NEW_PRODUCT",
    labelAr: "منتج جديد",
    labelEn: "New Product",
    requiredInputs: ["products", "facts", "image"],
    allowedProductTypes: null,
    objectives: ["AWARENESS", "DISCOVERY"],
    structure: ["announcement", "verified benefits", "availability", "CTA"],
    ctaStyles: ["discover", "explore"],
    factRequirements: ["new-product identity", "product-specific benefits"],
    riskLevel: "medium",
    imageRequirement: "required",
    priceRequirement: "optional",
    minFacts: 3,
  },
  COMPARISON: {
    type: "COMPARISON",
    labelAr: "مقارنة",
    labelEn: "Comparison",
    requiredInputs: ["products", "facts"],
    allowedProductTypes: null,
    objectives: ["EDUCATION", "CONVERSION", "CROSS_SELL"],
    structure: ["both products", "verified differences", "when to choose each", "CTA"],
    ctaStyles: ["compare", "explore both"],
    factRequirements: ["verified per-product differences only"],
    riskLevel: "medium",
    imageRequirement: "required",
    priceRequirement: "optional",
    minFacts: 4,
  },
  ROUTINE: {
    type: "ROUTINE",
    labelAr: "روتين",
    labelEn: "Routine",
    requiredInputs: ["products", "facts", "category"],
    allowedProductTypes: null,
    objectives: ["EDUCATION", "RETENTION", "CROSS_SELL"],
    structure: ["routine steps", "product roles", "verified benefits", "CTA"],
    ctaStyles: ["build routine", "explore"],
    factRequirements: ["usage facts", "category roles"],
    riskLevel: "low",
    imageRequirement: "optional",
    priceRequirement: "forbidden",
    minFacts: 3,
  },
  FAQ: {
    type: "FAQ",
    labelAr: "سؤال شائع",
    labelEn: "FAQ",
    requiredInputs: ["category", "facts"],
    allowedProductTypes: null,
    objectives: ["EDUCATION", "ENGAGEMENT", "CONVERSION"],
    structure: ["question", "verified answer", "clarifying details"],
    ctaStyles: ["ask more", "explore"],
    factRequirements: ["answer only from verified facts"],
    riskLevel: "low",
    imageRequirement: "none",
    priceRequirement: "forbidden",
    minFacts: 1,
  },
  MYTH_FACT: {
    type: "MYTH_FACT",
    labelAr: "خرافة وحقيقة",
    labelEn: "Myth vs Fact",
    requiredInputs: ["category", "facts"],
    allowedProductTypes: null,
    objectives: ["EDUCATION", "ENGAGEMENT", "AWARENESS"],
    structure: ["myth", "fact", "verified explanation"],
    ctaStyles: ["learn more"],
    factRequirements: ["facts only", "no invented medical claims"],
    riskLevel: "low",
    imageRequirement: "none",
    priceRequirement: "forbidden",
    minFacts: 1,
  },
  ENGAGEMENT: {
    type: "ENGAGEMENT",
    labelAr: "تفاعل",
    labelEn: "Engagement",
    requiredInputs: ["category"],
    allowedProductTypes: null,
    objectives: ["ENGAGEMENT", "AWARENESS", "RETENTION"],
    structure: ["hook", "audience prompt"],
    ctaStyles: ["share", "reply"],
    factRequirements: ["no product claims"],
    riskLevel: "low",
    imageRequirement: "optional",
    priceRequirement: "forbidden",
    minFacts: 0,
  },
  GIFTING: {
    type: "GIFTING",
    labelAr: "هدايا",
    labelEn: "Gifting",
    requiredInputs: ["products", "facts", "image"],
    allowedProductTypes: null,
    objectives: ["CONVERSION", "CROSS_SELL", "AWARENESS"],
    structure: ["occasion", "product picks", "verified benefits", "CTA"],
    ctaStyles: ["shop gift", "explore"],
    factRequirements: ["product-specific benefits", "no invented occasions"],
    riskLevel: "low",
    imageRequirement: "required",
    priceRequirement: "optional",
    minFacts: 2,
  },
  SEASONAL: {
    type: "SEASONAL",
    labelAr: "موسمي",
    labelEn: "Seasonal",
    requiredInputs: ["category", "facts"],
    allowedProductTypes: null,
    objectives: ["AWARENESS", "DISCOVERY", "CONVERSION"],
    structure: ["season context", "verified facts", "gentle CTA"],
    ctaStyles: ["explore", "shop"],
    factRequirements: ["seasonal framing only from real facts"],
    riskLevel: "low",
    imageRequirement: "optional",
    priceRequirement: "forbidden",
    minFacts: 1,
  },
  COMMERCIAL: {
    type: "COMMERCIAL",
    labelAr: "تجاري",
    labelEn: "Commercial",
    requiredInputs: ["products", "facts", "price", "image"],
    allowedProductTypes: null,
    objectives: ["CONVERSION", "DISCOVERY", "UPSELL", "REACTIVATION"],
    structure: ["offer", "verified benefits", "price", "CTA"],
    ctaStyles: ["shop now", "grab offer"],
    factRequirements: ["genuine discount only", "price only canonical"],
    riskLevel: "high",
    imageRequirement: "required",
    priceRequirement: "required",
    minFacts: 3,
  },
  CUSTOM_OTHER: {
    type: "CUSTOM_OTHER",
    labelAr: "مخصص / أخرى",
    labelEn: "Custom / Other",
    requiredInputs: ["facts"],
    allowedProductTypes: null,
    objectives: ["AWARENESS", "DISCOVERY", "ENGAGEMENT", "RETENTION", "CONVERSION"],
    structure: ["creative angle", "verified facts", "gentle CTA"],
    ctaStyles: ["explore", "learn more", "share"],
    factRequirements: ["facts only", "no invented claims"],
    riskLevel: "medium",
    imageRequirement: "optional",
    priceRequirement: "forbidden",
    minFacts: 1,
  },
};

/* ------------------------------------------------------------------------ */
/* CONTENT OBJECTIVE METADATA                                                */
/* ------------------------------------------------------------------------ */

export interface ContentObjectiveMeta {
  objective: ContentObjective;
  labelAr: string;
  labelEn: string;
  /** Content types that best serve this objective. */
  bestContentTypes: ContentType[];
}

export const CONTENT_OBJECTIVE_META: Record<ContentObjective, ContentObjectiveMeta> = {
  AWARENESS: {
    objective: "AWARENESS",
    labelAr: "الوعي",
    labelEn: "Awareness",
    bestContentTypes: ["NEW_PRODUCT", "SEASONAL", "EDUCATIONAL", "MYTH_FACT"],
  },
  EDUCATION: {
    objective: "EDUCATION",
    labelAr: "التعليم",
    labelEn: "Education",
    bestContentTypes: ["EDUCATIONAL", "FAQ", "MYTH_FACT", "ROUTINE"],
  },
  DISCOVERY: {
    objective: "DISCOVERY",
    labelAr: "الاكتشاف",
    labelEn: "Discovery",
    bestContentTypes: ["PRODUCT_SPOTLIGHT", "NEW_PRODUCT", "SEASONAL"],
  },
  ENGAGEMENT: {
    objective: "ENGAGEMENT",
    labelAr: "التفاعل",
    labelEn: "Engagement",
    bestContentTypes: ["ENGAGEMENT", "FAQ", "MYTH_FACT"],
  },
  CONVERSION: {
    objective: "CONVERSION",
    labelAr: "التحويل",
    labelEn: "Conversion",
    bestContentTypes: ["PRODUCT_SPOTLIGHT", "COMPARISON", "COMMERCIAL", "FAQ"],
  },
  RETENTION: {
    objective: "RETENTION",
    labelAr: "الاحتفاظ",
    labelEn: "Retention",
    bestContentTypes: ["ROUTINE", "EDUCATIONAL", "ENGAGEMENT"],
  },
  CROSS_SELL: {
    objective: "CROSS_SELL",
    labelAr: "بيع متقاطع",
    labelEn: "Cross-sell",
    bestContentTypes: ["ROUTINE", "COMPARISON", "GIFTING"],
  },
  UPSELL: {
    objective: "UPSELL",
    labelAr: "بيع تصاعدي",
    labelEn: "Upsell",
    bestContentTypes: ["PRODUCT_SPOTLIGHT", "COMMERCIAL"],
  },
  REACTIVATION: {
    objective: "REACTIVATION",
    labelAr: "إعادة تنشيط",
    labelEn: "Reactivation",
    bestContentTypes: ["COMMERCIAL", "PRODUCT_SPOTLIGHT", "ENGAGEMENT"],
  },
};

export function isObjectiveCompatible(type: ContentType, objective: ContentObjective): boolean {
  const meta = CONTENT_TYPE_META[type];
  return meta.objectives.includes(objective);
}