"use strict";
/* Generates self-contained slim data modules from src/data/products.ts:
   1) src/data/product-summaries.ts      — ProductSummary[] + categories + sectionCategories + sectionCategoriesMap + routines (literal data, no import of products.ts)
   2) src/data/product-compare-details.ts — Record<productId, { descriptionAr, ingredientsAr }> (only pulled by the /compare route)

   Run: node scripts/gen-product-summaries.js
   Read-only over products.ts — never modifies it.
*/
const ts = require("C:/Users/user/Desktop/Luminous-Final Project Hamed final/node_modules/typescript");
const fs = require("fs");
const path = require("path");
const P = "C:/Users/user/Desktop/Luminous-Final Project Hamed final";

const PRODUCTS_PATH = path.join(P, "src/data/products.ts");
const OUT_SUMMARIES = path.join(P, "src/data/product-summaries.ts");
const OUT_COMPARE = path.join(P, "src/data/product-compare-details.ts");

const src = fs.readFileSync(PRODUCTS_PATH, "utf8");
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const m = { exports: {} };
const fn = new Function("exports", "module", "require", js);
fn(m.exports, m, () => {
  throw new Error("require not expected");
});

const { products, categories, sectionCategoriesMap, sectionCategories, routines } = m.exports;

if (!Array.isArray(products)) throw new Error("products not exported");
if (!Array.isArray(routines)) throw new Error("routines not exported");
console.log(`Loaded ${products.length} products, ${categories.length} categories, ${sectionCategoriesMap.length} sectionCategoriesMap, ${sectionCategories.length} sectionCategories, ${routines.length} routines`);

/* Build slim summary projection (only fields client components need). */
function toSummary(p) {
  const out = {};
  for (const k of [
    "id", "slug", "name", "brand", "brandAr", "category", "categoryAr", "categorySlug",
    "pricing", "discount", "gallery", "skinTypes", "suitableFor", "skinConcerns",
    "stock", "inStock", "rating", "reviewCount",
    "featured", "isFeatured", "new", "isNew", "isBestSeller", "isDoctorRecommended", "tags",
  ]) {
    if (p[k] !== undefined) out[k] = p[k];
  }
  return out;
}

function toCompareDetail(p) {
  return {
    descriptionAr: (p.description && p.description.ar) || "",
    ingredientsAr: (p.ingredients && p.ingredients.ar) || [],
  };
}

const summaries = products.map(toSummary);
const compareDetails = {};
for (const p of products) compareDetails[p.id] = toCompareDetail(p);

/* Compact serializer: one literal per line, JSON-ish (valid TS). */
function lit(obj) {
  return JSON.stringify(obj).replace(/,/g, ", ").replace(/:/g, ": ");
}

function block(name, type, items) {
  const body = items.map((it) => `  ${lit(it)}`).join(",\n");
  return `export const ${name}: ${type} = [\n${body},\n];\n`;
}

let summariesFile = `/* GENERATED — do not edit by hand.
   Run: node scripts/gen-product-summaries.js
   Self-contained slim product data for client components. Keeps the heavy
   src/data/products.ts (descriptions, ingredients, usage instructions, benefits,
   SEO metadata) OUT of client bundles. Full data stays server-side only. */
import type { ProductSummary, CategoryInfo, Routine } from "@/src/types/product";

${block("productSummaries", "ProductSummary[]", summaries)}
${block("categories", "CategoryInfo[]", categories)}
${block("sectionCategoriesMap", "{ slug: string; name: string; nameAr: string; description: string; descriptionAr: string; children: string[]; icon: string }[]", sectionCategoriesMap)}
${block("sectionCategories", "CategoryInfo[]", sectionCategories)}
${block("routines", "Routine[]", routines)}

const sectionChildren: Record<string, string[]> = sectionCategoriesMap.reduce(
  (acc, s) => {
    acc[s.slug] = s.children;
    return acc;
  },
  {} as Record<string, string[]>
);

export function getNewArrivals(): ProductSummary[] {
  return productSummaries.filter((p) => p.isNew).slice(0, 12);
}

export function getProductsByCategory(categorySlug: string): ProductSummary[] {
  const children = sectionChildren[categorySlug];
  if (children) return productSummaries.filter((p) => p.categorySlug && children.includes(p.categorySlug));
  return productSummaries.filter((p) => p.categorySlug === categorySlug);
}
`;

let compareFile = `/* GENERATED — do not edit by hand.
   Run: node scripts/gen-product-summaries.js
   Rich compare details (description.ar + ingredients.ar) keyed by product id.
   Only imported by the /compare route, so heavy text stays out of every page. */
import type { ProductCompareDetail } from "@/src/types/product";

export const productCompareDetails: Record<string, ProductCompareDetail> = {
${Object.entries(compareDetails)
  .map(([id, d]) => `  ${lit(id)}: ${lit(d)}`)
  .join(",\n")},
};
`;

fs.writeFileSync(OUT_SUMMARIES, summariesFile);
fs.writeFileSync(OUT_COMPARE, compareFile);

console.log(`Wrote ${OUT_SUMMARIES} (${(fs.statSync(OUT_SUMMARIES).size / 1024).toFixed(1)} KB)`);
console.log(`Wrote ${OUT_COMPARE} (${(fs.statSync(OUT_COMPARE).size / 1024).toFixed(1)} KB)`);

/* Report size reduction */
const fullSize = products.reduce((s, p) => s + JSON.stringify(p).length, 0);
const slimSize = summaries.reduce((s, p) => s + JSON.stringify(p).length, 0);
console.log(`Full products JSON: ${(fullSize / 1024).toFixed(1)} KB → summaries: ${(slimSize / 1024).toFixed(1)} KB (${(100 - (slimSize / fullSize) * 100).toFixed(1)}% smaller)`);
