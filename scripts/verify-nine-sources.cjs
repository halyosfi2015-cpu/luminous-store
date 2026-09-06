/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Content-source verification for the 9 approved candidates.
 * Fetches each Yaqoot product detail page and extracts available verified facts.
 */
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
const BASE = "https://yaqootstoreye.com";
const UA = { "User-Agent": "Mozilla/5.0", "Accept-Language": "ar,en" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .split("\n").map((x) => x.trim()).filter(Boolean).join("\n");
}

(async () => {
  const cands = JSON.parse(fs.readFileSync(path.join(ROOT, "market-data/nine-candidates.json"), "utf8"));
  const results = [];

  for (const c of cands) {
    const html = await get(BASE + "/product.php?id=" + c.id);
    const rec = { ...c, page_fetched: !!html, facts: {} };
    if (html) {
      /* isolate main content area: try known containers */
      const bodyM = html.match(/<div[^>]*class="[^"]*(?:product-description|description|tab-content|product-details)[^"]*"[^>]*>([\s\S]{0,8000}?)<\/div>\s*(?:<div|<\/)/i);
      const fullText = stripTags(html);

      /* capture meaningful Arabic fact lines (len>=25) excluding nav/boilerplate */
      const boiler = /صيدلية|اوتلت|سعر|ريال|اضافة|السلة|المفضلة|شارك|تويتر|فيسبوك|واتس|انستا|snapchat|tiktok|جميع الحقوق|تصميم|الرئيسية|تواصل|سياسة|منتجات|أقسام|اقسام|علامات تجارية|براند|دخول|حساب/;
      const lines = fullText.split("\n").filter((l) =>
        l.length >= 25 && /[\u0600-\u06FF]/.test(l) && !boiler.test(l)
      );
      rec.facts.meaningful_lines_count = lines.length;
      rec.facts.sample_lines = lines.slice(0, 14);

      /* look for structured sections */
      const hasIngredients = /مكونات|المكونات|ingredients/i.test(html);
      const hasUsage = /طريقة الاستخدام|طريقة الاستعمال|usage|استخدامه/i.test(html);
      const hasBenefits = /فوائد|الفوائد|benefits|مزايا/i.test(html);
      rec.facts.has_ingredients_section = hasIngredients;
      rec.facts.has_usage_section = hasUsage;
      rec.facts.has_benefits_section = hasBenefits;

      /* extract ingredient line if present */
      if (hasIngredients) {
        const idx = fullText.search(/مكونات|المكونات/);
        rec.facts.ingredients_snippet = fullText.slice(idx, idx + 300).split("\n").slice(0, 4);
      }
    }
    results.push(rec);
    console.log(`[${c.id}] fetched=${rec.page_fetched} | lines=${rec.facts.meaningful_lines_count || 0} | ing=${!!rec.facts.has_ingredients_section} usage=${!!rec.facts.has_usage_section} ben=${!!rec.facts.has_benefits_section}`);
    await sleep(250);
  }

  fs.writeFileSync(path.join(ROOT, "market-data/nine-content-verification.json"), JSON.stringify(results, null, 1), "utf8");
  console.log("SAVED -> market-data/nine-content-verification.json");
})();
