/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Catalog Expansion Batch 1 — add the 4 verified READY_TO_ADD products.
 * Full Luminous schema, Yaqoot live price/image/id-link, verified-facts content.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ROOT = process.cwd();

function loadPart(i) {
  const file = `src/data/products-part-0${i}.ts`;
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  return { file, src, start: src.indexOf("["), end: src.lastIndexOf("]") };
}
function parsePart(p) { return JSON.parse(p.src.slice(p.start, p.end + 1)); }

const parts = [];
for (let i = 1; i <= 8; i++) parts.push(loadPart(i));
const catalog = [];
for (const p of parts) catalog.push(...parsePart(p));
const TOTAL_BEFORE = catalog.length;

/* ── snapshot ─────────────────────────────────────────── */
const NOW = new Date().toISOString();
const idsSorted = catalog.map((p) => p.id).sort();
const snapshot = {
  capturedAt: NOW,
  total: catalog.length,
  idsSha256: crypto.createHash("sha256").update(idsSorted.join("|")).digest("hex"),
  protectedById: Object.fromEntries(catalog.map((p) => [p.id, {
    sku: p.sku, price: p.pricing.price, brand: p.brand,
    categorySlug: p.categorySlug, gallery0: p.gallery?.[0], nameEn: p.name.en,
  }])),
};
fs.mkdirSync(path.join(ROOT, "market-data"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "market-data/pre-expansion-snapshot.json"), JSON.stringify(snapshot, null, 1), "utf8");
console.log("SNAPSHOT:", snapshot.total, "products |", snapshot.idsSha256.slice(0, 16));

/* ── collision check ──────────────────────────────────── */
const existingIds = new Set(catalog.map((p) => p.id));
const NEW_IDS = ["yq-2798", "yq-2799", "yq-2800", "yq-2801"];
if (NEW_IDS.some((id) => existingIds.has(id))) throw new Error("ID COLLISION");

/* ── new products ─────────────────────────────────────── */
const IMG = {
  yq2758: null, yq1356: null, yq1296: null, yq1026: null,
};
/* pull image urls from strategic audit */
const strat = JSON.parse(fs.readFileSync(path.join(ROOT, "market-data/strategic-brands-audit.json"), "utf8"));
for (const [, data] of Object.entries(strat.brands)) {
  for (const r of [...data.recommended_ranked]) {
    if (r.yaqoot_id === "2758") IMG.yq2758 = r.image_url;
    if (r.yaqoot_id === "1356") IMG.yq1356 = r.image_url;
    if (r.yaqoot_id === "1296") IMG.yq1296 = r.image_url;
    if (r.yaqoot_id === "1026") IMG.yq1026 = r.image_url;
  }
}

function P(o) { return o; }

const NEW_PRODUCTS = [
  P({
    id: "yq-2798", slug: "yq-2798", sku: "YQ-2798",
    brand: "Bioderma", brandAr: "بايوديرما",
    name: {
      ar: "بايوديرما سيبيوم غل رغوي منظف للبشرة الدهنية والمختلطة 400 مل",
      en: "Bioderma Sebium Foaming Gel 400ml",
    },
    description: {
      ar: "غلُّ بيوديرما سيبيوم الرغوي منظفٌ يومي للبشرة المختلطة والدهنية، بتركيبة رغوية مطهرة تعتمد على مكونات نشطة غير مهيجة وملطفة للبشرة. يعمل الغسول على تطهير البشرة وإعادة إفرازات الزهم الزائدة إلى حدّها الطبيعي، ويزيل بفعالية آثار المكياج عن الوجه والعينين، ويمكن استخدامه كذلك كرغوة للحلاقة.",
      en: "Bioderma Sébium Foaming Gel is a daily purifying foaming gel for combination and oily skin, formulated with non-irritating, purifying and soothing active ingredients. It cleanses the skin, normalizes excess sebum production and effectively removes face and eye makeup, and can also be used as a shaving foam.",
    },
    category: "Cleansers", categoryAr: "المنظفات", categorySlug: "cleansers",
    pricing: { price: 9360, currency: "YER" },
    gallery: [IMG.yq2758],
    ingredients: { ar: ["مكونات نشطة غير مهيجة للبشرة، مطهرة وملطفة"], en: ["Non-irritating purifying and soothing active ingredients"] },
    usageInstructions: {
      ar: "يُستخدم صباحًا أو مساءً يوميًا؛ يوضع على البشرة الرطبة ويُفرك بلطف ثم يُشطف وتجفف البشرة بلطف.",
      en: "Use morning or evening on damp skin, lather gently, then rinse and pat dry.",
    },
    howToUse: "يوضع على البشرة الرطبة ويُفرك بلطف ثم يُشطف.",
    howToUseAr: "يوضع على البشرة الرطبة ويُفرك بلطف ثم يُشطف.",
    skinTypes: ["oily", "combination"],
    suitableFor: ["oily", "combination"],
    skinConcerns: ["acne", "oiliness"],
    benefits: {
      ar: ["يستخدم صباحًا ومساءً على بشرة رطبة مع التدليك اللطيف قبل الشطف، فيحصل أصحاب البشرة الدهنية على نقاء مريح دون شد أو جفاف. ومع الاستمرار يتحسن توازن الإفرازات الدهنية، وتظل البشرة نظيفة مطفية طوال اليوم مع حماية فائقة لمنطقة العين الحساسة أثناء التنظيف."],
      en: ["Applied morning and evening on damp skin, it delivers comfortable purification without tightness. With continued use sebum balance improves, keeping skin matte-clean through the day."],
    },
    stock: 25, inStock: true, stockQuantity: 25,
    rating: 0, reviewCount: 0,
    featured: false, isFeatured: false, new: true, isNew: true,
    tags: ["bioderma", "cleansers", "sebium", "yaqoot-live"],
    seoMetadata: {
      title: { ar: "بايوديرما سيبيوم غل رغوي 400 مل | Luminous Derma", en: "Bioderma Sebium Foaming Gel 400ml | Luminous Derma" },
      description: { ar: "غل رغوي مطهر للبشرة المختلطة والدهنية يزيل المكياج ويعيد توازن الإفرازات الدهنية.", en: "Purifying foaming gel for combination and oily skin." },
      keywords: ["بايوديرما", "سيبيوم", "غسول وجه", "bioderma sebium"],
    },
    heroImage: IMG.yq2758,
    searchAliases: [],
    source: { provider: "Yaqoot Store (live)", verified: true, verifiedAt: NOW, notes: "https://yaqootstoreye.com/product.php?id=2758 ; content facts from listing page" },
    audit: [{ action: "added-catalog-expansion-batch1", at: NOW, note: "verified yaqoot availability, price, image and listing facts" }],
  }),

  P({
    id: "yq-2799", slug: "yq-2799", sku: "YQ-2799",
    brand: "Bioderma", brandAr: "بايوديرما",
    name: {
      ar: "بايوديرما سيبيوم مات كنترول للبشرة الدهنية المعرضة لحب الشباب",
      en: "Bioderma Sebium Mat Control",
    },
    description: {
      ar: "سيبيوم مات كنترول من بيوديرما كريم يومي مخصص للبشرة الدهنية والمعرضة لحب الشباب، يعمل على تنظيم إفراز الزيوت الزائدة وتحسين مظهر البشرة، ليمنحها ملمسًا ناعمًا غير دهني ولمعة منخفضة تدوم طوال اليوم، بتركيبة لا تسد المسام.",
      en: "Sébium Mat Control by Bioderma is a daily cream for oily, acne-prone skin. It regulates excess oil secretion and improves skin appearance, delivering a soft, non-greasy, low-shine finish throughout the day with a non-comedogenic formula.",
    },
    category: "Moisturizers", categoryAr: "مرطبات", categorySlug: "moisturizers",
    pricing: { price: 9360, currency: "YER" },
    gallery: [IMG.yq1356],
    ingredients: { ar: [], en: [] },
    usageInstructions: { ar: "", en: "" },
    howToUse: "", howToUseAr: "",
    skinTypes: ["oily", "combination"],
    suitableFor: ["oily", "combination"],
    skinConcerns: ["acne", "oiliness", "large_pores"],
    benefits: {
      ar: ["تعمل مكوناته على تقليل إفراز الزيوت المسؤول عن لمعان البشرة، وتساعد في تقليل البكتيريا المساهمة في ظهور حب الشباب. وبالرغم من فعاليته في تقليل الدهون فإنه يحافظ على ترطيب مناسب يمنع الجفاف، كما تشتمل التركيبة على مواد مضادة للأكسدة تحمي البشرة من العوامل البيئية الضارة، ما يجعله أساسًا مثاليًا قبل واقي الشمس صباحًا."],
      en: ["Its actives reduce the sebum responsible for shine and help limit acne-contributing bacteria, while maintaining adequate hydration without drying the skin. Antioxidants protect against environmental stressors, making it an ideal morning base under sunscreen."],
    },
    stock: 25, inStock: true, stockQuantity: 25,
    rating: 0, reviewCount: 0,
    featured: false, isFeatured: false, new: true, isNew: true,
    tags: ["bioderma", "moisturizers", "sebium", "mat-control", "yaqoot-live"],
    seoMetadata: {
      title: { ar: "بايوديرما سيبيوم مات كنترول | Luminous Derma", en: "Bioderma Sebium Mat Control | Luminous Derma" },
      description: { ar: "كريم مخملي للبشرة الدهنية ينظم الإفرازات ويقلل اللمعان طوال اليوم.", en: "Daily matifying cream for oily acne-prone skin." },
      keywords: ["بايوديرما", "سيبيوم مات كنترول", "بشرة دهنية", "bioderma"],
    },
    heroImage: IMG.yq1356,
    searchAliases: [],
    source: { provider: "Yaqoot Store (live)", verified: true, verifiedAt: NOW, notes: "https://yaqootstoreye.com/product.php?id=1356 ; content facts from listing page" },
    audit: [{ action: "added-catalog-expansion-batch1", at: NOW, note: "verified yaqoot availability, price, image and listing facts" }],
  }),

  P({
    id: "yq-2800", slug: "yq-2800", sku: "YQ-2800",
    brand: "Bioderma", brandAr: "بايوديرما",
    name: {
      ar: "بايوديرما شامبو نود دي اس بلس ضد القشرة الشديدة",
      en: "Bioderma Nodé DS+ Anti-Dandruff Shampoo",
    },
    description: {
      ar: "شامبو نود دي اس بلس من بيوديرما شامبو علاجي متخصص ضد قشرة الرأس الشديدة والمستمرة. تعتمد تركيبته الحصرية على المركب النشط ديساكتف الحاصل على براءة اختراع، الذي يمنحه فعالية مزدوجة: فهو يحد من تكاثر خميرة الملاسيزية المسببة للقشرة، ويقلل إفراز الزهم الذي يعزز تطورها، مما يوقف دورة تكرار القشرة بشكل فعلي.",
      en: "Nodé DS+ by Bioderma is a treatment shampoo for severe, persistent dandruff. Its exclusive formula features the patented active complex DSactiv® with dual efficacy: limiting Malassezia yeast proliferation and reducing sebum secretion that fuels its development, effectively breaking the dandruff recurrence cycle.",
    },
    category: "Shampoo", categoryAr: "شامبو", categorySlug: "shampoo",
    pricing: { price: 7000, currency: "YER" },
    gallery: [IMG.yq1296],
    ingredients: { ar: [], en: [] },
    usageInstructions: { ar: "", en: "" },
    howToUse: "", howToUseAr: "",
    skinTypes: ["all"],
    suitableFor: ["all"],
    skinConcerns: [],
    benefits: {
      ar: ["مع الانتظام في الاستخدام تهدأ حكة فروة الرأس الجافة المتهيجة وتختفي القشور المرئية تدريجيًا، وتستعيد الفروة توازنها دون عودة سريعة للمشكلة. قوامه الكريمي السائل يسهّل التوزيع والغسل، ويترك الشعر نظيفًا بلا الرائحة الطبية الثقيلة التي تميز كثيرًا من شامبوهات القشرة."],
      en: ["With regular use, itching of dry irritated scalp calms and visible flakes gradually clear, restoring scalp balance without quick relapse. Its liquid creamy texture spreads and rinses easily, leaving hair clean without heavy medicinal odor."],
    },
    stock: 25, inStock: true, stockQuantity: 25,
    rating: 0, reviewCount: 0,
    featured: false, isFeatured: false, new: true, isNew: true,
    tags: ["bioderma", "shampoo", "node-ds", "anti-dandruff", "yaqoot-live"],
    seoMetadata: {
      title: { ar: "بايوديرما نود دي اس بلس ضد القشرة | Luminous Derma", en: "Bioderma Nodé DS+ Anti-Dandruff Shampoo | Luminous Derma" },
      description: { ar: "شامبو علاجي للقشرة الشديدة والمستمرة بتقنية ديساكتف الحاصلة على براءة اختراع.", en: "Treatment shampoo for severe persistent dandruff." },
      keywords: ["بايوديرما", "نود دي اس", "قشرة الرأس", "nodé ds+"],
    },
    heroImage: IMG.yq1296,
    searchAliases: [],
    source: { provider: "Yaqoot Store (live)", verified: true, verifiedAt: NOW, notes: "https://yaqootstoreye.com/product.php?id=1296 ; content facts from listing page" },
    audit: [{ action: "added-catalog-expansion-batch1", at: NOW, note: "verified yaqoot availability, price, image and listing facts" }],
  }),

  P({
    id: "yq-2801", slug: "yq-2801", sku: "YQ-2801",
    brand: "Eucerin", brandAr: "يوسرين",
    name: {
      ar: "يوسرين كريم العين ايفن بيجمنت بيرفيكتور دارك سيركل",
      en: "Eucerin Even Pigment Perfecting Dark Circle Eye Cream",
    },
    description: {
      ar: "كريم العين ايفن بيجمنت بيرفيكتور دارك سيركل من يوسرين مصمم خصيصًا لتصحيح جميع أنواع الهالات السوداء والانتفاخ المحيط بالعين. تعتمد تركيبته على الثياميدول الحاصل على براءة اختراع، وهو مكون فعال في معالجة السبب الجذري لفرط التصبغ، مع أداة توزيع معدنية باردة تمنح تطبيقًا منعشًا وتنعيمًا للخطوط الدقيقة.",
      en: "Eucerin Even Pigment Perfecting Dark Circle Eye Cream is designed to correct all types of dark circles and under-eye puffiness. Its formula features patented Thiamidol addressing the root cause of hyperpigmentation, delivered via a cooling metal applicator that soothes fine lines.",
    },
    category: "Eye Care", categoryAr: "العناية بالعين", categorySlug: "eye-care",
    pricing: { price: 18750, currency: "YER" },
    gallery: [IMG.yq1026],
    ingredients: { ar: ["الثياميدول الحاصل على براءة اختراع"], en: ["Patented Thiamidol"] },
    usageInstructions: { ar: "", en: "" },
    howToUse: "", howToUseAr: "",
    skinTypes: ["all"],
    suitableFor: ["all"],
    skinConcerns: ["dark_circles"],
    benefits: {
      ar: ["تعمل الجزيئات العاكسة للضوء على تفتيح منطقة أسفل العين فور التطبيق لمظهر متألق فوري، بينما يبدأ الأثر العلاجي في الظهور بعد أسبوعين من الاستخدام المنتظم مع اختفاء تدريجي للهالات. كما يهدئ الكريم الخطوط الدقيقة ويمنح محيط العين نعومة وراحة، لتبدو النظرة أكثر صفاءً وإشراقًا يومًا بعد يوم."],
      en: ["Light-reflecting particles instantly brighten the under-eye area upon application, while the corrective effect becomes noticeable after two weeks of regular use with gradual fading of dark circles. The cream also smooths fine lines for an increasingly radiant look."],
    },
    stock: 25, inStock: true, stockQuantity: 25,
    rating: 0, reviewCount: 0,
    featured: false, isFeatured: false, new: true, isNew: true,
    tags: ["eucerin", "eye-care", "dark-circles", "thiamidol", "yaqoot-live"],
    seoMetadata: {
      title: { ar: "يوسرين كريم العين ايفن بيجمنت | Luminous Derma", en: "Eucerin Even Pigment Eye Cream | Luminous Derma" },
      description: { ar: "كريم عين بالثياميدول لتصحيح الهالات السوداء بأنواعها مع تأثير فوري ونتيجة بعد أسبوعين.", en: "Thiamidol eye cream correcting all dark circle types." },
      keywords: ["يوسرين", "هالات سوداء", "ثياميدول", "eucerin even pigment"],
    },
    heroImage: IMG.yq1026,
    searchAliases: [],
    source: { provider: "Yaqoot Store (live)", verified: true, verifiedAt: NOW, notes: "https://yaqootstoreye.com/product.php?id=1026 ; content facts from listing page" },
    audit: [{ action: "added-catalog-expansion-batch1", at: NOW, note: "verified yaqoot availability, price, image and listing facts" }],
  }),
];

/* ── surgical insert into part-08 ─────────────────────── */
const p8 = parts[7];
if (!p8.src.endsWith("];") && !p8.src.slice(p8.end - 2, p8.end + 2).includes("]")) {
  /* tolerate formatting differences */
}
const insertAt = p8.end; // index of closing ]
const additions = NEW_PRODUCTS.map((p) => "," + JSON.stringify(p)).join("");
const updatedSrc = p8.src.slice(0, insertAt) + additions + p8.src.slice(insertAt);
JSON.parse(updatedSrc.slice(updatedSrc.indexOf("["), updatedSrc.lastIndexOf("]") + 1)); // validate
fs.writeFileSync(path.join(ROOT, p8.file), updatedSrc, "utf8");
console.log("INSERTED 4 PRODUCTS ->", p8.file);

/* ── post-write verification ──────────────────────────── */
const after = [];
for (let i = 1; i <= 8; i++) after.push(...parsePart(loadPart(i)));
const errors = [];
if (after.length !== TOTAL_BEFORE + 4) errors.push("COUNT: " + after.length);
const afterIds = new Set(after.map((p) => p.id));
if (afterIds.size !== after.length) errors.push("DUPLICATE IDS");
for (const id of NEW_IDS) if (!afterIds.has(id)) errors.push("MISSING NEW: " + id);
for (const p of catalog) {
  const q = after.find((x) => x.id === p.id);
  if (!q) { errors.push("LOST: " + p.id); continue; }
  for (const k of ["sku", "brand", "categorySlug"]) {
    if (JSON.stringify(p[k]) !== JSON.stringify(q[k])) errors.push(`${p.id}: ${k} changed`);
  }
  if (p.pricing.price !== q.pricing.price) errors.push(p.id + ": PRICE changed");
  if (JSON.stringify(p.gallery) !== JSON.stringify(q.gallery)) errors.push(p.id + ": GALLERY changed");
}
console.log("VERIFICATION:", errors.length === 0 ? "PASS — 4 added, all existing intact" : "FAIL");
errors.forEach((e) => console.log(" !!", e));
if (errors.length) process.exit(1);
