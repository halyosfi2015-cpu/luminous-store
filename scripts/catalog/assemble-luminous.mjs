import fs from 'fs';
import { buildProductTS, priceFixes, classified, catalogMap, extractProductName, extractBrandFromTitle, brandArabicToEnglish } from './luminous-generator.mjs';

const root = "C:/Users/user/Desktop/Luminous-Final Project Hamed final";

// ==================== 1. PARSE CURRENT products.ts ====================
const c = fs.readFileSync(root + '/src/data/products.ts', 'utf8');
const lines = c.split('\n');

// Backup holds the previous session's full tail including sectionCategoriesMap definition
const backup = fs.readFileSync(process.env.TEMP + '/opencode/products-backup-2764.ts', 'utf8');
const BACKUP_SCM = (() => {
  const i = backup.indexOf('export const sectionCategoriesMap');
  if (i === -1) return null;
  const j = backup.indexOf('];', i);
  return backup.substring(i, j + 2);
})();
console.log('backup sectionCategoriesMap found:', !!BACKUP_SCM);

const startIdx = lines.findIndex(l => l.trim() === 'export const products: Product[] = [');
if (startIdx === -1) throw new Error('products array not found');
let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
  if (lines[i].trim() === '];') { endIdx = i; break; }
}
if (endIdx === -1) throw new Error('products array close not found');

// Head: everything before products array (imports, helper functions, categories)
const head = lines.slice(0, startIdx).join('\n');
// Tail: everything after products array (sectionCategoriesMap, sectionCategories, routines, exports)
let tail = lines.slice(endIdx + 1).join('\n');
// Ensure sectionCategoriesMap definition exists in products.ts (lib/products.ts re-exports it)
if (BACKUP_SCM && !tail.includes('export const sectionCategoriesMap')) {
  tail = BACKUP_SCM + '\n\n' + tail;
  console.log('injected sectionCategoriesMap into tail');
}

// Parse product blocks from current file
const region = lines.slice(startIdx + 1, endIdx);
const blocks = [];
let i = 0;
while (i < region.length) {
  if (region[i].trim() === '{') {
    const block = []; let depth = 0;
    while (i < region.length) {
      const line = region[i]; block.push(line);
      depth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      i++; if (depth === 0) break;
    }
    blocks.push(block.join('\n'));
  } else i++;
}
console.log('current blocks parsed:', blocks.length);

// ==================== 2. IDENTIFY ORIGINAL 354 ====================
// The original 354 in git HEAD are yq-754..yq-2792 (they appear as blocks 0..353 in current file).
// Cross-check: verify blocks 0..353 ids match the id pattern we saw in HEAD analysis.
const blockIds = blocks.map(b => (b.match(/id:\s*"(yq-\d+)"/) || [])[1]);
const originalIds = new Set(blockIds.slice(0, 354));
console.log('blocks 0..353 (treated original):', blockIds.slice(0, 5).join(','), '...', blockIds.slice(350, 354).join(','));

// ==================== 3. BUILD NEW PRODUCTS FROM classified.json ====================
// Exclude classified entries whose yq-id is already an original
const newProducts = classified.filter(p => !originalIds.has('yq-' + p.id));
console.log('new products from classified:', newProducts.length);

// Build brand map: normalize brand -> english
const brandSet = new Set();
for (const p of classified) {
  let b = (p.brand || '').trim();
  if (!b || b === 'Unknown') {
    const bf = extractBrandFromTitle(p.title || '');
    if (bf) b = bf;
  }
  if (b) brandSet.add(b);
}
console.log('distinct brands:', brandSet.size);

const newBlocks = [];
const newPricingInfo = [];
for (const yq of newProducts) {
  try {
    newBlocks.push(buildProductTS(yq, brandArabicToEnglish));
    const orig = yq.originalPrice || 0;
    newPricingInfo.push({ id: 'yq-' + yq.id, orig, price: orig > 0 ? orig - 200 : (yq.salePrice || 0) });
  } catch (e) {
    console.log('ERROR building yq-' + yq.id + ':', e.message);
  }
}
console.log('new blocks built:', newBlocks.length);

// ==================== 4. ASSEMBLE FINAL FILE ====================
const originalBlocks = blocks.slice(0, 354);
const allBlocks = [...originalBlocks, ...newBlocks];
console.log('total blocks:', allBlocks.length);

const productsArray = 'export const products: Product[] = [\n' + allBlocks.join('\n') + '\n];';
const finalContent = head + '\n' + productsArray + '\n' + tail;

fs.writeFileSync(root + '/src/data/products.ts', finalContent, 'utf8');

// ==================== 5. VERIFY ====================
console.log('\n=== VERIFICATION ===');
const out = fs.readFileSync(root + '/src/data/products.ts', 'utf8');
const outLines = out.split('\n');
const sIdx = outLines.findIndex(l => l.trim() === 'export const products: Product[] = [');
let eIdx = -1;
for (let k = sIdx; k < outLines.length; k++) {
  if (outLines[k].trim() === '];') { eIdx = k; break; }
}
const outRegion = outLines.slice(sIdx + 1, eIdx);
const outBlocks = [];
let j = 0;
while (j < outRegion.length) {
  if (outRegion[j].trim() === '{') {
    const blk = []; let d = 0;
    while (j < outRegion.length) {
      const l = outRegion[j]; blk.push(l);
      d += (l.match(/{/g) || []).length - (l.match(/}/g) || []).length;
      j++; if (d === 0) break;
    }
    outBlocks.push(blk.join('\n'));
  } else j++;
}
const outIds = outBlocks.map(b => (b.match(/id:\s*"(yq-\d+)"/) || [])[1]);
console.log('total products written:', outBlocks.length);
console.log('unique ids:', new Set(outIds).size);
console.log('duplicates:', outBlocks.length - new Set(outIds).size);

// Price verification
let priceOk = 0, priceMissing = 0, zeroPriced = 0;
for (const blk of outBlocks) {
  const p = blk.match(/pricing:\s*\{\s*price:\s*(\d+)/);
  if (p) { if (+p[1] > 0) priceOk++; else zeroPriced++; } else priceMissing++;
}
console.log('blocks with price>0:', priceOk, 'price==0:', zeroPriced, 'missing:', priceMissing);

// originalPrice field count
const withOrig = outBlocks.filter(b => /originalPrice:\s*\d+/.test(b)).length;
console.log('blocks with originalPrice set:', withOrig);

// No copied "من براند" in names (new blocks)
const copiedPattern = newBlocks.filter(b => /name:\s*\{\s*ar:\s*"[^"]*\s*[-–—]+\s*من\s+/.test(b)).length;
console.log('new blocks with "- من brand" still in name:', copiedPattern);

// Gallery URL check (fake local paths)
const fakeGallery = newBlocks.filter(b => /\/images\/products\/yq-/.test(b)).length;
console.log('new blocks with fake local image paths:', fakeGallery);

console.log('file size MB:', (Buffer.byteLength(out) / 1024 / 1024).toFixed(2));