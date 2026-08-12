export type SkinType = "dry" | "oily" | "combination" | "sensitive" | "normal" | "all";

export type SkinConcern = "acne" | "dryness" | "pigmentation" | "aging" | "redness" | "large_pores" | "uneven_texture" | "dark_circles" | "oiliness" | "sensitivity";

export type SortOption = "popular" | "newest" | "price_asc" | "price_desc" | "rating" | "name_asc";

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
  inStock?: boolean;
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
  skinTypes: string[];
  suitableFor?: string[];
  skinConcerns?: string[];
  stock: number;
  inStock?: boolean;
  rating: number;
  reviewCount?: number;
  featured?: boolean;
  isFeatured?: boolean;
  new?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  isDoctorRecommended?: boolean;
  tags?: string[];
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