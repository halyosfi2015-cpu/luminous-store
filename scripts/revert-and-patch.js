const fs = require("fs");

const configs = [
  {
    file: "node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js",
    rsc: "s",
    ssr: "o",
  },
  {
    file: "node_modules/next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",
    rsc: "r",
    ssr: "n",
  },
];

function makePolyfillCode(rsc, ssr) {
  return (
    `;if(${rsc}.React&&${ssr}.React&&${rsc}.React!==${ssr}.React&&!${rsc}.React.useContext){` +
    `var $k=Object.getOwnPropertyNames(${ssr}.React);` +
    `for(var $i=0;$i<$k.length;$i++){` +
    `var $p=$k[$i];` +
    `if(!($p in ${rsc}.React)||${rsc}.React[$p]===null){` +
    `try{${rsc}.React[$p]=${ssr}.React[$p]}catch($e){}` +
    `}` +
    `}` +
    `}`
  );
}

const oldBodies = [
  ';if($RSC$.React&&$SSR$.React&&$RSC$.React!==$SSR$.React&&!$RSC$.React.useContext){var $k=Object.getOwnPropertyNames($SSR$.React);for(var $i=0;$i<$k.length;$i++){var $p=$k[$i];if(!($p in $RSC$.React)){try{$RSC$.React[$p]=$SSR$.React[$p]}catch($e){}}}}}',
  ';if($RSC$.React&&$SSR$.React&&$RSC$.React!==$SSR$.React&&!$RSC$.React.useContext){var $k=Object.getOwnPropertyNames($SSR$.React);for(var $i=0;$i<$k.length;$i++){var $p=$k[$i];if(!($p in $RSC$.React)||$RSC$.React[$p]===null){try{$RSC$.React[$p]=$SSR$.React[$p]}catch($e){}}}}}',
];

for (const { file, rsc, ssr } of configs) {
  let c = fs.readFileSync(file, "utf8");
  const insertPoint = `e(${rsc}.React),t(${ssr}.React)`;

  // Remove old polyfill bodies
  for (const oldBody of oldBodies) {
    const body = oldBody.replace(/\$RSC\$/g, rsc).replace(/\$SSR\$/g, ssr);
    let prev;
    do {
      prev = c;
      c = c.replace(body, "");
    } while (c !== prev);
  }

  // Insert new polyfill
  const newPolyfill = makePolyfillCode(rsc, ssr);
  if (c.includes(newPolyfill)) {
    console.log(`[OK] ${file} already has latest polyfill`);
    continue;
  }

  // Replace `e(s.React),t(o.React);class` with `e(s.React),t(o.React)POLYFILL;class`
  const searchAfter = "class ";
  const afterInsertIdx = c.indexOf(searchAfter);
  if (afterInsertIdx === -1) {
    console.log(`[WARN] ${file}: 'class ' not found`);
    continue;
  }

  const beforeClass = c.substring(0, afterInsertIdx);
  const afterClass = c.substring(afterInsertIdx);
  const insertEnd = "class ";

  // Check if insert point is in the right location
  const searchPoint = insertPoint;
  const spIdx = beforeClass.lastIndexOf(searchPoint);
  if (spIdx === -1) {
    console.log(`[WARN] ${file}: insert point '${searchPoint}' not found near class`);
    continue;
  }

  // Get everything between insertPoint and 'class '
  const between = beforeClass.substring(spIdx + searchPoint.length);
  if (between.length > 0) {
    console.log(`[WARN] ${file}: unexpected content between insert point and class: ${JSON.stringify(between.substring(0, 30))}`);
    // Remove the unexpected content
    c = c.substring(0, spIdx + searchPoint.length) + c.substring(afterInsertIdx);
    console.log(`[FIXED] ${file}: removed extraneous content`);
  }

  c = c.replace(
    searchPoint + insertEnd,
    searchPoint + newPolyfill + ";" + insertEnd
  );

  fs.writeFileSync(file, c, "utf8");
  console.log(`[PATCHED] ${file}`);
}

console.log("Done.");
