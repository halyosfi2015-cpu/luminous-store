import type { EngineStats } from "@/src/engine/types";

export type AdminRole =
  | "super_admin"
  | "admin"
  | "content_manager"
  | "product_manager"
  | "order_manager"
  | "support";

export type AdminResource =
  | "dashboard"
  | "products"
  | "categories"
  | "brands"
  | "orders"
  | "customers"
  | "hero"
  | "banners"
  | "offers"
  | "articles"
  | "routines"
  | "bundles"
  | "experts"
  | "coupons"
  | "reviews"
  | "users"
  | "reports"
  | "settings"
  | "shipping"
  | "analytics"
  | "customer_intelligence"
  | "ai";

export type AdminPermission = "view" | "edit";

export type AdminSession = {
  role: AdminRole;
  name: string;
  email: string;
  loggedInAt: string;
};

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
  orderCount: number;
};

export type AdminBanner = {
  id: string;
  titleAr: string;
  titleEn: string;
  image: string;
  link: string;
  position: string;
  active: boolean;
};

export type AdminStats = {
  productTotal: number;
  featuredProducts: number;
  newProducts: number;
  bestSellers: number;
  lowStock: number;
  outOfStock: number;
  categoryCount: number;
  brandCount: number;
  routinesCount: number;
  bundlesCount: number;
  expertsCount: number;
  articlesCount: number;
  offersEngine: EngineStats | null;
  heroActive: boolean;
  enabledGovernorates: number;
};

export type AdminCouponType = "percent" | "fixed";

export type AdminCoupon = {
  id: string;
  code: string;
  description?: string;
  type: AdminCouponType;
  value: number;
  minOrder?: number;
  maxDiscount?: number;
  validFrom?: string;
  validUntil?: string;
  usageLimit?: number;
  usedCount: number;
  active: boolean;
  createdAt: string;
};

export type AdminReviewStatus = "visible" | "hidden";

export type AdminReview = {
  id: string;
  productId: string;
  productNameAr: string;
  productNameEn: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  isVerified: boolean;
  helpfulCount: number;
  status: AdminReviewStatus;
};

export type HomepageSectionKey =
  | "hero"
  | "categories"
  | "bestSellers"
  | "newArrivals"
  | "offers"
  | "bundles"
  | "experts"
  | "articles";

export type HomepageSettings = {
  sections: Partial<Record<HomepageSectionKey, boolean>>;
};
