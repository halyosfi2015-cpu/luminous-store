import { productSummaries as products } from "@/src/data/product-summaries";
import type {
  HeroCampaign,
  HeroContent,
  HeroOverride,
  HeroTheme,
  HeroThemeKey,
  HeroTrustItem,
} from "./types";

export const HERO_STORAGE_KEY = "ld-hero-campaign";
export const HERO_CHANGE_EVENT = "ld-hero-change";

export const HERO_THEMES: Record<HeroThemeKey, HeroTheme> = {
  premium: {
    key: "premium",
    bg: "bg-gradient-to-br from-primary-950 via-primary-800 to-primary-600",
    glowA: "bg-amber-400/20",
    glowB: "bg-fuchsia-500/20",
    accentText: "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300",
    chipAccent: "text-amber-400",
  },
  rose: {
    key: "rose",
    bg: "bg-gradient-to-br from-rose-900 via-rose-700 to-pink-600",
    glowA: "bg-amber-300/20",
    glowB: "bg-pink-300/20",
    accentText: "bg-gradient-to-r from-rose-200 via-white to-rose-200",
    chipAccent: "text-rose-200",
  },
  emerald: {
    key: "emerald",
    bg: "bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-600",
    glowA: "bg-amber-300/20",
    glowB: "bg-teal-300/20",
    accentText: "bg-gradient-to-r from-emerald-200 via-white to-emerald-200",
    chipAccent: "text-emerald-200",
  },
  midnight: {
    key: "midnight",
    bg: "bg-gradient-to-br from-slate-950 via-slate-900 to-primary-900",
    glowA: "bg-amber-400/15",
    glowB: "bg-indigo-400/20",
    accentText: "bg-gradient-to-r from-amber-300 via-white to-indigo-300",
    chipAccent: "text-amber-400",
  },
};

export const HERO_CAMPAIGNS: HeroCampaign[] = [
  {
    id: "glow",
    title: { ar: "توهّجك يبدأ من", en: "Your glow starts from" },
    accent: { ar: "الداخل", en: "within" },
    subtitle: {
      ar: "سيرومات أصلية 100% من أفضل الماركات العالمية — نتائج ملحوظة من أول استخدام، وتوصيل سريع إلى باب بيتك في كل أنحاء اليمن.",
      en: "100% authentic serums from the world's best brands — visible results from the first use, with fast delivery across all of Yemen.",
    },
    badge: { ar: "مجموعة العناية الفاخرة", en: "Luxury Skincare Edit" },
    primaryCta: { ar: "تسوقي الآن", en: "Shop Now" },
    primaryLink: "/categories/serums",
    secondaryCta: { ar: "اكتشفي الروتينات", en: "Explore Routines" },
    secondaryLink: "/routines",
    productId: "yq-2685",
    theme: "premium",
    seasonal: null,
    priority: 1,
    active: true,
  },
  {
    id: "perfume",
    title: { ar: "عطرٌ يتردّد في", en: "A scent that lingers in" },
    accent: { ar: "الذاكرة", en: "memory" },
    subtitle: {
      ar: "تشكيلة عطور نسائية ورجالية فاخرة — إطلالة لا تُنسى تليق بذوقك الرفيع.",
      en: "A luxurious collection of women's and men's fragrances — an unforgettable signature worthy of your taste.",
    },
    badge: { ar: "مجموعة العطور", en: "The Fragrance Edit" },
    primaryCta: { ar: "تصفّحي العطور", en: "Browse Fragrances" },
    primaryLink: "/categories/perfume-women",
    secondaryCta: { ar: "اكتشفي المسك", en: "Explore Musk" },
    secondaryLink: "/categories/perfume-musk",
    productId: "yq-1261",
    theme: "midnight",
    seasonal: null,
    priority: 2,
    active: true,
  },
  {
    id: "makeup",
    title: { ar: "جمالك يُروى بقصته", en: "Beauty tells" },
    accent: { ar: "الخاصة", en: "your story" },
    subtitle: {
      ar: "مكياج بألوان تُبهرك من الماركات الأصلية — خطوة واحدة تفصلك عن إطلالة ساحرة.",
      en: "Makeup in mesmerizing colors from authentic brands — one step away from a stunning look.",
    },
    badge: { ar: "مجموعة المكياج", en: "The Makeup Edit" },
    primaryCta: { ar: "اكتشفي المكياج", en: "Discover Makeup" },
    primaryLink: "/categories/makeup",
    secondaryCta: { ar: "تسوقي الكل", en: "Shop All" },
    secondaryLink: "/products",
    productId: "yq-2685",
    theme: "rose",
    seasonal: null,
    priority: 3,
    active: true,
  },
  {
    id: "ramadan",
    title: { ar: "تألّقي في", en: "Radiate this" },
    accent: { ar: "رمضان المبارك", en: "blessed Ramadan" },
    subtitle: {
      ar: "عروض رمضان الحصرية على أفضل منتجات العناية — هدية فاخرة لكل إطلالة سحور ووصال.",
      en: "Exclusive Ramadan offers on the best care products — a luxurious gift for every suhoor and iftar look.",
    },
    badge: { ar: "عروض رمضان", en: "Ramadan Offers" },
    primaryCta: { ar: "تسوقي العروض", en: "Shop Offers" },
    primaryLink: "/products",
    secondaryCta: { ar: "مجموعات الهدايا", en: "Gift Sets" },
    secondaryLink: "/categories/perfume-gift-sets",
    productId: "yq-2685",
    theme: "emerald",
    seasonal: { startMonth: 9, endMonth: 10 },
    priority: 0,
    active: true,
  },
];

export const HERO_TRUST_ITEMS: HeroTrustItem[] = [
  {
    icon: "users",
    value: { number: 25000, suffix: "+" },
    label: { ar: "عميلة سعيدة", en: "Happy customers" },
  },
  {
    icon: "truck",
    value: { number: 25000, suffix: "" },
    label: { ar: "ر.ي شحن مجاني", en: "YER free shipping" },
  },
  {
    icon: "star",
    value: { number: 4.9, suffix: "" },
    label: { ar: "تقييم العملاء", en: "Customer rating" },
  },
  {
    icon: "shield",
    value: { number: 100, suffix: "%" },
    label: { ar: "منتجات أصلية", en: "Authentic products" },
  },
];

export function selectHeroCampaign(month: number, preferredId?: string): HeroCampaign {
  const candidates = [...HERO_CAMPAIGNS].filter((c) => c.active);

  const preferred =
    preferredId && candidates.find((c) => c.id === preferredId)
      ? preferredId
      : undefined;

  if (preferred) {
    return candidates.find((c) => c.id === preferred)!;
  }

  const seasonal = candidates
    .filter((c) => c.seasonal && month >= c.seasonal.startMonth && month <= c.seasonal.endMonth)
    .sort((a, b) => a.priority - b.priority);

  if (seasonal.length > 0) return seasonal[0];

  return candidates.sort((a, b) => a.priority - b.priority)[0];
}

export function getHeroOverride(): HeroOverride | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(HERO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as HeroOverride) : null;
  } catch {
    return null;
  }
}

export function saveHeroOverride(override: HeroOverride) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HERO_STORAGE_KEY, JSON.stringify(override));
  window.dispatchEvent(new Event(HERO_CHANGE_EVENT));
}

export function clearHeroOverride() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(HERO_STORAGE_KEY);
  window.dispatchEvent(new Event(HERO_CHANGE_EVENT));
}

function pick<T>(override: T | undefined, fallback: T): T {
  return override !== undefined && override !== null ? override : fallback;
}

export function buildHeroContent(month: number, override: HeroOverride | null): HeroContent {
  const base = selectHeroCampaign(month, override?.campaignId);

  const campaign: HeroCampaign = {
    ...base,
    title: override?.title ? { ...base.title, ...override.title } : base.title,
    accent: override?.accent ? { ...base.accent, ...override.accent } : base.accent,
    subtitle: override?.subtitle ? { ...base.subtitle, ...override.subtitle } : base.subtitle,
    badge: override?.badge ? { ...base.badge, ...override.badge } : base.badge,
    primaryCta: override?.primaryCta ? { ...base.primaryCta, ...override.primaryCta } : base.primaryCta,
    primaryLink: pick(override?.primaryLink, base.primaryLink),
    secondaryCta: override?.secondaryCta ? { ...base.secondaryCta, ...override.secondaryCta } : base.secondaryCta,
    secondaryLink: pick(override?.secondaryLink, base.secondaryLink),
    productId: pick(override?.productId, base.productId),
    theme: pick(override?.theme, base.theme),
  };

  const themeKey = pick(override?.theme, base.theme);
  const theme = HERO_THEMES[themeKey] || HERO_THEMES.premium;

  const rawProduct = products.find((p) => p.id === campaign.productId);
  const product: HeroContent["product"] = rawProduct
    ? {
        id: rawProduct.id,
        slug: rawProduct.slug,
        nameAr: rawProduct.name.ar,
        nameEn: rawProduct.name.en,
        brandAr: rawProduct.brandAr || rawProduct.brand,
        brandEn: rawProduct.brand,
        image: rawProduct.gallery?.[0] || "/images/products/yq-629.png",
        price: rawProduct.pricing.price,
        originalPrice: rawProduct.pricing.originalPrice,
        discount: rawProduct.discount,
        rating: rawProduct.rating,
      }
    : undefined;

  return { campaign, theme, product, trustItems: HERO_TRUST_ITEMS };
}

