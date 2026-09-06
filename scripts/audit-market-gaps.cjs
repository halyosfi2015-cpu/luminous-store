/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Market-Demand Catalog Gap Audit — Yaqoot(live) vs Luminous(catalog).
 * AUDIT ONLY: no product data is modified anywhere.
 * Output: market-data/catalog-gap-report.json + console summary.
 */
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();

/* ── load ─────────────────────────────────────────────── */
const yaqoot = JSON.parse(fs.readFileSync(path.join(ROOT, "market-data/yaqoot-live-catalog.json"), "utf8"));
function loadPart(i) {
  const src = fs.readFileSync(path.join(ROOT, "src/data/products-part-0" + i + ".ts"), "utf8");
  return JSON.parse(src.slice(src.indexOf("["), src.lastIndexOf("]") + 1));
}
const luminous = [];
for (let i = 1; i <= 8; i++) luminous.push(...loadPart(i));
const outlet = JSON.parse(fs.readFileSync(path.join(ROOT, "outlet_products_data.json"), "utf8"));

/* ── normalization / tokens / size ────────────────────── */
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
const STOP = new Set(["من","مع","لل","الى","على","في","و","او","ل","ب","the","for","with","and","of","by","new","pack"]);
function tokenize(s) {
  return normalizeAr(s).split(" ").map((t) => t.replace(/^ال/, "")).filter((t) => t.length >= 2 && !STOP.has(t) && !/^\d+$/.test(t));
}
function extractSize(raw) {
  const s = normalizeAr(raw);
  const out = {};
  let m;
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(مل|ml|مليتر)/))) out.ml = parseFloat(m[1].replace(",", "."));
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(جرام|جم|غ|g)\b/))) out.g = parseFloat(m[1].replace(",", "."));
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(كجم|kg)/))) out.g = parseFloat(m[1].replace(",", ".")) * 1000;
  m = s.match(/\b(\d{1,4})\s*(?:كبسوله|كبسولات|قرص|اقراص|تابلت|قطعه|قطع)\b/) || s.match(/(?:كبسوله|كبسولات|قرص|اقراص|تابلت)\s*(\d{1,4})\b/);
  if (m) out.count = parseInt(m[1], 10);
  if ((m = s.match(/(\d{1,2})\s*[x×]\s*(\d{1,4})/))) out.pack = [parseInt(m[1],10), parseInt(m[2],10)];
  if ((m = s.match(/\bspf\s*(\d{2,3})\b/))) out.spf = parseInt(m[1],10);
  return out;
}
function sizeConflict(a, b) {
  for (const k of ["ml", "g", "count"]) {
    if (a[k] !== undefined && b[k] !== undefined && a[k] !== b[k]) return true;
  }
  return false;
}
function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let i = 0; for (const t of A) if (B.has(t)) i++;
  return i / (A.size + B.size - i);
}
function containment(a, b) {
  const small = a.length <= b.length ? a : b;
  const big = a.length <= b.length ? b : a;
  if (!small.length) return 0;
  let i = 0; for (const t of small) if (big.includes(t)) i++;
  return i / small.length;
}

/* ── brand families (Luminous-side lexicon) ───────────── */
function slugifyEn(b) { return String(b||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
const arToBrand = new Map();
const brandCanon = new Map();
for (const p of luminous) {
  const en = String(p.brand || "").trim();
  if (!en) continue;
  const canon = en.toLowerCase();
  brandCanon.set(canon, en);
  for (const v of [en, p.brandAr]) {
    const n = normalizeAr(v);
    if (n && !arToBrand.has(n)) arToBrand.set(n, canon);
  }
}
const FAMILIES = [
  { c: "nivea", m: ["Nivea"], a: ["نيفيا","نيفيه"] },
  { c: "johnson's", m: ["Johnson's"], a: ["جونسون","جونسونز"] },
  { c: "dove", m: ["Dove","دوف"], a: [] },
  { c: "garnier", m: ["Garnier","غارنييه"], aliases: [], a: ["غارنير"] },
  { c: "vaseline", m: ["Vaseline","فازلين"], a: ["ڤازلين"] },
  { c: "beesline", m: ["Beesline","بيزلين"], a: ["بيزلاين"] },
  { c: "l'oreal paris", m: ["L'Oreal Paris","L'Oréal","لوريال"], a: ["لوريال باريس"] },
  { c: "maybelline", m: ["Maybelline","ميبيلين"], a: ["مايبلين"] },
  { c: "cerave", m: ["CeraVe"], a: ["سيرافي"] },
  { c: "la roche-posay", m: ["La Roche-Posay"], a: ["لاروش بوزيه"] },
  { c: "eucerin", m: ["Eucerin"], a: ["اويسرين","يوسرين"] },
  { c: "vichy", m: ["Vichy"], a: ["فيشي"] },
  { c: "avene", m: ["Avene"], a: ["افين"] },
  { c: "uriage", m: ["Uriage","يورياج"], a: [] },
  { c: "bioderma", m: ["Bioderma"], a: ["بيوديرما"] },
  { c: "neutrogena", m: ["Neutrogena","نيتروجينا"], a: [] },
  { c: "cetaphil", m: ["Cetaphil"], a: ["سيتافيل"] },
  { c: "sebamed", m: ["Sebamed"], a: ["سيباميد"] },
];
const famMembers = new Map();
const slugIdx = new Map([...brandCanon.keys()].map((k) => [slugifyEn(k), k]));
for (const f of FAMILIES) {
  const members = [];
  for (const m of f.m) {
    const r = brandCanon.get(m.toLowerCase()) || slugIdx.get(slugifyEn(m));
    if (r) members.push(r);
  }
  if (!members.length) continue;
  famMembers.set(f.c, members);
  for (const m of members) arToBrand.set(normalizeAr(m), f.c);
  for (const a of f.a) arToBrand.set(normalizeAr(a), f.c);
}
function familyOf(target) {
  if (famMembers.has(target)) return famMembers.get(target);
  for (const [, ms] of famMembers) if (ms.includes(target)) return ms;
  return [target];
}

/* luminous index */
const lumByBrand = new Map();
const lumPrepared = luminous.map((p) => ({
  id: p.id, name: p.name?.ar || "", brand: String(p.brand||"").toLowerCase(),
  toks: tokenize((p.name?.ar || "") + " " + (p.brand || "")),
  size: extractSize((p.name?.ar || "") + " " + (p.sku || "")),
}));
for (const lp of lumPrepared) {
  if (!lp.brand) continue;
  if (!lumByBrand.has(lp.brand)) lumByBrand.set(lp.brand, []);
  lumByBrand.get(lp.brand).push(lp);
}

/* ── category classification ──────────────────────────── */
const CATS = [
  ["Skincare", "واقي شمس|سيروم|مرطب|غسول وجه|غسول|تونر|ماسك الوجه|مقشر|مزيل مكياج|ماء ميسيلار|كريم اساسي|كريم اساس|بشرة|بشره|نيتروجينا هيدرو"],
  ["Haircare", "شامبو|بلسم|صبغه|صبغة|كيراتين|بروتين الشعر|زيت شعر|زيت للشعر|ماسك الشعر|قناع الشعر|سيروم شعر|سبراي شعر|اكسسوارات الشعر|شعر"],
  ["Body care", "لوشن|زبدة الكاكاو|زبدة الشيا|صابون|ملح استحمام|جلس استحمام|معطر جسم|كريم الجسم"],
  ["Oral care", "معجون|غسول الفم|غسول فم|فرشاه اسنان|فرشاة أسنان|خيط اسنان|مسواك"],
  ["Women care", "غسول نسائي|مناطق حميميه|المناطق الحميمة|بودره نسائيه|فيم فريش|فوط نسائية"],
  ["Baby & mother", "اطفال|بيبي|حفاضات|رضاعه|حلمة|لبنه|مرطب اطفال|شامبو اطفال|حمل وولاده"],
  ["Eye care", "محيط العين|عدسات|قطره عين|قطرة عيون|عناية العين"],
  ["Nail care", "اظافر|طلاء|مزيل طلاء"],
  ["Makeup", "مكياج|كريم اساس|احمر شفاه|ظل عيون|مسكارا|بلاشر|كونسيلر|هايلايتر|بودرة تجميل|rouge|foundation|concealer|mascara"],
  ["Supplements", "فيتامين|مكمل غذائي|مكمل|اوميجا|كولاجين|زنك|حديد|مغنيسيوم|مالتي فيتامين|بيوتين"],
  ["Fragrance", "عطر|بارفان|او دي بارفان|او دي تواليت|مسك|عود|دهن عود|معطر|بخور"],
  ["Personal care & accessories", "ماكينة حلاقة|ماكينه حلاقه|شفرات|فرشاة شعر|فرشاه شعر|مشط|مناديل|قطن طبي|فوط|مقص|ملقط|ليفة|ليفه|اسفنج|حزام|اسيك"],
  ["Skincare", "شفاه|مرطب شفاه|واقي|كريم مرطب|كريم مفتح|غسول البشرة|عناية بالوجه|سيروم وجه|كريم مساج|كريم مرمم|حب الشباب|تصبغات|تفتيح"],
  ["Haircare", "حمايه حراريه|حماية حرارية|واكس|شمع ازاله|ازاله الشعر|بلسم الشعر|زيت الارجل|كريم تصفيف"],
  ["Body care", "استحمام|جسم|الارجل|قدمين|تبيض المناطق|مزيل شعر"],
  ["Supplements", "صحة|مناعة|طاقه|طاقة|دايت"],
];
const CAT_RE = CATS.map(([k, p]) => [k, new RegExp("(?:^| )(?:" + p.split("|").map(x=>x.trim()).join("|") + ")(?: |$)")]);
function classify(nameNorm) {
  for (const [k, re] of CAT_RE) if (re.test(nameNorm)) return k;
  return "Uncategorized";
}

const GLOBAL_BRANDS = new Set([
  "nivea","dove","cerave","la roche-posay","the ordinary","vichy","bioderma","garnier",
  "l'oreal paris","maybelline","neutrogena","eucerin","avene","uriage","cetaphil","sebamed",
  "panthenol plus","ogx","herbal essences","head & shoulders","pantene","sunsilk","clear",
  "colgate","sensodyne","listerine","oral-b","gillett","gillette","venus","rexona","vaseline",
  "palmer's","st. ives","now foods","centrum","cosrx","some by mi","beauty of joseon",
  "medicube","mixsoon","skin1004","purito","pixi","beesline","fem fresh","kiwi","biolane","chicco",
]);

/* outlet index for exact-match lookup */
const outletPrepared = outlet.map((o) => ({
  o,
  toks: tokenize(o.nameAr),
  norm: normalizeAr(o.nameAr),
}));

function outletMatchFor(yq) {
  const yToks = tokenize(yq.nameAr);
  let best = null, bestScore = 0;
  for (const op of outletPrepared) {
    const jac = jaccard(yToks, op.toks);
    if (jac > bestScore) { bestScore = jac; best = op.o; }
  }
  return bestScore >= 0.55 ? { exists: true, score: Math.round(bestScore*100)/100, url: best.url } : { exists: false };
}

/* ── match engine ─────────────────────────────────────── */
const results = [];
let unmatchedBrands = new Map();

for (const y of yaqoot.products) {
  const nameNorm = normalizeAr(y.nameAr);
  const cat = classify(nameNorm);
  const yToks = tokenize(y.nameAr);
  const ySize = extractSize(y.nameAr);
  const brandKey = arToBrand.get(normalizeAr(y.brandYaqoot || ""));
  let pool = null;
  if (brandKey) {
    pool = [];
    for (const k of familyOf(brandKey)) {
      const l = lumByBrand.get(k);
      if (l) pool.push(...l);
    }
  }
  if (!pool || !pool.length) {
    const key = y.brandYaqoot || "(none)";
    unmatchedBrands.set(key, (unmatchedBrands.get(key) || 0) + 1);
    results.push({ yq: y, cat, status: "MISSING-BRAND-ABSENT", poolSize: 0 });
    continue;
  }

  let bestPair = null;
  for (const lp of pool) {
    const jac = jaccard(yToks, lp.toks);
    const cont = containment(yToks, lp.toks);
    if (sizeConflict(ySize, lp.size)) continue;
    const strong = jac >= 0.38 || cont >= 0.85;
    if (strong && (!bestPair || jac > bestPair.jac)) {
      bestPair = { lp, jac: Math.round(jac*100)/100, cont: Math.round(cont*100)/100 };
    }
  }

  if (bestPair) {
    const status = bestPair.jac >= 0.6 ? "PRESENT-EXACT" : "PRESENT-EQUIVALENT";
    results.push({ yq: y, cat, status, matchedId: bestPair.lp.id, matchedName: bestPair.lp.name, jac: bestPair.jac, cont: bestPair.cont });
  } else {
    /* line-level equivalent check: same line but different variant/size present */
    let lineMatch = null, bestCont = 0;
    for (const lp of pool) {
      const cont = containment(yToks, lp.toks);
      if (cont >= 0.5 && cont > bestCont) { bestCont = cont; lineMatch = lp; }
    }
    if (lineMatch) {
      results.push({ yq: y, cat, status: "EQUIVALENT-VARIANT-PRESENT", matchedId: lineMatch.id, matchedName: lineMatch.name, cont: Math.round(bestCont*100)/100 });
    } else {
      results.push({ yq: y, cat, status: "MISSING-PRODUCT" });
    }
  }
}

/* ── duplicates inside yaqoot ─────────────────────────── */
const dupMap = new Map();
for (const r of results) {
  const key = normalizeAr(r.yq.nameAr);
  if (!dupMap.has(key)) dupMap.set(key, []);
  dupMap.get(key).push(r.yq.yaqootId);
}
const duplicateIds = new Set();
for (const [, ids] of dupMap) if (ids.length > 1) ids.forEach((id) => duplicateIds.add(id));

/* ── prioritization of MISSING-PRODUCT only ───────────── */
const missing = results.filter((r) => r.status === "MISSING-PRODUCT" || r.status === "MISSING-BRAND-ABSENT");
function priorityOf(r) {
  const brandKey = arToBrand.get(normalizeAr(r.yq.brandYaqoot || ""));
  const isGlobal = brandKey && GLOBAL_BRANDS.has(brandKey);
  let score = isGlobal ? 30 : 12;
  const core = ["Skincare","Haircare","Oral care","Supplements","Baby & mother"];
  score += core.includes(r.cat) ? 20 : ["Makeup","Fragrance"].includes(r.cat) ? 14 : 10;
  if (r.yq.oldPrice && r.yq.price && r.yq.oldPrice > r.yq.price) score += 15;
  if (r.yq.price !== null) score += 5;
  const lvl = score >= 58 ? "P0" : score >= 45 ? "P1" : "P2";
  return { score, lvl, isGlobal };
}

const prioritized = missing.map((r) => {
  const pr = priorityOf(r);
  const om = outletMatchFor(r.yq);
  return {
    yaqoot_id: r.yq.yaqootId,
    name_ar: r.yq.nameAr,
    brand: r.yq.brandYaqoot,
    category: r.cat,
    size_variant: Object.entries(extractSize(r.yq.nameAr)).map(([k,v])=>k+"="+v).join(", ") || "-",
    yaqoot_price: r.yq.price,
    yaqoot_old_price: r.yq.oldPrice || null,
    availability: "listed on yaqootstoreye.com (live crawl)",
    evidence_url: "https://yaqootstoreye.com/product.php?id=" + r.yq.yaqootId,
    image_url: r.yq.image,
    why_important: [
      pr.isGlobal ? "global-major-brand" : null,
      ["Skincare","Haircare","Oral care","Supplements"].includes(r.cat) ? "core-category" : null,
      (r.yq.oldPrice && r.yq.price && r.yq.oldPrice > r.yq.price) ? "actively-discounted-on-yaqoot" : null,
    ].filter(Boolean).join("+") || "market-presence",
    outlet_exact_match: om.exists ? "yes (text-match " + om.score + ")" : "no",
    outlet_imagery_available: false,
    priority: pr.lvl,
    priority_score: pr.score,
  };
}).sort((a, b) => b.priority_score - a.priority_score);

/* already-present important */
const presentImportant = results.filter((r) =>
  (r.status === "PRESENT-EXACT") &&
  (r.yq.oldPrice && r.yq.price && r.yq.oldPrice > r.yq.price ||
   GLOBAL_BRANDS.has(arToBrand.get(normalizeAr(r.yq.brandYaqoot || "")) || ""))
);

/* manual review: equivalent-variant-present with notable delta */
const manualReview = results.filter((r) => r.status === "EQUIVALENT-VARIANT-PRESENT");

/* ── report ───────────────────────────────────────────── */
const byCatMissing = {};
prioritized.forEach((m) => { byCatMissing[m.category] = (byCatMissing[m.category] || 0) + 1; });

const report = {
  generatedAt: new Date().toISOString(),
  audit_only_no_changes: true,
  totals: {
    yaqoot_products_audited: yaqoot.products.length,
    yaqoot_brands_crawled: yaqoot.brands,
    categories_classified: [...new Set(results.map((r) => r.cat))],
    luminous_products: luminous.length,
    missing_total: missing.length,
  },
  classification: {
    present_exact: results.filter((r) => r.status === "PRESENT-EXACT").length,
    present_equivalent: results.filter((r) => r.status === "PRESENT-EQUIVALENT").length,
    equivalent_variant_present: manualReview.length,
    missing_product: results.filter((r) => r.status === "MISSING-PRODUCT").length,
    missing_brand_absent: results.filter((r) => r.status === "MISSING-BRAND-ABSENT").length,
  },
  missing_by_category: byCatMissing,
  priorities: {
    P0: prioritized.filter((m) => m.priority === "P0"),
    P1: prioritized.filter((m) => m.priority === "P1"),
    P2_count: prioritized.filter((m) => m.priority === "P2").length,
  },
  top_missing_brands: Object.fromEntries(
    [...unmatchedBrands.entries()].sort((a,b)=>b[1]-a[1]).slice(0,25)
  ),
  duplicates_near_duplicates_rejected: {
    count: duplicateIds.size,
    note: "duplicate titles inside Yaqoot catalog excluded from missing list",
  },
};
fs.writeFileSync(path.join(ROOT, "market-data/catalog-gap-report.json"), JSON.stringify(report, null, 1), "utf8");

console.log(JSON.stringify(report.totals, null, 1));
console.log("CLASSIFICATION:", JSON.stringify(report.classification));
console.log("\nP0:", report.priorities.P0.length, "| P1:", report.priorities.P1.length, "| P2:", report.priorities.P2_count);
console.log("\nTOP P0 SAMPLES:");
report.priorities.P0.slice(0, 15).forEach((m) =>
  console.log(` • [${m.category}] ${m.brand} — ${m.name_ar} | ${m.size_variant} | ${m.yaqoot_price} YER | outlet:${m.outlet_exact_match}`)
);
console.log("\nTOP MISSING BRANDS (whole-brand gaps):");
Object.entries(report.top_missing_brands).slice(0, 15).forEach(([b, c]) => console.log(` • ${b}: ${c}`));
