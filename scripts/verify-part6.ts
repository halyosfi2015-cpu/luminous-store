/**
 * PART 6 — Deterministic Product-Description Verification Suite
 * Executes the directive test cases against the canonical description pipeline.
 * Run with: npx tsx scripts/verify-part6.ts
 */

import {
  extractDescriptionFacts,
  generateDescription,
  selectProductDescription,
  runDescriptionAudit,
  produceDescriptionExamples,
  validateOriginality,
  validateUnsupportedFacts,
  validateConsistency,
} from "../src/lib/product-description";
import type { DescriptionFacts } from "../src/lib/product-description";
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

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "desc-test-1",
    slug: "desc-test-1",
    sku: "DESC-TEST-1",
    brand: "CeraVe",
    brandAr: "CeraVe",
    name: { ar: "كريم مرطب للوجه 50 مل", en: "CeraVe Moisturizing Cream 50 ml" },
    category: "Moisturizers",
    categoryAr: "مرطبات",
    categorySlug: "moisturizers",
    description: { ar: "", en: "" },
    pricing: {},
    gallery: [],
    ingredients: { ar: [], en: [] },
    usageInstructions: { ar: "يوضع على البشرة النظيفة.", en: "Apply to clean skin." },
    howToUse: [],
    howToUseAr: [],
    skinTypes: ["dry"],
    suitableFor: [],
    skinConcerns: [],
    benefits: { ar: ["ترطيب عميق"], en: ["Deep hydration"] },
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

// A realistic legacy Yaqoot marketing copy (defective original).
const YAQOOT =
  "يرطب البشرة بعمق ويحافظ على ترطيبها طوال اليوم، غني بحمض الهيالورونيك الذي يساعد على جذب الرطوبة وحبسها داخل البشرة، مناسب للبشرة الجافة والحساسة، خالٍ من العطور والبارابين.";

section("T1 — Exact Yaqoot copy → REJECTED");
{
  const facts = extractDescriptionFacts(makeProduct());
  const r = validateOriginality(YAQOOT, YAQOOT, facts);
  assert(r.status === "REJECTED", "T1 exact Yaqoot copy → REJECTED", r.status);
  assert(r.score === 0, "T1 zero originality score");
}

section("T2 — Yaqoot copy + 'Luminous بتشكيلة' wrapper → REJECTED");
{
  const facts = extractDescriptionFacts(makeProduct());
  const wrapped = "منتج عناية من Luminous بتشكيلة المرطبات. " + YAQOOT;
  const r = validateOriginality(wrapped, YAQOOT, facts);
  assert(r.status === "REJECTED", "T2 wrapped copy → REJECTED", r.status);
}

section("T3 — Synonym rewrite preserving order → REJECTED");
{
  const facts = extractDescriptionFacts(makeProduct());
  const rewrite =
    "يرطب البشرة بعمق ويحافظ على رطوبتها طوال اليوم، غني بحمض الهيالورونيك الذي يعمل على جذب الرطوبة وحبسها بداخل البشرة، مناسب للبشرة الجافة والحساسة، بدون عطور وبارابين.";
  const r = validateOriginality(rewrite, YAQOOT, facts);
  assert(["REJECTED", "REVIEW_REQUIRED"].includes(r.status), "T3 synonym rewrite never PASSES", r.status);
  assert(r.editorialSimilarity >= 0.6, "T3 high editorial overlap detected", String(r.editorialSimilarity));
}

section("T4 — Reordered rewrite → REVIEW_REQUIRED (order broken)");
{
  const facts = extractDescriptionFacts(makeProduct());
  const reordered =
    "مناسب للبشرة الجافة والحساسة، بدون عطور أو بارابين. يرطب البشرة بعمق ويحافظ على رطوبتها طوال اليوم، غني بحمض الهيالورونيك الذي يعمل على جذب الرطوبة وحبسها بداخل البشرة، ويتركها ناعمة ورطبة.";
  const r = validateOriginality(reordered, YAQOOT, facts);
  assert(r.status === "REVIEW_REQUIRED", "T4 reordered → REVIEW_REQUIRED", `${r.status} (sim ${r.editorialSimilarity})`);
}

section("T5 — Independent editorial description → PASS (high score)");
{
  const p = makeProduct();
  const facts = extractDescriptionFacts(p);
  const generated = generateDescription(p, facts);
  const r = validateOriginality(generated.ar, YAQOOT, facts);
  assert(r.status === "PASS", "T5 independent description → PASS", r.status);
  assert(r.score >= 80, "T5 high originality score", String(r.score));
}

section("T6 — Unsupported claim phrase (مضمون) → invalid");
{
  const facts = extractDescriptionFacts(makeProduct());
  const r = validateUnsupportedFacts("نتيجة مضمونة خلال أسبوع فقط", facts);
  assert(r.valid === false, "T6 guaranteed-result claim rejected", r.issues.join(" | "));
  assert(r.issues.some((i) => i.includes("unsupported claim")), "T6 reason class is claim phrase");
}

section("T7 — Invented ingredient → invalid (verified ingredient → valid)");
{
  const facts = extractDescriptionFacts(makeProduct());
  const r = validateUnsupportedFacts("يتميز بمكونات تشمل جلسرين ونياسيناميد", facts);
  assert(r.valid === false, "T7 invented ingredient rejected", r.issues.join(" | "));
  assert(r.issues.some((i) => i.includes("invented ingredient")), "T7 reason class is ingredient");

  const p = makeProduct({ ingredients: { ar: ["جلسرين"], en: ["glycerin"] } });
  const f2 = extractDescriptionFacts(p);
  const ok = validateUnsupportedFacts("يتميز بمكونات تشمل جلسرين", f2);
  assert(ok.valid === true, "T7 verified ingredient accepted", ok.issues.join(" | "));
}

section("T8 — Invented effect (تفتيح) → invalid");
{
  const facts = extractDescriptionFacts(makeProduct());
  const r = validateUnsupportedFacts("يعمل على تفتيح البشرة", facts);
  assert(r.valid === false, "T8 invented effect rejected", r.issues.join(" | "));
  assert(r.issues.some((i) => i.includes("effect claim")), "T8 reason class is effect claim");
}

section("T9 — Insufficient evidence (weak source + sparse facts) → REVIEW_REQUIRED");
{
  const p = makeProduct({
    name: { ar: "سيروم فيتامين سي", en: "CeraVe Vitamin C Serum" },
    categorySlug: "serums",
    category: "Serums",
    ingredients: { ar: [], en: [] },
    benefits: { ar: [], en: [] },
    usageInstructions: { ar: "", en: "" },
    skinTypes: [],
    skinConcerns: [],
  });
  const d = selectProductDescription(p, [
    { provider: "other", rank: 9, description: "سيروم غني بمضادات الأكسدة يوضع مساءً." },
  ]);
  assert(d.status === "REVIEW_REQUIRED", "T9 insufficient evidence → REVIEW_REQUIRED", d.status);
  assert(d.reviewReasons.some((r) => r.includes("insufficient")), "T9 reason mentions insufficient evidence", d.reviewReasons.join(" | "));
}

section("T10 — Conflicting trusted sources → REVIEW_REQUIRED");
{
  const p = makeProduct({ name: { ar: "كريم مرطب للوجه 50 مل", en: "CeraVe Cream 50 ml" } });
  const d = selectProductDescription(p, [
    { provider: "manufacturer", rank: 1, description: "مرطب يومي للوجه.", facts: { brand: "CeraVe", size: "50 مل" } },
    { provider: "trustedRetailer", rank: 2, description: "مرطب يومي للوجه.", facts: { brand: "CeraVe", size: "60 مل" } },
  ]);
  assert(d.status === "REVIEW_REQUIRED", "T10 trusted-source conflict → REVIEW_REQUIRED", d.status);
  assert(d.reviewReasons.some((r) => r.includes("trusted sources") || r.includes("conflict")), "T10 reason mentions trusted-source conflict", d.reviewReasons.join(" | "));
}

section("T11 — Correct name + independent description → APPROVED");
{
  const p = makeProduct({
    ingredients: { ar: ["جلسرين"], en: ["glycerin"] },
    benefits: { ar: ["ترطيب عميق"], en: ["Deep hydration"] },
    usageInstructions: { ar: "يوضع على البشرة النظيفة.", en: "Apply to clean skin." },
    skinTypes: ["dry", "sensitive"],
    skinConcerns: ["dryness"],
  });
  const d = selectProductDescription(p, [
    { provider: "yaqoot", rank: 5, description: YAQOOT },
  ]);
  assert(d.status === "APPROVED", "T11 correct name + independent → APPROVED", d.status);
  assert(d.originalityScore >= 80, "T11 independent of Yaqoot", String(d.originalityScore));
  assert(d.confidenceScore >= 70, "T11 sufficient confidence", String(d.confidenceScore));
}

section("T12 — Wrong brand declaration → consistency FAIL");
{
  const facts = extractDescriptionFacts(makeProduct());
  const r = validateConsistency("CeraVe مرطب، من ماركة نيتروجينا للبشرة الجافة", facts);
  assert(r.status === "FAIL", "T12 wrong brand → FAIL", r.status);
  assert(r.mismatches.some((m) => m.includes("brand")), "T12 reason mentions brand", r.mismatches.join(" | "));
}

section("T13 — Old product (real catalog) → deterministic decision");
{
  const p = loadSnapshotCatalog().find((x) => x.id === "yq-460");
  assert(!!p, "T13 old product yq-460 exists");
  if (p) {
    const d1 = selectProductDescription(p);
    const d2 = selectProductDescription(p);
    assert(JSON.stringify(d1) === JSON.stringify(d2), "T13 deterministic decision");
    assert(d1.status !== "REJECTED", "T13 old product not rejected", d1.status);
    assert(d1.reconstructedDescription.ar.length > 0, "T13 rebuilt description is non-empty");
  }
}

section("T14 — Newly enriched product (real catalog) → APPROVED + deterministic");
{
  const p = loadSnapshotCatalog().find((x) => x.id === "yq-1051");
  assert(!!p, "T14 enriched product yq-1051 exists");
  if (p) {
    const d1 = selectProductDescription(p);
    const d2 = selectProductDescription(p);
    assert(JSON.stringify(d1) === JSON.stringify(d2), "T14 deterministic decision");
    assert(d1.status === "APPROVED", "T14 enriched product approved", d1.status);
    assert(d1.originalityScore >= 60, "T14 independent editorial rebuild", String(d1.originalityScore));
    assert(d1.reconstructedDescription.ar !== (p.description?.ar ?? ""), "T14 rebuilt differs from original");
  }
}

section("Part 6 real-catalog audit (dry-run, against the pre-apply snapshot so decisions are not circular)");
{
  const audit = runDescriptionAudit(loadSnapshotCatalog());
  assert(audit.total === 2764, `A1 audit covers all published products (${audit.total})`);
  assert(audit.inspected === 2764, `A2 all products inspected (${audit.inspected})`);
  assert(audit.rebuilt === 2764, `A3 every description rebuilt (${audit.rebuilt})`);
  assert(audit.decisions.approved === 2764, `A4 all rebuilt descriptions approved (${audit.decisions.approved})`);
  assert(audit.decisions.reviewRequired === 0, `A5 zero reviews required (${audit.decisions.reviewRequired})`);
  assert(audit.decisions.rejected === 0, `A6 zero rejected (${audit.decisions.rejected})`);
  assert(audit.exactCopyFailures === 0, `A7 no exact copies (${audit.exactCopyFailures})`);
  assert(audit.mechanicalParaphraseFailures === 0, `A8 no mechanical paraphrases (${audit.mechanicalParaphraseFailures})`);
  assert(audit.unsupportedFactFailures === 0, `A9 no unsupported facts (${audit.unsupportedFactFailures})`);
  assert(audit.sourceConflicts === 0, `A10 no source conflicts (${audit.sourceConflicts})`);
  assert(audit.nameDescriptionMismatches === 0, `A11 no name/description mismatches (${audit.nameDescriptionMismatches})`);
  assert(audit.insufficientSourceConfidence === 0, `A12 no insufficient-confidence cases (${audit.insufficientSourceConfidence})`);
  assert(audit.originalityPasses === 2764, `A13 all originality checks pass (${audit.originalityPasses})`);
  assert(audit.originalityFailures === 0, `A14 no originality failures (${audit.originalityFailures})`);
  assert(audit.originalDefects.templateReproductions === 0, `A15 no template reproductions remain (${audit.originalDefects.templateReproductions})`);
  assert(audit.originalDefects.mechanicalTranslations === 2410, `A16 original mechanical translations: 2410 (${audit.originalDefects.mechanicalTranslations})`);

  let noMarker = true;
  let allApproved = true;
  for (const p of loadSnapshotCatalog()) {
    const d = selectProductDescription(p);
    if (d.reconstructedDescription.ar.includes("منتج عنايه من luminous") && d.reconstructedDescription.ar.includes("بتشكيله")) noMarker = false;
    if (d.status !== "APPROVED") allApproved = false;
  }
  assert(noMarker, "A17 no rebuilt description carries the legacy mechanical-translation wrapper");
  assert(allApproved, "A18 every published product approved end-to-end");

  const examples = produceDescriptionExamples(12, loadSnapshotCatalog());
  assert(examples.length >= 10, `A19 ≥10 real before/after examples (${examples.length})`);
  const examplesComplete = examples.every(
    (e) => e.productId && e.brand && e.productName.ar && e.originalDescription && e.luminousDescription && e.originalityScore >= 0 && e.confidenceScore >= 0 && e.finalStatus
  );
  assert(examplesComplete, "A20 examples are complete (id, brand, name, before, after, scores, status)");
  const examplesApproved = examples.every((e) => e.finalStatus === "APPROVED");
  assert(examplesApproved, "A21 every example approved");
}

console.log(`\n========== PART 6 RESULT: ${passed} passed, ${failed} failed ==========`);
if (failed > 0) {
  console.log("Failures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
