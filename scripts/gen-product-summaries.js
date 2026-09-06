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
const OVERRIDES_PATH = path.join(P, "src/data/content/image-source-overrides.json");

const src = fs.readFileSync(PRODUCTS_PATH, "utf8");
const overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8")) || {};

/* The split pipeline emits src/data/products.ts as an aggregator that imports
   products-part-XX.ts modules. Transpile each part on demand and load via a
   mini require shim so this generator works against both the single-file
   (pre-split) and split forms. */
const moduleCache = new Map();
function loadTS(filePath) {
  if (moduleCache.has(filePath)) return moduleCache.get(filePath);
  const s = fs.readFileSync(filePath, "utf8");
  const js = ts.transpileModule(s, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const m = { exports: {} };
  const fn = new Function("exports", "module", "require", js);
  fn(m.exports, m, (req) => {
    if (req.startsWith("./") || req.startsWith("../")) {
      const base = path.resolve(path.dirname(filePath), req);
      for (const ext of [".ts", ".tsx", ".js", ".jsx", ".json"]) {
        if (fs.existsSync(base + ext)) return loadTS(base + ext).exports;
      }
      throw new Error("Cannot resolve " + req + " from " + filePath);
    }
    if (req.startsWith("@/")) {
      const resolved = path.join(P, req.replace("@/", "src/"));
      for (const ext of [".ts", ".tsx", ".js", ".jsx", ".json"]) {
        if (fs.existsSync(resolved + ext)) return loadTS(resolved + ext).exports;
      }
    }
    // Handle specific heavy imports that the generator doesn't need at runtime
    if (req === "@/src/lib/taxonomy/product-mappings") {
      return { productMappings: {} };
    }
    // Type-only imports — nothing needed at runtime.
    return {};
  });
  moduleCache.set(filePath, m);
  return m;
}

const productsMod = loadTS(PRODUCTS_PATH);
const { products, categories, sectionCategoriesMap, sectionCategories, routines } = productsMod.exports;

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
    "status",
  ]) {
    if (p[k] !== undefined) out[k] = p[k];
  }
  // Replace gallery with Beauty Box image if override exists
  const override = overrides[p.id];
  if (override && override.image) {
    out.gallery = [override.image];
    out.heroImage = override.image;
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

/* Compact serializer: one literal per line, JSON-ish (valid TS).
   Adds cosmetic spaces only at JSON delimiters (after a comma that precedes a
   string value, and after a key's closing quote), NEVER inside string content.
   URL protocols like https:// are left byte-identical. */
function lit(obj) {
  const PROTO = "\uE000PROTO\uE001";
  return JSON.stringify(obj)
    .replace(/:\/\//g, PROTO)
    .replace(/,"/g, ', "')
    .replace(/":/g, '": ')
    .replaceAll(PROTO, "://");
}

function block(name, type, items) {
  // JSON.parse instead of a giant array literal: avoids TS2590
  // ("union type too complex") when tsc infers literal types for 2700+ objects.
  const json = JSON.stringify(items).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
  return `export const ${name}: ${type} = JSON.parse('${json}') as ${type};\n`;
}

let summariesFile = `/* GENERATED — do not edit by hand.
   Run: node scripts/gen-product-summaries.js
   Self-contained slim product data for client components. Keeps the heavy
   src/data/products.ts (descriptions, ingredients, usage instructions, benefits,
   SEO metadata) OUT of client bundles. Full data stays server-side only. */
import type { ProductSummary, CategoryInfo, Routine } from "@/src/types/product";

${block("productSummaries", "ProductSummary[]", summaries)}
export const publishedProductSummaries: ProductSummary[] = productSummaries.filter(
  (p) => (p.status ?? "published") === "published",
);
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
