/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
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
if (catalog.some((p) => ["yq-2803","yq-2804","yq-2805","yq-2806","yq-2807","yq-2808","yq-2809"].includes(p.id))) throw new Error("batch3 already applied");

/* yaqoot images by platform id */
const ycat = JSON.parse(fs.readFileSync(path.join(ROOT, "market-data/yaqoot-live-catalog.json"), "utf8"));
const imgById = new Map(ycat.products.map((y) => [y.yaqootId, y.image]));

function mk(id, skuN, nameAr, nameEn, catSlug, catAr, price, imgId, descAr, descEn, benAr, benEn, concerns, skinTypes) {
  const img = imgById.get(imgId);
  if (!img) throw new Error("no image for yaqoot " + imgId);
  return {
    id, slug: id, sku: "YQ-" + skuN,
    brand: "Revolution", brandAr: "ريفولوشن",
    name: { ar: nameAr, en: nameEn },
    description: { ar: descAr, en: descEn },
    category: "Makeup", categoryAr: "مكياج", categorySlug: catSlug,
    pricing: { price, currency: "YER" },
    gallery: [img],
    ingredients: { ar: [], en: [] },
    usageInstructions: { ar: "", en: "" },
    howToUse: [], howToUseAr: [],
    skinTypes, suitableFor: skinTypes,
    skinConcerns: concerns,
    benefits: { ar: [benAr], en: [benEn] },
    stock: 25, inStock: true, stockQuantity: 25,
    rating: 0, reviewCount: 0,
    featured: false, isFeatured: false, new: true, isNew: true,
    tags: ["revolution", catSlug, "makeup", "yaqoot-live"], /* tags derived */
    seoMetadata: {
      title: { ar: nameAr + " | Luminous Derma", en: nameEn + " | Luminous Derma" },
      description: { ar: descAr.slice(0, 150), en: descEn.slice(0, 150) },
      keywords: ["ريفولوشن", "revolution", catSlug],
    },
    heroImage: img,
    searchAliases: [],
    source: { provider: "Yaqoot Store (live)", verified: true, verifiedAt: NOW, notes: "https://yaqootstoreye.com/product.php?id=" + imgId + " ; content facts from listing page" },
    audit: [{ action: "added-catalog-expansion-batch3-revolution", at: NOW, note: "verified yaqoot availability, live price, image and listing facts" }],
  };
}

const NEW = [
  mk("yq-2803", "2803",
    "ريفولوشن كحل سائل سلك فلك اسود", "Makeup Revolution Relove Slick Flick Liquid Eyeliner Black",
    "eye-makeup", "مكياج العيون", 2520, "1535",
    "كحل Relove Slick Flick السائل من ريفولوشن، كحل شديد السواد بجسم قلمي الشكل يسهل التحكم به أثناء التطبيق، صُمم لمساعدتك على الحصول على خط جناحي انسيابي ودائم في كل مرة.",
    "Relove Slick Flick liquid eyeliner by Revolution — intense black in a pen-style body for controlled application, designed for a smooth long-lasting wing every time.",
    "استخدمي طرف الكحل اللبادي لرسم الخط الذي تريدينه مباشرة على الجفن دون تردد أو تلطيخ، فثباته يدوم طوال اليوم دون تكسر. سواده الشديد يمنح النظرة حدة وإبرازًا فوريًا، سواء مع خط رفيع يومي أو جناح دراماتيكي للمناسبات المسائية.",
    "Use the felt tip to draw your desired line directly on the lid without skipping. Its intense black stays put all day for sharp everyday or dramatic evening looks.",
    ["oiliness"], ["all"]),
  mk("yq-2804", "2804",
    "ريفولوشن ماسكارا باور لاش لتكثيف الرموش", "Makeup Revolution Relove Power Lash Volumizing Mascara",
    "eye-makeup", "مكياج العيون", 2250, "1534",
    "ماسكارا ريلوف باور لاش لتكثيف الرموش من ريفولوشن، ماسكارا سوداء فائقة الصباغ ترفع الرموش وتمنحها كثافة هائلة بلمسة نهائية كثيفة ممتلئة.",
    "Relove Power Lash volumizing mascara by Revolution — ultra-pigmented black that lifts lashes for a dense, full finish.",
    "طبقيها بحركات تصاعدية من جذور الرموش نحو الأطراف لتغليف كل رمشة بالتركيبة المكثفة، فتظهر رموشك أطول وأكثر امتلاءً منذ الطبقة الأولى. تركيبتها تدوم دون تكتل أو تقصف، ما يجعلها خيارًا يوميًا لنظرة عيون واسعة ومفعمة بالحيوية.",
    "Apply in upward motions from root to tip to coat every lash — longer, fuller lashes from the first coat without clumping or flaking.",
    [], ["all"]),
  mk("yq-2805", "2805",
    "ريفولوشن قلم تحديد الحواجب ريلوف باور بني غامق", "Makeup Revolution Relove Power Brow Pencil Dark Brown",
    "eye-makeup", "مكياج العيون", 2360, "1274",
    "قلم تحديد الحواجب ريلوف باور بدرجة البني الغامق من مجموعة ريلوف، قلم احترافي مصمم بطرف بزاوية دقيقة يساعد على رسم شعيرات الحاجب بشكل واقعي محدد يمنح مظهرًا طبيعيًا وجميلًا.",
    "Relove Power Brow Pencil in Dark Brown — professional angled-tip pencil for drawing realistic hair-like brow strokes.",
    "قوامه الناعم سهل الدمج يملأ فراغات الحاجبين ويحدد محيطها ليمنحك شكلًا مرتبًا كثيفًا طبيعي المظهر، مثالي لإتمام إطلالة حواجب منحوتة خلال دقيقة واحدة قبل الخروج بثقة وإطلالة ساحرة.",
    "Its soft blendable texture fills gaps and defines brows for a groomed, naturally full look in under a minute.",
    [], ["all"]),
  mk("yq-2806", "2806",
    "ريفولوشن سيروم نياسيناميد 10% + زنك 1% لتقليل المسام", "Makeup Revolution Niacinamide 10% + Zinc 1% Serum",
    "serums", "سيروم", 7560, "969",
    "سيروم نياسيناميد 10% مع الزنك 1% من ريفولوشن، سيروم خفيف ولطيف على البشرة يستهدف علاج عيوب البشرة وتقليل ظهور المسام الكبيرة، بمكونين فعّالين مدروسين لتنظيم البشرة الدهنية والمختلطة ضمن روتين العناية اليومي.",
    "Revolution Niacinamide 10% + Zinc 1% serum — a lightweight, gentle formula targeting blemishes and the appearance of enlarged pores.",
    "ينظم السيروم إفراز الدهون في البشرة الدهنية والمختلطة فيبدو وجهك أقل لمعانًا خلال ساعات النهار، ومع الانتظام يتحسن مظهر المسام الواسعة وتتلاشى آثار الحبوب القديمة تدريجيًا. تركيبته اللطيفة تجعله مناسبًا للاستخدام صباحًا ومساءً ضمن أي روتين عناية.",
    "Regulates oil for less daytime shine; with regular use pores look refined and post-blemish marks gradually fade — gentle enough for AM & PM routines.",
    ["acne", "large_pores", "oiliness"], ["oily", "combination"]),
  mk("yq-2807", "2807",
    "ريفولوشن قلم تحديد الحواجب ريلوف باور بني", "Makeup Revolution Relove Power Brow Pencil Brown",
    "eye-makeup", "مكياج العيون", 2360, "867",
    "قلم تحديد الحواجب ريلوف باور باللون البني من ريفولوشن، يتميز بطرف قابل للسحب يشبه الشفرة صُمم لرسم خطوط دقيقة تحاكي شعيرات الحاجب الطبيعية لإطلالة متناسقة.",
    "Relove Power Brow Pencil in Brown — blade-like retractable tip drawing precise hair-like strokes.",
    "تركيبته مقاومة للتلطخ وتدوم طويلًا فلتبقى حواجبك منمقة طوال اليوم دون إعادة تشكيل، وسهل الاستخدام لملء المناطق المتناثرة وتعزيز الشكل الطبيعي، وهو الخيار الأمثل لحواجب محددة ومنحوتة بإطلالة ناعمة غير مبالغ فيها.",
    "Smudge-proof long wear keeps brows styled all day; easy application fills sparse areas for softly sculpted natural brows.",
    [], ["all"]),
  mk("yq-2808", "2808",
    "ريفولوشن باليت ظلال العيون ريلوديد سيداكشن 15 لون", "Makeup Revolution Reloaded Seduction Eyeshadow Palette",
    "eye-makeup", "مكياج العيون", 7500, "792",
    "باليت ظلال العيون Reloaded Seduction من ريفولوشن بـ15 درجة لونية غنية بصبغة عميقة، تجمع بين اللمسات غير اللامعة واللمعان والتأثير الدخاني بألوان داكنة ودرجات التوت المتألق في باليت واحد متكامل.",
    "Reloaded Seduction eyeshadow palette by Revolution — 15 deeply pigmented shades mixing mattes, shimmers and smoky berry tones.",
    "ظلال عالية الأصباغ قابلة للمزج بسهولة تمنحك إطلالات خالية من التجاعيد تدوم طويلًا، من الإطلالات اليومية الهادئة إلى المكياج المسائي الاحترافي المدخن، بجودة عالية وسعر معقول تجعلها باليتة شاملة تكفي لكل المناسبات دون الحاجة لأخرى.",
    "Highly pigmented, blendable shadows with crease-free long wear — from soft everyday looks to pro-level smoky evenings, all in one affordable palette.",
    [], ["all"]),
  mk("yq-2809", "2809",
    "ريفولوشن ملمع شفاه ريلوف بيبي جلام", "Makeup Revolution Relove Baby Glam Lip Gloss",
    "lip-makeup", "مكياج الشفاه", 3000, "791",
    "ملمع الشفاه Relove Baby Glam من ريفولوشن، مصنوع بمكونات موثوقة عالية الجودة ومدعم بحمض الهيالورونيك الذي يرطب الشفاه وينعمها، مع أداة تطبيق بطرف ناعم تتيح وضع اللمعان بدقة دون أي لطخات.",
    "Relove Baby Glam lip gloss by Revolution — hyaluronic acid-infused gloss with a soft precision applicator.",
    "صباغته العالية تعزز لون شفتيك بلمسة لمعان مثالية تدوم، بينما يعمل حمض الهيالورونيك على ترطيب مستمر يمنع الجفاف مع التكرار. النتيجة شفاه ممتلئة ناعمة لامعة بإطلالة عصرية تناسب النهار والمساء على حد سواء.",
    "High-pigment shine with continuous hyaluronic hydration — plump, smooth, glossy lips day and night.",
    [], ["all"]),
];

/* ── insert ───────────────────────────────────────────── */
const p8 = parts[7];
const insertAt = p8.end;
const updatedSrc = p8.src.slice(0, insertAt) + "," + NEW.map((p) => JSON.stringify(p)).join(",") + p8.src.slice(insertAt);
JSON.parse(updatedSrc.slice(updatedSrc.indexOf("["), updatedSrc.lastIndexOf("]") + 1));
fs.writeFileSync(path.join(ROOT, p8.file), updatedSrc, "utf8");
console.log("INSERTED 7 REVOLUTION PRODUCTS");

/* ── verify ───────────────────────────────────────────── */
const after = [];
for (let i = 1; i <= 8; i++) after.push(...parsePart(loadPart(i)));
const errors = [];
if (after.length !== TOTAL_BEFORE + 7) errors.push("COUNT: " + after.length);
if (new Set(after.map((p) => p.id)).size !== after.length) errors.push("DUP IDS");
for (const p of catalog) {
  const q = after.find((x) => x.id === p.id);
  if (!q || q.sku !== p.sku || q.pricing.price !== p.pricing.price || JSON.stringify(q.gallery) !== JSON.stringify(p.gallery)) {
    errors.push("EXISTING CHANGED: " + p.id); break;
  }
}
console.log("VERIFICATION:", errors.length === 0 ? "PASS" : "FAIL");
errors.forEach((e) => console.log(" !!", e));
