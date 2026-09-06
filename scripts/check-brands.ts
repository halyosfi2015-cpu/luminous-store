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

const brandSlugToUUID = new Map<string, string>();
const brandNameToUUID = new Map<string, string>();
for (const b of brands) {
  brandSlugToUUID.set(b.slug, b.id);
  brandNameToUUID.set(normalizeForMatch(b.name), b.id);
}

function matchBrand(prodBrand: string): string | null {
  if (!prodBrand) return null;
  const sa = prodBrand.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u0600-\u06FF-]/g, '');
  if (brandSlugToUUID.has(sa)) return brandSlugToUUID.get(sa) ?? null;
  const nm = normalizeForMatch(prodBrand);
  if (brandNameToUUID.has(nm)) return brandNameToUUID.get(nm) ?? null;
  return null;
}

const unmatched = new Set<string>();
let matched = 0;
for (const p of products) {
  const bid = matchBrand(p.brand || '');
  if (!bid) {
    unmatched.add(p.brand || 'UNKNOWN');
  } else {
    matched++;
  }
}
console.log('Total products:', products.length);
console.log('Matched:', matched);
console.log('Unmatched products:', products.length - matched);
console.log('Unique unmatched brands:', [...unmatched].join(', '));
