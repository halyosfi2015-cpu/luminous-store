"use strict";
/* Phase 4.4 probe: verify heavy product data (descriptions/ingredients/howToUse/benefits/seo)
   does NOT appear in production client JS chunks (.next/static/chunks). */
const fs = require("fs");
const path = require("path");
const ts = require("C:/Users/user/Desktop/Luminous-Final Project Hamed final/node_modules/typescript");

const P = "C:/Users/user/Desktop/Luminous-Final Project Hamed final";
const src = fs.readFileSync(path.join(P, "src/data/products.ts"), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = { exports: {} };
const fn = new Function("exports", "module", "require", js);
fn(m.exports, m, () => { throw new Error("require not expected"); });
const { products } = m.exports;

/* Pick heavy-only fields that must NOT be in the slim summaries. */
const heavyFields = ["description", "ingredients", "howToUse", "benefits", "seoMetadata", "reviews"];
const probes = [];
for (const p of products) {
  for (const f of heavyFields) {
    const v = p[f];
    if (v !== undefined && v !== null) {
      const s = JSON.stringify(v);
      if (s.length > 40) probes.push(s.slice(0, 60));
    }
  }
}
/* Also grab a couple of long Arabic description strings specifically. */
for (const p of products) {
  if (p.description && p.description.ar && p.description.ar.length > 40) {
    probes.push(p.description.ar);
  }
}
const unique = [...new Set(probes)];
console.log("Heavy-data probe strings:", unique.length);

const chunkDir = path.join(P, ".next/static/chunks");
let leaked = [];
let scanned = 0;
for (const f of fs.readdirSync(chunkDir)) {
  if (!f.endsWith(".js")) continue;
  const content = fs.readFileSync(path.join(chunkDir, f), "utf8");
  scanned++;
  for (const probe of unique) {
    /* probe might contain characters that need escaping in JS literal; check raw containment */
    if (content.includes(probe)) {
      leaked.push({ file: f, probe: probe.slice(0, 80) });
    }
  }
}
console.log("Scanned chunks:", scanned);
if (leaked.length === 0) {
  console.log("PASS: no heavy product data found in any client chunk");
} else {
  console.log("LEAK FOUND:", leaked.length);
  for (const l of leaked.slice(0, 20)) console.log("  ", l.file, "->", l.probe);
}
