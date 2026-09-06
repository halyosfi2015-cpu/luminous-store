/**
 * PART 5 — Deterministic Product-Image Verification Suite
 * Executes the 18 directive test cases against the canonical image pipeline.
 * Run with: npx tsx scripts/verify-part5.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  selectProductImage,
  runImageAudit,
  produceImageSourceExamples,
  produceImageDecisions,
} from "../src/lib/product-image";
import type { ImageSourceData } from "../src/lib/product-image";
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
    id: "img-test-1",
    slug: "img-test-1",
    sku: "IMG-TEST-1",
    brand: "CeraVe",
    brandAr: "CeraVe",
    name: { ar: "كريم مرطب للوجه", en: "CeraVe Moisturizing Cream" },
    category: "Moisturizers",
    categoryAr: "مرطبات",
    categorySlug: "moisturizers",
    pricing: {},
    gallery: [],
    ingredients: [],
    usageInstructions: [],
    howToUse: "",
    howToUseAr: "",
    skinTypes: [],
    suitableFor: [],
    skinConcerns: [],
    benefits: [],
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
    seoMetadata: {},
    ...overrides,
  } as Product;
}

const published = onlyPublished(products);
const getProduct = (id: string) => getProductBySlug(id) ?? published.find((p) => p.id === id);

section("T1 — Exact official (manufacturer) image → APPROVED");
{
  const d = selectProductImage(makeProduct({ sizeLabel: "50 مل" }), [
    { url: "https://www.cerave.com/media/products/cerave-moisturizing-cream.png", sourceKey: "manufacturer", claimed: { brand: "CeraVe", category: "moisturizers", size: "50 مل" } },
  ]);
  assert(d.status === "APPROVED", "T1 official image → APPROVED", d.status);
  assert(d.selectedSourceKey === "manufacturer", "T1 selected manufacturer", d.selectedSourceKey ?? "");
  assert(d.confidence >= 80, "T1 high confidence", String(d.confidence));
}

section("T2 — Exact trusted-retailer image → APPROVED");
{
  const d = selectProductImage(makeProduct({ sizeLabel: "50 مل" }), [
    { url: "https://www.cultbeauty.com/img/cerave-50.png", sourceKey: "trustedRetailer", claimed: { brand: "CeraVe", category: "moisturizers", size: "50 مل" } },
  ]);
  assert(d.status === "APPROVED", "T2 trusted-retailer image → APPROVED", d.status);
  assert(d.selectedSourceKey === "trustedRetailer", "T2 selected trustedRetailer", d.selectedSourceKey ?? "");
}

section("T3 — Exact Yaqoot image, no stronger source → APPROVED (retained)");
{
  const d = selectProductImage(makeProduct(), [
    { url: "https://www.yaqootstoreye.com/files/items/item_12345_1.png", sourceKey: "yaqoot", claimed: { brand: "CeraVe", category: "moisturizers" } },
  ]);
  assert(d.status === "APPROVED", "T3 exact Yaqoot (no stronger) → APPROVED", d.status);
  assert(d.selectedSourceKey === "yaqoot", "T3 Yaqoot retained as best available", d.selectedSourceKey ?? "");
  assert(d.selectedImage === "https://www.yaqootstoreye.com/files/items/item_12345_1.png", "T3 Yaqoot URL kept");
}

section("T4 — Wrong product image → REJECTED");
{
  const d = selectProductImage(makeProduct(), [
    { url: "https://www.olay.com/img/olay-regenerist.png", sourceKey: "manufacturer", claimed: { brand: "Olay", category: "moisturizers" } },
  ]);
  assert(d.status === "REJECTED", "T4 wrong product → REJECTED", d.status);
  assert(d.reasons.some((r) => r.includes("identity")), "T4 reason is identity mismatch");
  assert(d.action === "blocked", "T4 action blocked", d.action);
}

section("T5 — Wrong variant image → REJECTED");
{
  const p = makeProduct({ name: { ar: "كريم مرطب بدون لون 50 مل", en: "CeraVe Moisturizing Cream No Color" }, sizeLabel: "50 مل" });
  const d = selectProductImage(p, [
    { url: "https://www.cerave.com/img/colored.png", sourceKey: "manufacturer", claimed: { brand: "CeraVe", category: "moisturizers", variant: "باللون", size: "50 مل" } },
  ]);
  assert(d.status === "REJECTED", "T5 wrong variant → REJECTED", d.status);
  assert(d.reasons.some((r) => r.includes("variant")), "T5 reason mentions variant");
}

section("T6 — Wrong size image → REJECTED");
{
  const p = makeProduct({ sizeLabel: "50 مل" });
  const d = selectProductImage(p, [
    { url: "https://www.cerave.com/img/200ml.png", sourceKey: "manufacturer", claimed: { brand: "CeraVe", category: "moisturizers", size: "200 مل" } },
  ]);
  assert(d.status === "REJECTED", "T6 wrong size → REJECTED", d.status);
  assert(d.reasons.some((r) => r.includes("size")), "T6 reason mentions size");
}

section("T7 — Wrong shade image → REJECTED");
{
  const p = makeProduct({ name: { ar: "كحل درجة 02", en: "Eyeliner Shade 02" }, categorySlug: "makeup", category: "Makeup" });
  const d = selectProductImage(p, [
    { url: "https://www.cerave.com/img/shade-04.png", sourceKey: "manufacturer", claimed: { brand: "CeraVe", category: "makeup", shade: "04" } },
  ]);
  assert(d.status === "REJECTED", "T7 wrong shade → REJECTED", d.status);
  assert(d.reasons.some((r) => r.includes("shade")), "T7 reason mentions shade");
}

section("T8 — Generic placeholder image → REJECTED");
{
  const d = selectProductImage(makeProduct(), [
    { url: "https://www.example.com/images/placeholder.png", sourceKey: "other" },
  ]);
  assert(d.status === "REJECTED", "T8 generic placeholder → REJECTED", d.status);
  assert(d.reasons.some((r) => r.includes("placeholder")), "T8 reason mentions placeholder");
}

section("T9 — Broken URL → REJECTED");
{
  const d = selectProductImage(makeProduct(), [{ url: "not-a-valid-url" }]);
  assert(d.status === "REJECTED", "T9 broken URL → REJECTED", d.status);
  assert(d.selectedImage === null, "T9 no selected image");
  assert(d.reasons.some((r) => r.includes("no valid image")), "T9 reason mentions missing valid image");
}

section("T10 — Recoverable malformed URL → NORMALIZE + VALIDATE");
{
  const d = selectProductImage(makeProduct(), [
    { url: "https: //www.cerave.com/img/cerave.png", sourceKey: "manufacturer", claimed: { brand: "CeraVe", category: "moisturizers" } },
  ]);
  const c = d.candidates[0];
  assert(c.normalizedUrl === "https://www.cerave.com/img/cerave.png", "T10 malformed URL repaired", c.normalizedUrl ?? "null");
  assert(c.normalizedUrl !== c.url, "T10 normalized differs from raw input");
  assert(d.status === "APPROVED", "T10 repaired URL validated → APPROVED", d.status);
}

section("T11 — Unrelated category image → REJECTED");
{
  const p = makeProduct({ categorySlug: "skincare" });
  const d = selectProductImage(p, [
    { url: "https://www.cerave.com/img/hair.png", sourceKey: "manufacturer", claimed: { brand: "CeraVe", category: "haircare" } },
  ]);
  assert(d.status === "REJECTED", "T11 unrelated category → REJECTED", d.status);
}

section("T12 — Existing valid image → RETAIN (no forced replacement)");
{
  const p = makeProduct({ gallery: ["https://www.yaqootstoreye.com/files/items/item_999_1.png"] });
  const d = selectProductImage(p);
  assert(d.status === "APPROVED", "T12 existing valid → APPROVED", d.status);
  assert(d.action === "retain", "T12 action retain", d.action);
  assert(d.selectedImage === p.gallery[0], "T12 keeps current primary");
}

section("T13 — Stronger verified source → REPLACE (genuinely better only)");
{
  const p = makeProduct({ gallery: ["https://www.yaqootstoreye.com/files/items/item_888_1.png"] });
  const d = selectProductImage(p, [
    { url: "https://www.yaqootstoreye.com/files/items/item_888_1.png", sourceKey: "yaqoot", claimed: { brand: "CeraVe", category: "moisturizers" } },
    { url: "https://www.cerave.com/img/cerave.png", sourceKey: "manufacturer", claimed: { brand: "CeraVe", category: "moisturizers" } },
  ]);
  assert(d.selectedSourceKey === "manufacturer", "T13 stronger source selected", d.selectedSourceKey ?? "");
  assert(d.action === "replace", "T13 action replace (proposal, dry-run)", d.action);
}

section("T14 — Multiple images → ranked, strongest selected");
{
  const d = selectProductImage(makeProduct(), [
    { url: "https://www.yaqootstoreye.com/files/items/item_1.png", sourceKey: "yaqoot", claimed: { brand: "CeraVe", category: "moisturizers" } },
    { url: "https://www.kimera.com/img/1.png", sourceKey: "kimeraCosmetics", claimed: { brand: "CeraVe", category: "moisturizers" } },
    { url: "https://www.cerave.com/img/1.png", sourceKey: "manufacturer", claimed: { brand: "CeraVe", category: "moisturizers" } },
  ]);
  assert(d.candidates.length === 3, "T14 all 3 candidates evaluated", String(d.candidates.length));
  const scores = d.candidates.map((c) => c.score);
  assert(scores[0] >= scores[1] && scores[1] >= scores[2], "T14 ranked by score desc", scores.join(","));
  assert(d.selectedSourceKey === "manufacturer", "T14 best candidate selected", d.selectedSourceKey ?? "");
  assert(d.selectedImage === "https://www.cerave.com/img/1.png", "T14 highest-ranked image chosen");
}

section("T15 — No verified image → REJECTED (never silently accepted)");
{
  const d = selectProductImage(makeProduct({ gallery: [] }), []);
  assert(d.status === "REJECTED", "T15 no image → REJECTED", d.status);
  assert(d.action === "blocked", "T15 action blocked", d.action);
  assert(d.selectedImage === null, "T15 no selected image");
  assert(d.confidence === 0, "T15 zero confidence");
}

section("T16 — Old product → same pipeline (real catalog)");
{
  const p = getProduct("yq-460");
  assert(!!p, "T16 old product yq-460 exists");
  if (p) {
    const d = selectProductImage(p);
    assert(["APPROVED", "REVIEW_REQUIRED", "REJECTED"].includes(d.status), "T16 decision valid", d.status);
    assert(d.confidence >= 0 && d.confidence <= 100, "T16 confidence in [0,100]", String(d.confidence));
    assert(d.selectedImage !== null, "T16 a valid image is selected");
  }
}

section("T17 — Newly enriched product → same pipeline (deterministic)");
{
  const p = getProduct("yq-1051");
  assert(!!p, "T17 enriched product yq-1051 exists");
  if (p) {
    const d1 = selectProductImage(p);
    const d2 = selectProductImage(p);
    assert(JSON.stringify(d1) === JSON.stringify(d2), "T17 deterministic decision");
    assert(d1.status !== "REJECTED", "T17 enriched product not rejected", d1.status);
  }
}

section("T18 — Variant exact validation (matched → APPROVED, mismatched → REJECTED)");
{
  const p = makeProduct({ name: { ar: "سيروم فيتامين سي 30 مل", en: "CeraVe Vitamin C Serum" }, sizeLabel: "30 مل" });
  const good = selectProductImage(p, [
    { url: "https://www.cerave.com/img/vc.png", sourceKey: "manufacturer", claimed: { brand: "CeraVe", category: "moisturizers", size: "30 مل" } },
  ]);
  assert(good.status === "APPROVED", "T18 exact variant → APPROVED", good.status);
  assert(good.candidates[0].sizeMatch === true, "T18 size verified matched");
  const bad = selectProductImage(p, [
    { url: "https://www.cerave.com/img/vc60.png", sourceKey: "manufacturer", claimed: { brand: "CeraVe", category: "moisturizers", size: "60 مل" } },
  ]);
  assert(bad.status === "REJECTED", "T18 mismatched variant → REJECTED", bad.status);
  assert(bad.candidates[0].sizeMatch === false, "T18 size verified mismatch");
}

section("Part 5 real-catalog audit (dry-run)");
{
  const audit = runImageAudit();
  assert(audit.products.total === 2764, `A1 audit covers all published products (${audit.products.total})`);
  assert(audit.products.withoutValidImage === 0, `A2 every published product has a valid image (${audit.products.withoutValidImage} missing)`);
  assert(audit.decisions.rejected === 0, `A3 zero rejected images (${audit.decisions.rejected})`);
  assert(audit.decisions.approved + audit.decisions.reviewRequired === audit.products.total, `A4 decisions cover all products (${audit.decisions.approved} + ${audit.decisions.reviewRequired})`);
  assert(audit.images.invalidUrls === 0, `A5 no invalid URLs (${audit.images.invalidUrls})`);
  assert(audit.images.malformedUrlsNormalized === 0, `A6 no malformed URLs (${audit.images.malformedUrlsNormalized})`);
  assert(audit.images.placeholderOrGenericRejected === 0, `A7 no generic placeholders (${audit.images.placeholderOrGenericRejected})`);
  assert(audit.images.sizeMismatches === 0 && audit.images.shadeMismatches === 0 && audit.images.countMismatches === 0, "A8 no confirmed size/shade/count mismatches in catalog");
  assert(audit.images.identityMismatches === 0, `A9 no identity mismatches (${audit.images.identityMismatches})`);
  assert(audit.bySource.storeAsset === 354, `A10 local store assets: 354 (${audit.bySource.storeAsset})`);
  assert(audit.bySource.yaqoot === 2410, `A11 Yaqoot-sourced images: 2410 (${audit.bySource.yaqoot})`);

  const examples = produceImageSourceExamples(6);
  assert(examples.length >= 5, `A12 ≥5 real image-source examples (${examples.length})`);
  const examplesComplete = examples.every(
    (e) => e.productId && e.brand && e.currentImage && e.identityEvidence && e.selectedImage && e.finalStatus && e.confidence >= 0
  );
  assert(examplesComplete, "A13 examples are complete (id, brand, current, evidence, selected, status, confidence)");

  const decisions = produceImageDecisions(10);
  assert(decisions.length >= 10, `A14 ≥10 real image decisions (${decisions.length})`);
  const decisionsComplete = decisions.every(
    (d) => d.productId && d.current && d.selectedImage && d.validation && d.reason && d.confidence >= 0 && d.status
  );
  assert(decisionsComplete, "A15 decisions are complete (id, current, selected, validation, reason, confidence, status)");
}

section("Storefront integration — single canonical accessor");
{
  const componentsDir = path.resolve(__dirname, "..", "components");
  const targets = [
    "product/ProductCard.tsx",
    "product/ProductPurchase.tsx",
    "product/QuickActions.tsx",
    "product/RelatedProducts.tsx",
    "search/SearchOverlay.tsx",
    "product/CompareContent.tsx",
    "home/AutoProductStrip.tsx",
    "home/NewArrivals.tsx",
    "home/Hero.tsx",
    "home/RoutinesSection.tsx",
    "home/SmartRecommendations.tsx",
    "home/SmartRoutineBuilder.tsx",
    "home/RecentlyViewed.tsx",
    "home/RecentlyAdded.tsx",
    "home/ProductMarquee.tsx",
    "storefront/AlternativeAlternative/AlternativeSection.tsx",
  ];
  let allUseGallery0 = true;
  for (const rel of targets) {
    const file = path.join(componentsDir, rel);
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    if (!/gallery\s*\?\.\s*\[0\]|gallery\[0\]/.test(src)) allUseGallery0 = false;
  }
  assert(allUseGallery0, "A16 storefront surfaces read gallery[0] (canonical accessor)");
  const allComponents = collectFiles(componentsDir);
  const legacyUsers = allComponents.filter((f) => {
    const src = fs.readFileSync(f, "utf8");
    return /selectBestProductImage|produceImageSourceExamples/.test(src);
  });
  assert(legacyUsers.length === 0, `A17 no storefront component uses legacy image helpers (${legacyUsers.length})`);
}

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

console.log(`\n========== PART 5 RESULT: ${passed} passed, ${failed} failed ==========`);
if (failed > 0) {
  console.log("Failures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
