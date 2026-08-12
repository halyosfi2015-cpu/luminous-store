import type { ProductSummary } from "@/src/types/product";

export type ScoredProduct = {
  product: ProductSummary;
  score: number;
  reason: RecommendationReason;
  reasonAr: string;
  reasonEn: string;
  badge: string;
  badgeEn: string;
};

export type RecommendationReason =
  | "category_match"
  | "brand_match"
  | "cart_complement"
  | "wishlist_match"
  | "trending"
  | "new_arrival"
  | "best_seller"
  | "similar";

export type UserSignal = {
  visitedProductIds: string[];
  visitedCategorySlugs: string[];
  visitedBrandNames: string[];
  cartProductIds: string[];
  wishlistProductIds: string[];
  lastVisit: string;
};

export type RecommendationConfig = {
  weights: Record<RecommendationReason, number>;
  trendingPeriodDays: number;
  minScore: number;
  maxResults: number;
  enabledSources: Record<RecommendationReason, boolean>;
};

