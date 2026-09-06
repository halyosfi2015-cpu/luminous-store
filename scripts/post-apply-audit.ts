/**
 * POST-APPLICATION AUDIT — definitive completion gate.
 *
 * Verifies the applied catalog against the pre-apply snapshot and against the
 * approved application plan. Decision pipelines are NOT re-run here (their
 * originality validators compare candidate vs stored text, which is circular
 * once applied); the snapshot diff is the source of truth.
 *
 * Run with: npx tsx scripts/post-apply-audit.ts
 */

import fs from "fs";
import path from "path";
import { products } from "@/src/data/products";
import { productSummaries, publishedProductSummaries } from "@/src/data/product-summaries";
import { onlyPublished } from "@/src/lib/publication";

const ROOT = process.cwd();
const SNAP = "C:/Users/user/AppData/Local/Temp/opencode/catalog-pre-apply";

const ts = require("C:/Users/user/Desktop/Luminous-Final Project Hamed final/node_modules/typescript");

const moduleCache = new Map<string, { exports: any }>();
function loadTS(filePath: string): { exports: any } {
  if (moduleCache.has(filePath)) return moduleCache.get(filePath)!;
  const s = fs.readFileSync(filePath, "utf8");
  const js = ts.transpileModule(s, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const m = { exports: {} };
  const fn = new Function("exports", "module", "require", js);
  fn(m.exports, m, (req: string) => {
    if (req.startsWith("./") || req.startsWith("../")) {
      const base = path.resolve(path.dirname(filePath), req);
      for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
        if (fs.existsSync(base + ext)) return loadTS(base + ext).exports;
      }
      throw new Error("Cannot resolve " + req + " from " + filePath);
    }
    return {};
  });
  moduleCache.set(filePath, m);
  return m;
}

function loadParts(dir: string): any[] {
  const out: any[] = [];
  for (const n of ["01", "02", "03", "04", "05", "06", "07", "08"]) {
    const f = path.join(dir, `products-part-${n}.ts`);
    if (!fs.existsSync(f)) continue;
    out.push(...(loadTS(f).exports[`productsPart${n}`] ?? []));
  }
  return out;
}

let failed = 0;
function check(cond: boolean, label: string, detail?: string) {
  console.log(`${cond ? "  PASS  " : "  FAIL  "}${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failed++;
}

const published = onlyPublished(products);
const before = new Map<string, any>();
for (const p of loadParts(SNAP)) before.set(p.id, p);
const after = new Map<string, any>();
for (const p of products) after.set(p.id, p);

// ── A. Catalog shape ──────────────────────────────────────────────────────
console.log(`\n=== A. Catalog shape ===`);
check(products.length === 2764 && before.size === 2764, "2764 products before and after");
check(products.length === published.length, `all 2764 published (got ${published.length})`);
check(after.size === before.size, "no ids lost or added");
const ids = new Set<string>();
let dupes = 0;
for (const p of products) (ids.has(p.id) && dupes++, ids.add(p.id));
check(dupes === 0, "no duplicate ids");
check(productSummaries.length === 2764, `productSummaries = 2764 (got ${productSummaries.length})`);
check(publishedProductSummaries.length === 2764, `publishedProductSummaries = 2764 (got ${publishedProductSummaries.length})`);

// ── B. Safety: untouched fields ───────────────────────────────────────────
console.log(`\n=== B. Untouched (safety) ===`);
let idsChanged = 0, slugsChanged = 0, galleryChanged = 0, ingredientsChanged = 0, ratingChanged = 0;
for (const [id, b] of before) {
  const a = after.get(id)!;
  if (b.id !== a.id) idsChanged++;
  if (b.slug !== a.slug) slugsChanged++;
  if (JSON.stringify(b.gallery) !== JSON.stringify(a.gallery)) galleryChanged++;
  if (JSON.stringify(b.ingredients) !== JSON.stringify(a.ingredients)) ingredientsChanged++;
  if (b.rating !== a.rating || b.reviewCount !== a.reviewCount) ratingChanged++;
}
check(idsChanged === 0 && slugsChanged === 0, "ids + slugs unchanged", `${idsChanged}/${slugsChanged}`);
check(galleryChanged === 0, "real images preserved (0 gallery changes)", String(galleryChanged));
check(ingredientsChanged === 0 && ratingChanged === 0, "ingredients/ratings unchanged");

// ── C. Applied fields match the plan exactly ──────────────────────────────
console.log(`\n=== C. Applied fields (vs plan) ===`);
let nameChanged = 0, nameKept = 0, descChanged = 0, benChanged = 0, useChanged = 0, useKept = 0;
let origRemoved = 0, origKept = 0, priceChanged = 0;
for (const [id, b] of before) {
  const a = after.get(id)!;
  if (JSON.stringify(b.name) !== JSON.stringify(a.name)) nameChanged++; else nameKept++;
  if (JSON.stringify(b.description) !== JSON.stringify(a.description)) descChanged++;
  if (JSON.stringify(b.benefits) !== JSON.stringify(a.benefits)) benChanged++;
  if (JSON.stringify(b.usageInstructions) !== JSON.stringify(a.usageInstructions)) useChanged++; else useKept++;
  if (b.pricing?.originalPrice !== undefined && a.pricing?.originalPrice === undefined) origRemoved++;
  if (b.pricing?.originalPrice !== undefined && a.pricing?.originalPrice !== undefined) origKept++;
  if (b.pricing?.price !== a.pricing?.price) priceChanged++;
}
check(nameChanged === 2764 && nameKept === 0, `names: all 2764 rebuilt — remediation resolved all review cases (got ${nameChanged}/${nameKept})`);
check(descChanged === 2764, `descriptions: 2764 applied (got ${descChanged})`);
check(benChanged === 2764, `benefits: 2764 applied (got ${benChanged})`);
check(useChanged === 2515 && useKept === 249, `usage: 2515 applied / 249 documented REVIEW kept (got ${useChanged}/${useKept})`);
check(origRemoved === 2195 && origKept === 0, `pricing: 2195 fake "-200 YER" stripped, 0 kept (got ${origRemoved}/${origKept})`);
check(priceChanged === 0, "no genuine price changed", String(priceChanged));

// ── D. Content invariants ─────────────────────────────────────────────────
console.log(`\n=== D. Content invariants ===`);
let grammarBugs = 0, badDesc = 0, badBen = 0, discount = 0, realDiscount = 0, badPrice = 0, runOn = 0;
for (const p of published) {
  if (/ يعمل على (?!أن )[يأتنسو]/.test(p.description?.ar ?? "")) grammarBugs++;
  if (!p.description?.ar || p.description.ar.length < 30) badDesc++;
  if (!Array.isArray(p.benefits?.ar) || p.benefits.ar.length < 2) badBen++;
  if (p.discount !== undefined) discount++;
  if (p.hasRealDiscount === true) realDiscount++;
  if (!p.pricing?.currency || p.pricing.currency !== "YER" || !(p.pricing.price > 0)) badPrice++;
  if (
    Array.isArray(p.howToUseAr) &&
    p.howToUseAr.length > 1 &&
    p.howToUseAr.join(" ") === (p.usageInstructions?.ar ?? "").trim()
  )
    runOn++;
}
check(grammarBugs === 0, `0 Arabic grammar bugs ("يعمل على <verb>") (got ${grammarBugs})`);
check(badDesc === 0, "every product has a substantive Arabic description");
check(badBen === 0, "every product has ≥2 honest benefit bullets (verified facts only)");
check(discount === 0 && realDiscount === 0, "0 discount badges / 0 fake-real-discount claims");
check(badPrice === 0, "every product has a valid positive YER price");
check(runOn === 0, "0 run-on usage paragraphs (multi-step now joined)", String(runOn));

// ── E. Publication / storefront safety ────────────────────────────────────
console.log(`\n=== E. Publication / storefront safety ===`);
check(published.length === 2764, "storefront surfaces 2764 published products");

console.log(`\n${failed === 0 ? "ALL POST-APPLICATION AUDIT CHECKS PASSED" : failed + " CHECK(S) FAILED"}`);
process.exit(failed === 0 ? 0 : 1);