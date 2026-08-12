import type { Product, CategoryInfo, Routine } from "@/src/types/product";
import type { Brand } from "@/src/data/brands";
import type { Expert } from "@/src/types/expert";
import type { Article } from "@/src/types/article";
import type { Bundle } from "@/src/types/bundle";
import type { Order, OrderStatus } from "@/types/cart";
import type { Governorate } from "@/src/data/shipping";
import type { HeroOverride } from "@/src/engine/hero/types";
import type {
  AdminBanner,
  AdminCoupon,
  AdminCustomer,
  AdminReview,
  AdminReviewStatus,
  AdminStats,
  HomepageSettings,
} from "../types";
import { listProducts } from "../adapters/local/products";
import { listCategories } from "../adapters/local/categories";
import { listBrands } from "../adapters/local/brands";
import { listOrders } from "../adapters/local/orders";
import { updateOrderStatus as updateOrderStatusAdapter } from "../adapters/local/orders";
import { listCustomers } from "../adapters/local/customers";
import { listExperts } from "../adapters/local/experts";
import { listArticles } from "../adapters/local/articles";
import { listRoutines } from "../adapters/local/routines";
import { listBundles } from "../adapters/local/bundles";
import { listBanners } from "../adapters/local/banners";
import { addBanner as addBannerAdapter } from "../adapters/local/banners";
import { updateBanner as updateBannerAdapter } from "../adapters/local/banners";
import { deleteBanner as deleteBannerAdapter } from "../adapters/local/banners";
import { getBanner as getBannerAdapter } from "../adapters/local/banners";
import { computeStats } from "../adapters/local/stats";
import { heroAdapter } from "../adapters/local/hero";
import { shippingAdapter } from "../adapters/local/shipping";
import {
  listCoupons,
  saveCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../adapters/local/coupons";
import {
  listReviews,
  setReviewStatus as setReviewStatusLocal,
} from "../adapters/local/reviews";
import {
  loadHomepageSettings,
  saveHomepageSettings,
} from "../adapters/local/homepage";

export async function getProducts(): Promise<Product[]> {
  return listProducts();
}

export async function getCategories(): Promise<CategoryInfo[]> {
  return listCategories();
}

export async function getBrands(): Promise<Brand[]> {
  return listBrands();
}

export async function getOrders(): Promise<Order[]> {
  return listOrders();
}

export async function getCustomers(): Promise<AdminCustomer[]> {
  return listCustomers();
}

export async function changeOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<void> {
  updateOrderStatusAdapter(id, status);
}

export async function getExperts(): Promise<Expert[]> {
  return listExperts();
}

export async function getArticles(): Promise<Article[]> {
  return listArticles();
}

export async function getRoutines(): Promise<Routine[]> {
  return listRoutines();
}

export async function getBundles(): Promise<Bundle[]> {
  return listBundles();
}

export async function saveHero(override: HeroOverride): Promise<void> {
  heroAdapter.save(override);
}

export async function saveShipping(governorates: Governorate[]): Promise<void> {
  shippingAdapter.save(governorates);
}

export async function getStats(): Promise<AdminStats> {
  return computeStats();
}

export async function getBanners(): Promise<AdminBanner[]> {
  return listBanners();
}

export async function addBanner(banner: AdminBanner): Promise<AdminBanner[]> {
  return addBannerAdapter(banner);
}

export async function updateBanner(banner: AdminBanner): Promise<AdminBanner[]> {
  return updateBannerAdapter(banner);
}

export async function deleteBanner(id: string): Promise<AdminBanner[]> {
  return deleteBannerAdapter(id);
}

export async function getBanner(id: string): Promise<AdminBanner | null> {
  return getBannerAdapter(id);
}

export async function getCoupons(): Promise<AdminCoupon[]> {
  return listCoupons();
}

export async function persistCoupons(list: AdminCoupon[]): Promise<void> {
  saveCoupons(list);
}

export async function addCoupon(coupon: AdminCoupon): Promise<AdminCoupon[]> {
  return createCoupon(coupon);
}

export async function patchCoupon(
  id: string,
  patch: Partial<AdminCoupon>,
): Promise<AdminCoupon[]> {
  return updateCoupon(id, patch);
}

export async function removeCoupon(id: string): Promise<AdminCoupon[]> {
  return deleteCoupon(id);
}

export async function getReviews(): Promise<AdminReview[]> {
  return listReviews();
}

export async function updateReviewStatus(
  id: string,
  status: AdminReviewStatus,
): Promise<void> {
  setReviewStatusLocal(id, status);
}

export async function getHomepageSettings(): Promise<HomepageSettings> {
  return loadHomepageSettings();
}

export async function persistHomepageSettings(
  settings: HomepageSettings,
): Promise<void> {
  saveHomepageSettings(settings);
}
