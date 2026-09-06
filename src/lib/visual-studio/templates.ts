/**
 * PART 2 / P2 — Official 35-template registry.
 * Pure module (no Next/server imports) so it can be unit-tested with node.
 * Each template is genuinely distinct: own layout family, information
 * hierarchy, copy structure and CTA strategy — not one layout renamed.
 */

export type VisualPlatform =
  | "instagram-post"
  | "instagram-story"
  | "facebook-post"
  | "facebook-story";

export type VisualFormat = "1:1" | "4:5" | "9:16";

export type VisualSourceType =
  | "product"
  | "routine"
  | "bundle"
  | "offer"
  | "campaign"
  | "education";

export type TrustLevel = "none" | "light" | "standard";

export interface ProductCount {
  min: number;
  max: number;
}

/** Data gate: template refuses to generate without supporting evidence. */
export interface TemplateBlocker {
  requires: "live-offer" | "real-deadline" | "verified-rating" | "verified-review" | "is-new" | "routine-steps" | "bundle-contents" | "two-products" | "ingredient-list";
  messageAr: string;
}

export interface VisualTemplateDef {
  id: string; // T01..T35
  slug: string;
  nameAr: string;
  nameEn: string;
  objective: string;
  objectiveAr: string;
  platforms: VisualPlatform[];
  formats: VisualFormat[];
  sourceTypes: VisualSourceType[];
  productCount: ProductCount;
  /** Ordered visual hierarchy, top → bottom (RTL aware). */
  hierarchy: string[];
  hierarchyAr: string[];
  requiredSlots: string[];
  optionalSlots: string[];
  ctaOptions: string[];
  trust: TrustLevel;
  /** Distinct structural family — one per template by design. */
  family: string;
  headlineStyle: string;
  copyStyle: string;
  whyDifferentAr: string;
  blockers?: TemplateBlocker[];
  maxHeadlineWords: number;
  maxSubWords: number;
}

const ALL_FEED: VisualPlatform[] = ["instagram-post", "facebook-post"];
const ALL: VisualPlatform[] = ["instagram-post", "instagram-story", "facebook-post", "facebook-story"];

export const TEMPLATE_CATALOG: VisualTemplateDef[] = [
  // ─── PRODUCT FOCUS ───
  {
    id: "T01", slug: "hero-product", nameAr: "البطل", nameEn: "Hero Product",
    objective: "awareness", objectiveAr: "خلق الرغبة والوعي بالمنتج",
    platforms: ALL, formats: ["1:1", "4:5", "9:16"], sourceTypes: ["product"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["product", "name", "promise", "price", "cta"],
    hierarchyAr: ["المنتج ضخماً في الوسط", "الاسم", "وعد واحد", "السعر", "الزر"],
    requiredSlots: ["productImage", "productName", "headline"], optionalSlots: ["price", "logo"],
    ctaOptions: ["اكتشفيه الآن", "شاهدي التفاصيل"], trust: "none", family: "monument",
    headlineStyle: "وعد واحد قصير", copyStyle: "فاخر مقتضب",
    whyDifferentAr: "تكوين النصب: المنتج يملأ 70% من المساحة ولا نقاط ولا شرح.",
    maxHeadlineWords: 6, maxSubWords: 12,
  },
  {
    id: "T02", slug: "feature-spotlight", nameAr: "تسليط على ميزة", nameEn: "Feature Spotlight",
    objective: "differentiation", objectiveAr: "إبراز ميزة تنافسية واحدة",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["product"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["feature", "proof", "product", "cta"],
    hierarchyAr: ["الميزة برقم ضخم", "سطر إثبات", "المنتج صغيراً", "الزر"],
    requiredSlots: ["featureLabel", "productImage", "headline"], optionalSlots: ["logo"],
    ctaOptions: ["شاهدي التفاصيل", "اكتشفيه الآن"], trust: "none", family: "feature-first",
    headlineStyle: "اسم الميزة نفسها", copyStyle: "تقني مبسط",
    whyDifferentAr: "الميزة أولاً والمنتج ثانوي — معكوس T01.",
    maxHeadlineWords: 5, maxSubWords: 14,
  },
  {
    id: "T03", slug: "quick-benefits", nameAr: "فوائد سريعة", nameEn: "Quick Benefits",
    objective: "comprehension", objectiveAr: "فهم سريع لما يقدمه المنتج",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["product"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["headline", "product", "chips", "cta"],
    hierarchyAr: ["عنوان", "المنتج", "3 شرائح فوائد", "الزر"],
    requiredSlots: ["productImage", "headline", "benefits"], optionalSlots: ["price", "logo"],
    ctaOptions: ["تسوّقي الآن", "اطلبيه الآن"], trust: "light", family: "chips",
    headlineStyle: "سؤال أو وعد", copyStyle: "شرائح قابلة للمسح البصري",
    whyDifferentAr: "لا فقرات إطلاقاً — ثلاث شرائح فقط حول المنتج.",
    maxHeadlineWords: 7, maxSubWords: 10,
  },
  {
    id: "T04", slug: "product-discovery", nameAr: "اكتشاف المنتج", nameEn: "Product Discovery",
    objective: "curiosity", objectiveAr: "إثارة الفضول والنقر",
    platforms: ALL, formats: ["1:1", "4:5", "9:16"], sourceTypes: ["product"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["hook", "teaser", "name", "cta"],
    hierarchyAr: ["خطاف فضولي", "صورة جزئية/مموّهة", "كشف الاسم", "الزر"],
    requiredSlots: ["productImage", "hook", "productName"], optionalSlots: ["logo"],
    ctaOptions: ["اكتشفيه الآن", "شاهدي التفاصيل"], trust: "none", family: "curiosity-gap",
    headlineStyle: "سؤال فضولي", copyStyle: "تشويقي",
    whyDifferentAr: "فجوة الفضول: إخفاء جزئي ثم كشف — لا قالب آخر يخفي المنتج.",
    maxHeadlineWords: 8, maxSubWords: 12,
  },
  {
    id: "T05", slug: "new-arrival", nameAr: "وصل حديثاً", nameEn: "New Arrival",
    objective: "launch", objectiveAr: "إطلاق منتج جديد",
    platforms: ALL, formats: ["1:1", "4:5", "9:16"], sourceTypes: ["product"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["arrival-flag", "product", "what", "cta"],
    hierarchyAr: ["شريط وصل حديثاً", "المنتج", "ما هو", "الزر"],
    requiredSlots: ["productImage", "productName", "headline"], optionalSlots: ["price", "logo"],
    ctaOptions: ["احصلي عليه الآن", "اكتشفيه الآن"], trust: "light", family: "arrival",
    headlineStyle: "إعلان وصول", copyStyle: "احتفالي",
    whyDifferentAr: "الجِدّة هي الرسالة نفسها مع شريط مميز.",
    blockers: [{ requires: "is-new", messageAr: "هذا القالب مخصص للمنتجات الجديدة فقط (isNew)" }],
    maxHeadlineWords: 6, maxSubWords: 12,
  },
  {
    id: "T06", slug: "best-pick", nameAr: "الأكثر طلباً", nameEn: "Best Pick",
    objective: "social-proof", objectiveAr: "الإقناع بالدليل الاجتماعي",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["product"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["rank", "product", "rating", "cta"],
    hierarchyAr: ["شارة الترتيب", "المنتج", "التقييم الموثّق", "الزر"],
    requiredSlots: ["productImage", "productName", "headline"], optionalSlots: ["rating", "price", "logo"],
    ctaOptions: ["اطلبيه الآن", "تسوّقي الآن"], trust: "standard", family: "rank-led",
    headlineStyle: "ترتيب/اختيار", copyStyle: "إثباتي",
    whyDifferentAr: "يقود الترتيبُ التصميمَ؛ التقييم لا يظهر إلا من السجل.",
    blockers: [{ requires: "verified-rating", messageAr: "يتطلب تقييماً موثقاً أو سجل طلبات حقيقياً" }],
    maxHeadlineWords: 6, maxSubWords: 12,
  },
  {
    id: "T07", slug: "premium-product", nameAr: "قطعة فاخرة", nameEn: "Premium Product",
    objective: "luxury", objectiveAr: "تموضع فاخر",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["product"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["brand-whisper", "product", "line", "price", "cta"],
    hierarchyAr: ["همس العلامة", "المنتج", "سطر واحد راقٍ", "السعر", "زر هادئ"],
    requiredSlots: ["productImage", "productName"], optionalSlots: ["price", "logo"],
    ctaOptions: ["اقتنيه الآن", "اكتشفيه الآن"], trust: "none", family: "restraint-luxury",
    headlineStyle: "سطر راقٍ واحد", copyStyle: "تحريري فاخر",
    whyDifferentAr: "التقشّف هو الفخامة: خلفية داكنة وذهبي ولا عناصر ثقة.",
    maxHeadlineWords: 6, maxSubWords: 10,
  },
  {
    id: "T08", slug: "product-story", nameAr: "حكاية منتج", nameEn: "Product Story",
    objective: "connection", objectiveAr: "ارتباط عاطفي",
    platforms: ["instagram-story", "facebook-story", "instagram-post"], formats: ["9:16", "4:5"],
    sourceTypes: ["product"], productCount: { min: 1, max: 1 },
    hierarchy: ["act1", "act2", "act3", "cta"],
    hierarchyAr: ["الفصل الأول", "الفصل الثاني", "الفصل الثالث مع المنتج", "الزر"],
    requiredSlots: ["productImage", "headline", "body"], optionalSlots: ["logo"],
    ctaOptions: ["اكتشفي المنتج", "شاهدي التفاصيل"], trust: "none", family: "three-act",
    headlineStyle: "سردي", copyStyle: "قصصي من 3 فصول",
    whyDifferentAr: "بنية حكائية عمودية لا مواصفات.",
    maxHeadlineWords: 8, maxSubWords: 20,
  },
  // ─── PROBLEM / NEED ───
  {
    id: "T09", slug: "problem-solution", nameAr: "مشكلة وحل", nameEn: "Problem → Solution",
    objective: "conversion", objectiveAr: "تحويل عبر نقطة ألم",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["product", "education"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["concern", "bridge", "benefit", "cta"],
    hierarchyAr: ["المشكلة يساراً", "المنتج جسراً", "الفائدة", "الزر"],
    requiredSlots: ["concernLabel", "productImage", "headline"], optionalSlots: ["logo"],
    ctaOptions: ["اختاري ما يناسبك", "اكتشفيه الآن"], trust: "light", family: "split-screen",
    headlineStyle: "تسمية المشكلة", copyStyle: "تعاطفي مباشر",
    whyDifferentAr: "شاشة منقسمة تبدأ بالألم لا بالمنتج.",
    maxHeadlineWords: 7, maxSubWords: 14,
  },
  {
    id: "T10", slug: "need-based-pick", nameAr: "اختيار حسب حاجتك", nameEn: "Need-Based Pick",
    objective: "guidance", objectiveAr: "إرشاد حسب نوع البشرة/الحاجة",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["product"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["condition", "match", "why", "cta"],
    hierarchyAr: ["الشرط", "المطابقة", "السبب", "الزر"],
    requiredSlots: ["productImage", "headline", "subheadline"], optionalSlots: ["logo"],
    ctaOptions: ["اختاري ما يناسبك", "شاهدي التفاصيل"], trust: "light", family: "matcher",
    headlineStyle: "شرطي: إذا كنتِ...", copyStyle: "إرشادي",
    whyDifferentAr: "منطق شرطي مرئي (إذا/إذن).",
    maxHeadlineWords: 9, maxSubWords: 14,
  },
  {
    id: "T11", slug: "concern-focus", nameAr: "تركيز على مشكلة", nameEn: "Concern Focus",
    objective: "education", objectiveAr: "تثقيف ثم تحويل",
    platforms: ALL_FEED, formats: ["4:5", "1:1"], sourceTypes: ["product", "education"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["explainer", "product", "usage", "cta"],
    hierarchyAr: ["شرح المشكلة", "المنتج كإجابة", "ملاحظة استخدام", "الزر"],
    requiredSlots: ["concernLabel", "productImage", "body"], optionalSlots: ["logo"],
    ctaOptions: ["ابدئي العناية", "اكتشفيه الآن"], trust: "light", family: "education-first",
    headlineStyle: "تثقيفي", copyStyle: "شرح ثم حل",
    whyDifferentAr: "النصف الأول تثقيف خالص والمنتج في النصف الثاني.",
    maxHeadlineWords: 8, maxSubWords: 22,
  },
  {
    id: "T12", slug: "do-you-need-this", nameAr: "هل تحتاجينه؟", nameEn: "Do You Need This?",
    objective: "engagement", objectiveAr: "تفاعل وتأهيل ذاتي",
    platforms: ["instagram-story", "facebook-story", "instagram-post"], formats: ["9:16", "4:5"],
    sourceTypes: ["product"], productCount: { min: 1, max: 1 },
    hierarchy: ["check1", "check2", "check3", "verdict", "cta"],
    hierarchyAr: ["3 فحوصات", "النتيجة", "الزر"],
    requiredSlots: ["productImage", "headline"], optionalSlots: ["logo"],
    ctaOptions: ["شاهدي التفاصيل", "اكتشفيه الآن"], trust: "none", family: "checklist-quiz",
    headlineStyle: "سؤال تأهيلي", copyStyle: "قائمة فحص تفاعلية",
    whyDifferentAr: "بنية اختبار من 3 أسئلة ونتيجة.",
    maxHeadlineWords: 8, maxSubWords: 10,
  },
  {
    id: "T13", slug: "before-your-routine", nameAr: "قبل روتينك", nameEn: "Before Your Routine",
    objective: "entry", objectiveAr: "مدخل للروتين",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["product", "routine"],
    productCount: { min: 1, max: 2 },
    hierarchy: ["step-context", "product", "next-teaser", "cta"],
    hierarchyAr: ["سياق الخطوة", "المنتج", "تلميح الخطوة التالية", "الزر"],
    requiredSlots: ["productImage", "headline"], optionalSlots: ["logo"],
    ctaOptions: ["ابدئي روتينك", "اكتشفي المجموعة"], trust: "light", family: "temporal-primer",
    headlineStyle: "زمني: قبل...", copyStyle: "تحضيري",
    whyDifferentAr: "تأطير زمني (قبل) لا يوجد في غيره.",
    maxHeadlineWords: 7, maxSubWords: 14,
  },
  // ─── ROUTINE / COLLECTION ───
  {
    id: "T14", slug: "routine-builder", nameAr: "ابنِ روتينك", nameEn: "Routine Builder",
    objective: "basket", objectiveAr: "بناء سلة متعددة",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["routine", "product"],
    productCount: { min: 3, max: 4 },
    hierarchy: ["goal", "slots", "total", "cta"],
    hierarchyAr: ["الهدف", "خانات مرتبة", "الإجمالي/التوفير", "الزر"],
    requiredSlots: ["productImages", "headline"], optionalSlots: ["price", "logo"],
    ctaOptions: ["ابدئي روتينك", "تسوّقي الآن"], trust: "light", family: "builder-grid",
    headlineStyle: "هدفي", copyStyle: "شبكة بناء",
    whyDifferentAr: "شبكة خانات تفاعلية المظهر لمنتجات متعددة.",
    maxHeadlineWords: 7, maxSubWords: 12,
  },
  {
    id: "T15", slug: "morning-routine", nameAr: "روتين الصباح", nameEn: "Morning Routine",
    objective: "habit-am", objectiveAr: "عادة صباحية",
    platforms: ALL, formats: ["1:1", "4:5", "9:16"], sourceTypes: ["routine"],
    productCount: { min: 3, max: 4 },
    hierarchy: ["sunrise", "steps", "cta"],
    hierarchyAr: ["أجواء الشروق", "خطوات مرقمة", "الزر"],
    requiredSlots: ["productImages", "headline"], optionalSlots: ["logo"],
    ctaOptions: ["ابدئي صباحك", "ابدئي روتينك"], trust: "light", family: "timeline-am",
    headlineStyle: "صباحي مشرق", copyStyle: "خطوات صباحية",
    whyDifferentAr: "خط زمني صباحي بإشارات الشروق والحماية.",
    blockers: [{ requires: "routine-steps", messageAr: "يتطلب روتيناً بخطوات حقيقية" }],
    maxHeadlineWords: 7, maxSubWords: 12,
  },
  {
    id: "T16", slug: "night-routine", nameAr: "روتين المساء", nameEn: "Night Routine",
    objective: "habit-pm", objectiveAr: "عادة مسائية",
    platforms: ALL, formats: ["1:1", "4:5", "9:16"], sourceTypes: ["routine"],
    productCount: { min: 3, max: 4 },
    hierarchy: ["moonlight", "steps", "cta"],
    hierarchyAr: ["أجواء المساء", "خطوات مرقمة", "الزر"],
    requiredSlots: ["productImages", "headline"], optionalSlots: ["logo"],
    ctaOptions: ["ابدئي مساءك", "ابدئي روتينك"], trust: "light", family: "timeline-pm",
    headlineStyle: "مسائي هادئ", copyStyle: "خطوات إصلاح ليلي",
    whyDifferentAr: "معكوس T15: لغة الإصلاح الليلي وأجواء داكنة.",
    blockers: [{ requires: "routine-steps", messageAr: "يتطلب روتيناً بخطوات حقيقية" }],
    maxHeadlineWords: 7, maxSubWords: 12,
  },
  {
    id: "T17", slug: "routine-3-steps", nameAr: "روتينك في 3 خطوات", nameEn: "Routine in 3 Steps",
    objective: "simplicity", objectiveAr: "تبسيط القرار",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["routine"],
    productCount: { min: 3, max: 3 },
    hierarchy: ["step1", "step2", "step3", "cta"],
    hierarchyAr: ["أرقام ضخمة 1-2-3", "الزر"],
    requiredSlots: ["productImages", "headline"], optionalSlots: ["logo"],
    ctaOptions: ["ابدئي روتينك", "تسوّقي الآن"], trust: "light", family: "triptych",
    headlineStyle: "رقمي", copyStyle: "ثلاثية مقتضبة",
    whyDifferentAr: "ثلاثية صارمة بأرقام عملاقة — بالضبط 3 منتجات.",
    blockers: [{ requires: "routine-steps", messageAr: "يتطلب روتيناً بخطوات حقيقية" }],
    maxHeadlineWords: 7, maxSubWords: 10,
  },
  {
    id: "T18", slug: "complete-routine", nameAr: "الروتين الكامل", nameEn: "Complete Routine",
    objective: "authority", objectiveAr: "إظهار الاكتمال",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["routine", "bundle"],
    productCount: { min: 4, max: 6 },
    hierarchy: ["collection", "labels", "price", "cta"],
    hierarchyAr: ["التشكيلة", "تسمية كل قطعة", "السعر", "الزر"],
    requiredSlots: ["productImages", "headline"], optionalSlots: ["price", "logo"],
    ctaOptions: ["اكتشفي المجموعة", "احصلي على المجموعة"], trust: "standard", family: "cluster",
    headlineStyle: "شمولي", copyStyle: "وفرة منظمة",
    whyDifferentAr: "عنقود وفرة بتسميات لكل قطعة.",
    maxHeadlineWords: 7, maxSubWords: 12,
  },
  {
    id: "T19", slug: "routine-journey", nameAr: "رحلة الروتين", nameEn: "Routine Journey",
    objective: "commitment", objectiveAr: "الالتزام والاستمرارية",
    platforms: ALL_FEED, formats: ["4:5", "1:1"], sourceTypes: ["routine"],
    productCount: { min: 2, max: 4 },
    hierarchy: ["nodes", "products", "cta"],
    hierarchyAr: ["عقد زمنية أسبوع 1-4", "المنتجات عند العقد", "الزر"],
    requiredSlots: ["productImages", "headline"], optionalSlots: ["logo"],
    ctaOptions: ["ابدئي رحلتك", "ابدئي روتينك"], trust: "light", family: "journey-nodes",
    headlineStyle: "رحلة", copyStyle: "تقدم زمني",
    whyDifferentAr: "رحلة أسابيع بعقد تقدم لا خطوات استخدام.",
    blockers: [{ requires: "routine-steps", messageAr: "يتطلب روتيناً بخطوات حقيقية" }],
    maxHeadlineWords: 7, maxSubWords: 12,
  },
  {
    id: "T20", slug: "collection-spotlight", nameAr: "تسليط على تشكيلة", nameEn: "Collection Spotlight",
    objective: "range", objectiveAr: "اكتشاف النطاق",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["product", "campaign"],
    productCount: { min: 4, max: 8 },
    hierarchy: ["collection-name", "wall", "cta"],
    hierarchyAr: ["اسم التشكيلة", "جدار منتجات", "الزر"],
    requiredSlots: ["productImages", "headline"], optionalSlots: ["logo"],
    ctaOptions: ["اكتشفي المجموعة", "اكتشفي منتجات أكثر"], trust: "light", family: "wall-grid",
    headlineStyle: "اسم التشكيلة", copyStyle: "استعراضي",
    whyDifferentAr: "جدار شبكي تقوده العلامة/الفئة لا الخطوات.",
    maxHeadlineWords: 6, maxSubWords: 10,
  },
  // ─── OFFERS / COMMERCE ───
  {
    id: "T21", slug: "offer-hero", nameAr: "بطل العرض", nameEn: "Offer Hero",
    objective: "sales", objectiveAr: "بيع مباشر",
    platforms: ALL, formats: ["1:1", "4:5", "9:16"], sourceTypes: ["offer", "product"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["discount", "product", "prices", "cta"],
    hierarchyAr: ["رقم الخصم ضخماً", "المنتج", "قبل/بعد", "الزر"],
    requiredSlots: ["productImage", "offerLabel", "price", "originalPrice"], optionalSlots: ["logo"],
    ctaOptions: ["احصلي عليه الآن", "تسوّقي الآن"], trust: "light", family: "price-first",
    headlineStyle: "رقم الخصم", copyStyle: "تجاري مباشر",
    whyDifferentAr: "السعر أولاً بخط ضخم — تجارة خالصة.",
    blockers: [{ requires: "live-offer", messageAr: "يتطلب عرضاً حقيقياً بسعر قبل/بعد من البيانات" }],
    maxHeadlineWords: 5, maxSubWords: 10,
  },
  {
    id: "T22", slug: "bundle-spotlight", nameAr: "تسليط على باقة", nameEn: "Bundle Spotlight",
    objective: "aov", objectiveAr: "رفع قيمة السلة",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["bundle"],
    productCount: { min: 3, max: 6 },
    hierarchy: ["bundle", "contents", "math", "cta"],
    hierarchyAr: ["الباقة", "المحتويات", "حساب التوفير", "الزر"],
    requiredSlots: ["productImages", "headline", "price"], optionalSlots: ["logo"],
    ctaOptions: ["احصلي على المجموعة", "تسوّقي الآن"], trust: "standard", family: "bundle-anatomy",
    headlineStyle: "اسم الباقة", copyStyle: "تشريح محتويات",
    whyDifferentAr: "تشريح الباقة: صندوق + محتويات + حساب.",
    blockers: [{ requires: "bundle-contents", messageAr: "يتطلب باقة بمحتويات وأسعار حقيقية" }],
    maxHeadlineWords: 7, maxSubWords: 12,
  },
  {
    id: "T23", slug: "value-breakdown", nameAr: "تفصيل القيمة", nameEn: "Value Breakdown",
    objective: "value-proof", objectiveAr: "إثبات القيمة",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["bundle", "offer"],
    productCount: { min: 2, max: 4 },
    hierarchy: ["lines", "total", "cta"],
    hierarchyAr: ["بنود كإيصال", "الإجمالي", "الزر"],
    requiredSlots: ["productImages", "price"], optionalSlots: ["logo"],
    ctaOptions: ["احصلي على المجموعة", "تسوّقي الآن"], trust: "light", family: "receipt",
    headlineStyle: "عنوان الإيصال", copyStyle: "بنود مسعّرة",
    whyDifferentAr: "استعارة الإيصال: بنود ومجموع.",
    blockers: [{ requires: "bundle-contents", messageAr: "يتطلب أسعاراً حقيقية لكل بند" }],
    maxHeadlineWords: 6, maxSubWords: 10,
  },
  {
    id: "T24", slug: "shop-the-look", nameAr: "تسوّقي الإطلالة", nameEn: "Shop the Look",
    objective: "occasion", objectiveAr: "تحويل مناسباتي",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["product", "bundle", "campaign"],
    productCount: { min: 3, max: 5 },
    hierarchy: ["look", "tags", "cta"],
    hierarchyAr: ["الإطلالة/المناسبة", "وسوم المنتجات", "الزر"],
    requiredSlots: ["productImages", "headline"], optionalSlots: ["price", "logo"],
    ctaOptions: ["تسوّقي الإطلالة", "اكتشفي المجموعة"], trust: "light", family: "occasion-tags",
    headlineStyle: "اسم المناسبة", copyStyle: "مناسباتي",
    whyDifferentAr: "المناسبة أولاً مع وسوم على المنتجات.",
    maxHeadlineWords: 7, maxSubWords: 12,
  },
  {
    id: "T25", slug: "limited-opportunity", nameAr: "فرصة محدودة", nameEn: "Limited Opportunity",
    objective: "urgency", objectiveAr: "استعجال حقيقي فقط",
    platforms: ["instagram-story", "facebook-story", "instagram-post"], formats: ["9:16", "4:5"],
    sourceTypes: ["offer"], productCount: { min: 1, max: 1 },
    hierarchy: ["deadline", "product", "cta"],
    hierarchyAr: ["الموعد النهائي", "المنتج", "الزر"],
    requiredSlots: ["productImage", "deadlineLabel", "headline"], optionalSlots: ["logo"],
    ctaOptions: ["احصلي عليه الآن", "تسوّقي الآن"], trust: "light", family: "deadline-led",
    headlineStyle: "الموعد", copyStyle: "مستعجل صادق",
    whyDifferentAr: "الموعد يقود التصميم — محظور بلا دليل.",
    blockers: [{ requires: "real-deadline", messageAr: "يتطلب موعد انتهاء أو مخزوناً حقيقياً من البيانات" }],
    maxHeadlineWords: 6, maxSubWords: 10,
  },
  {
    id: "T26", slug: "deal-benefits", nameAr: "عرض وفوائد", nameEn: "Deal + Benefits",
    objective: "value-quality", objectiveAr: "قيمة وجودة معاً",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["offer", "product"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["deal", "benefits", "cta"],
    hierarchyAr: ["العرض", "الفوائد", "الزر"],
    requiredSlots: ["productImage", "offerLabel", "benefits"], optionalSlots: ["price", "logo"],
    ctaOptions: ["احصلي عليه الآن", "تسوّقي الآن"], trust: "light", family: "dual-promise",
    headlineStyle: "العرض", copyStyle: "وعد مزدوج",
    whyDifferentAr: "وعدان متوازيان: سعر + جودة.",
    blockers: [{ requires: "live-offer", messageAr: "يتطلب عرضاً حقيقياً من البيانات" }],
    maxHeadlineWords: 6, maxSubWords: 12,
  },
  {
    id: "T27", slug: "flash-commerce", nameAr: "عرض خاطف", nameEn: "Flash Commerce",
    objective: "impulse", objectiveAr: "شراء اندفاعي",
    platforms: ["instagram-story", "facebook-story"], formats: ["9:16"], sourceTypes: ["offer"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["flash", "product", "cta"],
    hierarchyAr: ["شارة خاطف", "المنتج", "اسحبي/الزر"],
    requiredSlots: ["productImage", "offerLabel"], optionalSlots: ["logo"],
    ctaOptions: ["احصلي عليه الآن", "تسوّقي الآن"], trust: "none", family: "story-flash",
    headlineStyle: "ومضة", copyStyle: "خاطف",
    whyDifferentAr: "قواعد الستوري الزائلة: عدّاد وملء الشاشة.",
    blockers: [{ requires: "live-offer", messageAr: "يتطلب عرضاً حقيقياً من البيانات" }],
    maxHeadlineWords: 5, maxSubWords: 8,
  },
  // ─── EDUCATIONAL / DECISION ───
  {
    id: "T28", slug: "beauty-tip-product", nameAr: "نصيحة + منتج", nameEn: "Beauty Tip + Product",
    objective: "saves", objectiveAr: "حفظ ومشاركة",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["product", "education"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["tip", "product", "cta"],
    hierarchyAr: ["بطاقة النصيحة", "المنتج كدليل", "الزر"],
    requiredSlots: ["productImage", "headline", "body"], optionalSlots: ["logo"],
    ctaOptions: ["اكتشفي منتجات أكثر", "شاهدي التفاصيل"], trust: "light", family: "tip-first",
    headlineStyle: "نصيحة", copyStyle: "تعليمي خفيف",
    whyDifferentAr: "النصيحة أولاً والمنتج دليل عليها.",
    maxHeadlineWords: 8, maxSubWords: 20,
  },
  {
    id: "T29", slug: "how-to-choose", nameAr: "كيف تختارين", nameEn: "How to Choose",
    objective: "guidance", objectiveAr: "مساعدة القرار",
    platforms: ALL_FEED, formats: ["4:5", "1:1"], sourceTypes: ["product", "education"],
    productCount: { min: 1, max: 2 },
    hierarchy: ["branches", "verdict", "cta"],
    hierarchyAr: ["فروع القرار", "التوصية", "الزر"],
    requiredSlots: ["productImage", "headline"], optionalSlots: ["logo"],
    ctaOptions: ["اختاري ما يناسبك", "شاهدي التفاصيل"], trust: "light", family: "decision-tree",
    headlineStyle: "سؤال قرار", copyStyle: "شجرة قرار",
    whyDifferentAr: "مخطط شجري متفرع لا خطي.",
    maxHeadlineWords: 8, maxSubWords: 14,
  },
  {
    id: "T30", slug: "product-comparison", nameAr: "قارني بينهما", nameEn: "Product Comparison",
    objective: "decision", objectiveAr: "حسم المقارنة",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["product"],
    productCount: { min: 2, max: 2 },
    hierarchy: ["criteria", "columns", "verdict", "cta"],
    hierarchyAr: ["معايير الصفوف", "عمودان", "الخلاصة", "الزر"],
    requiredSlots: ["productImages", "headline"], optionalSlots: ["price", "logo"],
    ctaOptions: ["اختاري ما يناسبك", "شاهدي التفاصيل"], trust: "light", family: "versus-columns",
    headlineStyle: "مقارنة", copyStyle: "جدولي محايد",
    whyDifferentAr: "الوحيد بعمودين متواجهين وخلاصة محايدة.",
    blockers: [{ requires: "two-products", messageAr: "يتطلب منتجين حقيقيين للمقارنة" }],
    maxHeadlineWords: 7, maxSubWords: 12,
  },
  {
    id: "T31", slug: "ingredient-education", nameAr: "ثقافة المكونات", nameEn: "Ingredient Education",
    objective: "authority", objectiveAr: "سلطة علمية",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["product"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["ingredient", "function", "product", "cta"],
    hierarchyAr: ["المكون بطلاً", "وظيفته", "المنتج", "الزر"],
    requiredSlots: ["ingredientLabel", "productImage", "body"], optionalSlots: ["logo"],
    ctaOptions: ["شاهدي التفاصيل", "اكتشفيه الآن"], trust: "light", family: "science-first",
    headlineStyle: "اسم المكون", copyStyle: "علمي مبسط",
    whyDifferentAr: "العلم أولاً؛ لا يذكر إلا مكونات القائمة الحقيقية.",
    blockers: [{ requires: "ingredient-list", messageAr: "يتطلب قائمة مكونات حقيقية للمنتج" }],
    maxHeadlineWords: 6, maxSubWords: 22,
  },
  {
    id: "T32", slug: "faq-product", nameAr: "أسئلة شائعة", nameEn: "FAQ + Product",
    objective: "objections", objectiveAr: "معالجة الاعتراضات",
    platforms: ALL_FEED, formats: ["4:5", "1:1"], sourceTypes: ["product", "education"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["qa", "product", "cta"],
    hierarchyAr: ["3 أسئلة وأجوبة", "المنتج", "الزر"],
    requiredSlots: ["productImage", "headline", "body"], optionalSlots: ["logo"],
    ctaOptions: ["شاهدي التفاصيل", "اكتشفي منتجات أكثر"], trust: "light", family: "qa-blocks",
    headlineStyle: "سؤالي", copyStyle: "أجوبة موثقة",
    whyDifferentAr: "كتل سؤال/جواب — الأسئلة من مصادر حقيقية فقط.",
    maxHeadlineWords: 8, maxSubWords: 24,
  },
  // ─── BRAND / EMOTIONAL ───
  {
    id: "T33", slug: "beauty-quote-product", nameAr: "اقتباس جمالي", nameEn: "Beauty Quote + Product",
    objective: "feeling", objectiveAr: "إحساس العلامة",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["product", "campaign"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["quote", "product", "logo"],
    hierarchyAr: ["الاقتباس بخط كبير", "المنتج صغيراً", "الشعار"],
    requiredSlots: ["productImage", "headline"], optionalSlots: ["logo"],
    ctaOptions: ["اكتشفي المجموعة"], trust: "none", family: "editorial-quote",
    headlineStyle: "اقتباس", copyStyle: "تحريري عاطفي",
    whyDifferentAr: "العاطفة تقود والتجارة همس بلا زر صريح.",
    maxHeadlineWords: 10, maxSubWords: 8,
  },
  {
    id: "T34", slug: "social-commerce", nameAr: "تجارة اجتماعية", nameEn: "Social Commerce",
    objective: "proof", objectiveAr: "إثبات ثم شراء",
    platforms: ALL_FEED, formats: ["1:1", "4:5"], sourceTypes: ["product"],
    productCount: { min: 1, max: 1 },
    hierarchy: ["review", "stars", "product", "cta"],
    hierarchyAr: ["اقتباس المراجعة", "النجوم", "المنتج", "الزر"],
    requiredSlots: ["productImage", "reviewSnippet", "headline"], optionalSlots: ["rating", "logo"],
    ctaOptions: ["تسوّقي الآن", "اطلبيه الآن"], trust: "standard", family: "ugc-frame",
    headlineStyle: "صوت العميلة", copyStyle: "مجتمعي",
    whyDifferentAr: "صوت المجتمع هو التصميم — محظور بلا مراجعة موثقة.",
    blockers: [{ requires: "verified-review", messageAr: "يتطلب مراجعة عميلة حقيقية من البيانات" }],
    maxHeadlineWords: 8, maxSubWords: 18,
  },
  {
    id: "T35", slug: "luminous-signature", nameAr: "توقيع لومينوس", nameEn: "Luminous Signature",
    objective: "equity", objectiveAr: "قيمة العلامة",
    platforms: ALL, formats: ["1:1", "4:5", "9:16"], sourceTypes: ["product", "routine", "bundle", "campaign"],
    productCount: { min: 1, max: 3 },
    hierarchy: ["signature", "product", "logo"],
    hierarchyAr: ["التوقيع الذهبي", "المنتج", "الشعار بارزاً"],
    requiredSlots: ["productImage", "headline"], optionalSlots: ["logo"],
    ctaOptions: ["اكتشفي المجموعة"], trust: "none", family: "house-signature",
    headlineStyle: "التوقيع", copyStyle: "هوية الدار",
    whyDifferentAr: "الوحيد الذي تتفوق فيه العلامة على المنتج.",
    maxHeadlineWords: 8, maxSubWords: 12,
  },
];

export function getTemplate(id: string): VisualTemplateDef | undefined {
  return TEMPLATE_CATALOG.find((t) => t.id === id);
}

export function templatesForSource(source: VisualSourceType): VisualTemplateDef[] {
  return TEMPLATE_CATALOG.filter((t) => t.sourceTypes.includes(source));
}

export function templatesForPlatform(platform: VisualPlatform): VisualTemplateDef[] {
  return TEMPLATE_CATALOG.filter((t) => t.platforms.includes(platform));
}
