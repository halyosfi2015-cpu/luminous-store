"use strict";
const fs = require("node:fs");
const root = ".next\\server\\app";

function analyze(file) {
  const p = `${root}\\${file}`;
  if (!fs.existsSync(p)) {
    console.log(`${file}: MISSING`);
    return;
  }
  const buf = fs.readFileSync(p);
  const len = buf.length;
  const html = buf.toString("utf8");
  console.log(`\n=== ${file}  (${(len/1024).toFixed(0)} KB, ${len} bytes) ===`);

  // inline script blocks
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  let m;
  let inlineTotal = 0;
  let inlineCount = 0;
  let flightTotal = 0;
  let flightCount = 0;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] || "";
    const content = m[2];
    const clen = Buffer.byteLength(content, "utf8");
    inlineTotal += clen;
    inlineCount++;
    if (attrs.includes("dangerously") || content.includes("__next_f")) {
      flightTotal += clen;
      flightCount++;
    }
  }
  console.log(`inline <script> blocks: ${inlineCount}, total inlined JS: ${(inlineTotal/1024).toFixed(0)} KB`);
  console.log(`flight (__next_f/dangerouslySetInnerHTML) script blocks: ${flightCount}, total: ${(flightTotal/1024).toFixed(0)} KB`);

  // link chunks referenced
  const links = new Set();
  const lre = /href="(\/_next\/static[^"]+)"/g;
  while ((m = lre.exec(html)) !== null) links.add(m[1]);
  console.log(`link/script refs to /_next/static: ${links.size}`);

  // counts of telltale strings
  const count = (s) => (html.split(s).length - 1);
  console.log(`"yq-754" count: ${count("yq-754")}`);
  console.log(`"gallery" count: ${count("gallery")}`);
  console.log(`"ingredients" count: ${count("ingredients")}`);
  console.log(`"usageInstructions" count: ${count("usageInstructions")}`);
  console.log(`"seoMetadata" count: ${count("seoMetadata")}`);
  console.log(`"benefits" count: ${count("benefits")}`);
  console.log(`"reviews" count: ${count("reviews")}`);
  console.log(`"__NEXT_DATA__" count: ${count("__NEXT_DATA__")}`);
  console.log(`"_next_f" count: ${count("_next_f")}`);

  // Find largest inline script and show a snippet
  let big = { len: 0, content: "" };
  const re2 = /<script[^>]*>([\s\S]*?)<\/script>/g;
  while ((m = re2.exec(html)) !== null) {
    const c = m[1];
    if (c.length > big.len) big = { len: c.length, content: c };
  }
  const snippet = big.content.slice(0, 400);
  console.log(`largest inline script: ${(big.len/1024).toFixed(0)} KB`);
  console.log("largest inline script snippet:\n" + snippet);
}

for (const f of ["index.html", "products.html", "categories.html"]) {
  analyze(f);
}
// category + product detail samples
analyze("categories\\skincare.html");
analyze("products\\yq-2313.html");
