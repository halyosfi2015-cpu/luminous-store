import { normalizeAr, normalizeEn } from './normalize';
import type { BrandMatchResult } from './types';

// Canonical brand names from catalog (slug → { name, nameAr })
interface BrandEntry {
  slug: string;
  name: string;
  nameAr: string;
}

// Brand alias groups: first element is canonical
const ALIAS_GROUPS: string[][] = [
  ['bioderma', 'بيوديرما', 'بيودرما'],
  ['cerave', 'سيرافي', 'سيرافيه', 'سيافيه', 'سي رايف'],
  ['cetaphil', 'سيتافيل', 'سيتافل'],
  ['vichy', 'فيشي'],
  ['la roche-posay', 'لا روش', 'لا روش بوزيه', 'لاروش بوزيه', 'لاروش', 'لا روش بوساي', 'لا روش بوزي'],
  ["l'oreal paris", "l'oreal", "l'oréal", 'لوريال', 'لوريال باريس', 'loreal', 'لوريال باريس'],
  ['nivea', 'نيفيا', 'نيоя', 'ني比亚', 'نيفيه'],
  ['eucerin', 'يوكسيرين', 'يوريجرم', 'يوكسيرين', 'يوسرن', 'يوسيرين', 'ايسرين', 'اويسرين'],
  ['olay', 'اولاي'],
  ['neutrogena', 'نيتروجينا', 'نيتجنا', 'نيتريجينا', 'نيتجينا'],
  ['maybelline', 'ميبلين', 'ميبيلين', 'ميبو', 'مايبلين'],
  ['dove', 'دوف'],
  ['garnier', 'غارنييه', 'غارنيه', 'غارنير', 'غارنية'],
  ['sebamed', 'سيباميد', 'سيبا ميد'],
  ['palmers', 'بالمرز'],
  ['vaseline', 'فازلين', 'فاجسل', 'فايجسل', 'ڤازلين'],
  ['avène', 'avene', 'افين', 'افينه', 'افيني', 'أفين'],
  ['aveeno', 'افينو', 'افانو', 'افيانو'],
  ['bio-oil', 'بايو اويل', 'بايوول'],
  ['beesline', 'بيزلين', 'بيزلاين'],
  ['sesderma', 'سيسيديرما'],
  ['olaplex', 'اولابلكس', 'اولابلس', 'اولابليكس'],
  ['nizoral', 'نيزورال', 'نايزورال'],
  ['stridex', 'سترايدكس'],
  ['mixa', 'ميكسا'],
  ['eveline', 'ايفلين', 'ايفللين'],
  ['cosrx', 'كوكسير', 'كوكس ار اكس'],
  ['biodance', 'بيودانس'],
  ['numbuzin', 'نومبوزين'],
  ['anua', 'انوا', 'أنوا', 'انو'],
  ['some by mi', 'سوم باي مي', 'من سوم باي مي'],
  ['farm stay', 'فارم ستي', 'فارم ستاي', 'فارم استاي'],
  ['the ordinary', 'ذا اورديناري', 'ذاورديناري', 'ذا اوردinueري'],
  ['beauty of joseon', 'بيوتي اوف جوسيهون', 'بيوتي اوف جيسهون'],
  ['k-secret', 'كي سيكرت', 'كي سيكريت', 'كي-سيكرت'],
  ["paula's choice", 'باولاز', 'باولاز شويس', 'paulas choice'],
  ['clinique', 'كلينيك'],
  ['estee lauder', 'استي لودر'],
  ['lancome', 'لانكوم'],
  ['clarins', 'كلارنس', 'كلارينس'],
  ['mac', 'ماك'],
  ['benefit', 'بنفت'],
  ['revlon', 'ريفلون'],
  ['rimmel', 'ريميل', 'ريميل لندن'],
  ['shiseido', 'شيسيدو'],
  ['dior', 'ديور'],
  ['chanel', 'شانيل', 'شانيل للنساء'],
  ['versace', 'فرزاتشي'],
  ['bath & body works', 'باث اند بودي', 'باث اند بودي وركس', 'باث اند بو'],
  ["johnson's", 'جونسون', 'جونسونز', 'جونسون بابي'],
  ['dettol', 'ديتول'],
  ['sensodyne', 'سنسوداين'],
  ['parodontax', 'بارودونتكس', 'بارودونتاكس', 'بردونتكس'],
  ['isidin', 'ايزدين', 'ايزس', 'ازدين'],
  ['nuxe', 'نوكس'],
  ["l'occitane", 'اوكسبيتن'],
  ['lux', 'لكس', 'لوكس'],
  ['lifebuoy', 'لايف بوي'],
  ['biore', 'بيور', 'بيوريه', 'بيوريه'],
  ['clear', 'كلير'],
  ['pantene', 'بانتين'],
  ['herbal essences', 'هيربال ايسنسز', 'هيربال'],
  ['torriden', 'توريدن'],
  ['mediheal', 'ميديهيل'],
  ['round lab', 'راوند لاب'],
  ['skin1004', 'سكين 1004', 'سكين1004', 'سكين 100', 'سكين'],
  ['the face shop', 'ذا فيس شوب'],
  ['nature republic', 'ناتشور ريببلك', 'ناتشر ريببلك'],
  ['missha', 'ميشا'],
  ['etude house', 'اتيود هاوس', 'اتيود'],
  ['tony moly', 'توني مولي'],
  ['innisfree', 'اينيسفري'],
  ["kiehl's", 'كيهيلز'],
  ['la mer', 'لا مير'],
  ['tom ford', 'توم فورد'],
  ['prada', 'برادا'],
  ['hugo boss', 'هوجو بوس', 'هوغو بوس'],
  ['valentino', 'فالنتينو'],
  ['givenchy', 'جانفيشي', 'جيفنشي', 'جيفانشي'],
  ['calvin klein', 'كالفن كلاين'],
  ['dolce & gabbana', 'دولتشي اند جابانا', 'دولتشي اند جابانه', 'دولتشي آند غابانا'],
  ['lattafa', 'لطيفة', 'لطيفه'],
  ['rasasi', 'راسازي'],
  ['ajmal', 'اجمل', 'اجمال'],
  ['abdel samad al quraishi', 'عبد الصمد القرشي'],
  ['ibrahim al quraishi', 'ابراهيم القرشي'],
  ['al haramain', 'الحرمين'],
  ['afnan', 'افنون'],
  ['swiss arabian', 'سويس اربيان'],
  ['amouage', 'امواج'],
  ['lacoste', 'لاكوست'],
  ['adidas', 'اديداس'],
  ['ralph lauren', 'رالف لورين'],
  ['burberry', 'بربوري', 'بربري', 'بريبري'],
  ['arco pharma', 'اركوفارما'],
  ['centrum', 'سنترم'],
  ["dr. althaya", 'دكتور الثيا', 'دكتور الثيا', 'dr althaya', 'د آلثيا'],
  ['rexona', 'ريكسونا'],
  ['head & shoulders', 'هيد اند شولدرز'],
  ['sunsilk', 'سن سلك'],
  ['pyunkang yul', 'بيونغ كانغ يل'],
  ['skinfood', 'سكين فود'],
  ['it\'s skin', 'ايز سكين'],
  ['the saem', 'ذا سام'],
  ['peripera', 'بيريبيرا'],
  ['mamonde', 'ماموند'],
  ['sulwhasoo', 'سولوهاسو', 'سولوواسو'],
  ['elizavecca', 'ايليزافيكا'],
  ['charlotte tilbury', 'شارلوت تلبري'],
  ['la prairie', 'لا برايري'],
  ['tarte', 'تارت'],
  ['too faced', 'تو فيسد'],
  ['nars', 'نارس'],
  ['bare minerals', 'بير مينرالز', 'bareminerals'],
  ['michael kors', 'مايكل كورس'],
  ['coach', 'كوتش'],
  ['diptyque', 'ديبتيك'],
  ['le labo', 'لابو'],
  ['aesop', 'ايسوب'],
  ['decorte', 'ديكورتي', 'كوز دي جورتي'],
  ['body shop', 'بودي شوب'],
  ['st. ives', 'سانت ايفز'],
  ['oral-b', 'اورال بي', 'أورال بي', 'اورال-بي'],
  ['dabur', 'دابور'],
  ['carmex', 'كارميكس'],
  ['nature made', 'ناتشر ميد'],
  ['21st century', '21 سنتوري', '21 سينتشر'],
  ['spring valley', 'سبرينج فالي'],
  ['kirkland', 'كركلاند'],
  ["nature's bounty", 'ناتشرز باونتي'],
  ['caltrate', 'كالتريت'],
  ['redoxon', 'ريدوكسون'],
  ['nair', 'ناير'],
  ['schick', 'شيك', 'شفره'],
  ['gillette', 'جيليت', 'جليت'],
  ['braun', 'براون'],
  ['philips', 'فيليبس'],
  ['neostrata', 'نيوسترا'],
  ['isclinical', 'ايز كلينيكال'],
  ['qv', 'كيو في'],
  ['uriage', 'يوريجرم', 'يوريج', 'اوري'],
  ['svr', 'اس في ار'],
  ['mustela', 'موستيلا'],
  ['filorga', 'فيلورجا'],
  ['sisley', 'سيسلي'],
  ['darphin', 'دارفين'],
  ['caudalie', 'كودالي', 'كوز دي جورتي'],
  ['elizabeth arden', 'ايزابيل اردن'],
  ['lancaster', 'لانكستر'],
  ['la roche', 'لا روش'],
  ['glysolid', 'جليسوليد', 'جيسوليد'],
  ['nubian heritage', 'نوبيان هيريتج'],
  ['oz naturals', 'اوز ناتشورال', 'اوز ناتشورالز'],
  ['real techniques', 'ريال تكنك'],
  ['ofra cosmetics', 'ofra'],
  ["natures republic", 'ناتشر ريببلك'],
  ['isadora', 'إيسادور'],
  ['jose-eber', 'جوسي ايبر'],
  ['arm-hammer', 'ارم اند همر', 'ارم اند هامر'],
  ['lane organic', 'لان اورجانك', 'لان اورجانيك'],
  ['equal-berry', 'ايكوال بيري', 'equalberry'],
  ['uni-pro', 'وني برو', 'unipro'],
  ['mary-ruth', 'maryruths', 'mary ruths'],
  ['access-w', 'من اكسيس واي', 'من أكسيس واي', 'اكسيس واي'],
  ['peber-mintz', 'بيبر منتسل'],
  ['nyx', 'ناي اكس', 'نايكس', 'ان واي اكس'],
  ['isis-pharma', 'من ايزيس فارما'],
  ['femfresh', 'من فيم فريش'],
  ['century-21', 'سينتري21', 'سينتري 21', 'من سينتري 21', 'سينتري'],
  ['scala', 'سكالا'],
  ['california-gold-nutrition', 'كاليفورنيا غولد نيوتريش', 'كاليفورنيا غولد نيوتريشن', 'كاليفور'],
  ['secret-key', 'سيكرت كي'],
  ['giovanni', 'جيوفاني', 'ماركة جيوفاني'],
  ['vitabiotics', 'برفيكتيل'],
  ['christine', 'كريست'],
  ['loca', 'luca'],
  ['flormar', 'فلورمار', 'فleurmar'],
  ['bourjois', 'بورجوا'],
  ['maybelline', 'ميبلين', 'ميبيلين'],
  ['farm-stay', 'فارم ستي', 'فارم ستاي'],
  ['im-sorry-for-my-skin', 'ام سوري فور ماي سكن'],
  ['mason-natural', 'ماسون'],
  ['koji-san', 'كوجي'],
  ['skin1004', 'سكين100', 'سكين 100'],
  ['sheamoisture', 'من شيا مويستر', 'شيا مويستشر', 'شيا موisture', 'شيا مويستر'],
  ['marvis', 'مارفيس', 'مارفيز'],
  ['sudocrem', 'سودوكريم', 'سودو كريم'],
  ['bigen', 'بيكون', 'بيكن'],
  ['palmers', 'بالمرز'],
  ['st. ives', 'ست ايوز', 'ست ايفز'],
  ['jergens', 'جرجنز', 'جرجينز'],
  ['johnson', 'جونسون'],
  ['arkopharma', 'اركوفارما', 'اركو فارما'],
  ['now foods', 'ناو فودز', 'ناو'],
  ['tocobo', 'توكوبو'],
  ['celimax', 'سيليماكس', 'سيلي ماكس'],
  ['anua', 'انوا', 'أنوا'],
  ['baby joy', 'بيبي جوي'],
  ['kiwi', 'كيوفي', 'كيوي'],
  ['pure beauty', 'بيور بيوتي', 'بيوربيوتي'],
  ['lux', 'لوكس'],
  ['fahatika', 'فاتيكا'],
  ['sunsilk', 'صانسيلك', 'صان سيلك'],
  ['pigeon', 'بيجون'],
  ['farlin', 'فارلين'],
  ['yardley', 'ياردلي'],
  ['ultra doux', 'الترا دوكس'],
  ['avalon', 'افاليون'],
  ['aveeno', 'افيينو', 'افينو', 'افيانو'],
  ['beauty of joseon', 'بيوتي اوف جوسون'],
  ['axis-y', 'اكسيس واي'],
  ['tirtir', 'تيرتير'],
  ['instituto', 'انستيتو'],
  ["i'm sorry for my skin", 'ايم سوري فور ماي سكين'],
  ['ponds', 'بوندس', 'بوندز'],
  ['neutrogena', 'نيتروجينا', 'نتروجينا'],
  ['rimmel', 'ريميل', 'ريمبل'],
  ['eveline', 'ايفلين', 'ايفللين'],
  ['scala', 'سكالا'],
  ['kimphur', 'كيمفور'],
  ['advanced clinicals', 'ادفانسد كلينيكالز'],
  ['lane organic', 'لان اورجانيك'],
  ['equal berry', 'ايكوال بيري'],
  ['doctor althia', 'دكتور الثيا'],
  ['shiglam', 'شيقلام', 'شيغلام'],
  ['uni pro', 'وني برو'],
  ['century', 'سنتري'],
  ['bifiz', 'بايفيز'],
  ['puretto', 'بيوريتو'],
  ['carcyl', 'كارسيل'],
  ['bolver', 'بولفير'],
  ['derma', 'ديرما'],
  ['la belle', 'لابيل', 'لا بيل'],
  ['muove', 'مويف'],
  ['flextol', 'فليكستول'],
  ['bio balance', 'بيو بالانس'],
  ['diva', 'ديفا'],
  ['jayjun', 'جيجون'],
  ['antisa', 'انتيسا'],
  ['isntree', 'ايزنتري'],
  ['emoform', 'ايموفورم'],
  ['tofisd', 'توفيسد'],
  ['skinowl', 'سكينوول'],
  ['skinsomnia', 'سكنسومنيا'],
  ['cc mad', 'سيس سي ميد'],
  ['z getts', 'زي غتس'],
  ['mixon', 'ميكسون'],
  ['solarie', 'سولاري'],
  ['liren', 'ليرين'],
  ['bioxin', 'بيوكسين'],
  ['vashkul', 'فاشكول'],
  ['creolan', 'كريولان'],
  ['hobe labs', 'هوب لابس'],
  ['pretty', 'بريتي', 'بريتتي'],
  ['bears', 'بيرز', 'بييرز'],
  ['minerva', 'مينرفا'],
  ['moroccanoil', 'موروكانويل', 'موروكان اويل'],
  ['tebodont', 'تيبودونت', 'تبودونت'],
  ['ivatherm', 'ايفاثيرم'],
  ['organic shop', 'اورجانيك شوب'],
  ['panthenol plus', 'بانثينول بلس'],
  ['clonise', 'كلونيز'],
  ['toady', 'تودي', 'توداي'],
  ['lucrezia', 'لوكريزيا'],
  ['nalin', 'نالين'],
  ['biotal', 'بيوتال'],
  ['lashen', 'لاشين'],
  ['skin fresh', 'سكين فريش'],
  ['magic man', 'ماجيك من'],
  ['otaci', 'اوتاسي'],
  ['tatto', 'تاتو', 'تاتتو'],
  ['eva', 'ايفا'],
  ['blemil plus', 'بليميل بلس'],
  ['blevit', 'بلفيت', 'بافيت'],
  ['blf', 'بي ال اف'],
  ['body fantasies', 'بودي فانتازي'],
  ['bogenia', 'بوغينيا'],
  ['bonawell', 'بونويل'],
  ['botanic clinic', 'بوتانيك كلينك'],
  ['boulevard paris', 'بوليفارد باريس'],
  ['bubi bubi', 'بوبي بوبي'],
  ['burberry', 'بربري', 'بريبري'],
  ['perfume co', 'بيرفيوم كو'],
  ['puravie', 'بيورافي'],
  ['purederm', 'بيورديرم'],
  ['born winner', 'بورن وينر'],
  ['boucheron', 'بوشيرون'],
  ['paco rabanne', 'باكو رابان'],
  ['topicrem', 'توبي كريم'],
  ['toppik', 'توبيك'],
  ['tropicana', 'تروبيكانا'],
  ['t-rq', 'تي ار كيو'],
  ['tulipan negro', 'توليبان نيجرو'],
  ['tree hut', 'تري هات', 'تري هوت'],
  ['tebramil', 'تبراميل'],
  ['tommee tippee', 'تومي تيبي'],
  ['gerards', 'جيراردس'],
  ['geratherm', 'جيراثيرم'],
  ['gerber', 'جربر'],
  ['givenchy', 'جيفنشي', 'جيفانشي'],
  ['guess', 'جيس'],
  ['jordan', 'جوردن', 'جوردان'],
  ['jowae', 'جواي'],
  ['jasmina', 'جاسمينا'],
  ['jovan', 'جوفان'],
  ['just for men', 'جست فور مين'],
  ['gisou', 'غيسو', 'غيصو'],
  ['meridol', 'ميريدol'],
  ['fino', 'فينو'],
  ['lamour', 'لامور'],
  ['ecoforia', 'ايكوفوريا'],
  ['oilatum', 'اويلاتوم'],
  ['rexsol', 'ريكسول'],
  ['curaprox', 'كيورا بروكس', 'كيورابروكس'],
  ['nunu', 'نونو'],
  ['becutan', 'بيكوتان'],
  ['mixie', 'ميكسي', 'ميكس'],
  ['cloverm', 'كلوفيرم', 'كلوفرم'],
  ['mustela', 'موستيلا'],
  ['titan', 'تايتن', 'تايتان'],
  ['clean & clear', 'كلين اند كلير'],
  ['dermageek', 'ديرما جيك', 'دي جيك'],
  ['hydrafacial', 'هيدرافيشل'],
  ['nicoderm', 'نيكوديرم'],
  ['nicotinelle', 'نيكوتينيل'],
  ['collagen', 'كولاجين'],
  ['biotin', 'بيوتين'],
  ['omega', 'اوميجا'],
  ['vitamin c', 'فيتامين سي'],
  ['vitamin d', 'فيتامين د'],
  ['zinc', 'زنك'],
  ['calcium', 'كالسيوم'],
  ['iron', 'حديد'],
  ['magnesium', 'مغنيسيوم'],
  ['multivitamin', 'ملتي فيتامين'],
  ['retinol', 'ريتينول'],
  ['niacinamide', 'نياسيناميد'],
  ['hyaluronic', 'هيالورونيك'],
  ['salicylic', 'ساليسيليك'],
  ['glycolic', 'جليكوليك'],
  ['vitamin e', 'فيتامين ه'],
  ['vitamin b', 'فيتامين ب'],
  ['arnica', 'ارنيكا'],
  ['ketamine', 'كيتوكونازول'],
  ['tea tree', 'شجره الشاي'],
  ['charcoal', 'فحم'],
  ['aloe vera', 'الوفيرا', 'الويفرا'],
  ['coconut', 'جوز الهند'],
  ['shea butter', 'زبدة الشيا'],
];

// Build lookup: normalized name → canonical slug
const canonicalMap = new Map<string, string>();
const slugToCanonical = new Map<string, string>();

// From catalog brands (loaded externally)
let catalogBrands: BrandEntry[] = [];

export function initBrandResolver(brands: BrandEntry[]) {
  catalogBrands = brands;
  for (const b of brands) {
    const normName = normalizeEn(b.name);
    const normNameAr = normalizeAr(b.nameAr);
    if (normName && !canonicalMap.has(normName)) canonicalMap.set(normName, b.slug);
    if (normNameAr && !canonicalMap.has(normNameAr)) canonicalMap.set(normNameAr, b.slug);
    slugToCanonical.set(b.slug, b.slug);
  }
  for (const group of ALIAS_GROUPS) {
    const canonical = group[0];
    const targetSlug = findSlugForCanonical(canonical);
    if (!targetSlug) continue;
    for (const alias of group) {
      const normAlias = normalizeAr(alias);
      const normAliasEn = normalizeEn(alias);
      if (normAlias && !canonicalMap.has(normAlias)) canonicalMap.set(normAlias, targetSlug);
      if (normAliasEn && !canonicalMap.has(normAliasEn)) canonicalMap.set(normAliasEn, targetSlug);
    }
  }
}

function findSlugForCanonical(canonical: string): string | null {
  const norm = normalizeEn(canonical);
  for (const b of catalogBrands) {
    if (normalizeEn(b.name) === norm || normalizeEn(b.slug) === norm) return b.slug;
  }
  for (const [slug] of slugToCanonical) {
    if (normalizeEn(slug) === norm) return slug;
  }
  return null;
}

function resolveCanonical(raw: string): string | null {
  if (!raw) return null;
  const normAr = normalizeAr(raw);
  const normEn = normalizeEn(raw);
  if (normAr && canonicalMap.has(normAr)) return canonicalMap.get(normAr)!;
  if (normEn && canonicalMap.has(normEn)) return canonicalMap.get(normEn)!;
  // Try partial match (prefix)
  for (const [key, slug] of canonicalMap) {
    if (key.length >= 3 && (normAr.startsWith(key) || key.startsWith(normAr))) return slug;
    if (key.length >= 3 && (normEn.startsWith(key) || key.startsWith(normEn))) return slug;
  }
  return null;
}

export function resolveBrandMatch(rawA: string | null | undefined, rawB: string | null | undefined): BrandMatchResult {
  if (!rawA && !rawB) return { score: null, canonicalA: null, canonicalB: null, rawA: rawA ?? null, rawB: rawB ?? null };
  const canonA = resolveCanonical(rawA ?? '');
  const canonB = resolveCanonical(rawB ?? '');
  if (!canonA && !canonB) return { score: null, canonicalA: null, canonicalB: null, rawA: rawA ?? null, rawB: rawB ?? null };
  if (!canonA || !canonB) return { score: null, canonicalA: canonA, canonicalB: canonB, rawA: rawA ?? null, rawB: rawB ?? null };
  if (canonA === canonB) return { score: 3, canonicalA: canonA, canonicalB: canonB, rawA: rawA ?? null, rawB: rawB ?? null };
  return { score: 0, canonicalA: canonA, canonicalB: canonB, rawA: rawA ?? null, rawB: rawB ?? null };
}

export function extractBrandFromText(text: string): string | null {
  if (!text) return null;
  const norm = normalizeAr(text);
  let bestLen = 0;
  let bestSlug: string | null = null;
  for (const [key, slug] of canonicalMap) {
    if (key.length < 2) continue;
    if (norm.startsWith(key) && key.length > bestLen) {
      bestLen = key.length;
      bestSlug = slug;
    }
  }
  if (bestSlug) return bestSlug;
  for (const [key, slug] of canonicalMap) {
    if (key.length < 3) continue;
    if (norm.includes(key) && key.length > bestLen) {
      bestLen = key.length;
      bestSlug = slug;
    }
  }
  return bestSlug;
}

export function getCanonicalSlug(raw: string): string | null {
  return resolveCanonical(raw);
}
