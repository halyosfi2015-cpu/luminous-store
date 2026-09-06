import fs from "fs";
import path from "path";
import { extractUsageFacts } from "@/src/lib/product-usage";

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

const hasAnyFact = (f: any) => (f.prep || f.applyArea || f.applyMethod || f.amount || f.frequency || f.timeOfDay || f.waiting || f.rinse || f.reapply || f.order || f.warning || f.storage);
const norm = (s: string) => s.replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[أإآ]/g, "ا").replace(/\s+/g, " ").trim();
const clusters: Record<string, { count: number; cats: Set<string>; sample: string }> = {};
let review = 0;
for (const p of products) {
  const f = extractUsageFacts(p);
  if (hasAnyFact(f)) continue;
  review++;
  const t = norm((p.usageInstructions?.ar ?? "").trim());
  let key = "other/editorial";
  if (/اسنان|الفرشاه/.test(t)) key = "brushing";
  else if (/ابط|الابطين/.test(t)) key = "deodorant";
  else if (/جففي الشعر|حمايه حراريه|الجهاز/.test(t)) key = "hair-tool";
  else if (/تحت العين|فوق العيوب|الجفون|الرموش|الشفرات/.test(t)) key = "makeup-eye";
  else if (/الحواجب/.test(t)) key = "brow";
  else if (/الفرشاه|اسفنجه|بودره|البرونزر/.test(t)) key = "makeup-tool";
  else if (/علي حسب|بحسب|تعليمات الاستخدام|العبوه/.test(t)) key = "generic";
  const c = (clusters[key] ??= { count: 0, cats: new Set(), sample: t.slice(0, 60) });
  c.count++;
  c.cats.add(p.categorySlug ?? "?");
}
console.log("snapshot review:", review);
for (const [k, v] of Object.entries(clusters).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`${v.count}\t${k}\t[${[...v.cats].slice(0, 6).join(",")}]\t"${v.sample}"`);
}