const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/data/products.ts');
const s = fs.readFileSync(file, 'utf8');
const prodIds = [...s.matchAll(/id:\s*"(yq-[0-9]+)"/g)].map(m => m[1]);
const routineMatches = [...s.matchAll(/products:\s*\[((?:[\s\S]*?)?)\]/g)];
const routineIds = routineMatches.flatMap(m => [...m[1].matchAll(/"(yq-[0-9]+)"/g)].map(x => x[1]));
const prodSet = new Set(prodIds);
const missing = routineIds.filter(id => !prodSet.has(id));
console.log('totalProducts', prodIds.length);
console.log('totalRoutineRefs', routineIds.length);
console.log('uniqueRoutineRefs', new Set(routineIds).size);
console.log('missingRefsUniqueCount', new Set(missing).size);
if (missing.length > 0) {
  console.log('missingRefs (unique):', Array.from(new Set(missing)).slice(0, 200));
}
else console.log('no missing refs');
