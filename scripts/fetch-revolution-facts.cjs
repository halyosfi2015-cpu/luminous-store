/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
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
const IDS = ["1535", "1534", "1274", "969", "867", "792", "791", "559"];
(async () => {
  const out = [];
  for (const id of IDS) {
    const html = await get("https://yaqootstoreye.com/product.php?id=" + id);
    if (!html) { out.push({ id, error: true }); continue; }
    const t = String(html).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").split("\n").map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
    const boiler = /قفازات|جوارب|ادوات العناية با اليدين|ياقوت ستور|شارك المنتج|تم نسخ|حدد المحافظة|رسوم توصيل|واتساب|اضغط هنا/;
    const lines = t.filter((l) => l.length >= 25 && /[\u0600-\u06FF]/.test(l) && !boiler.test(l) && !/^إضغط/.test(l));
    /* product-specific = exclude title-repeat line and unrelated brand promos */
    const facts = lines.filter((l) => !/من ريفولوشن،?$|من ريفولوشن$/.test(l) || l.length > 80);
    out.push({ id, fact_lines: facts.slice(0, 10) });
    console.log(`[${id}] factLines=${facts.length}`);
    await sleep(250);
  }
  fs.writeFileSync(path.join(ROOT, "market-data/revolution-facts.json"), JSON.stringify(out, null, 1), "utf8");
  console.log("SAVED revolution-facts.json");
})();
