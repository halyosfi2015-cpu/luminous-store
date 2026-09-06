import fs from 'fs';

const root = "C:/Users/user/Desktop/Luminous-Final Project Hamed final";

// ==================== LOAD DATA ====================
const classified = JSON.parse(fs.readFileSync(root + '/scripts/catalog/data/classified.json', 'utf8'));
const catalog = JSON.parse(fs.readFileSync(root + '/scripts/catalog/data/yaqoot-fullcatalog.json', 'utf8'));

// Build catalog map (has outOfStock)
const catalogMap = {};
for (const key of Object.keys(catalog)) {
  const prod = catalog[key];
  if (prod.id) catalogMap['yq-' + prod.id] = prod;
}

// Reconciliation
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

// Brand extraction from title
function extractBrandFromTitle(title) {
  // Pattern 1: "- من BRAND" or "-من BRAND"
  let m = title.match(/[-–—]+\s*من\s*([^-]{1,60})$/i);
  if (m) return cleanBrand(m[1]);
  // Pattern 2: "- BRAND" 
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
    // Remove trailing size words
    .replace(/\s*(?:\d+\s*(?:مل|جرام|جم|غم|بي سي|كبسولات?|اقراص|تبلت|ورق|مليتر)\b.*)?$/i, '')
    .replace(/[.,،;؛\s]+$/g, '')
    .trim();
}

// Extract product name (strip brand suffix)
function extractProductName(title, brand) {
  let name = title || '';
  if (brand) {
    // Remove "- من BRAND" or "-من BRAND"
    name = name.replace(new RegExp(`[-–—]\\s*من\\s*${escapeRegExp(brand)}\\s*$`, 'i'), '');
    name = name.replace(new RegExp(`[-–—]+\\s*${escapeRegExp(brand)}\\s*$`, 'i'), '');
    // Remove standalone "من BRAND"
    name = name.replace(new RegExp(`\\s*من\\s*${escapeRegExp(brand)}\\s*$`, 'i'), '');
  }
  return name.replace(/^\s+|\s+$/g, '').replace(/[-–—]+$/g, '').trim();
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Brand normalization to English
const brandArabicToEnglish = {
  'سيرافي': 'CeraVe', 'ام سوري فور ماي سكين': 'Miss Amore', 'ميك اب فور ايفر': 'Make Up For Ever',
  'نيفيا': 'Nivea', 'يورياج': 'Uriage', 'سيتافيل': 'Cetaphil', 'يوسرين': 'Eucerin',
  'نتروجينا': 'Neutrogena', 'لوريال باريس': "L'Oréal Paris", 'افين': 'Avène', 'سوم باي مي': 'Some By Mi',
  'ريوس': 'Ryo', 'هوب لابس': 'Hobe Labs', 'لاروش بوزيه': 'La Roche-Posay', 'لاروش بوزية': 'La Roche-Posay',
  'ثيرابريث': 'TheraBreath', 'سكينورين': 'Skinoren', 'انتيسا': 'Antessa', 'تايم ليس': 'Time Less',
  'ايلف': 'ELF', 'اوز ناتشورالز': 'Oz Naturals', 'بانثينول بلس': 'Panthenol Plus', 'ايتود هاوس': 'Etude House',
  'جيوفاني': 'Giovanni', 'بالمرز': "Palmer's", 'كوسركس': 'COSRX', 'افينو': 'Aveeno', 'بيكسي': 'Pixi',
  'اوفرا': 'Ofra', 'باولاز تشويس': 'Paula\'s Choice', 'ميلي': 'Mielle', 'سمرز ايف': "Summer's Eve",
  'فيشي': 'Vichy', 'بايوديرما': 'Bioderma', 'اورال بي': 'Oral-B', 'دابر املا': 'Dabur Amla',
  'جوفان': 'Jovan', 'ايه سي ام': 'ACM', 'اكسيوم': 'Axiom', 'سيلين': 'Celline', 'لوكس': 'Lux',
  'ميديكيوب': 'Medicube', 'دكتور اطيى': 'Dr. Althaya', 'فلمار': 'FleurMar',
  'ماري دال': 'Marie Dal', 'امبريد': 'Embryolisse', 'بيرفيكت ديرم': 'Perfect Derm',
};

// ==================== LUMINOUS CONTENT GENERATOR ====================

// Knowledge base: verified benefit templates per category (factual, evidence-based)
// These are NOT generic "suitable for all skin types" - they describe what the product type does

function generateDescription(yq, category, nameAr, brandName) {
  const catInfo = categoryMeta[category] || categoryMeta['uncategorized'];
  const size = yq.sizeLabel ? yq.sizeLabel.replace(/^الحجم\s*[:：]?\s*/i, '') : '';
  const desc = (yq.description || '').trim();
  
  // Extract up to 3 key facts from source description (as evidence, reworded)
  const facts = extractFacts(desc, category);
  
  // Build original Luminous description
  let text = `${nameAr} ${size ? `— ${size} —` : ''} ${brandName ? `من ${brandName}` : ''}. `;
  text += `هذا ${catInfo.typeAr} صُمّم ليكون جزءاً من روتين العناية اليومي.`;
  
  if (facts.length > 0) {
    text += ' ' + facts.map(f => f.clean).join(' ');
  }
  
  // Cap length
  if (text.length > 320) text = text.substring(0, 317) + '...';
  return text;
}

// Extract reworded facts from source description
function extractFacts(desc, category) {
  const facts = [];
  if (!desc) return facts;
  
  // Split into sentences
  const sentences = desc.split(/[.!؟؟]/).map(s => s.trim()).filter(s => s.length > 20);
  for (const s of sentences.slice(0, 4)) {
    // Reword: remove source-specific phrasing, keep substance
    let clean = s
      .replace(/^من\s+[^-]+\s*[-–—]\s*/i, '')
      .replace(/^ياقوت\s*/i, '')
      .replace(/^\s*\d+[.)]\s*/, '')
      .replace(/[،].*$/, '')
      .trim();
    
    // Remove marketing fluff
    clean = clean.replace(/\b(افضل|الافضل|رقم\s*1|الأكثر\s*مبيعاً|جديد)\b/gi, '');
    
    if (clean.length > 25 && clean.length < 200 && !facts.some(f => f.clean.includes(clean.substring(0, 20)))) {
      facts.push({ clean: clean.charAt(0).toLocaleUpperCase('ar') + clean.slice(1) });
    }
  }
  return facts;
}

function generateBenefits(yq, category, nameAr) {
  const benefits = [];
  const desc = (yq.description || '').trim();
  const catInfo = categoryMeta[category] || categoryMeta['uncategorized'];
  
  // 1. Extract key claims from description (reworded)
  const sentences = desc.split(/[.!؟؟]/).map(s => s.trim()).filter(s => s.length > 18);
  for (const s of sentences.slice(0, 5)) {
    let clean = s
      .replace(/^من\s+[^-]+\s*[-–—]\s*/i, '')
      .replace(/^\s*\d+[.)]\s*/, '')
      .replace(/[،].*$/, '')
      .replace(/\b(افضل|الافضل|رقم\s*1|الأكثر\s*مبيعاً|جديد|ممتاز)\b/gi, '')
      .trim();
    if (clean.length > 20 && clean.length < 180 && !benefits.includes(clean)) {
      benefits.push(clean);
    }
    if (benefits.length >= 4) break;
  }
  
  // 2. If not enough, add category-based factual points
  if (benefits.length < 3) {
    const catBenefits = {
      'cleansers': ['ينظف البشرة بلطف ويزيل الشوائب اليومية', 'يساعد في إزالة بقايا المكياج والأوساخ', 'يحضّر البشرة لامتصاص أفضل لمنتجات العناية'],
      'serums': ['تركيبة مركزة تستهدف احتياج البشرة المحدد', 'يمتص بسرعة ليترك البشرة جاهزة للترطيب', 'يدعم مظهر البشرة الصحي مع الاستخدام المنتظم'],
      'moisturizers': ['يرطب البشرة ويحافظ على توازن رطوبتها', 'يدعم حاجز البشرة الطبيعي', 'يترك البشرة ناعمة ومريحة'],
      'masks': ['عناية مكثفة للبشرة', 'يعطي البشرة دفعة ترطيب فورية', 'مثالي للاستخدام كجزء من روتين العناية الأسبوعي'],
      'toners': ['منعش للبشرة بعد التنظيف', 'يساعد في استعادة توازن البشرة', 'يحضّر البشرة للخطوات التالية من العناية'],
      'sunscreen': ['حماية من أشعة الشمس الضارة', 'يقي البشرة من علامات التقدم في السن', 'مناسب للاستخدام اليومي'],
      'shampoo': ['ينظف فروة الرأس والشعر بلطف', 'يساعد في الحفاظ على صحة الشعر', 'يترك الشعر نظيفاً ومرتباً'],
      'body-lotion': ['يرطب البشرة ويتركها ناعمة', 'يمتص بسرعة دون ملمس دهني', 'يساعد في الحفاظ على مرونة البشرة'],
      'body-wash': ['ينظف الجسم بلطف', 'يترك البشرة منتعشة ونظيفة', 'مثالي للاستخدام اليومي'],
      'face-makeup': ['ثبات يدوم طوال اليوم', 'يقدم لمسة نهائية احترافية', 'يعزز مظهر البشرة الطبيعي'],
      'lip-makeup': ['لون غني وثابت', 'تركيبة مريحة للشفاه', 'يضيف لمسة أناقة لإطلالتك'],
      'eye-makeup': ['تعريف واضح للعيون', 'ثبات طويل دون تلطخ', 'يبرز جمال العينين'],
      'perfume': ['عطر فاخر يدوم طويلاً', 'رائحة مميزة تترك انطباعاً', 'مثالي للاستخدام اليومي والمناسبات'],
      'vitamins': ['مكمل غذائي يدعم صحتك العامة', 'تركيبة سهلة الاستخدام', 'يساعد في سد النقص الغذائي'],
    };
    const fallback = catBenefits[category] || ['منتج مدروس لاحتياجك اليومي', 'جودة عالية وفعالية موثوقة', 'مناسب لاستخدامه ضمن روتينك اليومي'];
    for (const b of fallback) {
      if (!benefits.includes(b)) benefits.push(b);
      if (benefits.length >= 4) break;
    }
  }
  
  return benefits.slice(0, 4);
}

function generateUsage(yq, category) {
  const usage = (yq.usage || '').trim();
  const catInfo = categoryMeta[category] || categoryMeta['uncategorized'];
  
  // Rewrite source usage into original Luminous phrasing if available
  if (usage && usage.length > 5) {
    // Remove source-specific prefixes
    let clean = usage.replace(/^[\s\S]*?(ضع|يوضع|يطبق|استخدم|يستخدم|طريقة|يدلك|افرك|وزع|بخ)/i, (m) => m).trim();
    // Ensure it reads as a directive
    if (!/^(ضع|يوضع|يطبق|استخدم|يستخدم|وزع|دلك|بخ)/i.test(clean)) {
      clean = 'استخدم ' + clean.charAt(0).toLowerCase() + clean.slice(1);
    }
    return clean;
  }
  
  // Category-based fallback usage
  const catUsage = {
    'cleansers': 'ضع كمية مناسبة على البشرة المبللة، دلك بلطف بحركات دائرية ثم اشطف بالماء الفاتر.',
    'serums': 'ضع بضع قطرات على بشرة نظيفة، وزع بلطف على الوجه والرقبة حتى الامتصاص.',
    'moisturizers': 'ضع كمية مناسبة على البشرة النظيفة، دلك بلطف حتى الامتصاص الكامل.',
    'sunscreen': 'ضع كمية كافية على الوجه والمناطق المكشوفة قبل التعرض للشمس، وأعد وضعه عند الحاجة.',
    'toners': 'ضع التونر على قطنة نظيفة وامسح الوجه بعد التنظيف، اتركه حتى يجف.',
    'masks': 'ضع طبقة متساوية على بشرة نظيفة، اتركه للمدة الموصى بها ثم اشطف أو أزل حسب التعليمات.',
    'shampoo': 'ضع كمية مناسبة على الشعر المبلل، دلك حتى الرغوة ثم اشطف جيداً.',
    'body-lotion': 'ضع كمية مناسبة على الجسم بعد الاستحمام، دلك بلطف حتى الامتصاص.',
    'body-wash': 'ضع كمية على الجسم المبلل أو الليفة، دلك حتى الرغوة ثم اشطف.',
    'face-makeup': 'ضع المنتج على البشرة النظيفة، وزع بالتساوي حسب الرغبة.',
    'lip-makeup': 'ضع المنتج على الشفاه مباشرة، أعد التطبيق عند الحاجة.',
    'eye-makeup': 'طبق على العينين بلطف حسب الاستخدام المطلوب.',
    'perfume': 'رش على مناطق النبض مثل الرقبة والمعصمين.',
    'vitamins': 'اتبع الجرعة الموصى بها على العبوة يومياً.',
    'oral-care': 'استخدم المنتج حسب تعليمات الاستخدام الموضحة على العبوة.',
  };
  return catUsage[category] || 'اتبع تعليمات الاستخدام الموضحة على العبوة.';
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

function esc(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '');
}

// ==================== BUILD ENRICHED PRODUCTS ====================

function buildProductTS(yq) {
  const id = 'yq-' + yq.id;
  const category = pickCategory(yq.sections);
  const catInfo = categoryMeta[category] || categoryMeta['uncategorized'];
  
  // Brand
  let brand = (yq.brand || '').trim();
  const brandFromTitle = extractBrandFromTitle(yq.title || '');
  if (!brand || brand === 'Unknown') brand = brandFromTitle || 'Unknown';
  const brandEn = brandArabicToEnglish[brand] || brand;
  
  // Name
  const nameAr = extractProductName(yq.title || '', brand);
  const cleanName = nameAr || (yq.title || '').replace(/[-–—]+\s*من\s*[^-]*$/i, '').trim();
  
  // Size
  const sizeLabel = yq.sizeLabel || '';
  
  // Price: original - 200 as BASE price (no discount)
  const originalPrice = yq.originalPrice || 0;
  const price = originalPrice > 0 ? originalPrice - 200 : 0;
  
  // Images - use REAL Yaqoot image URLs (ogImage + gallery)
  const gallery = [];
  const baseImg = yq.ogImage || (yq.image ? 'https://www.yaqootstoreye.com/' + yq.image : '');
  if (baseImg) gallery.push(baseImg);
  if (yq.gallery && Array.isArray(yq.gallery)) {
    for (const g of yq.gallery) {
      const url = g.startsWith('http') ? g : (g.startsWith('files/') ? 'https://www.yaqootstoreye.com/' + g.replace(/\?v=\d+$/, '') : g);
      if (url && !gallery.includes(url)) gallery.push(url);
      if (gallery.length >= 4) break;
    }
  }
  if (gallery.length === 0) {
    gallery.push('https://www.yaqootstoreye.com/files/items/item_' + yq.id + '_1.png');
  }
  
  // Content
  const description = generateDescription(yq, category, cleanName, brand);
  const benefitsAr = generateBenefits(yq, category, cleanName);
  const usage = generateUsage(yq, category);
  
  // outOfStock
  const catProd = catalogMap[id];
  const outOfStock = catProd && catProd.outOfStock ? true : false;
  
  const lines = [];
  lines.push('  {');
  lines.push(`    id: "${esc(id)}", slug: "${esc(id)}", sku: "YQ-${yq.id}",`);
  lines.push(`    brand: "${esc(brandEn)}", brandAr: "${esc(brand)}",`);
  lines.push(`    name: { ar: "${esc(cleanName)}", en: "${esc(cleanName)}" },`);
  lines.push(`    description: { ar: "${esc(description)}", en: "${esc(description)}" },`);
  lines.push(`    category: "${esc(category)}", categoryAr: "${esc(catInfo.ar)}", categorySlug: "${esc(category)}",`);
  lines.push(`    pricing: { price: ${price}, currency: "YER"${originalPrice > 0 ? `, originalPrice: ${originalPrice}` : ''} },`);
  lines.push(`    gallery: [${gallery.map(g => `"${esc(g)}"`).join(', ')}],`);
  lines.push(`    usageInstructions: { ar: "${esc(usage)}", en: "${esc(usage)}" },`);
  lines.push(`    howToUse: [${usage.split(/[.]/).filter(Boolean).map(s => `"${esc(s.trim())}"`).join(', ')}],`);
  lines.push(`    benefits: { ar: [${benefitsAr.map(b => `"${esc(b)}"`).join(', ')}], en: [${benefitsAr.map(b => `"${esc(b)}"`).join(', ')}] },`);
  lines.push(`    stock: ${outOfStock ? 0 : 10}, inStock: ${!outOfStock}, stockQuantity: ${outOfStock ? 0 : 10},`);
  lines.push(`    rating: 0, reviewCount: 0, reviews: [],`);
  lines.push(`    featured: false, isFeatured: false, new: false, isNew: false, isBestSeller: false, isDoctorRecommended: false,`);
  lines.push(`    tags: ["${esc(category)}", "${esc(brandEn.toLowerCase().replace(/\s+/g, '-'))}"],`);
  lines.push(`    seoMetadata: { title: { ar: "${esc(cleanName)} - Luminous Derma", en: "${esc(cleanName)}" }, description: { ar: "${esc(description.substring(0, 150))}", en: "${esc(description.substring(0, 150))}" }, keywords: ["${esc(catInfo.en)}", "${esc(brandEn)}"] },`);
  lines.push(`    sizeLabel: "${esc(sizeLabel)}",`);
  lines.push(`    trustGuidance: { keyMessage: { ar: "${esc(cleanName)} من ${esc(brand)} - منتج موثق حسب بيانات المورد", en: "${esc(cleanName)} by ${esc(brandEn)} - product facts verified from supplier data" }, trustPoints: { ar: ["الوصف مبني على بيانات المنتج الرسمية", "${esc(brand)} براند موثوق", "${esc(sizeLabel)}"], en: ["Description based on official product data", "${esc(brandEn)} trusted brand", "${esc(sizeLabel)}"] } },`);
  lines.push(`    objectionHandling: { concern: { ar: "هل هذا المنتج مناسب لي؟", en: "Is this product right for me?" }, resolution: { ar: "يراعي هذا المنتج احتياجك حسب بياناته الموثقة - راجع طريقة الاستخدام والوصف قبل الشراء", en: "This product addresses your need per its verified data - review usage and description before buying" } },`);
  lines.push(`    conversionUX: { urgencyTrigger: { ar: "متاح الآن في متجر Luminous", en: "Available now at Luminous" }, socialProof: "" },`);
  lines.push('  },');
  return lines.join('\n');
}

// ==================== MAIN ====================

// Parse original products.ts
const originalContent = fs.readFileSync(root + '/src/data/products.ts', 'utf8');

// Find products array boundaries
const beforeMatch = originalContent.match(/^export const products: Product\[\] = \[/m);
const beforeProducts = originalContent.substring(0, beforeMatch.index);

const lines = originalContent.split('\n');
let productsEndLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '];' && lines[i-1] && lines[i-1].trim() === '},') {
    for (let j = i - 1; j > 0; j--) {
      if (lines[j].trim().startsWith('export const')) {
        if (lines[j].trim() === 'export const products: Product[] = [') {
          productsEndLine = i;
        }
        break;
      }
    }
  }
}
const afterProducts = lines.slice(productsEndLine + 1).join('\n');

// Extract original 354 products
const productsStartLine = beforeMatch.index;
const productsLines = lines.slice(productsStartLine + 1, productsEndLine);
const originalProducts = [];
let i = 0;
while (i < productsLines.length) {
  const line = productsLines[i];
  if (line.trim() === '{') {
    const blockLines = [line];
    let depth = 1;
    i++;
    while (i < productsLines.length && depth > 0) {
      const l = productsLines[i];
      depth += (l.match(/{/g) || []).length - (l.match(/}/g) || []).length;
      blockLines.push(l);
      i++;
    }
    originalProducts.push(blockLines.join('\n'));
  } else {
    i++;
  }
}
console.log('Original products parsed:', originalProducts.length);

// Fix prices in original products
const fixedOriginal = originalProducts.map(block => {
  const idMatch = block.match(/id:\s*"(yq-\d+)"/);
  if (idMatch && priceFixes[idMatch[1]]) {
    const fix = priceFixes[idMatch[1]];
    return block.replace(/pricing:\s*\{\s*price:\s*\d+/, `pricing: { price: ${fix.luminous}`);
  }
  return block;
});
console.log('Original prices fixed:', fixedOriginal.filter((b, idx) => b !== originalProducts[idx]).length);

// Build new products (skip the 354 original IDs)
const originalIds = new Set();
for (const block of originalProducts) {
  const m = block.match(/id:\s*"(yq-\d+)"/);
  if (m) originalIds.add(m[1]);
}

const newProducts = classified.filter(p => !originalIds.has('yq-' + p.id));
console.log('New products to build:', newProducts.length);

// Generate TS blocks for new products
const newBlocks = [];
for (const yq of newProducts) {
  try {
    newBlocks.push(buildProductTS(yq));
  } catch (e) {
    console.log('Error on yq-' + yq.id + ':', e.message);
  }
}
console.log('New products built:', newBlocks.length);

// Assemble final file
const productsArray = 'export const products: Product[] = [\n' + [...fixedOriginal, ...newBlocks].join('\n') + '\n];\n\n';
const finalContent = beforeProducts + productsArray + afterProducts.trimEnd() + '\n';

fs.writeFileSync(root + '/src/data/products.ts', finalContent, 'utf8');

// Verify
const allIds = (finalContent.match(/id:\s*"yq-\d+"/g) || []).map(m => m.match(/"([^"]+)"/)[1]);
const idSet = new Set(allIds);
console.log('\n=== VERIFICATION ===');
console.log('Total products:', allIds.length);
console.log('Unique IDs:', idSet.size);
console.log('Duplicates:', allIds.length - idSet.size);

// Check that no copied Yaqoot title remains in names
const copiedNames = newBlocks.filter(b => {
  const idMatch = b.match(/id:\s*"(yq-\d+)"/);
  const yq = classified.find(p => 'yq-' + p.id === (idMatch && idMatch[1]));
  return yq && b.includes('"من ' + (yq.brand || '')) && b.includes(yq.title.split(' - ')[0]);
});
console.log('Blocks still containing copied title pattern:', copiedNames.length);

// Price check
const priceCount = (finalContent.match(/pricing:\s*\{\s*price:\s*(\d+)/g) || []).length;
console.log('Pricing entries:', priceCount);
console.log('File size:', (Buffer.byteLength(finalContent) / 1024 / 1024).toFixed(2), 'MB');
