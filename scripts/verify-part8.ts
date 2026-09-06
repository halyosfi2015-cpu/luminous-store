/**
 * PART 8 — Deterministic Usage-Instruction Verification Suite
 * Executes the directive test cases against the canonical usage pipeline.
 * Run with: npx tsx scripts/verify-part8.ts
 */

import {
  extractUsageFacts,
  generateUsage,
  selectProductUsage,
  runUsageAudit,
  produceUsageExamples,
  validateUsageOriginality,
  validateUsageUnsupported,
  validateUsageConsistency,
  detectMaterialUsageConflict,
  type UsageFacts,
} from "../src/lib/product-usage";
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
    id: "usage-test-1",
    slug: "usage-test-1",
    sku: "USAGE-TEST-1",
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

// The canonical source-style instructions that legacy Yaqoot usage was rebuilt from.
const YAQOOT_USAGE =
  "ضعي كمية مناسبة على الوجه بحركات دائرية صباحاً ومساءً ثم دلكي حتى الامتصاص الكامل.";

section("T1 — Verified usage facts present → APPROVED end-to-end");
{
  const p = makeProduct({
    usageInstructions: { ar: YAQOOT_USAGE, en: "" },
  });
  const d = selectProductUsage(p);
  assert(d.status === "APPROVED", "T1 correct product → APPROVED", d.status);
  assert(d.reconstructedUsage.arSteps.length >= 2, "T1 rebuilt multi-step usage", String(d.reconstructedUsage.arSteps.length));
  assert(!!d.verifiedFacts.applyArea || !!d.verifiedFacts.amount, "T1 real facts extracted (area/amount)");
  assert(d.consistencyStatus === "PASS", "T1 consistency PASS", d.consistencyStatus);
  assert(!d.reconstructedUsage.arParagraph.includes("ضعيي"), "T1 no doubled ي ('ضعيي')", d.reconstructedUsage.arParagraph);
  assert(d.reconstructedUsage.enParagraph.trim().length > 0, "T1 EN mirror non-empty");
}

section("T2 — Verbatim copy of the source usage → REJECTED");
{
  const p = makeProduct({ usageInstructions: { ar: YAQOOT_USAGE, en: "" } });
  const facts = extractUsageFacts(p);
  const r = validateUsageOriginality(YAQOOT_USAGE, YAQOOT_USAGE, facts);
  assert(r.status === "REJECTED", "T2 verbatim copy → REJECTED", r.status);
  assert(r.score === 0, "T2 zero originality score", String(r.score));
  assert(r.editorialSimilarity === 1, "T2 full similarity", String(r.editorialSimilarity));
}

section("T3 — Mechanical-translation marker wording → never PASSES");
{
  // Editorial-laden legacy source: the rebuilt text that copies it is mechanical.
  const source =
    "استمتعي بلمسة فاخرة من العناية الملكية. ضعي كمية وفيرة على وجهك النقي المضيء يومياً ثم دلكي بلطف.";
  const p = makeProduct({ usageInstructions: { ar: source, en: "" } });
  const facts = extractUsageFacts(p);
  const mechanical =
    "منتج عناية من Luminous بتشكيلة المرطبات. استمتعي بلمسة فاخرة من العناية الملكية. ضعي كمية وفيرة على وجهك النقي المضيء يومياً ثم دلكي بلطف.";
  const r = validateUsageOriginality(mechanical, source, facts);
  assert(["REJECTED", "REVIEW_REQUIRED"].includes(r.status), "T3 mechanical translation never PASSES", r.status);
  assert(r.editorialSimilarity >= 0.4, "T3 high overlap detected", String(r.editorialSimilarity));
}

section("T4 — Invented application amount → unsupported");
{
  const p = makeProduct({ usageInstructions: { ar: YAQOOT_USAGE, en: "" } });
  const facts = extractUsageFacts(p);
  const r = validateUsageUnsupported("ضعي طبقة رقيقة على الوجه مساءً", facts);
  assert(r.valid === false, "T4 invented amount rejected", r.issues.join(" | "));
  assert(r.issues.some((i) => i.includes("amount")), "T4 reason class is amount");
}

section("T5 — Invented frequency → unsupported");
{
  const p = makeProduct({ usageInstructions: { ar: YAQOOT_USAGE, en: "" } });
  const facts = extractUsageFacts(p);
  const r = validateUsageUnsupported("ضعي على الوجه مرتين إلى ثلاث مرات أسبوعياً", facts);
  assert(r.valid === false, "T5 invented frequency rejected", r.issues.join(" | "));
  assert(r.issues.some((i) => i.includes("frequency")), "T5 reason class is frequency");
}

section("T6 — Invented waiting time → unsupported");
{
  const p = makeProduct({ usageInstructions: { ar: "يوضع على البشرة النظيفة.", en: "" } });
  const facts = extractUsageFacts(p);
  const r = validateUsageUnsupported("ضعي على الوجه اتركيه حتى يجف", facts);
  assert(r.valid === false, "T6 invented waiting time rejected", r.issues.join(" | "));
  assert(r.issues.some((i) => i.includes("waiting")), "T6 reason class is waiting time");
}

section("T7 — Invented reapplication → unsupported");
{
  const p = makeProduct({ usageInstructions: { ar: YAQOOT_USAGE, en: "" } });
  const facts = extractUsageFacts(p);
  const r = validateUsageUnsupported("ضعي على الوجه ثم كرري عند الحاجة", facts);
  assert(r.valid === false, "T7 invented reapplication rejected", r.issues.join(" | "));
  assert(r.issues.some((i) => i.includes("reapplication")), "T7 reason class is reapplication");
}

section("T8 — Rinse declared vs verified leave-on → contradiction");
{
  const p = makeProduct({
    usageInstructions: { ar: "يوضع على البشرة لا يشطف ويترك على البشرة ليلاً.", en: "" },
  });
  const facts = extractUsageFacts(p);
  assert(facts.rinse === "leave-on", "T8 verified leave-on extracted", facts.rinse ?? "none");
  const r = validateUsageUnsupported("ضعي على البشرة اشطفي بالماء جيداً", facts);
  assert(r.valid === false, "T8 rinse/flip contradiction detected", r.issues.join(" | "));
  assert(r.issues.some((i) => i.includes("leave-on")), "T8 contradiction names leave-on");
}

section("T9 — Wrong size/variant declaration → consistency FAIL");
{
  const p = makeProduct({
    name: { ar: "كريم مرطب للوجه 50 مل", en: "CeraVe Cream 50 ml" },
    usageInstructions: { ar: "ضعي المنتج بحجم 200 مل على الوجه مساءً.", en: "" },
  });
  const facts = extractUsageFacts(p);
  const r = validateUsageConsistency("ضعي المنتج بحجم 200 مل على الوجه مساءً", facts);
  assert(r.status === "FAIL", "T9 wrong size → FAIL", r.status);
  assert(r.mismatches.some((m) => m.includes("size")), "T9 reason mentions size", r.mismatches.join(" | "));
}

section("T10 — Usage area contradicts product family → REJECTED");
{
  const p = makeProduct({
    categorySlug: "moisturizers",
    name: { ar: "كريم مرطب للوجه 50 مل", en: "CeraVe Cream 50 ml" },
    usageInstructions: { ar: "يوضع على الشعر لمدة 30 دقيقة ثم يغسل.", en: "" },
  });
  const d = selectProductUsage(p);
  assert(d.status === "REJECTED", "T10 wrong-family usage → REJECTED", d.status);
  assert(d.reviewReasons.some((r) => r.includes("identity")), "T10 reason is identity mismatch", d.reviewReasons.join(" | "));
}

section("T11 — Missing usage facts → REVIEW_REQUIRED, no invention");
{
  const p = makeProduct({
    usageInstructions: { ar: "ملاحظة تسويقية لا تتضمن أي تعليمات استخدام واضحة.", en: "" },
  });
  const d = selectProductUsage(p);
  assert(d.status === "REVIEW_REQUIRED", "T11 missing facts → REVIEW_REQUIRED", d.status);
  assert(d.reviewReasons.some((r) => r.includes("missing usage facts")), "T11 reason mentions missing facts", d.reviewReasons.join(" | "));
  assert(d.reconstructedUsage.arParagraph.includes("اتبعي التعليمات"), "T11 generic packaged-instructions fallback", d.reconstructedUsage.arParagraph);
}

section("T12 — Ingestible capsule → 'تناولي' not 'ضعي'");
{
  const p = makeProduct({
    name: { ar: "أوميغا 3 كبسولات 60 كبسولة", en: "Omega-3 Capsules 60" },
    categorySlug: "vitamins",
    usageInstructions: { ar: "تناول كبسولة واحدة مرتين يومياً مع الوجبات.", en: "" },
  });
  const d = selectProductUsage(p);
  assert(d.status === "APPROVED", "T12 ingestible → APPROVED", d.status);
  assert(d.reconstructedUsage.arParagraph.includes("تناولي"), "T12 generation uses تناولي", d.reconstructedUsage.arParagraph);
  assert(!d.reconstructedUsage.arParagraph.includes("على البشرة"), "T12 never emits topical 'على البشرة'", d.reconstructedUsage.arParagraph);
}

section("T13 — Material source conflict → REVIEW_REQUIRED");
{
  const p = makeProduct({
    usageInstructions: { ar: "ضعي على الوجه صباحاً ومساءً.", en: "" },
  });
  const conflict = detectMaterialUsageConflict(["ضعي على الوجه صباحاً.", "تناولي قرصاً واحداً يومياً."]);
  assert(conflict !== null, "T13 material conflict detected", conflict ?? "none");
  const d = selectProductUsage(p, [
    { provider: "manufacturer", rank: 1, usage: "ضعي على الوجه صباحاً." },
    { provider: "yaqoot", rank: 7, usage: "تناولي قرصاً واحداً يومياً." },
  ]);
  assert(d.status === "REVIEW_REQUIRED", "T13 source conflict → REVIEW_REQUIRED", d.status);
  assert(d.reviewReasons.some((r) => r.includes("source conflict")), "T13 reason mentions source conflict", d.reviewReasons.join(" | "));
}

section("T14 — Old product (real catalog) → deterministic decision");
{
  const p = loadSnapshotCatalog().find((x) => x.id === "yq-729");
  assert(!!p, "T14 old product yq-729 exists");
  if (p) {
    const d1 = selectProductUsage(p);
    const d2 = selectProductUsage(p);
    assert(JSON.stringify(d1) === JSON.stringify(d2), "T14 deterministic decision");
    assert(d1.status !== "REJECTED", "T14 old product not rejected", d1.status);
    assert(d1.reconstructedUsage.arSteps.length >= 1, "T14 rebuilt usage non-trivial");
    assert(!d1.reconstructedUsage.arParagraph.includes("يترك على شعر مبلل"), "T14 hair mask wording fully rebuilt");
  }
}

section("T15 — Newly enriched product (real catalog) → deterministic + changed");
{
  const p = loadSnapshotCatalog().find((x) => x.id === "yq-19");
  assert(!!p, "T15 mouthwash yq-19 exists");
  if (p) {
    const d1 = selectProductUsage(p);
    const d2 = selectProductUsage(p);
    assert(JSON.stringify(d1) === JSON.stringify(d2), "T15 deterministic decision");
    assert(d1.status !== "REJECTED", "T15 mouthwash not rejected", d1.status);
    assert(d1.reconstructedUsage.arParagraph !== (p.usageInstructions?.ar ?? "").trim(), "T15 rebuilt differs from original");
  }
}

section("T16 — No-facts real product → honest REVIEW + generic fallback");
{
  const p = loadSnapshotCatalog().find((x) => x.id === "yq-435");
  assert(!!p, "T16 hair-dryer yq-435 exists");
  if (p) {
    const d = selectProductUsage(p);
    assert(d.status === "REVIEW_REQUIRED", "T16 no-facts tool → REVIEW_REQUIRED", d.status);
    assert(d.reconstructedUsage.arParagraph.includes("اتبعي التعليمات"), "T16 generic fallback used (no invention)", d.reconstructedUsage.arParagraph);
  }
}

section("Part 8 real-catalog audit (dry-run, against the pre-apply snapshot so decisions are not circular)");
{
  const audit = runUsageAudit(loadSnapshotCatalog());
  assert(audit.products.total === 2764, `A1 audit covers all published products (${audit.products.total})`);
  assert(audit.products.usagePresent === 2764, `A2 all products have usage present (${audit.products.usagePresent})`);
  assert(audit.products.usageRegenerated === 2764, `A3 every usage rebuilt (${audit.products.usageRegenerated})`);
  assert(audit.products.usageUnchanged === 0, `A4 zero usage left unchanged (${audit.products.usageUnchanged})`);
  assert(audit.usageValidation.validated === 2764, `A5 all products validated (${audit.usageValidation.validated})`);
  assert(audit.usageValidation.unsupportedDetected === 0, `A6 zero unsupported/invented instructions (${audit.usageValidation.unsupportedDetected})`);
  assert(audit.usageValidation.unsupportedRemoved === 0, `A7 zero removals needed (${audit.usageValidation.unsupportedRemoved})`);
  assert(audit.usageValidation.originalityFailures === 0, `A8 zero originality failures (${audit.usageValidation.originalityFailures})`);
  assert(audit.usageValidation.identityMismatches === 0, `A9 zero identity mismatches (yq-70 resolved) (${audit.usageValidation.identityMismatches})`);
  assert(audit.decisions.rejected === 0, `A10 zero rejected (${audit.decisions.rejected})`);
  assert(audit.decisions.approved === 2515, `A11 approved count (${audit.decisions.approved})`);
  assert(audit.decisions.reviewRequired === 249, `A12 honest no-facts review count (${audit.decisions.reviewRequired})`);
  assert(audit.sourceValidation.withSourceConflicts === 0, `A13 zero real source conflicts (${audit.sourceValidation.withSourceConflicts})`);
  assert(audit.sourceDistribution.yaqoot === 2764, `A14 provenance = Yaqoot rank 7 for all (${audit.sourceDistribution.yaqoot})`);

  // No invented instruction anywhere in the rebuilt content.
  let invented = 0;
  for (const p of loadSnapshotCatalog()) {
    const d = selectProductUsage(p);
    if (d.status === "APPROVED" && d.reconstructedUsage.arParagraph.includes("ضعيي")) invented++;
  }
  assert(invented === 0, "A15 zero doubled-y ('ضعيي') artifacts");

  const examples = produceUsageExamples(12, loadSnapshotCatalog());
  assert(examples.length >= 10, `A16 ≥10 real before/after examples (${examples.length})`);
  const examplesComplete = examples.every(
    (e) =>
      e.productId && e.brand && e.productName.ar && e.oldUsage.trim().length > 0 &&
      e.newUsage.arSteps.length >= 1 && e.newUsage.enParagraph.trim().length > 0 &&
      e.verifiedUsageFacts.length >= 1 && e.sourceUsed && e.finalStatus
  );
  assert(examplesComplete, "A17 examples complete (id, brand, before, after, facts, source, status)");
  const examplesApproved = examples.every((e) => e.finalStatus === "APPROVED");
  assert(examplesApproved, "A18 every selected example approved");
}

console.log(`\n========== PART 8 RESULT: ${passed} passed, ${failed} failed ==========`);
if (failed > 0) {
  console.log("Failures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}