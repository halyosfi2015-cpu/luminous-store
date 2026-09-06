import fs from 'fs';

const root = "C:/Users/user/Desktop/Luminous-Final Project Hamed final";

// ==================== LOAD DATA ====================
const classified = JSON.parse(fs.readFileSync(root + '/scripts/catalog/data/classified.json', 'utf8'));
const catalog = JSON.parse(fs.readFileSync(root + '/scripts/catalog/data/yaqoot-fullcatalog.json', 'utf8'));

const catalogMap = {};
for (const key of Object.keys(catalog)) {
  const prod = catalog[key];
  if (prod.id) catalogMap['yq-' + prod.id] = prod;
}

const recon = fs.readFileSync(root + '/scripts/catalog/data/reconciliation.txt', 'utf8');
const priceFixes = {};
for (const line of recon.split('\n')) {
  const m = line.match(/PRICE FIX NEEDED:\s*(yq-\d+)\s*\|\s*current=(\d+)\s*\|\s*Yaqoot\s*orig=(\d+)\s*sale=(\d+)\s*->\s*Luminous=(\d+)/);
  if (m) priceFixes[m[1]] = { current: +m[2], yaqootOrig: +m[3], sale: +m[4], luminous: +m[5] };
}

// ==================== CATEGORY MAP ====================
const sectionToCategory = {
  4:'eye-care',5:'oral-care',6:'hand-care',7:'foot-care',8:'body-care',
  9:'cleansers',10:'masks',11:'exfoliators',12:'toners',13:'serums',14:'moisturizers',15:'sunscreen',
  16:'moisturizers',17:'serums',18:'masks',19:'masks',20:'oral-care',21:'oral-care',22:'oral-care',23:'oral-care',
  25:'oral-care',26:'oral-care',27:'oral-care',29:'hand-care',31:'nail-care',32:'hand-care',33:'foot-care',
  35:'foot-care',36:'body-wash',37:'body-scrubs',38:'body-wash',39:'body-lotion',40:'deodorants',41:'women-care',
  43:'moisturizers',44:'moisturizers',45:'moisturizers',46:'moisturizers',48:'haircare',49:'shampoo',51:'hair-masks',
  52:'hair-creams',53:'hair-oils',54:'hair-treatments',55:'hair-styling',56:'hair-styling',57:'hair-dyes',59:'hair-tools',
  60:'makeup',61:'face-makeup',62:'lip-makeup',63:'eye-makeup',64:'eye-makeup',65:'face-makeup',66:'face-makeup',
  67:'makeup-tools',68:'face-makeup',70:'face-makeup',71:'face-makeup',72:'face-makeup',73:'face-makeup',74:'face-makeup',
  75:'cleansers',76:'lip-makeup',77:'lip-makeup',78:'lip-makeup',79:'lip-makeup',80:'eye-makeup',82:'eye-makeup',
  83:'eye-makeup',84:'eye-makeup',85:'eye-makeup',86:'eye-makeup',87:'eye-makeup',88:'face-makeup',89:'face-makeup',
  90:'face-makeup',91:'face-makeup',92:'face-makeup',93:'face-makeup',94:'makeup-tools',95:'makeup-tools',96:'makeup-tools',
  97:'makeup-tools',98:'makeup-tools',99:'makeup-tools',100:'beauty-devices',101:'baby-care',103:'perfume',104:'contact-lenses',
  106:'lip-care',107:'lip-care',108:'lip-care',109:'lip-care',110:'lip-care',111:'oral-care',112:'women-care',
  113:'baby-care',114:'perfume-women',115:'perfume-men',116:'body-oils',117:'nail-care',118:'contact-lenses',119:'contact-lenses',
  120:'contact-lenses',121:'contact-lenses',122:'vitamins',123:'nail-care',124:'body-wash',125:'body-care',126:'makeup-tools',
  127:'hair-tools',128:'beauty-tools',129:'beauty-tools',130:'beauty-tools',131:'beauty-tools',132:'beauty-tools',133:'beauty-tools',
  134:'oral-care',135:'lip-care',136:'group-care',137:'hair-tools',139:'masks',146:'nail-care',147:'nail-care',
  148:'home-fragrance',149:'bakhoor-premium',150:'shaving',151:'body-wash',152:'body-care',153:'baby-care',154:'baby-care',155:'women-care',
};

const categoryMeta = {
  'eye-care': { en: 'Eye Care', ar: 'العناية بالعينين', typeAr: 'منتج للعناية بالعينين' },
  'cleansers': { en: 'Cleansers', ar: 'المنظفات', typeAr: 'منظف للوجه' },
  'masks': { en: 'Masks', ar: 'الأقنعة', typeAr: 'قناع للبشرة' },
  'exfoliators': { en: 'Exfoliators', ar: 'مقشطات', typeAr: 'مقشر للبشرة' },
  'toners': { en: 'Toners', ar: 'تونر', typeAr: 'تونر منشط للبشرة' },
  'serums': { en: 'Serums', ar: 'سيرومات', typeAr: 'سيروم للعناية بالبشرة' },
  'moisturizers': { en: 'Moisturizers', ar: 'المرطبات', typeAr: 'مرطب للبشرة' },
  'sunscreen': { en: 'Sunscreen', ar: 'واقي الشمس', typeAr: 'واقي شمس' },
  'oral-care': { en: 'Oral Care', ar: 'العناية بالفم', typeAr: 'منتج للعناية بالفم' },
  'hand-care': { en: 'Hand Care', ar: 'العناية باليدين', typeAr: 'منتج للعناية باليدين' },
  'foot-care': { en: 'Foot Care', ar: 'العناية بالقدمين', typeAr: 'منتج للعناية بالقدمين' },
  'body-wash': { en: 'Body Wash', ar: 'غسول الجسم', typeAr: 'غسول للجسم' },
  'body-scrubs': { en: 'Body Scrubs', ar: 'سكروب الجسم', typeAr: 'مقشر للجسم' },
  'body-lotion': { en: 'Body Lotion', ar: 'لوشن الجسم', typeAr: 'لوشن مرطب للجسم' },
  'deodorants': { en: 'Deodorants', ar: 'مزيلات العرق', typeAr: 'مزيل عرق' },
  'women-care': { en: "Women's Care", ar: 'العناية النسائية', typeAr: 'منتج للعناية النسائية' },
  'haircare': { en: 'Hair Care', ar: 'العناية بالشعر', typeAr: 'منتج للعناية بالشعر' },
  'shampoo': { en: 'Shampoo', ar: 'الشامبو', typeAr: 'شامبو للشعر' },
  'conditioner': { en: 'Conditioner', ar: 'البلسم', typeAr: 'بلسم للشعر' },
  'hair-masks': { en: 'Hair Masks', ar: 'أقنعة الشعر', typeAr: 'قناع للشعر' },
  'hair-creams': { en: 'Hair Creams', ar: 'كريمات الشعر', typeAr: 'كريم للشعر' },
  'hair-oils': { en: 'Hair Oils', ar: 'زيوت الشعر', typeAr: 'زيت للشعر' },
  'hair-treatments': { en: 'Hair Treatments', ar: 'علاجات الشعر', typeAr: 'علاج للشعر' },
  'hair-styling': { en: 'Hair Styling', ar: 'تصفيف الشعر', typeAr: 'منتج لتصفيف الشعر' },
  'hair-dyes': { en: 'Hair Dyes', ar: 'صبغات الشعر', typeAr: 'صبغة للشعر' },
  'hair-tools': { en: 'Hair Tools', ar: 'أدوات الشعر', typeAr: 'أداة للعناية بالشعر' },
  'makeup': { en: 'Makeup', ar: 'المكياج', typeAr: 'منتج مكياج' },
  'face-makeup': { en: 'Face Makeup', ar: 'مكياج الوجه', typeAr: 'منتج مكياج للوجه' },
  'lip-makeup': { en: 'Lip Makeup', ar: 'مكياج الشفاه', typeAr: 'منتج مكياج للشفاه' },
  'eye-makeup': { en: 'Eye Makeup', ar: 'مكياج العيون', typeAr: 'منتج مكياج للعيون' },
  'makeup-tools': { en: 'Makeup Tools', ar: 'أدوات المكياج', typeAr: 'أداة مكياج' },
  'beauty-devices': { en: 'Beauty Devices', ar: 'أجهزة التجميل', typeAr: 'جهاز تجميل' },
  'perfume': { en: 'Perfume', ar: 'العطور', typeAr: 'عطر' },
  'perfume-women': { en: "Women's Perfume", ar: 'عطور نسائية', typeAr: 'عطر نسائي' },
  'perfume-men': { en: "Men's Perfume", ar: 'عطور رجالية', typeAr: 'عطر رجالي' },
  'contact-lenses': { en: 'Contact Lenses', ar: 'العدسات اللاصقة', typeAr: 'عدسة لاصقة' },
  'lip-care': { en: 'Lip Care', ar: 'العناية بالشفاه', typeAr: 'منتج للعناية بالشفاه' },
  'nail-care': { en: 'Nail Care', ar: 'العناية بالأظافر', typeAr: 'منتج للعناية بالأظافر' },
  'body-oils': { en: 'Body Oils', ar: 'زيوت الجسم', typeAr: 'زيت للجسم' },
  'vitamins': { en: 'Vitamins & Supplements', ar: 'الفيتامينات والمكملات', typeAr: 'مكمل غذائي' },
  'body-care': { en: 'Body Care', ar: 'العناية بالجسم', typeAr: 'منتج للعناية بالجسم' },
  'baby-care': { en: 'Baby Care', ar: 'العناية بالأطفال', typeAr: 'منتج للعناية بالأطفال' },
  'beauty-tools': { en: 'Beauty Tools', ar: 'أدوات التجميل', typeAr: 'أداة تجميل' },
  'shaving': { en: 'Shaving', ar: 'مستلزمات الحلاقة', typeAr: 'منتج للحلاقة' },
  'home-fragrance': { en: 'Home Fragrance', ar: 'معطرات المنزل', typeAr: 'معطر منزلي' },
  'bakhoor-premium': { en: 'Premium Bakhoor', ar: 'بخور مميز', typeAr: 'بخور' },
  'group-care': { en: 'Care Sets', ar: 'مجموعات العناية', typeAr: 'مجموعة عناية' },
  'uncategorized': { en: 'Uncategorized', ar: 'غير مصنف', typeAr: 'منتج' },
};

// Brand normalization
const brandArabicToEnglish = {
  'سيرافي': 'CeraVe', 'ام سوري فور ماي سكين': 'Miss Amore', 'ميك اب فور ايفر': 'Make Up For Ever',
  'نيفيا': 'Nivea', 'يورياج': 'Uriage', 'سيتافيل': 'Cetaphil', 'يوسرين': 'Eucerin',
  'نتروجينا': 'Neutrogena', 'لوريال باريس': "L'Oreal Paris", 'افين': 'Avene', 'سوم باي مي': 'Some By Mi',
  'ريوس': 'Ryo', 'هوب لابس': 'Hobe Labs', 'لاروش بوزيه': 'La Roche-Posay', 'لاروش بوزية': 'La Roche-Posay',
  'ثيرابريث': 'TheraBreath', 'سكينورين': 'Skinoren', 'انتيسا': 'Antessa', 'تايم ليس': 'Time Less',
  'ايلف': 'ELF', 'اوز ناتشورالز': 'Oz Naturals', 'بانثينول بلس': 'Panthenol Plus', 'ايتود هاوس': 'Etude House',
  'جيوفاني': 'Giovanni', 'بالمرز': "Palmer's", 'كوسركس': 'COSRX', 'افينو': 'Aveeno', 'بيكسي': 'Pixi',
  'اوفرا': 'Ofra', 'باولاز تشويس': "Paula's Choice", 'ميلي': 'Mielle', 'سمرز ايف': "Summer's Eve",
  'فيشي': 'Vichy', 'بايوديرما': 'Bioderma', 'اورال بي': 'Oral-B', 'دابر املا': 'Dabur Amla',
  'جوفان': 'Jovan', 'ايه سي ام': 'ACM', 'اكسيوم': 'Axiom', 'سيلين': 'Celline', 'لوكس': 'Lux',
  'ميديكيوب': 'Medicube', 'دكتور اطيى': 'Dr. Althaya', 'فلمار': 'FleurMar',
  'ماري دال': 'Marie Dal', 'امبريد': 'Embryolisse', 'بيرفيكت ديرم': 'Perfect Derm',
};

// ==================== NAME NORMALIZATION ====================
function extractBrandFromTitle(title) {
  let m = title.match(/[-–—]+\s*من\s*([^-]{1,60})$/i);
  if (m) return cleanBrand(m[1]);
  // Fallback: capture everything after last dash but strip trailing size/separator
  m = title.match(/[-–—]+\s*(.+)$/i);
  if (m) {
    const b = cleanBrand(m[1]);
    if (b && b.length < 60) return b;
  }
  return null;
}

function cleanBrand(b) {
  return b
    .replace(/^\s+|\s+$/g, '')
    // Remove trailing size words and dangling separators
    .replace(/[-–—]+\s*(?:\d+\s*(?:مل|جرام|جم|غم|بي سي|كبسولات?|اقراص|تبلت|ورق|مليتر)\b.*)?$/i, '')
    .replace(/[-–—]+\s*$/g, '')
    .replace(/\s*(?:\d+\s*(?:مل|جرام|جم|غم|بي سي|كبسولات?|اقراص|تبلت|ورق|مليتر)\b.*)?$/i, '')
    .replace(/[.,،;؛\s]+$/g, '')
    .trim();
}

function extractProductName(title, brand) {
  let name = title || '';
  if (brand) {
    const b = escapeRegExp(brand.replace(/[-–—]+\s*$/g, '').trim());
    // Trailing punctuation tolerated after the brand (Arabic comma, period, dash)
    const trail = '[،,.;؛\\-–—\\s]*';
    // Remove "من <brand>" plus any trailing suffix (size, dash, punctuation)
    name = name.replace(new RegExp(`[-–—]?\\s*من\\s*${b}${trail}(?:\\d+\\s*مل|\\d+\\s*جم|\\d+\\s*غم|\\d+\\s*جرام)?\\s*$`, 'i'), '');
    name = name.replace(new RegExp(`[-–—]+\\s*${b}${trail}(?:\\d+\\s*مل|\\d+\\s*جم|\\d+\\s*غم|\\d+\\s*جرام)?\\s*$`, 'i'), '');
    name = name.replace(new RegExp(`\\s*من\\s*${b}${trail}\\s*$`, 'i'), '');
  }
  // Remove any trailing dashes / dangling separators / stray punctuation / size
  name = name.replace(/[-–—]+\s*$/, '');
  name = name.replace(/[،,.;؛\s]+$/, '');
  return name.replace(/^\s+|\s+$/g, '').trim();
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickCategory(sections) {
  if (!sections || sections.length === 0) return 'uncategorized';
  let best = null;
  for (const s of sections) {
    const num = parseInt(s, 10);
    if (num === 0 || num === 1 || num === 2) continue;
    const cat = sectionToCategory[num];
    if (cat) best = cat;
  }
  return best || 'uncategorized';
}

// ==================== ORIGINAL ARABIC CONTENT ====================

// Extract reworded facts from source description (split sentences, strip marketing fluff, keep substance)
function extractFacts(desc) {
  const facts = [];
  if (!desc) return facts;
  const sentences = desc.split(/[.!؟؟]/).map(s => s.trim()).filter(s => s.length > 15);
  for (const s of sentences.slice(0, 6)) {
    let clean = s
      .replace(/^من\s+[^-]+\s*[-–—]\s*/i, '')
      .replace(/^ياقوت\s*/i, '')
      .replace(/^\s*\d+[.)]\s*/, '')
      .replace(/\b(افضل|الافضل|رقم\s*1|الأكثر\s*مبيعاً|جديد|ممتاز|رائع|مذهل)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (clean.length > 18 && clean.length < 180 && !facts.some(f => f.includes(clean.substring(0, 15)))) {
      facts.push(clean);
    }
  }
  return facts;
}

function buildDescription(yq, category, nameAr, brandName) {
  const catInfo = categoryMeta[category] || categoryMeta['uncategorized'];
  const size = (yq.sizeLabel || '').replace(/^الحجم\s*[:：]?\s*/i, '');
  const facts = extractFacts(yq.description);
  const sizeTxt = size ? ` بحجم ${size}` : '';

  let desc = `${nameAr}${sizeTxt} — منتج عناية من Luminous بتشكيلة ${catInfo.ar}.`;
  if (facts.length > 0) {
    desc += ' ' + facts.slice(0, 2).join(' ');
  }
  if (desc.length > 280) desc = desc.substring(0, 277) + '...';
  return desc;
}

function buildBenefits(yq, category, nameAr) {
  const benefits = [];
  const facts = extractFacts(yq.description);
  for (const f of facts.slice(0, 4)) {
    if (f.length > 18) benefits.push(f);
    if (benefits.length >= 4) break;
  }
  // Add a product-specific benefit from name/category if needed
  if (benefits.length < 2 && nameAr) {
    benefits.push(`منتج ${categoryMeta[category]?.ar || 'العناية'} يلبي احتياجك اليومي`);
  }
  return benefits.slice(0, 4);
}

function buildUsage(yq, category) {
  const usage = (yq.usage || '').trim();
  if (usage && usage.length > 8) {
    let clean = usage.replace(/^\s*طريقة الاستخدام\s*[:：]?\s*/i, '');
    clean = clean.replace(/\b(ياقوت|عندنا|لدينا)\b/gi, '');
    return clean.trim();
  }
  return 'اتبع تعليمات الاستخدام الموضحة على العبوة.';
}

// ==================== ESCAPE ====================
function esc(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ').replace(/\r/g, '');
}

// ==================== BUILD PRODUCT BLOCK ====================
function buildProductTS(yq, brandMap) {
  const id = 'yq-' + yq.id;
  const category = pickCategory(yq.sections);
  const catInfo = categoryMeta[category] || categoryMeta['uncategorized'];

  let brand = (yq.brand || '').trim();
  const brandFromTitle = extractBrandFromTitle(yq.title || '');
  // Prefer brand parsed from the title (authoritative, matches "- من X" pattern)
  if (brandFromTitle) brand = brandFromTitle;
  const brandEn = brandMap[brand] || brand || '';
  const brandClean = brand || '';

  const nameAr = extractProductName(yq.title || '', brand) || (yq.title || '').trim();
  const sizeLabel = yq.sizeLabel || '';

  // PRICE RULE: price = verified original - 200 as BASE price. No discount display.
  const originalPrice = yq.originalPrice || 0;
  const saleOnly = originalPrice === 0 ? (yq.salePrice || 0) : 0;
  const price = originalPrice > 0 ? originalPrice - 200 : saleOnly;
  const hasOriginal = originalPrice > 0;

  // Images: REAL URLs only
  const gallery = [];
  const baseImg = yq.ogImage || (yq.image ? 'https://www.yaqootstoreye.com/' + yq.image : '');
  if (baseImg && /^https?:\/\//.test(baseImg)) gallery.push(baseImg);
  if (yq.gallery && Array.isArray(yq.gallery)) {
    for (const g of yq.gallery) {
      const url = g.startsWith('http') ? g : (g.startsWith('files/') ? 'https://www.yaqootstoreye.com/' + g.replace(/\?v=\d+$/, '') : '');
      if (/^https?:\/\//.test(url) && !gallery.includes(url)) gallery.push(url);
      if (gallery.length >= 4) break;
    }
  }

  const description = buildDescription(yq, category, nameAr, brandClean);
  const benefitsAr = buildBenefits(yq, category, nameAr);
  const usage = buildUsage(yq, category);

  const catProd = catalogMap[id];
  const outOfStock = catProd && catProd.outOfStock ? true : false;

  const tags = [];
  if (category !== 'uncategorized') tags.push(category);
  if (brandClean) tags.push(brandClean);

  const lines = [];
  lines.push('  {');
  lines.push(`    id: "${esc(id)}", slug: "${esc(id)}", sku: "YQ-${yq.id}",`);
  lines.push(`    brand: "${esc(brandEn)}", brandAr: "${esc(brandClean)}",`);
  lines.push(`    name: { ar: "${esc(nameAr)}", en: "${esc(nameAr)}" },`);
  lines.push(`    description: { ar: "${esc(description)}", en: "${esc(description)}" },`);
  lines.push(`    category: "${esc(category)}", categoryAr: "${esc(catInfo.ar)}", categorySlug: "${esc(category)}",`);
  if (hasOriginal) {
    lines.push(`    pricing: { price: ${price}, currency: "YER", originalPrice: ${originalPrice} },`);
  } else {
    lines.push(`    pricing: { price: ${price}, currency: "YER" },`);
  }
  lines.push(`    gallery: [${gallery.map(g => `"${esc(g)}"`).join(', ')}],`);
  lines.push(`    ingredients: { ar: [], en: [] },`);
  lines.push(`    usageInstructions: { ar: "${esc(usage)}", en: "${esc(usage)}" },`);
  lines.push(`    howToUse: [${usage.split(/[.]/).filter(Boolean).map(s => `"${esc(s.trim())}"`).join(', ')}],`);
  lines.push(`    benefits: { ar: [${benefitsAr.map(b => `"${esc(b)}"`).join(', ')}], en: [${benefitsAr.map(b => `"${esc(b)}"`).join(', ')}] },`);
  lines.push(`    skinTypes: [], suitableFor: [],`);
  lines.push(`    stock: ${outOfStock ? 0 : 10}, inStock: ${!outOfStock}, stockQuantity: ${outOfStock ? 0 : 10},`);
  lines.push(`    rating: 0, reviewCount: 0, reviews: [],`);
  lines.push(`    featured: false, isFeatured: false, new: false, isNew: false, isBestSeller: false, isDoctorRecommended: false,`);
  lines.push(`    tags: [${tags.map(t => `"${esc(t)}"`).join(', ')}],`);
  lines.push(`    seoMetadata: { title: { ar: "${esc(nameAr)}", en: "${esc(nameAr)}" }, description: { ar: "${esc(description.substring(0, 150))}", en: "${esc(description.substring(0, 150))}" }, keywords: [${['luminous', category, brandClean].filter(Boolean).map(k => `"${esc(k)}"`).join(', ')}] },`);
  lines.push(`    sizeLabel: "${esc(sizeLabel)}",`);
  lines.push('  },');
  return lines.join('\n');
}

export { buildProductTS, pickCategory, categoryMeta, priceFixes, classified, catalogMap, extractProductName, extractBrandFromTitle, brandArabicToEnglish };