/**
 * Yaqoot → Luminous catalog classifier.
 * Maps every Yaqoot section to a Luminous category slug and classifies
 * each product by its most specific section.
 *
 * Runs: node scripts/catalog/classify.mjs
 * Reads: scripts/catalog/data/yaqoot-fullcatalog.json + yaqoot-universe.json
 * Writes: scripts/catalog/data/classified.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
const catalog = JSON.parse(fs.readFileSync(path.join(dataDir, 'yaqoot-fullcatalog.json'), 'utf8'));
const universe = JSON.parse(fs.readFileSync(path.join(dataDir, 'yaqoot-universe.json'), 'utf8'));

/**
 * Section → Luminous category mapping.
 * key = Yaqoot section id, value = Luminous category slug.
 * Section 0 is "all sections" (no direct assignment).
 * Generic product-type sections (43/44/45/46/116/135/136) are handled by
 * keyword fallback inside classifyProduct.
 */
const SECTION_CATEGORY = {
  4: 'eye-care',          // العناية بالعين
  9: 'cleansers',         // غسول الوجه
  10: 'masks',            // قناع الوجه
  11: 'exfoliators',      // مقشر الوجه
  12: 'toners',           // تونر الوجه
  13: 'serums',           // سيروم الوجه
  14: 'moisturizers',     // مرطب الوجه
  15: 'sunscreen',        // واقي الشمس
  16: 'moisturizers',     // كريم
  17: 'serums',           // سيروم
  18: 'masks',            // قناع
  19: 'masks',            // شرائح (sheets)
  20: 'oral-care',        // معجون الاسنان
  21: 'oral-care',        // غسول الفم
  22: 'oral-care',        // لصقات تبييض الاسنان
  23: 'oral-care',        // عناية اللسان
  25: 'oral-care',        // اجهزة العناية بالفم
  26: 'oral-care',        // فرش الاسنان
  27: 'oral-care',        // خيط الاسنان
  29: 'hand-care',        // مرطبات اليدين
  31: 'hand-care',        // العناية بالاظافر
  32: 'hand-care',        // قفازات اليدين
  33: 'foot-care',        // مرطب القدمين
  35: 'foot-care',        // جوارب القدمين
  36: 'body-wash',        // غسول الجسم
  37: 'body-scrubs',      // مقشر الجسم
  38: 'body-wash',        // الصابون المغربي
  39: 'body-lotion',      // مرطب الجسم
  40: 'deodorants',       // مزيل العرق
  41: 'women-care',       // العناية النسائية
  49: 'shampoo',          // شامبو وبلسم
  51: 'hair-masks',       // ماسك الشعر وحمام الزيت
  52: 'hair-creams',      // كريم الشعر
  53: 'hair-oils',        // زيت الشعر
  54: 'hair-treatments',  // معالجات الشعر
  55: 'hair-styling',     // مثبت ورغوة الشعر
  56: 'hair-styling',     // جل الشعر
  57: 'hair-dyes',        // صبغات الشعر
  59: 'hair-tools',       // اكسسوارات وفرش الشعر
  61: 'face-makeup',      // الوجه
  62: 'lip-makeup',       // الشفاة
  63: 'eye-makeup',       // العيون
  64: 'eye-makeup',       // الحواجب
  65: 'face-makeup',      // الخدود
  66: 'face-makeup',      // الهايلايتر
  67: 'makeup-tools',     // فرش المكياج
  68: 'face-makeup',      // كريم الاساس
  70: 'face-makeup',      // كونسلير
  71: 'face-makeup',      // بودرة الوجه
  72: 'face-makeup',      // برايمير الوجه
  73: 'face-makeup',      // مثبت المكياج
  74: 'face-makeup',      // بي بي كريم
  75: 'cleansers',        // مزيل المكياج
  76: 'lip-makeup',       // احمر الشفاة
  77: 'lip-makeup',       // تنت الشفاه
  78: 'lip-makeup',       // ملمع الشفاة
  79: 'lip-makeup',       // محددات الشفاة
  80: 'eye-makeup',       // ماسكارا
  82: 'eye-makeup',       // كحل
  83: 'eye-makeup',       // ظلال العيون
  84: 'eye-makeup',       // برايمر العيون
  85: 'eye-makeup',       // مسكرة الحواجب
  86: 'eye-makeup',       // جل الحواجب
  87: 'eye-makeup',       // اقلام الحواجب
  88: 'face-makeup',      // احمر الخدود
  89: 'face-makeup',      // كونتور
  90: 'face-makeup',      // برونزر
  91: 'face-makeup',      // الهايلايتر البودرة
  92: 'face-makeup',      // الهايلايتر السائلة
  93: 'face-makeup',      // باليت ومجموعة
  94: 'makeup-tools',     // مجموعة فرش المكياج
  95: 'makeup-tools',     // فرش الوجه
  96: 'makeup-tools',     // فرش العيون
  97: 'makeup-tools',     // فرش الحواجب
  98: 'makeup-tools',     // الاسفنج
  99: 'makeup-tools',     // ادوات المكياج
  100: 'beauty-devices',  // الاجهزة
  104: 'contact-lenses',  // العدسات
  106: 'lip-care',        // العناية بالشفاة
  107: 'lip-care',        // مرطب الشفاة
  108: 'lip-care',        // ماسك الشفاة
  109: 'lip-care',        // مقشر الشفاة
  110: 'lip-care',        // مكبر الشفاة
  111: 'oral-care',       // اجهزة العناية بالفم
  114: 'perfume-women',   // عطور نسائيه
  115: 'perfume-men',     // عطور رجاليه
  117: 'nail-care',       // الاظفار
  118: 'contact-lenses',  // عدسات يومية
  119: 'contact-lenses',  // عدسات شهريه
  120: 'contact-lenses',  // عدسات سنويه
  121: 'contact-lenses',  // محلول العدسات
  122: 'vitamins',        // المكملات الغذائية
  123: 'nail-care',       // المناكير
  124: 'body-wash',       // صابون قالب
  125: 'body-care',       // بودرة الجسم
  126: 'makeup-tools',    // غراء الرموش والاظافر
  127: 'appliances-hair', // مجففات الشعر
  128: 'beauty-tools',    // ادوات العناية
  129: 'beauty-tools',    // ادوات العناية بالوجه
  130: 'beauty-tools',    // ادوات العناية بالجسم
  131: 'beauty-tools',    // ادوات العناية باليدين والاظافر
  132: 'beauty-tools',    // ادوات العناية بالقدمين
  133: 'beauty-tools',    // ادوات العناية بالشعر
  134: 'oral-care',       // معطر فم
  137: 'appliances-hair', // اجهزة تمليس الشعر
  139: 'masks',           // لصقات حب الشباب
  146: 'nail-care',       // مزيل المناكير
  147: 'nail-care',       // المناكير
  148: 'home-fragrance',  // معطرات المنزل
  149: 'bakhoor-premium', // البخور والمعمول
  150: 'shaving',         // منتجات الحلاقه
  151: 'body-wash',       // غسول اليدين
  152: 'body-care',       // منتجات التشقير
  153: 'baby-care',       // منتجات الام والطفال
  154: 'baby-care',       // منتجات الاطفال
  155: 'women-care',      // منتجات الام
};

/** Generic sections that need keyword-based disambiguation. */
const GENERIC_SECTIONS = new Set([43, 44, 45, 46, 116, 135, 136]);

const KEYWORD_RULES = [
  { re: /(غسول|منظف|مزيل المكياج|ماء ميسيلار|ميسيلار)/, cat: 'cleansers' },
  { re: /(تونر|مقشر الوجه|بها تونر)/, cat: 'toners' },
  { re: /(سيروم|سيرم)/, cat: 'serums' },
  { re: /(مرطب|كريم ترطيب|لوشن)/, cat: 'moisturizers' },
  { re: /(واقي|حماية من الشمس|spf)/i, cat: 'sunscreen' },
  { re: /(ماسك|قناع)/, cat: 'masks' },
  { re: /(مقشر|سكراب|تقشير)/, cat: 'exfoliators' },
  { re: /(زيت شعر|سيروم شعر|كريم للشعر|شامبو|بلسم|حمام زيت|صبغة|مثبت شعر|جل شعر)/, cat: 'haircare' },
  { re: /(شامبو)/, cat: 'shampoo' },
  { re: /(بلسم)/, cat: 'conditioner' },
  { re: /(زيت)/, cat: 'hair-oils' },
  { re: /(عطر|برفيوم|بخاخ للجسم)/, cat: 'perfume' },
  { re: /(بخور|عود|معمول|دهن)/, cat: 'bakhoor' },
  { re: /(فيتامين|مكمل|كولاجين|اوميغا|بروبيوتيك)/, cat: 'vitamins' },
  { re: /(عدسات|لاصقة)/, cat: 'contact-lenses' },
  { re: /(مكياج|كونسيلر|بودرة|كحل|ماسكارا|احمر|روج|ملمع|تنت|فاونديشن|اساس)/, cat: 'makeup' },
  { re: /(لوشن|كريم الجسم|غسول الجسم|زيت الجسم)/, cat: 'body-care' },
  { re: /(جل|كريم)/, cat: 'moisturizers' },
  { re: /(معجون|غسول فم|فرشاة|خيط)/, cat: 'oral-care' },
];

function classifyProduct(d) {
  const title = (d.title || '').toLowerCase();
  const sections = d.sections || [];
  // Prefer most specific assigned section
  const specific = sections.filter((s) => SECTION_CATEGORY[s] && !GENERIC_SECTIONS.has(s));
  if (specific.length) {
    // pick the deepest (largest id heuristic: more specific sections have larger ids)
    const chosen = specific.sort((a, b) => b - a)[0];
    return SECTION_CATEGORY[chosen];
  }
  // generic sections or none — keyword fallback on title
  for (const rule of KEYWORD_RULES) {
    if (rule.re.test(title)) return rule.cat;
  }
  return 'uncategorized';
}

function brandFromTitle(t) {
  if (!t) return null;
  const m = t.match(/-\s*من\s*([^-]{1,60})$/);
  if (m) {
    let b = m[1].trim();
    b = b.replace(/\s*(\d+\s*(مل|جرام|جم|غم|ام|بي سي|كبسولات?|اقراص|تبلت|ورق)\b.*)?$/i, '').trim();
    return b || null;
  }
  return null;
}

const classified = [];
for (const [id, d] of Object.entries(catalog)) {
  if (!d.done) continue;
  const cat = classifyProduct(d);
  const title = d.title || d.titleTag || '';
  const titleBrand = brandFromTitle(title);
  const dataBrand = d.brand ? d.brand.trim() : null;
  const brand = titleBrand || dataBrand;
  classified.push({
    id: +id,
    title,
    brand,
    category: cat,
    sections: d.sections || [],
    originalPrice: d.originalPrice,
    salePrice: d.salePrice,
    salePercent: d.salePercent,
    sizeLabel: d.sizeLabel || null,
    description: d.description || null,
    usage: d.usage || null,
    gallery: d.gallery || [],
    image: d.image || null,
    ogImage: d.ogImage || null,
    sizePrice1: d.sizePrice1,
    sizePrice2: d.sizePrice2,
  });
}

classified.sort((a, b) => a.id - b.id);
fs.writeFileSync(path.join(dataDir, 'classified.json'), JSON.stringify(classified));
console.log('classified:', classified.length);

const counts = {};
for (const c of classified) counts[c.category] = (counts[c.category] || 0) + 1;
console.log('\n=== category distribution ===');
for (const [c, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${c}`);
}
