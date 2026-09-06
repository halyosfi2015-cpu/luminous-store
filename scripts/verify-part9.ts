/**
 * PART 9 — Deterministic Pricing Verification Suite
 * Executes the directive test cases against the canonical pricing pipeline.
 * Run with: npx tsx scripts/verify-part9.ts
 */

import {
  extractPricingFacts,
  validatePriceRealism,
  validateDiscount,
  selectProductPricing,
  runPricingAudit,
  producePricingExamples,
  getPriceBand,
  type PricingFacts,
} from "../src/lib/product-pricing";
import { products, getProductBySlug } from "../src/data/products";
import { onlyPublished } from "../src/lib/publication";
import type { Product } from "../src/types/product";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, name: string, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(name + (detail ? ` — ${detail}` : ""));
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "pricing-test-1",
    slug: "pricing-test-1",
    sku: "PRICING-TEST-1",
    brand: "CeraVe",
    brandAr: "CeraVe",
    name: { ar: "كريم مرطب للوجه 50 مل", en: "CeraVe Moisturizing Cream 50 ml" },
    category: "Moisturizers",
    categoryAr: "مرطبات",
    categorySlug: "moisturizers",
    description: { ar: "", en: "" },
    pricing: { price: 9800, currency: "YER" },
    gallery: [],
    ingredients: { ar: [], en: [] },
    usageInstructions: { ar: "", en: "" },
    howToUse: [],
    howToUseAr: [],
    skinTypes: ["dry"],
    suitableFor: [],
    skinConcerns: [],
    benefits: { ar: [], en: [] },
    stock: 0,
    inStock: false,
    stockQuantity: 0,
    rating: 0,
    reviewCount: 0,
    reviews: [],
    featured: false,
    isFeatured: false,
    new: false,
    isNew: false,
    isBestSeller: false,
    isDoctorRecommended: false,
    tags: [],
    seoMetadata: {
      title: { ar: "", en: "" },
      description: { ar: "", en: "" },
      keywords: [],
    },
    ...overrides,
  } as Product;
}

const published = onlyPublished(products);
const getProduct = (id: string) => getProductBySlug(id) ?? published.find((p) => p.id === id);

/* ------------------------------------------------------------------------ */
section("1 — Price realism bands");
{
  const lip = getPriceBand("lip-makeup");
  assert(lip.min === 1500 && lip.max === 17000, "lip-makeup band is 1500..17000 YER");
  const serum = getPriceBand("serums");
  assert(serum.min === 2000 && serum.max === 60000, "serums band is 2000..60000 YER");
  const perfume = getPriceBand("perfume-women");
  assert(perfume.max === 100000, "perfume-women band allows premium 100000 YER");
  const unknown = getPriceBand("nope");
  assert(unknown.min === 500 && unknown.max === 60000, "unknown category falls back to default band");

  const ok = validatePriceRealism({ ...factsBase(), price: 9800, categorySlug: "moisturizers" });
  assert(ok.valid, "9800 YER moisturizer is realistic");
  const low = validatePriceRealism({ ...factsBase(), price: 100, categorySlug: "moisturizers" });
  assert(!low.valid && low.issues.some((i) => i.includes("below")), "100 YER moisturizer flagged below band");
  const high = validatePriceRealism({ ...factsBase(), price: 500000, categorySlug: "moisturizers" });
  assert(!high.valid && high.issues.some((i) => i.includes("exceeds")), "500000 YER moisturizer flagged above band");
  const nan = validatePriceRealism({ ...factsBase(), price: Number.NaN, categorySlug: "moisturizers" });
  assert(!nan.valid && nan.issues.some((i) => i.includes("missing")), "NaN price flagged invalid");
}

section("2 — Discount validation");
{
  const none = validateDiscount({ ...factsBase(), originalPrice: undefined });
  assert(!none.genuine && !none.fakeBaseRule, "no originalPrice → no discount");

  const baseRule = validateDiscount({ ...factsBase(), price: 9800, originalPrice: 10000 });
  assert(baseRule.fakeBaseRule, "originalPrice = price + 200 → fake '-200 YER' base rule");
  assert(!baseRule.genuine, "fake base rule is NOT genuine");

  const genuine = validateDiscount({ ...factsBase(), price: 9000, originalPrice: 10000 });
  assert(genuine.genuine && genuine.discountPercent === 10, "9000/10000 → genuine 10% discount");

  const deep = validateDiscount({ ...factsBase(), price: 1000, originalPrice: 10000 });
  assert(deep.genuine && deep.issues.some((i) => i.includes("exceeds the realistic")), "90% discount flagged above 70% ceiling");

  const orphan = validateDiscount({ ...factsBase(), discount: 10, originalPrice: undefined });
  assert(orphan.issues.some((i) => i.includes("without an originalPrice")), "discount% without originalPrice cannot be verified");

  const belowZero = validateDiscount({ ...factsBase(), price: 10000, originalPrice: 10000 });
  assert(belowZero.fakeBaseRule, "originalPrice == price → base-rule class (delta 0)");
}

section("3 — selectProductPricing statuses");
{
  const clean = selectProductPricing(makeProduct({ pricing: { price: 9800, currency: "YER" } }));
  assert(clean.status === "APPROVED", "clean valid price → APPROVED");
  assert(clean.recommended.originalPrice === undefined && clean.recommended.hasRealDiscount === false, "clean product keeps no discount");

  const fakeBadge = selectProductPricing(makeProduct({ pricing: { price: 9800, originalPrice: 10000, currency: "YER" } }));
  assert(fakeBadge.status === "APPROVED", "fake '-200 YER' product still APPROVED after normalization");
  assert(fakeBadge.recommended.originalPrice === undefined && fakeBadge.recommended.hasRealDiscount === false, "fake originalPrice stripped from recommendation");
  assert(fakeBadge.reasons.some((r) => r.includes("NORMALIZED")), "fake badge normalization is documented in reasons");

  const genuine = selectProductPricing(makeProduct({ pricing: { price: 9000, originalPrice: 10000, currency: "YER" } }));
  assert(genuine.status === "APPROVED", "genuine discount → APPROVED");
  assert(genuine.recommended.discount === 10 && genuine.recommended.hasRealDiscount === true, "genuine discount carries 10% + hasRealDiscount true");
  assert(genuine.recommended.originalPrice === 10000, "genuine discount keeps originalPrice for the badge");

  const deep = selectProductPricing(makeProduct({ pricing: { price: 1000, originalPrice: 10000, currency: "YER" } }));
  assert(deep.status === "REVIEW_REQUIRED", "90% discount → REVIEW_REQUIRED");

  const orphan = selectProductPricing(makeProduct({ pricing: { price: 9000, currency: "YER" }, discount: 10 }));
  assert(orphan.status === "REVIEW_REQUIRED", "discount% without originalPrice → REVIEW_REQUIRED");

  const bad = selectProductPricing(makeProduct({ pricing: { price: 0, currency: "YER" } }));
  assert(bad.status === "REJECTED", "zero price → REJECTED");

  const nan = selectProductPricing(makeProduct({ pricing: {} } as Partial<Product>));
  assert(nan.status === "REJECTED", "missing pricing object → REJECTED");

  const outOfBand = selectProductPricing(makeProduct({ categorySlug: "lip-makeup", pricing: { price: 1000, currency: "YER" } }));
  assert(outOfBand.status === "REVIEW_REQUIRED", "out-of-band price → REVIEW_REQUIRED");

  const absurd = selectProductPricing(makeProduct({ categorySlug: "lip-makeup", pricing: { price: 100, currency: "YER" } }));
  assert(absurd.status === "REJECTED", "absurd 100 YER lipstick (below min/10) → REJECTED");

  const currency = selectProductPricing(makeProduct({ pricing: { price: 9800, currency: "USD" } }));
  assert(currency.status === "REVIEW_REQUIRED" && currency.recommended.currency === "YER", "non-YER currency → REVIEW_REQUIRED + normalized to YER");
}

section("4 — Real catalog invariants");
{
  const audit = runPricingAudit();
  assert(audit.products.total === 2764, `catalog total is 2764 (got ${audit.products.total})`);
  assert(audit.products.withPrice === 2764, "every product has a valid price");
  assert(audit.products.priceMissingOrInvalid === 0, "no missing/invalid prices");
  assert(audit.products.currencyMissing === 0, "every product has a currency");
  assert(audit.products.withOriginalPrice === 0, `fake originalPrice values already stripped (got ${audit.products.withOriginalPrice})`);
  assert(audit.discounts.fakeBaseRuleBadges === 0, "no fake '-200 YER' base-rule badges remain in the catalog");
  assert(audit.discounts.genuineDiscounts === 0, "no genuine promotional discounts exist in the catalog");
  assert(audit.realism.outsideBand === 0, "no prices fall outside the realistic per-category bands");
  assert(audit.decisions.approved === 2764, "all 2764 products normalize to APPROVED");
  assert(audit.decisions.reviewRequired === 0 && audit.decisions.rejected === 0, "zero REVIEW/REJECTED in the real catalog");
}

section("5 — Real before/after examples");
{
  const examples = producePricingExamples(12);
  assert(examples.length === 12, "12 real before/after examples produced");
  const fake = examples.find((e) => e.currentPricing.originalPrice !== undefined);
  assert(!fake, "no example still carries a fake originalPrice badge");
  for (const e of examples) {
    assert(e.recommendedPricing.price === e.currentPricing.price, `example ${e.productId} never changes the real price`);
    assert(e.recommendedPricing.originalPrice === undefined, `example ${e.productId} recommendation keeps originalPrice absent`);
    assert(e.recommendedPricing.currency === "YER", `example ${e.productId} currency normalized to YER`);
  }
}

section("6 — Real catalog spot checks");
{
  const yq1 = getProduct("yq-1");
  assert(!!yq1, "yq-1 exists");
  if (yq1) {
    const d = selectProductPricing(yq1);
    assert(d.current.price === 9800 && d.current.originalPrice === undefined, "yq-1 has price 9800, no fake originalPrice");
    assert(d.status === "APPROVED" && d.recommended.originalPrice === undefined, "yq-1 approved, originalPrice stays absent");
  }
  const yq2 = getProduct("yq-2");
  if (yq2) {
    const d = selectProductPricing(yq2);
    assert(d.current.price === 49800 && d.current.originalPrice === undefined, "yq-2 has price 49800, no fake originalPrice");
    assert(d.recommended.originalPrice === undefined, "yq-2 approved, originalPrice stays absent");
  }
}

/* ------------------------------------------------------------------------ */
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("Failures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

function factsBase(): PricingFacts {
  return {
    price: 9800,
    currency: "YER",
    originalPrice: undefined,
    discount: undefined,
    basePrice: undefined,
    hasRealDiscount: undefined,
    nameAr: "",
    nameEn: "",
    brand: "",
    productType: undefined,
    categorySlug: "moisturizers",
    categoryAr: undefined,
  };
}