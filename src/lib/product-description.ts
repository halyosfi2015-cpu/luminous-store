/**
 * PART 6 — PRODUCT DESCRIPTION (CANONICAL PIPELINE)
 * =================================================
 *
 * Rebuild product descriptions for the REAL Luminous catalog.
 *
 * VERIFIED PRODUCT FACTS
 *   → SOURCE VALIDATION
 *     → CONFLICT RESOLUTION
 *       → LUMINOUS EDITORIAL STRUCTURE
 *         → ORIGINAL DESCRIPTION
 *           → ORIGINALITY VALIDATION
 *             → CONSISTENCY VALIDATION
 *               → CONFIDENCE / STATUS
 *
 * NOT a synonym rewrite of Yaqoot. Yaqoot is allowed ONLY as a factual source,
 * NEVER as the writing template.
 *
 * Reuses (no duplicates):
 *  - src/lib/source-hierarchy.ts   (Part 3) — external source authority.
 *  - src/lib/product-name.ts       (Part 4) — identity facts + Arabic normalization.
 *
 * DRY-RUN / AUDIT — this module never writes to the catalog.
 */

import type { Product } from "@/src/types/product";
import { products } from "@/src/data/products";
import { onlyPublished } from "@/src/lib/publication";
import { SOURCE_HIERARCHY, detectSourceAgreement } from "@/src/lib/source-hierarchy";
import { extractNameFacts, normalizeName, tokenize } from "@/src/lib/product-name";
import categoryMapAr from "@/src/lib/category-ar.json";
import categoryMapEn from "@/src/lib/category-en.json";

/* ------------------------------------------------------------------------ */
/* CONSTANTS                                                                 */
/* ------------------------------------------------------------------------ */

export const SKIN_TYPE_AR: Record<string, string> = {
  dry: "جافة",
  oily: "دهنية",
  combination: "مختلطة",
  sensitive: "حساسة",
  normal: "عادية",
  all: "جميع أنواع البشرة",
};

export const SKIN_CONCERN_AR: Record<string, string> = {
  acne: "حب الشباب",
  dryness: "الجفاف",
  pigmentation: "التصبغات",
  aging: "علامات تقدم السن",
  redness: "الاحمرار",
  large_pores: "المسام الواسعة",
  uneven_texture: "ملمس البشرة غير المتساوي",
  dark_circles: "الهالات السوداء",
  oiliness: "اللمعان الزائد",
  sensitivity: "البشرة الحساسة",
};

/** Verified structural primary function per category (neutral, factual, safe). */
export const PRIMARY_FUNCTION_AR: Record<string, string> = {
  cleansers: "ينظف البشرة ويزيل الشوائب بلطف",
  toners: "يوازن البشرة ويحضرها لخطوات العناية التالية",
  serums: "يمنح البشرة عناية مركزة بمكونات فعالة",
  moisturizers: "يرطب البشرة ويدعم حاجزها الطبيعي",
  sunscreen: "يوفر حماية يومية من أشعة الشمس",
  "eye-care": "يعتني بمنطقة العين الحساسة",
  "lip-care": "يرطب الشفاه ويعتني بها",
  masks: "يمنح البشرة عناية مكثفة ومركزة",
  exfoliators: "يقشر البشرة بلطف ويزيل الخلايا الميتة",
  shampoo: "ينظف الشعر بلطف",
  conditioner: "ينعم الشعر ويغذيه",
  "hair-oils": "يغذي الشعر ويمنحه اللمعان",
  "hair-masks": "يغذي الشعر بعمق",
  "hair-treatments": "يعتني بفروة الرأس والشعر",
  "hair-styling": "يساعد على تثبيت تصفيفة الشعر",
  "hair-dyes": "يصبغ الشعر بلون ثابت",
  "hair-creams": "يغذي الشعر ويسهل تصفيفه",
  "hair-tools": "يساعد في العناية بالشعر وتمشيطه",
  "body-wash": "ينظف الجسم بلطف",
  "body-lotion": "يرطب الجسم ويحافظ على نعومته",
  "body-oils": "يغذي البشرة ويمنحها النعومة",
  "body-scrubs": "يقشر الجسم بلطف ويحسن ملمسه",
  "body-care": "يعتني بجسم البشرة",
  "hand-care": "يعتني بيدين ناعمتين ومرطبتين",
  "foot-care": "يعتني ببشرة القدمين الجافة",
  "nail-care": "يقوي الأظافر ويدعم صحتها",
  "face-makeup": "يمنح الوجه مظهراً متناسقاً",
  "eye-makeup": "يبرز جمال العينين",
  "lip-makeup": "يمنح الشفاه لوناً ولمعاناً",
  "makeup-tools": "يساعد في تطبيق المكياج بدقة",
  makeup: "يمنح إطلالة مكياج متناسقة",
  "perfume-women": "يمنح المرأة عطراً أنثوياً مميزاً",
  "perfume-men": "يمنح الرجل عطراً قوياً مميزاً",
  "perfume-musk": "يمنح رائحة عطرية تدوم",
  "perfume-gift-sets": "يجمع عطوراً متنوعة في مجموعة هدية",
  perfume: "يمنح رائحة عطرية مميزة",
  "bakhoor-premium": "يمنح أجواء عطرية فاخرة",
  "bakhoor-oud": "يمنح رائحة العود الطبيعي الفاخرة",
  "baby-care": "يعتني ببشرة الأطفال الحساسة بلطف",
  vitamins: "يدعم الصحة اليومية بالفيتامينات والمكملات",
  "appliances-hair": "يساعد في تجفيف وتصفيف الشعر",
  "appliances-shaving": "يساعد في حلاقة أو تنظيف البشرة",
  "appliances-teeth": "يعتني بنظافة الأسنان",
  tools: "يدعم روتين العناية الشخصية",
  "beauty-tools": "يساعد في العناية بالبشرة والجسم",
  "women-care": "يعتني بالمنطقة الحميمة بلطف",
  "oral-care": "يعتني بنظافة الفم والأسنان",
  "contact-lenses": "ينظف العدسات اللاصقة ويحافظ عليها",
  deodorants: "يمنح الحماية من التعرق",
  "group-care": "يجمع خطوات العناية في مجموعة متكاملة",
  uncategorized: "يمنح عناية فعالة ومتكاملة",
};

export const PRIMARY_FUNCTION_EN: Record<string, string> = {
  cleansers: "cleanses the skin and removes impurities gently",
  toners: "balances and prepares the skin for the next steps",
  serums: "delivers concentrated, effective care",
  moisturizers: "hydrates the skin and supports its natural barrier",
  sunscreen: "provides daily sun protection",
  "eye-care": "cares for the delicate eye area",
  "lip-care": "moisturizes and cares for the lips",
  masks: "provides intensive, concentrated care",
  exfoliators: "gently exfoliates and removes dead cells",
  shampoo: "cleanses the hair gently",
  conditioner: "softens and nourishes the hair",
  "hair-oils": "nourishes the hair and adds shine",
  "hair-masks": "deeply nourishes the hair",
  "hair-treatments": "cares for the scalp and hair",
  "hair-styling": "helps set the hairstyle",
  "hair-dyes": "colors the hair with a lasting shade",
  "hair-creams": "nourishes the hair and eases styling",
  "hair-tools": "supports hair care and styling",
  "body-wash": "cleanses the body gently",
  "body-lotion": "moisturizes and keeps the body soft",
  "body-oils": "nourishes and softens the skin",
  "body-scrubs": "gently exfoliates the body and improves texture",
  "body-care": "cares for the body skin",
  "hand-care": "keeps hands soft and moisturized",
  "foot-care": "cares for dry foot skin",
  "nail-care": "strengthens nails and supports nail health",
  "face-makeup": "gives the face a balanced look",
  "eye-makeup": "enhances the eyes",
  "lip-makeup": "adds color and shine to the lips",
  "makeup-tools": "helps apply makeup precisely",
  makeup: "creates a balanced makeup look",
  "perfume-women": "gives a feminine signature scent",
  "perfume-men": "gives a distinctive masculine scent",
  "perfume-musk": "offers a long-lasting scent",
  "perfume-gift-sets": "combines fragrances in a gift set",
  perfume: "offers a distinctive scent",
  "bakhoor-premium": "creates a luxurious scent ambiance",
  "bakhoor-oud": "offers the scent of fine natural oud",
  "baby-care": "cares for delicate baby skin gently",
  vitamins: "supports daily wellness with vitamins and supplements",
  "appliances-hair": "helps dry and style hair",
  "appliances-shaving": "helps with shaving and skin care",
  "appliances-teeth": "supports dental cleanliness",
  tools: "supports a personal care routine",
  "beauty-tools": "supports skin and body care",
  "women-care": "gently cares for intimate areas",
  "oral-care": "supports oral hygiene",
  "contact-lenses": "cleans and preserves contact lenses",
  deodorants: "provides anti-perspirant protection",
  "group-care": "combines care steps in one set",
  uncategorized: "offers effective, complete care",
};

/** Arabic grammatical stop words — excluded from editorial comparison. */
export const AR_STOPWORDS = new Set([
  "من", "في", "علي", "الى", "عن", "مع", "ان", "ان", "هو", "هي", "هذا", "هذه",
  "التي", "الذي", "ما", "لا", "كل", "بعض", "بين", "عند", "بعد", "قبل", "حتي",
  "ايضا", "وكذلك", "فان", "حيث", "كما", "فقط", "عبر", "حول", "دون", "نحو",
  "منذ", "غير", "ثم", "ال", "وبعد", "وقد", "قد", "كان", "كانت", "يكون",
  "له", "لها", "لهم", "اليه", "اليها", "منها", "منه", "به", "بها", "لها",
  "عليها", "عليه", "انه", "انها", "بأنه", "فيه", "فيها", "معها", "معه",
  "بحجم", "عنايه", "العنايه", "منتج", "منتجات", "بتشكيله", "تشكيله",
  "لومينوس", "luminous", "اليومي", "اليوميه", "مناسب", "مناسبه", "يلبي",
  "احتياجك", "فعاله", "بمكونات", "متوهجه", "متوهج", "نضاره", "اليوم",
  "للنساء", "الحوامل", "التشكيله",
]);

/** Common cosmetic ingredient names (AR + EN) — used to detect invented ingredients. */
const KNOWN_INGREDIENTS_AR: string[] = [
  "جلسرين", "جليسرين", "حمض الهيالورونيك", "هيالورونيك", "نياسيناميد", "ريتينول",
  "حمض الساليسيليك", "حمض الجليكوليك", "حمض اللاكتيك", "كولاجين", "الكولاجين",
  "صبار", "الوفيرا", "الويفيرا", "بابونج", "شاي اخضر", "اخضر الشاي",
  "زبدة الشيا", "زيت الارغان", "زيت جوز الهند", "زيت الافوكادو", "زيت اللوز",
  "زيت الاكليل الجبل", "زيت الاكليل", "بانثينول", "فيتامين سي", "فيتامين ج",
  "فيتامين ه", "فيتامين ب5", "فيتامين b5", "سيراميد", "سيراميدات", "كيراتين",
  "بيتا جلوكان", "الاناناس", "البابايا", "حمض الكوجيك", "كوجيك اسيد",
  "عصير الليمون", "الكركم", "ماء الورد", "غليسيرين", "فازلين", "اكسيد الزنك",
  "ثاني اكسيد التيتانيوم", "احماض الدهون", "الجلسرين", "المشط",
];

const KNOWN_INGREDIENTS_EN: string[] = [
  "glycerin", "glycerine", "hyaluronic acid", "niacinamide", "retinol",
  "salicylic acid", "glycolic acid", "lactic acid", "collagen", "aloe vera",
  "aloe", "chamomile", "green tea", "shea butter", "argan oil", "coconut oil",
  "avocado oil", "almond oil", "rosemary oil", "panthenol", "vitamin c",
  "vitamin e", "ceramide", "ceramides", "keratin", "beta glucan", "papaya",
  "kojic acid", "zinc oxide", "titanium dioxide", "hyaluronic", "glycine",
  "caprylic", "squalane", "jojoba", "tea tree", "rose water", "tocopherol",
  "centella", "cica", "snail mucin", "peptides", "bakuchiol",
];

export const INGREDIENT_RE = new RegExp(
  `(?:${[...KNOWN_INGREDIENTS_AR, ...KNOWN_INGREDIENTS_EN]
    .sort((a, b) => b.length - a.length)
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})`,
  "gi"
);

/** Marketing/effect overclaims — unsupported unless verified in product facts. */
export const EFFECT_CLAIMS = new Set([
  "تفتيح", "مبيض", "تبييض", "توحيد لون", "مضاد للشيخوخه", "مضاد للتجاعيد",
  "مكافح للتجاعيد", "ازاله التصبغات", "ازالة التصبغات", "يقلل التجاعيد",
  "يوقف تساقط الشعر", "ينبت الشعر", "يكثف الشعر", "يطول الرموش", "يكثف الرموش",
  "نفخ الشفاه", "شد البشره", "شد التجاعيد", "تاخير الشيخوخه", "يجدد الخلايا",
  "تطويل الرموش", "توقف التساقط", "اعاده انبات الشعر", "نمو الشعر",
]);

export const PROHIBITED_CLAIM_RE = /(يعالج.{0,8}نهائي|نهائيا|نهائيه|نتيجه مضمونه|نتائج مضمونه|نتيجه فوريه|نتيجه فوري|فوريه|مفعول دائم|مثبت سريريا|مثبته سريريا|تثبت سريريا|مضمون|مضمونه|ضمان|يقضي نهائي|يزيل المشكله نهائي|بلا عوده|يشفي نهائيا|علاج نهائي|مفعول سحري|معجزه)/i;

export const DURATION_RE = /(خلال\s*\d+\s*(يوم|ايام|اسابيع|اسابيع|شهور|ساعات)|تدوم\s*\d+\s*ساعه|حمايه\s*لمده\s*\d+\s*ساعه|نتائج\s*خلال\s*\d+\s*(يوم|ايام|اسابيع))/i;

export const PERCENT_RE = /(\d+(?:\.\d+)?)\s*%/g;

/** Legacy structural signatures used by the audit to classify ORIGINAL defects. */
export const MECHANICAL_TRANSLATION_MARKER = "منتج عنايه من luminous بتشكيله";

/* ------------------------------------------------------------------------ */
/* TYPES                                                                     */
/* ------------------------------------------------------------------------ */

export type DescriptionStatus = "APPROVED" | "REVIEW_REQUIRED" | "REJECTED";

export interface DescriptionFacts {
  brand: string | undefined;
  brandAr: string | undefined;
  productType: string | undefined; // categorySlug
  productTypeAr: string | undefined;
  productTypeEn: string | undefined;
  variant: string | undefined;
  size: string | undefined;
  shade: string | undefined;
  spf: string | undefined;
  count: string | undefined;
  concentration: string | undefined;
  formulation: string | undefined;
  ingredients: string[]; // verified (Arabic names)
  ingredientsEn: string[]; // verified (English names)
  primaryFunction: string | undefined; // verified structural function
  targetConcerns: string[]; // verified (Arabic labels)
  skinTypes: string[]; // verified (Arabic labels)
  benefits: string[]; // verified (Arabic)
  benefitsEn: string[]; // verified (English)
  usage: string | undefined; // verified (Arabic)
  productName: { ar: string; en: string };
}

export interface DescriptionFactsClaim {
  brand?: string;
  productType?: string;
  size?: string;
  shade?: string;
  spf?: string;
  count?: string;
  variant?: string;
  concentration?: string;
  ingredients?: string[];
  skinTypes?: string[];
  targetConcerns?: string[];
}

export interface DescriptionSource {
  provider: string; // hierarchy key ("manufacturer"…"yaqoot") or "storeCatalog"
  rank: number;
  description?: string; // original text this source provides (template)
  facts?: DescriptionFactsClaim;
}

export type OriginalityStatus = "PASS" | "REVIEW_REQUIRED" | "REJECTED";

export interface OriginalityValidation {
  status: OriginalityStatus;
  score: number; // 0..100 (100 = fully original)
  editorialSimilarity: number; // 0..1 overlap on non-factual editorial content
  reasons: string[];
}

export interface UnsupportedFactsValidation {
  valid: boolean;
  issues: string[];
}

export interface ConsistencyValidation {
  status: "PASS" | "FAIL";
  mismatches: string[];
}

export interface SourceResolution {
  resolved: Partial<DescriptionFactsClaim>;
  agreements: string[];
  conflicts: string[];
  insufficient: string[];
}

export interface DescriptionDecision {
  productId: string;
  brand: string;
  productName: { ar: string; en: string };
  originalDescription: string;
  reconstructedDescription: { ar: string; en: string };
  verifiedFacts: DescriptionFacts;
  sourcesUsed: Array<{ provider: string; rank: number }>;
  sourceResolution: SourceResolution;
  originalityScore: number;
  confidenceScore: number;
  consistencyStatus: "PASS" | "FAIL";
  status: DescriptionStatus;
  reviewReasons: string[];
}

export interface DescriptionAudit {
  total: number;
  inspected: number;
  rebuilt: number;
  decisions: { approved: number; reviewRequired: number; rejected: number };
  exactCopyFailures: number;
  mechanicalParaphraseFailures: number;
  unsupportedFactFailures: number;
  sourceConflicts: number;
  nameDescriptionMismatches: number;
  insufficientSourceConfidence: number;
  originalityPasses: number;
  originalityFailures: number;
  originalDefects: {
    templateReproductions: number;
    mechanicalTranslations: number;
  };
}

export interface DescriptionBeforeAfterExample {
  productId: string;
  brand: string;
  productName: { ar: string; en: string };
  originalDescription: string;
  luminousDescription: string;
  verifiedSources: Array<{ provider: string; rank: number }>;
  verifiedFactsUsed: string[];
  originalityScore: number;
  confidenceScore: number;
  finalStatus: DescriptionStatus;
}

/* ------------------------------------------------------------------------ */
/* FACTS                                                                     */
/* ------------------------------------------------------------------------ */

export function extractDescriptionFacts(product: Product): DescriptionFacts {
  const f = extractNameFacts(product);
  const typeAr = f.productType ? ((categoryMapAr as Record<string, string>)[f.productType] ?? f.productType) : undefined;
  const typeEn = f.productType ? ((categoryMapEn as Record<string, string>)[f.productType] ?? f.productType) : undefined;

  const skinTypes: string[] = [];
  for (const s of product.skinTypes ?? []) {
    const label = SKIN_TYPE_AR[s] ?? s;
    if (label && !skinTypes.includes(label)) skinTypes.push(label);
  }
  const targetConcerns: string[] = [];
  for (const c of product.skinConcerns ?? []) {
    const label = SKIN_CONCERN_AR[c] ?? c;
    if (label && !targetConcerns.includes(label)) targetConcerns.push(label);
  }

  // Formulation — only when a known formulation token is verifiable in the name.
  let formulation: string | undefined;
  const norm = normalizeName((product.name?.ar ?? "") + " " + (product.name?.en ?? ""));
  const formulationTokens: Array<[RegExp, string]> = [
    [/رغوي|foam/, "رغوية"],
    [/سائل|liquid/, "سائلة"],
    [/هلامي|جل|gel/, "جل"],
    [/موس|mousse/, "موس"],
    [/بودره|powder/, "بودرة"],
    [/زيتي|oil/, "زيتية"],
  ];
  for (const [re, label] of formulationTokens) if (re.test(norm)) formulation = label;

  return {
    brand: f.brand,
    brandAr: f.brandAr,
    productType: f.productType,
    productTypeAr: typeAr,
    productTypeEn: typeEn,
    variant: f.variant,
    size: f.size,
    shade: f.shade,
    spf: f.spf,
    count: f.count,
    concentration: f.concentration,
    formulation,
    ingredients: (product.ingredients?.ar ?? []).filter((x) => typeof x === "string" && x.trim().length > 0),
    ingredientsEn: (product.ingredients?.en ?? []).filter((x) => typeof x === "string" && x.trim().length > 0),
    primaryFunction: f.productType ? PRIMARY_FUNCTION_AR[f.productType] : undefined,
    targetConcerns,
    skinTypes,
    benefits: (product.benefits?.ar ?? []).filter((x) => typeof x === "string" && x.trim().length > 0),
    benefitsEn: (product.benefits?.en ?? []).filter((x) => typeof x === "string" && x.trim().length > 0),
    usage: product.usageInstructions?.ar?.trim() || undefined,
    productName: product.name,
  };
}

/* ------------------------------------------------------------------------ */
/* TEXT UTILITIES                                                            */
/* ------------------------------------------------------------------------ */

function splitSentences(text: string): string[] {
  return String(text || "")
    .split(/[.!؟؟\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Tokens that represent verified identity facts — factual overlap, NOT editorial copying. */
function buildFactTokens(facts: DescriptionFacts): Set<string> {
  const set = new Set<string>();
  const add = (s: string | undefined) => {
    if (!s) return;
    for (const t of tokenize(normalizeName(s))) set.add(t);
  };
  add(facts.brand);
  add(facts.brandAr);
  add(facts.productTypeAr);
  add(facts.productTypeEn);
  add(facts.size);
  add(facts.spf);
  add(facts.count);
  add(facts.shade);
  add(facts.variant);
  add(facts.concentration);
  add(facts.formulation);
  add(facts.productName.ar);
  add(facts.productName.en);
  for (const ing of facts.ingredients) add(ing);
  for (const b of facts.benefits) add(b);
  for (const c of facts.targetConcerns) add(c);
  for (const s of facts.skinTypes) add(s);
  return set;
}

function editorialTokens(text: string, factTokens: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const t of tokenize(normalizeName(text))) {
    if (factTokens.has(t)) continue;
    if (AR_STOPWORDS.has(t)) continue;
    if (/^\d+$/.test(t)) continue;
    out.add(t);
  }
  return out;
}

/** Containment of original's editorial tokens within candidate (0..1). */
function editorialContainment(candidate: Set<string>, original: Set<string>): number {
  if (original.size === 0) return 0;
  let hit = 0;
  for (const t of original) if (candidate.has(t)) hit++;
  return hit / original.size;
}

function sentenceOrderPreserved(candidateSentences: string[], originalSentences: string[], factTokens: Set<string>): boolean {
  if (originalSentences.length === 0) return false;
  let matched = 0;
  let lastIdx = -1;
  for (const os of originalSentences) {
    const oEd = editorialTokens(os, factTokens);
    if (oEd.size === 0) continue;
    let found = -1;
    for (let i = lastIdx + 1; i < candidateSentences.length; i++) {
      const cEd = editorialTokens(candidateSentences[i], factTokens);
      if (cEd.size > 0 && editorialContainment(cEd, oEd) >= 0.7) {
        found = i;
        break;
      }
    }
    if (found >= 0) {
      matched++;
      lastIdx = found;
    }
  }
  return originalSentences.filter((s) => editorialTokens(s, factTokens).size > 0).length > 0 && matched / originalSentences.filter((s) => editorialTokens(s, factTokens).size > 0).length >= 0.6;
}

/* ------------------------------------------------------------------------ */
/* 1. ORIGINALITY VALIDATION                                                 */
/* ------------------------------------------------------------------------ */

export function validateOriginality(candidate: string, original: string, facts: DescriptionFacts): OriginalityValidation {
  const normC = normalizeName(candidate);
  const normO = normalizeName(original);
  const reasons: string[] = [];

  if (!normO || normO.length < 3) {
    return { status: "PASS", score: 100, editorialSimilarity: 0, reasons: ["no meaningful source text to compare"] };
  }

  // Exact copy
  if (normC === normO) {
    return { status: "REJECTED", score: 0, editorialSimilarity: 1, reasons: ["exact copy of the source description"] };
  }

  // Yaqoot text + "Luminous" appended
  const withoutLuminous = normC.replace(/(^|\s)(luminous|لومينوس)(\s|$)/g, " ");
  if (withoutLuminous.trim() === normO) {
    return { status: "REJECTED", score: 0, editorialSimilarity: 1, reasons: ["source description with only 'Luminous' appended"] };
  }

  const factTokens = buildFactTokens(facts);
  const cEd = editorialTokens(normC, factTokens);
  const oEd = editorialTokens(normO, factTokens);
  const sim = editorialContainment(cEd, oEd);

  // No meaningful editorial content in the source (e.g. pure template + name + brand)
  // → there is nothing editorial to copy.
  if (oEd.size <= 3) {
    return { status: "PASS", score: 100, editorialSimilarity: sim, reasons: ["source carries no meaningful editorial content to copy"] };
  }

  const cSentences = splitSentences(candidate);
  const oSentences = splitSentences(original);
  const orderPreserved = sentenceOrderPreserved(cSentences, oSentences, factTokens);

  if (sim >= 0.85) {
    return { status: "REJECTED", score: Math.max(0, Math.round(100 - sim * 100)), editorialSimilarity: sim, reasons: ["near copy — most editorial wording reproduced from the source"] };
  }
  if (sim >= 0.6) {
    if (orderPreserved) {
      return { status: "REJECTED", score: Math.max(0, Math.round(100 - sim * 100)), editorialSimilarity: sim, reasons: ["mechanical paraphrase with preserved sentence order"] };
    }
    return { status: "REVIEW_REQUIRED", score: Math.max(0, Math.round(100 - sim * 100)), editorialSimilarity: sim, reasons: ["high editorial overlap — mechanical paraphrase or synonym replacement suspected"] };
  }
  if (sim >= 0.35) {
    return { status: "REVIEW_REQUIRED", score: Math.max(0, Math.round(100 - sim * 100)), editorialSimilarity: sim, reasons: ["moderate editorial overlap with the source"] };
  }

  return { status: "PASS", score: Math.max(0, Math.round(100 - sim * 100)), editorialSimilarity: sim, reasons: ["independent editorial structure; factual overlap only"] };
}

/* ------------------------------------------------------------------------ */
/* 2. UNSUPPORTED-FACT VALIDATION                                            */
/* ------------------------------------------------------------------------ */

export function validateUnsupportedFacts(candidate: string, facts: DescriptionFacts): UnsupportedFactsValidation {
  const issues: string[] = [];
  const norm = normalizeName(candidate);
  const verifiedText = normalizeName(
    [facts.primaryFunction, facts.usage, ...facts.benefits, ...facts.benefitsEn, ...facts.targetConcerns, ...facts.ingredients, ...facts.ingredientsEn, facts.size, facts.spf]
      .filter(Boolean)
      .join(" ")
  );

  if (PROHIBITED_CLAIM_RE.test(norm)) issues.push("unsupported claim phrase (guarantee/absolute/clinical/duration)");
  if (DURATION_RE.test(norm)) issues.push("unsupported duration claim");

  // Invented percentages
  const declaredPercents = [...norm.matchAll(PERCENT_RE)].map((m) => m[1]);
  const verifiedConcentration = facts.concentration ? facts.concentration.replace(/\s*%/g, "") : undefined;
  for (const p of declaredPercents) {
    if (!verifiedConcentration || p !== verifiedConcentration) issues.push(`invented percentage (${p}%)`);
  }

  // Invented ingredients — compare against verified AR + EN ingredient names
  const mentionedIngredients = new Set<string>();
  for (const m of norm.matchAll(INGREDIENT_RE)) mentionedIngredients.add(normalizeName(m[0]));
  const verifiedIngredients = new Set([...facts.ingredients, ...facts.ingredientsEn].map((i) => normalizeName(i)));
  for (const ing of mentionedIngredients) {
    if (facts.brand && ing === normalizeName(facts.brand)) continue; // the product brand, not an ingredient claim
    if (!verifiedIngredients.has(ing) && !verifiedText.includes(ing)) issues.push(`invented ingredient (${ing})`);
  }

  // Invented effects
  for (const effect of EFFECT_CLAIMS) {
    if (norm.includes(effect) && !verifiedText.includes(effect)) issues.push(`unsupported effect claim (${effect})`);
  }

  // Unsupported skin suitability — only DIRECT suitability declarations,
  // never incidental descriptive words (e.g. "بشرة الأطفال الحساسة").
  for (const [slug, label] of Object.entries(SKIN_TYPE_AR)) {
    if (slug === "all") continue;
    const l = normalizeName(label);
    const suitabilityRe = new RegExp(`مناسب للبشره (?:ال)?${l}(?: وال| و)?`, "i");
    if (suitabilityRe.test(norm) && !facts.skinTypes.some((s) => normalizeName(s) === l)) issues.push(`unsupported skin suitability (${label})`);
  }

  return { valid: issues.length === 0, issues };
}

/* ------------------------------------------------------------------------ */
/* 3. CONSISTENCY VALIDATION (name ↔ description)                            */
/* ------------------------------------------------------------------------ */

const DECLARED_SIZE_RE = /(\d+(?:[.,،]\d+)?)\s*(مل|غرام|جم|غ|جرام|لتر|ليتر|كبسولات|كبسوله|اقراص|أقراص|حبات|حبه|قطعه|قطع|وحده|oz|فل اونص)/i;

export function validateConsistency(candidate: string, facts: DescriptionFacts): ConsistencyValidation {
  const mismatches: string[] = [];
  const norm = normalizeName(candidate);

  // Brand contradiction — only when an explicit "من ماركة X" declares a DIFFERENT brand.
  if (facts.brand) {
    const declared = norm.match(/من ماركه ([^\s،.]+)/i);
    if (declared) {
      const declaredBrand = declared[1];
      if (normalizeName(declaredBrand) !== normalizeName(facts.brand)) {
        mismatches.push(`description declares brand '${declaredBrand}' but product is '${facts.brand}'`);
      }
    }
  }

  // Size contradiction
  const declaredSize = norm.match(DECLARED_SIZE_RE);
  if (declaredSize && facts.size) {
    const declared = normalizeName(declaredSize[0]);
    const verifiedSizeNorm = normalizeName(facts.size);
    // The generated description embeds the verified size verbatim; the regex may
    // capture a prefix/substring, so only flag when the verified size is absent.
    if (declared !== verifiedSizeNorm && !norm.includes(verifiedSizeNorm)) {
      mismatches.push(`description size '${declaredSize[0]}' contradicts verified size '${facts.size}'`);
    }
  }

  // SPF contradiction
  const declaredSpf = norm.match(/spf\s*(\d+)/i);
  if (declaredSpf && facts.spf) {
    const declared = `spf${declaredSpf[1]}`;
    if (declared !== normalizeName(facts.spf)) mismatches.push(`description SPF '${declared}' contradicts verified SPF '${facts.spf}'`);
  }

  // Shade contradiction
  const declaredShade = norm.match(/(?:shade|درجه|ظل)\s*(\d+)/i);
  if (declaredShade && facts.shade) {
    if (declaredShade[1] !== facts.shade) mismatches.push(`description shade '${declaredShade[1]}' contradicts verified shade '${facts.shade}'`);
  }

  return { status: mismatches.length === 0 ? "PASS" : "FAIL", mismatches };
}

/* ------------------------------------------------------------------------ */
/* 4. SOURCE VALIDATION / CONFLICT RESOLUTION                                */
/* ------------------------------------------------------------------------ */

export function resolveDescriptionSources(sources: DescriptionSource[]): SourceResolution {
  const fields = [
    "brand", "productType", "size", "shade", "spf", "count", "variant", "concentration",
  ] as const;
  type ScalarClaimKey = (typeof fields)[number];
  const resolved: Partial<Pick<DescriptionFactsClaim, ScalarClaimKey>> = {};
  const agreements: string[] = [];
  const conflicts: string[] = [];
  const insufficient: string[] = [];

  for (const field of fields) {
    const votes: Array<{ rank: number; value: string }> = [];
    for (const s of sources) {
      const v = s.facts?.[field];
      if (v && typeof v === "string" && v.trim()) votes.push({ rank: s.rank, value: v });
    }
    if (votes.length === 0) {
      continue;
    }
    // Group by normalized value
    const groups = new Map<string, number>();
    const reps = new Map<string, { value: string; bestRank: number }>();
    for (const v of votes) {
      const key = normalizeName(v.value);
      groups.set(key, (groups.get(key) ?? 0) + 1);
      const rep = reps.get(key);
      if (!rep || v.rank < rep.bestRank) reps.set(key, { value: v.value, bestRank: v.rank });
    }
    const distinct = [...groups.entries()];
    if (distinct.length === 1) {
      agreements.push(`${field} agreed (${distinct[0][1] === 1 ? "single source" : "multiple sources agree"})`);
      resolved[field] = reps.get(distinct[0][0])!.value;
    } else {
      // Multiple distinct values → conflict; resolve by strongest source rank.
      const best = [...reps.values()].sort((a, b) => a.bestRank - b.bestRank)[0];
      const strongestRank = best.bestRank;
      const critical = votes.filter((v) => v.rank <= 3);
      resolved[field] = best.value;
      if (critical.length >= 2 && new Set(critical.map((c) => normalizeName(c.value))).size > 1) {
        conflicts.push(`${field} conflict between trusted sources (${votes.map((v) => `${v.value}@rank${v.rank}`).join(", ")})`);
      } else {
        conflicts.push(`${field} differs across sources — resolved to '${best.value}' (strongest rank ${strongestRank})`);
      }
    }
  }

  return { resolved, agreements, conflicts, insufficient };
}

/* ------------------------------------------------------------------------ */
/* 5. EDITORIAL GENERATION (LUMINOUS STRUCTURE)                              */
/* ------------------------------------------------------------------------ */

/** True when the text declares suitability for a skin type the product does not verify. */
function skinSuitabilityMismatch(text: string, facts: DescriptionFacts): boolean {
  const norm = normalizeName(text);
  for (const [slug, label] of Object.entries(SKIN_TYPE_AR)) {
    if (slug === "all") continue;
    const l = normalizeName(label);
    const re = new RegExp(`مناسب للبشره (?:ال)?${l}(?: وال| و)?`, "i");
    if (re.test(norm) && !facts.skinTypes.some((s) => normalizeName(s) === l)) return true;
  }
  return false;
}

/** True when the text declares a percentage that is not the verified concentration. */
function declaredPercentMismatch(text: string, facts: DescriptionFacts): boolean {
  const norm = normalizeName(text);
  const declared = [...norm.matchAll(PERCENT_RE)].map((m) => m[1]);
  if (declared.length === 0) return false;
  const verifiedConcentration = facts.concentration ? facts.concentration.replace(/\s*%/g, "") : undefined;
  return declared.some((p) => !verifiedConcentration || p !== verifiedConcentration);
}

/** A verified benefit is embeddable only when it cannot trigger an unsupported-fact or consistency violation. */
function isSafeBenefit(b: string, facts: DescriptionFacts): boolean {
  const norm = normalizeName(b);
  if (b.trim().length < 5 || b.trim().length > 90) return false;
  if (PROHIBITED_CLAIM_RE.test(norm) || DURATION_RE.test(norm)) return false;
  if (declaredPercentMismatch(b, facts)) return false;
  if (skinSuitabilityMismatch(b, facts)) return false;
  if (/من ماركه|من ماركة/.test(norm)) return false;
  if (/(^| )يعمل علي (?!ان )[ياتنسو]/.test(norm)) return false;
  return true;
}

/** First usage sentence, embedded only when it is short, factual and cannot violate the validators. */
function safeUsageSentence(usage: string, facts: DescriptionFacts): string {
  const first = usage.split(/[.!؟؟\n]+/)[0].trim();
  const norm = normalizeName(first);
  if (first.length === 0 || first.length >= 160) return "";
  if (PROHIBITED_CLAIM_RE.test(norm) || DURATION_RE.test(norm)) return "";
  if (declaredPercentMismatch(first, facts)) return "";
  if (skinSuitabilityMismatch(first, facts)) return "";
  if (/من ماركه|من ماركة/.test(norm)) return "";
  if (/(^| )يعمل علي (?!ان )[ياتنسو]/.test(norm)) return "";
  return first;
}

export function generateDescription(product: Product, facts: DescriptionFacts): { ar: string; en: string } {
  const typeAr = facts.productTypeAr ?? "منتج";
  const typeEn = facts.productTypeEn ?? "skincare product";
  const brand = (facts.brandAr || facts.brand || "").replace(/^(ماركه|ماركة)\s+/i, "").trim();
  const fn = facts.primaryFunction;

  // A. What it is — identity, formulation, size, concentration, SPF, primary function
  const attrs: string[] = [];
  if (facts.formulation) attrs.push(`بتركيبة ${facts.formulation}`);
  if (facts.size) attrs.push(`بحجم ${facts.size}`);
  if (facts.concentration) attrs.push(`بتركيز ${facts.concentration}`);
  if (facts.spf && /^spf\d+$/.test(normalizeName(facts.spf))) attrs.push(`بعامل حماية ${facts.spf}`);
  const head = `${brand ? brand + " " : ""}${typeAr}`;
  const attrClause = attrs.length ? ` ${attrs.join(" ")}` : "";
  const s1 = `${head}${attrClause}${fn ? `، ${fn}` : ""}.`;

  // B. Verified benefits as natural prose (never a bare bullet list)
  const safeBenefits = facts.benefits.filter((b) => isSafeBenefit(b, facts));
  let s2 = "";
  if (safeBenefits.length > 0) {
    s2 = ` كما أنه ${safeBenefits.slice(0, 2).join("، و")}.`;
  }

  // C. Who it is for — verified skin types and target concerns
  const st = facts.skinTypes.slice(0, 3);
  let s3 = "";
  if (st.length > 0) {
    if (st.length === 1 && normalizeName(st[0]).includes("جميع")) s3 = ` وهو مناسب لجميع أنواع البشرة`;
    else s3 = ` وهو مناسب للبشرة ${st.join(" و")}`;
  }
  const concerns = facts.targetConcerns.slice(0, 2);
  if (concerns.length > 0) s3 = `${s3 ? s3 + "،" : " وهو"} يلبي احتياجات البشرة التي تعاني من ${concerns.join(" و")}`;
  if (s3) s3 = s3 + ".";

  // D. Main ingredients (verified)
  let s4 = "";
  if (facts.ingredients.length > 0) s4 = ` تتضمن تركيبته مكونات مثل ${facts.ingredients.slice(0, 3).join(" و")}.`;

  // E. How to use (verified, safe first sentence only)
  let s5 = "";
  if (facts.usage) {
    const u = safeUsageSentence(facts.usage, facts);
    if (u) s5 = ` طريقة الاستخدام: ${u}.`;
  }

  const ar = `${s1}${s2}${s3}${s4}${s5}`.trim();

  // English mirror (Arabic-first; concise, verified facts only)
  const fnEn = facts.productType ? (PRIMARY_FUNCTION_EN[facts.productType] ?? "") : "";
  const attrsEn: string[] = [];
  if (facts.size) attrsEn.push(facts.size);
  if (facts.concentration) attrsEn.push(facts.concentration);
  const headEn = `${brand ? brand + " " : ""}${typeEn}`.trim();
  const s1En = `${headEn}${attrsEn.length ? ` (${attrsEn.join(", ")})` : ""}${fnEn ? ` that ${fnEn}` : ""}.`;
  const skinEn = (product.skinTypes ?? []).filter((s) => s !== "all").slice(0, 3).map((s) => SKIN_TYPE_AR[s] ?? s);
  const s2En = skinEn.length > 0 ? ` Suitable for ${skinEn.join(", ")} skin.` : "";
  const ingEn = (product.ingredients?.en ?? []).slice(0, 3);
  const s3En = ingEn.length > 0 ? ` Key ingredients include ${ingEn.join(", ")}.` : "";

  const en = `${s1En}${s2En}${s3En}`.trim();

  return { ar, en };
}

/* ------------------------------------------------------------------------ */
/* 6. CONFIDENCE                                                             */
/* ------------------------------------------------------------------------ */

function computeConfidence(input: {
  sources: DescriptionSource[];
  facts: DescriptionFacts;
  originality: OriginalityValidation;
  unsupported: UnsupportedFactsValidation;
  consistency: ConsistencyValidation;
  sourceResolution: SourceResolution;
}): number {
  let c = 100;
  const bestRank = Math.min(...input.sources.map((s) => s.rank));
  c -= (bestRank - 1) * 3;

  const factSlots = [
    !!input.facts.brand,
    !!input.facts.productType,
    !!input.facts.size,
    input.facts.ingredients.length > 0,
    input.facts.skinTypes.length > 0,
    !!input.facts.usage,
    input.facts.benefits.length > 0,
  ];
  const completeness = factSlots.filter(Boolean).length / factSlots.length;
  c -= Math.round((1 - completeness) * 15);

  c -= Math.round(((100 - input.originality.score) / 100) * 15);
  if (!input.unsupported.valid) c -= 40;
  if (input.consistency.status === "FAIL") c -= 30;
  c -= input.sourceResolution.conflicts.length * 10;

  return Math.max(0, Math.min(100, Math.round(c)));
}

/* ------------------------------------------------------------------------ */
/* 7. PIPELINE                                                               */
/* ------------------------------------------------------------------------ */

export function selectProductDescription(product: Product, externalSources?: DescriptionSource[]): DescriptionDecision {
  const facts = extractDescriptionFacts(product);
  const sources: DescriptionSource[] =
    externalSources && externalSources.length > 0
      ? externalSources
      : [{ provider: "storeCatalog", rank: 1, description: product.description?.ar ?? "" }];

  const sourceResolution = resolveDescriptionSources(sources);
  const original =
    sources.filter((s) => s.description && s.description.trim()).sort((a, b) => a.rank - b.rank)[0]?.description?.trim() ??
    product.description?.ar ??
    "";

  const candidate = generateDescription(product, facts);
  const originality = validateOriginality(candidate.ar, original, facts);
  const unsupported = validateUnsupportedFacts(candidate.ar + " " + candidate.en, facts);
  const consistency = validateConsistency(candidate.ar, facts);

  const confidence = computeConfidence({ sources, facts, originality, unsupported, consistency, sourceResolution });

  const reviewReasons: string[] = [];
  let status: DescriptionStatus = "APPROVED";

  if (originality.status === "REJECTED") {
    status = "REJECTED";
    reviewReasons.push(...originality.reasons.map((r) => `originality: ${r}`));
  } else if (!unsupported.valid) {
    status = "REJECTED";
    reviewReasons.push(...unsupported.issues.map((i) => `unsupported fact: ${i}`));
  } else if (consistency.status === "FAIL") {
    status = "REJECTED";
    reviewReasons.push(...consistency.mismatches.map((m) => `consistency: ${m}`));
  }

  if (status === "APPROVED") {
    const criticalConflict = sourceResolution.conflicts.filter((c) => c.includes("trusted sources"));
    if (originality.status === "REVIEW_REQUIRED") {
      status = "REVIEW_REQUIRED";
      reviewReasons.push(...originality.reasons.map((r) => `originality: ${r}`));
    } else if (criticalConflict.length > 0) {
      status = "REVIEW_REQUIRED";
      reviewReasons.push(...criticalConflict);
    } else if (sourceResolution.conflicts.length > 0) {
      status = "REVIEW_REQUIRED";
      reviewReasons.push(...sourceResolution.conflicts);
    } else if (sourceResolution.insufficient.length > 0) {
      status = "REVIEW_REQUIRED";
      reviewReasons.push(...sourceResolution.insufficient.map((i) => `insufficient evidence: ${i}`));
    } else if (confidence < 70) {
      status = "REVIEW_REQUIRED";
      reviewReasons.push(`insufficient source confidence (${confidence})`);
    }
  }

  if (status === "APPROVED") {
    reviewReasons.push(`independent editorial description; verified facts only; confidence ${confidence}`);
  }

  return {
    productId: product.id,
    brand: product.brand,
    productName: product.name,
    originalDescription: original,
    reconstructedDescription: candidate,
    verifiedFacts: facts,
    sourcesUsed: sources.map((s) => ({ provider: s.provider, rank: s.rank })),
    sourceResolution,
    originalityScore: originality.score,
    confidenceScore: confidence,
    consistencyStatus: consistency.status,
    status,
    reviewReasons,
  };
}

/* ------------------------------------------------------------------------ */
/* 8. AUDIT (DRY-RUN over the real catalog)                                  */
/* ------------------------------------------------------------------------ */

function legacyTemplateOpeners(): Set<string> {
  const all = onlyPublished(products);
  const counts = new Map<string, number>();
  for (const p of all) {
    const ar = (p.description?.ar ?? "").trim();
    const m = ar.match(/^([^—]{2,80}) —/);
    if (m) counts.set(m[1].trim(), (counts.get(m[1].trim()) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, v]) => v >= 5).map(([k]) => k));
}

function detectOriginalDefect(product: Product, sharedOpeners: Set<string>): "templateReproduction" | "mechanicalTranslation" | null {
  const ar = (product.description?.ar ?? "").trim();
  const norm = normalizeName(ar);
  if (norm.includes(MECHANICAL_TRANSLATION_MARKER)) return "mechanicalTranslation";
  const m = ar.match(/^([^—]{2,80}) —/);
  if (m && sharedOpeners.has(m[1].trim())) return "templateReproduction";
  return null;
}

export function runDescriptionAudit(catalog?: Product[]): DescriptionAudit {
  const all = onlyPublished(catalog ?? products);
  const sharedOpeners = legacyTemplateOpeners();

  const audit: DescriptionAudit = {
    total: all.length,
    inspected: 0,
    rebuilt: 0,
    decisions: { approved: 0, reviewRequired: 0, rejected: 0 },
    exactCopyFailures: 0,
    mechanicalParaphraseFailures: 0,
    unsupportedFactFailures: 0,
    sourceConflicts: 0,
    nameDescriptionMismatches: 0,
    insufficientSourceConfidence: 0,
    originalityPasses: 0,
    originalityFailures: 0,
    originalDefects: { templateReproductions: 0, mechanicalTranslations: 0 },
  };

  for (const product of all) {
    audit.inspected++;
    const d = selectProductDescription(product);
    if (d.reconstructedDescription.ar !== product.description?.ar) audit.rebuilt++;
    if (d.status === "APPROVED") audit.decisions.approved++;
    else if (d.status === "REVIEW_REQUIRED") audit.decisions.reviewRequired++;
    else audit.decisions.rejected++;

    if (d.originalityScore === 0) audit.exactCopyFailures++;
    if (d.reviewReasons.some((r) => r.includes("mechanical paraphrase"))) audit.mechanicalParaphraseFailures++;
    if (d.reviewReasons.some((r) => r.includes("unsupported fact"))) audit.unsupportedFactFailures++;
    if (d.sourceResolution.conflicts.length > 0) audit.sourceConflicts++;
    if (d.consistencyStatus === "FAIL") audit.nameDescriptionMismatches++;
    if (d.reviewReasons.some((r) => r.includes("insufficient source confidence") || r.includes("insufficient evidence"))) audit.insufficientSourceConfidence++;
    if (d.originalityScore >= 60) audit.originalityPasses++;
    else audit.originalityFailures++;

    const defect = detectOriginalDefect(product, sharedOpeners);
    if (defect === "templateReproduction") audit.originalDefects.templateReproductions++;
    else if (defect === "mechanicalTranslation") audit.originalDefects.mechanicalTranslations++;
  }

  return audit;
}

/* ------------------------------------------------------------------------ */
/* 9. REAL EXAMPLES                                                          */
/* ------------------------------------------------------------------------ */

const EXAMPLE_IDS = ["yq-754", "yq-960", "yq-1680", "yq-2137", "yq-1051", "yq-2682", "yq-1900", "yq-2033", "yq-2215", "yq-1693", "yq-1695", "yq-2082"];

export function produceDescriptionExamples(limit = 12, catalog?: Product[]): DescriptionBeforeAfterExample[] {
  const all = onlyPublished(catalog ?? products);
  const samples = all.filter((p) => EXAMPLE_IDS.includes(p.id)).slice(0, limit);
  return samples.map((product) => {
    const d = selectProductDescription(product);
    const factsUsed: string[] = [];
    if (d.verifiedFacts.brand) factsUsed.push(`العلامة: ${d.verifiedFacts.brand}`);
    if (d.verifiedFacts.productTypeAr) factsUsed.push(`النوع: ${d.verifiedFacts.productTypeAr}`);
    if (d.verifiedFacts.size) factsUsed.push(`الحجم: ${d.verifiedFacts.size}`);
    if (d.verifiedFacts.concentration) factsUsed.push(`التركيز: ${d.verifiedFacts.concentration}`);
    if (d.verifiedFacts.ingredients.length > 0) factsUsed.push(`المكونات: ${d.verifiedFacts.ingredients.slice(0, 3).join("، ")}`);
    if (d.verifiedFacts.benefits.length > 0) factsUsed.push(`الفوائد: ${d.verifiedFacts.benefits.slice(0, 2).join("، ")}`);
    if (d.verifiedFacts.skinTypes.length > 0) factsUsed.push(`المناسب: ${d.verifiedFacts.skinTypes.slice(0, 2).join("، ")}`);
    return {
      productId: product.id,
      brand: product.brand,
      productName: product.name,
      originalDescription: d.originalDescription,
      luminousDescription: d.reconstructedDescription.ar,
      verifiedSources: d.sourcesUsed,
      verifiedFactsUsed: factsUsed,
      originalityScore: d.originalityScore,
      confidenceScore: d.confidenceScore,
      finalStatus: d.status,
    };
  });
}

export { SOURCE_HIERARCHY, detectSourceAgreement };