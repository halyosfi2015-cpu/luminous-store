/**
 * Post-install patch for Next.js 16.2.12 bundled runtimes.
 *
 * Root cause: Turbopack and Webpack barrel-optimize client modules (e.g.
 * lucide-react) into SSR chunks. The React resolution for these optimized
 * modules resolves to `vendored["react-rsc"].React` — the RSC (React Server
 * Components) build — which lacks client-side APIs (hooks, createContext,
 * etc.). This causes TypeError during SSR page data collection.
 *
 * Fix: After both RSC and SSR React builds are registered in the runtime,
 * proxy all missing APIs from the SSR React build onto the RSC entrypoints
 * module. This is safe because SSR React is a superset of RSC React, and
 * the RSC entrypoint is only accessed via vendored["react-rsc"].React for
 * modules that actually need the full React API.
 *
 * Files patched:
 *   - app-page.runtime.prod.js      (Webpack production)
 *   - app-page-turbo.runtime.prod.js (Turbopack production)
 */
"use strict";
const fs = require("fs");
const path = require("path");

const NEXT_DIR = path.join(
  __dirname,
  "..",
  "node_modules",
  "next",
  "dist",
  "compiled",
  "next-server"
);

function makePolyfillCode(rscVar, ssrVar) {
  // lang=JavaScript
  // The RSC (react-server) build exports hooks as stubs that read their own
  // internal dispatcher (k.H), which is null outside the flight renderer, so
  // `!rsc.React.useContext` is never true even though calling the hook throws
  // "Cannot read properties of null (reading 'useContext')". Therefore we
  // trigger whenever the two React builds differ and overwrite every property
  // with the SSR build's implementation (a superset that dispatches via the
  // real SSR renderer dispatcher).
  return (
    `;if(${rscVar}.React&&${ssrVar}.React&&${rscVar}.React!==${ssrVar}.React){` +
    `var $k=Object.getOwnPropertyNames(${ssrVar}.React);` +
    `for(var $i=0;$i<$k.length;$i++){` +
    `var $p=$k[$i];` +
    `try{${rscVar}.React[$p]=${ssrVar}.React[$p]}catch($e){}` +
    `}` +
    `}`
  );
}

const PATCHES = [
  {
    file: "app-page.runtime.prod.js",
    after: "e(s.React),t(o.React)",
    before: "}class uz",
    rscVar: "s",
    ssrVar: "o",
  },
  {
    file: "app-page-turbo.runtime.prod.js",
    after: "e(r.React),t(n.React)",
    before: "}class uF",
    rscVar: "r",
    ssrVar: "n",
  },
];

let patchedCount = 0;

for (const { file, after, before, rscVar, ssrVar } of PATCHES) {
  const filePath = path.join(NEXT_DIR, file);

  if (!fs.existsSync(filePath)) {
    console.log(`[SKIP] ${file} — not found`);
    continue;
  }

  let content = fs.readFileSync(filePath, "utf8");

  const polyfillCode = makePolyfillCode(rscVar, ssrVar);
  const afterIdx = content.indexOf(after);
  const beforeIdx = content.indexOf(before, afterIdx + after.length);

  if (afterIdx === -1 || beforeIdx === -1) {
    console.log(
      `[WARN] ${file} — pattern not found (after=${JSON.stringify(after)}, before=${JSON.stringify(before)}), may need manual update for new Next.js version`
    );
    continue;
  }

  const insertionPoint = afterIdx + after.length;
  const currentBetween = content.slice(insertionPoint, beforeIdx);

  if (currentBetween === polyfillCode) {
    console.log(`[OK] ${file} — already patched`);
  } else {
    // Strip whatever is currently between `after` and `before` (e.g. an older
    // polyfill variant), then insert the current one.
    content =
      content.slice(0, insertionPoint) +
      polyfillCode +
      content.slice(beforeIdx);
    fs.writeFileSync(filePath, content, "utf8");
    if (currentBetween.length > 0) {
      console.log(`[REPATCHED] ${file} (replaced stale block)`);
    } else {
      console.log(`[PATCHED] ${file}`);
    }
  }
  patchedCount++;
}

if (patchedCount === PATCHES.length) {
  console.log(`\nAll ${patchedCount} runtime files patched successfully.`);
  console.log("The SSR `createContext` / `useContext` build errors are now fixed.");
} else {
  console.log(`\nPatched ${patchedCount}/${PATCHES.length} files. Review warnings above.`);
  process.exit(1);
}
