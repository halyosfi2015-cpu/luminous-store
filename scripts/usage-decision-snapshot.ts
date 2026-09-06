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
  products.push(...(loadTS(path.join(SNAP, `products-part-${n}.ts`)).exports[`productsPart${n}`] ?? []));
}

const counts = { APPROVED: 0, REVIEW_REQUIRED: 0, REJECTED: 0 };
const reasonGroups: Record<string, { count: number; sample: string }> = {};
const recoverSamples: string[] = [];
for (const p of products) {
  const r = selectProductUsage(p);
  counts[r.status]++;
  if (r.status !== "APPROVED") {
    const key = r.reviewReasons[0]?.split(" — ")[0] ?? "?";
    const g = (reasonGroups[key] ??= { count: 0, sample: "" });
    g.count++;
    if (!g.sample) g.sample = `${p.id}|${p.categorySlug}|${(p.usageInstructions?.ar ?? "").slice(0, 60)}`;
  } else if (r.reviewReasons[0]?.includes("independently structured") && /اتبعه|العبوه/.test(r.originalUsage ?? "")) {
    recoverSamples.push(`PACKAGING ${p.id} ${(r.originalUsage ?? "").slice(0, 40)}`);
  }
}
console.log("=== snapshot usage decisions ===");
console.log(JSON.stringify(counts));
for (const [k, v] of Object.entries(reasonGroups).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`${v.count}\t${k}\n        ${v.sample}`);
}
console.log("packaging-recovered:", recoverSamples.length);
recoverSamples.slice(0, 5).forEach((s) => console.log("  " + s));

// List the recovered candidates for the deodorant/mixing clusters
for (const id of ["yq-70", "yq-714", "yq-210", "yq-413"]) {
  const p = products.find((x) => x.id === id);
  if (!p) continue;
  const r = selectProductUsage(p);
  console.log(`RECOVER ${id} -> ${r.status} | ${JSON.stringify(r.reconstructedUsage?.arSteps)}`);
}