/**
 * PART 9 — PRODUCT PRICING (CANONICAL PIPELINE)
 * =============================================
 *
 * Rebuild / validate pricing for the REAL Luminous catalog.
 *
 * VERIFIED PRICING FACTS
 *   → REALISM VALIDATION (per-category YER price band)
 *     → DISCOUNT VALIDATION (genuine promotional discount vs the "-200 YER"
 *       base rule, which must NEVER render as a fake discount badge)
 *       → CURRENCY NORMALIZATION
 *         → CONFIDENCE / STATUS
 *
 * Pricing is derived ONLY from verified product data. No price is invented and
 * no discount badge is fabricated. The only automated data change this pipeline
 * recommends is stripping the baked-in "-200 YER" base-rule originalPrice so it
 * cannot surface as a fake discount.
 *
 * Reuses (no duplicates):
 *  - src/lib/source-hierarchy.ts     (Part 3) — source authority.
 *  - src/lib/product-name.ts         (Part 4) — identity facts + Arabic normalization.
 *
 * DRY-RUN / AUDIT — this module never writes to the catalog.
 */

import type { Product } from "@/src/types/product";
import { products } from "@/src/data/products";
import { onlyPublished } from "@/src/lib/publication";
import { extractNameFacts } from "@/src/lib/product-name";

/* ------------------------------------------------------------------------ */
/* TYPES                                                                     */
/* ------------------------------------------------------------------------ */

export type PricingStatus = "APPROVED" | "REVIEW_REQUIRED" | "REJECTED";

export interface PriceBand {
  min: number;
  max: number;
}

export interface PricingFacts {
  price: number;
  currency: string;
  originalPrice: number | undefined;
  discount: number | undefined;
  basePrice: number | undefined;
  hasRealDiscount: boolean | undefined;
  nameAr: string;
  nameEn: string;
  brand: string;
  productType: string | undefined;
  categorySlug: string | undefined;
  categoryAr: string | undefined;
}

export interface PriceRealismValidation {
  valid: boolean;
  issues: string[];
  band: PriceBand | undefined;
}

export interface DiscountValidation {
  hasOriginalPrice: boolean;
  genuine: boolean;
  fakeBaseRule: boolean;
  discountPercent: number | undefined;
  issues: string[];
}

export interface PricingDecision {
  productId: string;
  brand: string;
  productName: { ar: string; en: string };
  categorySlug: string | undefined;
  current: {
    price: number;
    currency: string;
    originalPrice: number | undefined;
    discount: number | undefined;
    basePrice: number | undefined;
    hasRealDiscount: boolean | undefined;
  };
  recommended: {
    price: number;
    currency: string;
    originalPrice: number | undefined;
    discount: number | undefined;
    hasRealDiscount: boolean;
    basePrice: number | undefined;
    note: string;
  };
  realism: PriceRealismValidation;
  discountValidation: DiscountValidation;
  status: PricingStatus;
  reasons: string[];
}

export interface PricingAudit {
  products: {
    total: number;
    withPrice: number;
    priceMissingOrInvalid: number;
    withCurrency: number;
    currencyMissing: number;
    withOriginalPrice: number;
    withDiscountField: number;
    withBasePrice: number;
  };
  decisions: { approved: number; reviewRequired: number; rejected: number };
  realism: {
    validated: number;
    withinBand: number;
    outsideBand: number;
  };
  discounts: {
    withOriginalPrice: number;
    fakeBaseRuleBadges: number;
    genuineDiscounts: number;
    deepDiscountsReview: number;
    inconsistentDiscounts: number;
  };
  currency: { normalizedToYER: number };
}

export interface PricingBeforeAfterExample {
  productId: string;
  brand: string;
  productName: { ar: string; en: string };
  category: string;
  currentPricing: {
    price: number;
    currency: string;
    originalPrice: number | undefined;
    discount: number | undefined;
    hasRealDiscount: boolean | undefined;
  };
  recommendedPricing: {
    price: number;
    currency: string;
    originalPrice: number | undefined;
    discount: number | undefined;
    hasRealDiscount: boolean;
  };
  realismBand: PriceBand | undefined;
  discountValidation: string;
  finalStatus: PricingStatus;
  reasons: string[];
}

/* ------------------------------------------------------------------------ */
/* PRICE BANDS (realistic YER retail ranges per category)                    */
/* ------------------------------------------------------------------------ */

const DEFAULT_BAND: PriceBand = { min: 500, max: 60000 };

export const CATEGORY_PRICE_BANDS: Record<string, PriceBand> = {
  masks: { min: 700, max: 45000 },
  deodorants: { min: 1500, max: 30000 },
  "baby-care": { min: 1800, max: 18000 },
  "appliances-shaving": { min: 2500, max: 7000 },
  tools: { min: 1200, max: 7000 },
  "hand-care": { min: 700, max: 12000 },
  makeup: { min: 2000, max: 10000 },
  "lip-care": { min: 1200, max: 12000 },
  "nail-care": { min: 2000, max: 12000 },
  "beauty-tools": { min: 700, max: 10000 },
  haircare: { min: 4000, max: 5000 },
  conditioner: { min: 3500, max: 10000 },
  "body-wash": { min: 300, max: 15000 },
  "eye-makeup": { min: 900, max: 40000 },
  "lip-makeup": { min: 1500, max: 17000 },
  "perfume-musk": { min: 2000, max: 5000 },
  "oral-care": { min: 700, max: 20000 },
  "hair-styling": { min: 3000, max: 17000 },
  "contact-lenses": { min: 4000, max: 20000 },
  uncategorized: { min: 2000, max: 30000 },
  "hair-creams": { min: 1800, max: 10000 },
  "makeup-tools": { min: 3000, max: 14000 },
  shampoo: { min: 800, max: 22000 },
  "body-oils": { min: 700, max: 22000 },
  "bakhoor-premium": { min: 3500, max: 16000 },
  "foot-care": { min: 2500, max: 10000 },
  "body-care": { min: 1500, max: 8000 },
  "hair-masks": { min: 2000, max: 10000 },
  "hair-dyes": { min: 700, max: 6000 },
  "hair-oils": { min: 1500, max: 16000 },
  "body-lotion": { min: 700, max: 20000 },
  "face-makeup": { min: 900, max: 50000 },
  "women-care": { min: 2500, max: 17000 },
  "body-scrubs": { min: 700, max: 16000 },
  exfoliators: { min: 2500, max: 16000 },
  cleansers: { min: 700, max: 30000 },
  "hair-treatments": { min: 3500, max: 25000 },
  toners: { min: 1200, max: 22000 },
  moisturizers: { min: 900, max: 36000 },
  sunscreen: { min: 3500, max: 30000 },
  "group-care": { min: 6000, max: 20000 },
  perfume: { min: 2000, max: 16000 },
  serums: { min: 2000, max: 60000 },
  "eye-care": { min: 7500, max: 21000 },
  "perfume-gift-sets": { min: 4500, max: 40000 },
  "bakhoor-oud": { min: 5500, max: 16000 },
  vitamins: { min: 2000, max: 40000 },
  "appliances-teeth": { min: 5500, max: 20000 },
  "hair-tools": { min: 6000, max: 20000 },
  "perfume-women": { min: 2500, max: 100000 },
  "perfume-men": { min: 3500, max: 60000 },
  "appliances-hair": { min: 20000, max: 50000 },
};

export function getPriceBand(categorySlug: string | undefined): PriceBand {
  return (categorySlug && CATEGORY_PRICE_BANDS[categorySlug]) || DEFAULT_BAND;
}

/* ------------------------------------------------------------------------ */
/* FACT EXTRACTION                                                           */
/* ------------------------------------------------------------------------ */

export function extractPricingFacts(product: Product): PricingFacts {
  const nameFacts = extractNameFacts(product);
  const pricing = product.pricing ?? {};
  const price = typeof pricing.price === "number" ? pricing.price : NaN;
  const currency = (pricing.currency || "YER").trim() || "YER";
  return {
    price,
    currency,
    originalPrice:
      typeof pricing.originalPrice === "number" && pricing.originalPrice > 0
        ? pricing.originalPrice
        : undefined,
    discount: typeof product.discount === "number" ? product.discount : undefined,
    basePrice: typeof product.basePrice === "number" ? product.basePrice : undefined,
    hasRealDiscount: typeof product.hasRealDiscount === "boolean" ? product.hasRealDiscount : undefined,
    nameAr: product.name?.ar ?? "",
    nameEn: product.name?.en ?? "",
    brand: product.brand ?? "",
    productType: nameFacts.productType,
    categorySlug: product.categorySlug,
    categoryAr: product.categoryAr,
  };
}

/* ------------------------------------------------------------------------ */
/* REALISM VALIDATION                                                        */
/* ------------------------------------------------------------------------ */

export function validatePriceRealism(facts: PricingFacts): PriceRealismValidation {
  const issues: string[] = [];
  const band = getPriceBand(facts.categorySlug);

  if (!Number.isFinite(facts.price) || facts.price <= 0) {
    issues.push("price is missing, not a number, or not positive");
    return { valid: false, issues, band };
  }

  if (facts.price < band.min) {
    issues.push(`price ${facts.price} is below the realistic ${facts.categorySlug ?? "?"} band (min ${band.min} YER)`);
  }
  if (facts.price > band.max) {
    issues.push(`price ${facts.price} exceeds the realistic ${facts.categorySlug ?? "?"} band (max ${band.max} YER)`);
  }
  return { valid: issues.length === 0, issues, band };
}

/* ------------------------------------------------------------------------ */
/* DISCOUNT VALIDATION                                                       */
/* ------------------------------------------------------------------------ */

/**
 * The "-200 YER" base rule: `originalPrice = price + 200` baked into the data.
 * This is NOT a promotional discount and must NEVER render a discount badge.
 */
const BASE_RULE_DELTA = 200;
const MAX_DISCOUNT_PERCENT = 70;

export function validateDiscount(facts: PricingFacts): DiscountValidation {
  const issues: string[] = [];
  const hasOriginalPrice = facts.originalPrice !== undefined;

  // Discount percentage field set but no originalPrice → cannot verify.
  if (facts.discount !== undefined && !hasOriginalPrice) {
    issues.push(`discount ${facts.discount}% is present without an originalPrice to verify it against`);
    return { hasOriginalPrice, genuine: false, fakeBaseRule: false, discountPercent: undefined, issues };
  }

  if (!hasOriginalPrice) {
    return { hasOriginalPrice, genuine: false, fakeBaseRule: false, discountPercent: undefined, issues };
  }

  const originalPrice = facts.originalPrice as number;
  const price = facts.price;
  const delta = originalPrice - price;

  // Fake "-200 YER" base rule (delta <= 200, incl. equal prices).
  if (delta <= BASE_RULE_DELTA) {
    issues.push(
      `originalPrice ${originalPrice} is only ${delta} YER above price — this is the baked-in "-200 YER" base rule, not a genuine promotional discount`
    );
    return { hasOriginalPrice, genuine: false, fakeBaseRule: true, discountPercent: undefined, issues };
  }

  if (delta <= 0) {
    issues.push(`originalPrice ${originalPrice} is not above price ${price}`);
    return { hasOriginalPrice, genuine: false, fakeBaseRule: false, discountPercent: undefined, issues };
  }

  const discountPercent = Math.round((delta / originalPrice) * 100);

  // Genuine discount, but deeper than any realistic promo.
  if (discountPercent > MAX_DISCOUNT_PERCENT) {
    issues.push(`discount ${discountPercent}% exceeds the realistic ${MAX_DISCOUNT_PERCENT}% ceiling`);
    return { hasOriginalPrice, genuine: true, fakeBaseRule: false, discountPercent, issues };
  }

  return { hasOriginalPrice, genuine: true, fakeBaseRule: false, discountPercent, issues };
}

/* ------------------------------------------------------------------------ */
/* SELECTOR                                                                  */
/* ------------------------------------------------------------------------ */

export function selectProductPricing(product: Product): PricingDecision {
  const facts = extractPricingFacts(product);
  const reasons: string[] = [];

  const realism = validatePriceRealism(facts);
  const discount = validateDiscount(facts);

  // --- status ---
  let status: PricingStatus = "APPROVED";
  if (!Number.isFinite(facts.price) || facts.price <= 0) {
    status = "REJECTED";
    reasons.push("REJECTED: price is missing, not a number, or not positive");
  } else if (realism.issues.length > 0) {
    // Far outside band → reject as absurd; otherwise review.
    const band = realism.band as PriceBand;
    const absurd = facts.price >= band.max * 5 || facts.price <= band.min / 10;
    status = absurd ? "REJECTED" : "REVIEW_REQUIRED";
    reasons.push(`PRICE REALISM: ${realism.issues.join(" | ")}`);
  }

  if (discount.issues.some((i) => i.includes("without an originalPrice"))) {
    if (status === "APPROVED") status = "REVIEW_REQUIRED";
    reasons.push(`DISCOUNT: ${discount.issues.join(" | ")}`);
  } else if (discount.issues.some((i) => i.includes("exceeds the realistic"))) {
    if (status === "APPROVED") status = "REVIEW_REQUIRED";
    reasons.push(`DISCOUNT: ${discount.issues.join(" | ")}`);
  }

  if (discount.fakeBaseRule && status === "APPROVED") {
    reasons.push(`NORMALIZED: ${discount.issues.join(" | ")} → originalPrice stripped, no discount badge rendered`);
  }

  // --- recommended values ---
  const recommendedPrice = facts.price;
  let recommendedCurrency = "YER";
  let recommendedOriginalPrice: number | undefined;
  let recommendedDiscount: number | undefined;
  let recommendedHasRealDiscount = false;
  let recommendedBasePrice: number | undefined;
  let note: string;

  if (!Number.isFinite(facts.price) || facts.price <= 0) {
    note = "cannot recommend a price for invalid pricing data";
  } else if (discount.genuine && discount.discountPercent !== undefined) {
    // Genuine promotional discount.
    recommendedOriginalPrice = facts.originalPrice;
    recommendedDiscount = discount.discountPercent;
    recommendedHasRealDiscount = true;
    note = `genuine promotional discount ${recommendedDiscount}% (old price ${facts.originalPrice} YER → ${recommendedPrice} YER)`;
  } else if (discount.fakeBaseRule) {
    // Strip the "-200 YER" base-rule originalPrice so it never shows as a badge.
    recommendedOriginalPrice = undefined;
    recommendedDiscount = undefined;
    recommendedHasRealDiscount = false;
    note = "no real discount — removed fake '-200 YER' originalPrice, no discount badge rendered";
  } else {
    note = "no discount present — no discount badge rendered";
  }

  if (facts.currency && facts.currency !== "YER") {
    // Only YER is used; flag anything else for review.
    if (status === "APPROVED") status = "REVIEW_REQUIRED";
    reasons.push(`CURRENCY: unexpected currency "${facts.currency}" — normalized to YER`);
  }
  recommendedCurrency = "YER";

  return {
    productId: product.id,
    brand: facts.brand,
    productName: { ar: facts.nameAr, en: facts.nameEn },
    categorySlug: facts.categorySlug,
    current: {
      price: facts.price,
      currency: facts.currency,
      originalPrice: facts.originalPrice,
      discount: facts.discount,
      basePrice: facts.basePrice,
      hasRealDiscount: facts.hasRealDiscount,
    },
    recommended: {
      price: recommendedPrice,
      currency: recommendedCurrency,
      originalPrice: recommendedOriginalPrice,
      discount: recommendedDiscount,
      hasRealDiscount: recommendedHasRealDiscount,
      basePrice: recommendedBasePrice,
      note,
    },
    realism,
    discountValidation: discount,
    status,
    reasons,
  };
}

/* ------------------------------------------------------------------------ */
/* AUDIT                                                                     */
/* ------------------------------------------------------------------------ */

export function runPricingAudit(): PricingAudit {
  const all = onlyPublished(products);
  const audit: PricingAudit = {
    products: {
      total: all.length,
      withPrice: 0,
      priceMissingOrInvalid: 0,
      withCurrency: 0,
      currencyMissing: 0,
      withOriginalPrice: 0,
      withDiscountField: 0,
      withBasePrice: 0,
    },
    decisions: { approved: 0, reviewRequired: 0, rejected: 0 },
    realism: { validated: 0, withinBand: 0, outsideBand: 0 },
    discounts: {
      withOriginalPrice: 0,
      fakeBaseRuleBadges: 0,
      genuineDiscounts: 0,
      deepDiscountsReview: 0,
      inconsistentDiscounts: 0,
    },
    currency: { normalizedToYER: 0 },
  };

  for (const product of all) {
    const facts = extractPricingFacts(product);
    const validPrice = Number.isFinite(facts.price) && facts.price > 0;
    if (validPrice) audit.products.withPrice++;
    else audit.products.priceMissingOrInvalid++;
    if (facts.currency) audit.products.withCurrency++;
    else audit.products.currencyMissing++;
    if (facts.originalPrice !== undefined) audit.products.withOriginalPrice++;
    if (facts.discount !== undefined) audit.products.withDiscountField++;
    if (facts.basePrice !== undefined) audit.products.withBasePrice++;

    const d = selectProductPricing(product);
    audit.realism.validated++;
    if (d.realism.valid) audit.realism.withinBand++;
    else audit.realism.outsideBand++;

    if (d.status === "APPROVED") audit.decisions.approved++;
    else if (d.status === "REVIEW_REQUIRED") audit.decisions.reviewRequired++;
    else audit.decisions.rejected++;

    if (facts.originalPrice !== undefined) {
      audit.discounts.withOriginalPrice++;
      if (d.discountValidation.fakeBaseRule) audit.discounts.fakeBaseRuleBadges++;
      if (d.discountValidation.genuine) audit.discounts.genuineDiscounts++;
      if (d.discountValidation.issues.some((i) => i.includes("exceeds the realistic"))) audit.discounts.deepDiscountsReview++;
    }
    if (d.discountValidation.issues.some((i) => i.includes("without an originalPrice"))) {
      audit.discounts.inconsistentDiscounts++;
    }
    if (facts.currency && facts.currency !== "YER") audit.currency.normalizedToYER++;
  }

  return audit;
}

/* ------------------------------------------------------------------------ */
/* REAL EXAMPLES                                                             */
/* ------------------------------------------------------------------------ */

const EXAMPLE_IDS = [
  "yq-1", "yq-2", "yq-8", "yq-754", "yq-960", "yq-1680",
  "yq-1693", "yq-1695", "yq-1900", "yq-2033", "yq-2082", "yq-70",
];

export function producePricingExamples(limit = 12): PricingBeforeAfterExample[] {
  const all = onlyPublished(products);
  const samples = all.filter((p) => EXAMPLE_IDS.includes(p.id)).slice(0, limit);
  return samples.map((product) => {
    const d = selectProductPricing(product);
    const band = d.realism.band as PriceBand;
    return {
      productId: product.id,
      brand: d.brand,
      productName: d.productName,
      category: d.categorySlug ?? "?",
      currentPricing: d.current,
      recommendedPricing: d.recommended,
      realismBand: band,
      discountValidation: d.discountValidation.fakeBaseRule
        ? "fake '-200 YER' base rule — NOT a promotional discount"
        : d.discountValidation.genuine
          ? `genuine discount ${d.discountValidation.discountPercent}%`
          : "no discount",
      finalStatus: d.status,
      reasons: d.reasons,
    };
  });
}

export { SOURCE_HIERARCHY } from "@/src/lib/source-hierarchy";