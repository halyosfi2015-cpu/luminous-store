/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unified Matching Engine - READ-ONLY
 * Produces matching evidence only. No products modified.
 */
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

function loadPart(i) {
  const src = fs.readFileSync(path.join(ROOT, 'src/data/products-part-0' + i + '.ts'), 'utf8');
  return JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
}
const luminous = [];
for (let i = 1; i <= 8; i++) luminous.push(...loadPart(i));
const outlet = JSON.parse(fs.readFileSync(path.join(ROOT, 'outlet_products_data.json'), 'utf8'));
console.log('Luminous: ' + luminous.length + ', Outlet: ' + outlet.length);

const STOPWORDS = new Set([
  'من','مع','لل','الى','على','في','و','او','ل','ب','كما','يوميا','يوما',
  'عبوه','علبه','حجم','the','for','with','and','of','by','new','pack','from','size'
]);

function normAr(s) {
  return String(s || '').toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[\u0621\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A').replace(/\u0629/g, '\u0647')
    .replace(/[^\p{L}\p{N}\s%+.]/gu, ' ')
    .replace(/\s+/g, ' ').trim();
}

function tokenize(s) {
  return normAr(s).split(' ').map(function(t) { return t.replace(/^ال/, ''); })
    .filter(function(t) { return t.length >= 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t); });
}

function jaccard(a, b) {
  if (!a.length || !b.length) return 0;
  const sA = new Set(a), sB = new Set(b);
  let inter = 0;
  for (const t of sA) if (sB.has(t)) inter++;
  return inter / (sA.size + sB.size - inter);
}

function containment(a, b) {
  if (!a.length || !b.length) return 0;
  const sB = new Set(b);
  let m = 0;
  for (const t of a) if (sB.has(t)) m++;
  return m / a.length;
}

// ── Brand resolver ──────────────────────────────────────────────
const BRAND_CANONICAL = {
  'la roche posay': 'La Roche-Posay', 'l\'oreal': 'L\'Oreal', 'the ordinary': 'The Ordinary',
  'beauty of joseon': 'Beauty of Joseon', 'some by mi': 'Some By Mi', 'round lab': 'Round Lab',
  'drunk elephant': 'Drunk Elephant', 'paula\'s choice': 'Paula\'s Choice',
  'krave beauty': 'Krave Beauty', 'glow recipe': 'Glow Recipe',
  'sunday riley': 'Sunday Riley', 'tata harper': 'Tata Harper',
  'the inkey list': 'The Inkey List', 'good molecules': 'Good Molecules',
  'peter thomas roth': 'Peter Thomas Roth', 'kate somerville': 'Kate Somerville',
  'hair recipe': 'Hair Recipe', 'skin1004': 'SKIN1004',
  'face shop': 'The Face Shop', 'it\'s skin': 'It\'s Skin',
  'nature republic': 'Nature Republic', 'tony moly': 'Tony Moly',
  'holika holika': 'Holika Holika', 'april skin': 'April Skin',
  'kylie skin': 'Kylie Skin', 'summer friday': 'Summer Friday',
  'tower 28': 'Tower 28', 'fenty skin': 'Fenty Skin',
  'bobbi brown': 'Bobbi Brown', 'laura mercier': 'Laura Mercier',
  'charlotte tilbury': 'Charlotte Tilbury', 'huda beauty': 'Huda Beauty',
  'rare beauty': 'Rare Beauty', 'beauty blender': 'Beauty Blender',
  'pat mcgrath': 'Pat McGrath', 'natasha denona': 'Natasha Denona',
  'arabian oud': 'Arabian Oud', 'swiss arabian': 'Swiss Arabian',
  'yves rocher': 'Yves Rocher', 'tom ford': 'Tom Ford',
  'calvin klein': 'Calvin Klein', 'hugo boss': 'Hugo Boss',
  'dolce gabbana': 'Dolce & Gabbana', 'giorgio armani': 'Giorgio Armani',
  'giorgio': 'Giorgio Armani',
};

const BRAND_ALIASES_FLAT = {
  // Arabic → English canonical
  'نيفيا': 'nivea', 'نيفا': 'nivea', 'نيفز': 'nivea',
  'دوف': 'dove', 'dove': 'dove',
  'كولجيت': 'colgate', 'colgate': 'colgate',
  'سيتافيل': 'cetaphil', 'cetaphil': 'cetaphil',
  'يوسيرين': 'eucerin', 'يوزرين': 'eucerin',
  'لوريال': "l'oreal", "l'oreal": "l'oreal", 'loreal': "l'oreal",
  'غارنييه': 'garnier', 'garnier': 'garnier',
  'بيور': 'pure', 'فيز': 'pantene',
  'سيmillك': 'similac', 'similac': 'similac',
  'بانتين': 'pantene', 'pantene': 'pantene',
  'افالون': 'avalon', 'avalon': 'avalon',
  'بيزلين': 'beesline', 'beesline': 'beesline',
  'فازلين': 'vaseline', 'vaseline': 'vaseline',
  'كيوفي': 'kiehls', 'kiehls': 'kiehls',
  'كولستون': 'colston', 'colston': 'colston',
  'سنسوداين': 'sensodyne', 'sensodyne': 'sensodyne',
  'arel': 'arel',
  ' johnson': 'johnson', 'جونسون': 'johnson', 'johnson': 'johnson',
  'بيبي': 'baby', 'baby': 'baby',
  'فليكترين': 'fleketrin',
  ' لوكس': 'lux', 'lukx': 'lux', 'lukx': 'lux', 'lukx': 'lux',
  ' كرست': 'crest', 'crest': 'crest',
  ' اورال': 'oralb', 'oral-b': 'oralb', 'oralb': 'oralb',
  'ريكسونا': 'rexona', 'rexona': 'rexona',
  'فازلين': 'vaseline',
  'alus': 'alus', 'اولويز': 'always', 'always': 'always',
  'ديوريكس': 'durex', 'durex': 'durex',
  'يودوفاج': 'iodofag',
  'لوريال': "l'oreal",
  'هيربال': 'herbal essences', 'herbal essences': 'herbal essences',
  'صانسيلك': 'sunsilk', 'sunsilk': 'sunsilk',
  ' فيشي': 'vichy',
  ' فيتامن': 'vitamin',
  ' اوتيفين': 'autin',
  ' johnson': 'johnson',
  ' بايونير': 'pioneer',
  ' صن': 'sun',
  ' فيتال': 'vital',
  ' فارلين': 'farlin', 'farlin': 'farlin',
  ' فلورمار': 'fleurmar', 'fleurmar': 'fleurmar',
  ' بولفير': 'pulvis', 'pulvis': 'pulvis',
  ' بيبي ليس': 'baby lips',
  ' لوبريديرم': 'lubriderm', 'lubriderm': 'lubriderm',
  ' جيليت': 'gillette', 'gillette': 'gillette',
  ' بيجون': 'pigeon', 'pigeon': 'pigeon',
  ' ون': 'wan',
  ' ديبيوردينت': 'deodorant',
  ' فاتيكا': 'fateema',
  ' ال تي': 'lt',
  ' اوتيفين': 'autin',

  // Existing English aliases
  'la roche posay': 'la roche posay', 'لاروش بوزيه': 'la roche posay', 'لا روش': 'la roche posay', 'لاروش': 'la roche posay', 'بوزيه': 'la roche posay',
  'lrp': 'la roche posay', 'la roche': 'la roche posay', 'roche posay': 'la roche posay',
  'vichy': 'vichy',
  'بايوديرما': 'bioderma', 'بوديرما': 'bioderma', 'bioderma': 'bioderma',
  'سيرافي': 'cerave', 'سيراڤي': 'cerave', 'cerave': 'cerave',
  'أفين': 'avene', 'افين': 'avene', 'avene': 'avene', 'eau thermale': 'avene',
  'ذا أوردينري': 'the ordinary', 'ذا اوردينري': 'the ordinary', 'the ordinary': 'the ordinary', 'ordinary': 'the ordinary',
  'نوكس': 'nuxe', 'nuxe': 'nuxe',
  'يورياج': 'uriage', 'uriage': 'uriage',
  'سبامد': 'sebamed', 'sebamed': 'sebamed',
  'نوتروجينا': 'neutrogena', 'neutrogena': 'neutrogena',
  'كلينيك': 'clinique', 'clinique': 'clinique',
  'استي لودر': 'estee lauder', 'estee lauder': 'estee lauder',
  'ديور': 'dior', 'dior': 'dior',
  'شانيل': 'chanel', 'chanel': 'chanel',
  'ماك': 'mac', 'mac': 'mac',
  'cosrx': 'cosrx', 'cos.rx': 'cosrx',
  'إينس فري': 'innisfree', 'innisfree': 'innisfree',
  'ميديك유ب': 'medicube', 'medicube': 'medicube',
  'أنوا': 'anua', 'anua': 'anua',
  'توريدين': 'torriden', 'torriden': 'torriden',
  ' skin1004': 'skin1004',
  'some by mi': 'some by mi',
  'round lab': 'round lab',
  'isntree': 'isntree',
  'dr.althea': 'dr althea', 'dr althea': 'dr althea',
  'nacific': 'nacific',
  'mizon': 'mizon',
  'la mer': 'la mer',
  'tatcha': 'tatcha',
  'fresh': 'fresh',
  'belif': 'belif',
  'laneige': 'laneige',
  'iope': 'iope',
  'sulwhasoo': 'sulwhasoo',
  'hera': 'hera',
  'etude house': 'etude', 'etude': 'etude',
  'tony moly': 'tony moly',
  'nature republic': 'nature republic',
  'amika': 'amika',
  'davines': 'davines',
  'vitabrid': 'vitabrid',
  'foreo': 'foreo',
  'hourglass': 'hourglass',
  'bobbi brown': 'bobbi brown',
  'nars': 'nars',
  'morphe': 'morphe',
  'benefit': 'benefit',
  'smashbox': 'smashbox',
  'tarte': 'tarte',
  'stila': 'stila',
  'prada': 'prada',
  'gucci': 'gucci',
  'tom ford': 'tom ford',
  'ajmal': 'ajmal',
  'swiss arabian': 'swiss arabian',
  'al rehab': 'al rehab',
  'arabian oud': 'arabian oud',
  'lattafa': 'lattafa',
  'rasasi': 'rasasi',
  'يورياج': 'uriage',
  ' كيراستاس': 'kerastase', 'kerastase': 'kerastase',
  ' ريدكن': 'redken', 'redken': 'redken',
};

function resolveBrand(brand) {
  const raw = normAr(String(brand || '')).trim();
  if (!raw) return null;
  if (BRAND_ALIASES_FLAT[raw]) return BRAND_ALIASES_FLAT[raw];
  const lower = String(brand || '').toLowerCase().trim();
  if (BRAND_ALIASES_FLAT[lower]) return BRAND_ALIASES_FLAT[lower];
  if (BRAND_CANONICAL[lower]) return lower;
  return lower || null;
}

function resolveBrandMatch(b1, b2) {
  const r1 = resolveBrand(b1), r2 = resolveBrand(b2);
  if (!r1 && !r2) return { level: null, canonical1: null, canonical2: null };
  if (!r1 || !r2) return { level: null, canonical1: r1, canonical2: r2 };
  if (r1 === r2) return { level: 3, canonical1: r1, canonical2: r2 };
  const n1 = normAr(r1), n2 = normAr(r2);
  if (n1 === n2) return { level: 3, canonical1: r1, canonical2: r2 };
  if (n1.includes(n2) || n2.includes(n1)) return { level: 2, canonical1: r1, canonical2: r2 };
  return { level: 0, canonical1: r1, canonical2: r2 };
}

// ── Product type detection ──────────────────────────────────────
const TYPE_PATTERNS = [
  ['serum', /\b(se?rum|سيروم)\b/i], ['cream', /\b(cre?me|كريم)\b/i],
  ['moisturizer', /\b(moisturiz|ترطيب|مرطب)\b/i], ['cleanser', /\b(cleanse?r?|غسول|تنظيف)\b/i],
  ['toner', /\b(toner?|تونر|مقشر)\b/i], ['sunscreen', /\b(sun|spf|شمس|حماية)\b/i],
  ['shampoo', /\b(shamp|شامبو)\b/i], ['conditioner', /\b(conditi?oner|بلسم)\b/i],
  ['mask', /\b(mask?|قناع)\b/i], ['lotion', /\b(lotion?|لوشن)\b/i],
  ['oil', /\b(oil|زيت)\b/i], ['eye care', /\b(eye|عيون)\b/i],
  ['lip', /\b(lip|شفاه)\b/i], ['body', /\b(body|جسم)\b/i],
  ['hair', /\b(hair|شعر)\b/i], ['nail', /\b(nail|اظافر)\b/i],
  ['fragrance', /\b(fragrance|عطر|perfume)\b/i], ['deodorant', /\b(deod|معطر)\b/i],
  ['foundation', /\b(foundation|بيشد)\b/i],
  ['primer', /\b(primer|برايمر)\b/i], ['concealer', /\b(concealer|كونسيلر)\b/i],
  ['powder', /\b(powder|بودرة)\b/i], ['blush', /\b(blush|بلاشر)\b/i],
  ['mascara', /\b(mascara|ماسكارا)\b/i], ['eyeliner', /\b(eyeliner|كحل)\b/i],
  ['palette', /\b(palette|باليت)\b/i], ['lipstick', /\b(lipstick|احمر شفاه)\b/i],
  ['gloss', /\b(gloss|جلاس)\b/i], ['liner', /\b(liner|لاينر)\b/i],
  ['water', /\b(water|مياه)\b/i], ['gel', /\b(gel|جيل)\b/i],
  ['spray', /\b(spray|رذاذ)\b/i],   ['stick', /\b(stick|ستيك)\b/i],
  ['pad', /\b(pad|باد)\b/i], ['patches', /\b(patch|سبات)\b/i],
  ['supplement', /\b(supplement|مكمل)\b/i], ['vitamin', /\b(vitamin|فيتامين)\b/i],
  ['ampoule', /\b(ampoule|امبول)\b/i],
];

function detectType(name) {
  const text = normAr(name);
  for (const [type, regex] of TYPE_PATTERNS) {
    if (regex.test(text)) return type;
  }
  return null;
}

const RELATED_TYPES = {
  serum: ['ampoule', 'essence'], cream: ['moisturizer', 'lotion'],
  cleanser: ['face wash'], toner: ['essence'], sunscreen: ['sun protection'],
  shampoo: ['conditioner'], lipstick: ['lip gloss', 'lip liner'],
};

function isVariantConflict(t1, t2) {
  if (!t1 || !t2) return false;
  if (t1 === t2) return false;
  if (RELATED_TYPES[t1] && RELATED_TYPES[t1].includes(t2)) return false;
  if (RELATED_TYPES[t2] && RELATED_TYPES[t2].includes(t1)) return false;
  const conflictGroups = [
    ['serum', 'cleanser', 'shampoo', 'body', 'fragrance', 'deodorant'],
    ['cream', 'lotion', 'gel', 'oil'],
    ['sunscreen', 'moisturizer'],
  ];
  for (const group of conflictGroups) {
    if (group.includes(t1) && group.includes(t2)) return true;
  }
  return false;
}

// ── Size extraction ─────────────────────────────────────────────
function extractSize(text) {
  const t = normAr(text);
  const patterns = [
    { regex: /(\d+(?:\.\d+)?)\s*(ml|مل)/i, unit: 'ml', factor: 1 },
    { regex: /(\d+(?:\.\d+)?)\s*(l|لتر)/i, unit: 'ml', factor: 1000 },
    { regex: /(\d+(?:\.\d+)?)\s*(g|جرام)/i, unit: 'g', factor: 1 },
    { regex: /(\d+(?:\.\d+)?)\s*(mg|ملجم)/i, unit: 'mg', factor: 1 },
    { regex: /(\d+)\s*(count|piece|حبه|قطع)/i, unit: 'count', factor: 1 },
    { regex: /spf\s*(\d+)/i, unit: 'spf', factor: 1 },
    { regex: /(\d+)\s*(pack|ربطة)/i, unit: 'pack', factor: 1 },
  ];
  for (const p of patterns) {
    const m = t.match(p.regex);
    if (m) return { value: parseFloat(m[1]) * p.factor, unit: p.unit, raw: m[0] };
  }
  return null;
}

function sizeMatch(s1, s2) {
  if (!s1 || !s2) return 0;
  if (s1.unit !== s2.unit) return 0;
  const ratio = Math.min(s1.value, s2.value) / Math.max(s1.value, s2.value);
  if (ratio === 1) return 3;
  if (ratio >= 0.9) return 2;
  if (ratio >= 0.7) return 1;
  return 0;
}

// ── Outlet brand extraction from nameAr ─────────────────────────
const OUTLET_BRAND_PREFIXES = {};
const COMMON_BRAND_WORDS = new Set([
  'معجون','شامبو','لوشن','كريم','كبسولة','قرص','حبة','غسول','سبونج',
  'مزيل','عطر','بودرة','جل',' Carey',' ura ',' حجم',' كثيف',' منظف',
  ' صابون',' رغوة',' Carey',
]);

function extractOutletBrand(nameAr) {
  const name = String(nameAr || '').trim();
  if (!name) return null;
  const words = name.split(/\s+/);
  if (words.length < 2) return null;
  const brand = words[0];
  if (/^\d+$/.test(brand)) return null;
  if (brand.length < 3) return null;
  if (COMMON_BRAND_WORDS.has(brand)) return null;
  return brand;
}

function resolveOutletBrand(out) {
  if (out.brand && out.brand.trim()) return out.brand.trim();
  return extractOutletBrand(out.nameAr) || null;
}

// ── Scoring ─────────────────────────────────────────────────────
function computeScore(lum, out) {
  const lumNameObj = lum.name || lum.title || {};
  const lumName = typeof lumNameObj === 'string' ? lumNameObj : (lumNameObj.ar || lumNameObj.en || JSON.stringify(lumNameObj));
  const outName = out.nameAr || out.name || '';
  const lumBrand = lum.brand || lum.brand_name || '';
  const outBrand = resolveOutletBrand(out);

  const brandResult = resolveBrandMatch(lumBrand, outBrand);
  const brandScore = brandResult.level === 3 ? 3 : brandResult.level === 2 ? 2 : brandResult.level === 1 ? 1 : 0;

  // Brand conflict only when both brands are known AND different
  if (brandResult.level === 0 && lumBrand && outBrand) {
    return { score: 0, decision: 'REJECT', brandConflict: true, reasons: ['brand_conflict'] };
  }

  const lumTokens = tokenize(lumName);
  const outTokens = tokenize(outName);
  const nameSim = Math.max(jaccard(lumTokens, outTokens), containment(lumTokens, outTokens));

  const lumType = detectType(lumName);
  const outType = detectType(outName);
  const typeConflict = isVariantConflict(lumType, outType);
  if (typeConflict) {
    return { score: 0, decision: 'REJECT', brandConflict: false, reasons: ['variant_conflict'] };
  }
  const typeScore = (lumType && outType && lumType === outType) ? 2 : (lumType || outType) ? 0.5 : 1;

  const lumSize = extractSize(lumName);
  const outSize = extractSize(outName);
  const sMatch = sizeMatch(lumSize, outSize);
  if (lumSize && outSize && sMatch === 0) {
    return { score: 0, decision: 'REJECT', brandConflict: false, reasons: ['size_mismatch'] };
  }

  const lumDescObj = lum.description || {};
  const lumDescText = typeof lumDescObj === 'string' ? lumDescObj : (lumDescObj.ar || lumDescObj.en || '');
  const lumDesc = tokenize(lumDescText);
  const outDesc = tokenize(out.description || '');
  const lineSim = jaccard(lumDesc, outDesc);

  // Require minimum name similarity for any match
  if (nameSim < 0.15) {
    return { score: 0, decision: 'REJECT', brandConflict: false, reasons: ['low_name_similarity'] };
  }

  let total = brandScore + nameSim * 3 + typeScore + sMatch + lineSim * 2;

  let decision = 'NEEDS_REVIEW';
  if (total >= 8) decision = 'CONFIRMED';
  else if (total < 3) decision = 'REJECT';

  return {
    score: Math.round(total * 100) / 100, decision, brandConflict: false,
    reasons: [lumType && outType ? (lumType === outType ? 'type_match' : 'type_related') : 'unknown_type'],
    brandMatch: brandResult, nameSimilarity: Math.round(nameSim * 100) / 100,
    typeScore, sizeScore: sMatch, lineScore: Math.round(lineSim * 100) / 100,
  };
}

// ── Matching loop ───────────────────────────────────────────────
const results = [];
const usedOutlet = new Set();

// Index outlet products by resolved brand for fast candidate selection
const outletByBrand = {};
for (let i = 0; i < outlet.length; i++) {
  const ob = resolveBrand(resolveOutletBrand(outlet[i])) || '_unknown_';
  if (!outletByBrand[ob]) outletByBrand[ob] = [];
  outletByBrand[ob].push(i);
}
console.log('Outlet brand index: ' + Object.keys(outletByBrand).length + ' groups');
console.log('Top Outlet brand groups:', Object.entries(outletByBrand).sort((a,b) => b[1].length - a[1].length).slice(0, 10).map(([k,v]) => k + ':' + v.length).join(', '));

console.log('Matching ' + luminous.length + ' Luminous × ' + outlet.length + ' Outlet products...');

for (let li = 0; li < luminous.length; li++) {
  const lum = luminous[li];
  const lumBrand = resolveBrand(lum.brand || lum.brand_name || '') || '_unknown_';
  let bestIdx = -1, bestScore = -1, bestResult = null;

  const candidates = [];
  if (outletByBrand[lumBrand]) candidates.push(...outletByBrand[lumBrand]);
  // Also check for partial brand match
  for (const key of Object.keys(outletByBrand)) {
    if (key !== lumBrand && key !== '_unknown_' && lumBrand !== '_unknown_') {
      const n1 = normAr(key), n2 = normAr(lumBrand);
      if (n1.includes(n2) || n2.includes(n1)) candidates.push(...outletByBrand[key]);
    }
  }

  for (const oi of candidates) {
    if (usedOutlet.has(oi)) continue;
    const result = computeScore(lum, outlet[oi]);
    if (result.score > bestScore) {
      bestScore = result.score;
      bestIdx = oi;
      bestResult = result;
    }
  }

  if (bestIdx >= 0 && bestResult && bestResult.score >= 3) {
    usedOutlet.add(bestIdx);
    results.push({
      luminousIndex: li,
      luminousId: lum.id || lum.legacy_id || '',
      luminousName: typeof (lum.name || {}) === 'string' ? lum.name : ((lum.name || {}).ar || (lum.name || {}).en || ''),
      luminousBrand: lum.brand || lum.brand_name || '',
      outletIndex: bestIdx,
      outletName: outlet[bestIdx].nameAr || outlet[bestIdx].name || '',
      outletBrand: outlet[bestIdx].brand || '',
      outletUrl: outlet[bestIdx].url || '',
      ...bestResult,
    });
  }
}

// ── Output ──────────────────────────────────────────────────────
const confirmed = results.filter(r => r.decision === 'CONFIRMED');
const needsReview = results.filter(r => r.decision === 'NEEDS_REVIEW');
const rejected = results.filter(r => r.decision === 'REJECT');

console.log('\n=== UNIFIED MATCH RESULTS ===');
console.log('Total matched: ' + results.length);
console.log('CONFIRMED: ' + confirmed.length);
console.log('NEEDS_REVIEW: ' + needsReview.length);
console.log('REJECTED: ' + rejected.length);
console.log('Unmatched Luminous: ' + (luminous.length - results.length));
console.log('Unmatched Outlet: ' + (outlet.length - usedOutlet.size));

if (confirmed.length > 0) {
  console.log('\n--- TOP CONFIRMED ---');
  for (const r of confirmed.slice(0, 20)) {
    console.log('  ' + r.luminousName + ' (' + r.luminousBrand + ') <-> ' + r.outletName + ' (' + r.outletBrand + ') [' + r.score + ']');
  }
}
if (needsReview.length > 0) {
  console.log('\n--- TOP NEEDS_REVIEW ---');
  for (const r of needsReview.slice(0, 20)) {
    console.log('  ' + r.luminousName + ' (' + r.luminousBrand + ') <-> ' + r.outletName + ' (' + r.outletBrand + ') [' + r.score + ']');
  }
}

const report = {
  timestamp: new Date().toISOString(),
  luminousCount: luminous.length,
  outletCount: outlet.length,
  totalMatches: results.length,
  confirmed: confirmed.length,
  needsReview: needsReview.length,
  rejected: rejected.length,
  unmatchedLuminous: luminous.length - results.length,
  unmatchedOutlet: outlet.length - usedOutlet.size,
  results,
};

fs.writeFileSync(path.join(ROOT, 'tmp/unified-match-results.json'), JSON.stringify(report, null, 2));
console.log('\nResults written to tmp/unified-match-results.json');
