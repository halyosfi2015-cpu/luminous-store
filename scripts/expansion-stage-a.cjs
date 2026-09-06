/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Expansion Pipeline Stage-A: classify missing products for given brands,
 * then fetch each missing product's Yaqoot page and extract verified facts.
 * Usage: node scripts/expansion-stage-a.cjs
 */
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
const BASE = "https://yaqootstoreye.com";
const UA = { "User-Agent": "Mozilla/5.0", "Accept-Language": "ar,en" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BRANDS = [
  { canon: "Vichy", key: "vichy", aliases: ["فيشي"] },
  { canon: "CeraVe", key: "cerave", aliases: ["سيرافي", "سي رايف", "سيرا في"] },
  { canon: "Cetaphil", key: "cetaphil", aliases: ["سيتافيل", "سيتابيل"] },
  { canon: "Nivea", key: "nivea", aliases: ["نيفيا", "نيفيه"] },
];

function normalizeAr(s) {
  return String(s || "").toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s%+.×x]/gu, " ").replace(/\s+/g, " ").trim();
}
const STOP = new Set(["من","مع","لل","الى","على","في","و","او","ل","ب","the","for","with","and","of","by","new"]);
function tokenize(s) {
  return normalizeAr(s).split(" ").map((t) => t.replace(/^ال/, "")).filter((t) => t.length >= 2 && !STOP.has(t) && !/^\d+$/.test(t));
}
function extractSize(raw) {
  const s = normalizeAr(raw); const out = {}; let m;
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(مل|ml|مليتر)/))) out.ml = parseFloat(m[1].replace(",", "."));
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(جرام|جم|غ|g)\b/))) out.g = parseFloat(m[1].replace(",", "."));
  m = s.match(/\b(\d{1,4})\s*(?:كبسوله|كبسولات|قرص|اقراص|قطعه|قطع)\b/) || s.match(/(?:كبسوله|كبسولات|قرص|اقراص)\s*(\d{1,4})\b/);
  if (m) out.count = parseInt(m[1], 10);
  if ((m = s.match(/\bspf\s*(\d{2,3})\b/))) out.spf = parseInt(m[1], 10);
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

async function get(url, tries = 2) {
  for (let t = 1; t <= tries; t++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) });
      if (res.ok) return await res.text();
    } catch {}
    await sleep(600 * t);
  }
  return null;
}
function stripTags(s) {
  return String(s).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split("\n").map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}

(async () => {
  const yaqootCat = JSON.parse(fs.readFileSync(path.join(ROOT, "market-data/yaqoot-live-catalog.json"), "utf8"));
  function loadPart(i) {
    const src = fs.readFileSync(path.join(ROOT, `src/data/products-part-0${i}.ts`), "utf8");
    return JSON.parse(src.slice(src.indexOf("["), src.lastIndexOf("]") + 1));
  }
  const lum = [];
  for (let i = 1; i <= 8; i++) lum.push(...loadPart(i));
  const lumByBrand = new Map();
  for (const p of lum) {
    const k = String(p.brand || "").toLowerCase();
    if (!lumByBrand.has(k)) lumByBrand.set(k, []);
    lumByBrand.get(k).push({
      id: p.id, name: p.name?.ar || "",
      toks: tokenize((p.name?.ar || "") + " " + (p.brandAr || p.brand || "")),
      size: extractSize((p.name?.ar || "") + " " + (p.sku || "")),
    });
  }

  const output = [];
  for (const b of BRANDS) {
    const aliasSet = new Set([b.canon.toLowerCase(), ...b.aliases.map(normalizeAr)]);
    const items = yaqootCat.products.filter((y) => aliasSet.has(normalizeAr(y.brandYaqoot || "")));
    const pool = lumByBrand.get(b.key) || [];

    let exact = 0, equiv = 0;
    const missing = [];
    for (const y of items) {
      const yToks = tokenize(y.nameAr);
      const ySize = extractSize(y.nameAr);
      let isDup = false, lineCont = 0;
      for (const lp of pool) {
        const jac = jaccard(yToks, lp.toks);
        const cont = containment(yToks, lp.toks);
        const conf = sizeConflict(ySize, lp.size);
        if (!conf && (jac >= 0.38 || cont >= 0.85)) { isDup = true; break; }
        if (cont > lineCont) lineCont = cont;
      }
      if (isDup) { exact++; continue; }
      if (lineCont >= 0.55) { equiv++; continue; }
      missing.push({
        brand: b.canon, yaqoot_id: y.yaqootId, name_ar: y.nameAr,
        price: y.price, old_price: y.oldPrice || null,
        image_url: y.image,
        url: BASE + "/product.php?id=" + y.yaqootId,
        size_variant: Object.entries(extractSize(y.nameAr)).map(([k, v]) => k + "=" + v).join(",") || "-",
      });
    }
    console.log(`${b.canon}: yaqoot=${items.length} | lumPool=${pool.length} | dup=${exact} | equiv=${equiv} | MISSING=${missing.length}`);
    output.push({ brand: b.canon, totals: { yaqoot: items.length, luminous_pool: pool.length, duplicates: exact, equivalents_not_added: equiv, missing: missing.length }, missing });
  }

  fs.writeFileSync(path.join(ROOT, "market-data/expansion-stage-a-classified.json"), JSON.stringify(output, null, 1), "utf8");
  console.log("SAVED stage-a classified.");
})();
