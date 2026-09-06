import fs from "fs";
import path from "path";
import { extractNameFacts, reconstructName } from "@/src/lib/product-name";

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
const snaps: any[] = [];
for (const n of ["01", "02", "03", "04", "05", "06", "07", "08"]) snaps.push(...(loadTS(path.join(SNAP, `products-part-${n}.ts`)).exports[`productsPart${n}`] ?? []));

let n = 0;
for (const s of snaps) {
  if (!/[%٪]/.test(s.name.ar)) continue;
  const nf = extractNameFacts(s);
  const nm = reconstructName(s, nf);
  if (nm.ar !== s.name.ar) {
    n++;
    console.log(`${s.id} | ORIG: ${s.name.ar.slice(0, 85)}`);
    console.log(`    CAND: ${nm.ar.slice(0, 85)}`);
  }
}
console.log("changed-with-%:", n);