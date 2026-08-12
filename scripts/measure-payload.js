"use strict";
/* Measurement script: captures HTML + inlined RSC + initial JS chunk bytes for a route */
const { writeFileSync } = require("node:fs");

const BASE = process.env.BASE || "http://localhost:3002";
const routes = process.argv.slice(2);

const fmt = (n) => {
  if (n >= 1048576) return (n / 1048576).toFixed(2) + " MB";
  if (n >= 1024) return (n / 1024).toFixed(1) + " KB";
  return n + " B";
};

async function fetchBuf(url) {
  const res = await fetch(url, { headers: { "user-agent": "perf-measure/1.0" } });
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, status: res.status };
}

async function measure(route) {
  const url = BASE + route;
  const htmlInfo = await fetchBuf(url);
  const html = htmlInfo.buf.toString("utf8");
  const htmlSize = htmlInfo.buf.length;

  // Extract referenced JS chunk URLs from the HTML (src="..." and modulepreload href)
  const scriptUrls = new Set();
  const attrRegex = /(?:(?:src|href)=)"(\/_next\/static[^"]+\.js)"/g;
  let m;
  while ((m = attrRegex.exec(html)) !== null) {
    scriptUrls.add(m[1]);
  }
  // also next/script or prefetch
  const prefetchRegex = /\/_next\/static\/[^\s"']+\.js/g;
  while ((m = prefetchRegex.exec(html)) !== null) {
    scriptUrls.add(m[0]);
  }

  let jsTotal = 0;
  let jsCount = 0;
  const jsSizes = [];
  for (const ref of scriptUrls) {
    try {
      const info = await fetchBuf(BASE + ref);
      jsTotal += info.buf.length;
      jsCount++;
      jsSizes.push({ ref: ref.replace("/_next/static/chunks/", ""), size: info.buf.length });
    } catch (e) {
      // ignore
    }
  }

  // inlined scripts
  const inlineScripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
  let inlineJs = 0;
  let rscPayload = 0;
  for (const s of inlineScripts) {
    const inner = s.replace(/<script[^>]*>/, "").replace(/<\/script>$/, "");
    const len = Buffer.byteLength(inner, "utf8");
    inlineJs += len;
    if (inner.includes("__next_f")) {
      rscPayload += len;
    }
  }

  const total = htmlSize + jsTotal;

  console.log(`[${route}]
  status=${htmlInfo.status}
  html=${fmt(htmlSize)} | inlined JS total=${fmt(inlineJs)} | approx RSC flight inline=${fmt(rscPayload)}
  jsChunks=${jsCount} totalJS=${fmt(jsTotal)}
  TOTAL(html+js)=${fmt(total)}`);
  return { route, htmlSize, inlineJs, rscPayload, jsTotal, jsCount, total, jsSizes };
}

(async () => {
  const results = [];
  for (const r of routes) {
    results.push(await measure(r));
    await new Promise((res) => setTimeout(res, 200));
  }
  writeFileSync("scripts/_phase44_measure.json", JSON.stringify(results, null, 2));
  console.log("\nWrote scripts/_phase44_measure.json");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
