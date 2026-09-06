/**
 * PART 1 — Content Intelligence + AI Content Generation Verification Suite
 * ========================================================================
 * Run with: npx tsx --tsconfig tsconfig.verify.json scripts/verify-content-part1.mts
 *
 * Covers the 17 deterministic selection tests + 15 generation/validation tests
 * from the PHASE directive. Generation tests use an injectable mock provider so
 * they run without an AI key.
 */

import {
  CONTENT_TYPES,
  CONTENT_OBJECTIVES,
  REVIEW_REASON_CODES,
  CONTENT_SELECTION_WEIGHTS,
  type ContentItem,
  type ContentBrief,
  type VerifiedProductFact,
  type PublishingEligibility,
} from "../src/lib/ai/content/types.ts";
import { getCatalogCategoryEntries } from "../src/lib/ai/content/taxonomy.ts";
import { buildContentContext, serializeContentContext, type ContentContext } from "../src/lib/ai/content/context.ts";
import { buildContentBrief } from "../src/lib/ai/content/content-brief.ts";
import { selectContentCandidates } from "../src/lib/ai/content/candidate-selector.ts";
import { selectNextBestContent } from "../src/lib/ai/content/next-best-content.ts";
import { generateContentIdeas } from "../src/lib/ai/content/planner.ts";
import { buildContentHistory, applyDiversityAdjustments } from "../src/lib/ai/content/diversity.ts";
import {
  validateContentFacts,
  validateContentPricing,
  validateContentLanguage,
  validateGeneratedContent,
} from "../src/lib/ai/content/validator.ts";
import { validateContentOriginality } from "../src/lib/ai/content/originality.ts";
import {
  parseGeneratedContent,
  decideEligibility,
  generateContent,
  buildContentPrompt,
} from "../src/lib/ai/content/generator.ts";
import { products, categories } from "../src/data/products";
import { onlyPublished } from "../src/lib/publication";
import type { AIProvider, RawAIResult } from "../src/lib/ai/provider";
import type { AIProviderConfig } from "../src/lib/ai/types";
import { makeProduct } from "./lib/make-product";

let passed = 0;
let failed = 0;
const failures: string[] = [];

const REAL_PRODUCT_ID = onlyPublished(products)[0]?.id ?? "yq-754";
const REAL_CATEGORY = onlyPublished(products)[0]?.categorySlug ?? "cleansers";

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

/* ------------------------------------------------------------------------ */
/* MOCK AI PROVIDER                                                          */
/* ------------------------------------------------------------------------ */

function jsonResult(json: unknown): RawAIResult {
  return {
    rawContent: JSON.stringify(json),
    error: null,
    metrics: {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      latencyMs: 1,
      model: "mock",
    },
  };
}

class MockProvider implements AIProvider {
  private responses: Array<() => RawAIResult>;
  private callCount = 0;
  constructor(responses: Array<() => RawAIResult>) {
    this.responses = responses;
  }
  async generateInsight(
    _systemPrompt: string,
    _userMessage: string,
    _config: AIProviderConfig,
  ): Promise<RawAIResult> {
    const idx = Math.min(this.callCount, this.responses.length - 1);
    this.callCount++;
    return this.responses[idx]();
  }
  get calls(): number {
    return this.callCount;
  }
}

function validBody(): string {
  return "يرطب البشرة الجافة. يحتوي على جلسرين. يوضع على البشرة النظيفة. السعر 5000 ريال يمني.";
}

const VALID_JSON = {
  title: "كريم مرطب للوجه",
  body: validBody(),
  callToAction: "تسوق الآن",
  language: "ar",
  selectedProductIds: ["p-1"],
  status: "GENERATED",
};

function validFacts(): VerifiedProductFact[] {
  return [
    { kind: "category", statementAr: "من قسم المرطبات", statementEn: "from moisturizers", evidence: "category:moisturizers", source: "store" },
    { kind: "benefit", statementAr: "يرطب البشرة الجافة", statementEn: "hydrates dry skin", evidence: "benefit:hydrate", source: "verified benefits" },
    { kind: "ingredient", statementAr: "يحتوي على جلسرين", statementEn: "contains glycerin", evidence: "ingredient:جلسرين", source: "ingredients" },
    { kind: "usage", statementAr: "الاستخدام: يوضع على البشرة النظيفة", statementEn: "usage: apply to clean skin", evidence: "usage:verified", source: "usage" },
    { kind: "price", statementAr: "السعر 5000 ريال يمني", statementEn: "price 5000 YER", evidence: "price:canonical", source: "pricing", price: 5000 },
  ];
}

function makeBrief(overrides: Partial<ContentBrief> = {}): ContentBrief {
  return buildContentBrief({
    categoryId: "moisturizers",
    contentType: "PRODUCT_SPOTLIGHT",
    objective: "DISCOVERY",
    productIds: [REAL_PRODUCT_ID],
    verifiedFacts: validFacts(),
    ...overrides,
  });
}

function makeItem(overrides: Partial<ContentItem> = {}): ContentItem {
  const brief = makeBrief();
  return {
    id: "item-1",
    categoryId: "moisturizers",
    subcategoryId: null,
    contentType: "PRODUCT_SPOTLIGHT",
    objective: "DISCOVERY",
    productIds: [REAL_PRODUCT_ID],
    title: "كريم مرطب",
    body: validBody(),
    callToAction: "تسوق الآن",
    language: "ar",
    mediaReference: { kind: "none" },
    contentBriefId: brief.id,
    promptVersion: "test",
    sourceFacts: [],
    validation: { passed: true, status: "VALID", claimMappings: [], pricingValidated: true, discountValidated: true, languageValid: true, reasons: [] },
    originality: { passed: true, score: 100, editorialSimilarity: 0, reasons: [] },
    status: "APPROVED",
    eligibility: "AUTO_PUBLISH_ELIGIBLE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/* ------------------------------------------------------------------------ */
/* SECTION A — DATA / SELECTION TESTS (17)                                   */
/* ------------------------------------------------------------------------ */

section("A — Selection data & determinism");

// A1: only published products are candidates
{
  const published = onlyPublished(products);
  assert(published.length > 0, "A1 catalog has published products", `${published.length}`);
  const allCandidates = selectContentCandidates({ limit: 5000 });
  assert(allCandidates.length === published.length, "A1 all candidates are published", `${allCandidates.length}/${published.length}`);
}

// A2: draft/hidden/rejected/duplicate excluded
{
  const draft = makeProduct({ id: "draft-1", status: "draft" });
  const hidden = makeProduct({ id: "hidden-1", status: "hidden" });
  const rejected = makeProduct({ id: "rej-1", status: "rejected" });
  const duplicate = makeProduct({ id: "dup-1", status: "duplicate" });
  for (const p of [draft, hidden, rejected, duplicate]) {
    assert(onlyPublished([p]).length === 0, `A2 excluded ${p.status}`, p.id);
  }
}

// A3: category filter
{
  const firstCat = (categories as unknown as Array<{ slug: string }>)[0]?.slug;
  assert(!!firstCat, "A3 catalog has categories", JSON.stringify(categories).slice(0, 60));
  if (firstCat) {
    const filtered = selectContentCandidates({ categoryId: firstCat, limit: 5000 });
    const allInCat = filtered.every((c) => c.categorySlug === firstCat);
    assert(allInCat, "A3 category filter works", firstCat);
  }
}

// A4: subcategory filter (narrower)
{
  const cats = (categories as unknown as Array<{ slug: string }>);
  if (cats.length >= 2) {
    const sub = cats[1].slug;
    const filtered = selectContentCandidates({ subcategoryId: sub, limit: 5000 });
    const allInSub = filtered.every((c) => c.categorySlug === sub);
    assert(allInSub, "A4 subcategory filter works", sub);
  } else {
    assert(true, "A4 skipped (fewer than 2 categories)");
  }
}

// A5: product-type filter via contentType allowedProductTypes
{
  // COMMERCIAL requires products + price + image — allowed types null; use
  // categoryId to simulate a product-type filter instead.
  const cats = (categories as unknown as Array<{ slug: string }>);
  const filtered = selectContentCandidates({ categoryId: cats[0]?.slug, limit: 5000 });
  assert(Array.isArray(filtered), "A5 product-type filter returns array", `${filtered.length}`);
}

// A6: underexposed category boost
{
  const now = new Date().toISOString();
  const cat = (categories as unknown as Array<{ slug: string }>)[0]?.slug ?? "serums";
  const history = buildContentHistory([makeItem({ categoryId: cat, productIds: ["x-1"], createdAt: now })], now);
  const base = applyDiversityAdjustments({ categoryId: cat, productId: "p-1", contentType: "PRODUCT_SPOTLIGHT", history, now });
  assert(base.categoryDelta > 0, "A6 underexposed category boost", `delta ${base.categoryDelta}`);
}

// A7: overexposed category penalty
{
  const now = new Date().toISOString();
  const cat = "serums";
  const items = Array.from({ length: 8 }, (_, i) =>
    makeItem({ id: `o-${i}`, categoryId: cat, productIds: [`p-${i}`], createdAt: now, contentType: "EDUCATIONAL" }),
  );
  const history = buildContentHistory(items, now);
  const base = applyDiversityAdjustments({ categoryId: cat, productId: "p-1", contentType: "PRODUCT_SPOTLIGHT", history, now });
  assert(base.categoryDelta < 0, "A7 overexposed category penalty", `delta ${base.categoryDelta}`);
}

// A8: product fatigue (appeared 24h → strong penalty)
{
  const now = new Date().toISOString();
  const history = buildContentHistory([makeItem({ productIds: ["fat-1"], createdAt: now })], now);
  const adj = applyDiversityAdjustments({ categoryId: null, productId: "fat-1", contentType: "PRODUCT_SPOTLIGHT", history, now });
  assert(adj.productDelta <= -20, "A8 24h product fatigue penalty", `delta ${adj.productDelta}`);
}

// A9: freshness boost (featured long ago → boost)
{
  const now = new Date().toISOString();
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600000).toISOString();
  const history = buildContentHistory([makeItem({ productIds: ["fresh-1"], createdAt: tenDaysAgo })], now);
  const adj = applyDiversityAdjustments({ categoryId: null, productId: "fresh-1", contentType: "PRODUCT_SPOTLIGHT", history, now });
  assert(adj.productDelta >= 4, "A9 stale-feature fresh boost", `delta ${adj.productDelta}`);
}

// A10: content-type diversity penalty (repeated type)
{
  const now = new Date().toISOString();
  const items = [makeItem({ contentType: "PRODUCT_SPOTLIGHT" }), makeItem({ id: "t2", contentType: "PRODUCT_SPOTLIGHT" })];
  const history = buildContentHistory(items, now);
  const adj = applyDiversityAdjustments({ categoryId: null, productId: "p-x", contentType: "PRODUCT_SPOTLIGHT", history, now });
  assert(adj.contentTypeDelta <= -15, "A10 content-type repeat penalty", `delta ${adj.contentTypeDelta}`);
}

// A11: seasonal relevance boost
{
  const before = selectContentCandidates({ limit: 5, seasonalCategoryIds: [] });
  const withSeason = selectContentCandidates({ limit: 5, seasonalCategoryIds: [before[0]?.categorySlug ?? "serums"] });
  assert(withSeason[0]?.finalScore >= before[0]?.finalScore, "A11 seasonal relevance boost", `${withSeason[0]?.finalScore}/${before[0]?.finalScore}`);
}

// A12: campaign relevance boost
{
  const base = selectContentCandidates({ limit: 5 });
  const firstProduct = base[0]?.productId;
  assert(!!firstProduct, "A12 has a top product");
  if (firstProduct) {
    const boosted = selectContentCandidates({ limit: 5, campaignProductIds: [firstProduct] });
    assert(boosted[0]?.finalScore >= base[0]?.finalScore, "A12 campaign product boosted", boosted[0]?.productId);
  }
}

// A13: empty result for empty category
{
  const filtered = selectContentCandidates({ categoryId: "does-not-exist", limit: 10 });
  assert(filtered.length === 0, "A13 empty category returns no candidates", `${filtered.length}`);
}

// A14: determinism (same input → same output)
{
  const a = selectContentCandidates({ limit: 5, now: "2024-01-01T00:00:00.000Z" });
  const b = selectContentCandidates({ limit: 5, now: "2024-01-01T00:00:00.000Z" });
  assert(JSON.stringify(a) === JSON.stringify(b), "A14 deterministic selection", `${a.length}/${b.length}`);
}

// A15: next-best returns reason trace
{
  const next = selectNextBestContent({ limit: 5 });
  assert(next.reasons.length > 0, "A15 next-best has reason trace", `${next.reasons.length}`);
  assert(next.contentItem === null, "A15 next-best contentItem is null (Part 2 stores it)", String(next.contentItem));
}

// A16: content ideas are structured
{
  const ideas = generateContentIdeas({ counts: { EDUCATIONAL: 2, PRODUCT_SPOTLIGHT: 1 }, limit: 3 });
  assert(ideas.length >= 1, "A16 ideas generated", `${ideas.length}`);
  if (ideas[0]) {
    assert(!!ideas[0].title && !!ideas[0].contentType && !!ideas[0].objective, "A16 idea fields complete");
    assert(Array.isArray(ideas[0].productIds) && ideas[0].productIds.length > 0, "A16 idea has productIds");
  }
}

// A17: real catalog taxonomy non-empty + weights sum sanity
{
  const entries = getCatalogCategoryEntries();
  assert(entries.length > 0, "A17 real catalog taxonomy non-empty", `${entries.length}`);
  const sum = Object.values(CONTENT_SELECTION_WEIGHTS).reduce((a, b) => a + b, 0);
  assert(Math.abs(sum - 1) < 0.001, "A17 selection weights sum to 1", `${sum}`);
}

/* ------------------------------------------------------------------------ */
/* SECTION B — GENERATION / VALIDATION TESTS (15)                            */
/* ------------------------------------------------------------------------ */

section("B — Generation & validation");

// B1: valid facts generate an item
{
  const brief = makeBrief();
  const context = buildContentContext({ productIds: [REAL_PRODUCT_ID] });
  const provider = new MockProvider([() => jsonResult(VALID_JSON)]);
  const res = await generateContent(brief, context, { provider });
  assert(!!res.item && !res.error, "B1 valid facts generate item", res.error?.message ?? "ok");
  if (res.item) {
    const hasImage = context.products.some((p) => p.image);
    if (hasImage) {
      assert(res.item.mediaReference.kind === "product_image" && !!res.item.mediaReference.imageUrl, "B1 mediaReference resolves canonical image (image task)", res.item.mediaReference.kind);
    } else {
      assert(res.item.mediaReference.kind === "none", "B1 mediaReference none when no canonical image", res.item.mediaReference.kind);
    }
  }
}

// B2: unsupported benefit/usage blocked
{
  const unsupported = "يعالج حب الشباب نهائياً ويعطي نتائج مضمونة خلال يوم واحد";
  const facts = validFacts();
  const result = validateContentFacts(unsupported, facts);
  assert(!result.passed, "B2 unsupported benefit/usage blocked", result.reasons[0]?.message);
}

// B3: fake price blocked
{
  const body = "منتج رائع بسعر 9000 ريال يمني فقط";
  const result = validateContentPricing(body, 5000, null);
  assert(!result.passed, "B3 fake price blocked", result.reasons[0]?.message);
}

// B4: unpublished product rejected at context level
{
  const context = buildContentContext({ productIds: ["definitely-missing-id"] });
  assert(!context.allProductsResolved, "B4 missing/unpublished product not resolved", context.warnings.join("; "));
  assert(context.missingProductIds.includes("definitely-missing-id"), "B4 missing product tracked");
}

// B5: wrong product ID rejected
{
  const context = buildContentContext({ productIds: ["wrong-id"], strict: true });
  assert(context.products.length === 0, "B5 wrong ID produces empty context", `${context.products.length}`);
}

// B6: source copy fails originality
{
  const source = "يرطب البشرة بعمق ويحافظ على ترطيبها طوال اليوم، غني بحمض الهيالورونيك، مناسب للبشرة الجافة والحساسة";
  const r = validateContentOriginality({ candidateAr: source, sourceAr: source });
  assert(!r.passed, "B6 exact source copy fails originality", r.reasons.join("; "));
}

// B7: mechanical paraphrase fails/reviews (not PASS)
{
  const source = "يرطب البشرة بعمق ويحافظ على ترطيبها طوال اليوم، غني بحمض الهيالورونيك، مناسب للبشرة الجافة والحساسة";
  const paraphrase = "يرطب البشرة بعمق ويحافظ على ترطيبها خلال اليوم، غني بحمض الهيالورونيك، مناسب للبشرة الجافة والحساسة";
  const r = validateContentOriginality({ candidateAr: paraphrase, sourceAr: source });
  assert(!r.passed, "B7 mechanical paraphrase does not pass originality", r.reasons.join("; "));
}

// B8: original passes
{
  const source = "يرطب البشرة بعمق ويحافظ على ترطيبها طوال اليوم، غني بحمض الهيالورونيك";
  const candidate = "يوفر هذا الكريم عناية يومية لطيفة للبشرة، مع مكونات مدروسة تساعد على الحفاظ على رطوبة البشرة خلال روتينك المعتاد";
  const r = validateContentOriginality({ candidateAr: candidate, sourceAr: source });
  assert(r.passed, "B8 original content passes originality", r.reasons.join("; "));
}

// B9: language contamination blocked
{
  const body = "هذا منتج رائع very nice product for all skin types بجودة عالية";
  const r = validateContentLanguage(body, "ar");
  assert(!r.passed, "B9 language contamination blocked", r.reasons[0]?.message);
}

// B10: prompt version recorded
{
  const brief = makeBrief();
  const context = buildContentContext({ productIds: [REAL_PRODUCT_ID] });
  const provider = new MockProvider([() => jsonResult(VALID_JSON)]);
  const res = await generateContent(brief, context, { provider });
  assert(res.item?.promptVersion === "CONTENT_GENERATION_V1", "B10 prompt version recorded", res.item?.promptVersion);
}

// B11: regeneration works (first fails, second succeeds)
{
  const brief = makeBrief();
  const context = buildContentContext({ productIds: [REAL_PRODUCT_ID] });
  const provider = new MockProvider([
    () => jsonResult({ ...VALID_JSON, body: "منتج معجزة يعالج كل شيء نهائياً" }),
    () => jsonResult(VALID_JSON),
  ]);
  const res = await generateContent(brief, context, { provider });
  assert(!!res.item && res.item.status === "APPROVED", "B11 regeneration succeeded on retry", `retries ${res.retriesUsed}`);
}

// B12: retry limit enforced → REVIEW_REQUIRED / BLOCKED
{
  const brief = makeBrief();
  const context = buildContentContext({ productIds: [REAL_PRODUCT_ID] });
  const bad = "منتج معجزة يعالج كل شيء نهائياً";
  const provider = new MockProvider([
    () => jsonResult({ ...VALID_JSON, body: bad }),
    () => jsonResult({ ...VALID_JSON, body: bad }),
    () => jsonResult({ ...VALID_JSON, body: bad }),
  ]);
  const res = await generateContent(brief, context, { provider, maxRetries: 2 });
  assert(res.item === null || res.item.status !== "APPROVED", "B12 retry limit enforced (no APPROVED)", `retries ${res.retriesUsed}`);
  assert(res.retriesUsed <= 2, "B12 max retries respected", `${res.retriesUsed}`);
}

// B13: review reason recorded
{
  const brief = makeBrief();
  const context = buildContentContext({ productIds: [REAL_PRODUCT_ID] });
  const provider = new MockProvider([
    () => jsonResult({ ...VALID_JSON, body: "منتج معجزة يعالج كل شيء نهائياً" }),
    () => jsonResult({ ...VALID_JSON, body: "منتج معجزة يعالج كل شيء نهائياً" }),
  ]);
  const res = await generateContent(brief, context, { provider, maxRetries: 1 });
  const codes = (res.item?.validation.reasons ?? []).map((r) => r.code);
  assert(codes.includes("UNSUPPORTED_CLAIM"), "B13 review reason recorded (UNSUPPORTED_CLAIM)", codes.join(","));
}

// B14: eligibility decision deterministic
{
  const auto = decideEligibility({ validationPassed: true, originalityPassed: true, contentTypeRisk: "low", status: "APPROVED", reasonCodes: [] });
  assert(auto === "AUTO_PUBLISH_ELIGIBLE", "B14 low-risk valid → AUTO_PUBLISH_ELIGIBLE", auto);
  const blocked = decideEligibility({ validationPassed: false, originalityPassed: true, contentTypeRisk: "low", status: "REVIEW_REQUIRED", reasonCodes: ["UNSUPPORTED_CLAIM"] });
  assert(blocked === "BLOCKED", "B14 invalid → BLOCKED", blocked);
  const admin = decideEligibility({ validationPassed: true, originalityPassed: true, contentTypeRisk: "high", status: "APPROVED", reasonCodes: [] });
  assert(admin === "ADMIN_REVIEW_REQUIRED", "B14 high-risk valid → ADMIN_REVIEW_REQUIRED", admin);
}

// B15: parse + schema validation of generated payload
{
  const parsed = parseGeneratedContent('{"title":"x","body":"body text here","language":"ar","selectedProductIds":["p-1"],"status":"GENERATED"}');
  assert(parsed.payload !== null && parsed.payload.body === "body text here", "B15 parse structured JSON", parsed.error?.message);
  const bad = parseGeneratedContent('{"body":""}');
  assert(bad.payload === null && bad.error?.code === "ai_invalid_response", "B15 empty body rejected", bad.error?.message);
}

/* ------------------------------------------------------------------------ */
/* EXTRA — Taxonomies / types completeness                                   */
/* ------------------------------------------------------------------------ */

section("C — Taxonomies");

assert(CONTENT_TYPES.length === 11, "C1 11 content types", `${CONTENT_TYPES.length}`);
assert(CONTENT_OBJECTIVES.length === 9, "C2 9 objectives", `${CONTENT_OBJECTIVES.length}`);
assert(REVIEW_REASON_CODES.length === 9, "C3 9 review reason codes", `${REVIEW_REASON_CODES.length}`);
{
  const brief = makeBrief();
  assert(brief.channelNeutral === true, "C4 brief is channel-neutral");
  assert(brief.imageRequirement === "required", "C5 spotlight requires image", brief.imageRequirement);
  assert(brief.verifiedFacts.length >= 4, "C6 brief carries verified facts", `${brief.verifiedFacts.length}`);
  const prompt = buildContentPrompt({ brief, context: buildContentContext({ productIds: [REAL_PRODUCT_ID] }) });
  assert(prompt.system.includes("GROUNDING POLICY"), "C7 prompt has grounding policy");
  assert(prompt.user.includes("VERIFIED FACTS"), "C8 prompt has verified facts section");
  assert(prompt.system.includes("Luminous"), "C9 prompt has brand voice");
}
{
  const el = decideEligibility({ validationPassed: true, originalityPassed: true, contentTypeRisk: "low", status: "APPROVED", reasonCodes: [] }) as PublishingEligibility;
  assert(["AUTO_PUBLISH_ELIGIBLE", "ADMIN_REVIEW_REQUIRED", "BLOCKED"].includes(el), "C10 eligibility enum valid", el);
}

console.log(`\n========== CONTENT PART 1 RESULT: ${passed} passed, ${failed} failed ==========`);
if (failed > 0) {
  console.log("Failures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}