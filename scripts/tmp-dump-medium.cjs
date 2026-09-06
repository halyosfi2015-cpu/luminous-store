/* Dump first N eligible MEDIUM matches with full context for final review */
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();

function loadPart(i) {
  const src = fs.readFileSync(path.join(ROOT, `src/data/products-part-0${i}.ts`), "utf8");
  return JSON.parse(src.slice(src.indexOf("["), src.lastIndexOf("]") + 1));
}
const catalog = [];
for (let i = 1; i <= 8; i++) catalog.push(...loadPart(i));
const byId = new Map(catalog.map((p) => [p.id, p]));

const audit = JSON.parse(fs.readFileSync("src/data/content/outlet-matching/application-audit.json", "utf8"));
const highApplied = new Set(audit.records.map((r) => r.luminous_id));

const med = JSON.parse(fs.readFileSync("src/data/content/outlet-matching/medium-confidence-matches.json", "utf8"));

const TAKE = parseInt(process.argv[2] || "20", 10);
const lines = [];
const log = (...a) => lines.push(a.join(" "));

log("TOTAL_MEDIUM:", med.matches.length, "| HIGH_APPLIED:", highApplied.size);
log("");

let taken = 0;
for (let idx = 0; idx < med.matches.length && taken < TAKE; idx++) {
  const m = med.matches[idx];
  if (m.previously_applied) continue;
  if (highApplied.has(m.luminous_id)) continue;
  const p = byId.get(m.luminous_id);
  if (!p) { log("!! MISSING CATALOG:", m.luminous_id); continue; }
  taken++;

  log(`========== [${taken}] ${m.luminous_id} ==========`);
  log("NAME_AR   :", p?.name?.ar);
  log("BRAND     :", p?.brand, "| CAT:", p?.categorySlug || p?.category, "| PRICE:", p?.pricing?.price);
  log("SIGNALS   : type=" + m.signals.product_type_match + " size=" + m.signals.exact_size_match +
      " jac=" + m.signals.name_jaccard + " cont=" + m.signals.containment + " score=" + m.signals.composite_score);
  log("OUTLET_AR :", m.outlet_nameAr);
  log("OUT_DESC  :", (m.proposed_content.description_ar || "").slice(0, 320));
  log("OUT_BENES :", (m.proposed_content.benefits_ar || []).length ? m.proposed_content.benefits_ar.join(" | ").slice(0, 380) : "(none)");
  log("OUT_USAGE :", (m.proposed_content.usage_ar || "").slice(0, 180));
  log("OLD_DESC  :", (p?.description?.ar || "").slice(0, 180));
  log("");
}
if (taken < TAKE) log("(only", taken, "eligible available)");

fs.writeFileSync(path.join(ROOT, "scripts/_medium20-dump.txt"), lines.join("\n") + "\n", "utf8");
console.log("WROTE scripts/_medium20-dump.txt | taken:", taken);
