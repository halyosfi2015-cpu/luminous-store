#!/usr/bin/env node
/**
 * ============================================================================
 * MASTER TAXONOMY — PRODUCT COVERAGE REPORT
 * ============================================================================
 * Produces a real-numbers coverage report over src/lib/taxonomy/product-mappings.ts
 * and src/data/taxonomy.ts:
 *
 *   - Totals: Total products, Mapped, Review Required, Unclassified, Orphan
 *   - Per CATEGORY / SUBCATEGORY / PRODUCT_TYPE counts (from the mappings)
 *   - Confidence distribution
 *   - Legacy → new mapping summary
 *
 * USAGE:  node scripts/taxonomy/coverage-report.mjs
 * ============================================================================
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function loadTaxonomy() {
  const src = readFileSync(join(root, "src/data/taxonomy.ts"), "utf8");
  const nodes = [];
  for (const rawLine of src.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("{ id: ")) continue;
    const id = /id:\s*"([^"]+)"/.exec(line)?.[1];
    const slug = /slug:\s*"([^"]+)"/.exec(line)?.[1];
    const type = /type:\s*"([^"]+)"/.exec(line)?.[1];
    const status = /status:\s*"([^"]+)"/.exec(line)?.[1];
    const nameAr = /nameAr:\s*"([^"]+)"/.exec(line)?.[1];
    const parentRaw = /parentId:\s*("([^"]+)"|null)/.exec(line)?.[1];
    if (!id || !slug || !type) continue;
    nodes.push({
      id,
      slug,
      type,
      status: status || "ACTIVE",
      nameAr: nameAr || "",
      parentId: parentRaw === "null" ? null : parentRaw.replace(/"/g, ""),
    });
  }
  return nodes;
}

const nodes = loadTaxonomy();
const bySlug = new Map(nodes.map((n) => [n.slug, n]));

const mappingSrc = readFileSync(join(root, "src/lib/taxonomy/product-mappings.ts"), "utf8");

/* Parse MAPPED entries. */
const mapped = [];
for (const m of mappingSrc.matchAll(/\{ productId: "([^"]+)", categorySlug: "([^"]+)", subcategorySlug: "([^"]+)", productTypeSlug: "([^"]+)", confidence: "([^"]+)", status: "MAPPED"/g)) {
  mapped.push({ productId: m[1], categorySlug: m[2], subcategorySlug: m[3], productTypeSlug: m[4], confidence: m[5] });
}

const reviewCount = [...mappingSrc.matchAll(/proposedCategory:/g)].length;
const totalMapped = mapped.length;
const totalProducts = totalMapped + reviewCount;

console.log("══════════════════════════════════════════════════════════════");
console.log("  MASTER TAXONOMY — PRODUCT COVERAGE REPORT");
console.log("══════════════════════════════════════════════════════════════");
console.log(`Total products           : ${totalProducts}`);
console.log(`Mapped                   : ${totalMapped}`);
console.log(`Review required          : ${reviewCount}`);
console.log(`Unclassified             : ${reviewCount}`);
console.log(`Coverage                 : ${((totalMapped / totalProducts) * 100).toFixed(2)}%`);

/* Confidence distribution. */
const conf = {};
for (const m of mapped) conf[m.confidence] = (conf[m.confidence] || 0) + 1;
console.log("\nConfidence distribution  :");
for (const k of ["high", "medium", "low"]) {
  if (conf[k]) console.log(`   ${k.padEnd(8)} ${conf[k].toString().padStart(5)}  ${((conf[k] / totalMapped) * 100).toFixed(1)}%`);
}

/* Legacy summary (categorySlug of each mapped entry). */
const byCategory = {};
for (const m of mapped) byCategory[m.categorySlug] = (byCategory[m.categorySlug] || 0) + 1;

console.log("\n── Per CATEGORY (master taxonomy) ──");
const categorySlugs = [...new Set(mapped.map((m) => m.categorySlug))].sort();
for (const c of categorySlugs) {
  const node = bySlug.get(c);
  console.log(`   ${c.padEnd(22)} ${byCategory[c].toString().padStart(5)}   ${node ? node.nameAr : "?"}`);
}

console.log("\n── Per SUBCATEGORY (master taxonomy) ──");
const bySub = {};
for (const m of mapped) {
  const k = `${m.categorySlug} → ${m.subcategorySlug}`;
  bySub[k] = (bySub[k] || 0) + 1;
}
for (const k of Object.keys(bySub).sort()) {
  const sub = k.split(" → ")[1];
  const node = bySlug.get(sub);
  console.log(`   ${k.padEnd(42)} ${bySub[k].toString().padStart(5)}   ${node ? node.nameAr : "?"}`);
}

console.log("\n── Per PRODUCT_TYPE (top 25 by volume) ──");
const byPt = {};
for (const m of mapped) byPt[m.productTypeSlug] = (byPt[m.productTypeSlug] || 0) + 1;
const ptSorted = Object.entries(byPt).sort((a, b) => b[1] - a[1]).slice(0, 25);
for (const [pt, count] of ptSorted) {
  const node = bySlug.get(pt);
  console.log(`   ${pt.padEnd(30)} ${count.toString().padStart(5)}   ${node ? node.nameAr : "?"}`);
}

console.log("\n── Empty ACTIVE/FUTURE nodes (no mapped products) ──");
for (const n of nodes.filter((x) => x.type === "CATEGORY" || x.type === "SUBCATEGORY" || x.type === "PRODUCT_TYPE")) {
  const isUsed = mapped.some((m) => m.categorySlug === n.slug || m.subcategorySlug === n.slug || m.productTypeSlug === n.slug);
  if (!isUsed) console.log(`   [${n.status}] ${n.slug}  ${n.nameAr}`);
}

console.log("\n══════════════════════════════════════════════════════════════");