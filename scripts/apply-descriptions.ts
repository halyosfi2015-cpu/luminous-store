/**
 * DESCRIPTION APPLY — writes the full Luminous description (ar/en) into the real catalog.
 *
 * Decisions are computed on the ORIGINAL (pre-apply) snapshot so originality
 * validators compare against the untouched source text (circularity rule).
 * Only the `description` field is touched; everything else is preserved.
 *
 * Run with: npx tsx scripts/apply-descriptions.ts
 * Then:     node %TEMP%\opencode\rebuild-backup.cjs
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
import { selectProductDescription } from "@/src/lib/product-description";
import type { Product } from "@/src/types/product";

const SNAP = "C:/Users/user/AppData/Local/Temp/opencode/catalog-pre-apply";
const ROOT = process.cwd();
// eslint-disable-next-line @typescript-eslint/no-var-requires
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

const stats = { updated: 0, kept: 0, review: 0, rejected: 0, missingSnapshot: 0 };
const examples: string[] = [];

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
    const dd = selectProductDescription(snap);
    if (dd.status !== "APPROVED") {
      out.push(cur);
      if (dd.status === "REVIEW_REQUIRED") stats.review++;
      else stats.rejected++;
      continue;
    }
    const ar = dd.reconstructedDescription.ar;
    const en = dd.reconstructedDescription.en;
    if (ar !== (cur.description?.ar ?? "") || en !== (cur.description?.en ?? "")) {
      out.push({ ...cur, description: { ar, en } });
      stats.updated++;
      if (examples.length < 8) examples.push(`${cur.id} | ${(cur.description?.ar ?? "").slice(0, 60)}  ->  ${ar.slice(0, 60)}`);
    } else {
      out.push(cur);
      stats.kept++;
    }
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

console.log("\nDESCRIPTION APPLY STATS:");
console.log(JSON.stringify(stats, null, 2));
console.log("\nDESCRIPTION CHANGES:");
examples.forEach((s) => console.log("  " + s));