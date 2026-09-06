/**
 * PART 7 — Deterministic Product-Benefits Verification Suite
 * Executes the directive test cases against the canonical benefits pipeline.
 * Run with: npx tsx scripts/verify-part7.ts
 */

import {
  extractBenefitFacts,
  generateBenefits,
  selectProductBenefits,
  runBenefitAudit,
  produceBenefitExamples,
  validateBenefitOriginality,
  validateBenefitUnsupported,
  validateBenefitDuplicates,
  validateBenefitConsistency,
} from "../src/lib/product-benefits";
import { extractDescriptionFacts } from "../src/lib/product-description";
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
    id: "ben-test-1",
    slug: "ben-test-1",
    sku: "BEN-TEST-1",
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

// Legacy template benefit bullets that were copied across the catalog.
const TEMPLATE_BULLETS = ["ترطيب عميق يدوم طوال اليوم", "يمنح البشرة نعومة وإشراقة", "يقوي حاجز البشرة الطبيعي"];

section("T1 — Verbatim copy of a template bullet → REJECTED");
{
  const facts = extractDescriptionFacts(makeProduct());
  const r = validateBenefitOriginality([TEMPLATE_BULLETS[0]], TEMPLATE_BULLETS, facts);
  assert(r.status === "REJECTED", "T1 verbatim copy → REJECTED", r.status);
  assert(r.score === 0, "T1 zero originality score");
}

section("T2 — Template bullet + 'Luminous' wrapper → REJECTED");
{
  const facts = extractDescriptionFacts(makeProduct());
  const wrapped = ["منتج عناية من Luminous بتشكيلة المرطبات. " + TEMPLATE_BULLETS[0]];
  const r = validateBenefitOriginality(wrapped, TEMPLATE_BULLETS, facts);
  assert(r.status === "REJECTED", "T2 wrapped copy → REJECTED", `${r.status} (sim ${r.editorialSimilarity})`);
}

section("T3 — Synonym paraphrase of a source bullet → never PASSES");
{
  const facts = extractDescriptionFacts(makeProduct());
  const rewrite = ["ترطيب عميق يدوم طوال النهار"];
  const r = validateBenefitOriginality(rewrite, TEMPLATE_BULLETS, facts);
  assert(["REJECTED", "REVIEW_REQUIRED"].includes(r.status), "T3 synonym paraphrase never PASSES", r.status);
  assert(r.editorialSimilarity >= 0.5, "T3 high overlap detected", String(r.editorialSimilarity));
}

section("T4 — Reordered identical bullets → REJECTED (copy regardless of order)");
{
  const facts = extractDescriptionFacts(makeProduct());
  const reordered = [TEMPLATE_BULLETS[2], TEMPLATE_BULLETS[0], TEMPLATE_BULLETS[1]];
  const r = validateBenefitOriginality(reordered, TEMPLATE_BULLETS, facts);
  assert(r.status === "REJECTED", "T4 reordered copy → REJECTED", r.status);
}

section("T5 — Independent rebuilt bullets → PASS (high score)");
{
  const p = makeProduct({ ingredients: { ar: ["جلسرين"], en: ["glycerin"] } });
  const facts = extractDescriptionFacts(p);
  const rebuilt = generateBenefits(p).ar;
  const r = validateBenefitOriginality(rebuilt, TEMPLATE_BULLETS, facts);
  assert(r.status === "PASS", "T5 independent benefits → PASS", r.status);
  assert(r.score >= 60, "T5 high originality score", String(r.score));
}

section("T6 — Invented effect (تفتيح) → invalid");
{
  const facts = extractDescriptionFacts(makeProduct());
  const r = validateBenefitUnsupported(["يعمل على تفتيح البشرة"], [], facts);
  assert(r.valid === false, "T6 invented effect rejected", r.issues.join(" | "));
  assert(r.issues.some((i) => i.includes("effect")), "T6 reason class is effect claim");
}

section("T7 — Invented ingredient → invalid (verified ingredient → valid)");
{
  const facts = extractDescriptionFacts(makeProduct());
  const r = validateBenefitUnsupported(["يتميز بمكونات تشمل جلسرين"], [], facts);
  assert(r.valid === false, "T7 invented ingredient rejected", r.issues.join(" | "));
  assert(r.issues.some((i) => i.includes("ingredient")), "T7 reason class is ingredient");

  const p = makeProduct({ ingredients: { ar: ["جلسرين"], en: ["glycerin"] } });
  const f2 = extractDescriptionFacts(p);
  const ok = validateBenefitUnsupported(["يتميز بمكونات تشمل جلسرين"], [], f2);
  assert(ok.valid === true, "T7 verified ingredient accepted", ok.issues.join(" | "));
}

section("T8 — Unsupported claim (مضمون/نهائياً) → invalid");
{
  const facts = extractDescriptionFacts(makeProduct());
  const r = validateBenefitUnsupported(["نتيجة مضمونة نهائياً"], [], facts);
  assert(r.valid === false, "T8 guaranteed-absolute claim rejected", r.issues.join(" | "));
  assert(r.issues.some((i) => i.includes("unsupported claim")), "T8 reason class is claim phrase");
}

section("T9 — Duplicate / near-duplicate bullets → invalid");
{
  const r1 = validateBenefitDuplicates(["ترطيب عميق", "ترطيب عميق"]);
  assert(r1.length > 0, "T9 exact duplicate detected", r1.join(" | "));
  assert(r1.some((i) => i.includes("duplicate benefit")), "T9 exact duplicate reason");
  const r2 = validateBenefitDuplicates(["يرطب البشرة بعمق", "يرطب البشرة بعمق ويحبس الرطوبة"]);
  assert(r2.length > 0, "T9 near-duplicate detected", r2.join(" | "));
}

section("T10 — Function/effect classification correct");
{
  const p = makeProduct({ ingredients: { ar: ["جلسرين"], en: ["glycerin"] } });
  const facts = extractBenefitFacts(p);
  assert(facts.some((f) => f.kind === "function"), "T10 has function benefit");
  assert(facts.some((f) => f.kind === "effect"), "T10 has effect benefit");
  const effect = facts.find((f) => f.kind === "effect");
  assert(!!effect && effect.evidence.startsWith("ingredient:"), "T10 effect carries ingredient evidence", effect?.evidence ?? "none");
  const fn = facts.find((f) => f.kind === "function");
  assert(!!fn && fn.evidence.startsWith("category:"), "T10 function carries category evidence", fn?.evidence ?? "none");
}

section("T11 — Insufficient evidence (weak source + sparse facts) → REVIEW_REQUIRED");
{
  const p = makeProduct({ skinTypes: [] });
  const d = selectProductBenefits(p, [{ provider: "other", rank: 9 }]);
  assert(d.status === "REVIEW_REQUIRED", "T11 insufficient evidence → REVIEW_REQUIRED", d.status);
  assert(d.reviewReasons.some((r) => r.includes("insufficient")), "T11 reason mentions insufficient evidence", d.reviewReasons.join(" | "));
}

section("T12 — Conflicting trusted sources → REVIEW_REQUIRED");
{
  const p = makeProduct({ name: { ar: "كريم مرطب للوجه 50 مل", en: "CeraVe Cream 50 ml" } });
  const d = selectProductBenefits(p, [
    { provider: "manufacturer", rank: 1, facts: { brand: "CeraVe", size: "50 مل" } },
    { provider: "trustedRetailer", rank: 2, facts: { brand: "CeraVe", size: "60 مل" } },
  ]);
  assert(d.status === "REVIEW_REQUIRED", "T12 trusted-source conflict → REVIEW_REQUIRED", d.status);
  assert(d.reviewReasons.some((r) => r.includes("trusted sources") || r.includes("conflict")), "T12 reason mentions trusted-source conflict", d.reviewReasons.join(" | "));
}

section("T13 — Correct product → APPROVED end-to-end");
{
  const p = makeProduct({
    ingredients: { ar: ["جلسرين"], en: ["glycerin"] },
    skinTypes: ["dry", "sensitive"],
    skinConcerns: ["dryness"],
  });
  const d = selectProductBenefits(p);
  assert(d.status === "APPROVED", "T13 correct product → APPROVED", d.status);
  assert(d.benefitFacts.length >= 2, "T13 ≥2 benefit bullets", String(d.benefitFacts.length));
  assert(d.functionCount >= 1 && d.effectCount >= 1, "T13 has function + effect bullets");
  assert(d.confidenceScore >= 70, "T13 sufficient confidence", String(d.confidenceScore));
}

section("T14 — Wrong brand declaration → consistency FAIL");
{
  const facts = extractDescriptionFacts(makeProduct());
  const r = validateBenefitConsistency(["CeraVe مرطب، من ماركة نيتروجينا"], facts);
  assert(r.status === "FAIL", "T14 wrong brand → FAIL", r.status);
  assert(r.mismatches.some((m) => m.includes("brand")), "T14 reason mentions brand", r.mismatches.join(" | "));
}

section("T15 — Old product (real catalog) → deterministic decision");
{
  const p = loadSnapshotCatalog().find((x) => x.id === "yq-460");
  assert(!!p, "T15 old product yq-460 exists");
  if (p) {
    const d1 = selectProductBenefits(p);
    const d2 = selectProductBenefits(p);
    assert(JSON.stringify(d1) === JSON.stringify(d2), "T15 deterministic decision");
    assert(d1.status !== "REJECTED", "T15 old product not rejected", d1.status);
    assert(d1.reconstructedBenefits.ar.length >= 2, "T15 rebuilt benefit list non-trivial");
  }
}

section("T16 — Newly enriched product (real catalog) → APPROVED + deterministic");
{
  const p = loadSnapshotCatalog().find((x) => x.id === "yq-1051");
  assert(!!p, "T16 enriched product yq-1051 exists");
  if (p) {
    const d1 = selectProductBenefits(p);
    const d2 = selectProductBenefits(p);
    assert(JSON.stringify(d1) === JSON.stringify(d2), "T16 deterministic decision");
    assert(d1.status === "APPROVED", "T16 enriched product approved", d1.status);
    assert(d1.functionCount >= 1, "T16 has function benefit");
    assert(d1.reconstructedBenefits.ar.join(" . ") !== (Array.isArray(p.benefits?.ar) ? p.benefits.ar : []).join(" . "), "T16 rebuilt differs from original");
  }
}

section("Part 7 real-catalog audit (dry-run, against the pre-apply snapshot so decisions are not circular)");
{
  const audit = runBenefitAudit(loadSnapshotCatalog());
  assert(audit.total === 2764, `A1 audit covers all published products (${audit.total})`);
  assert(audit.inspected === 2764, `A2 all products inspected (${audit.inspected})`);
  assert(audit.rebuilt === 2764, `A3 every benefit list rebuilt (${audit.rebuilt})`);
  assert(audit.decisions.approved === 2764, `A4 all rebuilt benefits approved (${audit.decisions.approved})`);
  assert(audit.decisions.reviewRequired === 0, `A5 zero reviews required (${audit.decisions.reviewRequired})`);
  assert(audit.decisions.rejected === 0, `A6 zero rejected (${audit.decisions.rejected})`);
  assert(audit.copied === 0, `A7 zero copied bullets (${audit.copied})`);
  assert(audit.mechanicalParaphrase === 0, `A8 zero mechanical paraphrases (${audit.mechanicalParaphrase})`);
  assert(audit.duplicates === 0, `A9 zero duplicate bullets (${audit.duplicates})`);
  assert(audit.unsupported === 0, `A10 zero unsupported claims (${audit.unsupported})`);
  assert(audit.inventedEffects === 0, `A11 zero invented effects (${audit.inventedEffects})`);
  assert(audit.sourceConflicts === 0, `A12 zero source conflicts (${audit.sourceConflicts})`);
  assert(audit.insufficientEvidence === 0, `A13 zero insufficient-evidence cases (${audit.insufficientEvidence})`);
  assert(audit.mismatches === 0, `A14 zero name/benefit mismatches (${audit.mismatches})`);
  assert(audit.originalityPasses === 2764, `A15 all originality checks pass (${audit.originalityPasses})`);
  assert(audit.originalityFailures === 0, `A16 no originality failures (${audit.originalityFailures})`);

  let minBullets = Infinity;
  let allHaveFunction = true;
  let allHaveEvidence = true;
  let noTemplate = true;
  for (const p of loadSnapshotCatalog()) {
    const d = selectProductBenefits(p);
    minBullets = Math.min(minBullets, d.reconstructedBenefits.ar.length);
    if (d.functionCount < 1) allHaveFunction = false;
    if (d.evidenceSummary.length !== d.benefitFacts.length) allHaveEvidence = false;
    for (const b of d.reconstructedBenefits.ar) {
      if (TEMPLATE_BULLETS.some((t) => normalizeCompare(t, b))) noTemplate = false;
    }
  }
  assert(minBullets >= 2, `A17 every product has ≥2 benefit bullets (min ${minBullets})`);
  assert(allHaveFunction, "A18 every product has ≥1 function benefit");
  assert(allHaveEvidence, "A19 every benefit carries evidence");
  assert(noTemplate, "A20 no rebuilt bullet reproduces a legacy template bullet");

  const examples = produceBenefitExamples(12, loadSnapshotCatalog());
  assert(examples.length >= 10, `A21 ≥10 real before/after examples (${examples.length})`);
  const examplesComplete = examples.every(
    (e) => e.productId && e.brand && e.productName.ar && e.originalBenefits.length >= 0 && e.luminousBenefits.length >= 2 && e.evidence.length >= 2 && e.originalityScore >= 0 && e.confidenceScore >= 0 && e.finalStatus
  );
  assert(examplesComplete, "A22 examples complete (id, brand, before, after, evidence, scores, status)");
  const examplesApproved = examples.every((e) => e.finalStatus === "APPROVED");
  assert(examplesApproved, "A23 every example approved");
  assert(examples.some((e) => e.effectBenefits.length > 0), "A24 examples include ingredient-effect classification");
}

function normalizeCompare(a: string, b: string): boolean {
  const strip = (s: string) => s.trim().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ");
  return strip(a) === strip(b);
}

console.log(`\n========== PART 7 RESULT: ${passed} passed, ${failed} failed ==========`);
if (failed > 0) {
  console.log("Failures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}