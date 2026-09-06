/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Product Content Reconciliation — Outlet ↔ Luminous Matching Pipeline
 * READ-ONLY against the catalog: produces staged match lists + numeric report.
 * No product files are modified here.
 *
 * HIGH confidence requires ALL of: mapped brand + same Arabic product-type +
 * exact size match + strong name-token overlap. Name alone is never a source.
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "src", "data", "content", "outlet-matching");

/* ── load ─────────────────────────────────────────────── */
function loadPart(i) {
  const src = fs.readFileSync(path.join(ROOT, "src/data/products-part-0" + i + ".ts"), "utf8");
  return JSON.parse(src.slice(src.indexOf("["), src.lastIndexOf("]") + 1));
}
function loadJson(f) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8").replace(/^\uFEFF/, ""));
}

const catalog = [];
for (let i = 1; i <= 8; i++) catalog.push(...loadPart(i));
const outlet = JSON.parse(fs.readFileSync(path.join(ROOT, "outlet_products_data.json"), "utf8"));
let brandSeed = {};
try { brandSeed = loadJson("matched_outlet_brands.json"); } catch {}
let prevMatches = null;
try { prevMatches = loadJson("outlet_content_matches.json"); } catch {}

/* ── Arabic normalization ─────────────────────────────── */
function normalizeAr(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s%+.×x]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "من","مع","لل","الى","على","في","و","او","ل","ب","كما","يوميا","يوما",
  "عبوه","علبه","عبوة","حجم","the","for","with","and","of","by","new","pack",
]);

function tokenize(s) {
  return normalizeAr(s)
    .split(" ")
    .map((t) => t.replace(/^ال/, ""))
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

/* ── size extraction ──────────────────────────────────── */
function extractSize(raw) {
  const s = normalizeAr(raw);
  const out = {};
  let m;
  m = s.match(/(\d+(?:[.,]\d+)?)\s*(مل|ml|مليتر)/);
  if (m) out.ml = parseFloat(m[1].replace(",", "."));
  m = s.match(/(\d+(?:[.,]\d+)?)\s*(جرام|جم|غ|g)\b/);
  if (m) out.g = parseFloat(m[1].replace(",", "."));
  m = s.match(/(\d+(?:[.,]\d+)?)\s*(كجم|kg)/);
  if (m) out.g = parseFloat(m[1].replace(",", ".")) * 1000;
  m = s.match(/(?:كبسوله|كبسولات|قرص|اقراص|تابلت|قطعه|قطع|تحريه)\s*(\d{1,4})\b/);
  if (!m) m = s.match(/\b(\d{1,4})\s*(?:كبسوله|كبسولات|قرص|اقراص|تابلت|قطعه|قطع|تحريه)\b/);
  if (m) out.count = parseInt(m[1], 10);
  m = s.match(/(\d{1,2})\s*[x×]\s*(\d{1,4})/);
  if (m) out.pack = [parseInt(m[1], 10), parseInt(m[2], 10)];
  m = s.match(/\bspf\s*(\d{2,3})\b/);
  if (m) out.spf = parseInt(m[1], 10);
  return out;
}
function sizeEqual(a, b) {
  const keys = ["ml", "g", "count", "spf"];
  let compared = 0;
  for (const k of keys) {
    if (a[k] !== undefined && b[k] !== undefined) {
      compared++;
      if (a[k] !== b[k]) return false;
    }
  }
  if (a.pack && b.pack) {
    compared++;
    if (a.pack[0] !== b.pack[0] || a.pack[1] !== b.pack[1]) return false;
  }
  return compared > 0;
}
function sizeConflict(a, b) {
  for (const k of ["ml", "g", "count"]) {
    if (a[k] !== undefined && b[k] !== undefined && a[k] !== b[k]) return true;
  }
  return false;
}

/* ── product-type lexicon (Arabic-first) ──────────────── */
const TYPES = [
  ["sunscreen", "واقي شمس|حمايه من الشمس|سن سكرين|sunscreen"],
  ["toothpaste", "معجون اسنان|معجون"],
  ["mouthwash", "غسول الفم|غسول فم"],
  ["toothbrush", "فرشاه اسنان|فرشاه"],
  ["shampoo", "شامبو"],
  ["hair-conditioner", "بلسم الشعر|بلسم"],
  ["hair-mask", "ماسك الشعر|قناع الشعر|ماسك|قناع"],
  ["serum", "سيروم"],
  ["facial-cleanser", "غسول وجه|غسول|منظف|فوم"],
  ["toner", "تونر"],
  ["exfoliator", "مقشر|سكرب"],
  ["deodorant", "مزيل عرق|ديودورانت|ديورانت|رول اون"],
  ["perfume", "عطر|او دي بارفان|او دي تواليت|بارفان|مسك"],
  ["bakhoor", "بخور|عود معطر|معمول"],
  ["razor", "شفره|شفرات|ماكينه حلاقه|موس"],
  ["supplement", "فيتامين|مكمل غذائي|مكمل|اوميجا|كولاجين|زنك|مالتي فيتامين"],
  ["lip-care", "بلسم شفاه|مرطب شفاه|بالم"],
  ["hand-sanitizer", "معقم"],
  ["body-wash", "جل استحمام|جلس"],
  ["lotion", "لوشن"],
  ["cream", "كريم"],
  ["oil", "زيت"],
  ["gel", "جل"],
  ["spray", "سبراي|بخاخ"],
  ["soap", "صابون"],
  ["wipes", "مناديل|وايبس"],
  ["powder", "بودره"],
  ["capsules", "كبسوله|كبسولات|قرص|اقراص|تابلت"],
];
const TYPE_RE = TYPES.map(([k, p]) => {
  const parts = p.split("|").map((x) => x.trim()).filter(Boolean);
  return [k, new RegExp("(?:^| )(?:عطر |)?(?:" + parts.join("|") + ")(?: |$)")];
});
function detectType(normText) {
  for (const [k, re] of TYPE_RE) if (re.test(normText)) return k;
  return null;
}

/* ── brand lexicon ────────────────────────────────────── */
function slugifyEn(b) {
  return String(b || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
const arToEn = new Map();
const enSet = new Map();
for (const p of catalog) {
  const en = String(p.brand || "").trim();
  if (!en) continue;
  const canon = en.toLowerCase();
  enSet.set(canon, en);
  if (p.brandAr) {
    const ar = normalizeAr(p.brandAr);
    if (ar && !arToEn.has(ar)) arToEn.set(ar, canon);
  }
  arToEn.set(normalizeAr(en), canon);
}
for (const [slug, arName] of Object.entries(brandSeed)) {
  if (!arName) continue;
  const ar = normalizeAr(arName);
  const enCanon = enSet.has(slug) ? slug : [...enSet.keys()].find((e) => slugifyEn(e) === slug);
  if (ar && enCanon && !arToEn.has(ar)) arToEn.set(ar, enCanon);
}

/* curated Arabic <-> Latin brand families (members verified in catalog) */
const BRAND_FAMILIES = [
  { canonical: "nivea", members: ["Nivea"], aliases: ["نيفيا", "نيفيه"] },
  { canonical: "johnson's", members: ["Johnson's"], aliases: ["جونسون", "جونسونز", "جونسون بابي"] },
  { canonical: "dove", members: ["Dove", "دوف"], aliases: [] },
  { canonical: "garnier", members: ["Garnier", "غارنييه"], aliases: ["غارنير"] },
  { canonical: "vaseline", members: ["Vaseline", "فازلين"], aliases: ["ڤازلين"] },
  { canonical: "lux", members: ["Lux", "لوكس"], aliases: [] },
  { canonical: "oral-b", members: ["Oral-B"], aliases: ["اورال بي", "أورال بي", "اورال-بي"] },
  { canonical: "beesline", members: ["Beesline", "بيزلين"], aliases: ["بيزلاين"] },
  { canonical: "l'oreal paris", members: ["L'Oreal Paris", "L'Oréal", "لوريال"], aliases: ["لوريال باريس"] },
  { canonical: "maybelline", members: ["Maybelline", "ميبيلين"], aliases: ["مايبلين"] },
  { canonical: "bioderma", members: ["Bioderma"], aliases: ["بيوديرما"] },
  { canonical: "la roche-posay", members: ["La Roche-Posay"], aliases: ["لاروش بوزيه", "لا روش بوزيه"] },
  { canonical: "eucerin", members: ["Eucerin"], aliases: ["اويسرين", "يوسرين", "ايسرين"] },
  { canonical: "vichy", members: ["Vichy"], aliases: ["فيشي"] },
  { canonical: "avene", members: ["Avene"], aliases: ["افين", "أفين"] },
  { canonical: "cetaphil", members: ["Cetaphil"], aliases: ["سيتافيل", "سيتابيل"] },
  { canonical: "sebamed", members: ["Sebamed"], aliases: ["سيباميد"] },
  { canonical: "neutrogena", members: ["Neutrogena"], aliases: ["نيوتروجينا"] },
  { canonical: "some by mi", members: ["Some By Mi"], aliases: ["سوم باي مي"] },
  { canonical: "st. ives", members: ["St. Ives"], aliases: ["سانت ايفز"] },
  { canonical: "now foods", members: ["NOW Foods", "ناو"], aliases: ["ناو فودز"] },
  { canonical: "centrum", members: ["Centrum"], aliases: ["سنترم"] },
  { canonical: "cerave", members: ["CeraVe"], aliases: ["سيرافي", "سي رايف"] },
  { canonical: "farm stay", members: ["Farm Stay", "فارم ستاي"], aliases: [] },
  { canonical: "scala", members: ["Scala", "سكالا"], aliases: [] },
];

const slugIndex = new Map();
for (const k of enSet.keys()) slugIndex.set(slugifyEn(k), k);

const FAMILY_MEMBERS = new Map();
const unresolvedAliasTargets = [];

function resolveMember(name) {
  return enSet.get(String(name).toLowerCase()) || slugIndex.get(slugifyEn(name)) || null;
}

for (const fam of BRAND_FAMILIES) {
  const members = [];
  for (const m of fam.members) {
    const r = resolveMember(m);
    if (r) members.push(r);
  }
  if (!members.length) {
    const alt = [...enSet.keys()].find((k) => k.includes(fam.canonical.toLowerCase().replace(/[^a-z0-9]/g, "")));
    if (alt) members.push(alt);
  }
  if (!members.length) {
    unresolvedAliasTargets.push(fam.canonical);
    continue;
  }
  FAMILY_MEMBERS.set(fam.canonical, members);
  for (const m of members) {
    const nm = normalizeAr(m);
    if (nm) arToEn.set(nm, fam.canonical);
  }
  for (const a of fam.aliases) {
    const na = normalizeAr(a);
    if (na) arToEn.set(na, fam.canonical);
  }
}

function extractOutletBrand(nameAr) {
  const toks = normalizeAr(nameAr).split(" ");
  for (let len = Math.min(4, toks.length); len >= 1; len--) {
    const cand = toks.slice(0, len).join(" ");
    const hit = arToEn.get(cand);
    if (hit) return { target: hit, ar: cand, tokenLen: len };
  }
  return null;
}

function familyOf(target) {
  if (FAMILY_MEMBERS.has(target)) return FAMILY_MEMBERS.get(target);
  for (const [, members] of FAMILY_MEMBERS) {
    if (members.includes(target)) return members;
  }
  return [target];
}

/* ── already-applied detection ────────────────────────── */
const outletPrefix40 = new Set();
const outletPrefix25 = new Set();
for (const o of outlet) {
  const d = normalizeAr(o.description);
  if (d.length > 30) {
    outletPrefix40.add(d.slice(0, 40));
    outletPrefix25.add(d.slice(0, 25));
  }
}
const previouslyApplied = new Set();
for (const p of catalog) {
  const d = normalizeAr(p.description?.ar);
  if (!d) continue;
  if (outletPrefix40.has(d.slice(0, 40)) || outletPrefix25.has(d.slice(0, 25))) {
    previouslyApplied.add(p.id);
  }
}
if (prevMatches?.matches) {
  for (const m of prevMatches.matches) {
    const lum = catalog.find((c) => c.id === m.luminous_id);
    if (!lum) continue;
    const a = tokenize(lum.description?.ar);
    const b = tokenize(m.outlet_description);
    let inter = 0;
    for (const t of a) if (b.includes(t)) inter++;
    const ov = a.length ? inter / Math.min(a.length, b.length || 1) : 0;
    if (ov >= 0.55) previouslyApplied.add(lum.id);
  }
}

/* ── matching ─────────────────────────────────────────── */
const catalogByBrand = new Map();
for (const p of catalog) {
  const b = String(p.brand || "").toLowerCase().trim();
  if (!b) continue;
  if (!catalogByBrand.has(b)) catalogByBrand.set(b, []);
  catalogByBrand.get(b).push(p);
}

function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}
function containment(a, b) {
  const small = a.length <= b.length ? a : b;
  const big = a.length <= b.length ? b : a;
  if (!small.length) return 0;
  let inter = 0;
  for (const t of small) if (big.includes(t)) inter++;
  return inter / small.length;
}

const pairs = [];
let noBrandExtracted = 0;
let brandUnmapped = 0;
const diag = {
  comparisons: 0, outletTypeNull: 0, lumTypeNull: 0,
  typeMismatch: 0, sizeConflictOnly: 0, lowScore: 0,
  sizeEqHits: 0, maxJac: 0,
};

outlet.forEach((o, oi) => {
  const oNameNorm = normalizeAr(o.nameAr);
  const brandHit = extractOutletBrand(o.nameAr);
  if (!brandHit) { noBrandExtracted++; return; }

  const candidates = [];
  for (const k of familyOf(brandHit.target)) {
    const list = catalogByBrand.get(k);
    if (list) candidates.push(...list);
  }
  if (!candidates.length) { brandUnmapped++; return; }

  const oToks = tokenize(o.nameAr);
  const oType = detectType(oNameNorm);
  const oSize = extractSize(o.nameAr);

  for (const p of candidates) {
    const lNameNorm = normalizeAr(p.name?.ar);
    const lToks = tokenize(p.name?.ar);
    const lType = detectType(lNameNorm + " " + (p.categorySlug || "") + " " + (p.category || ""));
    const lSize = extractSize(p.name?.ar + " " + (p.sku || ""));

    const jac = jaccard(oToks, lToks);
    const cont = containment(oToks, lToks);
    const typeEq = !!(oType && lType && oType === lType);
    const sEq = Object.keys(oSize).length > 0 && sizeEqual(oSize, lSize);
    const sConflict = sizeConflict(oSize, lSize);

    diag.comparisons++;
    if (jac > diag.maxJac) diag.maxJac = Math.round(jac * 100) / 100;
    if (!oType) diag.outletTypeNull++;
    else if (!lType) diag.lumTypeNull++;
    else if (!typeEq) diag.typeMismatch++;
    if (sEq) diag.sizeEqHits++;

    let score = 20;
    if (typeEq) score += 18;
    if (sEq) score += 22;
    if (sConflict) score -= 25;
    score += jac * 40 + cont * 15;

    const highOk = typeEq && sEq && (jac >= 0.38 || cont >= 0.9) && !sConflict;
    const medOk = typeEq && !sConflict && (jac >= 0.26 || cont >= 0.75);

    if (!highOk && !medOk) {
      if (typeEq && sConflict) diag.sizeConflictOnly++;
      else diag.lowScore++;
    }

    if (highOk || medOk) {
      pairs.push({
        lumId: p.id, outletIdx: oi,
        score: Math.round(score * 10) / 10,
        typeEq, sizeEq: !!sEq,
        jaccard: Math.round(jac * 100) / 100,
        contain: Math.round(cont * 100) / 100,
        _high: highOk,
      });
    }
  }
});

pairs.sort((a, b) => b.score - a.score);

const assignedLum = new Set();
const assignedOutlet = new Set();
const high = [], medium = [], suppressed = [];

for (const pr of pairs) {
  if (assignedLum.has(pr.lumId) || assignedOutlet.has(pr.outletIdx)) {
    if (pr._high) suppressed.push({ lumId: pr.lumId, reason: "duplicate-or-conflict" });
    continue;
  }
  assignedLum.add(pr.lumId);
  assignedOutlet.add(pr.outletIdx);
  const rec = buildRecord(pr);
  if (pr._high) high.push(rec);
  else medium.push(rec);
}

function buildRecord(pr) {
  const o = outlet[pr.outletIdx];
  const p = catalog.find((c) => c.id === pr.lumId);
  const wasApplied = previouslyApplied.has(pr.lumId);
  return {
    luminous_id: pr.lumId,
    luminous_name_ar: p?.name?.ar,
    luminous_brand: p?.brand,
    luminous_category: p?.categorySlug || p?.category,
    previously_applied: wasApplied,
    previously_applied_label_ar: wasApplied ? "معالج سابقًا" : undefined,
    outlet_nameAr: o.nameAr,
    outlet_url: o.url,
    confidence: pr._high ? "high" : "medium",
    signals: {
      brand_mapped: true,
      product_type_match: pr.typeEq,
      exact_size_match: pr.sizeEq,
      name_jaccard: pr.jaccard,
      containment: pr.contain,
      composite_score: pr.score,
    },
    proposed_content: {
      description_ar: o.description || "",
      benefits_ar: Array.isArray(o.benefits) ? o.benefits : [],
      usage_ar: o.usage || "",
      source_note: "outlet-scraped-arabic-content",
    },
  };
}

/* ── unmatched analysis ───────────────────────────────── */
const unmatchedOutlet = outlet.filter((_, i) => !assignedOutlet.has(i));
const unmatchedByReason = { "no-brand-candidate": 0, "brand-not-in-catalog": 0, "weak-signal": 0 };
unmatchedOutlet.forEach((o) => {
  const bh = extractOutletBrand(o.nameAr);
  if (!bh) unmatchedByReason["no-brand-candidate"]++;
  else {
    let has = false;
    for (const k of familyOf(bh.target)) if (catalogByBrand.has(k)) { has = true; break; }
    if (!has) unmatchedByReason["brand-not-in-catalog"]++;
    else unmatchedByReason["weak-signal"]++;
  }
});

/* ── distributions ────────────────────────────────────── */
const highByBrand = {}, highByCategory = {};
for (const r of high) {
  highByBrand[r.luminous_brand] = (highByBrand[r.luminous_brand] || 0) + 1;
  highByCategory[r.luminous_category] = (highByCategory[r.luminous_category] || 0) + 1;
}
const medByBrand = {};
for (const r of medium) {
  medByBrand[r.luminous_brand] = (medByBrand[r.luminous_brand] || 0) + 1;
}

const safeToProcess = high.filter(
  (r) => !previouslyApplied.has(r.luminous_id)
).length;

/* ── report ───────────────────────────────────────────── */
const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    catalog_total: catalog.length,
    outlet_scraped: outlet.length,
    pairs_evaluated: pairs.length,
    unique_after_dedupe: assignedLum.size,
    duplicate_or_conflict_suppressed: suppressed.length,
    previously_applied_excluded: previouslyApplied.size,
  },
  classification: {
    high_confidence: high.length,
    medium_confidence: medium.length,
    low_or_unmatched_outlet: unmatchedOutlet.length,
    low_or_unmatched_catalog: catalog.length - assignedLum.size,
  },
  safely_processable_now: safeToProcess,
  unmatched_outlet_reasons: unmatchedByReason,
  diagnostics: diag,
  brand_families_resolved: FAMILY_MEMBERS.size,
  brand_alias_unresolved_targets: unresolvedAliasTargets,
  high_distribution_by_brand: highByBrand,
  high_distribution_by_category: highByCategory,
  medium_distribution_by_brand_top: Object.fromEntries(
    Object.entries(medByBrand).sort((a, b) => b[1] - a[1]).slice(0, 15)
  ),
  pipeline_steps: [
    "arabic-normalization+tokenization",
    "brand-extraction-from-outlet-nameAr(via ar<->en family lexicon)",
    "product-type-detection(arabic-lexicon:" + TYPES.length + "-types)",
    "size-extraction(ml/g/count/pack/spf)",
    "candidate-filter:same-brand-family",
    "scoring:brand+type+sizeExact+jaccard+containment",
    "one-to-one-greedy-dedupe",
    "already-applied-signature-exclusion",
  ],
  rules: {
    high_requires: "mapped-brand AND same-type AND exact-size AND jaccard>=0.38(or containment>=0.9)",
    name_alone_is_never_a_content_source: true,
    no_product_files_modified_in_this_run: true,
  },
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(OUT_DIR, "high-confidence-matches.json"), JSON.stringify({
  version: 1, status: "STAGED-AWAITING-APPROVAL", count: high.length, matches: high,
}, null, 2));
fs.writeFileSync(path.join(OUT_DIR, "medium-confidence-matches.json"), JSON.stringify({
  version: 1, status: "STAGED-NOT-FOR-AUTO-APPLY", count: medium.length, matches: medium,
}, null, 2));

console.log(JSON.stringify(report, null, 2));
console.log("\nHIGH EXAMPLES:");
for (const r of high.slice(0, 10)) {
  console.log(
    " • " + r.luminous_id + " [" + r.luminous_brand + "] \"" +
    r.luminous_name_ar + "\"  <=>  \"" + r.outlet_nameAr +
    "\"  score=" + r.signals.composite_score +
    " jac=" + r.signals.name_jaccard
  );
}
