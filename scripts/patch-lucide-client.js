const fs = require("fs");
const path = require("path");

const targets = [
  path.join("node_modules", "lucide-react", "dist", "cjs", "lucide-react.js"),
];

const marker = '"use client";\n';

for (const file of targets) {
  if (!fs.existsSync(file)) {
    console.log("[SKIP] not found:", file);
    continue;
  }
  let c = fs.readFileSync(file, "utf8");
  if (c.startsWith(marker)) {
    console.log("[OK] already patched:", file);
    continue;
  }
  fs.writeFileSync(file, marker + c, "utf8");
  console.log("[PATCHED] " + file);
}
