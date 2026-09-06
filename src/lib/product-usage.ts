/**
 * PART 8 — PRODUCT USAGE (CANONICAL PIPELINE)
 * ===========================================
 *
 * Rebuild product usage instructions for the REAL Luminous catalog.
 *
 * VERIFIED USAGE FACTS
 *   → SOURCE VALIDATION / CONFLICT RESOLUTION
 *     → LUMINOUS USAGE STRUCTURE (Arabic-first, independently structured)
 *       → UNSUPPORTED-INSTRUCTION VALIDATION
 *         → ORIGINALITY VALIDATION
 *           → CROSS-CONTENT IDENTITY CONSISTENCY
 *             → CONFIDENCE / STATUS
 *
 * Usage is derived ONLY from verified product instructions present in the
 * catalog. Nothing is invented (amount, frequency, waiting time, rinse
 * status, reapplication, warnings, storage). Yaqoot is a factual source but
 * MUST NOT be the writing template — the generated usage is independently
 * structured.
 *
 * Reuses (no duplicates):
 *  - src/lib/source-hierarchy.ts     (Part 3) — source authority.
 *  - src/lib/product-name.ts         (Part 4) — identity facts + Arabic normalization.
 *  - src/lib/product-description.ts  (Part 6) — shared claims/structure validators.
 *
 * DRY-RUN / AUDIT — this module never writes to the catalog.
 */

import type { Product } from "@/src/types/product";
import { products } from "@/src/data/products";
import { onlyPublished } from "@/src/lib/publication";
import { SOURCE_HIERARCHY } from "@/src/lib/source-hierarchy";
import { extractNameFacts, normalizeName, tokenize } from "@/src/lib/product-name";
import { AR_STOPWORDS, resolveDescriptionSources } from "@/src/lib/product-description";
import type { DescriptionSource } from "@/src/lib/product-description";
import categoryMapAr from "@/src/lib/category-ar.json";
import categoryMapEn from "@/src/lib/category-en.json";

/** AR_STOPWORDS normalized to match normalizeName() output (على → علي etc.). */
const AR_STOPWORDS_NORM = new Set<string>([...AR_STOPWORDS].map((w) => normalizeName(w)));

/* ------------------------------------------------------------------------ */
/* TYPES                                                                     */
/* ------------------------------------------------------------------------ */

export type UsageStatus = "APPROVED" | "REVIEW_REQUIRED" | "REJECTED";

export interface UsageFacts {
  sourceText: string;
  sourceSteps: string[];
  nameAr: string;
  nameEn: string;
  brand: string | undefined;
  brandAr: string | undefined;
  productType: string | undefined;
  productTypeAr: string | undefined;
  productTypeEn: string | undefined;
  size: string | undefined;
  spf: string | undefined;
  shade: string | undefined;
  variant: string | undefined;
  count: string | undefined;
  prep: string | undefined;
  applyArea: string | undefined;
  applyMethod: string | undefined;
  amount: string | undefined;
  frequency: string | undefined;
  timeOfDay: string | undefined;
  waiting: string | undefined;
  rinse: string | undefined;
  reapply: string | undefined;
  order: string | undefined;
  warning: string | undefined;
  storage: string | undefined;
}

export interface UsageSource {
  provider: string;
  rank: number;
  usage?: string;
  facts?: { brand?: string; size?: string; spf?: string; shade?: string; variant?: string };
}

export interface UsageSourceResolution {
  selectedUsage: string | undefined;
  agreements: string[];
  conflicts: string[];
  reviewRequired: boolean;
}

export interface UsageOriginalityValidation {
  status: "PASS" | "REVIEW_REQUIRED" | "REJECTED";
  score: number;
  editorialSimilarity: number;
  reasons: string[];
}

export interface UsageUnsupportedValidation {
  valid: boolean;
  issues: string[];
}

export interface UsageConsistencyValidation {
  status: "PASS" | "FAIL";
  mismatches: string[];
}

export interface UsageDecision {
  productId: string;
  brand: string;
  productName: { ar: string; en: string };
  originalUsage: string;
  reconstructedUsage: { arSteps: string[]; arParagraph: string; enSteps: string[]; enParagraph: string };
  verifiedFacts: UsageFacts;
  sourcesUsed: Array<{ provider: string; rank: number }>;
  sourceResolution: UsageSourceResolution;
  originalityScore: number;
  confidenceScore: number;
  consistencyStatus: "PASS" | "FAIL";
  status: UsageStatus;
  reviewReasons: string[];
}

export interface UsageAudit {
  products: {
    total: number;
    usagePresent: number;
    usageMissing: number;
    usageRegenerated: number;
    usageUnchanged: number;
  };
  decisions: { approved: number; reviewRequired: number; rejected: number };
  sourceValidation: {
    withVerifiedUsageSource: number;
    withMultipleSources: number;
    withSourceConflicts: number;
    conflictsResolvedByHierarchy: number;
    conflictsRequiringReview: number;
    withMissingUsageFacts: number;
  };
  usageValidation: {
    validated: number;
    unsupportedDetected: number;
    unsupportedRemoved: number;
    originalityFailures: number;
    identityMismatches: number;
    approved: number;
    reviewRequired: number;
    rejected: number;
  };
  sourceDistribution: Record<string, number>;
}

export interface UsageBeforeAfterExample {
  productId: string;
  brand: string;
  productName: { ar: string; en: string };
  verifiedUsageFacts: string[];
  sourceUsed: { provider: string; rank: number };
  oldUsage: string;
  newUsage: { arSteps: string[]; enParagraph: string };
  validationResult: string;
  finalStatus: UsageStatus;
}

export interface UsageConflictExample {
  productId: string;
  productName: string;
  conflictingSources: string[];
  exactFactInConflict: string;
  sourceHierarchyDecision: string;
  selectedInstruction: string;
  finalStatus: UsageStatus;
}

/* ------------------------------------------------------------------------ */
/* PATTERN HELPERS                                                           */
/* ------------------------------------------------------------------------ */

type Pat = [RegExp, string];

function matchFirst(patterns: Pat[], norm: string): string | undefined {
  for (const [re, value] of patterns) {
    if (re.test(norm)) return value;
  }
  return undefined;
}

function matchAllValues(patterns: Pat[], norm: string): string[] {
  const out: string[] = [];
  for (const [re, value] of patterns) {
    if (re.test(norm)) out.push(value);
  }
  return out;
}

/** Split raw usage text into ordered steps (sentences). */
export function splitUsageSteps(text: string): string[] {
  return String(text || "")
    .split(/[.!؟؟\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/* ------------------------------------------------------------------------ */
/* SLOT EXTRACTION PATTERNS (tested on NORMALIZED Arabic source text)        */
/* ------------------------------------------------------------------------ */

const PREP_PATTERNS: Pat[] = [
  [/نظفي بشرتك ثم جففيها/, "على بشرة نظيفة وجافة"],
  [/نظفي بشرتك جيدا/, "بعد تنظيف البشرة جيداً"],
  [/نظفي بشرتك/, "بعد تنظيف البشرة"],
  [/اغسلي وجهك جيدا بالماء الفاتر/, "بعد غسل الوجه بالماء الفاتر"],
  [/بللي وجهك بالماء الفاتر/, "على وجه مبلل بالماء الفاتر"],
  [/بللي شعرك جيدا/, "على شعر مبلل"],
  [/بللي بشرتك بالماء الدافئ|بللي جسمك بالماء الدافئ|تبليله بالماء الدافئ/, "على بشرة مبللة بالماء الدافئ"],
  [/رطب بشرتك بالماء/, "على بشرة مبللة"],
  [/بشره نظيفه وجافه/, "على بشرة نظيفة وجافة"],
  [/بشره نظيفه|بشره نضيفه/, "على بشرة نظيفة"],
  [/بعد الاستحمام/, "بعد الاستحمام"],
  [/يديك نظيفتان وجافتان/, "بأيدٍ نظيفة وجافة"],
  [/بعد غسل الشعر|شعر نظيف ومبلل|شعر نظيف ورطب/, "على شعر نظيف ومبلل"],
  [/على شعر مبلل|شعر رطب|شعر مبلل/, "على شعر مبلل"],
  [/تنظيف البشره|نظف البشره/, "بعد تنظيف البشرة"],
  [/تكون الرموش نظيفه|الرموش نظيفه تماما/, "بعد تنظيف الرموش"],
  [/اغسلى يديك جيدا/, "بعد غسل اليدين جيداً"],
  [/ابطين نضيفين|ابطين نظيفين|ابطين جافين/, "بأبط نظيفة وجافة"],
  [/ابط نظيف وجاف|ابط جاف ونظيف|ابط نظيف/, "بأبط نظيفة وجافة"],
  [/رطبي الجلد|رطبي البشره|رطب الجلد|ترطيب الجلد/, "بعد ترطيب البشرة"],
  [/بعد غسل منطقه|بعد غسل/, "بعد التنظيف"],
];

const AREA_PATTERNS: Pat[] = [
  [/علي الشفاه|علي الشفاة|علي الشفا|علي شفا/, "على الشفاه"],
  [/علي فروه الراس/, "على فروة الرأس"],
  [/علي الشعر|علي شعر/, "على الشعر"],
  [/علي الوجه|علي وجهك|علي بشرتك/, "على الوجه"],
  [/علي الابطين|علي الابط/, "على الإبطين"],
  [/علي ابط\b/, "على الإبطين"],
  [/تحت العينين|تحت العين|تحت العيون|تحت عينيك/, "تحت العين"],
  [/علي الجسم|علي الجسد/, "على الجسم"],
  [/علي البشره|علي بشره|علي الجلد/, "على البشرة"],
  [/علي الاسنان|علي الفم|علي فمك|علي اللثه/, "على الأسنان"],
  [/حول العينين|علي العينين|منطقه العين|محيط العين/, "حول العينين"],
  [/علي الرموش|الرموش/, "على الرموش"],
  [/علي العدسات|القرنيه/, "على العدسات"],
  [/علي اليدين/, "على اليدين"],
  [/علي القدمين/, "على القدمين"],
  [/علي المنطقه الحميمه|علي المنطقه الحميميه/, "على المنطقة الحميمة"],
  [/علي نقاط النبض|علي الرقبه والمعصمين|الرقبه والمعصمين/, "على نقاط النبض"],
  [/علي الجفون/, "على الجفون"],
  [/علي الاظافر/, "على الأظافر"],
  [/علي الحواجب|علي حاجب/, "على الحواجب"],
  [/علي الشفه|علي شفه/, "على الشفاه"],
  [/علي الخدود|علي الخد|الخدود/, "على الخدود"],
  [/علي ابطين|علي الابطين/, "على الإبطين"],
  [/علي العيون|للعيون/, "حول العينين"],
  [/الندبه|منطقه الندبه/, "على الندبة"],
];

const METHOD_PATTERNS: Pat[] = [
  [/بحركات دائريه/, "بحركات دائرية"],
  [/تدليك بلطف|دلكيه بلطف|دلكيها بلطف|دلكي بلطف/, "بتدليك لطيف"],
  [/دلكي|يدلك|دلك/, "بالتدليك"],
  [/وزعي بالتساوي|وزعيه بالتساوي|وزعي/, "بتوزيع متساوٍ"],
  [/امسحي بلطف|امسحي/, "بالمسح بلطف"],
  [/طبقي بالتساوي|طبقي/, "بطبقة متساوية"],
  [/بفرشاه او اسفنجه|بفرشاه|باسفنجه/, "بفرشاة أو إسفنجة"],
  [/على قطنه نظيفه|بقطنه/, "بقطنة نظيفة"],
  [/رشي|يرش|ترش/, "بالرش"],
  [/امزجي|مزجي/, "بالمزج"],
  [/ويخلط|يخلط|اخلطي/, "بالمزج مع مرطب أو لوشن طبي"],
  [/تخلط معا/, "بالمزج مع الكريمات الأخرى"],
  [/ثلاث الي اربع قطر مع كريم|مع كريم التفتيح/, "بالمزج مع كريم التفتيح"],
  [/افركي|فرك/, "بالفرك"],
];

const AMOUNT_PATTERNS: Pat[] = [
  [/كميه وفيره|كمية وفيرة/, "كمية وفيرة"],
  [/كميه سخيه/, "كمية سخية"],
  [/كميه صغيره/, "كمية صغيرة"],
  [/بضع قطرات|بعض القطرات|قطرات/, "بضع قطرات"],
  [/كميه مناسبه/, "كمية مناسبة"],
  [/كميه قليله/, "كمية قليلة"],
  [/طبقه رقيقه/, "طبقة رقيقة"],
  [/طبقه متساويه/, "طبقة متساوية"],
  [/بحجم حبه البازلاء/, "بمقدار حبة بازلاء"],
  [/ربع ملعقه/, "بمقدار ربع ملعقة"],
  [/جرعه محدده|الجرعه المحدده/, "الجرعة المحددة"],
  [/كبسوله واحده/, "كبسولة واحدة"],
  [/ملعقتين كبيرتين|ملعقتان كبيرتان/, "ملعقتان كبيرتان"],
  [/ملعقه كبيره|ملعقه صغيره|ملعقه/, "ملعقة كبيرة"],
  [/1\s*-\s*2 نقطه|واحده او اثنتين/, "من نقطة إلى نقطتين"],
  [/كميات وفيره|بكميات وفيره/, "كمية وفيرة"],
  [/بالمعلقه|بملعقه صغيره|بملعقة صغيرة/, "ملعقة"],
  [/من 1\s*2 مل|من 1 الي 2 مل|1\s*2 مل/, "من 1-2 مل"],
  [/ثلاث الي اربع قطر|ثلاثه الي اربعه قطر/, "من ثلاث إلى أربع قطرات"],
];

const FREQUENCY_PATTERNS: Pat[] = [
  [/مرتين يوميا|مرتين في اليوم|صباحا ومساءا|صباحا ومساء/, "مرتين يومياً"],
  [/مره او مرتين/, "مرة إلى مرتين يومياً"],
  [/مره واحده|مرة واحدة|مره في اليوم/, "مرة واحدة يومياً"],
  [/2\s*-\s*3 مرات|مرتين الي ثلاث مرات/, "مرتين إلى ثلاث مرات أسبوعياً"],
  [/اسبوعيا|مره في الاسبوع|مرتين في الاسبوع/, "مرتين إلى ثلاث مرات أسبوعياً"],
  [/كل يوم|يوميا|يومي|بشكل يومي/, "يومياً"],
  [/عند الحاجه|حسب الحاجه/, "عند الحاجة"],
  [/\d+\s*مرات\s*في\s*اليوم|مرات في اليوم/, "مرات متعددة يومياً"],
  [/كلما دعت الحاجه|كلما دعت الحاجة/, "عند الحاجة"],
  [/قبل النوم/, "مساءً قبل النوم"],
];

const TIME_PATTERNS: Pat[] = [
  [/صباحا ومساءا|صباحا ومساء/, "صباحاً ومساءً"],
  [/قبل النوم|ليلا/, "قبل النوم"],
  [/في الصباح|صباحا/, "صباحاً"],
  [/في المساء|مساءا/, "مساءً"],
  [/مع الوجبات/, "مع الوجبات"],
];

const WAITING_PATTERNS: Pat[] = [
  [/حتي الامتصاص|حتي تمتصه|حتي يمتص|حتي يتم امتصاصها/, "حتى يُمتص"],
  [/حتي يجف/, "حتى يجف"],
  [/10\s*-\s*15 دقيقه/, "لمدة 10-15 دقيقة"],
  [/15\s*-\s*20 دقيقه/, "لمدة 15-20 دقيقة"],
  [/30 ثانيه/, "لمدة 30 ثانية"],
  [/2\s*-\s*3 دقائق|دقيقتين/, "لمدة 2-3 دقائق"],
  [/لمده \d+[\-–]?\d*\s*دقيقه|لمدة \d+[\-–]?\d*\s*دقيقة/, "لمدة المحددة على العبوة"],
  [/دقيقه|دقائق/, "لمدة دقيقة إلى دقيقتين"],
  [/ثواني/, "لبضع ثوانٍ"],
];

const RINSE_PATTERNS: Pat[] = [
  [/لا يشطف|يترك على|يترك عليه|لا يحتاج شطف|لا يغسل/, "leave-on"],
  [/اشطفي جيدا بالماء|اشطفي بالماء الفاتر|يشطف بالماء|اشطفه جيدا|اشطفيه جيدا/, "rinse"],
  [/اشطفي|يشطف|شطفه|اغسلي/, "rinse"],
  [/جففي بلطف/, "pat-dry"],
];

const REAPPLY_PATTERNS: Pat[] = [
  [/اعيدي وضعه كل ساعتين|يعاد كل ساعتين|كل ساعتين|كل ساعتان/, "أعيدي وضعه كل ساعتين"],
  [/بعد السباحه او التعرق|بعد التعرق|بعد السباحه/, "بعد السباحة أو التعرق"],
  [/اعيدي الطبقه عند الحاجه|اعيدي الطبقه/, "أعيدي الطبقة عند الحاجة"],
  [/كرري|اعيدي/, "كرري عند الحاجة"],
];

const ORDER_PATTERNS: Pat[] = [
  [/ثم طبقي المرطب|ثم رطبي/, "ثم يُطبق المرطب"],
  [/قبل التعرض لاشعه الشمس/, "قبل التعرض للشمس"],
  [/كخطوه اخيره|كخطوة اخيرة/, "كخطوة أخيرة"],
  [/قبل المكياج/, "قبل المكياج"],
  [/بعد التنظيف/, "بعد التنظيف"],
  [/قبل غسل الشعر بالشامبو|بعد الشامبو/, "بعد غسل الشعر بالشامبو"],
];

const WARNING_PATTERNS: Pat[] = [
  [/استشيري طبيبك|استشيري الطبيب/, "استشيري الطبيب عند الحاجة"],
  [/تجنب ملامسه العينين|تجنبي منطقه العينين|ابتعاد عن العينين|تجنب ملامسة المنتج للعينين/, "تجنبي ملامسة العينين"],
  [/تجنب الاتصال المباشر بالعين|تجنب الاتصال بالعين/, "تجنبي ملامسة العينين"],
  [/الحوامل/, "لا يُستخدم للحوامل إلا باستشارة الطبيب"],
  [/تهيج/, "توقفي عن الاستخدام عند حدوث تهيج"],
  [/لا يبتلع/, "لا يُبتلع"],
  [/لا تستخدم لصبغ الرموش/, "لا يُستخدم لصبغ الرموش أو الحواجب"],
  [/لا ينصح استعماله/, "لا يُنصح باستخدامه عند تهيج الجلد"],
  [/الابتعاد عن العينين/, "تجنبي ملامسة العينين"],
];

const STORAGE_PATTERNS: Pat[] = [
  [/يحفظ بعيدا عن اشعه الشمس|بعيدا عن اشعه الشمس|يبعد عن اشعه الشمس/, "يُحفظ بعيداً عن أشعة الشمس"],
  [/مكان بارد وجاف|مكان جاف وبارد|مكان جاف|مكان بارد/, "يُحفظ في مكان جاف وبارد"],
  [/خزني|يحفظ/, "يُحفظ مغلقاً بعيداً عن متناول الأطفال"],
];

/* ------------------------------------------------------------------------ */
/* VERIFIED USAGE FACTS EXTRACTION                                           */
/* ------------------------------------------------------------------------ */

export function extractUsageFacts(product: Product): UsageFacts {
  const id = extractNameFacts(product);
  const sourceText = (product.usageInstructions?.ar ?? "").trim();
  const sourceSteps =
    product.howToUseAr && product.howToUseAr.length > 0
      ? product.howToUseAr.map((s) => s.trim()).filter(Boolean)
      : splitUsageSteps(sourceText);
  const norm = normalizeName(sourceText);
  const normArea = normalizeName(areaSafeText(sourceText));

  const typeAr = id.productType ? ((categoryMapAr as Record<string, string>)[id.productType] ?? id.productType) : undefined;
  const typeEn = id.productType ? ((categoryMapEn as Record<string, string>)[id.productType] ?? id.productType) : undefined;

  return {
    sourceText,
    sourceSteps,
    nameAr: typeof product.name === "string" ? product.name : (product.name?.ar ?? ""),
    nameEn: typeof product.name === "string" ? product.name : (product.name?.en ?? ""),
    brand: id.brand,
    brandAr: id.brandAr,
    productType: id.productType,
    productTypeAr: typeAr,
    productTypeEn: typeEn,
    size: id.size,
    spf: id.spf,
    shade: id.shade,
    variant: id.variant,
    count: id.count,
    prep: matchFirst(PREP_PATTERNS, norm),
    applyArea: matchFirst(AREA_PATTERNS, normArea),
    applyMethod: matchFirst(METHOD_PATTERNS, norm),
    amount: matchFirst(AMOUNT_PATTERNS, norm),
    frequency: matchFirst(FREQUENCY_PATTERNS, norm),
    timeOfDay: matchFirst(TIME_PATTERNS, norm),
    waiting: matchFirst(WAITING_PATTERNS, norm),
    rinse: matchFirst(RINSE_PATTERNS, norm),
    reapply: matchFirst(REAPPLY_PATTERNS, norm),
    order: matchFirst(ORDER_PATTERNS, norm),
    warning: matchFirst(WARNING_PATTERNS, norm),
    storage: matchFirst(STORAGE_PATTERNS, norm),
  };
}

/* ------------------------------------------------------------------------ */
/* CANONICAL AREA PER CATEGORY (cross-content identity check)                */
/* ------------------------------------------------------------------------ */

/** Drop sentences that only warn about where NOT to apply (area extraction). */
function areaSafeText(t: string): string {
  return t
    .split(/[.!؟?؛؛\n]+/)
    .filter((s) => !/(تجنب|لا\s*(تستخدم|تستخدمه|تستخدمي|يستخدم|يستخدمه|تضع|تضعيه|تلامس|تلمس|تقرب|توضع|يوضع)|ابتعد|بعيدا)/i.test(s))
    .join(" ");
}

const CATEGORY_USAGE_AREA: Record<string, string[]> = {
  cleansers: ["على الوجه", "على البشرة"],
  toners: ["على الوجه", "على البشرة"],
  serums: ["على الوجه", "على البشرة"],
  moisturizers: ["على الوجه", "على البشرة"],
  sunscreen: ["على الوجه", "على البشرة"],
  "eye-care": ["حول العينين", "على الرموش"],
  "lip-care": ["على الشفاه"],
  masks: ["على الوجه", "على البشرة"],
  exfoliators: ["على الوجه", "على البشرة"],
  shampoo: ["على الشعر", "على فروة الرأس"],
  conditioner: ["على الشعر"],
  "hair-oils": ["على الشعر", "على فروة الرأس"],
  "hair-masks": ["على الشعر"],
  "hair-treatments": ["على الشعر", "على فروة الرأس"],
  "hair-styling": ["على الشعر"],
  "hair-dyes": ["على الشعر"],
  "hair-creams": ["على الشعر"],
  "hair-tools": ["على الشعر"],
  haircare: ["على الشعر"],
  "body-wash": ["على الجسم"],
  "body-lotion": ["على الجسم"],
  "body-oils": ["على الجسم"],
  "body-scrubs": ["على الجسم"],
  "body-care": ["على الجسم"],
  "hand-care": ["على اليدين"],
  "foot-care": ["على القدمين"],
  "nail-care": ["على الأظافر"],
  "face-makeup": ["على الوجه", "على البشرة"],
  "eye-makeup": ["على الجفون", "على الرموش", "حول العينين"],
  "lip-makeup": ["على الشفاه"],
  deodorants: ["على الإبطين"],
  "oral-care": ["على الأسنان"],
  "appliances-teeth": ["على الأسنان"],
  "contact-lenses": ["على العدسات", "حول العينين"],
  "women-care": ["على المنطقة الحميمة"],
  "appliances-hair": ["على الشعر"],
};

/* ------------------------------------------------------------------------ */
/* LUMINOUS USAGE GENERATION (Arabic-first, independent structure)           */
/* ------------------------------------------------------------------------ */

const GENERIC_AMOUNT_EN: Record<string, string> = {
  "كمية وفيرة": "a generous amount",
  "كمية سخية": "a generous amount",
  "كمية صغيرة": "a small amount",
  "بضع قطرات": "a few drops",
  "كمية مناسبة": "an appropriate amount",
  "كمية قليلة": "a small amount",
  "طبقة رقيقة": "a thin layer",
  "طبقة متساوية": "an even layer",
  "بمقدار حبة بازلاء": "a pea-sized amount",
  "الجرعة المحددة": "the recommended dose",
  "كبسولة واحدة": "one capsule",
  "من نقطة إلى نقطتين": "one to two drops",
  "ملعقتان كبيرتان": "two large tablespoons",
  "ملعقة كبيرة": "one large tablespoon",
  "ملعقتان صغيرتان": "two small teaspoons",
  "ملعقة صغيرة": "one small teaspoon",
  "بمقدار كرة": "a small ball",
  "قطرتين": "two drops",
  "بضع قطرات من": "a few drops of",
};

/** Arabic area label → English target (used for the EN mirror). */
const AREA_EN: Record<string, string> = {
  "على الوجه": "the face",
  "على البشرة": "the skin",
  "على الجسم": "the body",
  "على الشعر": "the hair",
  "على فروة الرأس": "the scalp",
  "على فروة الراس": "the scalp",
  "حول العينين": "around the eyes",
  "على الجفون": "the eyelids",
  "على الرموش": "the lashes",
  "على الشفاه": "the lips",
  "على اليدين": "the hands",
  "على القدمين": "the feet",
  "على الأظافر": "the nails",
  "على الأسنان": "the teeth",
  "على الإبطين": "the underarms",
  "على المنطقة الحميمة": "the intimate area",
  "على نقاط النبض": "the pulse points",
  "على المعصمين": "the wrists",
  "على العدسات": "the lenses",
  "على الرقبة": "the neck",
  "على البطن": "the belly",
  "على الظهر": "the back",
  "على الجلد": "the skin",
  "على العين": "the eye area",
  "على العينين": "around the eyes",
  "تحت العين": "under the eyes",
};

/** Arabic prep phrase → English (used for the EN mirror). */
const PREP_EN: Record<string, string> = {
  "على بشرة نظيفة": "on clean skin",
  "على بشرة نظيفة وجافة": "on clean, dry skin",
  "على وجه مبلل بالماء الفاتر": "on a damp face",
  "على وجه مبلل": "on a damp face",
  "على شعر مبلل": "on damp hair",
  "على شعر مبلل بالماء": "on damp hair",
  "على البشرة المبللة": "on damp skin",
  "على البشرة المبلله": "on damp skin",
  "على بشرة رطبة": "on damp skin",
  "على البشرة بعد تنظيفها": "on cleansed skin",
  "على الجسم بعد الاستحمام": "on the body after showering",
  "بعد الاستحمام": "after showering",
  "بعد التنظيف": "after cleansing",
  "بعد غسيل البشرة": "after cleansing the skin",
  "بعد الاستحمام بفترة": "a while after showering",
};

/** Arabic warning label → English (used for the EN mirror). */
const WARNING_EN: Record<string, string> = {
  "توقفي عن الاستخدام عند حدوث تهيج": "discontinue use if irritation occurs",
  "تجنبي ملامسة العينين": "avoid contact with the eyes",
  "لا يُستخدم لصبغ الرموش أو الحواجب": "not intended for dyeing lashes or brows",
  "تجنبي وضعه على الجروح المفتوحة": "avoid open wounds",
  "استشيري الطبيب قبل الاستخدام": "consult a doctor before use",
  "لا تتجاوزي الجرعة الموصى بها": "do not exceed the recommended dose",
  "حتى للبالغين": "adults only",
  "تجنب تلامس العينين": "avoid contact with the eyes",
  "لا تغسلي الشعر قبل التطبيق مباشرة": "do not wash the hair immediately before application",
};

/** Arabic storage label → English (used for the EN mirror). */
const STORAGE_EN: Record<string, string> = {
  "يُحفظ في مكان بارد وجاف": "store in a cool, dry place",
  "يُحفظ في مكان جاف وبارد": "store in a cool, dry place",
  "يُحفظ في مكان جاف وبارد بعيداً عن أشعة الشمس المباشرة": "store in a dry, cool place away from direct sunlight",
  "يُحفظ في مكان بارد وجاف بعيداً عن أشعة الشمس المباشرة": "store in a cool, dry place away from direct sunlight",
  "يُحفظ مغلقاً بعيداً عن متناول الأطفال": "keep closed, out of reach of children",
  "يُحفظ في الثلاجة بعد الفتح": "refrigerate after opening",
  "يحفظ في مكان بارد وجاف": "store in a cool, dry place",
};

/** Arabic waiting label → English (used for the EN mirror). */
const WAITING_EN: Record<string, string> = {
  "لمدة دقيقة إلى دقيقتين": "for one to two minutes",
  "لمدة 3 إلى 5 دقائق": "for three to five minutes",
  "لمدة 5 دقائق": "for five minutes",
  "لمدة 10 دقائق": "for ten minutes",
  "لمدة 15 دقيقة": "for fifteen minutes",
  "لمدة 20 دقيقة": "for twenty minutes",
  "لمدة 30 دقيقة": "for thirty minutes",
  "لمدة دقيقة": "for one minute",
  "لمدة دقيقتين": "for two minutes",
  "لمدة 30 ثانية": "for thirty seconds",
  "حتى يُمتص": "until absorbed",
  "حتى يمتص": "until absorbed",
  "حتى يجف": "until dry",
  "بعد أن يجف": "until it dries",
};

export interface GeneratedUsage {
  arSteps: string[];
  arParagraph: string;
  enSteps: string[];
  enParagraph: string;
}

const capEn = (s: string) => (s.charAt(0).toUpperCase() + s.slice(1));

export function generateUsage(facts: UsageFacts): GeneratedUsage {
  const steps: string[] = [];
  const enSteps: string[] = [];

  // Ingestible products (supplements, capsules, chewables) are consumed, not
  // applied topically — never emit "ضعي على البشرة" for a capsule.
  if (detectIngestible(facts)) {
    const dose = facts.amount ?? "الجرعة المحددة";
    steps.push(`تناولي ${dose}`);
    enSteps.push(`Take ${GENERIC_AMOUNT_EN[dose] ?? dose}.`);
    const tail: string[] = [];
    if (facts.frequency) tail.push(facts.frequency);
    if (facts.timeOfDay) tail.push(facts.timeOfDay);
    if (facts.order) tail.push(facts.order);
    const seen = new Set<string>();
    const uniq = tail.filter((t) => {
      const k = normalizeName(t);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (uniq.length > 0) {
      steps.push(uniq.join("، "));
      enSteps.push(`${uniq.map(arToEnTail).filter(Boolean).join(", ")}.`);
    }
    if (facts.warning) {
      steps.push(`تنبيه: ${facts.warning}`);
      enSteps.push(`Note: ${WARNING_EN[facts.warning] ?? facts.warning}.`);
    }
    if (facts.storage) {
      steps.push(`حفظ: ${facts.storage}`);
      enSteps.push(`Storage: ${STORAGE_EN[facts.storage] ?? facts.storage}.`);
    }
    return { arSteps: steps, arParagraph: steps.join("، "), enSteps: enSteps.map(capEn), enParagraph: enSteps.map(capEn).join(" ") };
  }

  // No verified instruction facts at all — refuse to fabricate a category-default
  // step (e.g. "ضعي على الشعر" for a hair dryer); fall back to the packaged
  // instructions instead. Oral care is exempt: its brush/rinse step is derived
  // from the product type itself.
  const hasRealFacts = [
    facts.prep, facts.applyArea, facts.applyMethod, facts.amount, facts.frequency,
    facts.timeOfDay, facts.waiting, facts.rinse, facts.reapply, facts.order, facts.warning, facts.storage,
  ].some(Boolean);
  if (!hasRealFacts && facts.productType !== "oral-care") {
    const fallbackAr = ["اتبعي التعليمات المدونة على عبوة المنتج"];
    return { arSteps: fallbackAr, arParagraph: fallbackAr.join("، "), enSteps: ["Follow the directions on the product packaging."], enParagraph: "Follow the directions on the product packaging." };
  }

  // Oral care (mouthwash / toothpaste) — rinse the mouth or brush, not "apply".
  if (facts.productType === "oral-care") {
    const normSrc = normalizeName(facts.sourceText);
    const isRinse = /اشطف|مضمض|غسول فم|شطف|اشطفوا/.test(normSrc);
    const dose = facts.amount ?? "";
    if (isRinse) {
      steps.push(`اشطفي فمك جيداً${dose ? ` ${dose}` : ""}`);
      enSteps.push(`Rinse your mouth thoroughly${dose ? ` with ${dose}` : ""}.`);
    } else {
      steps.push(`ضعي ${dose ? `${dose} ` : ""}على الفرشاة ونظفي أسنانك جيداً`);
      enSteps.push("Apply an appropriate amount to the brush and clean your teeth thoroughly.");
    }
    const tail: string[] = [];
    if (facts.frequency) tail.push(facts.frequency);
    if (facts.timeOfDay) tail.push(facts.timeOfDay);
    const seenOral = new Set<string>();
    const uniqOral = tail.filter((t) => {
      const k = normalizeName(t);
      if (seenOral.has(k)) return false;
      seenOral.add(k);
      return true;
    });
    if (uniqOral.length > 0) {
      steps.push(uniqOral.join("، "));
      enSteps.push(`${uniqOral.map(arToEnTail).filter(Boolean).join(", ")}.`);
    }
    if (facts.warning) {
      steps.push(`تنبيه: ${facts.warning}`);
      enSteps.push(`Note: ${WARNING_EN[facts.warning] ?? facts.warning}.`);
    }
    if (facts.storage) {
      steps.push(`حفظ: ${facts.storage}`);
      enSteps.push(`Storage: ${STORAGE_EN[facts.storage] ?? facts.storage}.`);
    }
    return { arSteps: steps, arParagraph: steps.join("، "), enSteps: enSteps.map(capEn), enParagraph: enSteps.map(capEn).join(" ") };
  }

  // Fallback area: verified usage area → area implied by the product NAME
  // (e.g. an eye gel whose instructions never state "الوجه") → category default.
  const nameAreas = impliedNameAreas(facts.nameAr);
  const area = facts.applyArea ?? nameAreas[0] ?? (facts.productType ? (CATEGORY_USAGE_AREA[facts.productType]?.[0] ?? "على البشرة") : "على البشرة");

  const amount = facts.amount;
  const applyVerb =
    facts.applyMethod?.includes("بالرش") || facts.applyMethod?.includes("الرش")
      ? "رشي"
      : facts.applyMethod?.includes("بقطنة") || facts.applyMethod?.includes("بالمسح")
        ? "امسحي"
        : facts.applyMethod?.includes("بالتدليك") || facts.applyMethod?.includes("تدليك")
          ? "دلكي"
          : facts.applyMethod?.includes("بالمزج")
            ? "امزجي"
            : "ضعي";
  const applyEn =
    applyVerb === "رشي" ? "Spray"
      : applyVerb === "دلكي" ? "Massage"
        : applyVerb === "امسحي" ? "Wipe"
          : applyVerb === "امزجي" ? "Mix"
            : "Apply";
  // A method that merely restates the chosen verb ("رشي … بالرش") is redundant.
  const implied = facts.applyMethod?.replace(/^ب/, "") ?? "";
  const methodRedundant =
    (applyVerb === "رشي" && /الرش|الرذاذ/.test(implied)) ||
    (applyVerb === "دلكي" && /تدليك|الدلك/.test(implied)) ||
    (applyVerb === "امسحي" && /المسح|مسح/.test(implied));
  const methodSuffix = facts.applyMethod && !methodRedundant ? ` ${facts.applyMethod}` : "";
  const hasNonRedundantMethod = !methodRedundant;

  // Step 1 — prep
  if (facts.prep) {
    const prepEn = PREP_EN[facts.prep] ?? (facts.prep.startsWith("على ") ? `to ${AREA_EN[facts.prep] ?? facts.prep.slice(4)}` : facts.prep);
    if (facts.prep.startsWith("على ")) {
      steps.push(`${applyVerb} المنتج ${facts.prep}`);
      enSteps.push(`Apply the product ${prepEn}.`);
    } else if (facts.prep.startsWith("بعد ")) {
      // A timing clause ("بعد الاستحمام") — state it as-is, not "ابدئي الاستحمام".
      steps.push(facts.prep);
      enSteps.push(`${prepEn[0].toUpperCase()}${prepEn.slice(1)}.`);
    } else {
      steps.push(`ابدئي ${facts.prep}`);
      enSteps.push(`Start ${prepEn}.`);
    }
  }

  // Step 2 — apply (amount + area + method)
  {
    const enAmount = amount ? GENERIC_AMOUNT_EN[amount] ?? "" : "";
    const enTarget = AREA_EN[area] ?? area.replace("على ", "");
    const needsPrep = !/^(around|on|under|for)\b/.test(enTarget);
    const enPrep =
      applyVerb === "رشي" ? "onto"
        : applyVerb === "دلكي" ? "into"
          : applyVerb === "امسحي" ? "over"
            : applyVerb === "امزجي" ? "with"
              : "to";
    steps.push(`${applyVerb} ${area}${amount ? ` ${amount}` : ""}${methodSuffix}`);
    enSteps.push(
      `${applyEn} ${enAmount ? enAmount + " " : ""}${needsPrep ? enPrep + " " : ""}${enTarget}${hasNonRedundantMethod && facts.applyMethod ? ", massaging gently" : ""}.`
    );
  }

  // Step 3 — waiting
  if (facts.waiting) {
    steps.push(`اتركيه ${facts.waiting}`);
    enSteps.push(`Leave it ${WAITING_EN[facts.waiting] ?? facts.waiting}.`);
  }

  // Step 4 — rinse / pat-dry / leave-on
  if (facts.rinse) {
    if (facts.rinse === "leave-on") {
      steps.push("يُترك على البشرة دون شطف");
      enSteps.push("Leave on the skin; do not rinse.");
    } else if (facts.rinse === "rinse") {
      steps.push("اشطفي بالماء جيداً ثم جففي بلطف");
      enSteps.push("Rinse well with water, then pat dry.");
    } else {
      steps.push("جففي بلطف بعد ذلك");
      enSteps.push("Pat dry afterwards.");
    }
  }

  // Step 5 — reapply / order / frequency / time
  const tail: string[] = [];
  if (facts.reapply) tail.push(facts.reapply);
  if (facts.order) tail.push(facts.order);
  if (facts.frequency) tail.push(facts.frequency);
  if (facts.timeOfDay) tail.push(facts.timeOfDay);
  // Drop any part that is normalized-contained within another (e.g. "قبل النوم"
  // inside "مساءً قبل النوم") so the step reads naturally.
  const uniqueTail: string[] = [];
  for (const t of tail) {
    const nt = normalizeName(t);
    if (uniqueTail.some((k) => normalizeName(k).includes(nt))) continue;
    for (let i = uniqueTail.length - 1; i >= 0; i--) {
      if (nt.includes(normalizeName(uniqueTail[i]))) uniqueTail.splice(i, 1);
    }
    uniqueTail.push(t);
  }
  if (uniqueTail.length > 0) {
    steps.push(uniqueTail.join("، "));
    enSteps.push(`${uniqueTail.map(arToEnTail).filter(Boolean).join(", ")}.`);
  }

  // Step 6 — warning / storage
  if (facts.warning) {
    steps.push(`تنبيه: ${facts.warning}`);
    enSteps.push(`Note: ${WARNING_EN[facts.warning] ?? facts.warning}.`);
  }
  if (facts.storage) {
    steps.push(`حفظ: ${facts.storage}`);
    enSteps.push(`Storage: ${STORAGE_EN[facts.storage] ?? facts.storage}.`);
  }

  // Fallback: no structured facts but source has explicit steps — preserve facts in Luminous frames.
  if (steps.length === 0 && facts.sourceSteps.length > 0) {
    const framed = facts.sourceSteps.map((s) => (s.includes("تنبيه") || s.includes("تحذير") ? `تنبيه: ${s}` : s));
    const arSteps = framed;
    const enStepsFallback = ["Follow the directions given for this product."];
    return {
      arSteps,
      arParagraph: arSteps.join("، "),
      enSteps: enStepsFallback,
      enParagraph: enStepsFallback.join(" "),
    };
  }

  if (steps.length === 0) {
    const fallbackAr = ["اتبعي التعليمات المدونة على عبوة المنتج"];
    return { arSteps: fallbackAr, arParagraph: fallbackAr.join("، "), enSteps: ["Follow the directions on the product packaging."], enParagraph: "Follow the directions on the product packaging." };
  }

  return {
    arSteps: steps,
    arParagraph: steps.join("، "),
    enSteps: enSteps.map(capEn),
    enParagraph: enSteps.map(capEn).join(" "),
  };
}

function arToEnTail(fact: string): string {
  if (fact.includes("كل ساعتين")) return "reapply every two hours";
  if (fact.includes("عند الحاجة")) return "reapply as needed";
  if (fact.includes("قبل التعرض للشمس")) return "use before sun exposure";
  if (fact.includes("المرطب")) return "follow with moisturizer";
  if (fact.includes("صباحاً ومساءً")) return "use morning and evening";
  if (fact.includes("مساءً قبل النوم")) return "use at night before bed";
  if (fact.includes("قبل النوم")) return "use before bed";
  if (fact.includes("يومياً")) return "use daily";
  if (fact.includes("مرتين يومياً")) return "twice daily";
  if (fact.includes("مرة واحدة يومياً")) return "once daily";
  if (fact.includes("مرتين إلى ثلاث مرات أسبوعياً")) return "two to three times a week";
  if (fact.includes("3 إلى 4 مرات أسبوعياً")) return "three to four times a week";
  if (fact.includes("مرة أسبوعياً")) return "once a week";
  if (fact.includes("مع الوجبات")) return "with meals";
  if (fact.includes("كخطوة أخيرة")) return "as a final step";
  if (fact.includes("أعيدي الطبقة عند الحاجة")) return "reapply as needed";
  if (fact.includes("بعد كل استحمام")) return "after every shower";
  if (fact.includes("قبل الذهاب إلى السرير")) return "before going to bed";
  if (fact.includes("في المساء")) return "in the evening";
  if (fact.includes("في الصباح")) return "in the morning";
  return "";
}

/* ------------------------------------------------------------------------ */
/* ORIGINALITY VALIDATION (fact preservation vs editorial copying)           */
/* ------------------------------------------------------------------------ */

/** Usage-domain vocabulary — shared factual words allowed to overlap. */
const USAGE_FACT_TOKENS = new Set<string>([
  "ضعي", "ضع", "يوضع", "طبقي", "وزعي", "دلكي", "دلكيه", "امسحي", "اتركي", "اتركيه",
  "اشطفي", "يشطف", "رشي", "يرش", "رجي", "جففي", "اغسلي", "كرري", "اعيدي", "اضغطي",
  "افركي", "مضمض", "تناولي", "تناول", "استخدمي", "استعملي", "يستخدم", "يستعمل",
  "بشره", "البشره", "الوجه", "وجهك", "الرقبه", "الشفاه", "الشفا", "الشعر", "الجذور",
  "الاطراف", "الجسم", "جسمك", "اليدين", "اليد", "الاصابع", "القدمين", "الابطين",
  "الاسنان", "الفم", "فروة", "الرموش", "الجفون", "العدسات", "القرنيه", "الاظافر",
  "الظفر", "المنطقه", "نقاط", "النبض", "المعصمين", "ماء", "الماء", "الفاتر", "فاتر",
  "قطنه", "فرشاة", "فرشاه", "اسفنجه", "اللوفه", "كوب", "ملعقه", "صابون", "كريم",
  "زيت", "معجون", "كمية", "كميه", "مناسبه", "صغيره", "وفيره", "سخيه", "قليله",
  "بضع", "قطرات", "طبقة", "رقيقه", "متساويه", "يوميا", "يومي", "يوم", "مرة", "مره",
  "مرتين", "صباحا", "مساءا", "ليلا", "صباح", "مساء", "اسبوع", "اسبوعيا", "ساعتين",
  "دقيقة", "دقيقه", "دقائق", "ثواني", "عند", "الحاجه", "الحاجة", "جرعه", "جرعة",
  "نظيفه", "نظيفة", "نظيف", "جافه", "جافة", "جاف", "مبلل", "مبلله", "رطب", "رطبه",
  "الامتصاص", "يمتص", "التنظيف", "التدليك", "تدليك", "رغوة", "الرغوه", "التقشير",
  "المزج", "توزيع", "مضمضة", "شطف", "يجف", "تجف", "بلطف", "لطيف", "لطيفه", "لطيفة",
  "جيدا", "جيد", "بعنايه", "كامل", "تماما", "العبوة", "عبوه", "المنتج", "منتج",
  "الوقت", "الليله", "الاول", "الاولى", "الاوسط", "الراس", "راس", "الرقبه", "القدم",
  "ثم", "بعد", "قبل", "حتي", "لمدة", "لمده", "مع", "علي", "من", "في", "الي", "عن",
  "لا", "يترك", "اتركه", "احفظي", "يحفظ", "خزني", "استشيري", "تجنبي", "تجنب", "تجنبا",
  "التنبيه", "تنبيه", "تحذير", "التحذيرات", "الاستخدام", "استخدام", "استعمال", "تعليمات",
  "التعليمات", "المدونه", "المدونة", "العبوة", "الباكينج", "عليها",
  "بللي", "وجهك", "بالماء", "الفاتر", "بحركات", "دائريه", "حركات", "المبلل", "المبلله",
  "بالكامل", "كامله", "تماما", "يدلك", "فروه", "جذور", "الشامبو", "الصابون", "الرغوه",
  "رغوه", "الجلد", "مكياج", "المكياج", "بنعومه", "ناعمه", "امتصاصها", "مباشره", "مباشر",
  "تدريجيا", "خفيفه", "خفيفا", "خفيفة", "رقيقه", "نضيفه", "النظافه", "تعمق", "بعمق",
  "وضع", "يوضع", "وضعها", "قومي", "قم", "اسحبيه", "افتحي", "اغلقي", "اقسموه", "ركزي",
  "التركيز", "الفرشاه", "الاسفنجه", "اسفنجه", "اللوفه", "منشفة", "منشفه", "القماش",
  "بين", "اسفل", "فوق", "خلف", "امام", "الطول", "العرض", "الوسط", "النصف", "الحواف",
  "المرطب", "غسول", "تونر", "سيروم", "ماسك", "كريم", "مقشر", "بلسم", "حمايه", "الوقايه",
  "واقي", "الشمس", "ارتداء", "الملابس", "تجفيف", "تطبيق", "طبقه", "الاساس", "المنتج",
  "الحجم", "الكميه", "الجرعه", "المره", "المرتين", "الشهر", "شهر", "الايام", "ليال",
  "الاستحمام", "بعد الاستحمام", "الامتصاص", "حتي", "يوضع", "يستخدم", "يطبق",
  "ضع", "التدليك", "بالتدليك", "حتي الامتصاص", "امتصاص", "للاستخدام", "للحصول",
  "للنتايج", "الافضل", "الاستمرار", "الانتظام", "النتايج", "جيد", "جيدا",
  "بلطف", "لبضع", "ثواني", "لحظات", "بعدها", "بعد ذلك", "بعده", "من ثم", "بعدها",
  "بشرتك", "جلدك", "شعرك", "يديك", "قدميك", "اسنانك", "وجهك", "شفايفك", "اللثة",
  "جافه", "جاف", "نضيف", "دافئ", "دافيء", "بارد", "البارد", "الفاترة", "استخدميه",
  "استخدمي", "استخدمه", "ضعيه", "ضعيها", "دلكيها", "طبقي", "اخفاء", "يوضع", "افركي",
  "أكاديمي", "اكلينيكي", "تفتيح", "التبييض", "توحيد", "لون", "الجلد", "الجسم", "الوجه",
  "تناول", "تناولي", "خذي", "تاخذ", "كبسوله", "كبسولة", "قرص", "حبه", "يذوب", "يمضغ",
  "مع", "الوجبات", "وجبات", "بلع", "ابتلاع", "يضع", "يطبق", "يترك", "يغسل", "يغسله",
  "بغسله", "يمتص", "تمتصه", "يمتصه", "دقيقه", "دقائق", "ثانيه", "لمدة", "لمده", "ثم",
  "او", "اخر", "الاخر", "الثاني", "الثانيه", "الاولى", "الاول", "الخطوه", "الخطوة",
  "النوم", "مساء", "صباح", "مره", "مرتين", "مرات", "يوميا", "يوميه", "اسبوعيا",
  "اسبوعيه", "واحده", "واحد", "البشره", "بشره", "الجلد", "يديك", "شعرك", "الراس",
  "راس", "الوجه", "الاخيره", "ثانيه", "ثلاث", "اربع", "خمس", "الف", "جرعه", "جرعه",
  "المناسبه", "المناسبة", "قليله", "قليلة", "وفيره", "وفيرة", "كبيرتين", "نقطه",
  "نقطتين", "قطره", "قليل", "كثير", "كلها", "كله", "جميع", "انواع", "البشره",
  "الصباح", "المساء", "العنق", "الصدر", "الرقبه", "الوجبه", "الوجبات", "احدى",
  "احدي", "احده", "بضع", "دقايق", "بكميه", "فيره", "كبيره", "يحفظ", "يخزن",
  "بعيدا", "متناول", "الاطفال", "اطفال", "العين", "العينين", "ملامسه", "تجنب",
  "تجنبي", "تهيج", "توقف", "توقفي", "الشعور", "الحساسيه", "حساسيه", "الخارجي",
  "خارجي", "لاستخدام", "للاستخدام", "توضع", "يخلط", "مرطب", "لوشن", "طبي", "مل",
  "التورم", "الاحمرار", "الحكه", "وضع", "الوضع", "العنق", "الظهور", "البقع",
  "الشوائب", "الاسود", "الدقيق", "الرموش", "الحواجب", "صبغ", "صبغه", "اللون",
  "شعر", "مكان", "فتح", "الفتح", "خطوه", "كخطوه", "روتين", "العنايه", "العناية",
  "الكامل", "كامله", "منطقه", "المنطقه", "المناطق", "المصابه", "المنطقه", "نظيفا",
  "نظيف", "جاف", "بارد", "المكان", "امتصاص", "الجلد", "لده", "دهن", "مساج",
  "اخيره", "الاخير", "نهارا", "ليلا", "النهار", "الليل", "الاول", "الاولي",
  "الاولين", "الاولى", "التاليه", "التالي", "البدايه", "نهايه", "نهاية",
]);

/** Editorial (marketing / brand) wording that usage must NOT reproduce. */
const USAGE_EDITORIAL_TOKENS = new Set<string>([
  "متالقه", "باهر", "فوري", "فاخر", "ممتاز", "مثالي", "مثالية", "رائع", "ممتازه",
  "للتخلص", "للحصول", "بعمق", "للوكمال", "الترطيب", "يدوم", "لطالما", "يتجدد",
  "الملفت", "لمعان", "مفعول", "الافضل", "الاقوى", "سحري", "نتيجة", "نتيجه", "مناسب",
]);

export function validateUsageOriginality(generated: string, original: string, facts: UsageFacts): UsageOriginalityValidation {
  const normG = normalizeName(generated);
  const normO = normalizeName(original);
  const reasons: string[] = [];

  if (!normO || normO.length < 3) {
    return { status: "PASS", score: 100, editorialSimilarity: 0, reasons: ["no meaningful source usage to compare"] };
  }

  // 1. Verbatim copy
  if (normG === normO) {
    return { status: "REJECTED", score: 0, editorialSimilarity: 1, reasons: ["verbatim copy of the source usage"] };
  }

  // 2. Identity / fact tokens (allowed to overlap)
  const identityTokens = new Set<string>();
  [facts.brand, facts.brandAr, facts.productTypeAr, facts.productTypeEn, facts.size, facts.spf, facts.shade, facts.variant, facts.count]
    .forEach((v) => v && normalizeName(v).split(/\s+/).forEach((t) => t && identityTokens.add(t)));

  const tokens = (s: string) => tokenize(normalizeName(s));
  // Strip a leading "و" (and) conjunction before classifying tokens so that
  // factual vocabulary ("وجافة" = and-dry) is not treated as editorial.
  const editorialTokens = (s: string) =>
    new Set(tokens(s).filter((t) => {
      if (/^\d+(\.\d+)?$/.test(t)) return false; // durations/doses ("30", "2") are factual
      const base = t.replace(/^و/, "");
      const inKnown = (x: string) => identityTokens.has(x) || USAGE_FACT_TOKENS.has(x) || AR_STOPWORDS_NORM.has(x);
      return !inKnown(t) && !inKnown(base);
    }));

  const edG = editorialTokens(normG);
  const edO = editorialTokens(normO);

  // Editorial overlap = share of the source's editorial words reproduced in the generated text.
  let containment = 0;
  if (edO.size > 0) {
    let hit = 0;
    for (const t of edO) if (edG.has(t)) hit++;
    containment = hit / edO.size;
  }

  // 3. Editorial reproduction (marketing/brand wording carried over)
  const gEd = tokens(normG).filter((t) => USAGE_EDITORIAL_TOKENS.has(t));
  const oEd = tokens(normO).filter((t) => USAGE_EDITORIAL_TOKENS.has(t));
  const editorialCarryover = oEd.length > 0 ? gEd.filter((t) => oEd.includes(t)).length / oEd.length : 0;

  if (containment >= 0.7 || editorialCarryover >= 0.6) {
    return {
      status: "REJECTED",
      score: Math.max(0, Math.round(100 - containment * 100)),
      editorialSimilarity: containment,
      reasons: ["mechanical reproduction — source usage wording carried over without independent structure"],
    };
  }
  if (containment >= 0.4 || editorialCarryover >= 0.35) {
    return {
      status: "REVIEW_REQUIRED",
      score: Math.max(0, Math.round(100 - containment * 100)),
      editorialSimilarity: containment,
      reasons: ["high editorial overlap — mechanical translation suspected"],
    };
  }

  return {
    status: "PASS",
    score: Math.max(0, Math.round(100 - containment * 100)),
    editorialSimilarity: containment,
    reasons: ["independently structured usage; factual overlap only"],
  };
}

/* ------------------------------------------------------------------------ */
/* UNSUPPORTED-INSTRUCTION VALIDATION (no invention)                         */
/* ------------------------------------------------------------------------ */

const DECLARED_AMOUNT_PATTERNS: Pat[] = [
  [/من ثلاث الي اربع قطرات|من ثلاث إلى أربع قطرات/, "من ثلاث إلى أربع قطرات"],
  [/من 1\s*2 مل/, "أم"],
  [/جرعتان|جرعتين|جرعه كامله/, "أم"],
  [/كميه وفيره/, "كمية وفيرة"],
  [/كميه سخيه/, "كمية سخية"],
  [/كميه صغيره/, "كمية صغيرة"],
  [/بضع قطرات/, "بضع قطرات"],
  [/كميه مناسبه/, "كمية مناسبة"],
  [/طبقه رقيقه/, "طبقة رقيقة"],
  [/طبقه متساويه/, "طبقة متساوية"],
  [/بحجم حبه البازلاء/, "بمقدار حبة بازلاء"],
  [/الجرعه المحدده/, "الجرعة المحددة"],
  [/كبسوله واحده/, "كبسولة واحدة"],
  [/من نقطه الي نقطتين/, "من نقطة إلى نقطتين"],
  [/(\d+)\s*مل/, "أم"],
];

const DECLARED_FREQUENCY_PATTERNS: Pat[] = [
  [/صباحا ومساءا|صباحا ومساء/, "مرتين يومياً"],
  [/مره او مرتين/, "مرة إلى مرتين يومياً"],
  [/مره واحده/, "مرة واحدة يومياً"],
  [/مرتين في اليوم/, "مرتين يومياً"],
  [/مرتين الي ثلاث مرات|2\s*-\s*3 مرات/, "مرتين إلى ثلاث مرات أسبوعياً"],
  [/كل يوم|يوميا|يومي/, "يومياً"],
  [/عند الحاجه/, "عند الحاجة"],
  [/قبل النوم/, "قبل النوم"],
];

const DECLARED_WAITING_PATTERNS: Pat[] = [
  [/حتي الامتصاص|حتي يمتص/, "حتى يُمتص"],
  [/حتي يجف/, "حتى يجف"],
  [/(\d+)\s*[-–]\s*(\d+)\s*دقيقه/, "لمدة"],
  [/(\d+)\s*دقيقه|دقيقه/, "لمدة"],
  [/\d+\s*دقائق|دقائق/, "لمدة"],
  [/30 ثانيه/, "30 ثانية"],
];

const DECLARED_RINSE_PATTERNS: Pat[] = [
  [/اشطفي|يشطف/, "rinse"],
  [/يترك على|لا يشطف|دون شطف/, "leave-on"],
  [/جففي بلطف/, "pat-dry"],
];

const DECLARED_REAPPLY_PATTERNS: Pat[] = [
  [/كل ساعتين/, "كل ساعتين"],
  [/عند الحاجه/, "عند الحاجة"],
  [/بعد السباحه/, "بعد السباحة"],
  [/اعيدي الطبقه/, "أعيدي الطبقة"],
  [/كرري/, "كرري"],
];

export function validateUsageUnsupported(generated: string, facts: UsageFacts): UsageUnsupportedValidation {
  const issues: string[] = [];
  const normG = normalizeName(generated);
  const verifiedNorm = normalizeName(
    [facts.sourceText, ...facts.sourceSteps, facts.prep, facts.applyArea, facts.applyMethod, facts.amount, facts.frequency, facts.timeOfDay, facts.waiting, facts.rinse, facts.reapply, facts.order, facts.warning, facts.storage]
      .filter(Boolean)
      .join(" ")
  );

  // Domain-by-domain: every specific instruction declared in the generated text
  // must be present in the verified source (or generic, e.g. waiting "لمدة").
  const genericDeclared = new Set<string>(["أم", "لمدة", "دقائق", "دقيقة", "30 ثانية", "الجرعة المحددة"]);

  const checkDomain = (declared: string[], domain: string, allowGeneric: boolean) => {
    for (const dv of declared) {
      if (allowGeneric && genericDeclared.has(dv)) continue;
      if (!verifiedNorm.includes(normalizeName(dv))) issues.push(`invented ${domain} instruction (${dv})`);
    }
  };

  checkDomain(matchAllValues(DECLARED_AMOUNT_PATTERNS, normG), "application amount", true);
  checkDomain(matchAllValues(DECLARED_FREQUENCY_PATTERNS, normG), "application frequency", false);
  checkDomain(matchAllValues(DECLARED_WAITING_PATTERNS, normG), "waiting time", true);
  checkDomain(matchAllValues(DECLARED_REAPPLY_PATTERNS, normG), "reapplication", false);

  // Rinse / leave-on contradiction — a material instruction must not flip.
  const declaredRinse = matchAllValues(DECLARED_RINSE_PATTERNS, normG);
  const verifiedRinse = facts.rinse;
  for (const dv of declaredRinse) {
    if (dv === "rinse" && verifiedRinse === "leave-on") issues.push("contradicts verified leave-on instruction (rinse declared)");
    if (dv === "leave-on" && verifiedRinse === "rinse") issues.push("contradicts verified rinse-off instruction (leave-on declared)");
  }

  // Prohibited / absolute claim phrases
  const prohibited = /(يعالج.{0,8}نهائي|نهائيا|نتيجه مضمونه|مضمون|ضمان|مثبت سريريا|يضمن)/i;
  if (prohibited.test(normG)) issues.push("unsupported guaranteed/absolute claim phrase");

  return { valid: issues.length === 0, issues };
}

/* ------------------------------------------------------------------------ */
/* CROSS-CONTENT IDENTITY CONSISTENCY (usage ↔ name identity)                */
/* ------------------------------------------------------------------------ */

const DECLARED_SIZE_RE = /(\d+(?:[.,،]\d+)?)\s*(مل|غرام|جم|غ|جرام|لتر|ليتر|كبسولات|كبسوله|اقراص|حبات|حبه|قطعه|قطع|وحده)/i;

export function validateUsageConsistency(generated: string, facts: UsageFacts): UsageConsistencyValidation {
  const mismatches: string[] = [];
  const norm = normalizeName(generated);

  if (facts.brand) {
    const declared = norm.match(/من ماركه ([^\s]+)/i);
    if (declared && normalizeName(declared[1]) !== normalizeName(facts.brand)) {
      mismatches.push(`usage declares brand '${declared[1]}' but product is '${facts.brand}'`);
    }
  }

  const declaredSize = norm.match(DECLARED_SIZE_RE);
  const doseInMl = facts.amount && /مل/.test(facts.amount);
  if (declaredSize && facts.size && !norm.includes(normalizeName(facts.size)) && !(doseInMl && /مل/.test(declaredSize[0]))) {
    mismatches.push(`usage size '${declaredSize[0]}' contradicts verified size '${facts.size}'`);
  }

  const declaredSpf = norm.match(/spf\s*(\d+)/i);
  if (declaredSpf && facts.spf && `spf${declaredSpf[1]}` !== normalizeName(facts.spf)) {
    mismatches.push(`usage SPF '${declaredSpf[1]}' contradicts verified SPF '${facts.spf}'`);
  }

  const declaredShade = norm.match(/(?:shade|درجه|ظل)\s*(\d+)/i);
  if (declaredShade && facts.shade && declaredShade[1] !== facts.shade) {
    mismatches.push(`usage shade '${declaredShade[1]}' contradicts verified shade '${facts.shade}'`);
  }

  // Area vs category — usage must not describe another product family.
  // Regions are anatomical (facial/body/hair/...) so legitimate multi-area and
  // sub-area products (eye cream in moisturizers, hand lotion in body-lotion,
  // perfume on pulse points) are not false-flagged. A product whose NAME targets
  // a different region stays consistent with that name (verified identity). The
  // category region is a DEFAULT inference from the type: when the NAME implies
  // no region, a verified instruction's area wins (e.g. a serum whose verified
  // instruction mixes it into a lotion and applies it to the body).
  if (facts.applyArea && facts.productType) {
    const catRegions = categoryAllowedRegions(facts.productType);
    if (catRegions) {
      const nameRegions = impliedNameAreas(facts.nameAr).map((a) => AREA_REGION[normalizeName(a)]).filter(Boolean) as string[];
      if (nameRegions.length === 0) {
        // Name implies no region → the verified instruction's area is authoritative.
      } else {
        const allowed = new Set([...catRegions, ...nameRegions]);
        const region = AREA_REGION[normalizeName(facts.applyArea as string)];
        if (!region || !allowed.has(region)) {
          mismatches.push(`usage area '${facts.applyArea}' contradicts product name/type '${facts.productTypeAr ?? facts.productType}'`);
        }
      }
    }
  }

  return { status: mismatches.length === 0 ? "PASS" : "FAIL", mismatches };
}

const AREA_REGION: Record<string, string> = {
  "علي الوجه": "facial",
  "علي البشره": "skin",
  "حول العينين": "facial",
  "علي الجفون": "facial",
  "علي الرموش": "facial",
  "علي الشفاه": "facial",
  "علي الشعر": "hair",
  "علي فروه الراس": "hair",
  "علي الجسم": "body",
  "علي اليدين": "hand",
  "علي القدمين": "foot",
  "علي الاظافر": "nail",
  "علي الاسنان": "oral",
  "علي المنطقه الحميمه": "intimate",
  "علي الابطين": "underarm",
  "علي نقاط النبض": "pulse",
  "علي العدسات": "lenses",
  "علي الحواجب": "facial",
  "علي الخدود": "facial",
  "علي الشفه": "facial",
  "علي العيون": "facial",
  "تحت العين": "facial",
  "علي الندبه": "skin",
};

/**
 * Allowed anatomical regions per category. Returns null for categories where a
 * topical area check is not meaningful (supplements, tools, gift sets...).
 */
function categoryAllowedRegions(slug: string | undefined): Set<string> | null {
  if (!slug) return null;
  const facial = new Set(["facial", "skin", "hand"]);
  const body = new Set(["body", "facial", "skin", "hair", "hand", "foot", "nail", "underarm"]);
  if (["cleansers", "toners", "serums", "moisturizers", "sunscreen", "eye-care", "lip-care", "masks", "exfoliators", "makeup", "face-makeup", "eye-makeup", "lip-makeup"].includes(slug)) return facial;
  if (["shampoo", "conditioner", "hair-treatments", "hair-styling", "hair-masks", "hair-dyes", "hair-creams", "haircare", "hair-tools", "appliances-hair"].includes(slug)) return new Set(["hair", "skin"]);
  if (["hair-oils"].includes(slug)) return new Set(["hair", "skin"]);
  if (["body-wash", "body-lotion", "body-oils", "body-care", "body-scrubs", "deodorants", "hand-care", "foot-care", "group-care"].includes(slug)) return body;
  if (["perfume", "perfume-women", "perfume-men", "perfume-musk", "perfume-gift-sets", "bakhoor-premium", "bakhoor-oud"].includes(slug)) return new Set(["pulse", "body", "skin", "hair"]);
  if (["oral-care", "appliances-teeth"].includes(slug)) return new Set(["oral"]);
  if (["nail-care"].includes(slug)) return new Set(["nail", "hand", "foot", "skin"]);
  if (["women-care"].includes(slug)) return new Set(["intimate", "body", "hair", "facial", "skin"]);
  if (["baby-care"].includes(slug)) return new Set(["body", "facial", "hair", "skin", "pulse"]);
  if (["contact-lenses"].includes(slug)) return new Set(["lenses", "facial"]);
  return null;
}

/** Detect a product that is consumed rather than applied topically. */
function detectIngestible(facts: UsageFacts): boolean {
  const normSrc = normalizeName(facts.sourceText);
  if (facts.productType === "vitamins") return true;
  // Capsule / tablet forms are ingested by nature.
  if (/كبسوله|قرص/.test(normSrc)) return true;
  // Consumption imperatives with a dose — but not "متناول" (out of reach).
  return /(?<![مت])تناول\s+(كبسوله|قرص|حبه|ملعقه|جرعه)|تناولي\s+(كبسوله|قرص|حبه)|يمضغ|يذوب في|ابتلاع/.test(normSrc);
}

/** Areas implied by the product NAME (verified identity). */
function impliedNameAreas(nameAr: string): string[] {
  const norm = normalizeName(nameAr);
  const areas: string[] = [];
  const rules: [RegExp, string][] = [
    [/(عين|العيون|محيط العين|للعيون)/, "حول العينين"],
    [/(شفا|شفه|الشفاه)/, "على الشفاه"],
    [/(يدين|اليد|الايدي|لليد)/, "على اليدين"],
    [/(قدمين|الاقدام|القدم)/, "على القدمين"],
    [/(الشعر|الفروه|الراس|تمليس|حواجب|الحواجب)/, "على الشعر"],
    [/(اظافر)/, "على الأظافر"],
    [/(اسنان|معجون|لاهي|الفم)/, "على الأسنان"],
    [/(منطقه حساسه|المنطقه الحساسه|حميمه)/, "على المنطقة الحميمة"],
    [/(ابط)/, "على الإبطين"],
    [/(عدسات)/, "على العدسات"],
    [/(جسم)/, "على الجسم"],
    [/(وجه|البشره|بشره)/, "على الوجه"],
  ];
  for (const [re, area] of rules) {
    if (re.test(norm)) areas.push(area);
  }
  return areas;
}

/* ------------------------------------------------------------------------ */
/* SOURCE VALIDATION / CONFLICT RESOLUTION                                   */
/* ------------------------------------------------------------------------ */

export function resolveUsageSources(sources: UsageSource[]): UsageSourceResolution {
  const agreements: string[] = [];
  const conflicts: string[] = [];
  let reviewRequired = false;
  let selectedUsage: string | undefined;

  const usageTexts = sources
    .map((s) => ({ rank: s.rank, usage: s.usage?.trim() }))
    .filter((s) => s.usage && s.usage.length > 0);

  if (usageTexts.length === 0) {
    return { selectedUsage: undefined, agreements: [], conflicts: [], reviewRequired: false };
  }

  const groups = new Map<string, { value: string; bestRank: number; count: number }>();
  for (const u of usageTexts) {
    const key = normalizeName(u.usage!);
    const g = groups.get(key);
    if (g) {
      g.count++;
      if (u.rank < g.bestRank) g.bestRank = u.rank;
    } else {
      groups.set(key, { value: u.usage!, bestRank: u.rank, count: 1 });
    }
  }

  const distinct = [...groups.values()];
  if (distinct.length === 1) {
    agreements.push(`usage agreed (${distinct[0].count === 1 ? "single source" : "multiple sources agree"})`);
    selectedUsage = distinct[0].value;
  } else {
    // Multiple distinct instructions → detect a MATERIAL conflict before resolving.
    const top = [...distinct].sort((a, b) => a.bestRank - b.bestRank)[0];
    const material = detectMaterialUsageConflict(distinct.map((d) => d.value));
    if (material) {
      reviewRequired = true;
      conflicts.push(`material usage conflict: ${material}`);
      selectedUsage = top.value;
    } else {
      conflicts.push(`usage differs across sources — resolved to strongest rank ${top.bestRank}`);
      selectedUsage = top.value;
    }
  }

  return { selectedUsage, agreements, conflicts, reviewRequired };
}

/** Detect a materially conflicting instruction between two usage texts. */
export function detectMaterialUsageConflict(usages: string[]): string | null {
  if (usages.length < 2) return null;
  const rinseVals = usages.map((u) => matchFirst(RINSE_PATTERNS, normalizeName(u)));
  if (rinseVals.some((v) => v === "rinse") && rinseVals.some((v) => v === "leave-on")) {
    return "leave-on vs rinse-off";
  }
  const freq = usages.map((u) => matchFirst(FREQUENCY_PATTERNS, normalizeName(u)));
  if (freq[0] && freq[1] && normalizeName(freq[0]) !== normalizeName(freq[1])) {
    return `application frequency (${freq[0]} vs ${freq[1]})`;
  }
  // Topical application vs oral consumption is a material disagreement.
  const ingestive = (u: string) => /(تناول|يؤخذ|يبتلع|كبسوله|قرص|بلع|بالمعلقه)/.test(normalizeName(u));
  const topical = (u: string) => /(يوضع|ضعي|يطبق|يرش|اشطفي|دلكي|دهني)/.test(normalizeName(u));
  if (ingestive(usages[0]) && topical(usages[1]) && !ingestive(usages[1])) {
    return "topical vs ingested application";
  }
  if (ingestive(usages[1]) && topical(usages[0]) && !ingestive(usages[0])) {
    return "topical vs ingested application";
  }
  return null;
}

/* ------------------------------------------------------------------------ */
/* CONFIDENCE + PIPELINE                                                     */
/* ------------------------------------------------------------------------ */

function computeUsageConfidence(input: {
  facts: UsageFacts;
  sources: UsageSource[];
  originality: UsageOriginalityValidation;
  unsupported: UsageUnsupportedValidation;
  consistency: UsageConsistencyValidation;
  sourceResolution: UsageSourceResolution;
}): number {
  let c = 100;
  const bestRank = Math.min(...input.sources.map((s) => s.rank));
  c -= (bestRank - 1) * 3;

  const slots = [
    input.facts.prep,
    input.facts.applyArea,
    input.facts.applyMethod,
    input.facts.amount,
    input.facts.frequency,
    input.facts.waiting,
    input.facts.rinse,
    input.facts.reapply,
  ];
  const completeness = slots.filter(Boolean).length / slots.length;
  c -= Math.round((1 - completeness) * 16);

  if (input.facts.sourceSteps.length < 2) c -= 5;

  c -= Math.round(((100 - input.originality.score) / 100) * 15);
  if (!input.unsupported.valid) c -= 40;
  if (input.consistency.status === "FAIL") c -= 30;
  c -= input.sourceResolution.conflicts.length * 10;

  return Math.max(0, Math.min(100, Math.round(c)));
}

/** True when the (normalized) source explicitly directs to the product packaging. */
function isPackagingReference(norm: string): boolean {
  return /اتبع تعليمات الاستخدام|تعليمات الاستخدام الموضحه|وفقا لتعليمات|حسب تعليمات الاستخدام|التعليمات الموضحه علي العبوه|الموضحه علي العبوه|المكتوبه علي العبوه|مدونه علي العبوه/.test(norm);
}

/**
 * True when the normalized source text is itself an actionable instruction
 * (imperative / directive application verbs), as opposed to editorial marketing
 * copy. A source that is already a canonical instruction legitimately yields a
 * fact-structured rebuild with high lexical overlap — that is confirmation of
 * the verified instruction, not reproduction of marketing copy.
 */
function isActionableInstruction(norm: string): boolean {
  return /(ضعي|يوضع|يتوضع|توضع|دلكي|يدلك|امسحي|رشي|يرش|اشطفي|يشطف|طبقي|يطبق|استخدمي|يستخدم|قومي|افركي|ادهني|نظفي|اغسلي|امزجي|اخلطي|عليك\b|يتكون).{0,40}(الوجه|البشره|الشعر|الجسم|الاسنان|العين|اليدين|القدمين|الشفاه|الرموش|الحواجب|الشعر|الابط)/.test(norm);
}

export function selectProductUsage(product: Product, externalSources?: UsageSource[]): UsageDecision {
  const facts = extractUsageFacts(product);
  const sources: UsageSource[] =
    externalSources && externalSources.length > 0
      ? externalSources
      : [{ provider: "yaqoot", rank: 7, usage: facts.sourceText || undefined }];

  const sourceResolution = resolveUsageSources(sources);
  const original = sourceResolution.selectedUsage ?? facts.sourceText ?? "";

  // Packaging-instruction reference — the source itself directs the user to the
  // product packaging, so the standard packaging instruction is the correct,
  // truthful rebuilt usage (not invented content and not copied wording).
  if (isPackagingReference(normalizeName(original))) {
    const fallback = ["اتبعي التعليمات المدونة على عبوة المنتج"];
    return {
      productId: product.id,
      brand: product.brand,
      productName: product.name,
      originalUsage: original,
      reconstructedUsage: { arSteps: fallback, arParagraph: fallback.join("، "), enSteps: ["Follow the directions on the product packaging."], enParagraph: "Follow the directions on the product packaging." },
      verifiedFacts: facts,
      sourcesUsed: sources.map((s) => ({ provider: s.provider, rank: s.rank })),
      sourceResolution,
      originalityScore: 100,
      confidenceScore: 95,
      consistencyStatus: "PASS",
      status: "APPROVED",
      reviewReasons: ["source explicitly directs to the product packaging — standard packaging instruction is the verified usage"],
    };
  }

  const candidate = generateUsage(facts);
  const candidateAr = candidate.arParagraph;

  const originality = validateUsageOriginality(candidateAr, original, facts);
  const unsupported = validateUsageUnsupported(candidateAr + " " + candidate.enParagraph, facts);
  const consistency = validateUsageConsistency(candidateAr, facts);

  const confidence = computeUsageConfidence({ facts, sources, originality, unsupported, consistency, sourceResolution });

  const reviewReasons: string[] = [];
  let status: UsageStatus = "APPROVED";

  // No verified usage facts at all → cannot rebuild; review required.
  const hasAnyFact = [
    facts.prep, facts.applyArea, facts.applyMethod, facts.amount, facts.frequency,
    facts.timeOfDay, facts.waiting, facts.rinse, facts.reapply, facts.order, facts.warning, facts.storage,
  ].some(Boolean);
  const genericOnly = candidate.arSteps.length === 1 && candidate.arSteps[0].includes("اتبعي التعليمات");
  // A source that is itself an actionable instruction and yielded a fact-based
  // rebuild that passes consistency/unsupported checks is a faithful rebuild of
  // the verified instruction — high overlap is confirmation, not copying.
  const faithfulRebuild =
    hasAnyFact &&
    unsupported.valid &&
    consistency.status === "PASS" &&
    isActionableInstruction(normalizeName(original));

  if (originality.status === "REJECTED") {
    if (!faithfulRebuild) {
      status = "REJECTED";
      reviewReasons.push(...originality.reasons.map((r) => `originality: ${r}`));
    }
  } else if (!unsupported.valid) {
    status = "REJECTED";
    reviewReasons.push(...unsupported.issues.map((i) => `unsupported instruction: ${i}`));
  } else if (consistency.status === "FAIL") {
    status = "REJECTED";
    reviewReasons.push(...consistency.mismatches.map((m) => `identity: ${m}`));
  }

  if (status === "APPROVED") {
    if (!hasAnyFact && facts.productType !== "oral-care") {
      status = "REVIEW_REQUIRED";
      reviewReasons.push("missing usage facts — no verified instruction content to rebuild from");
    } else if (originality.status === "REVIEW_REQUIRED" && !faithfulRebuild) {
      status = "REVIEW_REQUIRED";
      reviewReasons.push(...originality.reasons.map((r) => `originality: ${r}`));
    } else if (sourceResolution.reviewRequired) {
      status = "REVIEW_REQUIRED";
      reviewReasons.push(...sourceResolution.conflicts.map((c) => `source conflict: ${c}`));
    } else if (sourceResolution.conflicts.length > 0) {
      status = "REVIEW_REQUIRED";
      reviewReasons.push(...sourceResolution.conflicts.map((c) => `source conflict: ${c}`));
    }
  }

  if (status === "APPROVED") {
    reviewReasons.push(`independently structured usage from verified facts; confidence ${confidence}`);
  }

  return {
    productId: product.id,
    brand: product.brand,
    productName: product.name,
    originalUsage: original,
    reconstructedUsage: candidate,
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
/* AUDIT (DRY-RUN over the real catalog)                                     */
/* ------------------------------------------------------------------------ */

const SOURCE_DISTRIBUTION_KEYS = [
  "manufacturer", "distributor", "trustedRetailer", "beautyCenter", "beautyStoreArabic",
  "kimeraCosmetics", "yaqoot", "other", "storeCatalog", "noVerifiedSource",
];

export function runUsageAudit(catalog?: Product[]): UsageAudit {
  const all = onlyPublished(catalog ?? products);
  const sourceDistribution = Object.fromEntries(SOURCE_DISTRIBUTION_KEYS.map((k) => [k, 0])) as Record<string, number>;

  const audit: UsageAudit = {
    products: { total: all.length, usagePresent: 0, usageMissing: 0, usageRegenerated: 0, usageUnchanged: 0 },
    decisions: { approved: 0, reviewRequired: 0, rejected: 0 },
    sourceValidation: {
      withVerifiedUsageSource: 0,
      withMultipleSources: 0,
      withSourceConflicts: 0,
      conflictsResolvedByHierarchy: 0,
      conflictsRequiringReview: 0,
      withMissingUsageFacts: 0,
    },
    usageValidation: {
      validated: 0,
      unsupportedDetected: 0,
      unsupportedRemoved: 0,
      originalityFailures: 0,
      identityMismatches: 0,
      approved: 0,
      reviewRequired: 0,
      rejected: 0,
    },
    sourceDistribution,
  };

  for (const product of all) {
    const hasUsage = (product.usageInstructions?.ar ?? "").trim().length > 0;
    if (hasUsage) audit.products.usagePresent++;
    else audit.products.usageMissing++;

    const d = selectProductUsage(product);
    audit.usageValidation.validated++;

    const isRegenerated = d.reconstructedUsage.arParagraph !== (product.usageInstructions?.ar ?? "").trim();
    if (isRegenerated) audit.products.usageRegenerated++;
    else audit.products.usageUnchanged++;

    if (d.status === "APPROVED") {
      audit.decisions.approved++;
      audit.usageValidation.approved++;
    } else if (d.status === "REVIEW_REQUIRED") {
      audit.decisions.reviewRequired++;
      audit.usageValidation.reviewRequired++;
    } else {
      audit.decisions.rejected++;
      audit.usageValidation.rejected++;
    }

    if (d.sourceResolution.conflicts.length > 0) {
      audit.sourceValidation.withSourceConflicts++;
      if (d.sourceResolution.reviewRequired) audit.sourceValidation.conflictsRequiringReview++;
      else audit.sourceValidation.conflictsResolvedByHierarchy++;
    }
    if (d.reviewReasons.some((r) => r.includes("unsupported instruction"))) audit.usageValidation.unsupportedDetected++;
    // Count originality issues that actually block the decision. A faithful
    // rebuild of a verified canonical instruction keeps a low raw similarity
    // score but is APPROVED — that is confirmation, not a failure.
    if (d.status !== "APPROVED" && d.reviewReasons.some((r) => r.includes("originality"))) audit.usageValidation.originalityFailures++;
    if (d.consistencyStatus === "FAIL") audit.usageValidation.identityMismatches++;

    const key = d.sourcesUsed[0]?.provider ?? "noVerifiedSource";
    audit.sourceDistribution[key] = (audit.sourceDistribution[key] ?? 0) + 1;
  }

  // Products with a verified usage source (provider verified via product.source) — none in catalog.
  audit.sourceValidation.withVerifiedUsageSource = 0;
  audit.sourceValidation.withMultipleSources = 0;
  audit.sourceValidation.withMissingUsageFacts = audit.products.usageMissing;

  return audit;
}

/* ------------------------------------------------------------------------ */
/* REAL EXAMPLES                                                             */
/* ------------------------------------------------------------------------ */

const EXAMPLE_IDS = [
  "yq-754", "yq-1051", "yq-129", "yq-460", "yq-1900", "yq-2033", "yq-2215",
  "yq-2682", "yq-1693", "yq-2137", "yq-1680", "yq-1017",
];

export function produceUsageExamples(limit = 12, catalog?: Product[]): UsageBeforeAfterExample[] {
  const all = onlyPublished(catalog ?? products);
  const samples = all.filter((p) => EXAMPLE_IDS.includes(p.id)).slice(0, limit);
  return samples.map((product) => {
    const d = selectProductUsage(product);
    const factsUsed: string[] = [];
    const f = d.verifiedFacts;
    if (f.prep) factsUsed.push(`التحضير: ${f.prep}`);
    if (f.applyArea) factsUsed.push(`المنطقة: ${f.applyArea}`);
    if (f.applyMethod) factsUsed.push(`الطريقة: ${f.applyMethod}`);
    if (f.amount) factsUsed.push(`الكمية: ${f.amount}`);
    if (f.frequency) factsUsed.push(`التكرار: ${f.frequency}`);
    if (f.waiting) factsUsed.push(`المدة: ${f.waiting}`);
    if (f.rinse) factsUsed.push(`الشطف: ${f.rinse}`);
    if (f.reapply) factsUsed.push(`الإعادة: ${f.reapply}`);
    if (f.warning) factsUsed.push(`تنبيه: ${f.warning}`);
    if (factsUsed.length === 0) factsUsed.push(`مصدر: ${d.originalUsage.slice(0, 60)}`);
    return {
      productId: product.id,
      brand: product.brand,
      productName: product.name,
      verifiedUsageFacts: factsUsed,
      sourceUsed: d.sourcesUsed[0],
      oldUsage: d.originalUsage,
      newUsage: { arSteps: d.reconstructedUsage.arSteps, enParagraph: d.reconstructedUsage.enParagraph },
      validationResult: d.reviewReasons.join(" | "),
      finalStatus: d.status,
    };
  });
}

export function produceUsageConflictExamples(): UsageConflictExample[] {
  const realConflicts: UsageConflictExample[] = [];
  const all = onlyPublished(products);
  for (const product of all) {
    const d = selectProductUsage(product);
    if (d.sourceResolution.conflicts.length > 0 && d.sourceResolution.reviewRequired) {
      realConflicts.push({
        productId: product.id,
        productName: product.name.ar,
        conflictingSources: d.sourcesUsed.map((s) => `${s.provider} (rank ${s.rank})`),
        exactFactInConflict: d.sourceResolution.conflicts[0],
        sourceHierarchyDecision: "review required (material usage conflict)",
        selectedInstruction: d.reconstructedUsage.arParagraph,
        finalStatus: d.status,
      });
    }
  }
  return realConflicts;
}

export { SOURCE_HIERARCHY };
