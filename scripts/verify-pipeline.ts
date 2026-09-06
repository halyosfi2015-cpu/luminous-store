/**
 * Part 2 — Deterministic Pipeline Verification Suite
 * Executes 18 deterministic tests against the real catalog + pipeline functions.
 * Run with: npx tsx scripts/verify-pipeline.ts
 */

import {
  resolveProductIdentity,
  determineSourceRank,
  generateLuminousName,
  selectBestProductImage,
  rebuildDescription,
  generateBenefits,
  rebuildUsage,
  validatePrice,
  runCatalogAudit,
  produceBeforeAfterExamples,
  produceImageSourceExamples,
  SOURCE_HIERARCHY,
} from "../src/lib/content-reconstruction";
import {
  resolveSourceConflict,
  verifyProductIdentity,
  detectSourceAgreement,
  FIELD_AUTHORITY_POLICY,
} from "../src/lib/source-hierarchy";
import { products, getProductBySlug } from "../src/data/products";
import { onlyPublished } from "../src/lib/publication";

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

const published = onlyPublished(products);
const knownProductIds = [
  "yq-754", "yq-960", "yq-1680", "yq-2374", "yq-1079", "yq-1",
  "yq-629", "yq-710", "yq-1051", "yq-129", "yq-460", "yq-1660",
];

function getProduct(id: string) {
  const p = getProductBySlug(id) ?? published.find((p) => p.id === id);
  if (!p) throw new Error(`Product ${id} not found`);
  return p;
}

// ---------------------------------------------------------------------------
console.log("PART 2 — DETERMINISTIC PIPELINE VERIFICATION (18 TESTS)");
console.log("Catalog: " + published.length + " published products");

// ---- TEST 1: Catalog integrity ----
section("T1 — Catalog Integrity");
assert(published.length >= 100, "Catalog has >= 100 published products", `got ${published.length}`);
assert(published.every((p) => p.id && p.slug && p.name && p.brand), "All products have id, slug, name, brand");

// ---- TEST 2: Identity resolution on real product ----
section("T2 — Identity Resolution");
{
  const p = getProduct("yq-754");
  const id = resolveProductIdentity(p);
  assert(typeof id.brand === "string" && id.brand.length > 0, "Identity extracts brand", `got "${id.brand}"`);
  assert(Array.isArray(id.ingredients), "Identity ingredients is array");
  assert(Array.isArray(id.skinConcerns), "Identity skinConcerns is array");
  assert(id.benefits.ar.length >= 0 && id.benefits.en.length >= 0, "Identity benefits object has ar/en");
}

// ---- TEST 3: Name generation (Luminous format, not Yaqoot-copy) ----
section("T3 — Luminous Name Generation");
{
  const p = getProduct("yq-754");
  const id = resolveProductIdentity(p);
  const name = generateLuminousName(id);
  assert(typeof name.ar === "string" && name.ar.length > 0, "Arabic name generated", name.ar);
  assert(typeof name.en === "string" && name.en.length > 0, "English name generated", name.en);
  const containsOriginal = name.ar === p.name.ar || name.en === p.name.en;
  assert(!containsOriginal, "Name differs from Yaqoot original name (originality)");
}

// ---- TEST 4: Source ranking ----
section("T4 — Source Hierarchy Ranking");
{
  const p = getProduct("yq-754");
  const rank = determineSourceRank(p);
  assert(typeof rank.rank === "number" && rank.rank >= 1 && rank.rank <= 8, "Source rank in valid range 1-8", `rank=${rank.rank}`);
  assert(SOURCE_HIERARCHY.length === 8, "SOURCE_HIERARCHY has 8 levels", `got ${SOURCE_HIERARCHY.length}`);
  assert(FIELD_AUTHORITY_POLICY.name.length > 0, "Field authority policy defined for name");
}

// ---- TEST 5: Source conflict resolution ----
section("T5 — Source Conflict Resolution");
{
  const r1 = resolveSourceConflict("name",
    { level: 1, key: "manufacturer", value: "CeraVe" },
    { level: 7, key: "yaqoot", value: "CeraVe 2" });
  assert(r1.winner === "manufacturer" && r1.status === "approved", "Lower rank (1) beats higher rank (7)");
  const r2 = resolveSourceConflict("name",
    { level: 3, key: "trustedRetailer", value: "X" },
    { level: 3, key: "beautyCenter", value: "Y" });
  assert(r2.status === "review_required", "Same-rank conflict requires review");
  const r3 = resolveSourceConflict("name",
    { level: 2, key: "distributor", value: "Z" },
    { level: 2, key: "beautyStoreArabic", value: "Z" });
  assert(r3.winner === "agreement" && r3.status === "approved", "Same-rank agreement approved");
}

// ---- TEST 6: Identity match verification ----
section("T6 — Product Identity Matching");
{
  const match = verifyProductIdentity(
    { brand: "CeraVe", name: "Hydrating Cleanser", category: "cleansers", size: "200ml", variant: "200ml", formulation: "gel", count: "1", spf: "SPF30" },
    { brand: "CeraVe", name: "Hydrating Cleanser", category: "cleansers", size: "200ml", variant: "200ml", formulation: "gel", count: "1", spf: "SPF30" });
  assert(match.matched === true, "Matching products verified", match.reason);
  const mismatch = verifyProductIdentity(
    { brand: "CeraVe", name: "Hydrating Cleanser", category: "cleansers", size: "200ml" },
    { brand: "La Roche-Posay", name: "Effaclar", category: "cleansers", size: "200ml" });
  assert(mismatch.matched === false, "Non-matching products rejected", mismatch.reason);
}

// ---- TEST 7: Source agreement ----
section("T7 — Source Agreement Detection");
{
  const agree = detectSourceAgreement("ingredients", [
    { level: 1, key: "manufacturer", value: "A" },
    { level: 2, key: "distributor", value: "A" },
  ]);
  assert(agree.agreed === true && agree.value === "A", "Two sources agreeing on value detected");
  const disagree = detectSourceAgreement("ingredients", [
    { level: 1, key: "manufacturer", value: "A" },
    { level: 2, key: "distributor", value: "B" },
  ]);
  assert(disagree.agreed === false, "Disagreement detected");
}

// ---- TEST 8: Image selection ----
section("T8 — Image Source Selection");
{
  const p = getProduct("yq-754");
  const gallery = p.gallery?.length ? p.gallery : ["/images/products/yq-754.png"];
  const img = selectBestProductImage(gallery, p, [
    { url: gallery[0], sourceKey: "yaqoot", variantMatch: true },
    { url: gallery[0], sourceKey: "manufacturer", variantMatch: true },
  ]);
  assert(img !== null, "Image selected", img ? `src=${img.src} srcKey=${img.sourceKey}` : "null");
  assert(img !== null && gallery.includes(img.src), "Selected image exists in gallery");
  assert(img !== null && img.sourceKey === "manufacturer", "Higher-authority source wins (manufacturer over yaqoot)");
}

// ---- TEST 9: Description rebuild (editorial, not Yaqoot-copy) ----
section("T9 — Description Rebuild");
{
  const p = getProduct("yq-754");
  const id = resolveProductIdentity(p);
  const desc = rebuildDescription(p, id);
  assert(typeof desc.ar === "string" && desc.ar.length > 10, "Arabic description regenerated", desc.ar.slice(0, 60));
  assert(typeof desc.en === "string" && desc.en.length > 10, "English description regenerated", desc.en.slice(0, 60));
  assert(desc.ar !== p.description.ar, "Arabic description differs from original (originality)");
  assert(desc.en !== p.description.en, "English description differs from original (originality)");
}

// ---- TEST 10: Benefits generation ----
section("T10 — Benefits Generation");
{
  const p = getProduct("yq-754");
  const id = resolveProductIdentity(p);
  const b = generateBenefits(id, p);
  assert(Array.isArray(b.ar) && b.ar.length > 0, "Arabic benefits generated", b.ar.join(" | "));
  assert(Array.isArray(b.en) && b.en.length > 0, "English benefits generated", b.en.join(" | "));
  assert(b.ar.length <= 4 && b.en.length <= 4, "Benefits limited to <= 4 items", `ar=${b.ar.length} en=${b.en.length}`);
  const allShort = [...b.ar, ...b.en].every((x) => x.length < 80);
  assert(allShort, "No unsupported long/claim-heavy benefits");
}

// ---- TEST 11: Usage rebuild ----
section("T11 — Usage Rebuild");
{
  const p = getProduct("yq-754");
  const id = resolveProductIdentity(p);
  const u = rebuildUsage(p, id);
  assert(typeof u.ar === "string" && u.ar.length > 0, "Arabic usage generated", u.ar.slice(0, 50));
  assert(typeof u.en === "string" && u.en.length > 0, "English usage generated", u.en.slice(0, 50));
}

// ---- TEST 12: Price validation (-200 YER rule) ----
section("T12 — Price Validation");
{
  const p = getProduct("yq-754");
  const price = validatePrice(p);
  assert(typeof price.luminousPrice === "number" && price.luminousPrice > 0, "Valid positive luminous price", `price=${price.luminousPrice}`);
  const pNoOrig = { ...p, pricing: { price: 1000, currency: "YER" } };
  const price2 = validatePrice(pNoOrig as never);
  assert(price2.validationStatus === "pass" && price2.luminousPrice === 1000, "No originalPrice uses current price as-is");
}

// ---- TEST 13: Before/after examples (10+) ----
section("T13 — Before/After Examples (>= 10)");
{
  const examples = produceBeforeAfterExamples();
  assert(examples.length >= 10, "At least 10 before/after examples", `got ${examples.length}`);
  const valid = examples.every((e) =>
    e.productId && e.oldName.ar && e.newName.ar && e.oldDescription.ar && e.newDescription.ar &&
    Array.isArray(e.oldBenefits.ar) && Array.isArray(e.newBenefits.ar) &&
    typeof e.oldImageSource === "string" && typeof e.newImageSource === "string" &&
    typeof e.oldPrice === "number" && typeof e.newLuminousPrice === "number" &&
    typeof e.validationStatus === "string");
  assert(valid, "All examples have complete before/after fields");
  const originality = examples.filter((e) => e.newName.ar !== e.oldName.ar || e.newDescription.ar !== e.oldDescription.ar).length;
  assert(originality >= examples.length, "Examples show reconstructed (non-identical) content", `${originality}/${examples.length}`);
}

// ---- TEST 14: Image source examples (5+) ----
section("T14 — Image Source Examples (>= 5)");
{
  const examples = produceImageSourceExamples();
  assert(examples.length >= 5, "At least 5 image source examples", `got ${examples.length}`);
  const valid = examples.every((e) =>
    e.productId && Array.isArray(e.candidateSources) && e.candidateSources.length > 0 &&
    typeof e.selectedSource === "string" && e.selectedSource.length > 0 &&
    typeof e.selectedImage === "string" && e.selectedImage.length > 0 &&
    typeof e.reason === "string" && e.reason.length > 0 &&
    typeof e.confidence === "number" && e.confidence >= 0 && e.confidence <= 100);
  assert(valid, "All image examples have candidates + selected + reason + confidence");
  const ranked = examples.every((e) => e.candidateSources.every((c) => c.rank >= 1 && c.rank <= 8));
  assert(ranked, "All image examples have valid source ranks (1-8)");
}

// ---- TEST 15: Catalog audit executes ----
section("T15 — Catalog Audit Executes");
{
  const audit = runCatalogAudit();
  assert(typeof audit.products.total === "number" && audit.products.total === published.length,
    "Audit total matches published count", `total=${audit.products.total} published=${audit.products.published}`);
  assert(typeof audit.images.inspected === "number" && audit.images.inspected > 0, "Audit inspected images", `inspected=${audit.images.inspected}`);
  const counts = [
    audit.products.total, audit.names.regenerated, audit.names.approved, audit.names.reviewRequired,
    audit.images.inspected, audit.images.retained, audit.images.replaced,
    audit.descriptions.regenerated, audit.descriptions.approved,
    audit.benefits.regenerated, audit.benefits.approved,
    audit.usage.regenerated, audit.usage.approved,
    audit.price.followingMinus200YERRule, audit.price.inconsistent,
    audit.identityConsistency.fullyConsistent, audit.identityConsistency.mismatches,
  ];
  assert(counts.every((n) => n >= 0), "All audit metrics are non-negative");
}

// ---- TEST 16: Pipeline runs across ALL published products without throwing ----
section("T16 — Full Pipeline Stability (all products)");
{
  let threw = 0;
  let firstError = "";
  for (const p of published) {
    try {
      const id = resolveProductIdentity(p);
      generateLuminousName(id);
      rebuildDescription(p, id);
      generateBenefits(id, p);
      rebuildUsage(p, id);
      validatePrice(p);
    } catch (e) {
      threw++;
      if (!firstError) firstError = String(e);
    }
  }
  assert(threw === 0, "Pipeline executes on all published products without exceptions", threw ? `${threw} threw: ${firstError}` : "");
}

// ---- TEST 17: Originality — no product keeps Yaqoot name/description verbatim ----
section("T17 — Originality Against Yaqoot Copy");
{
  const examples = produceBeforeAfterExamples();
  const nameCopies = examples.filter((e) => e.newName.ar === e.oldName.ar).length;
  const descCopies = examples.filter((e) => e.newDescription.ar === e.oldDescription.ar).length;
  assert(nameCopies === 0, "No reconstructed name is a verbatim copy", `${nameCopies} copies`);
  assert(descCopies === 0, "No reconstructed description is a verbatim copy", `${descCopies} copies`);
}

// ---- TEST 18: Consistency — identity fields agree between name and description ----
section("T18 — Identity Consistency");
{
  const p = getProduct("yq-754");
  const id = resolveProductIdentity(p);
  const name = generateLuminousName(id);
  const desc = rebuildDescription(p, id);
  const brandPresentInName = name.ar.toLowerCase().includes(id.brand.toLowerCase());
  const brandPresentInDesc = desc.ar.toLowerCase().includes(id.brand.toLowerCase());
  assert(brandPresentInName, "Brand present in generated name", id.brand);
  assert(brandPresentInDesc, "Brand present in regenerated description", id.brand);
  assert(p.name.ar !== name.ar, "Name is not a copy of original");
}

// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(60));
console.log(`RESULT: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log("\nFAILURES:");
  failures.forEach((f) => console.log(`  - ${f}`));
}
console.log("=".repeat(60));
process.exit(failed > 0 ? 1 : 0);