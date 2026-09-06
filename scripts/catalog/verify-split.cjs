"use strict";
const ts = require("C:/Users/user/Desktop/Luminous-Final Project Hamed final/node_modules/typescript");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const P = "C:/Users/user/Desktop/Luminous-Final Project Hamed final";
const T = path.join(P, "src/data");

function loadTSModule(file) {
  const src = fs.readFileSync(file, "utf8");
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const m = { exports: {} };
  const fn = new Function("exports", "module", "require", js);
  fn(m.exports, m, (req) => {
    if (req.startsWith("@/")) {
      const reqPath = path.join(P, req.slice(2));
      for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
        if (fs.existsSync(reqPath + ext)) return loadTSModule(reqPath + ext).exports;
      }
      throw new Error("Cannot resolve " + req + " from " + file);
    }
    if (req.startsWith("./") || req.startsWith("../")) {
      const reqPath = path.join(path.dirname(file), req);
      for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
        if (fs.existsSync(reqPath + ext)) return loadTSModule(reqPath + ext).exports;
      }
      throw new Error("Cannot resolve " + req + " from " + file);
    }
    return { __esModule: true };
  });
  return m;
}

console.log("Loading split modules...");
const prodMod = loadTSModule(path.join(T, "products.ts"));
const summMod = loadTSModule(path.join(T, "product-summaries.ts"));
const compMod = loadTSModule(path.join(T, "product-compare-details.ts"));

const products = prodMod.exports.products;
const categories = prodMod.exports.categories;
const sectionCategoriesMap = prodMod.exports.sectionCategoriesMap;
const routines = prodMod.exports.routines;
const productSummaries = summMod.exports.productSummaries;
const compareDetails = compMod.exports.productCompareDetails;

let fail = 0;
function check(name, cond, detail) {
  const ok = !!cond;
  if (!ok) { fail++; console.log("  FAIL: " + name + (detail ? " — " + detail : "")); }
  else console.log("  ok  : " + name);
}

console.log("=== 1. PRODUCT COUNT ===");
check("products count == 2764", products.length === 2764, "got " + products.length);
check("productSummaries count == 2764", productSummaries.length === 2764, "got " + productSummaries.length);
check("compareDetails count == 2764", Object.keys(compareDetails).length === 2764, "got " + Object.keys(compareDetails).length);

console.log("=== 2. DUPLICATE IDS / SLUGS ===");
const ids = new Set(), slugs = new Set();
let dupIds = 0, dupSlugs = 0;
for (const p of products) {
  if (ids.has(p.id)) dupIds++; ids.add(p.id);
  if (slugs.has(p.slug)) dupSlugs++; slugs.add(p.slug);
}
check("no duplicate ids", dupIds === 0, dupIds + " dups");
check("no duplicate slugs", dupSlugs === 0, dupSlugs + " dups");

console.log("=== 3. 354 BASELINE PRESERVED ===");
const buf = execSync('git show HEAD:src/data/products.ts', { encoding: 'buffer' });
let headTxt = (buf[0] === 0xFF && buf[1] === 0xFE) ? buf.toString("utf16le") : buf.toString("utf8");
const idRe = /id:\s*"(yq-\d+)"/g;
const origIds = [];
let m;
while ((m = idRe.exec(headTxt)) !== null) origIds.push(m[1]);
check("git HEAD baseline ids found (354)", origIds.length === 354, "got " + origIds.length);
const byId = new Map(products.map(p => [p.id, p]));
let baselineMissing = 0;
for (const id of origIds) { if (!byId.has(id)) baselineMissing++; }
check("all 354 baseline ids present", baselineMissing === 0, baselineMissing + " missing");

console.log("=== 4. ALL 2764 PRODUCTS VERBATIM (deep vs pre-split backup) ===");
// Parse backup blocks as JS literals and deep-compare.
function parseLiteral(src) {
  const fn = new Function("return (" + src + ")");
  return fn();
}
const backup = fs.readFileSync(path.join(process.env.TEMP, "opencode/products-pre-split.ts"), "utf8");
const blines = backup.split("\n");
const bStart = blines.findIndex(l => l.trim() === "export const products: Product[] = [");
let bEnd = -1;
for (let k = bStart; k < blines.length; k++) if (blines[k].trim() === "];") { bEnd = k; break; }
const bRegion = blines.slice(bStart + 1, bEnd);
const bBlocks = [];
let i = 0;
while (i < bRegion.length) {
  if (bRegion[i].trim() === "{") {
    const blk = []; let d = 0;
    while (i < bRegion.length) {
      const l = bRegion[i]; blk.push(l);
      d += (l.match(/{/g) || []).length - (l.match(/}/g) || []).length;
      i++; if (d === 0) break;
    }
    bBlocks.push(blk.join("\n").replace(/,\s*$/, "").trim());
  } else i++;
}
check("backup has 2764 blocks", bBlocks.length === 2764, "got " + bBlocks.length);
const backupById = {};
let parseErr = 0;
for (const blk of bBlocks) {
  try {
    const obj = parseLiteral(blk);
    backupById[obj.id] = obj;
  } catch (e) { parseErr++; }
}
check("backup blocks parse OK", parseErr === 0, parseErr + " failed");

let verbatimMismatch = 0, mismatchIds = [];
for (const p of products) {
  if (!backupById[p.id]) { verbatimMismatch++; mismatchIds.push(p.id + "(missing-in-backup)"); continue; }
  if (JSON.stringify(p) !== JSON.stringify(backupById[p.id])) {
    verbatimMismatch++; mismatchIds.push(p.id);
  }
}
check("all products deep-equal to pre-split", verbatimMismatch === 0, verbatimMismatch + " mismatched: " + mismatchIds.slice(0, 5).join(", "));

console.log("=== 5. PRICE FIXES (reconciliation.txt) ===");
const rec = fs.readFileSync(path.join(P, "scripts/catalog/data/reconciliation.txt"), "utf8");
const fixIds = new Set();
for (const line of rec.split(/\r?\n/)) {
  const mm = line.match(/(yq-\d+)/);
  if (mm) fixIds.add(mm[1]);
}
let priceFixOk = 0, priceFixMiss = [];
for (const id of fixIds) {
  const p = byId.get(id);
  if (!p || typeof p.pricing?.price !== "number") { priceFixMiss.push(id + "(noprod)"); continue; }
  const op = p.pricing.originalPrice;
  if (typeof op === "number" && op > 200) { if (p.pricing.price === op - 200) priceFixOk++; else priceFixMiss.push(id + "(mismatch)"); }
  else priceFixOk++;
}
check("price-fix ids resolvable with valid price", priceFixOk === fixIds.size && priceFixMiss.length === 0, priceFixOk + "/" + fixIds.size + (priceFixMiss.length ? " " + priceFixMiss.slice(0, 5).join(", ") : ""));

console.log("=== 6. NO NULL REQUIRED PRICE FIELDS ===");
let nullPrice = 0, noCurrency = 0, badPrice = 0;
for (const p of products) {
  const pr = p.pricing;
  if (!pr || typeof pr.price !== "number" || pr.price <= 0) nullPrice++;
  if (!pr || !pr.currency) noCurrency++;
  if (typeof pr?.originalPrice === "number" && pr.originalPrice < 200) badPrice++;
}
check("all 2764 have price > 0", nullPrice === 0, nullPrice + " bad");
check("all have currency", noCurrency === 0, noCurrency + " missing");
check("no originalPrice < 200", badPrice === 0, badPrice + " bad");

console.log("=== 7. CATEGORIES / SECTION MAP / ROUTINES PRESERVED ===");
check("categories length == 43", categories.length === 43, "got " + categories.length);
check("sectionCategoriesMap present", Array.isArray(sectionCategoriesMap) && sectionCategoriesMap.length > 0, "got " + sectionCategoriesMap?.length);
check("routines present", Array.isArray(routines) && routines.length > 0, "got " + routines?.length);
check("summaries categories match products", summMod.exports.categories.length === categories.length);
check("summaries sectionMap match", summMod.exports.sectionCategoriesMap.length === sectionCategoriesMap.length);
check("summaries routines match", summMod.exports.routines.length === routines.length);

console.log("=== 8. API PARITY ===");
for (const fn of ["getProductBySlug", "getProductsByCategory", "getCategoryBySlug", "getFeaturedProducts", "getNewArrivals", "getBestSellers", "getDoctorRecommended", "getRelatedProducts", "searchProducts"]) {
  check("products.ts exports " + fn, typeof prodMod.exports[fn] === "function");
}
for (const fn of ["getNewArrivals", "getProductsByCategory"]) {
  check("product-summaries.ts exports " + fn, typeof summMod.exports[fn] === "function");
}
check("getRelatedProducts works", Array.isArray(prodMod.exports.getRelatedProducts(products[0])));
check("searchProducts works", Array.isArray(prodMod.exports.searchProducts("سيروم")));

console.log("=== 9. SUMMARIES / COMPARE CONSISTENCY ===");
const prodIdSet = new Set(products.map(p => p.id));
let missingFromSummaries = 0, missingFromCompare = 0, extraInSummaries = 0;
for (const p of products) if (!productSummaries.find(s => s.id === p.id)) missingFromSummaries++;
for (const p of products) if (!compareDetails[p.id]) missingFromCompare++;
for (const s of productSummaries) if (!prodIdSet.has(s.id)) extraInSummaries++;
check("every product has a summary", missingFromSummaries === 0, missingFromSummaries + " missing");
check("every product has compare detail", missingFromCompare === 0, missingFromCompare + " missing");
check("no orphan summaries", extraInSummaries === 0, extraInSummaries + " orphans");

console.log("=== 10. ORDER SANITY ===");
check("first product id is yq-754", products[0].id === "yq-754", "got " + products[0]?.id);
check("last product id is yq-2790", products[products.length - 1].id === "yq-2790", "got " + products[products.length - 1]?.id);

console.log("\n" + (fail === 0 ? "ALL CHECKS PASSED" : fail + " CHECKS FAILED"));
process.exit(fail === 0 ? 0 : 1);