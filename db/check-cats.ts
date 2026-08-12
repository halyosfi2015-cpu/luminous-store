import { products } from '../src/data/products';
import { categories as subCats } from '../src/data/products';

const knownSlugs = new Set(subCats.map((c: any) => c.slug));
const allProductCats = new Map<string, number>();

for (const p of products) {
  const cs = p.categorySlug || (p.category || '').toLowerCase().replace(/\s+/g, '-');
  allProductCats.set(cs, (allProductCats.get(cs) || 0) + 1);
}

const missing = [...allProductCats.entries()].filter(([slug]) => !knownSlugs.has(slug));
console.log('Known categories:', knownSlugs.size);
console.log('Product category slugs:', allProductCats.size);
console.log('Missing (not in subcategories):', missing.length);
missing.forEach(([slug, count]) => console.log(`  ${slug}: ${count} products`));
