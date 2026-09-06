#!/usr/bin/env node
/**
 * ============================================================================
 * MASTER TAXONOMY — PRODUCT MAPPING GENERATOR
 * ============================================================================
 * Reads the 8 product part files (src/data/products-part-01..08.ts) and the
 * master taxonomy (src/data/taxonomy.ts), then generates:
 *
 *   src/lib/taxonomy/product-mappings.ts
 *
 * This file holds:
 *   - productMappings: Record<productId, ProductTaxonomyMapping>  (MAPPED)
 *   - reviewRequiredItems: ReviewRequiredItem[]                   (REVIEW_REQUIRED)
 *
 * RULES
 *  - Original product data is NEVER modified (id/name/price/images/stock...).
 *  - Classification is a PROPOSAL only. Products whose legacy categorySlug
 *    has no reliable taxonomy home are flagged REVIEW_REQUIRED for Admin.
 *  - Confidence: high (direct legacy match) / medium (keyword refine) /
 *    low (default fallback used).
 *
 * USAGE:  node scripts/taxonomy/generate-mappings.mjs
 * ============================================================================
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/* ────────────────────────────── Taxonomy loader ──────────────────────────── */
function loadTaxonomy() {
  const src = readFileSync(join(root, "src/data/taxonomy.ts"), "utf8");
  const nodes = [];
  for (const rawLine of src.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("{ id: ")) continue;
    const id = /id:\s*"([^"]+)"/.exec(line)?.[1];
    const slug = /slug:\s*"([^"]+)"/.exec(line)?.[1];
    const type = /type:\s*"([^"]+)"/.exec(line)?.[1];
    const status = /status:\s*"([^"]+)"/.exec(line)?.[1];
    const parentRaw = /parentId:\s*("([^"]+)"|null)/.exec(line)?.[1];
    const legacyRaw = /legacySlugs:\s*\[([^\]]*)\]/.exec(line)?.[1];
    if (!id || !slug || !type) continue;
    nodes.push({
      id,
      slug,
      type,
      status: status || "ACTIVE",
      parentId: parentRaw === "null" ? null : parentRaw.replace(/"/g, ""),
      legacySlugs: legacyRaw
        ? [...legacyRaw.matchAll(/"([^"]+)"/g)].map((m) => m[1])
        : [],
    });
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = (parentId) => nodes.filter((n) => n.parentId === parentId);
  const ancestors = (node) => {
    const out = [];
    let cur = node.parentId ? byId.get(node.parentId) : undefined;
    while (cur) {
      out.unshift(cur);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return out;
  };
  return { nodes, byId, childrenOf, ancestors };
}

/* ────────────────────────────── Product loader ───────────────────────────── */
function loadProducts() {
  const products = [];
  for (let i = 1; i <= 8; i++) {
    const src = readFileSync(join(root, `src/data/products-part-0${i}.ts`), "utf8");
    // Try to parse as exported array first (current format: export const productsPart01 = [...])
    const arrayMatch = src.match(/\[.*\]/s);
    if (arrayMatch) {
      try {
        const arr = JSON.parse(arrayMatch[0]);
        products.push(...arr);
        continue;
      } catch {}
    }
    // Fallback: line-delimited JSON
    for (const rawLine of src.split("\n")) {
      const line = rawLine.trim();
      if (!line.startsWith("{")) continue;
      try {
        const obj = JSON.parse(line.replace(/,\s*$/, ""));
        products.push(obj);
      } catch {
        console.warn("SKIP unparsable line in part", i);
      }
    }
  }
  return products;
}

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ");

/* ── Global productType keyword index for cross-category reclassification ── */
const globalPtKeywords = {
  "cleansers": ["غسول وجه","منظف وجه","غسول","cleanser"],
  "toners": ["تونر","toner","مياه وجه"],
  "serums": ["سيروم وجه","سيروم","serum"],
  "moisturizers": ["مرطب وجه","كريم وجه","moisturizer"],
  "face-creams": ["كريم وجه","face cream"],
  "face-oils-treatments": ["زيت وجه","face oil"],
  "masks": ["ماسك وجه","قناع وجه","mask"],
  "exfoliators": ["مقشر وجه","exfoliator","مقشر"],
  "eye-creams": ["كريم عين","eye cream"],
  "eye-serums": ["سيروم عين","eye serum"],
  "lip-balms": ["مرطب شفاه","lip balm","بلسم شفاه"],
  "sunscreen": ["واقي شمس وجه","sunscreen وجه"],
  "sunscreen-body": ["واقي جسم","sunscreen جسم","body sunscreen"],
  "body-wash": ["غسول جسم","body wash","شاور جل","جل استحمام"],
  "body-soap": ["صابون جسم","body soap","صابون"],
  "body-lotion": ["لوشن جسم","body lotion"],
  "body-cream": ["كريم جسم","body cream"],
  "body-butter": ["زبدة جسم","body butter"],
  "body-oils": ["زيت جسم","body oil"],
  "body-scrubs": ["مقشر جسم","body scrub","سكراب جسم"],
  "hand-creams": ["كريم يد","hand cream"],
  "foot-creams": ["كريم قدم","foot cream","كعب"],
  "shampoo": ["شامبو","shampoo"],
  "conditioner": ["بلسم شعر","conditioner"],
  "hair-creams": ["كريم شعر","hair cream"],
  "hair-masks": ["ماسك شعر","hair mask"],
  "hair-oils": ["زيت شعر","hair oil"],
  "hair-serums": ["سيروم شعر","hair serum"],
  "hair-dyes": ["صبغه","صبغة","hair dye","لون شعر"],
  "foundation": ["فاونديشن","كريم اساس","foundation"],
  "concealer": ["كونسيلر","concealer"],
  "powder": ["بودره","powder"],
  "blush": ["بلاشر","blush"],
  "mascara": ["ماسكارا","mascara"],
  "eyeliner": ["ايلاينر","eyeliner"],
  "kohl": ["كحل","kohl"],
  "eyeshadow": ["ظلال","eyeshadow"],
  "lipstick": ["روج","lipstick","احمر شفاه"],
  "lip-gloss": ["ملمع شفاه","lip gloss","قلوس"],
  "nail-polish": ["طلاء اظافر","nail polish","مناكير"],
  "nail-care-products": ["عنايه اظافر","nail care"],
  "toothpaste": ["معجون اسنان","toothpaste"],
  "toothbrushes": ["فرشاة اسنان","toothbrush"],
  "mouthwash": ["غسول فم","مضمضه","mouthwash"],
  "deodorants-pt": ["مزيل عرق","deodorant"],
  "vitamins-pt": ["فيتامين","vitamin"],
  "supplements-pt": ["مكمل","supplement"],
  "women-perfume": ["عطر نسائي","women perfume"],
  "men-perfume": ["عطر رجالي","men perfume"],
  "bakhoor-premium": ["بخور فاخر","premium bakhoor"],
  "natural-oud": ["عود طبيعي","natural oud","دهن عود"],
};

function findGlobalBest(text, taxo) {
  const scored=[];
  for (const [ptSlug, kws] of Object.entries(globalPtKeywords)) {
    let s=0; for (const kw of kws) if (norm(text).includes(norm(kw))) s++;
    if (s>0) scored.push({ptSlug, score:s});
  }
  scored.sort((a,b)=>b.score-a.score);
  if (scored.length===0) return null;
  const target=taxo.nodes.find(n=>n.slug===scored[0].ptSlug);
  if (!target) return null;
  const parent=taxo.byId.get(target.parentId);
  const cat=taxo.ancestors(target).find(n=>n.type==="CATEGORY") || (parent?taxo.byId.get(parent.parentId):null);
  if (!cat||!parent) return null;
  return {categorySlug:cat.slug, subcategorySlug:parent.slug, productTypeSlug:target.slug};
}

/* ────────────────────────────── Refine rules ─────────────────────────────── */
/**
 * Rules run against a normalized text blob (name.ar + name.en + brand).
 * Each entry: [keywords: string[], productTypeSlug]. First keyword hit wins.
 * `default` is the fallback product type when nothing matches.
 */
const refineRules = {
  /* Skincare */
  "face-care": {
    rules: [],
    default: "face-creams",
    leaf: false,
  },
  "eye-area": {
    rules: [
      [["سيروم", "serum"], "eye-serums"],
      [["ماسك", "mask", "لصقه"], "eye-masks"],
    ],
    default: "eye-creams",
  },
  "lip-care": {
    rules: [
      [["مقشر", "سكر", "scrub"], "lip-scrubs"],
      [["ماسك", "mask"], "lip-masks"],
    ],
    default: "lip-balms",
  },
  "sun-protection": {
    rules: [
      [["جسم", "body"], "sunscreen-body"],
    ],
    default: "sunscreen",
  },
  /* Bodycare */
  "body-cleansing": {
    rules: [
      [["غسول", "wash", "جل"], "body-wash"],
    ],
    default: "body-soap",
  },
  "body-moisturizing": {
    rules: [
      [["زبده", "butter"], "body-butter"],
      [["كريم", "cream"], "body-cream"],
      [["زيت", "oil"], "body-oils"],
    ],
    default: "body-lotion",
  },
  "body-exfoliating": {
    rules: [
      [["ادوات", "فرشاه", "فرشه", "كف"], "body-exfoliation-tools"],
    ],
    default: "body-scrubs",
  },
  "hands-feet": {
    rules: [
      [["قدم", "foot", "باطن", "كعب"], "foot-creams"],
    ],
    default: "hand-creams",
  },
  /* Haircare */
  "hair-cleansing": {
    rules: [],
    default: "shampoo",
  },
  "hair-moisturizing": {
    rules: [
      [["كريم", "cream"], "hair-creams"],
      [["ماسك", "mask"], "hair-masks"],
    ],
    default: "conditioner",
  },
  "hair-treatments": {
    rules: [
      [["ماسك", "mask"], "hair-masks"],
      [["تساقط", "مينوكسيديل", "بصيلات", "نمو", "تكثيف", "فراغات", "minoxidil", "hair loss"], "hair-loss-treatments"],
      [["فروه", "قشره", "فروة", "scalp"], "scalp-treatments"],
      [["فرد", "تالف", "اصلاح", "معالج", "استرخاء", "damage", "repair", "straighten"], "damage-treatments"],
      [["صبغه", "صبغة", "dye", "لون"], "hair-dyes"],
    ],
    default: "hair-loss-treatments",
  },
  "hair-oils-serums": {
    rules: [
      [["سيروم", "serum"], "hair-serums"],
    ],
    default: "hair-oils",
  },
  "hair-styling": {
    rules: [
      [["جل", "gel"], "hair-gel"],
      [["رغوه", "موس", "mousse", "foam"], "styling-creams"],
      [["كريم", "cream"], "styling-creams"],
      [["تثبيت", "هولد", "hold"], "hair-hold-products"],
    ],
    default: "hair-spray",
  },
  /* Makeup */
  "face-makeup": {
    rules: [
      [["كريم اساس", "فاونديشن", "foundation"], "foundation"],
      [["كونسيلر", "concealer"], "concealer"],
      [["بودره", "باودر", "powder"], "powder"],
      [["بلاشر", "بلاش", "blush"], "blush"],
      [["برونزر", "bronzer"], "bronzer"],
      [["هايلايتر", "هايلايت", "highlighter"], "highlighter"],
      [["برايمر", "primer"], "primer"],
      [["مثبت", "فيكس", "setting", "spray"], "setting-spray"],
      [["بي بي", "bb"], "bb-cream"],
      [["كونتور", "contour"], "contour"],
    ],
    default: "foundation",
  },
  "eye-makeup": {
    rules: [
      [["ماسكارا", "mascara"], "mascara"],
      [["ايلاينر", "ايلينر", "آيلاينر", "ايبيك", "eyeliner", "لينر"], "eyeliner"],
      [["كحل", "kohl"], "kohl"],
      [["ظلال", "ايشادو", "eyeshadow", "باليت", "palette"], "eyeshadow"],
      [["حاجب", "برو", "brow"], "brow-products"],
    ],
    default: "eyeliner",
  },
  "lip-makeup": {
    rules: [
      [["روج", "احمر شفاه", "ليبيستيك", "lipstick", "stain"], "lipstick"],
      [["ملمع", "قلوس", "جلوس", "gloss"], "lip-gloss"],
      [["محدد", "لينر", "liner", "قلم"], "lip-liner"],
    ],
    default: "lipstick",
  },
  /* Perfume */
  "women-perfumes": {
    rules: [
      [["زيت", "دهن", "oil"], "oil-women-perfume"],
      [["عربي", "شرقي", "arabic"], "arabic-women-perfume"],
      [["فرنسي", "french"], "french-women-perfume"],
      [["مسك", "musk"], "women-musk"],
      [["ميست", "معطر", "mist", "body spray"], "women-body-mist"],
    ],
    default: "women-perfume",
  },
  "men-perfumes": {
    rules: [
      [["زيت", "دهن", "oil"], "oil-men-perfume"],
      [["عربي", "شرقي", "arabic"], "arabic-men-perfume"],
      [["فرنسي", "french"], "french-men-perfume"],
      [["مسك", "musk"], "men-musk"],
      [["ميست", "معطر", "mist", "body spray"], "men-body-mist"],
    ],
    default: "men-perfume",
  },
  "unisex-perfumes": {
    rules: [
      [["زيت", "دهن", "oil"], "oil-unisex-perfume"],
      [["عربي", "شرقي", "arabic"], "arabic-unisex-perfume"],
    ],
    default: "unisex-perfume",
  },
  /* Oral care */
  "teeth-cleansing": {
    rules: [
      [["معجون", "toothpaste", "مبيض", "لصقات", "شرائح"], "toothpaste"],
    ],
    default: "toothbrushes",
  },
  /* Personal care */
  "daily-hygiene": {
    rules: [
      [["مناديل", "wipes", "منديل"], "personal-wipes"],
    ],
    default: "daily-hygiene-products",
  },
  "deodorants": {
    rules: [
      [["مضاد تعرق", "antiperspirant"], "antiperspirants"],
    ],
    default: "deodorants-pt",
  },
  "shaving-hair-removal": {
    rules: [
      [["كريم", "رغوه", "فوم", "cream", "foam"], "shaving-creams"],
      [["ما بعد", "after"], "after-shave"],
      [["ازاله", "ازالة", "شمع", "removal", "مشقر", "تشقير"], "hair-removal"],
    ],
    default: "shaving-products",
  },
  "feminine-care": {
    rules: [
      [["فوط", "pads"], "sanitary-pads"],
    ],
    default: "feminine-care-supplies",
  },
  /* Contact lenses */
  /* Note: "contact-lenses" is handled at category-level (see categoryLevel). */
  /* Mother & baby */
  "baby-care": {
    rules: [
      [["شامبو", "غسول", "استحمام", "باث", "shampoo", "bath", "wash"], "baby-bathing"],
      [["مرطب", "كريم", "لوشن", "زيت", "lotion", "cream", "oil"], "baby-moisturizing"],
      [["شعر", "hair"], "baby-hair-care"],
    ],
    default: "baby-daily-care",
  },
  /* Health & wellness */
  "vitamins-supplements": {
    rules: [
      [["نساء", "مراه", "women", "حمل", "رضاعه"], "women-health"],
      [["اطفال", "kids", "صغار"], "kids-supplements"],
      [["معادن", "حديد", "كالسيوم", "مغنيسيوم", "minerals", "iron", "calcium"], "minerals"],
      [["كولاجين", "collagen"], "collagen"],
      [["مناعه", "immunity", "فيتامين سي", "فيتامين د", "فيتامين c", "فيتامين d", "زنك", "زينك", "اوميجا"], "immunity"],
      [["شعر", "اظافر", "نمو", "hair", "nail"], "hair-nails"],
      [["مكمل", "supplement", "بروتين", "احماض"], "supplements-pt"],
    ],
    default: "vitamins-pt",
  },
  /* Appliances & tools */
  "skincare-devices": {
    rules: [
      [["تنظيف", "فرشاه", "فرشه", "cleansing", "brush"], "cleansing-devices"],
      [["وجه", "face", "عين"], "face-devices"],
    ],
    default: "other-skincare-devices",
  },
  "hair-devices": {
    rules: [
      [["استشوار", "مجفف", "dryer", "سيشوار"], "hair-dryers"],
      [["مكواه", "ستريتنر", "straightener", "تمليسه"], "hair-straighteners"],
      [["مموج", "ستايلر", "styler", "مكوه", "تصفيف"], "styling-devices"],
    ],
    default: "other-hair-devices",
  },
  "makeup-tools": {
    rules: [
      [["فرشاه", "فرشه", "فرش", "brush", "بلاشر برش"], "makeup-brushes"],
      [["اسفنجه", "اسفنج", "sponge"], "makeup-sponges"],
    ],
    default: "makeup-applicators",
  },
  "personal-care-tools": {
    rules: [
      [["شفره", "امواس", "razor", "ماكينه", "شفره"], "shaving-tools"],
      [["فرشاه", "فرشه", "سيليكون", "brush"], "beauty-tools"],
    ],
    default: "care-tools",
  },
  /* Home & fragrance */
  "bakhoor": {
    rules: [
      [["عود", "oud", "دهن"], "natural-oud"],
      [["فاخر", "بخور", "premium", "معسل"], "bakhoor-premium"],
    ],
    default: "bakhoor-premium",
  },
  "home-fragrances": {
    rules: [],
    default: "home-fragrance-pt",
  },
  "home-perfumes": {
    rules: [],
    default: "home-perfumes-pt",
  },
};

/** Subcategory/leaf mapping for CATEGORY-level legacy slugs (no node match). */
const categoryLevel = {
  "oral-care": {
    categorySlug: "oral-care",
    rules: [
      [["لصقات", "شرائح", "whitening strip"], "teeth-whitening", "whitening-products"],
      [["غسول", "مضمضه", "mouthwash", "شرائح معطره", "كرات", "بخاخ معطر"], "mouthwash", "mouthwash"],
      [["خيط", "فلوس", "floss"], "interdental-care", "dental-floss"],
      [["فرشاه", "فرشه", "brush"], "teeth-cleansing", "toothbrushes"],
      [["لسان", "tongue"], "teeth-cleansing", "toothbrushes"],
      [["معجون", "toothpaste", "معجون اسنان"], "teeth-cleansing", "toothpaste"],
    ],
    default: ["teeth-cleansing", "toothpaste"],
  },
  "contact-lenses": {
    categorySlug: "contact-lenses",
    rules: [
      [["محلول", "solution", "سولوشن", "lens solution"], "lens-solutions", "lens-solutions"],
      [["ملونه", "مولده", "لون", "color", "ملون"], "lenses", "colored-lenses"],
      [["تجميلي", "cosmetic"], "lenses", "cosmetic-lenses"],
    ],
    default: ["lenses", "colored-lenses"],
  },
  "skincare": {
    categorySlug: "skincare",
    rules: [
      [["شامبو", "shampoo", "غسول شعر"], "hair-cleansing", "shampoo"],
      [["واقي شمس", "sunscreen", "حمايه من الشمس", "واقي"], "sun-protection", "sunscreen"],
      [["غسول وجه", "غسول رغوي", "منظف وجه", "cleanser", "غسول"], "face-care", "cleansers"],
      [["تونر", "toner", "مياه وجه"], "face-care", "toners"],
      [["سيروم", "serum"], "face-care", "serums"],
      [["مرطب وجه", "كريم وجه", "face cream", "moisturizer"], "face-care", "moisturizers"],
      [["ماسك وجه", "قناع", "mask"], "face-care", "masks"],
      [["مقشر وجه", "exfoliator", "مقشر"], "face-care", "exfoliators"],
      [["كريم عين", "سيروم عين", "eye cream", "eye serum"], "eye-area", "eye-creams"],
      [["مرطب شفاه", "بلسم شفاه", "lip balm"], "lip-care", "lip-balms"],
      [["لوشن جسم", "body lotion"], "body-moisturizing", "body-lotion"],
      [["غسول جسم", "body wash", "شاور"], "body-cleansing", "body-wash"],
      [["عطر", "perfume", "مسك", "بخور", "عود"], "women-perfumes", "women-perfume"],
      [["صبغه شعر", "صبغة", "hair dye"], "hair-treatments", "hair-dyes"],
      [["بلسم شعر", "conditioner"], "hair-moisturizing", "conditioner"],
      [["زيت شعر", "hair oil"], "hair-oils-serums", "hair-oils"],
      [["مكياج", "فاونديشن", "كونسيلر", "روج"], "face-makeup", "foundation"],
      [["معجون اسنان", "toothpaste"], "teeth-cleansing", "toothpaste"],
      [["مزيل عرق", "deodorant"], "deodorants", "deodorants-pt"],
      [["صابون جسم", "body soap"], "body-cleansing", "body-soap"],
      [["مقشر جسم", "body scrub"], "body-exfoliating", "body-scrubs"],
      [["كريم يد", "hand cream"], "hands-feet", "hand-creams"],
      [["كريم قدم", "foot cream"], "hands-feet", "foot-creams"],
      [["مكمل", "فيتامين", "كولاجين"], "vitamins-supplements", "vitamins-pt"],
    ],
    default: ["face-care", "cleansers"],
  },
  "haircare": {
    categorySlug: "haircare",
    rules: [
      [["شامبو", "shampoo"], "hair-cleansing", "shampoo"],
      [["بلسم", "conditioner"], "hair-moisturizing", "conditioner"],
      [["ماسك شعر", "hair mask"], "hair-moisturizing", "hair-masks"],
      [["كريم شعر", "hair cream"], "hair-moisturizing", "hair-creams"],
      [["زيت شعر", "hair oil"], "hair-oils-serums", "hair-oils"],
      [["سيروم شعر", "hair serum"], "hair-oils-serums", "hair-serums"],
      [["صبغه", "صبغة", "dye"], "hair-treatments", "hair-dyes"],
      [["تساقط", "minoxidil"], "hair-treatments", "hair-loss-treatments"],
    ],
    default: ["hair-cleansing", "shampoo"],
  },
  "bodycare": {
    categorySlug: "bodycare",
    rules: [
      [["غسول جسم", "body wash", "شاور"], "body-cleansing", "body-wash"],
      [["صابون", "soap"], "body-cleansing", "body-soap"],
      [["لوشن", "lotion"], "body-moisturizing", "body-lotion"],
      [["كريم جسم", "body cream"], "body-moisturizing", "body-cream"],
      [["زبده", "butter"], "body-moisturizing", "body-butter"],
      [["زيت جسم", "body oil"], "body-moisturizing", "body-oils"],
      [["مقشر جسم", "scrub"], "body-exfoliating", "body-scrubs"],
      [["يد", "hand"], "hands-feet", "hand-creams"],
      [["قدم", "foot"], "hands-feet", "foot-creams"],
    ],
    default: ["body-cleansing", "body-wash"],
  },
  "makeup": {
    categorySlug: "makeup",
    rules: [
      [["فاونديشن", "foundation", "كريم اساس"], "face-makeup", "foundation"],
      [["كونسيلر", "concealer"], "face-makeup", "concealer"],
      [["ماسكارا", "mascara"], "eye-makeup", "mascara"],
      [["ايلاينر", "eyeliner"], "eye-makeup", "eyeliner"],
      [["روج", "lipstick"], "lip-makeup", "lipstick"],
      [["ملمع شفاه", "lip gloss"], "lip-makeup", "lip-gloss"],
      [["ظلال", "eyeshadow"], "eye-makeup", "eyeshadow"],
      [["بودره", "powder"], "face-makeup", "powder"],
    ],
    default: ["face-makeup", "foundation"],
  },
  "perfume": {
    categorySlug: "perfume",
    rules: [
      [["نسائي", "women"], "women-perfumes", "women-perfume"],
      [["رجالي", "men"], "men-perfumes", "men-perfume"],
      [["مسك", "musk"], "women-perfumes", "women-musk"],
      [["بخور", "عود", "bakhoor", "oud"], "bakhoor", "bakhoor-premium"],
    ],
    default: ["women-perfumes", "women-perfume"],
  },
  "health-wellness": {
    categorySlug: "health-wellness",
    rules: [
      [["فيتامين", "vitamin"], "vitamins-supplements", "vitamins-pt"],
      [["كولاجين", "collagen"], "vitamins-supplements", "collagen"],
      [["مكمل", "supplement"], "supplements", "supplements-pt"],
    ],
    default: ["vitamins-supplements", "vitamins-pt"],
  },
};

/**
 * REVIEW handlers for legacy slugs with no reliable taxonomy home.
 * They propose the closest node and let Admin decide.
 * Each entry: [proposedCategory, proposedSubcategory, proposedProductType, reason]
 */
const reviewBySlug = {
  "uncategorized": ["bodycare", "body-cleansing", "body-wash", "لم يحدد تصنيف سابق (uncategorized) — مراجعة يدوية مطلوبة"],
  "group-care": ["skincare", "face-care", "serums", "مجموعات عناية متعددة (group-care) — مراجعة يدوية مطلوبة"],
  "makeup": ["makeup", "eye-makeup", "kohl", "تصنيف مكياج عام بدون تفاصيل — مراجعة يدوية مطلوبة"],
  "perfume": ["perfume", "women-perfumes", "women-perfume", "عطور عامة بدون تفاصيل — مراجعة يدوية مطلوبة"],
  "perfume-gift-sets": ["perfume", "women-perfumes", "women-perfume", "مجموعات هدايا عطرية — تُصنف ضمن سياق الهدايا وليس فئة — مراجعة يدوية مطلوبة"],
  "body-care": ["bodycare", "body-moisturizing", "body-lotion", "عناية عامة بالجسم بدون تفاصيل — مراجعة يدوية مطلوبة"],
};

/* ────────────────────────────── Matching helpers ─────────────────────────── */
function pickRule(rules, text) {
  for (const entry of rules) {
    const [keywords] = entry;
    if (keywords.some((k) => norm(text).includes(norm(k)))) return entry;
  }
  return null;
}

/**
 * Resolve a product against the taxonomy. Returns a ProductTaxonomyMapping
 * (status MAPPED) or a ReviewRequiredItem descriptor.
 */
function mapProduct(product, taxo) {
  const text = [product.name?.ar, product.name?.en, product.brand, product.brandAr, product.categoryAr].join(" ");
  const legacySlug = product.categorySlug;

  /* 1) Legacy slugs with explicit REVIEW handling */
  if (reviewBySlug[legacySlug]) {
    const [proposedCategory, proposedSubcategory, proposedProductType, reason] = reviewBySlug[legacySlug];
    return {
      kind: "review",
      productId: product.id,
      proposedCategory,
      proposedSubcategory,
      proposedProductType,
      confidence: "low",
      reason,
      legacyCategorySlug: legacySlug,
    };
  }

  /* 2) CATEGORY-level slugs (node exists as top-level category) */
  if (categoryLevel[legacySlug]) {
    const cfg = categoryLevel[legacySlug];
    const hit = pickRule(cfg.rules, text);
    if (hit) {
      const [, subcat, pt] = hit;
      return {
        kind: "mapped",
        productId: product.id,
        categorySlug: cfg.categorySlug,
        subcategorySlug: subcat,
        productTypeSlug: pt,
        confidence: "medium",
        legacyCategorySlug: legacySlug,
      };
    }
    const [subcat, pt] = cfg.default;
    return {
      kind: "mapped",
      productId: product.id,
      categorySlug: cfg.categorySlug,
      subcategorySlug: subcat,
      productTypeSlug: pt,
      confidence: "low",
      legacyCategorySlug: legacySlug,
    };
  }

  /* 3) Find taxonomy node by slug OR legacySlug */
  const node =
    taxo.nodes.find((n) => n.slug === legacySlug) ||
    taxo.nodes.find((n) => n.legacySlugs.includes(legacySlug));

  if (!node) {
    return {
      kind: "review",
      productId: product.id,
      proposedCategory: "accessories",
      proposedSubcategory: "misc-accessories",
      proposedProductType: "misc-accessories",
      confidence: "low",
      reason: `التصنيف السابق "${legacySlug}" غير موجود في التصنيف الرئيسي — مراجعة يدوية مطلوبة`,
      legacyCategorySlug: legacySlug,
    };
  }

  const ancestors = taxo.ancestors(node);
  const category = ancestors.find((n) => n.type === "CATEGORY");

  /* PRODUCT_TYPE node → direct mapping */
  if (node.type === "PRODUCT_TYPE") {
    const subcategory = ancestors.find((n) => n.type === "SUBCATEGORY");
    return {
      kind: "mapped",
      productId: product.id,
      categorySlug: category.slug,
      subcategorySlug: subcategory ? subcategory.slug : node.slug,
      productTypeSlug: node.slug,
      confidence: "high",
      legacyCategorySlug: legacySlug,
    };
  }

  /* SUBCATEGORY node → refine to a PRODUCT_TYPE child (or self as leaf) */
  if (node.type === "SUBCATEGORY") {
    const children = taxo.childrenOf(node.id).filter((c) => c.type === "PRODUCT_TYPE");
    if (children.length === 0) {
      return {
        kind: "mapped",
        productId: product.id,
        categorySlug: category.slug,
        subcategorySlug: node.slug,
        productTypeSlug: node.slug,
        confidence: "high",
        legacyCategorySlug: legacySlug,
      };
    }
    const cfg = refineRules[node.slug];
    let confidence = "low";
    let ptSlug = cfg?.default || children[0].slug;
    let subcatSlug = node.slug;
    if (cfg) {
      const hit = pickRule(cfg.rules, text);
      if (hit) {
        const rulePt = hit[hit.length - 1];
        if (children.some((c) => c.slug === rulePt)) {
          ptSlug = rulePt;
          confidence = "medium";
        } else {
          /* Cross-branch refine: the matched PRODUCT_TYPE lives under another
             SUBCATEGORY (e.g. hair-masks under hair-moisturizing). Resolve its
             real parent so the mapping stays valid. */
          const target = taxo.nodes.find((n) => n.type === "PRODUCT_TYPE" && n.slug === rulePt);
          const targetParent = target ? taxo.byId.get(target.parentId) : undefined;
          if (target && targetParent && targetParent.type === "SUBCATEGORY") {
            ptSlug = rulePt;
            subcatSlug = targetParent.slug;
            confidence = "medium";
          }
        }
      } else if (cfg.rules.length === 0) {
        confidence = "medium";
      }
    }
    if (confidence === "low") {
      const globalBest = findGlobalBest(text, taxo);
      if (globalBest) {
        return {
          kind: "mapped",
          productId: product.id,
          categorySlug: globalBest.categorySlug,
          subcategorySlug: globalBest.subcategorySlug,
          productTypeSlug: globalBest.productTypeSlug,
          confidence: "medium",
          legacyCategorySlug: legacySlug,
        };
      }
    }
    return {
      kind: "mapped",
      productId: product.id,
      categorySlug: category.slug,
      subcategorySlug: subcatSlug,
      productTypeSlug: ptSlug,
      confidence,
      legacyCategorySlug: legacySlug,
    };
  }

  /* CATEGORY node → try global keyword scoring before falling back to default low */
  const globalBest = findGlobalBest(text, taxo);
  if (globalBest) {
    return {
      kind: "mapped",
      productId: product.id,
      categorySlug: globalBest.categorySlug,
      subcategorySlug: globalBest.subcategorySlug,
      productTypeSlug: globalBest.productTypeSlug,
      confidence: "medium",
      legacyCategorySlug: legacySlug,
    };
  }
  const subcats = taxo.childrenOf(node.id).filter((c) => c.type === "SUBCATEGORY");
  if (subcats.length === 0) {
    return {
      kind: "review",
      productId: product.id,
      proposedCategory: node.slug,
      proposedSubcategory: node.slug,
      proposedProductType: node.slug,
      confidence: "low",
      reason: `فئة "${node.slug}" بلا فروع — مراجعة يدوية مطلوبة`,
      legacyCategorySlug: legacySlug,
    };
  }
  const subcat = subcats[0];
  const pts = taxo.childrenOf(subcat.id).filter((c) => c.type === "PRODUCT_TYPE");
  return {
    kind: "mapped",
    productId: product.id,
    categorySlug: node.slug,
    subcategorySlug: subcat.slug,
    productTypeSlug: pts[0] ? pts[0].slug : subcat.slug,
    confidence: "low",
    legacyCategorySlug: legacySlug,
  };
}

/* ────────────────────────────── Build + write ────────────────────────────── */
const taxo = loadTaxonomy();
const products = loadProducts();
const mappings = {};
const review = [];

for (const p of products) {
  const res = mapProduct(p, taxo);
  if (res.kind === "review") {
    review.push({
      productId: res.productId,
      proposedCategory: res.proposedCategory,
      proposedSubcategory: res.proposedSubcategory,
      proposedProductType: res.proposedProductType,
      confidence: res.confidence,
      reason: res.reason,
    });
  } else {
    mappings[p.id] = {
      productId: p.id,
      categorySlug: res.categorySlug,
      subcategorySlug: res.subcategorySlug,
      productTypeSlug: res.productTypeSlug,
      confidence: res.confidence,
      status: "MAPPED",
      legacyCategorySlug: res.legacyCategorySlug,
    };
  }
}

const outDir = join(root, "src/lib/taxonomy");
mkdirSync(outDir, { recursive: true });

const lines = [];
lines.push('import type { ProductTaxonomyMapping, ReviewRequiredItem } from "@/src/types/taxonomy";');
lines.push("");
lines.push("/**");
lines.push(" * AUTO-GENERATED by scripts/taxonomy/generate-mappings.mjs — DO NOT EDIT BY HAND.");
lines.push(" * Run `node scripts/taxonomy/generate-mappings.mjs` to regenerate.");
lines.push(" * Maps every product (via its legacy categorySlug) onto the Master Taxonomy.");
lines.push(" */");
lines.push("");
lines.push(`export const productMappings: Record<string, ProductTaxonomyMapping> = {`);
for (const [id, m] of Object.entries(mappings)) {
  const reason = m.reason ? `, reason: ${JSON.stringify(m.reason)}` : "";
  lines.push(
    `  ${JSON.stringify(id)}: { productId: ${JSON.stringify(m.productId)}, categorySlug: ${JSON.stringify(m.categorySlug)}, subcategorySlug: ${JSON.stringify(m.subcategorySlug)}, productTypeSlug: ${JSON.stringify(m.productTypeSlug)}, confidence: "${m.confidence}", status: "MAPPED", legacyCategorySlug: ${JSON.stringify(m.legacyCategorySlug)}${reason} },`
  );
}
lines.push("};");
lines.push("");
lines.push(`export const reviewRequiredItems: ReviewRequiredItem[] = [`);
for (const r of review) {
  lines.push(
    `  { productId: ${JSON.stringify(r.productId)}, proposedCategory: ${JSON.stringify(r.proposedCategory)}, proposedSubcategory: ${JSON.stringify(r.proposedSubcategory)}, proposedProductType: ${JSON.stringify(r.proposedProductType)}, confidence: "${r.confidence}", reason: ${JSON.stringify(r.reason)} },`
  );
}
lines.push("];");
lines.push("");

writeFileSync(join(outDir, "product-mappings.ts"), lines.join("\n"), "utf8");

const mappedCount = Object.keys(mappings).length;
const reviewCount = review.length;
console.log(`Products parsed : ${products.length}`);
console.log(`MAPPED          : ${mappedCount}`);
console.log(`REVIEW_REQUIRED : ${reviewCount}`);
console.log(`Coverage        : ${((mappedCount / products.length) * 100).toFixed(2)}%`);
console.log(`Output          : src/lib/taxonomy/product-mappings.ts`);