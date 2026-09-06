/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Strategic Brands Audit — Bioderma / Eucerin / La Roche-Posay
 * EVERY Yaqoot product of these brands classified against the full Luminous pool.
 * AUDIT ONLY — no catalog changes.
 */
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();

const BRANDS = [
  { canon: "Bioderma", key: "bioderma", yaqootAliases: ["بايوديرما", "بيوديرما"] },
  { canon: "Eucerin", key: "eucerin", yaqootAliases: ["يوسرين", "ايسرين", "اويسرين"] },
  { canon: "La Roche-Posay", key: "la roche-posay", yaqootAliases: ["لاروش بوزيه", "لاروش بوزه", "لا روش بوزيه", "لاروش بوزيه"] },
];

/* ── load ─────────────────────────────────────────────── */
const yaqoot = JSON.parse(fs.readFileSync(path.join(ROOT, "market-data/yaqoot-live-catalog.json"), "utf8"));
function loadPart(i) {
  const src = fs.readFileSync(path.join(ROOT, "src/data/products-part-0" + i + ".ts"), "utf8");
  return JSON.parse(src.slice(src.indexOf("["), src.lastIndexOf("]") + 1));
}
const luminous = [];
for (let i = 1; i <= 8; i++) luminous.push(...loadPart(i));
const outlet = JSON.parse(fs.readFileSync(path.join(ROOT, "outlet_products_data.json"), "utf8"));

/* ── text utils ───────────────────────────────────────── */
function normalizeAr(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s%+.×x]/gu, " ")
    .replace(/\s+/g, " ").trim();
}
const STOP = new Set(["من","مع","لل","الى","على","في","و","او","ل","ب","the","for","with","and","of","by","new"]);
function tokenize(s) {
  return normalizeAr(s).split(" ").map((t) => t.replace(/^ال/, "")).filter((t) => t.length >= 2 && !STOP.has(t) && !/^\d+$/.test(t));
}
function extractSize(raw) {
  const s = normalizeAr(raw);
  const out = {};
  let m;
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(مل|ml|مليتر)/))) out.ml = parseFloat(m[1].replace(",", "."));
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(جرام|جم|غ|g)\b/))) out.g = parseFloat(m[1].replace(",", "."));
  m = s.match(/\b(\d{1,4})\s*(?:كبسوله|كبسولات|قرص|اقراص)\b/);
  if (m) out.count = parseInt(m[1], 10);
  return out;
}
function sizeConflict(a, b) {
  for (const k of ["ml", "g", "count"]) if (a[k] !== undefined && b[k] !== undefined && a[k] !== b[k]) return true;
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

/* ── pools ────────────────────────────────────────────── */
const lumPools = {};
for (const b of BRANDS) {
  lumPools[b.key] = luminous
    .filter((p) => String(p.brand).toLowerCase() === b.key)
    .map((p) => ({
      id: p.id, name: p.name?.ar || "",
      toks: tokenize((p.name?.ar || "") + " " + (p.brandAr || "")),
      size: extractSize((p.name?.ar || "") + " " + (p.sku || "")),
      categorySlug: p.categorySlug,
    }));
}

const outletPrep = outlet.map((o) => ({ o, toks: tokenize(o.nameAr), size: extractSize(o.nameAr) }));
function outletMatchFor(yToks, ySize) {
  let bestScore = 0, bestO = null, sizeOk = false;
  for (const op of outletPrep) {
    const jac = jaccard(yToks, op.toks);
    if (jac > bestScore) { bestScore = jac; bestO = op.o; sizeOk = !sizeConflict(ySize, op.size); }
  }
  return { yes: bestScore >= 0.45 && sizeOk, score: Math.round(bestScore * 100) / 100, url: bestO?.url };
}

function importanceScore(y, yToks, om) {
  let s = 12;
  if (/واقي شمس|spf/.test(yToks.join(" "))) s += 25;
  else if (/ماء ميسيلار|غسول/.test(yToks.join(" "))) s += 22;
  else if (/سيروم/.test(yToks.join(" "))) s += 20;
  else if (/كريم|مرطب/.test(yToks.join(" "))) s += 18;
  else if (/بلسم|شامبو/.test(yToks.join(" "))) s += 15;
  if (y.oldPrice && y.price && y.oldPrice > y.price) s += 10;
  if (y.price !== null) s += y.price <= 5000 ? 5 : y.price <= 12000 ? 7 : 8;
  if (om.yes) s += 8;
  return s;
}

/* ── classify ─────────────────────────────────────────── */
const report = { generatedAt: new Date().toISOString(), audit_only: true, brands: {} };

for (const b of BRANDS) {
  const aliasSet = new Set(b.yaqootAliases.map(normalizeAr));
  const yqItems = yaqoot.products.filter((y) => aliasSet.has(normalizeAr(y.brandYaqoot || "")));
  const pool = lumPools[b.key];

  const exactPresent = [], reviewEquivalent = [], recommended = [];
  let unmatchedInternal = 0;

  for (const y of yqItems) {
    const yToks = tokenize(y.nameAr);
    const ySize = extractSize(y.nameAr);

    let bestJac = 0, bestCont = 0, bestLum = null, conflictWithBest = false;
    for (const lp of pool) {
      const jac = jaccard(yToks, lp.toks);
      const cont = containment(yToks, lp.toks);
      const conf = sizeConflict(ySize, lp.size);
      const effJac = conf ? 0 : jac;
      if (effJac > bestJac || (!conf && cont > bestCont)) {
        if (effJac >= bestJac) { bestJac = effJac; }
        if (cont > bestCont) { bestCont = cont; }
        bestLum = lp;
        conflictWithBest = conf;
      }
    }

    const isExact = !conflictWithBest && bestLum && (bestJac >= 0.38 || bestCont >= 0.85);
    if (isExact) {
      exactPresent.push({
        yaqoot_id: y.yaqootId, name_ar: y.nameAr, price: y.price,
        matched_luminous_id: bestLum.id, matched_name: bestLum.name,
        jaccard: Math.round(bestJac * 100) / 100, containment: Math.round(bestCont * 100) / 100,
      });
      continue;
    }

    const linePresent = bestLum && bestCont >= 0.55;
    const om = outletMatchFor(yToks, ySize);
    const score = importanceScore({ nameAr: y.nameAr, price: y.price, oldPrice: y.oldPrice }, yToks, om);

    const baseRec = {
      yaqoot_id: y.yaqootId,
      name_ar: y.nameAr,
      size_variant: Object.entries(extractSize(y.nameAr)).map(([k, v]) => k + "=" + v).join(",") || "-",
      yaqoot_price: y.price,
      yaqoot_old_price: y.oldPrice || null,
      availability: "live on yaqootstoreye.com",
      evidence_url: "https://yaqootstoreye.com/product.php?id=" + y.yaqootId,
      image_url: y.image,
      image_available: !!y.image,
      outlet_exact_match: om.yes ? "YES" : "NO",
      outlet_match_score: om.score,
      outlet_specs_available: om.yes ? "YES" : "NO",
      line_overlap_with_luminous: Math.round(bestCont * 100) / 100,
    };

    if (linePresent) {
      reviewEquivalent.push({
        ...baseRec,
        closest_existing: { id: bestLum.id, name: bestLum.name },
        reason_review: "same-line variant/size differs from existing Luminous SKU",
      });
    } else {
      recommended.push({ ...baseRec, priority_score: score });
      if (!om.yes) unmatchedInternal++;
    }
  }

  recommended.sort((a, b2) => b2.priority_score - a.priority_score);

  report.brands[b.canon] = {
    totals: {
      found_on_yaqoot: yqItems.length,
      already_in_luminous_pool_size: pool.length,
      exact_duplicates_rejected: exactPresent.length,
      equivalent_variants_requiring_review: reviewEquivalent.length,
      recommended_for_addition: recommended.length,
      lacking_outlet_verification: recommended.filter((r) => r.outlet_exact_match === "NO").length,
      lacking_imagery: recommended.filter((r) => !r.image_available).length,
    },
    recommended_ranked: recommended,
    equivalent_variants_review: reviewEquivalent,
    exact_duplicates: exactPresent.slice(0, 40),
  };

  console.log(`\n===== ${b.canon} =====`);
  console.log(`found_on_yaqoot:${yqItems.length} | lumPool:${pool.length}`);
  console.log(`exact_dupes:${exactPresent.length} | review_equivalents:${reviewEquivalent.length} | RECOMMENDED:${recommended.length}`);
  console.log(`lacking_outlet:${report.brands[b.canon].totals.lacking_outlet_verification} | lacking_image:${report.brands[b.canon].totals.lacking_imagery}`);
  recommended.slice(0, 6).forEach((r) =>
    console.log(`  • ${r.yaqoot_id} "${r.name_ar}" ${r.size_variant} ${r.yaqoot_price}YER score=${r.priority_score} outlet=${r.outlet_exact_match}`)
  );
}

fs.writeFileSync(
  path.join(ROOT, "market-data/strategic-brands-audit.json"),
  JSON.stringify(report, null, 1),
  "utf8"
);
console.log("\nSAVED -> market-data/strategic-brands-audit.json");
