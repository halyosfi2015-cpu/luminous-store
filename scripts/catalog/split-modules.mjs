import fs from 'fs';

const root = process.cwd();

// ============================================================
// SPLIT products.ts  (12.18 MB, 2764 products)
// ============================================================
function splitProducts() {
  const file = root + '/src/data/products.ts';
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split('\n');

  // Idempotent: if already in aggregator form (products defined via spreads of
  // productsPartXX), do nothing.
  if (lines.some(l => l.trim().startsWith('...productsPart'))) {
    console.log('products: already split (aggregator form) — skipping');
    return;
  }

  const startIdx = lines.findIndex(l => l.trim() === 'export const products: Product[] = [');
  if (startIdx === -1) throw new Error('products array start not found');
  let endIdx = -1;
  for (let k = startIdx; k < lines.length; k++) {
    if (lines[k].trim() === '];') { endIdx = k; break; }
  }
  if (endIdx === -1) throw new Error('products array end not found');

  const HEAD = lines.slice(0, startIdx);               // import + categories
  const blocks = [];                                   // product object blocks
  const region = lines.slice(startIdx + 1, endIdx);
  let i = 0;
  while (i < region.length) {
    if (region[i].trim() === '{') {
      const blk = []; let d = 0;
      while (i < region.length) {
        const l = region[i]; blk.push(l);
        d += (l.match(/{/g) || []).length - (l.match(/}/g) || []).length;
        i++; if (d === 0) break;
      }
      blocks.push(blk);
    } else i++;
  }
  const TAIL = lines.slice(endIdx + 1);
  console.log('products: blocks=' + blocks.length + ' head=' + HEAD.length + ' tail=' + TAIL.length);

  const N = 8;
  const perChunk = Math.ceil(blocks.length / N);
  const parts = [];
  for (let p = 0; p < N; p++) {
    const chunk = blocks.slice(p * perChunk, (p + 1) * perChunk);
    if (chunk.length === 0) continue;
    parts.push(chunk);
  }
  console.log('products: parts=' + parts.length + ' perChunk~' + perChunk);

  // Write part files
  const partFiles = [];
  parts.forEach((chunk, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const name = 'products-part-' + num + '.ts';
    const header = 'import type { Product } from "@/src/types/product";\n\n' +
      'export const productsPart' + num + ': Product[] = [\n';
    const body = chunk.map(b => b.join('\n')).join('\n');
    const footer = '\n];\n';
    fs.writeFileSync(root + '/src/data/' + name, header + body + footer, 'utf8');
    partFiles.push({ num, name });
  });

  // Write aggregator products.ts
  const imports = partFiles.map(pf =>
    `import { productsPart${pf.num} } from "./${pf.name.replace('.ts', '')}";`).join('\n');
  const spreads = partFiles.map(pf => `  ...productsPart${pf.num},`).join('\n');

  const out = [
    ...HEAD,
    imports,
    '',
    'export const products: Product[] = [',
    spreads,
    '];',
    ...TAIL,
  ].join('\n');

  fs.writeFileSync(file, out, 'utf8');
  console.log('products: wrote ' + partFiles.length + ' parts + aggregator (' + (out.length/1024/1024).toFixed(2) + ' MB)');
}

// ============================================================
// SPLIT product-summaries.ts  (2.83 MB, 2764 summaries)
// ============================================================
function splitSummaries() {
  const file = root + '/src/data/product-summaries.ts';
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split('\n');

  // Idempotent: skip if already in aggregator form.
  if (lines.some(l => l.trim().startsWith('...productSummariesPart'))) {
    console.log('summaries: already split (aggregator form) — skipping');
    return;
  }

  // header comment block lines 0-4, import line 5, blank 6
  // find productSummaries array
  const arrIdx = lines.findIndex(l => l.trim().startsWith('export const productSummaries: ProductSummary[] = ['));
  if (arrIdx === -1) throw new Error('summaries array start not found');
  let endIdx = -1;
  for (let k = arrIdx; k < lines.length; k++) {
    if (lines[k].trim() === '];') { endIdx = k; break; }
  }
  if (endIdx === -1) throw new Error('summaries array end not found');

  const HEAD = lines.slice(0, arrIdx);   // comment + import
  const rows = lines.slice(arrIdx + 1, endIdx);  // summary entries
  const TAIL = lines.slice(endIdx + 1);

  const N = 8;
  const perChunk = Math.ceil(rows.length / N);
  const parts = [];
  for (let p = 0; p < N; p++) {
    const chunk = rows.slice(p * perChunk, (p + 1) * perChunk);
    if (chunk.length) parts.push(chunk);
  }
  console.log('summaries: rows=' + rows.length + ' parts=' + parts.length);

  const partFiles = [];
  parts.forEach((chunk, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const name = 'product-summaries-part-' + num + '.ts';
    const header = 'import type { ProductSummary } from "@/src/types/product";\n\n' +
      'export const productSummariesPart' + num + ': ProductSummary[] = [\n';
    const body = chunk.join('\n');
    const footer = '\n];\n';
    fs.writeFileSync(root + '/src/data/' + name, header + body + footer, 'utf8');
    partFiles.push({ num, name });
  });

  const imports = partFiles.map(pf =>
    `import { productSummariesPart${pf.num} } from "./${pf.name.replace('.ts', '')}";`).join('\n');
  const spreads = partFiles.map(pf => `  ...productSummariesPart${pf.num},`).join('\n');

  const out = [
    ...HEAD,
    imports,
    '',
    'export const productSummaries: ProductSummary[] = [',
    spreads,
    '];',
    ...TAIL,
  ].join('\n');

  fs.writeFileSync(file, out, 'utf8');
  console.log('summaries: wrote ' + partFiles.length + ' parts + aggregator (' + (out.length/1024/1024).toFixed(2) + ' MB)');
}

splitProducts();
splitSummaries();