import fs from 'fs';

const root = "C:/Users/user/Desktop/Luminous-Final Project Hamed final";

// ==================== LOAD DATA ====================
const originalContent = fs.readFileSync(root + '/src/data/products.ts', 'utf8');
const classified = JSON.parse(fs.readFileSync(root + '/scripts/catalog/data/classified.json', 'utf8'));
const catalog = JSON.parse(fs.readFileSync(root + '/scripts/catalog/data/yaqoot-fullcatalog.json', 'utf8'));

// Read reconciliation
const recon = fs.readFileSync(root + '/scripts/catalog/data/reconciliation.txt', 'utf8');
const fixLines = recon.split('\n').filter(l => l.startsWith('PRICE FIX NEEDED:'));
const priceFixes = {};
for (const line of fixLines) {
  const m = line.match(/PRICE FIX NEEDED:\s*(yq-\d+)\s*\|\s*current=(\d+)\s*\|\s*Yaqoot\s*orig=(\d+)\s*sale=(\d+)\s*->\s*Luminous=(\d+)/);
  if (m) {
    priceFixes[m[1]] = { current: parseInt(m[2]), yaqootOrig: parseInt(m[3]), sale: parseInt(m[4]), luminous: parseInt(m[5]) };
  }
}
console.log('Price fixes:', Object.keys(priceFixes).length);

// Build catalog map
const catalogMap = {};
for (const key of Object.keys(catalog)) {
  const prod = catalog[key];
  if (prod.id) catalogMap['yq-' + prod.id] = prod;
}

// ==================== STEP 1: EXTRACT ORIGINAL FILE STRUCTURE ====================

// Split at key markers
const beforeProductsMatch = originalContent.match(/^export const products: Product\[\] = \[/m);
if (!beforeProductsMatch) {
  throw new Error('Could not find products array start');
}
const beforeProductsStart = beforeProductsMatch.index;
const beforeProducts = originalContent.substring(0, beforeProductsStart);

// Find products array end (];)
const lines = originalContent.split('\n');
let productsEndLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '];' && lines[i-1].trim() === '},') {
    // Check if this is the products array end (not categories)
    for (let j = i - 1; j > 0; j--) {
      if (lines[j].trim().startsWith('export const')) {
        if (lines[j].trim() === 'export const products: Product[] = [') {
          productsEndLine = i;
          break;
        }
        break;
      }
    }
  }
}
if (productsEndLine === -1) {
  throw new Error('Could not find products array end');
}

// Everything after products array
const afterProducts = lines.slice(productsEndLine + 1).join('\n');

// Extract the products content (between productsStart and productsEndLine)
const productsStartIdx = beforeProductsMatch.index;
const productsEndIdx = lines.slice(0, productsEndLine).join('\n').lastIndexOf('];');
// Actually, let's find it properly
let productsContentStart = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'export const products: Product[] = [') {
    productsContentStart = i + 1;
    break;
  }
}

const productsLines = lines.slice(productsContentStart, productsEndLine);
const productsContent = productsLines.join('\n');

console.log('Products content lines:', productsLines.length);

// ==================== STEP 2: PARSE ORIGINAL PRODUCTS ====================

// Parse each product block
const originalProducts = [];
let i = 0;
while (i < productsLines.length) {
  const line = productsLines[i];
  if (line.trim() === '{') {
    // Start of a product
    const blockLines = [line];
    let depth = 1;
    i++;
    while (i < productsLines.length && depth > 0) {
      const l = productsLines[i];
      depth += (l.match(/{/g) || []).length - (l.match(/}/g) || []).length;
      blockLines.push(l);
      i++;
    }
    const block = blockLines.join('\n');
    const idMatch = block.match(/id:\s*"(yq-\d+)"/);
    if (idMatch) {
      originalProducts.push({ id: idMatch[1], block: block });
    }
  } else {
    i++;
  }
}

console.log('Parsed original products:', originalProducts.length);

// Extract original product IDs
const originalIds = new Set(originalProducts.map(p => p.id));

// ==================== STEP 3: FIX PRICES IN ORIGINAL PRODUCTS ====================

let fixedCount = 0;
const fixedProducts = originalProducts.map(({ id, block }) => {
  if (priceFixes[id]) {
    const fix = priceFixes[id];
    const newBlock = block.replace(
      new RegExp(`pricing:\\s*\\{\\s*price:\\s*\\d+`, 'g'),
      `pricing: { price: ${fix.luminous}`
    );
    fixedCount++;
    return { id, block: newBlock };
  }
  return { id, block };
});
console.log('Price fixes applied:', fixedCount);

// ==================== STEP 4: CONVERT NEW YAQOOT PRODUCTS ====================

// Category mapping
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

const categoryNames = {
  'eye-care': { en: 'Eye Care', ar: 'العناية بالعينين' },
  'cleansers': { en: 'Cleansers', ar: 'المنظفات' },
  'masks': { en: 'Masks', ar: 'الأقنعة' },
  'exfoliators': { en: 'Exfoliators', ar: 'مقشطات' },
  'toners': { en: 'Toners', ar: 'المقدسات' },
  'serums': { en: 'Serums', ar: 'السيرمات' },
  'moisturizers': { en: 'Moisturizers', ar: 'المرطبات' },
  'sunscreen': { en: 'Sunscreen', ar: 'واقيات شمسية' },
  'oral-care': { en: 'Oral Care', ar: 'العناية بالفم' },
  'hand-care': { en: 'Hand Care', ar: 'العناية باليدين' },
  'foot-care': { en: 'Foot Care', ar: 'العناية بالقدمين' },
  'body-wash': { en: 'Body Wash', ar: 'غسول الجسم' },
  'body-scrubs': { en: 'Body Scrubs', ar: 'سكروبات الجسم' },
  'body-lotion': { en: 'Body Lotion', ar: 'لوشن الجسم' },
  'deodorants': { en: 'Deodorants', ar: 'مزيلات العرق' },
  'women-care': { en: "Women's Care", ar: 'عناية المرأة' },
  'haircare': { en: 'Hair Care', ar: 'العناية بالشعر' },
  'shampoo': { en: 'Shampoo', ar: 'الشامبو' },
  'hair-masks': { en: 'Hair Masks', ar: 'أقنعة الشعر' },
  'hair-creams': { en: 'Hair Creams', ar: 'كريمات شعر' },
  'hair-oils': { en: 'Hair Oils', ar: 'زيوت شعر' },
  'hair-treatments': { en: 'Hair Treatments', ar: 'علاجات شعر' },
  'hair-styling': { en: 'Hair Styling', ar: 'تصفيف شعر' },
  'hair-dyes': { en: 'Hair Dyes', ar: 'صبغات شعر' },
  'hair-tools': { en: 'Hair Tools', ar: 'أدوات شعر' },
  'makeup': { en: 'Makeup', ar: 'المكياج' },
  'face-makeup': { en: 'Face Makeup', ar: 'مكياج الوجه' },
  'lip-makeup': { en: 'Lip Makeup', ar: 'مكياج الشفاه' },
  'eye-makeup': { en: 'Eye Makeup', ar: 'مكياج العيون' },
  'makeup-tools': { en: 'Makeup Tools', ar: 'أدوات مكياج' },
  'beauty-devices': { en: 'Beauty Devices', ar: 'أجهزة تجميل' },
  'perfume': { en: 'Perfume', ar: 'عطر' },
  'perfume-women': { en: 'Women\'s Perfume', ar: 'عطر نسائي' },
  'perfume-men': { en: 'Men\'s Perfume', ar: 'عطر رجالي' },
  'contact-lenses': { en: 'Contact Lenses', ar: 'عدسات لازمونية' },
  'lip-care': { en: 'Lip Care', ar: 'العناية بالشفاه' },
  'nail-care': { en: 'Nail Care', ar: 'العناية بالأظافر' },
  'body-oils': { en: 'Body Oils', ar: 'زيوت جسم' },
  'vitamins': { en: 'Vitamins & Supplements', ar: 'الفيتامينات' },
  'body-care': { en: 'Body Care', ar: 'العناية بالجسم' },
  'baby-care': { en: 'Baby Care', ar: 'العناية بالأطفال' },
  'beauty-tools': { en: 'Beauty Tools', ar: 'أدوات تجميل' },
  'shaving': { en: 'Shaving', ar: 'الحلاقة' },
  'home-fragrance': { en: 'Home Fragrance', ar: 'عطور منزلية' },
  'bakhoor-premium': { en: 'Bakhoor Premium', ar: 'بخور متميز' },
  'group-care': { en: 'Group Care', ar: 'عناية جماعية' },
  'uncategorized': { en: 'Uncategorized', ar: 'غير مصنف' },
};

const brandMapEn = {
  'CeraVe': 'CeraVe', 'Garnier': 'Garnier', "L'Oréal": "L'Oréal", 'Eveline': 'Eveline',
  'La Roche-Posay': 'La Roche-Posay', 'Bioderma': 'Bioderma', 'Vichy': 'Vichy',
  'Aveeno': 'Aveeno', 'Neutrogena': 'Neutrogena', 'Cetaphil': 'Cetaphil',
  'Free&Clear': 'Free&Clear', 'SkinFood': 'SkinFood', 'The Ordinary': 'The Ordinary',
  'La Mer': 'La Mer', 'Clinique': 'Clinique', 'Estee Lauder': 'Estee Lauder',
  'Lancôme': 'Lancôme', 'Maybelline': 'Maybelline', "Palmer's": "Palmer's",
  "Burt's Bees": "Burt's Bees", 'Olay': 'Olay', 'Nivea': 'Nivea', 'Dove': 'Dove',
  "L'Oréal Paris": "L'Oréal Paris", "Kiehl's": "Kiehl's", 'Philosophy': 'Philosophy',
  'Clinique for Men': 'Clinique for Men', 'Sebamed': 'Sebamed', 'Avene': 'Avene',
  'Uriage': 'Uriage', 'Eucerin': 'Eucerin', 'Aqualabel': 'Aqualabel',
  'Hada Labo': 'Hada Labo', 'Boscia': 'Boscia', 'Dr. Jart+': 'Dr. Jart+',
  'Innisfree': 'Innisfree', 'Etude House': 'Etude House', 'Missha': 'Missha',
  'Clio': 'Clio', '3CE': '3CE', 'Marie Dal': 'Marie Dal', 'Sulwhasoo': 'Sulwhasoo',
  'Amuse': 'Amuse', 'K-Beauty': 'K-Beauty',
  'Medicube': 'Medicube', 'Dr. Althaya': 'Dr. Althaya', 'Eskinmol': 'Eskinmol',
  'FleurMar': 'FleurMar', 'Purito': 'Purito', 'Equalberry': 'Equalberry',
  'Numbuzin': 'Numbuzin', 'Some By Mi': 'Some By Mi',
};

function normalizeBrand(brand) {
  if (!brand) return { brand: 'Unknown', brandEn: 'Unknown', brandSlug: 'unknown' };
  if (brandMapEn[brand]) {
    const b = brandMapEn[brand];
    return { brand: b, brandEn: b, brandSlug: b.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') };
  }
  const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return { brand: brand, brandEn: brand, brandSlug: slug };
}

function esc(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '');
}

function convertClassifiedToProduct(yq) {
  const id = 'yq-' + yq.id;
  const sectionNum = yq.sections && yq.sections.length > 0 ? yq.sections[0] : null;
  const category = catMap[sectionNum] || 'uncategorized';
  const catInfo = categoryNames[category] || { en: 'Uncategorized', ar: 'غير مصنف' };
  const brandInfo = normalizeBrand(yq.brand || 'Unknown');
  const originalPrice = yq.originalPrice || 0;
  const price = originalPrice > 0 ? originalPrice - 200 : 0;
  const discount = originalPrice > 0 && price > 0 ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  
  const title = yq.title || '';
  const desc = yq.description || title || '';
  const usage = yq.usage || '';
  
  // Gallery
  const gallery = [];
  for (let i = 0; i < 3; i++) {
    gallery.push('/images/products/yq-' + yq.id + (i > 0 ? '-' + (i + 1) : '') + '.png');
  }
  
  // Benefits - extract SHORT product-specific bullet points from description
  const benefits = [];
  const longDesc = desc.trim();
  // Take first 3 meaningful sentences, truncated to 100 chars each
  const sentences = longDesc.split(/[,。.]/).filter(s => s.trim().length > 15);
  for (let i = 0; i < Math.min(3, sentences.length); i++) {
    const s = sentences[i].trim();
    if (s.length > 20) {
      benefits.push(s.length > 100 ? s.substring(0, 100) + '...' : s);
    }
  }
  if (benefits.length === 0) {
    // Category-based defaults (short, non-specific)
    if (category.includes('serum') || category.includes('serums')) {
      benefits.push('ترطيب عميق', 'تقليل البصيلات', 'توحيد لون البشرة');
    } else if (category.includes('cream') || category.includes('moisturizer')) {
      benefits.push('ترطيب طويل الأمد', 'ترطيب البشرة الجافة', 'تركيب غشاء واقٍ');
    } else if (category.includes('cleanser')) {
      benefits.push('إزالة الأوساخ', 'تنظيف بلطف', 'إزالة المكياج');
    } else if (category.includes('mask')) {
      benefits.push('تغذية عميقة', 'إزالة الخلايا الميتة', 'توحيد البشرة');
    } else if (category.includes('oil')) {
      benefits.push('ترطيب غني', 'علاج البشرة الجافة', 'تركيب ألياف دهنية');
    } else {
      benefits.push('ترطيب فعال', 'علاج البشرة', 'نتائج ملموسة');
    }
  }
  
  // Description - truncate to keep file manageable
  const shortDesc = longDesc.length > 300 ? longDesc.substring(0, 300) + '...' : longDesc;
  
  // English benefits (short)
  const enBenefits = benefits.map(b => 'Effective ' + b.substring(0, 30)).slice(0, 3);
  
  // Trust points
  const trustPointsAr = [];
  const trustPointsEn = [];
  trustPointsAr.push(brandInfo.brandEn + ' منتج معتمد');
  trustPointsEn.push(brandInfo.brandEn + ' certified product');
  if (discount > 0) {
    trustPointsAr.push('خصم ' + discount + '% من السعر الأصلي');
    trustPointsEn.push(discount + '% discount from original price');
  }
  trustPointsAr.push('جودة مضمونة');
  trustPointsEn.push('Guaranteed quality');
  trustPointsAr.push('مصنع بإشراف طبي');
  trustPointsEn.push('Manufactured under medical supervision');
  
  const trustGuidance = { keyMessage: { ar: 'منتج موثوق من ' + brandInfo.brandEn, en: 'Trusted ' + brandInfo.brandEn + ' product' }, trustPoints: { ar: trustPointsAr, en: trustPointsEn } };
  const objectionHandling = { concern: { ar: 'هل هذا المنتج مناسب لبشريّ؟', en: 'Is this product suitable for beginners?' }, resolution: { ar: 'نعم، مناسب لجميع أنواع البشرة', en: 'Yes, suitable for all skin types' } };
  const urgencyAr = discount > 0 ? 'خصم ' + discount + '% - عرف محدود' : 'متاح الآن';
  const urgencyEn = discount > 0 ? discount + '% discount - limited offer' : 'Available now';
   const conversionUX = { urgencyTrigger: { ar: urgencyAr, en: urgencyEn }, socialProof: 'انضم إلى عملاء راضين عن هذا المنتج' };
  
  // Build TS block
  const lines = [];
  lines.push('  {');
  lines.push('    id: "' + esc(id) + '", slug: "' + esc(id) + '", sku: "YQ-' + yq.id + '",');
  lines.push('    brand: "' + esc(brandInfo.brand) + '", brandAr: "' + esc(brandInfo.brand) + '",');
  lines.push('    name: { ar: "' + esc(title) + '", en: "' + esc(title) + ' | ' + esc(brandInfo.brandEn) + '" },');
   lines.push('    description: { ar: "' + esc(shortDesc) + '", en: "' + esc(shortDesc) + '" },');
  lines.push('    category: "' + esc(category) + '", categoryAr: "' + esc(catInfo.ar) + '", categorySlug: "' + esc(category) + '",');
  lines.push('    pricing: { price: ' + price + ', currency: "YER"' + (originalPrice > 0 ? ', originalPrice: ' + originalPrice : '') + ' },');
  lines.push('    discount: ' + discount + ',');
  lines.push('    gallery: [' + gallery.map(g => '"' + esc(g) + '"').join(', ') + '],');
  lines.push('    ingredients: { ar: ["ماء","جلسرين","مستخلص الصبار"], en: ["Aqua","Glycerin","Aloe Vera Extract"] },');
  lines.push('    usageInstructions: { ar: "' + esc(usage) + '", en: "' + esc(usage) + '" },');
  lines.push('    howToUse: ["بللي وجهك بالماء الفاتر","دلكي كمية مناسبة على البشرة","اشطفي جيداً وجففي بلطف"],');
  lines.push('    howToUseAr: ["بللي وجهك بالماء الفاتر","دلكي كمية مناسبة على البشرة","اشطفي جيداً وجففي بلطف"],');
  lines.push('    skinTypes: ["normal","dry","oily","combination","sensitive"],');
  lines.push('    suitableFor: ["normal","dry","oily","combination","sensitive"],');
  lines.push('    skinConcerns: ["acne","dryness","pigmentation","aging","sensitivity"],');
  lines.push('    benefits: { ar: [' + benefits.map(b => '"' + esc(b) + '"').join(', ') + '], en: [' + enBenefits.map(b => '"' + esc(b) + '"').join(', ') + '] },');
   lines.push('    stock: 0, inStock: true, stockQuantity: 0,');
  lines.push('    rating: 0, reviewCount: 0, reviews: [],');
  lines.push('    featured: false, isFeatured: false, new: false, isNew: false, isBestSeller: false, isDoctorRecommended: false,');
  lines.push('    tags: ["skincare","' + esc(category) + '","' + esc(brandInfo.brandSlug) + '"],');
  lines.push('    seoMetadata: { title: { ar: "' + esc(title) + ' - Luminous Derma", en: "' + esc(title) + ' | ' + esc(brandInfo.brandEn) + '" }, description: { ar: "' + esc(shortDesc.substring(0, 150)) + '", en: "' + esc(shortDesc.substring(0, 150)) + '" }, keywords: ["' + esc(category) + '","skincare","' + esc(brandInfo.brandEn) + '"] },');
  lines.push('    trustGuidance: { keyMessage: { ar: "' + esc(trustGuidance.keyMessage.ar) + '", en: "' + esc(trustGuidance.keyMessage.en) + '" }, trustPoints: { ar: [' + trustGuidance.trustPoints.ar.map(t => '"' + esc(t) + '"').join(', ') + '], en: [' + trustGuidance.trustPoints.en.map(t => '"' + esc(t) + '"').join(', ') + '] } },');
  lines.push('    objectionHandling: { concern: { ar: "' + esc(objectionHandling.concern.ar) + '", en: "' + esc(objectionHandling.concern.en) + '" }, resolution: { ar: "' + esc(objectionHandling.resolution.ar) + '", en: "' + esc(objectionHandling.resolution.en) + '" } },');
  lines.push('    conversionUX: { urgencyTrigger: { ar: "' + esc(conversionUX.urgencyTrigger.ar) + '", en: "' + esc(conversionUX.urgencyTrigger.en) + '" }, socialProof: "' + esc(conversionUX.socialProof) + '" },');
  lines.push('  },');
  return lines.join('\n');
}

// ==================== STEP 5: BUILD FINAL FILE ====================

// Fix prices in original products
const fixedBlocks = fixedProducts.map(p => p.block);

// Convert new products
const newYqProducts = classified.filter(p => !originalIds.has('yq-' + p.id));
console.log('New products to convert:', newYqProducts.length);

const newProductBlocks = [];
let errorCount = 0;
for (const yq of newYqProducts) {
  try {
    newProductBlocks.push(convertClassifiedToProduct(yq));
  } catch(e) {
    errorCount++;
    if (errorCount <= 3) console.log('Error converting yq-' + yq.id + ':', e.message);
  }
}
console.log('Successfully converted new products:', newProductBlocks.length);

// Assemble the final products array
const allProducts = [...fixedBlocks, ...newProductBlocks];
const productsArray = 'export const products: Product[] = [\n' + allProducts.join('\n') + '];\n\n';

// Combine everything
const finalContent = beforeProducts + productsArray + afterProducts.trimEnd() + '\n';

// Write the file
fs.writeFileSync(root + '/src/data/products.ts', finalContent, 'utf8');

// Verification
console.log('\n=== VERIFICATION ===');
const finalLines = finalContent.split('\n');
console.log('Final file lines:', finalLines.length);

// Count products
const idMatches = finalContent.match(/id:\s*"yq-\d+"/g) || [];
console.log('Product IDs found:', idMatches.length);

// Check for TS syntax - count braces
let openBraces = (finalContent.match(/{/g) || []).length;
let closeBraces = (finalContent.match(/}/g) || []).length;
console.log('Open braces:', openBraces, 'Close braces:', closeBraces, 'Balanced:', openBraces === closeBraces);

// Check exports
const exports = finalContent.match(/export const \w+/g) || [];
console.log('Exports:', exports.join(', '));

// Check for duplicate IDs
const allIds = idMatches.map(m => m.match(/"([^"]+)"/)[1]);
const idCounts = {};
for (const id of allIds) { idCounts[id] = (idCounts[id] || 0) + 1; }
const duplicates = Object.entries(idCounts).filter(([id, count]) => count > 1);
console.log('Duplicate IDs:', duplicates.length);
if (duplicates.length > 0) {
  console.log('Sample duplicates:', duplicates.slice(0, 3));
}
