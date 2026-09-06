import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(path.resolve());
const root = "C:/Users/user/Desktop/Luminous-Final Project Hamed final";
const tmpDir = "C:/Users/user/AppData/Local/Temp/opencode";

// Load full Yaqoot catalog from proper source
// yaqoot-fullcatalog.json has product IDs as direct keys
const yaqoot = JSON.parse(fs.readFileSync(path.join(root, 'scripts/catalog/data/yaqoot-fullcatalog.json'), 'utf8'));
const yaqootProducts = {};
for (const [idStr, data] of Object.entries(yaqoot)) {
  yaqootProducts[+idStr] = data;
}

// Brand normalization map
const brandMap = {
  "CeraVe": { brand: "CeraVe", brandEn: "CeraVe", slug: "cerave" },
  "Garnier": { brand: "Garnier", brandEn: "Garnier", slug: "garnier" },
  "L'Oréal": { brand: "L'Oréal", brandEn: "L'Oréal", slug: "l-oreal" },
  "Eveline": { brand: "Eveline", brandEn: "Eveline", slug: "eveline" },
  "La Roche-Posay": { brand: "La Roche-Posay", brandEn: "La Roche-Posay", slug: "la-roche-posay" },
  "Bioderma": { brand: "Bioderma", brandEn: "Bioderma", slug: "bioderma" },
  "Vichy": { brand: "Vichy", brandEn: "Vichy", slug: "vichy" },
  "Aveeno": { brand: "Aveeno", brandEn: "Aveeno", slug: "aveeno" },
  "Neutrogena": { brand: "Neutrogena", brandEn: "Neutrogena", slug: "neutrogena" },
  "Cetaphil": { brand: "Cetaphil", brandEn: "Cetaphil", slug: "cetaphil" },
  "Free&Clear": { brand: "Free&Clear", brandEn: "Free&Clear", slug: "free-clear" },
  "SkinFood": { brand: "SkinFood", brandEn: "SkinFood", slug: "skin-food" },
  "The Ordinary": { brand: "The Ordinary", brandEn: "The Ordinary", slug: "the-ordinary" },
  "La Mer": { brand: "La Mer", brandEn: "La Mer", slug: "la-mer" },
  "Clinique": { brand: "Clinique", brandEn: "Clinique", slug: "clinique" },
  "Estee Lauder": { brand: "Estee Lauder", brandEn: "Estee Lauder", slug: "estee-lauder" },
  "Lancôme": { brand: "Lancôme", brandEn: "Lancôme", slug: "lancôme" },
  "Maybelline": { brand: "Maybelline", brandEn: "Maybelline", slug: "maybelline" },
  "Palmer's": { brand: "Palmer's", brandEn: "Palmer's", slug: "palmers" },
  "Burt's Bees": { brand: "Burt's Bees", brandEn: "Burt's Bees", slug: "burt-bees" },
  "Olay": { brand: "Olay", brandEn: "Olay", slug: "olay" },
  "Nivea": { brand: "Nivea", brandEn: "Nivea", slug: "nivea" },
  "Dove": { brand: "Dove", brandEn: "Dove", slug: "dove" },
  "L'Oréal Paris": { brand: "L'Oréal Paris", brandEn: "L'Oréal Paris", slug: "loreal-paris" },
  "Kiehl's": { brand: "Kiehl's", brandEn: "Kiehl's", slug: "kiehls" },
  "Philosophy": { brand: "Philosophy", brandEn: "Philosophy", slug: "philosophy" },
  "Clinique for Men": { brand: "Clinique for Men", brandEn: "Clinique for Men", slug: "clinique-men" },
  "Sebamed": { brand: "Sebamed", brandEn: "Sebamed", slug: "sebamed" },
  "Avene": { brand: "Avene", brandEn: "Avene", slug: "avene" },
  "Uriage": { brand: "Uriage", brandEn: "Uriage", slug: "uriage" },
  "Eucerin": { brand: "Eucerin", brandEn: "Eucerin", slug: "eucerin" },
  "Aqualabel": { brand: "Aqualabel", brandEn: "Aqualabel", slug: "aqualabel" },
  "Hada Labo": { brand: "Hada Labo", brandEn: "Hada Labo", slug: "hada-labo" },
  "Boscia": { brand: "Boscia", brandEn: "Boscia", slug: "boscia" },
  "Dr. Jart+": { brand: "Dr. Jart+", brandEn: "Dr. Jart+", slug: "dr-jart" },
  "Innisfree": { brand: "Innisfree", brandEn: "Innisfree", slug: "innisfree" },
  "Etude House": { brand: "Etude House", brandEn: "Etude House", slug: "etude-house" },
  "Missha": { brand: "Missha", brandEn: "Missha", slug: "missha" },
  "Clio": { brand: "Clio", brandEn: "Clio", slug: "clio" },
  "3CE": { brand: "3CE", brandEn: "3CE", slug: "3ce" },
  "Marie Dal": { brand: "Marie Dal", brandEn: "Marie Dal", slug: "marie-dal" },
  "Sulwhasoo": { brand: "Sulwhasoo", brandEn: "Sulwhasoo", slug: "sulwhasoo" },
  "Amuse": { brand: "Amuse", brandEn: "Amuse", slug: "amuse" },
  "K-Beauty": { brand: "K-Beauty", brandEn: "K-Beauty", slug: "k-beauty" },
};

// Category mapping from Yaqoot section numbers
const catMap = {
  4: 'eye-care', 9: 'cleansers', 10: 'masks', 11: 'exfoliators', 12: 'toners',
  13: 'serums', 14: 'moisturizers', 15: 'sunscreen', 16: 'moisturizers', 17: 'serums',
  18: 'masks', 19: 'masks', 20: 'oral-care', 21: 'oral-care', 22: 'oral-care',
  23: 'oral-care', 25: 'oral-care', 26: 'oral-care', 27: 'oral-care', 29: 'hand-care',
  31: 'hand-care', 32: 'hand-care', 33: 'foot-care', 35: 'foot-care', 36: 'body-wash',
  37: 'body-scrubs', 38: 'body-wash', 39: 'body-lotion', 40: 'deodorants', 41: 'women-care',
  43: 'moisturizers', 44: 'moisturizers', 45: 'moisturizers', 46: 'moisturizers', 48: 'haircare',
  49: 'shampoo', 51: 'hair-masks', 52: 'hair-creams', 53: 'hair-oils', 54: 'hair-treatments',
  55: 'hair-styling', 56: 'hair-styling', 57: 'hair-dyes', 59: 'hair-tools', 60: 'makeup',
  61: 'face-makeup', 62: 'lip-makeup', 63: 'eye-makeup', 64: 'eye-makeup', 65: 'face-makeup',
  66: 'face-makeup', 67: 'makeup-tools', 68: 'face-makeup', 70: 'face-makeup', 71: 'face-makeup',
  72: 'face-makeup', 73: 'face-makeup', 74: 'face-makeup', 75: 'cleansers', 76: 'lip-makeup',
  77: 'lip-makeup', 78: 'lip-makeup', 79: 'lip-makeup', 80: 'eye-makeup', 82: 'eye-makeup',
  83: 'eye-makeup', 84: 'eye-makeup', 85: 'eye-makeup', 86: 'eye-makeup', 87: 'eye-makeup',
  88: 'face-makeup', 89: 'face-makeup', 90: 'face-makeup', 91: 'face-makeup', 92: 'face-makeup',
  93: 'face-makeup', 94: 'makeup-tools', 95: 'makeup-tools', 96: 'makeup-tools', 97: 'makeup-tools',
  98: 'makeup-tools', 99: 'makeup-tools', 100: 'beauty-devices', 103: 'perfume', 104: 'contact-lenses',
  106: 'lip-care', 107: 'lip-care', 108: 'lip-care', 109: 'lip-care', 110: 'lip-care',
  111: 'oral-care', 112: 'women-care', 113: 'baby-care', 114: 'perfume-women', 115: 'perfume-men',
  116: 'body-oils', 117: 'nail-care', 118: 'contact-lenses', 119: 'contact-lenses', 120: 'contact-lenses',
  121: 'contact-lenses', 122: 'vitamins', 123: 'nail-care', 124: 'body-wash', 125: 'body-care',
  126: 'makeup-tools', 127: 'hair-tools', 128: 'beauty-tools', 129: 'beauty-tools',
  130: 'beauty-tools', 131: 'beauty-tools', 132: 'beauty-tools', 133: 'beauty-tools', 134: 'oral-care',
  136: 'group-care', 137: 'hair-tools', 139: 'masks', 146: 'nail-care', 147: 'nail-care',
  148: 'home-fragrance', 149: 'bakhoor-premium', 150: 'shaving', 151: 'body-wash',
  152: 'body-care', 153: 'baby-care', 154: 'baby-care', 155: 'women-care',
};

// Process existing 354 Luminous products + new Yaqoot candidates
const src = fs.readFileSync(path.join(root, 'src/data/products.ts'), 'utf8').replace(/^\uFEFF/, '');
const clean = src
  .replace(/^import type[\s\S]*?from ['"][^'"]+['"];\s*/g, '')
  .replace(/^import[\s\S]*?from ['"][^'"]+['"];\s*/g, '')
  .replace(/export const products: Product\[\]/g, 'export const products')
  .replace(/export const categories: CategoryInfo\[\]/g, 'export const categories')
  .replace(/export const routines: Routine\[\]/g, 'export const routines')
  .split('\nexport function ')[0];
const dir = path.join(tmpDir, 'cat5');
fs.mkdirSync(dir, { recursive: true });

// Write stripped products data for import
fs.writeFileSync(path.join(dir, 'products-data.ts'), clean, 'utf8');
fs.writeFileSync(path.join(dir, 'package.json'), '{ "type": "module" }', 'utf8');

// Import luminous products
const mod = await import('file:///' + path.join(dir, 'products-data.ts?t=' + Date.now()).replace(/\\/g, '/'));
const luminous = mod.products;

// Build lookup maps
const luminousById = new Map(luminous.map(p => [p.id, p]));
const yqIds = new Set(Object.keys(yaqootProducts).map(Number));
const newYqIds = [...yqIds].filter(id => !luminousById.has(id));

console.log(`Luminous products: ${luminous.length}`);
console.log(`Yaqoot products in catalog: ${Object.keys(yaqootProducts).length}`);
console.log(`New Yaqoot candidates (not in Luminous): ${newYqIds.length}`);

// Build set of existing Luminous IDs for preservation
const existingLumIds = new Set(luminous.map(p => p.id));

// Build enriched catalog: start with existing 354 Luminous products
const enriched = [];

// Copy existing Luminous products with their data preserved
for (const p of luminous) {
  const nameAr = p.name && p.name.ar ? p.name.ar : (p.nameAr || p.title || '');
  const brandAr = p.brandAr || p.brand || '';
  const categoryAr = p.categoryAr || '';
  const titleEn = p.titleEn || p.title || '';
  const nameEn = p.nameEn || (p.name && p.name.en ? p.name.en : p.titleEn || '');
  
  enriched.push({
    id: p.id,
    slug: p.slug || p.id,
    sku: p.sku || '',
    brand: p.brand || '',
    brandAr: brandAr,
    brandEn: p.brandEn || p.brand || '',
    brandSlug: p.brandSlug || '',
    category: p.category || 'uncategorized',
    categoryAr: categoryAr,
    categorySlug: p.categorySlug || p.category || '',
    title: p.title || titleEn,
    titleEn: titleEn,
    nameAr: nameAr,
    nameEn: nameEn,
    description: p.description || (p.description && p.description.ar ? p.description.ar : p.descriptionAr || ''),
    usage: p.usage || p.usageAr || '',
    usageInstructions: p.usageInstructions || p.usageAr || '',
    originalPrice: p.originalPrice || 0,
    salePrice: p.salePrice || 0,
    salePercent: p.salePercent || 0,
    size: p.size || '',
    gallery: p.gallery || [],
    image: p.image || p.gallery?.[0] || '',
    ogImage: p.ogImage || '',
    price: p.price || null,
    originalPriceFinal: p.originalPriceFinal || p.originalPrice || 0,
    categoryId: p.categoryId || null,
    brandId: p.brandId || null,
  });
}

// Process new Yaqoot candidates
console.log(`\nProcessing ${newYqIds.length} new Yaqoot candidates...`);
let processed = 0;
for (const id of newYqIds) {
  const yq = yaqootProducts[id];
  if (!yq) continue;
  processed++;
  
  // Map section to Luminous category
  // yaqoot sections are numeric arrays [0, 1, 2, 13], not string arrays
  const section = yq.sections ? yq.sections[0] : null;
  let category = 'uncategorized';
  const sectionNum = section !== null ? parseInt(section || '0', 10) : 0;
  // Section titles not available in this format; use category from section number
  
  // Category mapping
  const matchedCat = catMap[sectionNum] || 'uncategorized';
  category = matchedCat;
  
  // Brand normalization - extract from title Arabic suffix
  const title = yq.title || yq.titleTag || '';
  const brandFromTitle = (() => {
    const m = title.match(/-\s*اسم\s*([^-]{1,60})$/);
    if (m) {
      let b = m[1].trim();
      b = b.replace(/\s*(\d+\s*(مل|جرام|جم|غم|ام|بي سي|كبسولات?|اقراص|تبلت|ورق)\b.*)?$/i, '').trim();
      return b || null;
    }
    // Also try "من" prefix
    const m2 = title.match(/-\s*من\s*([^-]{1,60})$/);
    if (m2) {
      let b = m2[1].trim();
      b = b.replace(/\s*(\d+\s*(مل|جرام|جم|غم|ام|بي سي|كبسولات?|اقراص|تبلت|ورق)\b.*)?$/i, '').trim();
      return b || null;
    }
    return null;
  })();
  
  // Normalize brand using brandMap
  let brandName = yq.brand;
  let brandEn = '';
  let brandSlug = '';
  
  // Try brand from title first, then from brand field
  if (brandMap[brandFromTitle]) {
    const mapped = brandMap[brandFromTitle];
    brandName = mapped.brand;
    brandEn = mapped.brandEn;
    brandSlug = mapped.slug;
  } else if (brandMap[brandName]) {
    const mapped = brandMap[brandName];
    brandName = mapped.brand;
    brandEn = mapped.brandEn;
    brandSlug = mapped.slug;
  } else if (brandName) {
    // Fallback: use the brand as-is
    brandName = brandName;
    brandEn = brandName;
    brandSlug = brandName.toLowerCase().replace(/\s/g, '-');
  }
  
  // Calculate price: originalPrice - 200 (VERIFIED PRICE FIX)
  const targetPrice = (yq.originalPrice || yq.salePrice || 0) - 200;
  const finalPrice = targetPrice > 0 ? targetPrice : (yq.salePrice || 0);
  
  // Extract Arabic description and usage
  const arabicDesc = yq.description || yq.title || '';
  const arabicUsage = yq.usage || '';
  
  // Build product-specific Arabic benefits (bullet points) from description
  // Split by common patterns and create meaningful bullet points
  const arabicBenefits = [];
  if (arabicDesc) {
    // Try to extract key benefits from the Arabic description
    const sentences = arabicDesc.split('。|。|\\.|\\n').filter(s => s.trim().length > 10);
    // Take first 3-5 meaningful sentences as benefits
    for (let i = 0; i < Math.min(5, sentences.length); i++) {
      const s = sentences[i].trim();
      if (s.length > 5) {
        arabicBenefits.push(s);
      }
    }
  }
  // If no benefits extracted from description, flag for review
  if (arabicBenefits.length === 0) {
    arabicBenefits.push('محتوى فوائد المنتج - قيد المراجعة');
  }
  
  enriched.push({
    id: yq.id,
    slug: yq.slug || `yq-${yq.id}`,
    sku: yq.sku || `YQ-${yq.id}`,
    brand: brandName,
    brandAr: brandName,
    brandEn: brandEn,
    brandSlug: brandSlug,
    category: category,
    categoryAr: title || yq.title || '',
    categorySlug: category,
    title: title || yq.title || yq.titleTag || '',
    titleEn: yq.title,
    nameAr: title || yq.title || '',
    nameEn: yq.title || '',
    description: arabicDesc || '',
    usage: arabicUsage || '',
    usageInstructions: arabicUsage || '',
    originalPrice: yq.originalPrice || yq.salePrice || 0,
    salePrice: yq.salePrice || 0,
    salePercent: yq.salePercent || 0,
    size: yq.sizeLabel || '',
    gallery: yq.gallery || [],
    image: yq.image || '',
    ogImage: yq.ogImage || '',
    price: finalPrice, // VERIFIED: originalPrice - 200
    originalPriceFinal: yq.originalPrice || 0,
    categoryId: null,
    brandId: null,
  });
}

// Write enriched catalog
fs.writeFileSync(path.join(tmpDir, 'enriched-catalog.json'), JSON.stringify({ products: enriched }, null, 2), 'utf8');

const totalNew = enriched.length - luminous.length;
console.log(`\n=== ENRICHMENT COMPLETE ===`);
console.log(`Existing Luminous products preserved: ${luminous.length}`);
console.log(`New Yaqoot products added: ${totalNew}`);
console.log(`Total products in enriched catalog: ${enriched.length}`);

// Validation checks
let nonEmptyFields = 0;
let priceCorrect = 0;
for (const p of enriched) {
  const hasRequired = p.id && p.brand && p.category !== 'uncategorized' && p.title && p.price !== null;
  if (hasRequired) nonEmptyFields++;
  if (p.price !== null && p.originalPriceFinal && p.price === p.originalPriceFinal - 200) priceCorrect++;
}
console.log(`\nProducts with all required fields: ${nonEmptyFields}/${enriched.length}`);
console.log(`Products with correct price (original - 200): ${priceCorrect}/${enriched.length}`);

// Check for any products missing critical data
const missingCritical = enriched.filter(p => !p.id || !p.brand || p.category === 'uncategorized' || !p.title || p.price === null);
if (missingCritical.length > 0) {
  console.log(`\nWARNING: ${missingCritical.length} products missing critical data`);
  const ids = missingCritical.slice(0, 5).map(p => p.id).filter(Boolean);
  console.log('Sample IDs:', ids);
}

console.log('\nEnriched catalog written to:', tmpDir + '/enriched-catalog.json');