export type LocalizedText = { ar: string; en: string };

export type HeroThemeKey = "premium" | "rose" | "emerald" | "midnight";

export type HeroCampaign = {
  id: string;
  title: LocalizedText;
  accent: LocalizedText;
  subtitle: LocalizedText;
  badge: LocalizedText;
  primaryCta: LocalizedText;
  primaryLink: string;
  secondaryCta: LocalizedText;
  secondaryLink: string;
  productId: string;
  theme: HeroThemeKey;
  seasonal?: { startMonth: number; endMonth: number } | null;
  priority: number;
  active: boolean;
};

export type HeroTheme = {
  key: HeroThemeKey;
  bg: string;
  glowA: string;
  glowB: string;
  accentText: string;
  chipAccent: string;
};

export type HeroTrustItem = {
  icon: "truck" | "users" | "star" | "shield";
  value: { number: number; suffix: string };
  label: LocalizedText;
};

export type HeroOverride = {
  campaignId?: string;
  custom?: boolean;
  title?: LocalizedText;
  accent?: LocalizedText;
  subtitle?: LocalizedText;
  badge?: LocalizedText;
  primaryCta?: LocalizedText;
  primaryLink?: string;
  secondaryCta?: LocalizedText;
  secondaryLink?: string;
  productId?: string;
  theme?: HeroThemeKey;
};

export type HeroContent = {
  campaign: HeroCampaign;
  theme: HeroTheme;
  product?: {
    id: string;
    slug: string;
    nameAr: string;
    nameEn: string;
    brandAr: string;
    brandEn: string;
    image: string;
    price: number;
    originalPrice?: number;
    discount?: number;
    rating: number;
  };
  trustItems: HeroTrustItem[];
};

