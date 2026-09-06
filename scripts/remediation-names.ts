/**
 * REMEDIATION ANALYSIS — names.
 * Runs the name decision pipeline on the ORIGINAL (pre-apply) snapshot products
 * and prints every REVIEW_REQUIRED / REJECTED case with full before/after.
 * Run with: npx tsx scripts/remediation-names.ts
 */

import fs from "fs";
import path from "path";
import { extractNameFacts, reconstructName, computeNameDecision } from "@/src/lib/product-name";
import { validateIdentity } from "@/src/lib/product-name";

const SNAP = "C:/Users/user/AppData/Local/Temp/opencode/catalog-pre-apply";
const ts = require("C:/Users/user/Desktop/Luminous-Final Project Hamed final/node_modules/typescript");
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

const products: any[] = [];
for (const n of ["01", "02", "03", "04", "05", "06", "07", "08"]) {
  const f = path.join(SNAP, `products-part-${n}.ts`);
  products.push(...(loadTS(f).exports[`productsPart${n}`] ?? []));
}

let review = 0, rejected = 0;
const rows: any[] = [];
for (const p of products) {
  const nf = extractNameFacts(p);
  const nm = reconstructName(p, nf);
  const nd = computeNameDecision(nf, nm, p.name);
  if (nd.status === "REVIEW_REQUIRED" || nd.status === "REJECTED") {
    nd.status === "REJECTED" ? rejected++ : review++;
    rows.push({
      id: p.id, status: nd.status, brand: p.brand,
      orig: p.name.ar, cand: nm.ar,
      reasons: nd.reasons.slice(0, 3),
    });
  }
}
console.log(`NAME REVIEW=${review} REJECTED=${rejected} (total=${review + rejected})`);
for (const r of rows) {
  console.log(`\n[${r.status}] ${r.id} | ${r.brand}`);
  console.log(`  ORIG : ${r.orig.slice(0, 120)}`);
  console.log(`  CAND : ${r.cand.slice(0, 120)}`);
  console.log(`  WHY  : ${r.reasons.join(" ; ")}`);
}