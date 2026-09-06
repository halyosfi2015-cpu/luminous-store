import { products } from '@/src/data/products';
import { brands } from '@/src/data/brands';

function normalizeForMatch(s: string): string {
  if (typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .replace(/['''`]/g, '')
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

const brandSlugToUUID = new Map();
const brandNameToUUID = new Map();
for (const b of brands) {
  const uid = `brand:${b.slug}`;
  brandSlugToUUID.set(b.slug, uid);
  const nameStr = typeof b.name === 'string' ? b.name : (b.name || b.nameAr || '');
  brandNameToUUID.set(normalizeForMatch(nameStr), uid);
}

function matchBrand(prodBrand: string): string | null {
  if (!prodBrand) return null;
  const slugAttempt = prodBrand.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u0600-\u06FF-]/g, '');
  if (brandSlugToUUID.has(slugAttempt)) return brandSlugToUUID.get(slugAttempt);
  const normAttempt = normalizeForMatch(prodBrand);
  if (brandNameToUUID.has(normAttempt)) return brandNameToUUID.get(normAttempt);
  return null;
}

const unmatched = new Set();
const brandToProductCount = new Map();
for (const p of products) {
  const bid = matchBrand(p.brand || '');
  if (!bid) {
    const b = p.brand || 'UNKNOWN';
    unmatched.add(b);
    brandToProductCount.set(b, (brandToProductCount.get(b) || 0) + 1);
  }
}

console.log('Total unmatched:', unmatched.size);
console.log('Matched:', products.length - unmatched.size);

// Print unmatched sorted by product count
const sorted = [...unmatched].sort((a, b) => 
  (brandToProductCount.get(b) || 0) - (brandToProductCount.get(a) || 0)
);

for (const b of sorted) {
  console.log(`  ${b} (${brandToProductCount.get(b) || 0})`);
}
