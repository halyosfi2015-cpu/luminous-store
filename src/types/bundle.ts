export type BundleOccasion =
  | "all"
  | "bride"
  | "engagement"
  | "wedding"
  | "holidays"
  | "valentine"
  | "mothers-day"
  | "summer"
  | "winter";

export type BundleOccasionAr = {
  [key in BundleOccasion]: string;
};

export const occasionLabels: BundleOccasionAr = {
  all: "الكل",
  bride: "عروس",
  engagement: "خطوبة",
  wedding: "زفاف",
  holidays: "أعياد",
  valentine: "عيد الحب",
  "mothers-day": "عيد الأم",
  summer: "صيف",
  winter: "شتاء",
};

export type Bundle = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  occasion: BundleOccasion[];
  image: string;
  badge?: string;
  badgeAr?: string;
  productIds: string[];
  /** Optional per-product quantities (when present, supersedes `productIds` default qty=1). */
  bundleItems?: { productId: string; quantity: number }[];
  originalPrice: number;
  bundlePrice: number;
  savingsPercent: number;
  giftWrap: boolean;
  giftWrapPrice: number;
  giftCard: boolean;
  placeholder?: boolean;
  servicePrice: number;
  active?: boolean;
  /** Discount management (point 23): independent per-bundle control, default 20%. */
  discountEnabled?: boolean;
  discountPercent?: number;
  /** Display order for reordering bundles in the UI. */
  displayOrder?: number;
};

export type BundleProduct = {
  id: string;
  name: string;
  nameAr: string;
  image: string;
  price: number;
};

