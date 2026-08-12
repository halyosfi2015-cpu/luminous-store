export type WeekNumber = 1 | 2 | 3 | 4;

export type OfferProduct = {
  productId: string;
  discount: number;
  reason: "best_seller" | "high_demand" | "low_demand" | "new" | "seasonal" | "boost_sales" | "admin_pinned" | "month_top";
  isPinned?: boolean;
};

export type WeeklyCampaign = {
  id: string;
  month: number;
  year: number;
  week: WeekNumber;
  products: OfferProduct[];
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type MonthCampaign = {
  id: string;
  month: number;
  year: number;
  weeks: WeeklyCampaign[];
  topSellersProductIds: string[];
};

export type EngineConfig = {
  enabled: boolean;
  highDemandDiscount: number;
  lowDemandDiscount: number;
  productsPerWeek: number;
  maxDiscount: number;
  minDiscount: number;
  excludedProductIds: string[];
  pinnedProductIds: string[];
  seasonalOverrides: SeasonalRule[];
  lastUpdated: string;
};

export type SeasonalRule = {
  month: number;
  categorySlugs: string[];
  boostDiscount: number;
  label: string;
};

export type EngineStats = {
  totalOffersGenerated: number;
  uniqueProductsOffered: number;
  categoryCoverage: Record<string, number>;
  lastGeneratedWeek: string | null;
};

