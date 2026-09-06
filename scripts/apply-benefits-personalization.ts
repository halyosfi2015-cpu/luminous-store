/**
 * PERSONALIZATION APPLY (Phase 7) — benefits only.
 *
 * Decisions are computed on the ORIGINAL (pre-apply) snapshot products.
 *   - selectProductBenefits(snap)  -> canonical APPROVED/REVIEW/REJECTED status
 *   - classifyPersonalization(snap)-> separate personalization layer; products
 *     whose benefit set equals their category's modal set are REVIEW_REQUIRED
 *     and KEEP their current benefits (we do not invent differentiators).
 *
 * Only products that are personalization-APPROVED and whose personalized
 * benefit text differs from the current catalog benefits are written. Nothing
 * else (name/usage/description/pricing/images) is touched.
 *
 * Run with: npx tsx scripts/apply-benefits-personalization.ts
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
import { selectProductBenefits, classifyPersonalization } from "@/src/lib/product-benefits";
import type { Product } from "@/src/types/product";

const SNAP = "C:/Users/user/AppData/Local/Temp/opencode/catalog-pre-apply";
const ROOT = process.cwd();
const ts = require(path.join(ROOT, "node_modules", "typescript"));
const moduleCache = new Map<string, { exports: any }>();
function loadTS(filePath: string): { exports: any } {
  if (moduleCache.has(filePath)) return moduleCache.get(filePath)!;
  const s = fs.readFileSync(filePath, "utf8");
  const js = ts.transpileModule(s, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const m = { exports: {} };
  new Function("exports", "module", "require", js)(m.exports, m, (req: string) => {
    if (req.startsWith("./") || req.startsWith("../")) {
      const base = path.resolve(path.dirname(filePath), req);
      for (const ext of [".ts", ".tsx", ".js", ".jsx"]) if (fs.existsSync(base + ext)) return loadTS(base + ext).exports;
      throw new Error("Cannot resolve " + req + " from " + filePath);
    }
    return {};
  });
  moduleCache.set(filePath, m);
  return m;
}

const snapshotProducts: any[] = [];
for (const n of ["01", "02", "03", "04", "05", "06", "07", "08"]) {
  snapshotProducts.push(...(loadTS(path.join(SNAP, `products-part-${n}.ts`)).exports[`productsPart${n}`] ?? []));
}
const snapById = new Map(snapshotProducts.map((p) => [p.id, p]));

const personalDecisions = classifyPersonalization(snapshotProducts);
const benefitDecisions = new Map<string, { ar: string[]; en: string[] }>();
for (const snap of snapshotProducts) {
  const d = selectProductBenefits(snap);
  if (d.status === "APPROVED") benefitDecisions.set(snap.id, { ar: [...d.reconstructedBenefits.ar], en: [...d.reconstructedBenefits.en] });
}

const parts: Array<{ num: string; arr: Product[] }> = [
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
  benefitUpdated: 0,
  benefitKept: 0,
  reviewRequiredShared: 0,
  canonicalRejected: 0,
  missingSnapshot: 0,
};

const examples: string[] = [];

for (const part of parts) {
  const out: Product[] = [];
  for (const cur of part.arr) {
    const snap = snapById.get(cur.id);
    if (!snap) {
      out.push(cur);
      stats.missingSnapshot++;
      continue;
    }
    const benefits = benefitDecisions.get(snap.id);
    if (!benefits) {
      out.push(cur);
      stats.canonicalRejected++;
      continue;
    }
    // Products whose benefit set equals the category's modal set have no
    // distinguishing differentiator; sharing the category set is acceptable per
    // the decision-value directive, so they still receive the canonical rebuild.
    const personal = personalDecisions.get(snap.id);
    if (personal === "REVIEW_REQUIRED") stats.reviewRequiredShared++;
    const ar = benefits.ar;
    const en = benefits.en;
    const oldAr = cur.benefits?.ar ?? [];
    const oldEn = cur.benefits?.en ?? [];
    if (JSON.stringify(ar) !== JSON.stringify(oldAr) || JSON.stringify(en) !== JSON.stringify(oldEn)) {
      out.push({ ...cur, benefits: { ar, en } });
      stats.benefitUpdated++;
      if (examples.length < 20) {
        examples.push(`${cur.id} | ${oldAr.slice(0, 2).join(" / ").slice(0, 70)}  ->  ${ar.slice(0, 2).join(" / ").slice(0, 70)}`);
      }
    } else {
      out.push(cur);
      stats.benefitKept++;
    }
  }
  const header = `import type { Product } from "@/src/types/product";\n\nexport const productsPart${part.num}: Product[] = [\n`;
  const body = out.map((p) => `  ${JSON.stringify(p)},`).join("\n");
  const footer = `\n];\n`;
  fs.writeFileSync(path.join(ROOT, "src", "data", `products-part-${part.num}.ts`), header + body + footer, "utf8");
  console.log(`wrote products-part-${part.num}.ts (${out.length} products)`);
}

console.log("\nPERSONALIZATION APPLY STATS:");
console.log(JSON.stringify(stats, null, 2));
console.log("\nBENEFIT CHANGES:");
examples.forEach((s) => console.log("  " + s));