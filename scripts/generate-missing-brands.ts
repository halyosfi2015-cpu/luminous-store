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

interface BrandEntry {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  nameEn?: string;
  logo: string;
  coverImage: string;
  description: string;
  descriptionAr: string;
  origin: string;
  originAr: string;
  isVerified: boolean;
  featured: boolean;
  productCount: number;
  seoMetadata: {
    title: { ar: string; en: string };
    description: { ar: string; en: string };
    keywords: string[];
  };
}

const unmatched = new Set<string>();
for (const p of products) {
  const bid = matchBrand(p.brand || '');
  if (!bid) {
    unmatched.add(p.brand || 'UNKNOWN');
  }
}

let counter = 259;
const newBrands: BrandEntry[] = [];
for (const brandName of [...unmatched].sort()) {
  if (brandName === 'UNKNOWN' || brandName === 'ماركة غير محددة') continue;
  const slug = brandName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u0600-\u06FF-]/g, '').substring(0, 50);
  newBrands.push({
    id: `brand-${String(counter).padStart(3, '0')}`,
    slug: slug || `brand-${counter}`,
    name: brandName,
    nameAr: brandName,
    nameEn: brandName,
    logo: '/images/brands/placeholder.png',
    coverImage: '/images/brands/placeholder-cover.svg',
    description: '',
    descriptionAr: '',
    origin: 'Unknown',
    originAr: 'غير معروف',
    isVerified: false,
    featured: false,
    productCount: 0,
    seoMetadata: {
      title: { ar: `${brandName} - منتجات أصلية`, en: `${brandName} - Authentic Products` },
      description: { ar: `منتجات ${brandName} الأصلية`, en: `Authentic ${brandName} products` },
      keywords: [brandName, `${brandName} original`],
    },
  });
  counter++;
}

// Output the new brand entries to be appended
console.log('// === Missing brands to add ===');
console.log(JSON.stringify(newBrands, null, 2));

// Count products per unmatched brand
const brandProductCounts = new Map<string, number>();
for (const p of products) {
  const bid = matchBrand(p.brand || '');
  if (!bid) {
    const name = p.brand || 'UNKNOWN';
    brandProductCounts.set(name, (brandProductCounts.get(name) || 0) + 1);
  }
}
console.log('\n// === Product counts per unmatched brand ===');
for (const [name, count] of [...brandProductCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${name}: ${count}`);
}
