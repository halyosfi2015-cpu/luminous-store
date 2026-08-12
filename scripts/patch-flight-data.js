const fs = require("fs");
const path = require("path");

const files = [
  "node_modules/next/dist/client/flight-data-helpers.js",
  "node_modules/next/dist/esm/client/flight-data-helpers.js",
];

for (const file of files) {
  const fp = path.join(__dirname, "..", file);
  if (!fs.existsSync(fp)) {
    console.log(`[SKIP] ${file} not found`);
    continue;
  }
  let c = fs.readFileSync(fp, "utf8");
  const oldPatch = "typeof location!=='undefined'?new URL(location.href):new URL('http://localhost:3000')";
  const search = "new URL(location.href)";
  const replace =
    "new URL((globalThis.location&&globalThis.location.href)||'http://localhost:3000/')";

  if (c.includes(replace)) {
    console.log(`[OK] ${file} already patched`);
  } else if (c.includes(oldPatch)) {
    c = c.replace(oldPatch, replace);
    fs.writeFileSync(fp, c, "utf8");
    console.log(`[REPATCHED] ${file} (replaced broken typeof guard)`);
  } else if (c.includes(search)) {
    c = c.replace(search, replace);
    fs.writeFileSync(fp, c, "utf8");
    console.log(`[PATCHED] ${file}`);
  } else {
    console.log(`[WARN] ${file} pattern not found`);
  }
}
