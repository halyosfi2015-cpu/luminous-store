/* eslint-disable @typescript-eslint/no-require-imports */
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
  return String(s).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split("\n").map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}

const TARGETS = [
  { yaqootId: 2758, newId: "yq-2798" },
  { yaqootId: 1356, newId: "yq-2799" },
  { yaqootId: 1296, newId: "yq-2800" },
  { yaqootId: 1026, newId: "yq-2801" },
];

(async () => {
  const out = [];
  for (const t of TARGETS) {
    const html = await get(BASE + "/product.php?id=" + t.yaqootId);
    if (!html) { out.push({ ...t, error: "fetch failed" }); continue; }
    const text = stripTags(html);

    /* product-specific section extraction */
    function grabSection(startRe, endRe, limit = 900) {
      const s = text.search(startRe);
      if (s < 0) return null;
      let chunk = text.slice(s, s + 2500);
      const e = chunk.search(endRe);
      if (e > 20) chunk = chunk.slice(0, e);
      const lines = chunk.split("\n").filter((l) => l.length >= 15 && /[\u0600-\u06FF]/.test(l));
      return lines.slice(0, 10).join("\n").slice(0, limit);
    }

    const rec = {
      ...t,
      url: BASE + "/product.php?id=" + t.yaqootId,
      desc_section: grabSection(/^.*?وصف المنتج|الوصف|description/mi, /^(مكونات|المكونات|طريقة|الفوائد|المميزات)/mi),
      ingredients_section: grabSection(/^(مكونات|المكونات):?\s*$/m, /^(طريقة|الفوائد|المميزات|وصف)/m),
      usage_section: grabSection(/^(طريقة الاستخدام|طريقة الاستعمال|الاستخدام):?\s*$/m, /^(مكونات|الفوائد|المميزات|وصف)/m),
      benefits_section: grabSection(/^(الفوائد|المميزات):?\s*$/m, /^(مكونات|طريقة|وصف)/m),
    };
    /* fallback: find first long product-fact paragraph after title occurrence */
    if (!rec.desc_section || rec.desc_section.length < 60) {
      const titleIdx = text.indexOf(rec.yaqootTitle || "");
      const after = text.slice(Math.max(0, text.search(/product-title|card-title/i)), text.search(/product-title|card-title/i) + 4000);
      const factLines = after.split("\n").filter((l) => l.length >= 40 && /[\u0600-\u06FF]/.test(l));
      rec.desc_fallback_lines = factLines.slice(0, 8);
    }
    out.push(rec);
    console.log(`[${t.newId} <- yaqoot ${t.yaqootId}] desc=${!!rec.desc_section} ing=${!!rec.ingredients_section} use=${!!rec.usage_section} ben=${!!rec.benefits_section}`);
    await sleep(300);
  }
  fs.writeFileSync(path.join(ROOT, "market-data/four-fullfacts.json"), JSON.stringify(out, null, 1), "utf8");
  console.log("SAVED -> market-data/four-fullfacts.json");
})();
