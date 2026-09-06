/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ROOT = process.cwd();
const NOW = new Date().toISOString();

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
const existingIds = new Set(catalog.map((p) => p.id));
if (existingIds.has("yq-2802")) throw new Error("COLLISION yq-2802");

const NEW = {
  id: "yq-2802", slug: "yq-2802", sku: "YQ-2802",
  brand: "Vichy", brandAr: "فيشي",
  name: {
    ar: "فيشي واقي شمس للبشرة الدهنية والمختلطة",
    en: "Vichy Sunscreen for Oily & Combination Skin",
  },
  description: {
    ar: "واقي الشمس من فيشي للبشرة الدهنية والمختلطة، كريم حماية يومي يحمي الجلد من تأثير الأشعة فوق البنفسجية بنوعيها UVA وUVB. بتركيبة تُمتص بسهولة داخل الجلد وتقاوم اسوداد البشرة، تمنح الجلد إحساسًا بالنعومة دون لمعان دهني.",
    en: "Vichy sunscreen for oily and combination skin is a daily protection cream shielding the skin from both UVA and UVB rays. Its fast-absorbing formula resists darkening and leaves the skin smooth without greasy shine.",
  },
  category: "Sunscreen", categoryAr: "واقي شمس", categorySlug: "sunscreen",
  pricing: { price: 9960, currency: "YER" },
  gallery: ["https://yaqootstoreye.com/files/items/item_1701673159_1.png?v=1"],
  ingredients: { ar: [], en: [] },
  usageInstructions: { ar: "", en: "" },
  howToUse: [], howToUseAr: [],
  skinTypes: ["oily", "combination"],
  suitableFor: ["oily", "combination"],
  skinConcerns: ["pigmentation"],
  benefits: {
    ar: ["يُستخدم قبل التعرض للشمس ليحافظ على بشرة الوجه محمية خلال ساعات النهار، فتقل فرص التصبغ والاسمرار الناتجين عن الأشعة فوق البنفسجية. قوامه الخفيف سريع الامتصاص يجعله مناسبًا تحت المكياج وللاستخدام اليومي في الأجواء الحارة، خاصة لأصحاب البشرة الدهنية والمختلطة الذين يتجنبون المنتجات ذات اللمعان."],
    en: ["Applied before sun exposure, it keeps facial skin protected through daylight hours, reducing pigmentation and tanning risks. Its lightweight fast-absorbing texture suits wear under makeup and daily use in hot climates — ideal for oily and combination skin avoiding shine."],
  },
  stock: 25, inStock: true, stockQuantity: 25,
  rating: 0, reviewCount: 0,
  featured: false, isFeatured: false, new: true, isNew: true,
  tags: ["vichy", "sunscreen", "yaqoot-live"],
  seoMetadata: {
    title: { ar: "فيشي واقي شمس للبشرة الدهنية والمختلطة | Luminous Derma", en: "Vichy Sunscreen Oily & Combination Skin | Luminous Derma" },
    description: { ar: "حماية يومية من UVA وUVB بتركيبة مطفية خفيفة تقاوم الاسوداد.", en: "Daily UVA/UVB protection with a matte lightweight finish." },
    keywords: ["فيشي", "واقي شمس", "بشرة دهنية", "vichy sunscreen"],
  },
  heroImage: "https://yaqootstoreye.com/files/items/item_1701673159_1.png?v=1",
  searchAliases: [],
  source: { provider: "Yaqoot Store (live)", verified: true, verifiedAt: NOW, notes: "https://yaqootstoreye.com/product.php?id=802 ; content facts from listing page; promo price 9960 was 12000" },
  audit: [{ action: "added-catalog-expansion-batch2", at: NOW, note: "verified yaqoot availability, live discounted price, image and listing facts" }],
};

const p8 = parts[7];
const insertAt = p8.end;
const updatedSrc = p8.src.slice(0, insertAt) + "," + JSON.stringify(NEW) + p8.src.slice(insertAt);
JSON.parse(updatedSrc.slice(updatedSrc.indexOf("["), updatedSrc.lastIndexOf("]") + 1));
fs.writeFileSync(path.join(ROOT, p8.file), updatedSrc, "utf8");
console.log("INSERTED yq-2802 ->", p8.file);

const after = [];
for (let i = 1; i <= 8; i++) after.push(...parsePart(loadPart(i)));
const errors = [];
if (after.length !== TOTAL_BEFORE + 1) errors.push("COUNT: " + after.length);
if (new Set(after.map((p) => p.id)).size !== after.length) errors.push("DUP IDS");
for (const p of catalog) {
  const q = after.find((x) => x.id === p.id);
  if (!q || q.sku !== p.sku || q.pricing.price !== p.pricing.price || JSON.stringify(q.gallery) !== JSON.stringify(p.gallery)) {
    errors.push("EXISTING CHANGED: " + p.id); break;
  }
}
console.log("VERIFICATION:", errors.length === 0 ? "PASS" : "FAIL");
errors.forEach((e) => console.log(" !!", e));
