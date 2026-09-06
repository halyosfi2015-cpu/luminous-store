/**
 * POST-APPLICATION DIFF — compares the applied catalog (src/data) against the
 * pre-apply snapshot (Temp/opencode/catalog-pre-apply) field by field.
 * Run with: npx tsx scripts/post-apply-diff.ts
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SNAP = "C:/Users/user/AppData/Local/Temp/opencode/catalog-pre-apply";

const ts = require("C:/Users/user/Desktop/Luminous-Final Project Hamed final/node_modules/typescript");

const moduleCache = new Map<string, { exports: any }>();
function loadTS(filePath: string): { exports: any } {
  if (moduleCache.has(filePath)) return moduleCache.get(filePath)!;
  const s = fs.readFileSync(filePath, "utf8");
  const js = ts.transpileModule(s, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const m = { exports: {} };
  const fn = new Function("exports", "module", "require", js);
  fn(m.exports, m, (req: string) => {
    if (req.startsWith("./") || req.startsWith("../")) {
      const base = path.resolve(path.dirname(filePath), req);
      for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
        if (fs.existsSync(base + ext)) return loadTS(base + ext).exports;
      }
      throw new Error("Cannot resolve " + req + " from " + filePath);
    }
    return {};
  });
  moduleCache.set(filePath, m);
  return m;
}

function loadParts(dir: string) {
  const out = [];
  for (const n of ["01", "02", "03", "04", "05", "06", "07", "08"]) {
    const f = path.join(dir, `products-part-${n}.ts`);
    if (!fs.existsSync(f)) continue;
    const mod = loadTS(f);
    const key = `productsPart${n}`;
    out.push(...(mod.exports[key] ?? []));
  }
  return out;
}

const before = new Map();
for (const p of loadParts(SNAP)) before.set(p.id, p);
const after = new Map();
for (const p of loadParts(path.join(ROOT, "src", "data"))) after.set(p.id, p);

const diff = {
  beforeCount: before.size,
  afterCount: after.size,
  idsChanged: 0,
  slugsChanged: 0,
  nameChanged: 0,
  nameUnchanged: 0,
  descriptionChanged: 0,
  benefitsChanged: 0,
  usageChanged: 0,
  howToUseChanged: 0,
  pricingOriginalPriceRemoved: 0,
  pricingOriginalPriceKept: 0,
  pricingPriceChanged: 0,
  galleryChanged: 0,
  ingredientsChanged: 0,
  ratingChanged: 0,
  otherMetadataChanged: 0,
};

for (const [id, b] of before) {
  const a = after.get(id);
  if (!a) { console.log("  MISSING in after: " + id); continue; }
  if (b.id !== a.id) diff.idsChanged++;
  if (b.slug !== a.slug) diff.slugsChanged++;

  if (JSON.stringify(b.name) !== JSON.stringify(a.name)) diff.nameChanged++;
  else diff.nameUnchanged++;

  if (JSON.stringify(b.description) !== JSON.stringify(a.description)) diff.descriptionChanged++;
  if (JSON.stringify(b.benefits) !== JSON.stringify(a.benefits)) diff.benefitsChanged++;
  if (JSON.stringify(b.usageInstructions) !== JSON.stringify(a.usageInstructions)) diff.usageChanged++;
  if (JSON.stringify(b.howToUse ?? []) !== JSON.stringify(a.howToUse ?? [])) diff.howToUseChanged++;

  if ((b.pricing?.originalPrice ?? undefined) !== undefined && (a.pricing?.originalPrice ?? undefined) === undefined) diff.pricingOriginalPriceRemoved++;
  if ((b.pricing?.originalPrice ?? undefined) !== undefined && (a.pricing?.originalPrice ?? undefined) !== undefined) diff.pricingOriginalPriceKept++;
  if (b.pricing?.price !== a.pricing?.price) diff.pricingPriceChanged++;

  if (JSON.stringify(b.gallery) !== JSON.stringify(a.gallery)) diff.galleryChanged++;
  if (JSON.stringify(b.ingredients) !== JSON.stringify(a.ingredients)) diff.ingredientsChanged++;
  if (b.rating !== a.rating || b.reviewCount !== a.reviewCount) diff.ratingChanged++;
}

console.log("BEFORE vs AFTER DIFF:");
console.log(JSON.stringify(diff, null, 2));
console.log(`before=${before.size} after=${after.size} (both = ${before.size === after.size && after.size === 2764})`);