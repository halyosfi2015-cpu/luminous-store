/**
 * PART 7 — PRODUCT BENEFITS (CANONICAL PIPELINE)
 * =================================================
 *
 * Rebuild product-benefit bullets for the REAL Luminous catalog.
 *
 * VERIFIED BENEFIT FACTS (function / effect, each with evidence)
 *   → BENEFIT GENERATION (2–6 distinct bullets)
 *     → ORIGINALITY VALIDATION
 *       → UNSUPPORTED-FACT VALIDATION
 *         → DUPLICATE VALIDATION
 *           → CONSISTENCY VALIDATION
 *             → CONFIDENCE / STATUS
 *
 * FUNCTION  = what the product does (category action / targeted concern / suitability)
 * EFFECT    = what a verified ingredient achieves (evidence = the ingredient)
 *
 * NOT a synonym rewrite of the existing template bullets. The existing benefits are
 * template copies shared across products; they are rebuilt independently.
 *
 * Reuses (no duplicates):
 *  - src/lib/source-hierarchy.ts        (Part 3) — external source authority.
 *  - src/lib/product-name.ts            (Part 4) — Arabic normalization / tokenization.
 *  - src/lib/product-description.ts     (Part 6) — facts, validators, constants.
 *
 * DRY-RUN / AUDIT — this module never writes to the catalog.
 */

import type { Product } from "@/src/types/product";
import { products } from "@/src/data/products";
import { onlyPublished } from "@/src/lib/publication";
import { normalizeName, tokenize } from "@/src/lib/product-name";
import {
  SKIN_TYPE_AR,
  SKIN_CONCERN_AR,
  PRIMARY_FUNCTION_AR,
  PRIMARY_FUNCTION_EN,
  AR_STOPWORDS,
  extractDescriptionFacts,
  validateUnsupportedFacts,
  validateConsistency,
  resolveDescriptionSources,
} from "@/src/lib/product-description";
import type { DescriptionFacts, DescriptionSource, OriginalityValidation } from "@/src/lib/product-description";

/* ------------------------------------------------------------------------ */
/* TYPES                                                                     */
/* ------------------------------------------------------------------------ */

export type BenefitKind = "function" | "effect";

export interface BenefitFact {
  ar: string;
  en: string;
  kind: BenefitKind;
  evidence: string; // machine key: "category:…" | "ingredient:…" | "concern:…" | "skinTypes:…"
  source: string; // human-readable evidence label
}

export type BenefitStatus = "APPROVED" | "REVIEW_REQUIRED" | "REJECTED";

export interface BenefitDecision {
  productId: string;
  brand: string;
  productName: { ar: string; en: string };
  originalBenefits: { ar: string[]; en: string[] };
  reconstructedBenefits: { ar: string[]; en: string[] };
  benefitFacts: BenefitFact[];
  functionCount: number;
  effectCount: number;
  evidenceSummary: string[];
  originalityScore: number;
  confidenceScore: number;
  duplicateIssues: string[];
  unsupportedIssues: string[];
  consistencyIssues: string[];
  status: BenefitStatus;
  reviewReasons: string[];
}

export interface BenefitAudit {
  total: number;
  inspected: number;
  rebuilt: number;
  decisions: { approved: number; reviewRequired: number; rejected: number };
  copied: number;
  mechanicalParaphrase: number;
  duplicates: number;
  unsupported: number;
  inventedEffects: number;
  sourceConflicts: number;
  insufficientEvidence: number;
  mismatches: number;
  originalityPasses: number;
  originalityFailures: number;
}

export interface BenefitBeforeAfterExample {
  productId: string;
  brand: string;
  productName: { ar: string; en: string };
  originalBenefits: string[];
  luminousBenefits: string[];
  functionBenefits: BenefitFact[];
  effectBenefits: BenefitFact[];
  evidence: string[];
  originalityScore: number;
  confidenceScore: number;
  finalStatus: BenefitStatus;
}

/* ------------------------------------------------------------------------ */
/* BENEFIT CONTENT MAPS                                                       */
/* ------------------------------------------------------------------------ */

/** Verified effect of a known ingredient (kind = "effect"). */
const INGREDIENT_EFFECTS: Record<string, { ar: string; en: string }> = {
  "حمض الهيالورونيك": { ar: "يرطب البشرة بعمق ويحبس الرطوبة", en: "deeply hydrates the skin and locks in moisture" },
  "جلسرين": { ar: "يجذب الرطوبة ويرطب البشرة", en: "attracts moisture and hydrates the skin" },
  "غليسيرين": { ar: "يجذب الرطوبة ويرطب البشرة", en: "attracts moisture and hydrates the skin" },
  "فيتامين ه": { ar: "يدعم حاجز البشرة الطبيعي", en: "supports the skin's natural barrier" },
  "فيتامين ا": { ar: "يدعم حماية البشرة بمضادات الأكسدة", en: "supports skin protection with antioxidants" },
  "فيتامين ج": { ar: "يدعم حماية البشرة بمضادات الأكسدة", en: "supports skin protection with antioxidants" },
  "نياسيناميد": { ar: "يهدئ البشرة ويدعم توازنها", en: "soothes the skin and supports its balance" },
  "سيراميد": { ar: "يدعم حاجز البشرة ويحافظ على رطوبتها", en: "supports the skin barrier and retains moisture" },
  "الريتينول": { ar: "يساعد على تنعيم ملمس البشرة", en: "helps smooth the look of skin texture" },
  "زبدة الشيا": { ar: "ينعم البشرة ويغذيها", en: "softens and nourishes the skin" },
  "مستخلص الشاي الاخضر": { ar: "يهدئ البشرة ويدعم حمايتها", en: "calms the skin and supports its defenses" },
  "مستخلص الصبار": { ar: "يرطب البشرة ويهدئها", en: "hydrates and soothes the skin" },
  "بابونج": { ar: "يهدئ البشرة", en: "calms the skin" },
  "زيت جوز الهند": { ar: "ينعم ويغذي البشرة", en: "softens and nourishes the skin" },
  "شمع العسل": { ar: "يرطب ويحمي البشرة", en: "moisturizes and protects the skin" },
  "زيت الخروع": { ar: "يغذي ويقوي الشعر", en: "nourishes and strengthens the hair" },
  "زيت اللوز": { ar: "ينعم البشرة", en: "softens the skin" },
  "زيت اللوز الحلو": { ar: "ينعم البشرة", en: "softens the skin" },
  "طين الكاولين": { ar: "يمتص الزيوت الزائدة وينقي البشرة", en: "absorbs excess oil and purifies the skin" },
  "فحم نباتي": { ar: "ينقي البشرة ويمتص الشوائب", en: "purifies the skin and draws out impurities" },
  "عسل": { ar: "يرطب البشرة ويهدئها", en: "hydrates and soothes the skin" },
  "اكسيد الزنك": { ar: "يوفر حماية واسعة من أشعة الشمس", en: "provides broad sun protection" },
  "ثاني اكسيد التيتانيوم": { ar: "يوفر حماية من أشعة الشمس", en: "provides sun protection" },
  "الانتوين": { ar: "يهدئ البشرة", en: "calms the skin" },
  "مستخلص الشوفان": { ar: "يهدئ البشرة الحساسة", en: "soothes sensitive skin" },
  "كيراتين": { ar: "يساعد على دعم قوة الشعر ونعومته", en: "helps support hair strength and softness" },
  "بانثينول": { ar: "يرطب البشرة ويهدئها", en: "hydrates and soothes the skin" },
  "ماء الورد": { ar: "ينعش البشرة", en: "refreshes the skin" },
  "كولاجين": { ar: "يدعم مرونة البشرة", en: "supports skin elasticity" },
  "بيوتين": { ar: "يدعم صحة الشعر", en: "supports hair health" },
  "الجلوتاثيون": { ar: "يدعم حماية البشرة", en: "supports skin protection" },
  "مسك": { ar: "يمنح نفحة مسك هادئة وعميقة", en: "offers a calm, deep musk note" },
  "عنبر": { ar: "يمنح نفحة عنبر دافئة", en: "offers a warm amber note" },
  "عود": { ar: "يمنح نفحة عود أصيلة", en: "offers an authentic oud note" },
  "دهن العود": { ar: "يمنح نفحة عود أصيلة وفاخرة", en: "offers an authentic, rich oud note" },
  "عود فاخر": { ar: "يمنح نفحة عود أصيلة وفاخرة", en: "offers an authentic, rich oud note" },
  "عود كمبودي": { ar: "يمنح نفحة عود كمبودي الفاخرة", en: "offers a rich Cambodian oud note" },
  "عود هندي": { ar: "يمنح نفحة عود هندي الفاخرة", en: "offers a rich Indian oud note" },
  "عود ملاوي": { ar: "يمنح نفحة عود ملاوي الفاخرة", en: "offers a rich Malayan oud note" },
  "فانيليا": { ar: "يمنح نفحة فانيليا دافئة", en: "offers a warm vanilla note" },
  "خشب الصندل": { ar: "يمنح نفحة خشب الصندل الهادئة", en: "offers a calm sandalwood note" },
  "زيت الارغان": { ar: "يغذي ويمنح ملمساً ناعماً", en: "nourishes and gives a soft feel" },
  "زيت الورد": { ar: "ينعش البشرة ويمنحها النعومة", en: "refreshes the skin and softens it" },
  "مستخلص الخيار": { ar: "ينعش البشرة ويرطبها", en: "refreshes and hydrates the skin" },
  "زنك": { ar: "يدعم صحة البشرة", en: "supports skin health" },
  "الكافيين": { ar: "يدعم انتعاش البشرة", en: "supports a refreshed look" },
  "ببتيدات": { ar: "يدعم مرونة البشرة", en: "supports skin elasticity" },
  "حمض الساليسيليك": { ar: "ينقي المسام ويهدئ البشرة", en: "cleanses pores and soothes the skin" },
  "حمض الجليكوليك": { ar: "يقشر البشرة بلطف", en: "gently exfoliates the skin" },
  "حبيبات دقيقة": { ar: "يوفر تقشيراً لطيفاً", en: "provides gentle exfoliation" },
  "ماء ورد": { ar: "ينعش البشرة", en: "refreshes the skin" },
  "مستخلص البابونج": { ar: "يهدئ البشرة بلطف", en: "gently calms the skin" },
  "غلسرين": { ar: "يجذب الرطوبة ويرطب البشرة", en: "attracts moisture and hydrates the skin" },
  "فيتامين e": { ar: "يدعم حاجز البشرة الطبيعي", en: "supports the skin's natural barrier" },
  "فيتامين c": { ar: "يدعم حماية البشرة بمضادات الأكسدة", en: "supports skin protection with antioxidants" },
  "فيتامين a": { ar: "يدعم حماية البشرة بمضادات الأكسدة", en: "supports skin protection with antioxidants" },
};

/** Secondary verified function bullet per category (kind = "function"). */
export const CATEGORY_SECONDARY: Record<string, { ar: string; en: string }> = {
  cleansers: { ar: "يعيد للبشرة إحساس النظافة والانتعاش", en: "restores a clean, refreshed feeling to the skin" },
  toners: { ar: "يعيد للبشرة إحساس النقاء والانتعاش", en: "restores a clean, refreshed feeling to the skin" },
  serums: { ar: "يوفر عناية مركزة للبشرة", en: "delivers concentrated care" },
  moisturizers: { ar: "يساعد على تقوية حاجز البشرة", en: "helps strengthen the skin's barrier" },
  sunscreen: { ar: "يساعد على حماية البشرة من الأشعة الضارة", en: "helps protect skin from harmful rays" },
  "eye-care": { ar: "يهدئ منطقة العين الحساسة", en: "soothes the delicate eye area" },
  "lip-care": { ar: "يحافظ على نعومة الشفاه", en: "keeps lips soft" },
  masks: { ar: "يريح البشرة ويهدئها", en: "relaxes and soothes the skin" },
  exfoliators: { ar: "يزيل الخلايا الميتة بلطف", en: "gently removes dead skin cells" },
  shampoo: { ar: "يعتني بنظافة فروة الرأس", en: "cares for scalp cleanliness" },
  conditioner: { ar: "يساعد على فك تشابك الشعر", en: "helps detangle the hair" },
  "hair-oils": { ar: "يضفي على الشعر لمعاناً صحياً", en: "adds a healthy shine to the hair" },
  "hair-masks": { ar: "يمنح الشعر ترطيباً مكثفاً", en: "provides intensive hair hydration" },
  "hair-treatments": { ar: "يدعم صحة فروة الرأس", en: "supports scalp health" },
  "hair-styling": { ar: "يساعد على ثبات التصفيفة", en: "helps the style hold" },
  "hair-dyes": { ar: "يمنح الشعر لوناً يدوم", en: "gives long-lasting hair color" },
  "hair-creams": { ar: "يسهل تصفيف الشعر", en: "makes styling easier" },
  "hair-tools": { ar: "يسهل العناية بالشعر", en: "makes hair care easy" },
  "body-wash": { ar: "يعيد للبشرة إحساس النظافة", en: "restores a clean feeling to the skin" },
  "body-lotion": { ar: "يساعد على الحفاظ على نعومة الجسم", en: "helps keep the body soft" },
  "body-oils": { ar: "يمنح الجسم ملمساً ناعماً", en: "gives the body a soft feel" },
  "body-scrubs": { ar: "ينعم بشرة الجسم", en: "smooths the body's skin" },
  "body-care": { ar: "يعتني ببشرة الجسم", en: "cares for the body's skin" },
  "hand-care": { ar: "يساعد على الحفاظ على نعومة اليدين", en: "helps keep hands soft" },
  "foot-care": { ar: "ينعم بشرة القدمين ويهدئها", en: "smooths and soothes the feet" },
  "nail-care": { ar: "يدعم صحة الأظافر", en: "supports nail health" },
  "face-makeup": { ar: "يساعد على توزيع المنتج بسلاسة", en: "helps apply the product smoothly" },
  "eye-makeup": { ar: "يساعد على إبراز جمال العينين", en: "helps enhance the eyes" },
  "lip-makeup": { ar: "يمنح الشفاه ملمساً ناعماً", en: "gives the lips a smooth feel" },
  "makeup-tools": { ar: "يساعد على توزيع المكياج بسلاسة", en: "helps apply makeup smoothly" },
  makeup: { ar: "يساعد على ثبات المكياج", en: "helps makeup last" },
  "perfume-women": { ar: "يمنح حضوراً عطرياً أنثوياً", en: "leaves a feminine scent presence" },
  "perfume-men": { ar: "يمنح حضوراً عطرياً مميزاً", en: "leaves a distinctive scent presence" },
  "perfume-musk": { ar: "يمنح نفحة عطرية هادئة", en: "offers a calm, gentle scent note" },
  "perfume-gift-sets": { ar: "يجمع تشكيلة عطرية مناسبة للهدايا", en: "combines scents in a gift set" },
  perfume: { ar: "يمنح حضوراً عطرياً لافتاً", en: "leaves a noticeable scent presence" },
  "bakhoor-premium": { ar: "يملأ المكان بعبق فاخر", en: "fills the space with a luxurious scent" },
  "bakhoor-oud": { ar: "يدعم أجواء العود الأصيلة", en: "supports an authentic oud ambiance" },
  "baby-care": { ar: "يراعي بشرة الطفل الرقيقة", en: "respects delicate baby skin" },
  vitamins: { ar: "يمنح دفعة للعافية اليومية", en: "gives a daily wellness boost" },
  "appliances-hair": { ar: "يساعد على تصفيف الشعر بسرعة", en: "helps style the hair quickly" },
  "appliances-shaving": { ar: "يساعد على حلاقة مريحة", en: "helps with a comfortable shave" },
  "appliances-teeth": { ar: "يساعد على تنظيف الأسنان", en: "helps clean the teeth" },
  tools: { ar: "يساعد على تسهيل روتينك اليومي", en: "helps simplify your daily routine" },
  "beauty-tools": { ar: "يساعد على إتمام العناية بسهولة", en: "helps complete care easily" },
  "women-care": { ar: "يحافظ على راحة المنطقة الحميمة", en: "keeps intimate areas comfortable" },
  "oral-care": { ar: "يساعد على نظافة الفم", en: "supports oral hygiene" },
  "contact-lenses": { ar: "يحافظ على نظافة العدسات", en: "keeps lenses clean" },
  deodorants: { ar: "يحافظ على إحساس الانتعاش", en: "maintains a feeling of freshness" },
  "group-care": { ar: "يقدم تجربة عناية كاملة", en: "offers a complete care experience" },
  haircare: { ar: "يدعم العناية اليومية بالشعر", en: "supports everyday hair care" },
  uncategorized: { ar: "يمنح تجربة عناية مريحة", en: "offers a comfortable care experience" },
};

/** Verified concern-targeted benefit per concern (kind = "function"). */
const CONCERN_BENEFITS: Record<string, { ar: string; en: string }> = {
  acne: { ar: "يساعد على تنظيم مظهر الحبوب", en: "helps manage the look of blemishes" },
  dryness: { ar: "يخفف إحساس الجفاف", en: "relieves the feeling of dryness" },
  pigmentation: { ar: "يعتني بمظهر البشرة بلطف", en: "gently cares for the look of the skin" },
  aging: { ar: "يساعد على تحسين مظهر البشرة", en: "helps improve the look of the skin" },
  redness: { ar: "يساعد على تهدئة البشرة", en: "helps calm the skin" },
  large_pores: { ar: "يساعد على تنقية المسام", en: "helps refine the look of pores" },
  uneven_texture: { ar: "يساعد على تنعيم ملمس البشرة", en: "helps smooth the feel of the skin" },
  dark_circles: { ar: "يعتني بمظهر منطقة العين", en: "cares for the eye area" },
  oiliness: { ar: "يساعد على ضبط لمعان البشرة", en: "helps control the skin's shine" },
  sensitivity: { ar: "يراعي البشرة الحساسة بلطف", en: "respects sensitive skin gently" },
};

/** Only exact-normalized ingredient names, but strip a leading "ال" for robustness. */
function effectForIngredient(name: string): { ar: string; en: string } | undefined {
  const norm = normalizeName(name.trim());
  if (INGREDIENT_EFFECTS[norm]) return INGREDIENT_EFFECTS[norm];
  const stripped = norm.replace(/^ال/, "");
  if (INGREDIENT_EFFECTS[stripped]) return INGREDIENT_EFFECTS[stripped];
  const key = Object.keys(INGREDIENT_EFFECTS).find((k) => normalizeName(k) === norm);
  return key ? INGREDIENT_EFFECTS[key] : undefined;
}

const FALLBACK_PRIMARY = PRIMARY_FUNCTION_AR["uncategorized"] ?? "يمنح عناية فعالة";
const FALLBACK_PRIMARY_EN = PRIMARY_FUNCTION_EN["uncategorized"] ?? "offers effective care";

/* ------------------------------------------------------------------------ */
/* 1. BENEFIT FACT EXTRACTION + GENERATION                                    */
/* ------------------------------------------------------------------------ */

const MAX_BENEFITS = 6;

function alreadyIncluded(acc: BenefitFact[], ar: string): boolean {
  const norm = normalizeName(ar);
  return acc.some((b) => normalizeName(b.ar) === norm);
}

/** Near-duplicate (≥60% token overlap) of any already-included bullet — prevents redundant bullets. */
function isNearDuplicateOfAny(acc: BenefitFact[], ar: string): boolean {
  const sa = new Set(benefitTokens(ar));
  if (sa.size === 0) return false;
  for (const b of acc) {
    const sb = new Set(benefitTokens(b.ar));
    if (sb.size === 0) continue;
    const inter = [...sa].filter((t) => sb.has(t)).length;
    const jaccard = inter / new Set([...sa, ...sb]).size;
    if (jaccard >= 0.6) return true;
  }
  return false;
}

function benefitTokens(text: string): string[] {
  return tokenize(normalizeName(text)).filter((t) => !AR_STOPWORDS.has(t));
}

/** Categories where an AM/PM usage routine is a genuine decision factor. */
const ROUTINE_SLUGS = new Set([
  "cleansers", "toners", "serums", "moisturizers", "sunscreen", "eye-care", "lip-care",
  "masks", "exfoliators", "shampoo", "conditioner", "hair-oils", "hair-masks",
  "hair-treatments", "hair-styling", "hair-creams", "hair-tools", "body-wash",
  "body-lotion", "body-oils", "body-scrubs", "body-care", "hand-care", "foot-care",
  "women-care", "oral-care", "deodorants", "baby-care", "contact-lenses",
]);

/**
 * A "concentration" % only carries customer decision value when it is a genuine
 * active-ingredient concentration (e.g. "بنزويل بيروكسايد 10%", "حمض الساليسيليك 2%").
 * Protection %, purity %, or material % (حماية / spf / عضوي / طبيعي / نقي / سيراميك)
 * must NOT be presented as "تركيز المكون النشط".
 */
function isGenuineConcentration(nameAr: string, nameEn: string, concentration: string | undefined): boolean {
  if (!concentration) return false;
  const search = normalizeName(nameAr + " " + nameEn);
  if (/(حمايه|spf|عضوي|طبيعي|نقي|سيراميك|organic|pure|ceramic|natural)/.test(search)) return false;
  const hasConcWord = /(بتركيز|تركيز|بنسبه|نسبه|concentration|strength)/.test(search);
  const num = parseFloat(concentration.replace(/[%٪]/g, ""));
  return hasConcWord || (!Number.isNaN(num) && num <= 40);
}

/** Verified formulation-based benefit (kind = "function"). */
const FORMULATION_BENEFITS: Record<string, { ar: string; en: string }> = {
  "رغوية": { ar: "تركيبة رغوية خفيفة سهلة التوزيع", en: "a light foam formula that spreads easily" },
  "سائلة": { ar: "تركيبة سائلة خفيفة سهلة الاستخدام", en: "a light liquid formula that is easy to use" },
  "جل": { ar: "تركيبة جل منعشة سهلة الاستخدام", en: "a refreshing gel formula that is easy to use" },
  "موس": { ar: "تركيبة موس خفيفة سهلة التوزيع", en: "a light mousse formula that spreads easily" },
  "بودرة": { ar: "تركيبة بودرة ناعمة الملمس", en: "a soft powder formula" },
  "زيتية": { ar: "تركيبة زيتية تغذي الملمس بلطف", en: "an oily formula that gently nourishes" },
};

function pushBenefitFact(acc: BenefitFact[], fact: BenefitFact): void {
  if (alreadyIncluded(acc, fact.ar) || isNearDuplicateOfAny(acc, fact.ar)) return;
  acc.push(fact);
}

export function extractBenefitFacts(product: Product): BenefitFact[] {
  const out: BenefitFact[] = [];
  const slug = product.categorySlug ?? "uncategorized";
  const df = extractDescriptionFacts(product);

  // A. Primary function (function)
  const primary = PRIMARY_FUNCTION_AR[slug];
  if (primary) {
    out.push({
      ar: primary,
      en: PRIMARY_FUNCTION_EN[slug] ?? FALLBACK_PRIMARY_EN,
      kind: "function",
      evidence: `category:${slug}`,
      source: `النوع: ${slug}`,
    });
  } else {
    out.push({
      ar: FALLBACK_PRIMARY,
      en: FALLBACK_PRIMARY_EN,
      kind: "function",
      evidence: `category:${slug}`,
      source: `النوع: ${slug}`,
    });
  }

  // B. Secondary function (function)
  const secondary = CATEGORY_SECONDARY[slug] ?? CATEGORY_SECONDARY.uncategorized;
  if (secondary && !alreadyIncluded(out, secondary.ar)) {
    out.push({ ...secondary, kind: "function", evidence: `category:${slug}`, source: `النوع: ${slug}` });
  }

  // C. Product-specific differentiators (function) — derived from THIS product's
  //    verified name/usage facts so shared categories no longer collapse into a
  //    single template. Only facts that carry genuine customer decision value are
  //    emitted: formulation, SPF, genuine active-ingredient concentration, and an
  //    AM/PM usage routine where that is a real choice factor. Size/count are NOT
  //    benefits — they are specs (shown in the name) and must not be dressed up
  //    as fake benefits.
  if (df.formulation && FORMULATION_BENEFITS[df.formulation]) {
    pushBenefitFact(out, {
      ...FORMULATION_BENEFITS[df.formulation],
      kind: "function",
      evidence: `formulation:${df.formulation}`,
      source: `التركيبة: ${df.formulation}`,
    });
  }
  if (df.spf) {
    const factor = df.spf.replace(/SPF/i, "").replace(/\+/g, "").trim();
    pushBenefitFact(out, {
      ar: `بمعامل حماية ${factor} من الشمس`,
      en: `with sun protection factor ${factor}`,
      kind: "function",
      evidence: `spf:${df.spf}`,
      source: `عامل الحماية: ${df.spf}`,
    });
  }
  if (df.concentration && isGenuineConcentration(product.name?.ar ?? "", product.name?.en ?? "", df.concentration)) {
    pushBenefitFact(out, {
      ar: `بتركيز ${df.concentration} من المكون النشط`,
      en: `with a ${df.concentration} concentration of the active ingredient`,
      kind: "function",
      evidence: `concentration:${df.concentration}`,
      source: `التركيز: ${df.concentration}`,
    });
  }
  if (ROUTINE_SLUGS.has(slug)) {
    const usageText = normalizeName(
      (Array.isArray(product.howToUseAr) ? product.howToUseAr.join(" ") : "") + " " + (df.usage ?? "")
    );
    const nightMode = /مساء|ليلا|ليل|قبل النوم|مسائي/.test(usageText);
    const dayMode = /صباح|نهار/.test(usageText);
    if (nightMode || dayMode) {
      const label = nightMode && dayMode ? "صباحا ومساء" : nightMode ? "مسائي" : "صباحي";
      pushBenefitFact(out, {
        ar:
          nightMode && dayMode
            ? "يستخدم في روتين العناية صباحاً ومساءً"
            : nightMode
              ? "يستخدم في روتين العناية المسائي"
              : "يستخدم في روتين العناية الصباحي",
        en:
          nightMode && dayMode
            ? "used in both morning and evening care"
            : nightMode
              ? "used in an evening care routine"
              : "used in a morning care routine",
        kind: "function",
        evidence: `usage:${label}`,
        source: `الاستخدام: ${label}`,
      });
    }
  }

  // D. Ingredient effects (effect) — up to 2 distinct (dedupe near-duplicates)
  let effectsAdded = 0;
  for (const ing of product.ingredients?.ar ?? []) {
    if (effectsAdded >= 2) break;
    const e = effectForIngredient(ing);
    if (e && !alreadyIncluded(out, e.ar) && !isNearDuplicateOfAny(out, e.ar)) {
      out.push({ ar: e.ar, en: e.en, kind: "effect", evidence: `ingredient:${ing}`, source: `المكون: ${ing}` });
      effectsAdded++;
    }
  }

  // E. Concern-targeted benefits (function) — up to 2 distinct (dedupe near-duplicates)
  let concernsAdded = 0;
  for (const c of product.skinConcerns ?? []) {
    if (concernsAdded >= 2) break;
    const cb = CONCERN_BENEFITS[c];
    if (cb && !alreadyIncluded(out, cb.ar) && !isNearDuplicateOfAny(out, cb.ar)) {
      out.push({ ...cb, kind: "function", evidence: `concern:${c}`, source: `الاهتمام: ${SKIN_CONCERN_AR[c] ?? c}` });
      concernsAdded++;
    }
  }

  // F. Suitability (function)
  const skinTypes = (product.skinTypes ?? []).filter((s) => s !== "all");
  if (skinTypes.length > 0) {
    const labels = skinTypes.map((s) => SKIN_TYPE_AR[s] ?? s);
    const ar = `مناسب للبشرة ${labels.join(" و")}`;
    pushBenefitFact(out, {
      ar,
      en: `suitable for ${labels.join(" and ")} skin`,
      kind: "function",
      evidence: `skinTypes:${skinTypes.join(",")}`,
      source: `المناسب: ${labels.join("، ")}`,
    });
  }

  // Final dedupe pass — drop exact / near-duplicate bullets, keep the first occurrence.
  const kept: BenefitFact[] = [];
  for (const b of out) {
    if (alreadyIncluded(kept, b.ar) || isNearDuplicateOfAny(kept, b.ar)) continue;
    kept.push(b);
    if (kept.length >= MAX_BENEFITS) break;
  }
  return kept;
}

export function generateBenefits(product: Product): { ar: string[]; en: string[]; facts: BenefitFact[] } {
  const facts = extractBenefitFacts(product);
  return {
    ar: facts.map((f) => f.ar),
    en: facts.map((f) => f.en),
    facts,
  };
}

/* ------------------------------------------------------------------------ */
/* 2. VALIDATORS                                                              */
/* ------------------------------------------------------------------------ */

/**
 * Originality of the rebuilt bullets against the legacy template bullets.
 * Per-bullet worst-case: a bullet that reproduces a source bullet is the actual
 * defect (template reproduction), so each rebuilt bullet is compared against
 * every source bullet; the worst match drives the decision.
 */
export function validateBenefitOriginality(candidateAr: string[], originalAr: string[], _facts: DescriptionFacts): OriginalityValidation {
  const clean = originalAr.map((o) => o.trim()).filter(Boolean);
  if (clean.length === 0) {
    return { status: "PASS", score: 100, editorialSimilarity: 0, reasons: ["no source benefit bullets to compare"] };
  }
  if (candidateAr.length === 0) {
    return { status: "PASS", score: 100, editorialSimilarity: 0, reasons: ["no candidate benefit bullets"] };
  }

  let worst = 0;
  let worstPair: [string, string] | null = null;
  for (const c of candidateAr) {
    const nc = normalizeName(c);
    for (const o of clean) {
      if (nc === normalizeName(o)) {
        return { status: "REJECTED", score: 0, editorialSimilarity: 1, reasons: [`exact copy of a source benefit: "${c}"`] };
      }
      const sim = bulletSimilarity(c, o);
      if (sim > worst) {
        worst = sim;
        worstPair = [c, o];
      }
    }
  }

  // Short benefit bullets have a high baseline overlap when they describe the same
  // function; only a clear majority of shared tokens signals copying.
  if (worst >= 0.8) {
    return {
      status: "REJECTED",
      score: Math.max(0, Math.round(100 - worst * 100)),
      editorialSimilarity: worst,
      reasons: [`near copy of a source benefit: "${worstPair?.[0]}" ≈ "${worstPair?.[1]}"`],
    };
  }
  if (worst >= 0.65) {
    return {
      status: "REVIEW_REQUIRED",
      score: Math.max(0, Math.round(100 - worst * 100)),
      editorialSimilarity: worst,
      reasons: [`high overlap with a source benefit: "${worstPair?.[0]}" vs "${worstPair?.[1]}"`],
    };
  }
  return {
    status: "PASS",
    score: Math.max(0, Math.round(100 - worst * 100)),
    editorialSimilarity: worst,
    reasons: ["independent benefit bullets; no source bullet reproduced"],
  };
}

function bulletSimilarity(a: string, b: string): number {
  const ta = benefitTokens(a);
  const tb = benefitTokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const sa = new Set(ta);
  const sb = new Set(tb);
  const inter = [...sa].filter((t) => sb.has(t)).length;
  return inter / new Set([...sa, ...sb]).size;
}

/** Unsupported claims / invented effects / invented ingredients in the bullets. */
export function validateBenefitUnsupported(bulletAr: string[], bulletEn: string[], facts: DescriptionFacts) {
  const joined = bulletAr.join(" . ") + " . " + bulletEn.join(" . ");
  return validateUnsupportedFacts(joined, facts);
}

/** Duplicate / near-duplicate bullets within one product. */
export function validateBenefitDuplicates(bulletAr: string[]): string[] {
  const issues: string[] = [];
  for (let i = 0; i < bulletAr.length; i++) {
    for (let j = i + 1; j < bulletAr.length; j++) {
      const a = normalizeName(bulletAr[i]);
      const b = normalizeName(bulletAr[j]);
      if (a === b) {
        issues.push(`duplicate benefit: "${bulletAr[i]}" repeats "${bulletAr[j]}"`);
      } else {
        const ta = tokenize(bulletAr[i]);
        const tb = tokenize(bulletAr[j]);
        const setA = new Set(ta);
        const setB = new Set(tb);
        const inter = [...setA].filter((t) => setB.has(t)).length;
        const jaccard = inter / Math.max(1, new Set([...setA, ...setB]).size);
        if (jaccard >= 0.6) {
          issues.push(`near-duplicate benefit: "${bulletAr[i]}" ≈ "${bulletAr[j]}" (${Math.round(jaccard * 100)}%)`);
        }
      }
    }
  }
  return issues;
}

/** Consistency of the bullets with verified name facts. */
export function validateBenefitConsistency(bulletAr: string[], facts: DescriptionFacts) {
  return validateConsistency(bulletAr.join(" . "), facts);
}

/* ------------------------------------------------------------------------ */
/* 3. CONFIDENCE                                                              */
/* ------------------------------------------------------------------------ */

function computeBenefitConfidence(input: {
  bestRank: number;
  factCount: number;
  originalityScore: number;
  unsupportedValid: boolean;
  duplicateCount: number;
  consistencyPass: boolean;
  conflictCount: number;
}): number {
  let c = 100;
  c -= (input.bestRank - 1) * 3;
  const coverage = Math.min(1, input.factCount / 5);
  c -= Math.round((1 - coverage) * 20);
  c -= Math.round(((100 - input.originalityScore) / 100) * 15);
  if (!input.unsupportedValid) c -= 40;
  c -= input.duplicateCount * 25;
  if (!input.consistencyPass) c -= 30;
  c -= input.conflictCount * 10;
  return Math.max(0, Math.min(100, Math.round(c)));
}

/* ------------------------------------------------------------------------ */
/* 4. PIPELINE                                                                */
/* ------------------------------------------------------------------------ */

export function selectProductBenefits(product: Product, externalSources?: DescriptionSource[]): BenefitDecision {
  const facts = extractDescriptionFacts(product);
  const sources: DescriptionSource[] =
    externalSources && externalSources.length > 0
      ? externalSources
      : [{ provider: "storeCatalog", rank: 1 }];
  const sourceResolution = resolveDescriptionSources(sources);

  const originalAr = Array.isArray(product.benefits?.ar) ? product.benefits.ar.filter(Boolean) : [];
  const originalEn = Array.isArray(product.benefits?.en) ? product.benefits.en.filter(Boolean) : [];

  const generated = generateBenefits(product);
  const originality = validateBenefitOriginality(generated.ar, originalAr, facts);
  const unsupported = validateBenefitUnsupported(generated.ar, generated.en, facts);
  const duplicateIssues = validateBenefitDuplicates(generated.ar);
  const consistency = validateBenefitConsistency(generated.ar, facts);

  const bestRank = Math.min(...sources.map((s) => s.rank));
  const conflictCount = sourceResolution.conflicts.length;
  const confidence = computeBenefitConfidence({
    bestRank,
    factCount: generated.facts.length,
    originalityScore: originality.score,
    unsupportedValid: unsupported.valid,
    duplicateCount: duplicateIssues.length,
    consistencyPass: consistency.status === "PASS",
    conflictCount,
  });

  const reviewReasons: string[] = [];
  let status: BenefitStatus = "APPROVED";

  if (originality.status === "REJECTED") {
    status = "REJECTED";
    reviewReasons.push(...originality.reasons.map((r) => `originality: ${r}`));
  } else if (!unsupported.valid) {
    status = "REJECTED";
    reviewReasons.push(...unsupported.issues.map((i) => `unsupported fact: ${i}`));
  } else if (duplicateIssues.length > 0) {
    status = "REJECTED";
    reviewReasons.push(...duplicateIssues);
  } else if (consistency.status === "FAIL") {
    status = "REJECTED";
    reviewReasons.push(...consistency.mismatches.map((m) => `consistency: ${m}`));
  }

  if (status === "APPROVED") {
    if (originality.status === "REVIEW_REQUIRED") {
      status = "REVIEW_REQUIRED";
      reviewReasons.push(...originality.reasons.map((r) => `originality: ${r}`));
    } else if (conflictCount > 0) {
      status = "REVIEW_REQUIRED";
      reviewReasons.push(...sourceResolution.conflicts);
    } else if (generated.facts.length < 2) {
      status = "REVIEW_REQUIRED";
      reviewReasons.push(`insufficient evidence — fewer than 2 verified benefit facts (${generated.facts.length})`);
    } else if (confidence < 70) {
      status = "REVIEW_REQUIRED";
      reviewReasons.push(`insufficient evidence (confidence ${confidence})`);
    }
  }

  if (status === "APPROVED") {
    reviewReasons.push(`independent benefit bullets from verified facts; ${generated.facts.length} bullets (${generated.facts.filter((f) => f.kind === "function").length} function, ${generated.facts.filter((f) => f.kind === "effect").length} effect); confidence ${confidence}`);
  }

  return {
    productId: product.id,
    brand: product.brand,
    productName: product.name,
    originalBenefits: { ar: originalAr, en: originalEn },
    reconstructedBenefits: { ar: generated.ar, en: generated.en },
    benefitFacts: generated.facts,
    functionCount: generated.facts.filter((f) => f.kind === "function").length,
    effectCount: generated.facts.filter((f) => f.kind === "effect").length,
    evidenceSummary: generated.facts.map((f) => `${f.ar} ← ${f.source}`),
    originalityScore: originality.score,
    confidenceScore: confidence,
    duplicateIssues,
    unsupportedIssues: unsupported.issues,
    consistencyIssues: consistency.mismatches,
    status,
    reviewReasons,
  };
}

/* ------------------------------------------------------------------------ */
/* 5. AUDIT (DRY-RUN over the real catalog)                                  */
/* ------------------------------------------------------------------------ */

export function runBenefitAudit(catalog?: Product[]): BenefitAudit {
  const all = onlyPublished(catalog ?? products);
  const audit: BenefitAudit = {
    total: all.length,
    inspected: 0,
    rebuilt: 0,
    decisions: { approved: 0, reviewRequired: 0, rejected: 0 },
    copied: 0,
    mechanicalParaphrase: 0,
    duplicates: 0,
    unsupported: 0,
    inventedEffects: 0,
    sourceConflicts: 0,
    insufficientEvidence: 0,
    mismatches: 0,
    originalityPasses: 0,
    originalityFailures: 0,
  };

  for (const p of all) {
    audit.inspected++;
    const d = selectProductBenefits(p);
    const origAr = (Array.isArray(p.benefits?.ar) ? p.benefits.ar : []).join(" . ");
    if (d.reconstructedBenefits.ar.join(" . ") !== origAr) audit.rebuilt++;

    if (d.status === "APPROVED") audit.decisions.approved++;
    else if (d.status === "REVIEW_REQUIRED") audit.decisions.reviewRequired++;
    else audit.decisions.rejected++;

    if (d.reviewReasons.some((r) => r.includes("exact copy") || r.includes("near copy"))) audit.copied++;
    if (d.reviewReasons.some((r) => r.includes("mechanical paraphrase"))) audit.mechanicalParaphrase++;
    if (d.duplicateIssues.length > 0) audit.duplicates++;
    if (d.unsupportedIssues.length > 0) audit.unsupported++;
    if (d.unsupportedIssues.some((i) => i.includes("effect") || i.includes("ingredient"))) audit.inventedEffects++;
    if (d.reviewReasons.some((r) => r.includes("conflict"))) audit.sourceConflicts++;
    if (d.reviewReasons.some((r) => r.includes("insufficient"))) audit.insufficientEvidence++;
    if (d.consistencyIssues.length > 0) audit.mismatches++;
    const originalityRejected =
      d.reviewReasons.some((r) => r.includes("copy of a source benefit")) ||
      d.reviewReasons.some((r) => r.includes("overlap with a source benefit"));
    if (!originalityRejected) audit.originalityPasses++;
    else audit.originalityFailures++;
  }

  return audit;
}

/* ------------------------------------------------------------------------ */
/* 6. REAL EXAMPLES                                                           */
/* ------------------------------------------------------------------------ */

const EXAMPLE_IDS = [
  "yq-754", "yq-460", "yq-1680", "yq-1051", "yq-129", "yq-1017",
  "yq-2682", "yq-1900", "yq-2033", "yq-2215", "yq-2137", "yq-1693",
];

export function produceBenefitExamples(limit = 12, catalog?: Product[]): BenefitBeforeAfterExample[] {
  const all = onlyPublished(catalog ?? products);
  const samples = all.filter((p) => EXAMPLE_IDS.includes(p.id)).slice(0, limit);
  return samples.map((product) => {
    const d = selectProductBenefits(product);
    return {
      productId: product.id,
      brand: product.brand,
      productName: product.name,
      originalBenefits: d.originalBenefits.ar,
      luminousBenefits: d.reconstructedBenefits.ar,
      functionBenefits: d.benefitFacts.filter((f) => f.kind === "function"),
      effectBenefits: d.benefitFacts.filter((f) => f.kind === "effect"),
      evidence: d.evidenceSummary,
      originalityScore: d.originalityScore,
      confidenceScore: d.confidenceScore,
      finalStatus: d.status,
    };
  });
}

/* ------------------------------------------------------------------------ */
/* 7. PERSONALIZATION (product-specific differentiation)                    */
/* ------------------------------------------------------------------------ */

export interface BenefitSignature {
  material: string; // verified material facts that must drive differentiation
  benefit: string; // deterministic benefit-set signature
  evidence: string[];
}

/** Deterministic signature: material facts (what may differ) + resulting benefit set. */
export function buildBenefitSignature(product: Product): BenefitSignature {
  const facts = extractBenefitFacts(product);
  const df = extractDescriptionFacts(product);
  const normSorted = (items: string[]) => [...new Set(items.map(normalizeName).sort())].join("|");
  const spfKey = df.spf ? df.spf.replace(/SPF/i, "").replace(/\+/g, "").trim() : "-";
  const concKey = df.concentration && isGenuineConcentration(product.name?.ar ?? "", product.name?.en ?? "", df.concentration)
    ? df.concentration
    : "-";
  const material = [
    df.productType ?? "-",
    df.formulation ?? "-",
    spfKey,
    concKey,
    normSorted(df.ingredients),
    normSorted(df.targetConcerns),
    normSorted(df.skinTypes),
  ].join("§");
  return {
    material,
    benefit: facts.map((f) => normalizeName(f.ar)).join("§"),
    evidence: facts.map((f) => f.evidence),
  };
}

/**
 * Personalization decision (SEPARATE from the canonical APPROVED/REVIEW_REQUIRED
 * status in selectProductBenefits). A product that produces the same benefit set
 * as its category's most common set — and therefore has no distinguishing
 * differentiator — is marked REVIEW_REQUIRED instead of inventing a difference.
 */
export function classifyPersonalization(catalog: Product[]): Map<string, "APPROVED" | "REVIEW_REQUIRED"> {
  const byCat = new Map<string, Product[]>();
  for (const p of catalog) {
    const cat = p.categorySlug ?? "uncategorized";
    const arr = byCat.get(cat) ?? [];
    arr.push(p);
    byCat.set(cat, arr);
  }
  const result = new Map<string, "APPROVED" | "REVIEW_REQUIRED">();
  for (const [, arr] of byCat) {
    const counts = new Map<string, number>();
    for (const p of arr) {
      const sig = buildBenefitSignature(p).benefit;
      counts.set(sig, (counts.get(sig) ?? 0) + 1);
    }
    let modal = "";
    let modalCount = 0;
    for (const [sig, c] of counts) if (c > modalCount) {
      modal = sig;
      modalCount = c;
    }
    for (const p of arr) {
      const sig = buildBenefitSignature(p).benefit;
      result.set(p.id, sig === modal && modalCount >= 2 ? "REVIEW_REQUIRED" : "APPROVED");
    }
  }
  return result;
}

export interface PersonalizationCategoryStat {
  category: string;
  total: number;
  distinctSets: number;
  shared: number; // products whose benefit set is shared with ≥1 other product
  nearDupPairs: number;
  differentiationViolations: number;
  reviewRequired: number;
}

export interface PersonalizationAudit {
  total: number;
  distinctSets: number;
  uniqueSets: number;
  shared: number;
  nearDupPairs: number;
  differentiationViolations: number;
  reviewRequired: number;
  categories: PersonalizationCategoryStat[];
}

function jaccardBenefitSets(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  const inter = [...sa].filter((t) => sb.has(t)).length;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 1 : inter / union;
}

export function runPersonalizationAudit(catalog?: Product[]): PersonalizationAudit {
  const all = onlyPublished(catalog ?? products);
  const rows = all.map((p) => ({ id: p.id, cat: p.categorySlug ?? "uncategorized", sig: buildBenefitSignature(p) }));

  const byCat = new Map<string, typeof rows>();
  for (const r of rows) {
    const arr = byCat.get(r.cat) ?? [];
    arr.push(r);
    byCat.set(r.cat, arr);
  }

  let distinctSets = 0,
    uniqueSets = 0,
    shared = 0,
    nearDupPairs = 0,
    diffViolations = 0,
    review = 0;
  const categories: PersonalizationCategoryStat[] = [];

  for (const [cat, arr] of byCat) {
    const setToRows = new Map<string, typeof arr>();
    for (const r of arr) {
      const group = setToRows.get(r.sig.benefit) ?? [];
      group.push(r);
      setToRows.set(r.sig.benefit, group);
    }
    const groups = [...setToRows.values()];
    const catDistinct = groups.length;
    const catShared = groups.filter((g) => g.length > 1).reduce((n, g) => n + g.length, 0);
    distinctSets += catDistinct;
    uniqueSets += groups.filter((g) => g.length === 1).length;
    shared += catShared;

    const keys = [...setToRows.keys()];
    let catNear = 0;
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        if (jaccardBenefitSets(keys[i].split("§"), keys[j].split("§")) >= 0.6) catNear++;
      }
    }
    nearDupPairs += catNear;

    let catDiff = 0;
    for (const g of groups) {
      if (g.length < 2) continue;
      if (new Set(g.map((r) => r.sig.material)).size > 1) catDiff += g.length;
    }
    diffViolations += catDiff;

    let modal = "";
    let modalCount = 0;
    for (const [sig, g] of setToRows) if (g.length > modalCount) {
      modal = sig;
      modalCount = g.length;
    }
    let catReview = 0;
    for (const r of arr) if (r.sig.benefit === modal && modalCount >= 2) catReview++;
    review += catReview;

    categories.push({
      category: cat,
      total: arr.length,
      distinctSets: catDistinct,
      shared: catShared,
      nearDupPairs: catNear,
      differentiationViolations: catDiff,
      reviewRequired: catReview,
    });
  }

  return {
    total: all.length,
    distinctSets,
    uniqueSets,
    shared,
    nearDupPairs,
    differentiationViolations: diffViolations,
    reviewRequired: review,
    categories,
  };
}

export interface PersonalizationExample {
  productId: string;
  brand: string;
  productName: { ar: string; en: string };
  category: string;
  verifiedDifferentiators: string[];
  benefitFacts: BenefitFact[];
  finalBenefits: string[];
}

/** 20 curated examples across the required groups (skincare / hair / makeup / fragrance / oral-care / supplements). */
export function producePersonalizationExamples(limit = 20, catalog?: Product[]): PersonalizationExample[] {
  const all = onlyPublished(catalog ?? products);
  const groups: Array<{ label: string; slugs: string[]; min: number }> = [
    { label: "skincare", slugs: ["cleansers", "toners", "serums", "moisturizers", "exfoliators", "masks"], min: 5 },
    { label: "hair", slugs: ["shampoo", "conditioner", "hair-oils", "hair-masks", "hair-creams", "hair-dyes", "hair-treatments"], min: 5 },
    { label: "makeup", slugs: ["face-makeup", "lip-makeup", "eye-makeup", "makeup"], min: 3 },
    { label: "fragrance", slugs: ["perfume-women", "perfume-men", "perfume-musk", "perfume-gift-sets", "perfume", "bakhoor-oud", "bakhoor-premium"], min: 3 },
    { label: "oral-care", slugs: ["oral-care"], min: 2 },
    { label: "supplements", slugs: ["vitamins"], min: 2 },
  ];

  const picked: Product[] = [];
  const pickedIds = new Set<string>();
  const groupCount = new Map<string, number>(groups.map((g) => [g.label, 0]));

  for (const g of groups) {
    const candidates = all.filter((p) => g.slugs.includes(p.categorySlug ?? "") && !pickedIds.has(p.id));
    const sorted = candidates
      .map((p) => ({ p, diff: extractBenefitFacts(p).filter((f) => /^(formulation|spf|concentration|usage):/.test(f.evidence)).length }))
      .sort((a, b) => b.diff - a.diff)
      .map((x) => x.p);
    for (const p of sorted) {
      if ((groupCount.get(g.label) ?? 0) >= g.min) break;
      picked.push(p);
      pickedIds.add(p.id);
      groupCount.set(g.label, (groupCount.get(g.label) ?? 0) + 1);
    }
  }

  return picked.slice(0, limit).map((p) => {
    const facts = extractBenefitFacts(p);
    const df = extractDescriptionFacts(p);
    const diff: string[] = [];
    if (df.formulation) diff.push(`التركيبة: ${df.formulation}`);
    if (df.spf) diff.push(`عامل الحماية: ${df.spf}`);
    if (df.concentration && isGenuineConcentration(p.name?.ar ?? "", p.name?.en ?? "", df.concentration)) diff.push(`التركيز: ${df.concentration}`);
    if (ROUTINE_SLUGS.has(p.categorySlug ?? "")) diff.push(`روتين الاستخدام: ${df.usage ?? "صباحاً ومساءً"}`);
    if (df.ingredients.length > 0) diff.push(`المكونات: ${df.ingredients.slice(0, 4).join("، ")}`);
    return {
      productId: p.id,
      brand: p.brand,
      productName: p.name,
      category: p.categorySlug ?? "",
      verifiedDifferentiators: diff,
      benefitFacts: facts,
      finalBenefits: facts.map((f) => f.ar),
    };
  });
}
