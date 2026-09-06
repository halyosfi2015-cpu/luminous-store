import { products } from '@/src/data/products';
import { brands } from '@/src/data/brands';

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[''']/g, '')
    .replace(/\./g, '')
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/&/g, 'and')
    .replace(/\u200e/g, '')
    .replace(/\u200f/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const brandNameToUUID = new Map();
for (const b of brands) {
  brandNameToUUID.set(normalizeForMatch(b.name), b.id);
}

function matchBrand(prodBrand: string): string | null {
  if (!prodBrand) return null;
  const nm = normalizeForMatch(prodBrand);
  if (brandNameToUUID.has(nm)) return brandNameToUUID.get(nm)!;
  return null;
}

const unmatched = new Set<string>();
const brandToProductCount = new Map<string, number>();
for (const p of products) {
  const bid = matchBrand(p.brand || '');
  if (!bid) {
    unmatched.add(p.brand || 'UNKNOWN');
    brandToProductCount.set(p.brand || 'UNKNOWN', (brandToProductCount.get(p.brand || 'UNKNOWN') || 0) + 1);
  }
}

// Sort and display
const sorted = [...unmatched].sort();
console.log('Total unmatched brands:', sorted.length);
for (const b of sorted) {
  const count = brandToProductCount.get(b) || 0;
  console.log(`  "${b}" : ${count} products`);
}