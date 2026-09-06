/**
 * REMEDIATION ANALYSIS — usage.
 * Runs the usage decision pipeline on ORIGINAL (pre-apply) snapshot products.
 * Run with: npx tsx scripts/remediation-usage.ts
 */

import fs from "fs";
import path from "path";
import { selectProductUsage } from "@/src/lib/product-usage";

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
  const d = selectProductUsage(p);
  if (d.status === "REVIEW_REQUIRED" || d.status === "REJECTED") {
    d.status === "REJECTED" ? rejected++ : review++;
    rows.push({ id: p.id, status: d.status, name: p.name.ar, reasons: (d.reviewReasons ?? []).slice(0, 4) });
  }
}
console.log(`USAGE REVIEW=${review} REJECTED=${rejected} (total=${review + rejected})`);
const byReason: Record<string, number> = {};
for (const r of rows) {
  for (const re of r.reasons) {
    const key = re.split(":")[0].slice(0, 50);
    byReason[key] = (byReason[key] || 0) + 1;
  }
}
console.log("\nREASON BREAKDOWN:");
for (const [k, v] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) console.log(`  ${v}\t${k}`);