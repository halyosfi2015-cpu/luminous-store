import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

const dataDir = path.join(root, 'scripts', 'catalog', 'data');
const yaqootUniversePath = path.join(dataDir, 'yaqoot-universe.json');
const classifiedPath = path.join(dataDir, 'classified.json');

console.log('Starting enrichment pipeline...');

// Load data
const universe = JSON.parse(fs.readFileSync(yaqootUniversePath, 'utf8'));
const classified = JSON.parse(fs.readFileSync(classifiedPath, 'utf8'));

// Load existing Luminous products
const src = fs.readFileSync(path.join(root, 'src', 'data', 'products.ts'), 'utf8').replace(/^\uFEFF/, '');
const clean = src
  .replace(/^import type[\s\S]*?from ['"][^'"]+['"];\s*/g, '')
  .replace(/^import[\s\S]*?from ['"][^'"]+['"];\s*/g, '')
  .replace(/export const products: Product\[\]/g, 'export const products')
  .replace(/export const categories: CategoryInfo\[\]/g, 'export const categories')
  .replace(/export const routines: Routine\[\]/g, 'export const routines')
  .split('\nexport function ')[0];
const luminousProducts = eval('(' + clean + ')');

// Build lookup maps
const luminousById = new Map(luminousProducts.map(p => [p.id, p]));
const yaqootById = new Map();
universe.products.forEach((p) => {
  yaqootById.set(p.id, p);
});

// Existing product IDs in Luminous
const existingIds = new Set(luminousProducts.map(p => p.id));

// 1. Process 354 existing products (price fix)
console.log('Processing existing 354 products...');
const priceFixes = [];
const fixedIds = new Set();

luminousProducts.forEach((prod) => {
  const yqId = prod.id.replace('yq-', '');
  const yq = yaqootById.get(yqId);
  if (yq && yq.originalPrice) {
    const currentPrice = prod.pricing.price;
    const yaqootOrig = yq.originalPrice;
    const yaqootSale = yq.salePrice;
    const targetPrice = yaqootOrig - 200;

    if (currentPrice !== targetPrice) {
      priceFixes.push({
        id: prod.id,
        name: prod.name.ar,
        oldPrice: currentPrice,
        yaqootOriginal: yaqootOrig,
        yaqootSale: yaqootSale,
        targetPrice: targetPrice,
        fixed: true
      });
      fixedIds.add(prod.id);
      console.log('  FIXED:', prod.id, 'current:', currentPrice, 'target:', targetPrice);
    }
  }
});

console.log('Price fixes needed:', priceFixes.length);
console.log('Already correct:', luminousProducts.filter(p => p.pricing.price === p.pricing.price).length);

// 2. Process new candidates (2,393)
console.log('Processing', 2393, 'new candidates...');
const newCandidates = classified.filter(c => !existingIds.has(parseInt(c.id, 10)) && c.category !== 'uncategorized');
console.log('New candidates count:', newCandidates.length);

// Classify new candidates
const classifyResult = [];

// Brand normalization map (similar to brands.mjs but with normalization)
const brandMap = {
  'ام سوري فور ماي سكين': { brand: 'أم سوري فور ماي سكين', brandEn: 'I\'m Sorry For My Skin', slug: 'im-sorry-for-my-skin' },
  'لوريال': { brand: 'لوريال', brandEn: 'L\'Oréal Paris', slug: 'loreal-paris' },
  'غارنييه': { brand: 'غارنييه', brandEn: 'Garnier', slug: 'garnier' },
  'ميبلين': { brand: 'ميبلين', brandEn: 'Maybelline New York', slug: 'maybelline' },
  'فيشي': { brand: 'فيشي', brandEn: 'Vichy', slug: 'vichy' },
  'لاروش بوزية': { brand: 'لاروش بوزيه', brandEn: 'La Roche-Posay', slug: 'la-roche-posay' },
  'يوسرين': { brand: 'يوسرين', brandEn: 'Eucerin', slug: 'eucerin' },
  'كيربروست': { brand: 'كيربروست', brandEn: 'Kerastase', slug: 'kerastase' },
  'جونسون': { brand: 'جونسون', brandEn: \"Johnson's\", slug: 'johnsons' },
  'أنوا': { brand: 'أنوا', brandEn: 'Anew', slug: 'anew' },
  'سيرافي': { brand: 'سيرافي', brandEn: 'CeraVe', slug: 'cerave' },
  'سيتافيل': { brand: 'سيتافيل', brandEn: 'Cetaphil', slug: 'cetaphil' },
  'سكين 1004': { brand: 'سكين 1004', brandEn: 'SKIN1004', slug: 'skin1004' },
  'بايوديرما': { brand: 'بايوديرما', brandEn: 'Bioderma', slug: 'bioderma' },
  'فايف': { brand: 'أفين', brandEn: 'Avène', slug: 'avene' },
  'يورياج': { brand: 'يورياج', brandEn: 'Uriage', slug: 'uriage' },
  'سيبا ميد': { brand: 'سيباميد', brandEn: 'Sebamed', slug: 'sebamed' },
  'كوسركس': { brand: 'كوسركس', brandEn: 'COSRX', slug: 'cosrx' },
  'سوم باي مي': { brand: 'سوم باي مي', brandEn: 'Some By Mi', slug: 'some-by-mi' },
  'بيوتي اوف جوسيهون': { brand: 'بيوتي أوف جوسيون', brandEn: 'Beauty of Joseon', slug: 'beauty-of-joseon' },
  'هارو هارو وندر': { brand: 'هارو هارو وندر', brandEn: 'Haruharu Wonder', slug: 'haruharu-wonder' },
  'ان واي اكس': { brand: 'إن واي إكس', brandEn: 'NYX', slug: 'nyx' },
  'نيكس': { brand: 'إن واي إكس', brandEn: 'NYX', slug: 'nyx' },
  'ايتود هاوس': { brand: 'ايتود هاوس', brandEn: 'Etude House', slug: 'etude-house' },
  'لان اورجانيك': { brand: 'لان أورجانيك', brandEn: 'Lane Organic', slug: 'lane-organic' },
  'شانيل': { brand: 'شانيل', brandEn: 'Chanel', slug: 'chanel' },
  'فرزاتشي': { brand: 'فرساتشي', brandEn: 'Versace', slug: 'versace' },
  'دولتشي اند جابانا': { brand: 'دولتشي آند غابانا', brandEn: 'Dolce & Gabbana', slug: 'dolce-gabbana' },
  'لانكوم': { brand: 'لانكوم', brandEn: 'Lancôme', slug: 'lancome' },
  'رالف لورين': { brand: 'رالف لورين', brandEn: 'Ralph Lauren', slug: 'ralph-lauren' },
  'دنهل': { brand: 'دنهل', brandEn: 'Dunhill', slug: 'dunhill' },
  'استي لودر': { brand: 'استي لودر', brandEn: 'Estée Lauder', slug: 'estee-lauder' },
  'أريج': { brand: 'أريج', brandEn: 'Areej', slug: 'areej' },
  'اجمل': { brand: 'أجمل', brandEn: 'Ajmal', slug: 'ajmal' },
  'عساف': { brand: 'عساف', brandEn: 'Asaff', slug: 'asaff' },
  'إبراهيم القرشي': { brand: 'إبراهيم القرشي', brandEn: 'Ibrahim Al Qurashi', slug: 'ibrahim-alqurashi' },
  'عبد الصمد القرشي': { brand: 'عبد الصمد القرشي', brandEn: 'Abdul Samad Al Qurashi', slug: 'abdul-samad-alqurashi' },
  'لافيرن': { brand: 'لافيرن', brandEn: 'Laverne', slug: 'laverne' },
  'محمود سعيد': { brand: 'محمود سعيد', brandEn: 'Mahmoud Saeed', slug: 'mahmoud-saeed' },
  'الرصاصي': { brand: 'الرصاصي', brandEn: 'Al Rasasi', slug: 'al-rasasi' },
  'صنسيت كافيه': { brand: 'صنسيت كافيه', brandEn: 'Sunset Cafe', slug: 'sunset-cafe' },
  'بنش': { brand: 'بنش', brandEn: 'Bench', slug: 'bench' },
  'بينش': { brand: 'بنش', brandEn: 'Bench', slug: 'bench' },
  'ماك': { brand: 'ماك', brandEn: 'MAC', slug: 'mac' },
  'ميك اب فور ايفر': { brand: 'ميك أب فور إيفر', brandEn: 'Make Up For Ever', slug: 'make-up-for-ever' },
  'برجوا': { brand: 'بورجوا', brandEn: 'Bourjois', slug: 'bourjois' },
  'ريميل': { brand: 'ريميل', brandEn: 'Rimmel', slug: 'rimmel' },
  'ريمل لندن': { brand: 'ريميل', brandEn: 'Rimmel London', slug: 'rimmel' },
  'ريفلون': { brand: 'ريفلون', brandEn: 'Revlon', slug: 'revlon' },
  'ريفلوشن': { brand: 'ريفلوشن', brandEn: 'Revolution', slug: 'revolution' },
  'ريفولوشن': { brand: 'ريفلوشن', brandEn: 'Revolution', slug: 'revolution' },
  'بنفت': { brand: 'بنفت', brandEn: 'Benefit', slug: 'benefit' },
  'تارت': { brand: 'تارت', brandEn: 'Tarte', slug: 'tarte' },
  'ايسنس': { brand: 'ايسنس', brandEn: 'Essence', slug: 'essence' },
  'لوكا': { brand: 'لوكا', brandEn: 'Loca', slug: 'loca' },
  'فلورمار': { brand: 'فلورمار', brandEn: 'Flormar', slug: 'flormar' },
  'ايلف': { brand: 'ايلف', brandEn: 'e.l.f.', slug: 'elf' },
  'ذا ايلف': { brand: 'ايلف', brandEn: 'e.l.f.', slug: 'elf' },
  'شيقلام': { brand: 'شيقلام', brandEn: 'Shiglam', slug: 'shiglam' },
  'سيفورا': { brand: 'سيفورا', brandEn: 'Sephora', slug: 'sephora' },
  'انجلوت': { brand: 'انجلوت', brandEn: 'Inclot', slug: 'inclot' },
  'نيفيا': { brand: 'نيفيا', brandEn: 'Nivea', slug: 'nivea' },
  'دوف': { brand: 'دوف', brandEn: 'Dove', slug: 'dove' },
  'اولاي': { brand: 'أولاي', brandEn: 'Olay', slug: 'olay' },
  'فازلين': { brand: 'فازلين', brandEn: 'Vaseline', slug: 'vaseline' },
  'بالمرز': { brand: 'بالمرز', brandEn: 'Palmer\'s', slug: 'palmers' },
  'بيزلين': { brand: 'بيزلين', brandEn: 'Beesline', slug: 'beesline' },
  'سانت ايفز': { brand: 'سانت آيفز', brandEn: 'St. Ives', slug: 'st-ives' },
  'سكالا': { brand: 'سكالا', brandEn: 'Scala', slug: 'scala' },
  'انيرجي': { brand: 'إنرجي', brandEn: 'Energy', slug: 'energy' },
  'وهج كير': { brand: 'وهج كير', brandEn: 'Wahaj Care', slug: 'wahaj-care' },
  'لايف بوي': { brand: 'لايف بوي', brandEn: 'Lifebuoy', slug: 'lifebuoy' },
  'فيم فريش': { brand: 'فيم فريش', brandEn: 'Femfresh', slug: 'femfresh' },
  'لوكس': { brand: 'لوكس', brandEn: 'Lux', slug: 'lux' },
  'دوف': { brand: 'دوف', brandEn: 'Dove', slug: 'dove' },
  'بانتين': { brand: 'بانتين', brandEn: 'Pantene', slug: 'pantene' },
  'هيربال': { brand: 'هيربال إيسنسز', brandEn: 'Herbal Essences', slug: 'herbal-essences' },
  'تريسمي': { brand: 'تريسمي', brandEn: 'TRESemmé', slug: 'tresemme' },
  'اولا هير': { brand: 'أولابلكس', brandEn: 'Olaplex', slug: 'olaplex' },
  'اولابليكس': { brand: 'أولابلكس', brandEn: 'Olaplex', slug: 'olaplex' },
  'شيسيدو': { brand: 'شيسيدو', brandEn: 'Shiseido', slug: 'shiseido' },
  'شيدا': { brand: 'شيسيدو', brandEn: 'Shiseido', slug: 'shiseido' },
  'ويلا': { brand: 'ويلا', brandEn: 'Wella', slug: 'wella' },
  'باراشوت': { brand: 'باراشوت', brandEn: 'Parachute', slug: 'parachute' },
  'دابر املا': { brand: 'دابر املا', brandEn: 'Dabur Amla', slug: 'dabur-amla' },
  'دابر': { brand: 'دابر', brandEn: 'Dabur', slug: 'dabur' },
  'موروكان اويل': { brand: 'موروكان أويل', brandEn: 'Moroccanoil', slug: 'moroccanoil' },
  'كوكو كير': { brand: 'كوكو كير', brandEn: 'Coco Care', slug: 'coco-care' },
  'انتيسا': { brand: 'انتيسا', brandEn: 'Antisa', slug: 'antisa' },
  'ريجين': { brand: 'ريجين', brandEn: 'Regen', slug: 'regen' },
  'افلون': { brand: 'افلون', brandEn: 'Avalon', slug: 'avalon' },
  'اوفالون': { brand: 'أفالون', brandEn: 'Avalon', slug: 'avalon' },
  'او جي اكس': { brand: 'أو جي إكس', brandEn: 'OGX', slug: 'ogx' },
  'هيرجرو': { brand: 'هيرجرو', brandEn: 'HairGrow', slug: 'hairgrow' },
  'سيبوري': { brand: 'سيبوري', brandEn: 'Cibori', slug: 'cibori' },
  'مويف': { brand: 'مويف', brandEn: 'Muove', slug: 'muove' },
  'اكيور': { brand: 'اكيور', brandEn: 'Acure', slug: 'acure' },
  'جولين': { brand: 'جولين', brandEn: 'Jolen', slug: 'jolen' },
  'كولجيت': { brand: 'كولجيت', brandEn: 'Colgate', slug: 'colgate' },
  'كرست': { brand: 'كرست', brandEn: 'Crest', slug: 'crest' },
  'سنسوداين': { brand: 'سنسوداين', brandEn: 'Sensodyne', slug: 'sensodyne' },
  'اورال بي': { brand: 'أورال-بي', brandEn: 'Oral-B', slug: 'oral-b' },
  'اورال بى': { brand: 'أورال-بي', brandEn: 'Oral-B', slug: 'oral-b' },
  'ليسترين': { brand: 'ليسترين', brandEn: 'Listerine', slug: 'listerine' },
  'ثيرابريث': { brand: 'ثيرابريث', brandEn: 'TheraBreath', slug: 'therabreath' },
  'بردونتكس': { brand: 'بارودونتكس', brandEn: 'Parodontax', slug: 'parodontax' },
  'بارودونتاكس': { brand: 'بارودونتكس', brandEn: 'Parodontax', slug: 'parodontax' },
  'ناو': { brand: 'ناو', brandEn: 'NOW Foods', slug: 'now-foods' },
  'ناترول': { brand: 'ناترول', brandEn: 'Natrol', slug: 'natrol' },
  'كاليفورنيا غولد نيوتريشن': { brand: 'كاليفورنيا غولد نيوتريشن', brandEn: 'California Gold Nutrition', slug: 'california-gold-nutrition' },
  'سولغار': { brand: 'سولغار', brandEn: 'Solgar', slug: 'solgar' },
  'سنتروم': { brand: 'سنتروم', brandEn: 'Centrum', slug: 'centrum' },
  'جاميسون': { brand: 'جاميسون', brandEn: 'Jamieson', slug: 'jamieson' },
  'دكتورز بيست': { brand: 'دكتورز بيست', brandEn: 'Doctor\'s Best', slug: 'doctors-best' },
  'كونتري لايف': { brand: 'كونتري لايف', brandEn: 'Country Life', slug: 'country-life' },
  'سوانسون': { brand: 'سوانسون', brandEn: 'Swanson', slug: 'swanson' },
  'فيتال بروتينز': { brand: 'فيتال بروتينز', brandEn: 'Vital Proteins', slug: 'vital-proteins' },
  'فيتابير': { brand: 'فيتابير', brandEn: 'Vitabears', slug: 'vitabears' },
  'فيتانيس ناتشرز': { brand: 'فيتانيس ناتشرز', brandEn: 'Vitanis Naturals', slug: 'vitanis-naturals' },
  'نيتشرز باونتي': { brand: 'نيتشرز باونتي', brandEn: 'Nature\'s Bounty', slug: 'natures-bounty' },
  'نيتشرز واى': { brand: 'نيتشرز واى', brandEn: 'Nature\'s Way', slug: 'natures-way' },
  'ناتشرز واى': { brand: 'نيتشرز واى', brandEn: 'Nature\'s Way', slug: 'natures-way' },
  'ناتشرز انسر': { brand: 'ناتشرز انسر', brandEn: 'Nature\'s Answer', slug: 'natures-answer' },
  'ناتشرز تروث': { brand: 'ناتشرز تروث', brandEn: 'Nature\'s Truth', slug: 'natures-truth' },
  'ناتشرز تروث ': { brand: 'ناتشرز تروث', brandEn: 'Nature\'s Truth', slug: 'natures-truth' },
  'ناتشرز تروث‏': { brand: 'ناتشرز تروث', brandEn: 'Nature\'s Truth', slug: 'natures-truth' },
  'ناتشورال': { brand: 'ناتشورال', brandEn: 'Natural', slug: 'natural' },
  'كارلسون': { brand: 'كارلسون', brandEn: 'Carlson', slug: 'carlson' },
  'دكتور ميلاكسين': { brand: 'دكتور ميلاكسين', brandEn: 'Dr. Melaxin', slug: 'dr-melaxin' },
  'جمالك': { brand: 'جمالك', brandEn: 'Jamalik', slug: 'jamalik' },
  'سينتري 21': { brand: 'سينتري 21', brandEn: 'Century 21', slug: 'century-21' },
  'سينتري': { brand: 'سينتري 21', brandEn: 'Century 21', slug: 'century-21' },
  'سكين فود': { brand: 'سكين فود', brandEn: 'Skin Food', slug: 'skin-food' },
  'ريكسونا': { brand: 'ريكسونا', brandEn: 'Rexona', slug: 'rexona' },
  'سيكرت': { brand: 'سيكرت', brandEn: 'Secret', slug: 'secret' },
  'سيكريت': { brand: 'سيكرت', brandEn: 'Secret', slug: 'secret' },
  'اولد سبايس': { brand: 'أولد سبايس', brandEn: 'Old Spice', slug: 'old-spice' },
  'سودوكريم': { brand: 'سودوكريم', brandEn: 'Sudocrem', slug: 'sudocrem' },
  'بيبانثين': { brand: 'بيبانثين', brandEn: 'Bepanthen', slug: 'bepanthen' },
  'جليسوليد': { brand: 'جليسوليد', brandEn: 'Glysolid', slug: 'glysolid' },
  'نومبوزين': { brand: 'نومبوزين', brandEn: 'Numbuzin', slug: 'numbuzin' },
  'شيا مويستر': { brand: 'شيا مويستر', brandEn: 'SheaMoisture', slug: 'sheamoisture' },
  'شيا مويستشر': { brand: 'شيا مويستر', brandEn: 'SheaMoisture', slug: 'sheamoisture' },
  'شيا مويستر ': { brand: 'شيا مويستر', brandEn: 'SheaMoisture', slug: 'sheamoisture' },
  'شيا مويستر‏': { brand: 'شيا مويستر', brandEn: 'SheaMoisture', slug: 'sheamoisture' },
  'اريان': { brand: 'اريان', brandEn: 'Aryan', slug: 'aryan' },
  'فوريفر': { brand: 'فوريفر', brandEn: 'Forever', slug: 'forever' },
  'براون': { brand: 'براون', brandEn: 'Braun', slug: 'braun' },
  'جولدن روز': { brand: 'جولدن روز', brandEn: 'Golden Rose', slug: 'golden-rose' },
  'كيو في': { brand: 'كيو في', brandEn: 'QV', slug: 'qv' },
  'كيوفي': { brand: 'كيو في', brandEn: 'QV', slug: 'qv' },
  'سول دي جانيرو': { brand: 'سول دي جانيرو', brandEn: 'Sol de Janeiro', slug: 'sol-de-janeiro' },
  'باث اند بودي': { brand: 'باث آند بودي وركس', brandEn: 'Bath & Body Works', slug: 'bath-body-works' },
  'باث اند بودير': { brand: 'باث آند بودي وركس', brandEn: 'Bath & Body Works', slug: 'bath-body-works' },
  'ماري اند ماي': { brand: 'ماري آند ماي', brandEn: 'Mary & May', slug: 'mary-may' },
  'ماري روث': { brand: 'ماري روث', brandEn: 'Mary Ruth', slug: 'mary-ruth' },
  'أكسيس واي': { brand: 'أكسيس واي', brandEn: 'Access W', slug: 'access-w' },
  'اكسيس واي': { brand: 'أكسيس واي', brandEn: 'Access W', slug: 'access-w' },
  'ام سوري فور ماي سكين': { brand: 'أم سوري فور ماي سكين', brandEn: 'I\'m Sorry For My Skin', slug: 'im-sorry-for-my-skin' },
  'ام سوري فور ماي سكن': { brand: 'أم سوري فور ماي سكين', brandEn: 'I\'m Sorry For My Skin', slug: 'im-sorry-for-my-skin' },
  'اي سي ام': { brand: 'آي سي إم', brandEn: 'ICM', slug: 'icm' },
  'أي سي إم': { brand: 'آي سي إم', brandEn: 'ICM', slug: 'icm' },
  'ايس سي ام': { brand: 'آي سي إم', brandEn: 'ICM', slug: 'icm' },
  'ديرما': { brand: 'ديرما', brandEn: 'Derma', slug: 'derma' },
  'فارماسيريز': { brand: 'فارماسيريز', brandEn: 'Pharmaceris', slug: 'pharmaceris' },
  'فارماسيرز': { brand: 'فارماسيريز', brandEn: 'Pharmaceris', slug: 'pharmaceris' },
  'فارم ستاي': { brand: 'فارم ستاي', brandEn: 'Farm Stay', slug: 'farm-stay' },
  'فارم ستي': { brand: 'فارم ستاي', brandEn: 'Farm Stay', slug: 'farm-stay' },
  'لي ستافورد': { brand: 'لي ستافورد', brandEn: 'Lee Stafford', slug: 'lee-stafford' },
  'سنتروم': { brand: 'سنتروم', brandEn: 'Centrum', slug: 'centrum' },
  'ميدي كوب': { brand: 'ميديكيوب', brandEn: 'Medicube', slug: 'medicube' },
  'ميديكيوب': { brand: 'ميديكيوب', brandEn: 'Medicube', slug: 'medicube' },
  'ميديكوب': { brand: 'ميديكيوب', brandEn: 'Medicube', slug: 'medicube' },
  'ميديكيوب': { brand: 'ميديكيوب', brandEn: 'Medicube', slug: 'medicube' },
  'دكتور الثيا': { brand: 'دكتور الثيا', brandEn: 'Doctor Althia', slug: 'doctor-althia' },
  'كاميل': { brand: 'كاميل', brandEn: 'Camel', slug: 'camel' },
  'بيتز': { brand: 'بيتز', brandEn: 'Pets', slug: 'pets' },
  'صانسيلك': { brand: 'صانسيلك', brandEn: 'Sunsilk', slug: 'sunsilk' },
  'اريال': { brand: 'اريال', brandEn: 'Ariel', slug: 'ariel' },
  'وادي النحل': { brand: 'وادي النحل', brandEn: 'Wadi Alnahl', slug: 'wadi-alnahl' },
  'مكس أب': { brand: 'ميكس أب', brandEn: 'Mix Up', slug: 'mix-up' },
  'ميكسا': { brand: 'ميكسا', brandEn: 'Mexa', slug: 'mexa' },
  'ميشا': { brand: 'ميشا', brandEn: 'Missha', slug: 'missha' },
  'نيتروجينا': { brand: 'نيتروجينا', brandEn: 'Neutrogena', slug: 'neutrogena' },
  'نتروجينا': { brand: 'نيتروجينا', brandEn: 'Neutrogena', slug: 'neutrogena' },
  'نيتروجينا،': { brand: 'نيتروجينا', brandEn: 'Neutrogena', slug: 'neutrogena' },
  'سيتافيل': { brand: 'سيتافيل', brandEn: 'Cetaphil', slug: 'cetaphil' },
  'بيكسي': { brand: 'بيكسي', brandEn: 'Pixi', slug: 'pixi' },
  'ذا اورديناري': { brand: 'ذا اورديناري', brandEn: 'The Ordinary', slug: 'the-ordinary' },
  'ذاورديناري': { brand: 'ذا اورديناري', brandEn: 'The Ordinary', slug: 'the-ordinary' },
  'ذا بالم': { brand: 'ذا بالم', brandEn: 'The Balm', slug: 'the-balm' },
  'سكنسومنيا': { brand: 'سكنسومنيا', brandEn: 'SkinSoMnia', slug: 'skinsomnia' },
  'فيو بلس': { brand: 'فيو بلس', brandEn: 'View Plus', slug: 'view-plus' },
  'نيو بلس': { brand: 'نيو بلس', brandEn: 'New Plus', slug: 'new-plus' },
  'ايكوال بيري': { brand: 'ايكوال بيري', brandEn: 'Equal Berry', slug: 'equal-berry' },
  'ايموفورم': { brand: 'ايموفورم', brandEn: 'Aimofrom', slug: 'aimofrom' },
  'ايزينتري': { brand: 'ايزينتري', brandEn: 'Escentri', slug: 'escentri' },
  'اي بي ناتشورالز': { brand: 'اي بي ناتشورالز', brandEn: 'AP Naturals', slug: 'ap-naturals' },
  'ايه بي ناتشورالز': { brand: 'اي بي ناتشورالز', brandEn: 'AP Naturals', slug: 'ap-naturals' },
  'ديرم أكتيف': { brand: 'ديرم أكتيف', brandEn: 'Derm Active', slug: 'derm-active' },
  'نيوتريديرم': { brand: 'نيوتريديرم', brandEn: 'NeutriDerm', slug: 'neutriderm' },
  'فيفيسكال': { brand: 'فيفيسكال', brandEn: 'Viviscal', slug: 'viviscal' },
  'اوبتيمال': { brand: 'اوبتيمال', brandEn: 'Optimal', slug: 'optimal' },
  'ارجفيت': { brand: 'ارجفيت', brandEn: 'Argavit', slug: 'argavit' },
  'بيوكسين': { brand: 'بيوكسين', brandEn: 'BioXin', slug: 'bioxin' },
  'فاشكول': { brand: 'فاشكول', brandEn: 'Vashkul', slug: 'vashkul' },
  'توكوبو': { brand: 'توكوبو', brandEn: 'Tokobo', slug: 'tokobo' },
  'افريكاز بست': { brand: 'افريكاز بست', brandEn: 'Africas Best', slug: 'africas-best' },
  'كانتو': { brand: 'كانتو', brandEn: 'Cantu', slug: 'cantu' },
  'لاكمي': { brand: 'لاكمي', brandEn: 'Lakmé', slug: 'lakme' },
  'بيوريتو': { brand: 'بيوريتو', brandEn: 'Puretto', slug: 'puretto' },
  'بيبير منتس': { brand: 'بيبير منتس', brandEn: 'Pepper & Mints', slug: 'pepper-mints' },
  'بيبير منتسل': { brand: 'بيبير منتس', brandEn: 'Pepper & Mints', slug: 'pepper-mints' },
  'كرست': { brand: 'كرست', brandEn: 'Crest', slug: 'crest' },
  'كريم كاب': { brand: 'كريم كاب', brandEn: 'Cream Cap', slug: 'cream-cap' },
  'بيبي ليس': { brand: 'بيبي ليس', brandEn: 'Babyliss', slug: 'babyliss' },
  'روز أروما': { brand: 'روز أروما', brandEn: 'Rose Aroma', slug: 'rose-aroma' },
  'تنج برش': { brand: 'تنج برش', brandEn: 'Tongue Brush', slug: 'tongue-brush' },
  'تانج برش': { brand: 'تنج برش', brandEn: 'Tongue Brush', slug: 'tongue-brush' },
  'ايكو تولز': { brand: 'ايكو تولز', brandEn: 'EcoTools', slug: 'ecotools' },
  'ريل تكنيك': { brand: 'ريل تكنيك', brandEn: 'Real Techniques', slug: 'real-techniques' },
  'ريال تكنك': { brand: 'ريل تكنيك', brandEn: 'Real Techniques', slug: 'real-techniques' },
  'ليدي سبيد ستيك': { brand: 'ليدي سبيد ستيك', brandEn: 'Lady Speed Stick', slug: 'lady-speed-stick' },
  'ميبو': { brand: 'ميبو', brandEn: 'MEBO', slug: 'mebo' },
  'سودوكريم': { brand: 'سودوكريم', brandEn: 'Sudocrem', slug: 'sudocrem' },
  'كيربروست': { brand: 'كيربروست', brandEn: 'Kerastase', slug: 'kerastase' },
  'ديبيوردينت': { brand: 'ديبيوردينت', brandEn: 'Dabur Dent', slug: 'dabur-dent' },
  'فنياني': { brand: 'فنياني', brandEn: 'Finiani', slug: 'finiani' },
  'ايلدن': { brand: 'ايلدن', brandEn: 'Elden', slug: 'elden' },
  'سيسديرما': { brand: 'سيسديرما', brandEn: 'Sesderma', slug: 'sesderma' },
  'مارفيس': { brand: 'مارفيس', brandEn: 'Marvis', slug: 'marvis' },
  'كامبلي': { brand: 'كامبلي', brandEn: 'Kampli', slug: 'kampli' },
  'فيتابير': { brand: 'فيتابير', brandEn: 'Vitabears', slug: 'vitabears' },
  'مايلد باي ناتشور ': { brand: 'مايلد باي ناتشور', brandEn: 'Mild By Nature', slug: 'mild-by-nature' },
  'مايلد باي ناتشور': { brand: 'مايلد باي ناتشور', brandEn: 'Mild By Nature', slug: 'mild-by-nature' },
  'مايلد باي ناتشور‏': { brand: 'مايلد باي ناتشور', brandEn: 'Mild By Nature', slug: 'mild-by-nature' },
  'نيوسيل': { brand: 'نيوسيل', brandEn: 'Neocell', slug: 'neocell' },
  'ايفلين': { brand: 'ايفلين', brandEn: 'Eveline', slug: 'eveline' },
  'إيفلين': { brand: 'ايفلين', brandEn: 'Eveline', slug: 'eveline' },
  'ميديكيوب': { brand: 'ميديكيوب', brandEn: 'Medicube', slug: 'medicube' },
  'ايسكينول': { brand: 'ايسكينول', brandEn: 'SkinOwl', slug: 'skinowl' },
  'اوفرا': { brand: 'اوفرا', brandEn: 'Ofera', slug: 'ofera' },
  'سارا': { brand: 'سارا', brandEn: 'Sara', slug: 'sara' },
  'انوار': { brand: 'انوار', brandEn: 'Anwar', slug: 'anwar' },
  'هيماني': { brand: 'هيماني', brandEn: 'Hemani', slug: 'hemani' },
  'الماس': { brand: 'الماس', brandEn: 'Almas', slug: 'almas' },
  'امبير': { brand: 'امبير', brandEn: 'Amber', slug: 'amber' },
  'فير ليدي': { brand: 'فير ليدي', brandEn: 'Fair Lady', slug: 'fair-lady' },
  'من فير ليدي': { brand: 'فير ليدي', brandEn: 'Fair Lady', slug: 'fair-lady' },
  'توفيسد': { brand: 'توفيسد', brandEn: 'Tofisd', slug: 'tofisd' },
  'الخزامى': { brand: 'الخزامى', brandEn: 'Lavender', slug: 'lavender' },
  'كريستين': { brand: 'كريستين', brandEn: 'Christine', slug: 'christine' },
  'ميلي': { brand: 'ميلي', brandEn: 'Milay', slug: 'milay' },
  'دي لا كروز': { brand: 'دي لا كروز', brandEn: 'De La Cruz', slug: 'de-la-cruz' },
  'تري هت': { brand: 'تري هت', brandEn: 'Tree Hut', slug: 'tree-hut' },
  'سول دي جانيرو': { brand: 'سول دي جانيرو', brandEn: 'Sol de Janeiro', slug: 'sol-de-janeiro' },
  'فيلورجا': { brand: 'فيلورجا', brandEn: 'Filorga', slug: 'filorga' },
  'امبريوليس': { brand: 'امبريوليس', brandEn: 'Embryolisse', slug: 'embryolisse' },
  'اريان': { brand: 'اريان', brandEn: 'Aryan', slug: 'aryan' },
  'فوكس': { brand: 'فوكس', brandEn: 'Fox', slug: 'fox' },
  'بيجي': { brand: 'بيجي', brandEn: 'Pegee', slug: 'pegee' },
  'بريتي': { brand: 'بريتي', brandEn: 'Pretty', slug: 'pretty' },
  'ليتل بيبي': { brand: 'ليتل بيبي', brandEn: 'Little Baby', slug: 'little-baby' },
  'مومز باث': { brand: 'مومز باث', brandEn: 'Mom\'s Bath', slug: 'moms-bath' },
  'افينو': { brand: 'أفينو', brandEn: 'Aveeno', slug: 'aveeno' },
  'نوبيان هيريتج': { brand: 'نوبيان هيريتج', brandEn: 'Nubian Heritage', slug: 'nubian-heritage' },
  'سكينورين': { brand: 'سكينورين', brandEn: 'Skinoren', slug: 'skinoren' },
  'بانثينول بلس': { brand: 'بانثينول بلس', brandEn: 'Panthenol Plus', slug: 'panthenol-plus' },
  'باولاز تشويس': { brand: 'باولاز تشويس', brandEn: 'Paula\'s Choice', slug: 'paulas-choice' },
  'باولاز': { brand: 'باولاز تشويس', brandEn: 'Paula\'s Choice', slug: 'paulas-choice' },
  'ايليشاكوي': { brand: 'ايليشاكوي', brandEn: 'Elishacoy', slug: 'elishacoy' },
  'بيورسكين': { brand: 'بيورسكين', brandEn: 'Pure Skin', slug: 'pure-skin' },
  'أوركس': { brand: 'أوركس', brandEn: 'Orex', slug: 'orex' },
  'فاني كريم': { brand: 'فاني كريم', brandEn: 'Vanis Cream', slug: 'vanis-cream' },
  'ذا فيس شوب': { brand: 'ذا فيس شوب', brandEn: 'The Face Shop', slug: 'the-face-shop' },
  'نيتشر ريببلك': { brand: 'نيتشر ريببلك', brandEn: 'Nature Republic', slug: 'nature-republic' },
  'ناتشر ريببلك': { brand: 'نيتشر ريببلك', brandEn: 'Nature Republic', slug: 'nature-republic' },
  'كيلز': { brand: 'كيلز', brandEn: 'Kiehl\'s', slug: 'kiehls' },
  'فلامينجو': { brand: 'فلامينجو', brandEn: 'Flamingo', slug: 'flamingo' },
  'ايتود هاوس': { brand: 'ايتود هاوس', brandEn: 'Etude House', slug: 'etude-house' },
  'سام باي مي': { brand: 'سوم باي مي', brandEn: 'Some By Mi', slug: 'some-by-mi' },
  'ستيكس': { brand: 'ستيكس', brandEn: 'Stickes', slug: 'stickes' },
  'غودال': { brand: 'غودال', brandEn: 'Godall', slug: 'godall' },
  'جي كوزمك': { brand: 'جي كوزمك', brandEn: 'G Cosmetic', slug: 'g-cosmetic' },
  'ميكسون': { brand: 'ميكسون', brandEn: 'MixOn', slug: 'mixon' },
  'شيك انتيوشن': { brand: 'شيك انتيوشن', brandEn: 'Shik Intuition', slug: 'shik-intuition' },
  'ماشينزا': { brand: 'ماشينزا', brandEn: 'Mashenza', slug: 'mashenza' },
  'كيمفور': { brand: 'كيمفور', brandEn: 'Kimphur', slug: 'kimphur' },
  'ماركة غير محددة': { brand: 'ماركة غير محددة', brandEn: 'Generic', slug: 'generic' },
  'يوني برو': { brand: 'يوني برو', brandEn: 'Uni Pro', slug: 'uni-pro' },
  'نيو بلس': { brand: 'نيو بلس', brandEn: 'New Plus', slug: 'new-plus' },
  'بروتوكول': { brand: 'بروتوكول', brandEn: 'Protocol', slug: 'protocol' },
  'سكين 1004': { brand: 'سكين 1004', brandEn: 'SKIN1004', slug: 'skin1004' },
};

// Process new candidates
console.log('Processing', newCandidates.length, 'new candidates...');
const enriched = [];
const stats = { total: newCandidates.length, approved: 0, held: 0, rejected: 0, duplicates: 0, new: 0 };

newCandidates.forEach((candidate, index) => {
  const yqId = parseInt(candidate.id, 10);
  const yq = yaqootById.get(yqId);

  if (!yq) {
    stats.rejected++;
    return;
  }

  // Category mapping
  const section = yq.sections ? yq.sections[0] : null;
  let category = 'uncategorized';
  try {
    const sectionNum = parseInt(section, 10);
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
    const matchedCat = catMap[sectionNum] || 'uncategorized';
    category = matchedCat;
  } catch (e) {
    category = 'uncategorized';
  }

  // Brand normalization
  let brandName = yq.brand;
  let brandEn = '';
  let brandSlug = '';

  if (brandMap[brandName]) {
    const mapped = brandMap[brandName];
    brandName = mapped.brand;
    brandEn = mapped.brandEn;
    brandSlug = mapped.slug;
  }

  // Check for duplicates
  const isDuplicate = enriched.some(e => e.brand === brandName && e.title === yq.title);

  // Price calculation: original - 200 YER
  const originalPrice = yq.originalPrice || yq.salePrice;
  const salePrice = yq.salePrice || originalPrice;
  const luminousPrice = Math.max(1, originalPrice - 200);

  // Generate product-specific content
  const description = generateDescription(yq, category, brandName);
  const benefits = generateBenefits(yq, category, brandName);
  const usage = generateUsage(yq, category);
  const ingredients = generateIngredients(yq, category, brandName);
  const attributes = generateAttributes(yq, category, brandName);

  const product = {
    id: 'yq-' + yqId,
    slug: 'yq-' + yqId,
    sku: yq.sku || null,
    brand: brandName || 'غير معروف',
    brandAr: brandName,
    brandEn: brandEn,
    brandSlug: brandSlug || '',
    category: category,
    categoryAr: category.charAt(0).toUpperCase() + category.slice(1),
    categorySlug: category,
    name: {
      ar: yq.title || '',
      en: yq.title || ''
    },
    description: {
      ar: description.ar,
      en: description.en
    },
    usageInstructions: {
      ar: usage.ar,
      en: usage.en
    },
    howToUse: usage.ar.split('. ').filter(s => s.length > 3),
    howToUseAr: usage.ar.split('. ').filter(s => s.length > 3),
    ingredients: {
      ar: ingredients.ar,
      en: ingredients.en
    },
    benefits: {
      ar: benefits.ar,
      en: benefits.en
    },
    skinTypes: yq.contact || [],
    suitableFor: yq.contact || [],
    skinConcerns: yq.contact || [],
    attributes: {
      ar: attributes.ar,
      en: attributes.en
    },
    pricing: {
      price: luminousPrice,
      currency: 'YER',
      originalPrice: originalPrice,
      salePrice: salePrice
    },
    gallery: yq.gallery || [],
    image: yq.image || '',
    ogImage: yq.ogImage || '',
    originalPrice: originalPrice,
    salePrice: salePrice,
    salePercent: yq.salePercent || 0,
    sizeLabel: yq.sizeLabel || null,
    stock: yq.stock || 0,
    inStock: yq.inStock === false ? false : true,
    stockQuantity: yq.stock || 0,
    rating: yq.rating || 0,
    reviewCount: yq.reviewCount || 0,
    isNew: false,
    isBestSeller: false,
    isFeatured: false,
    isDoctorRecommended: false,
    tags: [yq.category || 'Uncategorized'],
    seoMetadata: {
      title: {
        ar: yq.title || '',
        en: yq.title || ''
      },
      description: {
        ar: description.ar,
        en: description.en
      },
      keywords: [yq.category || '', 'beauty', 'skincare']
    },
    sections: yq.sections || [],
    originalPrice: originalPrice,
    salePrice: salePrice,
    salePercent: yq.salePercent || 0,
  };

  enriched.push(product);
  stats.new++;
});

// Write enriched data
fs.writeFileSync(path.join(dataDir, 'enriched-catalog.json'), JSON.stringify({ products: enriched }, null, 2));
console.log('Enriched', enriched.length, 'products');
console.log('Stats:', JSON.stringify(stats));
