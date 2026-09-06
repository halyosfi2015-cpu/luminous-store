/**
 * PART 4 — Deterministic Product-Name Verification Suite
 * Executes the 16 directive test cases against the Part 4 pipeline.
 * Run with: npx tsx scripts/verify-part4.ts
 */

import {
  extractNameFacts,
  reconstructName,
  computeNameDecision,
  validateOriginality,
  validateIdentity,
  validateQuality,
  runPart4Audit,
  produceNameExamples,
} from "../src/lib/product-name";
import type { NameIdentityFacts } from "../src/lib/product-name";
import { products, getProductBySlug } from "../src/data/products";
import { onlyPublished } from "../src/lib/publication";
import { loadSnapshotCatalog } from "./lib/snapshot";
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

function facts(over: Partial<NameIdentityFacts> = {}): NameIdentityFacts {
  return {
    brand: "CeraVe",
    brandAr: "CeraVe",
    productType: "moisturizers",
    productTypeAr: "مرطب",
    productTypeEn: "Moisturizer",
    size: "50 مل",
    volumeMl: 50,
    spf: undefined,
    concentration: undefined,
    count: undefined,
    shade: undefined,
    variant: undefined,
    productLine: "كريم مرطب",
    coreDescriptorAr: "كريم مرطب",
    sourceRank: 7,
    sourceLabel: "Yaqoot",
    sourceVerified: false,
    sourceAgreement: "low",
    ...over,
  };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "test-1",
    slug: "test-1",
    sku: "TEST-1",
    brand: "CeraVe",
    brandAr: "CeraVe",
    name: { ar: "كريم مرطب للوجه", en: "كريم مرطب للوجه | CeraVe" },
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

section("T1 — Exact Yaqoot title is REJECTED");
{
  const f = facts({ coreDescriptorAr: "كريم مرطب سحري", productLine: "كريم مرطب سحري" });
  const r = validateOriginality("كريم مرطب سحري للوجه", "كريم مرطب سحري للوجه", "", "", f);
  assert(r.status === "REJECTED", "T1 exact Yaqoot title → REJECTED", r.status);
  assert(r.reasons.some((x) => x.includes("exact Yaqoot")), "T1 reason mentions exact copy");
}

section("T2 — Yaqoot title + Luminous is REJECTED");
{
  const r = validateOriginality("كريم مرطب للوجه لومينوس", "كريم مرطب للوجه", "", "", facts());
  assert(r.status === "REJECTED", "T2 +Luminous suffix → REJECTED", r.status);
  assert(r.reasons.some((x) => x.includes("Luminous")), "T2 reason mentions Luminous");
}

section("T3 — Punctuation-only modification is REJECTED");
{
  const r = validateOriginality("كريم مرطب، للوجه!", "كريم مرطب للوجه", "", "", facts());
  assert(r.status === "REJECTED", "T3 punctuation-only → REJECTED", r.status);
  assert(r.reasons.some((x) => x.includes("punctuation")), "T3 reason mentions punctuation");
}

section("T4 — Word-order-only modification is REJECTED");
{
  const r = validateOriginality("فيتامين سي سيروم", "سيروم فيتامين سي", "", "", facts());
  assert(r.status === "REJECTED", "T4 word-order → REJECTED", r.status);
  assert(r.reasons.some((x) => x.includes("word-order")), "T4 reason mentions word-order");
}

section("T5 — Mechanical translation is REJECTED");
{
  const r = validateOriginality("Cream", "Cream", "Cream", "Cream", facts());
  assert(r.status === "REJECTED", "T5 mechanical translation → REJECTED", r.status);
  assert(r.reasons.some((x) => x.includes("mechanical translation")), "T5 reason mentions mechanical translation");
}

section("T6 — Independently reconstructed name is APPROVED (real catalog)");
{
  const p = getProduct("yq-754");
  assert(!!p, "T6 sample product yq-754 exists");
  if (p) {
    const f = extractNameFacts(p);
    const n = reconstructName(p, f);
    const d = computeNameDecision(f, n, p.name);
    assert(d.status === "APPROVED", "T6 independent reconstruction → APPROVED", d.status);
    assert(n.ar.length > 0, "T6 AR name non-empty");
  }
}

section("T7 — Identical official name (identity overlap, no editorial) is APPROVED");
{
  const f = facts({ coreDescriptorAr: "كريم مرطب" });
  const r = validateOriginality("كريم مرطب", "كريم مرطب", "", "", f);
  assert(r.status === "APPROVED", "T7 identical official name → APPROVED", r.status);
}

section("T8 — Same brand + line + size preserves identity (PASS)");
{
  const id = validateIdentity("CeraVe كريم مرطب 50 مل", "CeraVe Moisturizer 50 ml", facts());
  assert(id.status === "PASS", "T8 identity preserved → PASS", id.status);
  assert(id.preserved.includes("brand") && id.preserved.includes("size"), "T8 brand+size preserved");
}

section("T9 — Missing size → PASS without inventing a size");
{
  const f = facts({ size: undefined, volumeMl: undefined });
  const n = reconstructName(makeProduct({ name: { ar: "سيروم فيتامين سي", en: "سيروم فيتامين سي | CeraVe" } }), f);
  assert(!/مل|ml|غرام|غ|جم|قرص|كبسولة/.test(n.ar), "T9 no size invented", n.ar);
  const d = computeNameDecision(f, n, { ar: "سيروم فيتامين سي", en: "سيروم فيتامين سي" });
  assert(d.status === "APPROVED", "T9 missing-size name → APPROVED", d.status);
}

section("T10 — Missing SPF → PASS without inventing an SPF");
{
  const f = facts({ spf: undefined });
  const n = reconstructName(makeProduct({ name: { ar: "واقي شمس", en: "واقي شمس | CeraVe" } }), f);
  assert(!/spf|عامل حمايه|حمايه\s*\d+/i.test(n.ar), "T10 no SPF invented", n.ar);
  const d = computeNameDecision(f, n, { ar: "واقي شمس", en: "واقي شمس" });
  assert(d.status === "APPROVED", "T10 missing-SPF name → APPROVED", d.status);
}

section("T11 — Conflicting variant → REVIEW");
{
  const f = facts({ variant: "بدون لون" });
  const id = validateIdentity("CeraVe كريم مرطب 50 مل", "", f);
  assert(id.status === "REVIEW", "T11 variant conflict → REVIEW", id.status);
  assert(id.conflicts.includes("variant"), "T11 conflict flagged as variant");
}

section("T12 — Unsupported marketing claim → REJECTED");
{
  const f = facts();
  const d = computeNameDecision(f, { ar: "كريم مرطب سحري للوجه", en: "كريم مرطب سحري" }, { ar: "كريم مرطب", en: "كريم مرطب" });
  assert(d.status === "REJECTED", "T12 marketing claim → REJECTED", d.status);
  assert(!d.qualityValid, "T12 quality invalid");
}

section("T13 — Duplicated brand → quality FAIL");
{
  const q = validateQuality("CeraVe CeraVe كريم مرطب", "", facts());
  assert(q.issues.includes("duplicated brand"), "T13 duplicated brand detected", q.issues.join("; "));
  assert(!q.valid, "T13 quality invalid");
}

section("T14 — Duplicated size → quality FAIL");
{
  const q = validateQuality("كريم مرطب 50 مل 50 مل", "", facts());
  assert(q.issues.includes("duplicated size"), "T14 duplicated size detected", q.issues.join("; "));
  assert(!q.valid, "T14 quality invalid");
}

section("T15 — Old product runs through the same pipeline");
{
  const p = loadSnapshotCatalog().find((x) => x.id === "yq-460");
  assert(!!p, "T15 old product yq-460 exists");
  if (p) {
    const f = extractNameFacts(p);
    const n = reconstructName(p, f);
    const d = computeNameDecision(f, n, p.name);
    assert(n.ar.length > 0 && ["APPROVED", "REVIEW_REQUIRED", "REJECTED"].includes(d.status), "T15 old product decision valid", d.status);
    assert(d.confidence >= 0 && d.confidence <= 100, "T15 confidence in [0,100]", String(d.confidence));
  }
}

section("T16 — Newly enriched product runs through the same pipeline (deterministic)");
{
  const p = loadSnapshotCatalog().find((x) => x.id === "yq-1051");
  assert(!!p, "T16 enriched product yq-1051 exists");
  if (p) {
    const f1 = extractNameFacts(p);
    const n1 = reconstructName(p, f1);
    const d1 = computeNameDecision(f1, n1, p.name);
    const f2 = extractNameFacts(p);
    const n2 = reconstructName(p, f2);
    assert(n1.ar === n2.ar && n1.en === n2.en, "T16 deterministic reconstruction");
    assert(d1.status === "APPROVED", "T16 enriched product decision valid", d1.status);
    assert(d1.identityStatus === "PASS", "T16 identity preserved");
  }
}

section("Part 4 real-catalog audit (dry-run, against the pre-apply snapshot so decisions are not circular)");
{
  const audit = runPart4Audit(loadSnapshotCatalog());
  assert(audit.products.total === 2764, `A1 audit covers all published products (${audit.products.total})`);
  assert(audit.names.rejected === 0, `A2 zero rejected names after remediation (${audit.names.rejected})`);
  assert(audit.names.reviewRequired === 0, `A2b zero review-required names after remediation (${audit.names.reviewRequired})`);
  assert(audit.identityPreserved === audit.products.total, `A3 identity preserved for 100% of products (${audit.identityPreserved}/${audit.products.total})`);
  assert(audit.names.approved >= 2700, `A4 approved names ≥ 2700 (${audit.names.approved})`);
  assert(audit.violations.unsupportedIdentityFacts === 0, `A5 no unsupported identity facts (${audit.violations.unsupportedIdentityFacts})`);
  const examples = produceNameExamples(12, loadSnapshotCatalog());
  assert(examples.length >= 10, `A6 ≥10 real before/after examples (${examples.length})`);
  const allComplete = examples.every(
    (e) => e.productId && e.brand && e.originalName.ar && e.reconstructedName.ar && e.verifiedIdentityFacts && e.finalDecision && e.confidence >= 0
  );
  assert(allComplete, "A7 examples are complete (id, brand, old, new, facts, decision, confidence)");
}

console.log(`\n========== PART 4 RESULT: ${passed} passed, ${failed} failed ==========`);
if (failed > 0) {
  console.log("Failures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}