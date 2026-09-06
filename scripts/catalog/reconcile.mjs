import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = "C:/Users/user/Desktop/Luminous-Final Project Hamed final";

// Load existing Luminous products
const src = fs.readFileSync(path.join(root, 'src/data/products.ts'), 'utf8').replace(/^\uFEFF/, '');
const clean = src
  .replace(/^import type[\s\S]*?from ['"][^'"]+['"];\s*/g, '')
  .replace(/^import[\s\S]*?from ['"][^'"]+['"];\s*/g, '')
  .replace(/export const products: Product\[\]/g, 'export const products')
  .replace(/export const categories: CategoryInfo\[\]/g, 'export const categories')
  .replace(/export const routines: Routine\[\]/g, 'export const routines')
  .split('\nexport function ')[0];

const tmpDir = path.join(__dirname, '..', 'data', 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });
fs.writeFileSync(path.join(tmpDir, 'products-data.ts'), clean, 'utf8');
fs.writeFileSync(path.join(tmpDir, 'package.json'), '{ "type": "module" }', 'utf8');
const mod = await import('file:///' + path.join(tmpDir, 'products-data.ts?t=' + Date.now()).replace(/\\/g, '/'));
const luminous = mod.products;

// Load classified Yaqoot catalog
const classified = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'classified.json'), 'utf8'));

// Build lookup by Yaqoot ID
const yaqootById = new Map(classified.map(c => [c.id, c]));

const lines = [];
lines.push('=== EXISTING 354 PRODUCTS RECONCILIATION ===');
let matched = 0, unmatched = 0, priceFixed = 0;
for (const p of luminous) {
  const yqId = parseInt(p.id.replace(/^yq-/, ''), 10);
  const yq = yaqootById.get(yqId);
  if (!yq) {
    lines.push(`MISSING in Yaqoot: ${p.id} (${p.name.ar})`);
    unmatched++;
    continue;
  }
  matched++;
  
  // Price check: current vs Yaqoot original
  const currentPrice = p.pricing.price;
  const yaqootOriginal = yq.originalPrice;
  const yaqootSale = yq.salePrice;
  const luminousTarget = yaqootOriginal ? yaqootOriginal - 200 : null;
  
  if (yaqootOriginal && yaqootSale) {
    const wasDiscounted = currentPrice === (yaqootSale - 200);
    const isCorrect = currentPrice === luminousTarget;
    
    if (wasDiscounted && !isCorrect) {
      lines.push(`PRICE FIX NEEDED: ${p.id} | current=${currentPrice} | Yaqoot orig=${yaqootOriginal} sale=${yaqootSale} -> Luminous=${luminousTarget}`);
      priceFixed++;
    } else if (isCorrect) {
      lines.push(`PRICE OK: ${p.id} | current=${currentPrice} | target=${luminousTarget}`);
    } else {
      lines.push(`PRICE CHECK: ${p.id} | current=${currentPrice} | orig=${yaqootOriginal} sale=${yaqootSale} -> target=${luminousTarget}`);
    }
  }
}

lines.push('');
lines.push(`Matched: ${matched}, Unmatched: ${unmatched}, Price fixes needed: ${priceFixed}`);

// New candidates: Yaqoot products not in Luminous
const luminousIds = new Set(luminous.map(p => parseInt(p.id.replace(/^yq-/, ''), 10)));
const newCandidates = classified.filter(c => !luminousIds.has(c.id) && c.category !== 'uncategorized');
lines.push(`New candidates (excl uncategorized): ${newCandidates.length}`);

fs.writeFileSync(path.join(__dirname, 'data', 'reconciliation.txt'), lines.join('\n'), 'utf8');
console.log(lines.join('\n'));