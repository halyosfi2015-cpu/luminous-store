export type ProductStatus =
  | "published"
  | "draft"
  | "hidden"
  | "archived"
  | "rejected"
  | "duplicate"
  | "retired";

export type SkinType = "dry" | "oily" | "combination" | "sensitive" | "normal" | "all";

export type SkinConcern = "acne" | "dryness" | "pigmentation" | "aging" | "redness" | "large_pores" | "uneven_texture" | "dark_circles" | "oiliness" | "sensitivity";

export type SortOption = "popular" | "newest" | "price_asc" | "price_desc" | "rating" | "name_asc" | "smart";

export type FilterState = {
  brands: string[];
  skinTypes: SkinType[];
  skinConcerns: SkinConcern[];
  priceRanges: string[];
  ratings: number[];
};

export type ProductReview = {
  id: string;
  customerName: string;
  customerNameAr?: string;
  avatar?: string;
  rating: number;
  comment: string;
  commentAr?: string;
  date: string;
  isVerified: boolean;
  helpfulCount?: number;
};

export type Ingredient = {
  name: string;
  nameAr: string;
  benefit: string;
  benefitAr: string;
  isHighlighted?: boolean;
};

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  brand: string;
  brandAr?: string;
  category: string;
  categoryAr?: string;
  categorySlug?: string;
  pricing: {
    price: number;
    currency: string;
    originalPrice?: number;
  };
  discount?: number;
  gallery: string[];
  images?: string[];
  ingredients: {
    ar: string[];
    en: string[];
  };
  usageInstructions: {
    ar: string;
    en: string;
  };
  howToUse?: string[];
  howToUseAr?: string[];
  skinTypes: string[];
  suitableFor?: string[];
  skinConcerns?: string[];
  benefits: {
    ar: string[];
    en: string[];
  };
  stock: number;
  inStock?: boolean | null;
  stockQuantity?: number;
  rating: number;
  reviewCount?: number;
  reviews?: ProductReview[];
  featured?: boolean;
  isFeatured?: boolean;
  new?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  isDoctorRecommended?: boolean;
  tags?: string[];
   seoMetadata: {
    title: {
      ar: string;
      en: string;
    };
    description: {
      ar: string;
      en: string;
    };
    keywords: string[];
  };
  sizeLabel?: string;
  cheaperAlternative?: {
    id: string;
    slug: string;
    name: { ar: string; en: string };
    price: number;
    savings: number;
  };
  alternativeFeature?: "hidden" | "enabled";
  recommendations?: string[];
  trustGuidance?: {
    keyMessage: { ar: string; en: string };
    trustPoints: { ar: string[]; en: string[] };
  };
  objectionHandling?: {
    concern: { ar: string; en: string };
    resolution: { ar: string; en: string };
  };
  conversionUX?: {
    urgencyTrigger: { ar: string; en: string };
    socialProof: string;
  };
  personalization?: {
    skinTypeMatch: boolean;
    concernMatch: string[];
  };
  customerIntelligence?: {
    popularityScore: number;
    conversionLikelihood: number;
  };
  purchaseIntent?: number;

  // â”€â”€â”€ Phase 7: Operational / Admin-managed fields (all optional for BC) â”€â”€â”€
  status?: ProductStatus;
  /**
   * Base pricing rule (before any promotional discount).
   * When `basePrice` is set, storefront shows `basePrice` as the reference
   * "before" price and `pricing.price` as the discounted price. `-200 YER`
   * rule is applied automatically at save when no real discount is present,
   * but must NEVER display a "-200 YER" as a fake discount badge.
   */
  basePrice?: number;
  /** True when a genuine promotional discount exists (not the -200 base rule). */
  hasRealDiscount?: boolean;
  /** Optional manual display order for merchandising within a category/section. */
  displayOrder?: number;
  /** Search identity: extra aliases/keywords used by searchProducts. */
  searchAliases?: string[];
  /** Source/verification metadata (Phase 7 Source & Verification center). */
  source?: {
    provider?: string;
    verified?: boolean;
    verifiedAt?: string;
    verifiedBy?: string;
    notes?: string;
  };
  /** Duplicate lineage: id of the canonical product this one duplicates. */
  duplicateOf?: string;
  /** Audit trail (most recent first). */
  audit?: {
    action: string;
    at: string;
    by?: string;
    note?: string;
  }[];
  /** Optional hero/primary image override for merchandising. */
  heroImage?: string;
  /** Optional image caption labels keyed by gallery index. */
  imageLabels?: string[];
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: {
    ar: string;
    en: string;
  };
  brand: string;
  brandAr?: string;
  brandSlug?: string;
  brandId?: string | null;
  category: string;
  categoryAr?: string;
  categorySlug?: string;
  pricing: {
    price: number;
    currency: string;
    originalPrice?: number;
  };
  discount?: number;
  gallery: string[];
  heroImage?: string;
  skinTypes: string[];
  suitableFor?: string[];
  skinConcerns?: string[];
  stock: number;
  inStock?: boolean | null;
  rating: number;
  reviewCount?: number;
  featured?: boolean;
  isFeatured?: boolean;
  new?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  isDoctorRecommended?: boolean;
  tags?: string[];
  /** Phase 7: publication status carried in the slim client payload. */
  status?: ProductStatus;
}

export type ProductCompareDetail = {
  descriptionAr: string;
  ingredientsAr: string[];
};

export type CategoryInfo = {
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  image?: string;
  coverImage?: string;
  productCount?: number;
  icon?: string;
};

export type RoutineStepTime = "morning" | "evening" | "both";

export type RoutineStep = {
  productId: string;
  time: RoutineStepTime;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
};

export type RoutineLevel = "basic" | "standard" | "premium";

export type Routine = {
  id: string;
  slug?: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  products: string[];
  image?: string;
  type: string;
  typeAr: string;
  level?: RoutineLevel;
  active: boolean;
  displayOrder: number;
  savingsPercent: number;
  duration: string;
  durationEn: string;
  forWhom: string[];
  forWhomEn: string[];
  expectedResults: string[];
  expectedResultsEn: string[];
  rating: number;
  reviewCount: number;
  buyersCount: number;
  heroImage?: string;
  steps: RoutineStep[];
  whyChoseIt: string;
};