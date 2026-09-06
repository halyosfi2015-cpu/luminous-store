const fs = require('fs');
const src = fs.readFileSync('src/data/products.ts', 'utf8');
const m = src.match(/id: "yq-\d+"/g);
const ids = [...new Set(m.map(x => x.match(/yq-(\d+)/)[1]))];
console.log('Existing product count:', ids.length);
console.log('IDs:', ids.slice(0,20));