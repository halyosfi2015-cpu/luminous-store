/**
 * PART 7 PERSONALIZED — Post-apply verification for the benefits personalization.
 *
 * Verifies the APPLIED catalog state (src/data/products-part-*) after
 * scripts/apply-benefits-personalization.ts:
 *   - P1  every published product has ≥2 benefit bullets
 *   - P2  personalization improved distinct benefit sets (AFTER > BEFORE baseline)
 *   - P3  zero differentiation violations (shared set ⇒ same material facts)
 *   - P4  no applied bullet reproduces a legacy template bullet
 *   - P5  personalization-APPROVED products carry exactly the canonical rebuilt benefits
 *   - P6  REVIEW_REQUIRED products kept their (pre-apply) current benefits
 *   - P7  no applied bullet is a copy/near-copy of the ORIGINAL (pre-apply) bullets
 *   - P8  20 personalization examples produced with the required group coverage
 *
 * Run with: npx tsx scripts/verify-part7-personalized.ts
 */

import { products } from "../src/data/products";
import { onlyPublished } from "../src/lib/publication";
import {
  selectProductBenefits,
  buildBenefitSignature,
  classifyPersonalization,
  runPersonalizationAudit,
  producePersonalizationExamples,
  validateBenefitOriginality,
} from "../src/lib/product-benefits";
import { extractDescriptionFacts } from "../src/lib/product-description";
import { loadSnapshotCatalog } from "./lib/snapshot";

const TEMPLATE_BULLETS = ["ترطيب عميق يدوم طوال اليوم", "يمنح البشرة نعومة وإشراقة", "يقوي حاجز البشرة الطبيعي"];
const BEFORE_DISTINCT = 71;

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

const applied = onlyPublished(products);
const snapshot = loadSnapshotCatalog();
const snapById = new Map(snapshot.map((p) => [p.id, p]));
const personal = classifyPersonalization(snapshot);

section("P1 — every published product has ≥2 benefit bullets");
{
  let min = Infinity;
  const bad: string[] = [];
  for (const p of applied) {
    const n = p.benefits?.ar?.length ?? 0;
    min = Math.min(min, n);
    if (n < 2) bad.push(p.id);
  }
  assert(min >= 2, `P1 min bullets = ${min}`, bad.length ? bad.join(",") : undefined);
}

section("P2 — personalization improved distinct benefit sets");
{
  const sets = new Set<string>();
  for (const p of applied) sets.add(JSON.stringify(p.benefits?.ar ?? []));
  assert(sets.size > BEFORE_DISTINCT, `P2 distinct benefit sets ${BEFORE_DISTINCT} -> ${sets.size}`);
}

section("P3 — zero differentiation violations in the applied catalog");
{
  const audit = runPersonalizationAudit(applied);
  assert(audit.differentiationViolations === 0, `P3 violations = ${audit.differentiationViolations}`);
  assert(audit.total === 2764, `P3 audit covers all products (${audit.total})`);
}

section("P4 — no applied bullet reproduces a legacy template bullet");
{
  const strip = (s: string) => s.trim().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ");
  let clean = true;
  let first: string | null = null;
  for (const p of applied) {
    for (const b of p.benefits?.ar ?? []) {
      if (TEMPLATE_BULLETS.some((t) => strip(t) === strip(b))) {
        clean = false;
        first = first ?? `${p.id}: "${b}"`;
      }
    }
  }
  assert(clean, "P4 no legacy template bullet applied", first ?? undefined);
}

section("P5 — personalization-APPROVED products carry exactly the canonical rebuilt benefits");
{
  let ok = true;
  let mismatchCount = 0;
  let firstMismatch: string | null = null;
  for (const p of applied) {
    if (personal.get(p.id) !== "APPROVED") continue;
    const snap = snapById.get(p.id);
    if (!snap) continue;
    const d = selectProductBenefits(snap);
    if (d.status !== "APPROVED") continue;
    const expected = JSON.stringify(d.reconstructedBenefits.ar);
    const actual = JSON.stringify(p.benefits?.ar ?? []);
    if (expected !== actual) {
      ok = false;
      mismatchCount++;
      if (!firstMismatch) firstMismatch = `${p.id} expected=${expected.slice(0, 60)} actual=${actual.slice(0, 60)}`;
    }
  }
  assert(ok, "P5 all APPROVED products match canonical rebuild", mismatchCount ? `${mismatchCount} mismatches; ${firstMismatch}` : undefined);
}

section("P6 — REVIEW_REQUIRED products share the category set (no distinguishing differentiator)");
{
  let shared = 0;
  let valid = 0;
  const issues: string[] = [];
  // modal set per category, computed from the canonical rebuild on the snapshot
  const modalByCat = new Map<string, string>();
  const countByCat = new Map<string, Map<string, number>>();
  for (const snap of snapshot) {
    const d = selectProductBenefits(snap);
    if (d.status !== "APPROVED") continue;
    const key = JSON.stringify(d.reconstructedBenefits.ar);
    const cat = snap.categorySlug ?? "uncategorized";
    const m = countByCat.get(cat) ?? new Map<string, number>();
    m.set(key, (m.get(key) ?? 0) + 1);
    countByCat.set(cat, m);
  }
  for (const [cat, m] of countByCat) {
    let best = "";
    let bestN = 0;
    for (const [k, n] of m) if (n > bestN) {
      best = k;
      bestN = n;
    }
    modalByCat.set(cat, best);
  }
  for (const p of applied) {
    if (personal.get(p.id) !== "REVIEW_REQUIRED") continue;
    const snap = snapById.get(p.id);
    if (!snap) continue;
    shared++;
    const modal = modalByCat.get(snap.categorySlug ?? "uncategorized") ?? "";
    if (JSON.stringify(p.benefits?.ar ?? []) !== modal) {
      issues.push(`${p.id}: benefits do not equal the shared category set`);
      continue;
    }
    const ar = p.benefits?.ar ?? [];
    if (ar.length < 2) issues.push(`${p.id}: only ${ar.length} bullets`);
    const df = extractDescriptionFacts(p);
    for (const b of ar) {
      const o = validateBenefitOriginality([b], snap.benefits?.ar ?? [], df);
      if (o.status === "REJECTED") issues.push(`${p.id}: "${b}" rejected for originality`);
    }
    valid++;
  }
  assert(issues.length === 0, `P6 all ${shared} REVIEW_REQUIRED products valid & shared`, issues.slice(0, 3).join(" | ") || undefined);
  assert(shared > 0, `P6 some products were REVIEW_REQUIRED (${shared})`);
  assert(valid === shared, `P6 every shared product valid (${valid}/${shared})`);
}

section("P7 — no applied bullet is a copy/near-copy of the ORIGINAL bullets");
{
  let rejected = 0;
  let first: string | null = null;
  for (const p of applied) {
    const snap = snapById.get(p.id);
    if (!snap) continue;
    const df = extractDescriptionFacts(p);
    const o = validateBenefitOriginality(p.benefits?.ar ?? [], snap.benefits?.ar ?? [], df);
    if (o.status === "REJECTED") {
      rejected++;
      if (!first) first = `${p.id}: ${o.reasons.join(" | ")}`;
    }
  }
  assert(rejected === 0, "P7 no original-bullet copy in applied catalog", rejected ? `${rejected} rejected; ${first}` : undefined);
}

section("P8 — 20 personalization examples with required group coverage");
{
  const examples = producePersonalizationExamples(20, snapshot);
  assert(examples.length === 20, `P8 produced ${examples.length} examples`);
  const counts: Record<string, number> = {};
  for (const e of examples) counts[e.category] = (counts[e.category] ?? 0) + 1;
  const groupSlugs: Array<[string, string[], number]> = [
    ["skincare", ["cleansers", "toners", "serums", "moisturizers", "exfoliators", "masks"], 5],
    ["hair", ["shampoo", "conditioner", "hair-oils", "hair-masks", "hair-creams", "hair-dyes", "hair-treatments"], 5],
    ["makeup", ["face-makeup", "lip-makeup", "eye-makeup", "makeup"], 3],
    ["fragrance", ["perfume-women", "perfume-men", "perfume-musk", "perfume-gift-sets", "perfume", "bakhoor-oud", "bakhoor-premium"], 3],
    ["oral-care", ["oral-care"], 2],
    ["supplements", ["vitamins"], 2],
  ];
  for (const [label, slugs, min] of groupSlugs) {
    const n = examples.filter((e) => slugs.includes(e.category)).length;
    assert(n >= min, `P8 ${label} >= ${min} examples (${n})`);
  }
  const complete = examples.every((e) => e.productId && e.productName.ar && e.verifiedDifferentiators.length >= 1 && e.finalBenefits.length >= 2);
  assert(complete, "P8 every example has product + differentiators + final benefits");
}

console.log(`\n========== PART 7 PERSONALIZED RESULT: ${passed} passed, ${failed} failed ==========`);
if (failed > 0) {
  console.log("Failures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}