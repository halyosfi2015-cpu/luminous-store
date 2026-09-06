import { products } from '@/src/data/products';
import { brands } from '@/src/data/brands';

function normalizeForMatch(s: string): string {
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

const brandNameToSlug = new Map<string, string>();
for (const b of brands) {
  brandNameToSlug.set(normalizeForMatch(b.name), b.slug);
}

function matchBrand(prodBrand: string): string | null {
  if (!prodBrand) return null;
  const nm = normalizeForMatch(prodBrand);
  if (brandNameToSlug.has(nm)) return brandNameToSlug.get(nm)!;
  return null;
}

const unmatched = new Set<string>();
for (const p of products) {
  const bid = matchBrand(p.brand || '');
  if (!bid) {
    unmatched.add(p.brand || 'UNKNOWN');
  }
}

// Filter to likely real brands (English, recognizable brand names)
const realBrands = [...unmatched].filter(b => {
  if (b === 'UNKNOWN' || b === 'ماركة غير محددة') return false;
  // Skip things that look like product descriptors (contain "قرص", numbers, etc)
  const lower = b.toLowerCase();
  if (lower.includes('قرص') || lower.includes('قرص')) return false; // "pill/capsule"
  if (lower.includes('مل') && lower.match(/\d/)) return false; // "100 مل" etc
  if (lower.includes('جم') && lower.match(/\d/)) return false; // weight measurements
  if (lower.match(/^\d+$/)) return false; // just numbers
  if (lower.includes('من ')) return false; // "من لوريال باريس" etc
  if (lower.includes('بيع')) return false; // selling descriptions
  if (lower.includes('الخزامى')) return false;
  if (lower.includes('قازاز')) return false;
  if (lower.includes('فاشكول')) return false;
  if (lower.includes('فرزاتشي')) return false; // "fragrance" not a brand
  return true;
});

console.log('Real unmatched brands:');
for (const b of realBrands.sort()) {
  console.log(`  ${b}`);
}
console.log(`Count: ${realBrands.length}`);
