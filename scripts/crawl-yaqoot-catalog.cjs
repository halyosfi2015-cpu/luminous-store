/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Yaqoot live catalog crawler — yaqootstoreye.com (custom PHP platform).
 * Crawls brands.php + brand pages -> full product inventory with prices.
 * Output: market-data/yaqoot-live-catalog.json
 */
const fs = require("fs");
const path = require("path");

const BASE = "https://yaqootstoreye.com";
const OUT_DIR = path.join(ROOT_DIR(), "market-data");
function ROOT_DIR() { return process.cwd(); }

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept-Language": "ar,en" };
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
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function crawlBrands() {
  const html = await get(BASE + "/brands.php");
  if (!html) throw new Error("brands.php unavailable");
  const brands = [];
  const seen = new Set();
  const re = /brand\.php\?id=(\d+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const windowHtml = html.slice(m.index, m.index + 700);
    const titleM = windowHtml.match(/card-title text-center">\s*([^<]+?)\s*(?:<br|$)/);
    const countM = windowHtml.match(/<span[^>]*>\s*(\d+)\s*\u0645\u0646\u062a\u062c/);
    brands.push({
      id,
      nameAr: titleM ? stripTags(titleM[1]) : "",
      expectedCount: countM ? parseInt(countM[1], 10) : null,
    });
  }
  return brands;
}

function parseProductsFromBrandPage(html) {
  const products = [];
  const re = /product\.php\?id=(\d+)"/g;
  let m;
  const seen = new Set();
  while ((m = re.exec(html)) !== null) {
    const pid = m[1];
    if (seen.has(pid)) continue;
    seen.add(pid);
    const chunk = html.slice(m.index, Math.min(html.length, m.index + 1800));
    const nameM = chunk.match(/product-title">([\s\S]*?)<\/h5>/);
    const priceAfter = chunk.match(/class="after">\s*([\d.,]+)/);
    const priceBefore = chunk.match(/class="before">\s*([\d.,]+)/);
    const imgM = chunk.match(/<img\s+src="([^"]*files\/items\/[^"]+)"/);
    products.push({
      yaqootId: pid,
      nameAr: nameM ? stripTags(nameM[1]) : "",
      price: priceAfter ? parseFloat(priceAfter[1].replace(/,/g, "")) : null,
      oldPrice: priceBefore ? parseFloat(priceBefore[1].replace(/,/g, "")) : null,
      isNew: chunk.includes("newBtn"),
      image: imgM ? BASE + "/" + imgM[1] : null,
      brandPageRef: null,
    });
  }
  return products;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("[1/3] crawling brands.php ...");
  const brands = await crawlBrands();
  console.log("brands found:", brands.length);

  const catalog = [];
  let brandIdx = 0;
  for (const b of brands) {
    brandIdx++;
    let page = 1;
    let collected = new Map();
    while (true) {
      const url = BASE + "/brand.php?id=" + b.id + (page > 1 ? "&page=" + page : "");
      const html = await get(url);
      if (!html) break;
      const items = parseProductsFromBrandPage(html);
      const fresh = items.filter((it) => !collected.has(it.yaqootId));
      if (!fresh.length) break;
      fresh.forEach((it) => collected.set(it.yaqootId, it));
      const hasMoreLink = /page=\d+/.test(html.slice(html.lastIndexOf("product.php")));
      if (collected.size >= (b.expectedCount || Infinity) || !hasMoreLink || page > 12) break;
      page++;
      await sleep(150);
    }
    for (const it of collected.values()) {
      it.brandYaqoot = b.nameAr;
      it.brandId = b.id;
      catalog.push(it);
    }
    if (brandIdx % 25 === 0) console.log(`  brands ${brandIdx}/${brands.length} | products so far: ${catalog.length}`);
    await sleep(140);
  }

  console.log("[2/3] done crawling. total products:", catalog.length);
  fs.writeFileSync(
    path.join(OUT_DIR, "yaqoot-live-catalog.json"),
    JSON.stringify({ crawledAt: new Date().toISOString(), source: "yaqootstoreye.com", brands: brands.length, products: catalog }, null, 1),
    "utf8"
  );
  console.log("[3/3] saved -> market-data/yaqoot-live-catalog.json");

  /* quick stats */
  const withPrice = catalog.filter((p) => p.price !== null).length;
  const newItems = catalog.filter((p) => p.isNew).length;
  console.log("with price:", withPrice, "| flagged NEW:", newItems);
})();
