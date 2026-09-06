/**
 * REMEDIATION APPLY — names + usage + descriptions + benefits.
 *
 * Decisions are computed on the ORIGINAL (pre-apply) snapshot products so the
 * originality validators compare against the untouched source text (running
 * them on the applied catalog is circular). Only APPROVED results are written,
 * and only when the candidate differs from the current catalog field.
 *
 * Applied fields: name (+ seoMetadata), usageInstructions/howToUse/howToUseAr,
 * description (ar/en) and benefits (ar/en).
 * Pricing and images are NOT touched here (no changes approved).
 *
 * Run with: npx tsx scripts/apply-remediation.ts
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
import { selectProductUsage } from "@/src/lib/product-usage";
import { selectProductDescription } from "@/src/lib/product-description";
import { selectProductBenefits } from "@/src/lib/product-benefits";
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
  nameUpdated: 0,
  nameKept: 0,
  nameReview: 0,
  nameRejected: 0,
  usageUpdated: 0,
  usageKept: 0,
  usageReview: 0,
  usageRejected: 0,
  descriptionUpdated: 0,
  descriptionKept: 0,
  descriptionReview: 0,
  descriptionRejected: 0,
  benefitUpdated: 0,
  benefitKept: 0,
  benefitReview: 0,
  benefitRejected: 0,
  missingSnapshot: 0,
};

const examples: Record<string, string[]> = { name: [], usage: [], description: [], benefit: [] };

function remediateProduct(cur: Product, snap: any): { applied: Product; touched: string[] } {
  const touched: string[] = [];
  const next: Product = {
    ...cur,
    name: { ...cur.name },
    usageInstructions: { ...cur.usageInstructions },
    description: { ...cur.description },
    benefits: { ar: [...(cur.benefits?.ar ?? [])], en: [...(cur.benefits?.en ?? [])] },
  };

  // ── NAMES ────────────────────────────────────────────────────────────────
  const nf = extractNameFacts(snap);
  const nm = reconstructName(snap, nf);
  const nd = computeNameDecision(nf, nm, snap.name);
  if (nd.status === "APPROVED") {
    if (nm.ar !== cur.name.ar || nm.en !== cur.name.en) {
      next.name = { ar: nm.ar, en: nm.en };
      next.seoMetadata = {
        ...(cur.seoMetadata ?? { keywords: [] }),
        title: { ar: `${nm.ar} - Luminous Derma`, en: `${nm.en} - Luminous Derma` },
      };
      touched.push("name", "seoMetadata");
      stats.nameUpdated++;
      if (examples.name.length < 8) examples.name.push(`${cur.id} | ${cur.name.ar.slice(0, 60)}  ->  ${nm.ar.slice(0, 60)}`);
    } else stats.nameKept++;
  } else if (nd.status === "REVIEW_REQUIRED") stats.nameReview++;
  else stats.nameRejected++;

  // ── USAGE ────────────────────────────────────────────────────────────────
  const ud = selectProductUsage(snap);
  if (ud.status === "APPROVED") {
    const ar = ud.reconstructedUsage!.arParagraph;
    const en = ud.reconstructedUsage!.enParagraph;
    if (ar !== (cur.usageInstructions?.ar ?? "") || en !== (cur.usageInstructions?.en ?? "")) {
      next.usageInstructions = { ar, en };
      next.howToUseAr = [...ud.reconstructedUsage!.arSteps];
      next.howToUse = [...ud.reconstructedUsage!.enSteps];
      touched.push("usageInstructions", "howToUse", "howToUseAr");
      stats.usageUpdated++;
      if (examples.usage.length < 8) examples.usage.push(`${cur.id} | ${(cur.usageInstructions?.ar ?? "").slice(0, 55)}  ->  ${ar.slice(0, 55)}`);
    } else stats.usageKept++;
  } else if (ud.status === "REVIEW_REQUIRED") stats.usageReview++;
  else stats.usageRejected++;

  // ── DESCRIPTION ──────────────────────────────────────────────────────────
  const dd = selectProductDescription(snap);
  if (dd.status === "APPROVED") {
    const ar = dd.reconstructedDescription.ar;
    const en = dd.reconstructedDescription.en;
    if (ar !== (cur.description?.ar ?? "") || en !== (cur.description?.en ?? "")) {
      next.description = { ar, en };
      touched.push("description");
      stats.descriptionUpdated++;
      if (examples.description.length < 8) examples.description.push(`${cur.id} | ${(cur.description?.ar ?? "").slice(0, 60)}  ->  ${ar.slice(0, 60)}`);
    } else stats.descriptionKept++;
  } else if (dd.status === "REVIEW_REQUIRED") stats.descriptionReview++;
  else stats.descriptionRejected++;

  // ── BENEFITS ─────────────────────────────────────────────────────────────
  const bd = selectProductBenefits(snap);
  if (bd.status === "APPROVED") {
    const ar = [...bd.reconstructedBenefits.ar];
    const en = [...bd.reconstructedBenefits.en];
    const oldAr = cur.benefits?.ar ?? [];
    const oldEn = cur.benefits?.en ?? [];
    if (JSON.stringify(ar) !== JSON.stringify(oldAr) || JSON.stringify(en) !== JSON.stringify(oldEn)) {
      next.benefits = { ar, en };
      touched.push("benefits");
      stats.benefitUpdated++;
      if (examples.benefit.length < 8) examples.benefit.push(`${cur.id} | ${oldAr.slice(0, 2).join(" / ").slice(0, 60)}  ->  ${ar.slice(0, 2).join(" / ").slice(0, 60)}`);
    } else stats.benefitKept++;
  } else if (bd.status === "REVIEW_REQUIRED") stats.benefitReview++;
  else stats.benefitRejected++;

  return { applied: next, touched };
}

// ── COMPUTE ALL ────────────────────────────────────────────────────────────
const output: Array<{ num: string; products: Product[] }> = [];
for (const part of parts) {
  const out: Product[] = [];
  for (const cur of part.arr) {
    const snap = snapById.get(cur.id);
    if (!snap) {
      out.push(cur);
      stats.missingSnapshot++;
      continue;
    }
    const { applied } = remediateProduct(cur, snap);
    out.push(applied);
  }
  output.push({ num: part.num, products: out });
}

// ── WRITE ──────────────────────────────────────────────────────────────────
for (const part of output) {
  const header = `import type { Product } from "@/src/types/product";\n\nexport const productsPart${part.num}: Product[] = [\n`;
  const body = part.products.map((p) => `  ${JSON.stringify(p)},`).join("\n");
  const footer = `\n];\n`;
  const file = path.join(ROOT, "src", "data", `products-part-${part.num}.ts`);
  fs.writeFileSync(file, header + body + footer, "utf8");
  console.log(`wrote products-part-${part.num}.ts (${part.products.length} products)`);
}

console.log("\nREMEDIATION STATS:");
console.log(JSON.stringify(stats, null, 2));
for (const [k, arr] of Object.entries(examples)) {
  console.log(`\n${k.toUpperCase()} CHANGES:`);
  arr.forEach((s) => console.log("  " + s));
}