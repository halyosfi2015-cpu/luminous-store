/**
 * POST-APPLY ROOT-CAUSE FIXES — applied to the written catalog without touching
 * anything else (surgical string-level corrections of already-approved content).
 *
 * 1) DESCRIPTION grammar: "، يعمل على ينظف…" → "، يعمل على أن ينظف…"
 *    (root cause fixed in src/lib/product-description.ts:719).
 * 2) USAGE paragraph: run-on "step1 step2" → "step1، step2" only for the 2482
 *    APPROVED-and-applied products, re-joined from their stored howToUseAr steps
 *    (the exact approved steps). REVIEW/REJECTED usage stays byte-identical.
 *
 * Run with: npx tsx scripts/post-fix-descriptions-usage.ts
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

const stats = { descriptionFixed: 0, descriptionClean: 0, usageRejoined: 0, usageKept: 0 };

function fixProduct(p: Product): Product {
  const next: Product = { ...p };

  // 1) description grammar — " يعمل على <verb>" → " يعمل على أن <verb>"
  const ar = p.description?.ar ?? "";
  if (/ يعمل على (?=[يأتنسو])/.test(ar)) {
    next.description = { ar: ar.replace(/ يعمل على (?=[يأتنسو])/g, " يعمل على أن "), en: p.description?.en ?? "" };
    stats.descriptionFixed++;
  } else {
    stats.descriptionClean++;
  }

  // 2) usage paragraph — re-join the EXACT approved steps (stored howToUseAr)
  if (Array.isArray(p.howToUseAr) && p.howToUseAr.join(" ") === (p.usageInstructions?.ar ?? "").trim()) {
    next.usageInstructions = { ar: p.howToUseAr.join("، "), en: p.usageInstructions?.en ?? "" };
    stats.usageRejoined++;
  } else {
    stats.usageKept++;
  }

  return next;
}

const fixedParts: Array<{ num: string; products: Product[] }> = [];
for (const part of parts) fixedParts.push({ num: part.num, products: part.arr.map(fixProduct) });

for (const part of fixedParts) {
  const header = `import type { Product } from "@/src/types/product";\n\nexport const productsPart${part.num}: Product[] = [\n`;
  const body = part.products.map((p) => `  ${JSON.stringify(p)},`).join("\n");
  const footer = `\n];\n`;
  fs.writeFileSync(path.join(ROOT, "src", "data", `products-part-${part.num}.ts`), header + body + footer, "utf8");
  console.log(`wrote products-part-${part.num}.ts (${part.products.length} products)`);
}

console.log("\nPOST-FIX STATS:");
console.log(JSON.stringify(stats, null, 2));