/**
 * FINAL CATALOG APPLICATION — PART 4..9 approved results.
 *
 * Writes the approved reconstructed fields into the EXISTING canonical catalog
 * (src/data/products-part-01..08.ts) — no second catalog, no backups, no
 * id/slug changes. Only APPROVED decisions are applied; every REVIEW_REQUIRED
 * and REJECTED item stays byte-identical and countable.
 *
 * Applied fields: name, description, benefits, usageInstructions + howToUse +
 * howToUseAr, pricing (fake "-200 YER" originalPrice stripped, hasRealDiscount
 * false), and seoMetadata (re-derived from the applied name/description).
 * Images are retained as-is (audit: 0 replacements).
 *
 * Run with: npx tsx scripts/apply-catalog.ts
 */

import fs from "fs";
import path from "path";
import { productsPart01 } from "@/src/data/products-part-01";
import { productsPart02 } from "@/src/data/products-part-02";
import { productsPart03 } from "@/src/data/products-part-03";
import { productsPart04 } from "@/src/data/products-part-04";
import { productsPart05 } from "@/src/data/products-part-05";
import { productsPart06 } from "@/src/data/products-part-06";
import { productsPart07 } from "@/src/data/products-part-07";
import { productsPart08 } from "@/src/data/products-part-08";
import { extractNameFacts, reconstructName, computeNameDecision } from "@/src/lib/product-name";
import { selectProductDescription } from "@/src/lib/product-description";
import { selectProductBenefits } from "@/src/lib/product-benefits";
import { selectProductUsage } from "@/src/lib/product-usage";
import { selectProductPricing } from "@/src/lib/product-pricing";
import type { Product } from "@/src/types/product";

const ROOT = process.cwd();
const parts = [
  { num: "01", arr: productsPart01 },
  { num: "02", arr: productsPart02 },
  { num: "03", arr: productsPart03 },
  { num: "04", arr: productsPart04 },
  { num: "05", arr: productsPart05 },
  { num: "06", arr: productsPart06 },
  { num: "07", arr: productsPart07 },
  { num: "08", arr: productsPart08 },
];

const stats = {
  name: { applied: 0, kept: 0 },
  description: { applied: 0, kept: 0 },
  benefits: { applied: 0, kept: 0 },
  usage: { applied: 0, kept: 0 },
  pricing: { strippedOriginalPrice: 0, kept: 0 },
  seoMetadata: { applied: 0, kept: 0 },
};

function applyProduct(p: Product): { applied: Product; touched: string[] } {
  const touched: string[] = [];
  const next: Product = {
    ...p,
    name: { ...p.name },
    description: { ...p.description },
    benefits: { ar: [...(p.benefits?.ar ?? [])], en: [...(p.benefits?.en ?? [])] },
    pricing: { ...p.pricing },
    usageInstructions: { ...p.usageInstructions },
  };

  // PART 4 — name (APPROVED only)
  const nf = extractNameFacts(p);
  const nm = reconstructName(p, nf);
  const nd = computeNameDecision(nf, nm, p.name);
  if (nd.status === "APPROVED") {
    if (nm.ar !== p.name.ar || nm.en !== p.name.en) {
      next.name = { ar: nm.ar, en: nm.en };
      touched.push("name");
      stats.name.applied++;
    } else stats.name.kept++;
  } else stats.name.kept++;

  // PART 6 — description (APPROVED only)
  const dd = selectProductDescription(p);
  if (dd.status === "APPROVED") {
    next.description = { ar: dd.reconstructedDescription.ar, en: dd.reconstructedDescription.en };
    touched.push("description");
    stats.description.applied++;
  } else stats.description.kept++;

  // PART 7 — benefits (APPROVED only)
  const bd = selectProductBenefits(p);
  if (bd.status === "APPROVED") {
    next.benefits = { ar: [...bd.reconstructedBenefits.ar], en: [...bd.reconstructedBenefits.en] };
    touched.push("benefits");
    stats.benefits.applied++;
  } else stats.benefits.kept++;

  // PART 8 — usage (APPROVED only)
  const ud = selectProductUsage(p);
  if (ud.status === "APPROVED") {
    next.usageInstructions = { ar: ud.reconstructedUsage.arParagraph, en: ud.reconstructedUsage.enParagraph };
    next.howToUseAr = [...ud.reconstructedUsage.arSteps];
    next.howToUse = [...ud.reconstructedUsage.enSteps];
    touched.push("usageInstructions", "howToUse", "howToUseAr");
    stats.usage.applied++;
  } else stats.usage.kept++;

  // PART 9 — pricing (all APPROVED; fake "-200 YER" originalPrice stripped)
  const pd = selectProductPricing(p);
  if (pd.status === "APPROVED") {
    if (pd.current.originalPrice !== undefined && pd.discountValidation.fakeBaseRule) {
      next.pricing = { price: pd.current.price, currency: "YER" };
      stats.pricing.strippedOriginalPrice++;
      touched.push("pricing");
    } else if (pd.current.discount !== undefined) {
      next.pricing = { price: pd.current.price, currency: "YER" };
      touched.push("pricing");
    } else {
      stats.pricing.kept++;
    }
    next.hasRealDiscount = false;
    next.discount = undefined;
  }

  // seoMetadata re-derived from the applied name/description (keywords preserved)
  if (touched.includes("name") || touched.includes("description")) {
    next.seoMetadata = {
      ...(p.seoMetadata ?? { keywords: [] }),
      title: { ar: `${next.name.ar} - Luminous Derma`, en: `${next.name.en} - Luminous Derma` },
      description: { ar: next.description.ar, en: next.description.en },
    };
    touched.push("seoMetadata");
    stats.seoMetadata.applied++;
  } else stats.seoMetadata.kept++;

  return { applied: next, touched };
}

// ── COMPUTE ALL (nothing written until every product succeeds) ─────────────
const appliedParts: Array<{ num: string; products: Product[] }> = [];
for (const part of parts) {
  const out: Product[] = [];
  for (const p of part.arr) {
    const { applied } = applyProduct(p);
    out.push(applied);
  }
  appliedParts.push({ num: part.num, products: out });
}

// ── WRITE (valid TS: one JSON object literal per product line) ─────────────
for (const part of appliedParts) {
  const header = `import type { Product } from "@/src/types/product";\n\nexport const productsPart${part.num}: Product[] = [\n`;
  const body = part.products.map((p) => `  ${JSON.stringify(p)},`).join("\n");
  const footer = `\n];\n`;
  const file = path.join(ROOT, "src", "data", `products-part-${part.num}.ts`);
  fs.writeFileSync(file, header + body + footer, "utf8");
  console.log(`wrote products-part-${part.num}.ts (${part.products.length} products)`);
}

console.log("\nAPPLICATION STATS:");
console.log(JSON.stringify(stats, null, 2));