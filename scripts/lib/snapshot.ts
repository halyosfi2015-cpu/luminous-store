/**
 * Shared loader for the ORIGINAL (pre-apply) catalog snapshot.
 *
 * Decision pipelines (name/description/benefits/usage) compare a candidate
 * against the stored field, so running them on the APPLIED catalog is circular.
 * This loader exposes the untouched original catalog for the verify/audit
 * sections that must reflect pre-apply decision inputs.
 */

import fs from "fs";
import path from "path";
import type { Product } from "@/src/types/product";

const SNAP_DIR = "C:/Users/user/AppData/Local/Temp/opencode/catalog-pre-apply";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ts = require(path.join(process.cwd(), "node_modules", "typescript"));

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

export function loadSnapshotCatalog(): Product[] {
  const out: Product[] = [];
  for (const n of ["01", "02", "03", "04", "05", "06", "07", "08"]) {
    const file = path.join(SNAP_DIR, `products-part-${n}.ts`);
    if (!fs.existsSync(file)) throw new Error("Snapshot missing: " + file);
    out.push(...(loadTS(file).exports[`productsPart${n}`] ?? []));
  }
  return out;
}