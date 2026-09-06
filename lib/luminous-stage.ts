import type { ProductSummary, Routine } from "@/src/types/product";
import {
  publishedProductSummaries,
  routines as allRoutines,
} from "@/src/data/product-summaries";

export type LuminousSlideKind =
  | "offer"
  | "routine"
  | "collection"
  | "brand"
  | "category"
  | "new-arrivals"
  | "best-sellers"
  | "personalized"
  | "bundle"
  | "campaign";

export interface LuminousStageTheme {
  bg: string;
  accent: string;
}

export interface StageProductPlacement {
  product: ProductSummary;
  slot: number;
  scale: number;
  rotate: number;
  hero: boolean;
}

export interface LuminousStageSlide {
  id: string;
  kind: LuminousSlideKind;
  eyebrowAr: string;
  eyebrowEn: string;
  headlineAr: string;
  headlineEn: string;
  subAr: string;
  subEn: string;
  ctaAr: string;
  ctaEn: string;
  ctaHref: string;
  theme: LuminousStageTheme;
  products: StageProductPlacement[];
  slideType?: "template" | "custom-image";
  customImage?: string;
  showBrandMark?: boolean;
  stageMood?: string;
}

export interface ProductConfig {
  id: string;
  slot?: number;
  scale?: number;
  rotate?: number;
  hero?: boolean;
}

export interface StageSlideConfig {
  id: string;
  kind: LuminousSlideKind | "custom";
  eyebrowAr: string;
  eyebrowEn: string;
  headlineAr: string;
  headlineEn: string;
  subAr: string;
  subEn: string;
  ctaAr: string;
  ctaEn: string;
  ctaHref: string;
  accent: string;
  bg: string;
  products: ProductConfig[];
  hidden?: boolean;
  /** B7: slide presentation mode — never mixed. */
  slideType?: "template" | "custom-image";
  /** Uploaded ready-made image URL (custom-image slides only). */
  customImage?: string;
  /** Brand mark overlay — template default ON, custom-image default OFF. */
  showBrandMark?: boolean;
  /** Semantic visual mood driving the cinematic product stage. */
  stageMood?: string;
}

const sellable = (p: ProductSummary) =>
  !!p.gallery?.[0] && p.inStock !== false && p.stock !== 0;

const pool: ProductSummary[] = publishedProductSummaries.filter(sellable);

const byId = new Map<string, ProductSummary>(pool.map((p) => [p.id, p]));

function rank(a: ProductSummary, b: ProductSummary): number {
  if (b.rating !== a.rating) return b.rating - a.rating;
  const rc = (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
  if (rc !== 0) return rc;
  return a.id.localeCompare(b.id);
}

function attractiveness(p: ProductSummary): number {
  return (
    (p.heroImage ? 2.4 : 0) +
    p.rating * 1.6 +
    Math.log10(10 + (p.reviewCount ?? 0)) * 1.8
  );
}

function mostAttractive(list: ProductSummary[]): ProductSummary[] {
  return [...list].sort((a, b) => attractiveness(b) - attractiveness(a) || rank(a, b));
}

function selectTrending(count: number): ProductSummary[] {
  const score = (p: ProductSummary) =>
    attractiveness(p) +
    ((p.isNew || p.new) ? 0.9 : 0) +
    (p.isFeatured || p.featured ? 0.4 : 0);
  const candidates = pool.filter((p) => p.isNew || p.new || p.isFeatured || p.featured);
  const source = candidates.length >= count ? candidates : pool;
  return [...source].sort((a, b) => score(b) - score(a)).slice(0, count);
}

function selectRoutine(): { products: ProductSummary[]; routine: Routine | null } {
  const active = allRoutines
    .filter((r) => r.active)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  let best: { routine: Routine; items: ProductSummary[] } | null = null;
  for (const r of active) {
    const items = r.products
      .map((id) => byId.get(id))
      .filter((p): p is ProductSummary => !!p);
    if (items.length >= 3 && (!best || items.length > best.items.length)) {
      best = { routine: r, items };
    }
  }
  return best
    ? { products: best.items.slice(0, 3), routine: best.routine }
    : { products: [], routine: null };
}

function normalizeBrand(value: string): string {
  return value.trim().toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "");
}

function selectSingleBrandPack(brands: string[], slugs: string[], count: number): ProductSummary[] {
  const brandSet = new Set(brands.map(normalizeBrand));
  const candidates = pool.filter((p) => brandSet.has(normalizeBrand(p.brand)) && slugs.includes(p.categorySlug ?? ""));
  const groups = new Map<string, ProductSummary[]>();
  for (const product of candidates) {
    const key = normalizeBrand(product.brand);
    groups.set(key, [...(groups.get(key) ?? []), product]);
  }
  const bestGroup = [...groups.values()]
    .filter((group) => group.length >= count)
    .sort((a, b) => mostAttractive(b).slice(0, count).reduce((sum, p) => sum + attractiveness(p), 0) - mostAttractive(a).slice(0, count).reduce((sum, p) => sum + attractiveness(p), 0))[0];
  if (bestGroup) return mostAttractive(bestGroup).slice(0, count);
  return selectFromSlugs(slugs, count);
}

function selectFromSlugs(slugs: string[], count: number): ProductSummary[] {
  const picked: ProductSummary[] = [];
  const usedIds = new Set<string>();
  for (const slug of slugs) {
    const candidates = pool.filter((p) => p.categorySlug === slug);
    const top = mostAttractive(candidates).find((p) => !usedIds.has(p.id));
    if (top) {
      picked.push(top);
      usedIds.add(top.id);
    }
    if (picked.length >= count) break;
  }
  if (picked.length < count) {
    const slugSet = new Set(slugs);
    for (const p of mostAttractive(pool.filter((x) => slugSet.has(x.categorySlug ?? "")))) {
      if (picked.length >= count) break;
      if (!usedIds.has(p.id)) {
        picked.push(p);
        usedIds.add(p.id);
      }
    }
  }
  if (picked.length < count) {
    for (const p of mostAttractive(pool)) {
      if (picked.length >= count) break;
      if (!usedIds.has(p.id)) {
        picked.push(p);
        usedIds.add(p.id);
      }
    }
  }
  return picked;
}

interface SlideSeed {
  id: string;
  kind: LuminousSlideKind;
  eyebrowAr: string;
  eyebrowEn: string;
  headlineAr: string;
  headlineEn: string;
  subAr: string;
  subEn: string;
  ctaAr: string;
  ctaEn: string;
  ctaHref: string;
  theme: LuminousStageTheme;
  pick: () => ProductSummary[];
}

const SEEDS: SlideSeed[] = [
  {
    id: "luminous-offers",
    kind: "offer",
    eyebrowAr: "عروض حقيقية",
    eyebrowEn: "Real Offers",
    headlineAr: "عروض هذا الأسبوع",
    headlineEn: "This Week's Offers",
    subAr: "خصومات فعلية على منتجات مختارة من الكتالوج",
    subEn: "Genuine discounts on selected catalog favorites",
    ctaAr: "تسوقي العروض",
    ctaEn: "Shop Offers",
    ctaHref: "/offers",
    theme: { bg: "linear-gradient(165deg,#fffdf8 0%,#fbf3e2 55%,#f5e9cf 100%)", accent: "#a8842c" },
    pick: () => selectSingleBrandPack(["CeraVe", "Bioderma", "Vichy", "Eucerin"], ["cleansers", "serums", "moisturizers", "sunscreen"], 3),
  },
  {
    id: "luminous-routine",
    kind: "routine",
    eyebrowAr: "باقات وروتينات",
    eyebrowEn: "Routines & Bundles",
    headlineAr: "روتينكِ المتكامل",
    headlineEn: "Your Complete Routine",
    subAr: "خطوات مختارة تكمل بعضها لنتيجة أفضل",
    subEn: "Complementary steps designed to work together",
    ctaAr: "اكتشفي الروتين",
    ctaEn: "View Routine",
    ctaHref: "/routines",
    theme: { bg: "linear-gradient(165deg,#f5faf7 0%,#e9f2ec 55%,#dbeae0 100%)", accent: "#33705e" },
    pick: () => selectSingleBrandPack(["CeraVe", "Bioderma", "La Roche-Posay"], ["cleansers", "serums", "moisturizers"], 3),
  },
  {
    id: "luminous-bestsellers",
    kind: "best-sellers",
    eyebrowAr: "اختيارات النساء",
    eyebrowEn: "Most Wanted",
    headlineAr: "الأكثر مبيعًا",
    headlineEn: "Best Sellers",
    subAr: "منتجات أثبتت نفسها بين عملائنا",
    subEn: "Proven favorites our customers keep coming back to",
    ctaAr: "تسوقي الأكثر مبيعًا",
    ctaEn: "Shop Best Sellers",
    ctaHref: "/products",
    theme: { bg: "linear-gradient(165deg,#fdf6f0 0%,#f7e6da 55%,#eed3c0 100%)", accent: "#b06a3b" },
    pick: () => selectSingleBrandPack(["La Roche-Posay", "Vichy", "Bioderma", "CeraVe"], ["cleansers", "serums", "moisturizers", "sunscreen"], 3),
  },
  {
    id: "luminous-brands",
    kind: "brand",
    eyebrowAr: "من العلامات العالمية",
    eyebrowEn: "Global Icons",
    headlineAr: "علامات عالمية موثوقة",
    headlineEn: "Trusted Global Brands",
    subAr: "الأكثر طلبًا من ماركات عالمية أصلية",
    subEn: "Best-loved essentials from authentic international brands",
    ctaAr: "تصفحي الماركات",
    ctaEn: "Browse Brands",
    ctaHref: "/brands",
    theme: { bg: "linear-gradient(165deg,#f3f6fb 0%,#e7edf6 55%,#dae4f0 100%)", accent: "#3b5b86" },
    pick: () => selectSingleBrandPack(["CeraVe", "La Roche-Posay", "Bioderma", "Vichy"], ["cleansers", "serums", "moisturizers", "sunscreen"], 3),
  },
  {
    id: "luminous-hair",
    kind: "category",
    eyebrowAr: "مجموعة كاملة",
    eyebrowEn: "Full Collection",
    headlineAr: "شعر يلفت الأنظار",
    headlineEn: "Hair That Turns Heads",
    subAr: "باقة متكاملة لتنظيف شعرك وتغذيته ومنحه لمعة تستمر طوال اليوم",
    subEn: "A complete edit to cleanse, nourish and reveal your hair's natural shine.",
    ctaAr: "تسوقي المجموعة",
    ctaEn: "Shop Collection",
    ctaHref: "/categories/haircare",
    theme: { bg: "linear-gradient(165deg,#fdfaf3 0%,#f6ecd8 55%,#eedfc0 100%)", accent: "#8a5f33" },
    pick: () => selectSingleBrandPack(["L'Oréal", "Garnier", "Kérastase", "Olaplex", "Schwarzkopf", "Pantene"], ["shampoo", "conditioner", "hair-masks", "hair-oils", "hair-treatments"], 3),
  },
  {
    id: "luminous-serums",
    kind: "collection",
    eyebrowAr: "تركيز عالي",
    eyebrowEn: "High Potency",
    headlineAr: "قطرات تصنع الفرق",
    headlineEn: "Small Drops. Visible Difference.",
    subAr: "اختاري تركيبتك المركزة لبشرة أكثر صفاءً وإشراقًا مع كل خطوة",
    subEn: "Targeted formulas chosen to leave your complexion clearer, brighter and beautifully cared for.",
    ctaAr: "تسوقي السيروم",
    ctaEn: "Shop Serums",
    ctaHref: "/categories/serums",
    theme: { bg: "linear-gradient(165deg,#f6f4fc 0%,#ebe6f6 55%,#ddd3ee 100%)", accent: "#6d5aa8" },
    pick: () => selectSingleBrandPack(["The Ordinary", "Vichy", "CeraVe", "La Roche-Posay", "Bioderma", "Eucerin"], ["serums"], 3),
  },
  {
    id: "luminous-body",
    kind: "category",
    eyebrowAr: "مجموعة كاملة",
    eyebrowEn: "Full Collection",
    headlineAr: "طقس فاخر لبشرتك",
    headlineEn: "A Ritual Your Skin Will Love",
    subAr: "نظافة ناعمة وترطيب عميق ولمسة عطرية ترافقك من الرأس حتى القدمين",
    subEn: "Soft cleansing, deep hydration and a luminous finish from head to toe.",
    ctaAr: "تسوقي المجموعة",
    ctaEn: "Shop Collection",
    ctaHref: "/categories/body-care",
    theme: { bg: "linear-gradient(165deg,#faf5f0 0%,#f2e5da 55%,#e9d6c6 100%)", accent: "#a06a4f" },
    pick: () => selectSingleBrandPack(["L'Oréal", "Nivea", "Bioderma", "CeraVe", "Eucerin", "Vaseline"], ["body-lotion", "body-wash", "body-oils", "body-scrubs", "body-care"], 3),
  },
  {
    id: "luminous-perfume",
    kind: "category",
    eyebrowAr: "عالم العطور",
    eyebrowEn: "Fragrance World",
    headlineAr: "اتركي أثرًا لا يُنسى",
    headlineEn: "Leave a Beautiful Trace",
    subAr: "اختاري بصمتك العطرية؛ حضور يسبقك وذكرى تبقى بعدك",
    subEn: "Find your signature scent: a presence that arrives before you and lingers after you leave.",
    ctaAr: "اكتشفي العطور",
    ctaEn: "Discover Scents",
    ctaHref: "/categories/perfume",
    theme: { bg: "linear-gradient(165deg,#fbf5fb 0%,#f3e6f3 55%,#ead4ea 100%)", accent: "#8d5b9e" },
    pick: () => selectSingleBrandPack(["J'adore", "Dior", "Chanel", "Armani", "Versace", "Burberry", "Lattafa"], ["perfume-women", "perfume-men", "perfume"], 3),
  },
  {
    id: "luminous-bakhoor",
    kind: "campaign",
    eyebrowAr: "بخور وعود",
    eyebrowEn: "Bakhoor & Oud",
    headlineAr: "دفء البخور وفخامة العود",
    headlineEn: "Warm Bakhoor, Luxurious Oud",
    subAr: "تشكيلة شرقية أصيلة تدوم طويلًا",
    subEn: "An authentic oriental selection that lasts",
    ctaAr: "تسوقي البخور",
    ctaEn: "Shop Bakhoor",
    ctaHref: "/categories/bakhoor-oud",
    theme: { bg: "linear-gradient(165deg,#faf3ec 0%,#f0dfc9 55%,#e4cba6 100%)", accent: "#96652f" },
    pick: () => selectFromSlugs(["bakhoor-oud", "bakhoor-premium"], 3),
  },
  {
    id: "luminous-makeup",
    kind: "category",
    eyebrowAr: "جمالكِ يبدأ هنا",
    eyebrowEn: "Beauty Starts Here",
    headlineAr: "لونكِ. حضوركِ. قصتكِ.",
    headlineEn: "Your Color. Your Presence. Your Story.",
    subAr: "باقة مختارة من الأساس إلى اللمسة الأخيرة لإطلالة تنبض بثقتكِ",
    subEn: "A considered edit from base to final touch, made for confidence that shows.",
    ctaAr: "تسوقي المكياج",
    ctaEn: "Shop Makeup",
    ctaHref: "/categories/makeup",
    theme: { bg: "linear-gradient(165deg,#fef2f5 0%,#fadfe7 55%,#f3cbd8 100%)", accent: "#b04a68" },
    pick: () => selectSingleBrandPack(["Maybelline", "L'Oréal", "NYX", "Revlon", "Essence", "MAC", "KIKO"], ["face-makeup", "eye-makeup", "lip-makeup", "makeup"], 3),
  },
  {
    id: "luminous-eye",
    kind: "category",
    eyebrowAr: "نظرة تأسر",
    eyebrowEn: "Eye Care",
    headlineAr: "عناية محيط العين",
    headlineEn: "Eye Area Essentials",
    subAr: "كريمات وسيروم لتفتيح وانتعاش محيط العين",
    subEn: "Creams and serums for brighter, rested eyes",
    ctaAr: "تسوقي العناية",
    ctaEn: "Shop Eye Care",
    ctaHref: "/categories/eye-care",
    theme: { bg: "linear-gradient(165deg,#f4f9fa 0%,#e4f0f2 55%,#d3e5ea 100%)", accent: "#3d7c8c" },
    pick: () => selectFromSlugs(["eye-care"], 3),
  },
  {
    id: "luminous-nail",
    kind: "category",
    eyebrowAr: "تفاصيل أنيقة",
    eyebrowEn: "Fine Details",
    headlineAr: "عناية الأظافر",
    headlineEn: "Nail Care Rituals",
    subAr: "زيوت وأدوات تقوّي وتجمّل أظافركِ",
    subEn: "Oils and tools that strengthen and beautify",
    ctaAr: "تسوقي العناية",
    ctaEn: "Shop Nail Care",
    ctaHref: "/categories/nail-care",
    theme: { bg: "linear-gradient(165deg,#fdf4f0 0%,#f8e3da 55%,#f0cec0 100%)", accent: "#c26a52" },
    pick: () => selectFromSlugs(["nail-care"], 3),
  },
  {
    id: "luminous-supplements",
    kind: "collection",
    eyebrowAr: "جمال من الداخل",
    eyebrowEn: "Beauty From Within",
    headlineAr: "الفيتامينات والمكملات",
    headlineEn: "Vitamins & Supplements",
    subAr: "دعم يومي لبشرتك وشعرك وصحتك العامة",
    subEn: "Daily support for skin, hair and wellbeing",
    ctaAr: "تسوقي المكملات",
    ctaEn: "Shop Supplements",
    ctaHref: "/categories/vitamins",
    theme: { bg: "linear-gradient(165deg,#f4faf4 0%,#e5f1e3 55%,#d3e6cf 100%)", accent: "#57804a" },
    pick: () => selectFromSlugs(["vitamins"], 3),
  },
  {
    id: "luminous-oral",
    kind: "category",
    eyebrowAr: "ابتسامتكِ أهم",
    eyebrowEn: "Your Smile Matters",
    headlineAr: "عناية الفم والأسنان",
    headlineEn: "Oral & Dental Care",
    subAr: "معجون وغسول ومنتجات تبييض موثوقة",
    subEn: "Trusted toothpaste, rinses and whitening care",
    ctaAr: "تسوقي العناية",
    ctaEn: "Shop Oral Care",
    ctaHref: "/categories/oral-care",
    theme: { bg: "linear-gradient(165deg,#f2fafc 0%,#e2f1f6 55%,#d2e7ef 100%)", accent: "#2e7d95" },
    pick: () => selectFromSlugs(["oral-care"], 3),
  },
  {
    id: "luminous-trending",
    kind: "new-arrivals",
    eyebrowAr: "جديد ورائج",
    eyebrowEn: "New & Trending",
    headlineAr: "وصل حديثًا",
    headlineEn: "Just Arrived",
    subAr: "أحدث الإضافات والأكثر رواجًا الآن",
    subEn: "The latest arrivals everyone is talking about",
    ctaAr: "اكتشفي الجديد",
    ctaEn: "Discover New",
    ctaHref: "/new-arrivals",
    theme: { bg: "linear-gradient(165deg,#fdf3f5 0%,#f8e2e8 55%,#f1d2db 100%)", accent: "#ad4d68" },
    pick: () => selectTrending(3),
  },
];

export function defaultStageConfigs(): StageSlideConfig[] {
  const routine = selectRoutine();
  return SEEDS.map((seed) => ({
    id: seed.id,
    kind: seed.kind,
    eyebrowAr: seed.eyebrowAr,
    eyebrowEn: seed.eyebrowEn,
    headlineAr: seed.headlineAr,
    headlineEn: seed.headlineEn,
    subAr: seed.subAr,
    subEn: seed.subEn,
    ctaAr: seed.ctaAr,
    ctaEn: seed.ctaEn,
    ctaHref: seed.ctaHref,
    accent: seed.theme.accent,
    bg: seed.theme.bg,
    products:
      seed.kind === "routine"
        ? routine.products.map((p) => ({ id: p.id }))
        : seed.pick().map((p) => ({ id: p.id })),
  })).filter((c) => c.products.length >= 3);
}

const FALLBACK_BG =
  "linear-gradient(165deg,#f8f6f3 0%,#efece6 55%,#e4dfd5 100%)";

export const LUMINOUS_MODEL_HERO_ID = "luminous-model-hero";

const MODEL_HERO_CONFIG: StageSlideConfig = {
  id: LUMINOUS_MODEL_HERO_ID,
  kind: "collection",
  eyebrowAr: "",
  eyebrowEn: "",
  headlineAr: "جمال يفوح بالثقة...\nرعاية تليق بك",
  headlineEn: "Beauty that radiates confidence...\nCare that suits you",
  subAr: "اكتشفي أفضل منتجات العناية\nلبشرة صحية متألقة كل يوم",
  subEn: "Discover the finest skincare essentials\nfor a radiant glow, every day.",
  ctaAr: "تسوقي الآن",
  ctaEn: "Shop Now",
  ctaHref: "/products",
  accent: "#4B2A6F",
  bg: "linear-gradient(135deg,#fff2f4 0%,#f9e2e8 52%,#ead8f0 100%)",
  products: selectSingleBrandPack(["CeraVe", "La Roche-Posay", "Bioderma", "The Ordinary", "Vichy", "Eucerin"], ["cleansers", "serums", "moisturizers", "sunscreen"], 3).map((p) => ({ id: p.id })),
  slideType: "custom-image",
  customImage: "/images/hero/luminous-hero-reference.png",
  showBrandMark: false,
};

export function resolveStageSlides(configs: StageSlideConfig[]): LuminousStageSlide[] {
  const out: LuminousStageSlide[] = [];
  const curatedById = new Map(defaultStageConfigs().map((cfg) => [cfg.id, cfg]));
  const orderedConfigs = [
    MODEL_HERO_CONFIG,
    ...configs
      .filter((cfg) => cfg.id !== LUMINOUS_MODEL_HERO_ID)
      .map((cfg) => {
        const curated = curatedById.get(cfg.id);
        return curated ? { ...curated, hidden: cfg.hidden } : cfg;
      }),
  ];
  orderedConfigs.forEach((cfg) => {
    if (cfg.hidden) return;
    const placements: StageProductPlacement[] = [];
    cfg.products.forEach((pc, pi) => {
      const product = byId.get(pc.id);
      if (!product) return;
      placements.push({
        product,
        slot: typeof pc.slot === "number" ? pc.slot : pi,
        scale: typeof pc.scale === "number" ? Math.min(1.35, Math.max(0.7, pc.scale)) : 1,
        rotate: typeof pc.rotate === "number" ? Math.min(12, Math.max(-12, pc.rotate)) : 0,
        hero: pc.hero === true,
      });
    });
    if (placements.length === 0 && !(cfg.slideType === "custom-image" && cfg.customImage)) return;
    out.push({
      id: cfg.id,
      kind: cfg.kind === "custom" ? "collection" : cfg.kind,
      eyebrowAr: cfg.eyebrowAr,
      eyebrowEn: cfg.eyebrowEn,
      headlineAr: cfg.headlineAr,
      headlineEn: cfg.headlineEn,
      subAr: cfg.subAr,
      subEn: cfg.subEn,
      ctaAr: cfg.ctaAr,
      ctaEn: cfg.ctaEn,
      ctaHref: cfg.ctaHref,
      theme: { bg: cfg.bg || FALLBACK_BG, accent: cfg.accent || "#a8842c" },
      products: placements,
      slideType: cfg.slideType,
      customImage: cfg.customImage,
      showBrandMark: cfg.showBrandMark,
      stageMood: cfg.stageMood,
    });
  });
  return out;
}

export function sanitizeConfigs(input: unknown): StageSlideConfig[] | null {
  if (!input || typeof input !== "object") return null;
  const arr = (input as { slides?: unknown }).slides;
  if (!Array.isArray(arr)) return null;
  const out: StageSlideConfig[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.slice(0, 80) : "";
    if (!id) continue;
    const str = (k: string, fb: string) =>
      typeof o[k] === "string" ? (o[k] as string).slice(0, 300) : fb;

    let products: ProductConfig[] = [];
    if (Array.isArray(o.products)) {
      products = o.products
        .map((p): ProductConfig | null => {
          if (typeof p === "string") return { id: p };
          if (p && typeof p === "object" && typeof (p as ProductConfig).id === "string") {
            const pc = p as ProductConfig;
            return {
              id: pc.id,
              slot: typeof pc.slot === "number" ? pc.slot : undefined,
              scale: typeof pc.scale === "number" ? pc.scale : undefined,
              rotate: typeof pc.rotate === "number" ? pc.rotate : undefined,
              hero: pc.hero === true ? true : undefined,
            };
          }
          return null;
        })
        .filter((p): p is ProductConfig => p !== null)
        .slice(0, 6);
    } else if (Array.isArray((o as Record<string, unknown>).productIds)) {
      products = ((o as { productIds: unknown[] }).productIds)
        .filter((x): x is string => typeof x === "string")
        .map((id) => ({ id }));
    }

    out.push({
      id,
      kind: (typeof o.kind === "string" ? o.kind : "custom") as StageSlideConfig["kind"],
      eyebrowAr: str("eyebrowAr", ""),
      eyebrowEn: str("eyebrowEn", ""),
      headlineAr: str("headlineAr", ""),
      headlineEn: str("headlineEn", ""),
      subAr: str("subAr", ""),
      subEn: str("subEn", ""),
      ctaAr: str("ctaAr", "تسوقي الآن"),
      ctaEn: str("ctaEn", "Shop Now"),
      ctaHref: str("ctaHref", "/products"),
      accent: str("accent", "#a8842c"),
      bg: str("bg", FALLBACK_BG),
      products,
      hidden: o.hidden === true,
      slideType: o.slideType === "custom-image" ? "custom-image" : "template",
      customImage: typeof o.customImage === "string" ? o.customImage.slice(0, 400) : undefined,
      showBrandMark: o.showBrandMark === true ? true : o.showBrandMark === false ? false : undefined,
      stageMood: typeof o.stageMood === "string" ? o.stageMood.slice(0, 40) : undefined,
    });
  }
  return out;
}
