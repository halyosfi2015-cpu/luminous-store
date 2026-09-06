/**
 * Homepage editable content — single source for section titles/subtitles/eyebrows
 * and visibility. Defaults mirror the storefront's current copy; overrides are
 * stored permanently in src/data/content/homepage.json (written by the admin API).
 */

export type HomeSectionKey =
  | "hero"
  | "banners"
  | "trendingNow"
  | "routines"
  | "problemSolutions"
  | "experts"
  | "brands"
  | "bundles"
  | "services"
  | "productsFeatured"
  | "productsFavorites"
  | "newArrivals"
  | "smartRecommendations"
  | "weeklyOffers";

export interface HomeSectionContent {
  visible: boolean;
  eyebrowAr: string;
  eyebrowEn: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  /** Optional banner image rendered above the section when set. */
  image?: string;
}

export interface HomepageContent {
  sections: Partial<Record<HomeSectionKey, HomeSectionContent>>;
  /** Optional explicit section display order. When absent, storefront default order applies. */
  order?: HomeSectionKey[];
  /** Optional per-section product selection overrides (pinned first, excluded removed). */
  products?: Partial<Record<AllHomeSectionKey, SectionProductOverride>>;
}

/**
 * Per-section product selection override. Keys are product slugs.
 * - pinned: forced to appear at the start of the section's product list.
 * - excluded: never rendered in this section.
 */
export interface SectionProductOverride {
  pinned?: string[];
  excluded?: string[];
}

/** Apply a section's product override to a flag-derived list (pure, order-stable). */
export function applySectionProductOverride<T extends { slug: string }>(
  list: T[],
  override?: SectionProductOverride,
): T[] {
  if (!override || (!override.pinned?.length && !override.excluded?.length)) return list;
  const excluded = new Set(override.excluded ?? []);
  const filtered = list.filter((p) => !excluded.has(p.slug));
  const pinnedSlugs = override.pinned ?? [];
  const pinnedSet = new Set(pinnedSlugs);
  const pinned = pinnedSlugs
    .map((slug) => filtered.find((p) => p.slug === slug))
    .filter((p): p is T => Boolean(p));
  const rest = filtered.filter((p) => !pinnedSet.has(p.slug));
  return [...pinned, ...rest];
}

/* Category A: Original 13 section labels */
export const HOME_SECTION_LABELS: Record<HomeSectionKey, string> = {
  hero: "الواجهة الرئيسية (Hero)",
  banners: "البانات",
  trendingNow: "تصفحي حسب القسم",
  routines: "الروتينات",
  problemSolutions: "اختاري مشكلتك",
  experts: "الخبراء",
  brands: "العلامات التجارية",
  bundles: "الباقات والهدايا",
  services: "الخدمات التجميلية",
  productsFeatured: "المنتجات المميزة",
  productsFavorites: "المفضلة لدى العملاء",
  newArrivals: "وصل حديثاً",
  smartRecommendations: "موصى لك",
  weeklyOffers: "العروض الأسبوعية",
};

/* Defaults for original 13 HomeSectionKey */
export const HOME_SECTION_DEFAULTS: Record<HomeSectionKey, HomeSectionContent> = {
  hero: {
    visible: true,
    eyebrowAr: "Luminous Derma",
    eyebrowEn: "Luminous Derma",
    titleAr: "العناية الفاخرة بالبشرة",
    titleEn: "Luxury Skincare",
    subtitleAr: "اكتشفي تشكيلتنا من أجود المنتجات العالمية",
    subtitleEn: "Discover our collection of the finest global products",
  },
  banners: {
    visible: true,
    eyebrowAr: "بانرات",
    eyebrowEn: "Banners",
    titleAr: "بانرات العروض",
    titleEn: "Promotional Banners",
    subtitleAr: "",
    subtitleEn: "",
  },
  trendingNow: {
    visible: true,
    eyebrowAr: "تصفحي حسب القسم",
    eyebrowEn: "Browse by Category",
    titleAr: "أبرز منتجات كل قسم",
    titleEn: "Top Products per Category",
    subtitleAr: "كل قسم يعرض لك أشهر المنتجات من أفضل الماركات العالمية",
    subtitleEn: "Each section shows you the best-selling products from top global brands",
  },
  routines: {
    visible: true,
    eyebrowAr: "روتينات مخصصة",
    eyebrowEn: "Personalized Routines",
    titleAr: "روتينات يومية متكاملة",
    titleEn: "Integrated Daily Routines",
    subtitleAr: "اختاري روتينك بثلاثة مستويات (أساسي، قياسي، متقدم) وكل خطوة مدروسة لتحقيق أفضل نتيجة",
    subtitleEn: "Pick your routine in three levels (Essential, Standard, Premium) — every step curated for the best results",
  },
  problemSolutions: {
    visible: true,
    eyebrowAr: "تشخيص البشرة",
    eyebrowEn: "Skin Diagnosis",
    titleAr: "اختاري مشكلتك",
    titleEn: "Choose Your Concern",
    subtitleAr: "كل بشرة فريدة — اكتشفي ما تحتاجه بضغطة واحدة",
    subtitleEn: "Every skin is unique — discover what it needs in one tap",
  },
  experts: {
    visible: true,
    eyebrowAr: "خبراء موثوقون",
    eyebrowEn: "Trusted Experts",
    titleAr: "خبراء العناية بالبشرة",
    titleEn: "Skincare Experts",
    subtitleAr: "فريق متخصص يقدم استشارات مخصصة لاختيار المنتجات والروتين المناسبة",
    subtitleEn: "Specialized team offering personalized consultations for your products and routines",
  },
  brands: {
    visible: true,
    eyebrowAr: "شركاء الجمال",
    eyebrowEn: "Beauty Partners",
    titleAr: "علامات تجارية موثوقة",
    titleEn: "Trusted Brands",
    subtitleAr: "نقدم لكِ أشهر الماركات العالمية المعتمدة والأصلية 100%",
    subtitleEn: "The world's most renowned, 100% authentic brands",
  },
  bundles: {
    visible: true,
    eyebrowAr: "باقات وهدايا",
    eyebrowEn: "Bundles & Gifts",
    titleAr: "هدايا وباقات مختارة بعناية",
    titleEn: "Carefully Selected Bundles",
    subtitleAr: "باقات جاهزة لكل مناسبة — اختاري الباقة المثالية أو صمدي باقتك الخاصة",
    subtitleEn: "Ready bundles for every occasion — pick the perfect one or design your own",
  },
  services: {
    visible: true,
    eyebrowAr: "احترافية ورعاية",
    eyebrowEn: "Professional Care",
    titleAr: "خدمات تجميلية",
    titleEn: "Beauty Services",
    subtitleAr: "فريق متخصص وتقنيات حديثة لعناية تعكس أناقتك",
    subtitleEn: "A specialized team and modern techniques for care that reflects your elegance",
  },
  productsFeatured: {
    visible: true,
    eyebrowAr: "تشكيلة مختارة",
    eyebrowEn: "Curated Selection",
    titleAr: "منتجاتنا المميزة",
    titleEn: "Featured Products",
    subtitleAr: "اختاري من مجموعتنا المختارة بعناية لعناية متكاملة ببشرتك",
    subtitleEn: "Choose from our carefully curated collection for complete skincare",
  },
  productsFavorites: {
    visible: true,
    eyebrowAr: "الأكثر طلباً",
    eyebrowEn: "Most Requested",
    titleAr: "المفضلة لدى عملائنا",
    titleEn: "Customer Favorites",
    subtitleAr: "المنتجات الأكثر شعبية بين عملائنا في كل فئة",
    subtitleEn: "The most popular products across all categories",
  },
  newArrivals: {
    visible: true,
    eyebrowAr: "وصل حديثاً",
    eyebrowEn: "New Arrivals",
    titleAr: "أحدث المنتجات",
    titleEn: "Latest Products",
    subtitleAr: "اكتشفي أحدث الإضافات لمجموعتنا من العناية الفاخرة",
    subtitleEn: "Discover the latest additions to our luxury skincare collection",
  },
  smartRecommendations: {
    visible: true,
    eyebrowAr: "موصى لك",
    eyebrowEn: "Recommended",
    titleAr: "منتجات قد تعجبك",
    titleEn: "You Might Also Like",
    subtitleAr: "مختارة خصيصًا لك بناءً على اهتماماتك وتصفحك داخل المتجر",
    subtitleEn: "Personalized picks based on your browsing and interests",
  },
  weeklyOffers: {
    visible: true,
    eyebrowAr: "عروض لفترة محدودة",
    eyebrowEn: "Limited Time Offers",
    titleAr: "",
    titleEn: "",
    subtitleAr: "خصومات حصرية على منتجاتك المفضلة — لا تفوّت الفرصة!",
    subtitleEn: "Exclusive discounts on your favorite products — don't miss out!",
  },
};

/* Merge function for original HomeSectionKey */
export function mergeHomeSection(
  key: HomeSectionKey,
  override?: Partial<HomeSectionContent>,
): HomeSectionContent {
  const base = HOME_SECTION_DEFAULTS[key];
  if (!override) return base;
  return { ...base, ...override };
}

/* Category B: Missing control section keys */
export type MissingHomeSectionKey =
  | "about"
  | "testimonials"
  | "features"
  | "newsletter"
  | "premiumServices"
  | "productMarquee"
  | "problemSolutionsGrid"
  | "customerReviewsGrid"
  | "expertGrid"
  | "brandsGrid"
  | "bundlesGrid"
  | "newArrivalsGrid"
  | "smartRecsGrid"
  | "weeklyOffersGrid";

/* Runtime array of missing section keys (parallel to the type) */
const MISSING_HOME_SECTION_KEYS: MissingHomeSectionKey[] = [
  "about",
  "testimonials",
  "features",
  "newsletter",
  "premiumServices",
  "productMarquee",
  "problemSolutionsGrid",
  "customerReviewsGrid",
  "expertGrid",
  "brandsGrid",
  "bundlesGrid",
  "newArrivalsGrid",
  "smartRecsGrid",
  "weeklyOffersGrid",
];

export type AllHomeSectionKey = HomeSectionKey | MissingHomeSectionKey;

/* Merge stored overrides on top of defaults for all section keys (client-safe, no fs). */
export function mergeHomepageContent(overrides?: { sections?: Record<AllHomeSectionKey, HomeSectionContent> }): HomepageContent {
  const sections = {} as Partial<Record<AllHomeSectionKey, HomeSectionContent>>;
  // Merge original 13 sections from defaults
  for (const key of Object.keys(HOME_SECTION_DEFAULTS) as HomeSectionKey[]) {
    sections[key] = mergeHomeSection(key, overrides?.sections?.[key]);
  }
  // Add missing control sections with minimal defaults (visible + empty copy fields)
  for (const key of MISSING_HOME_SECTION_KEYS) {
    if (!sections[key]) {
      sections[key] = {
        visible: true,
        eyebrowAr: "",
        eyebrowEn: "",
        titleAr: "",
        titleEn: "",
        subtitleAr: "",
        subtitleEn: "",
        image: "",
      };
    }
  }
  return { sections };
}