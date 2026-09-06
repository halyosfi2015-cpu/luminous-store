/**
 * ADMIN SERVICES LAYER — canonical API-backed implementations (B5).
 * Every function talks to /api/admin/<resource> (server-side RBAC +
 * Supabase persistence). No localStorage anywhere in this layer.
 *
 * Errors are thrown so callers can show honest failure states; the API
 * returns 401/403/4xx/5xx which we surface verbatim.
 */

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

async function apiGet<T>(resource: string): Promise<T> {
  const res = await fetch(`/api/admin/${resource}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${resource} failed: ${res.status}`);
  return (await res.json()) as T;
}

async function apiVoid(method: string, resource: string, body?: unknown): Promise<void> {
  const res = await fetch(`/api/admin/${resource}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${resource} failed: ${res.status}`);
}

export async function getProducts(): Promise<Product[]> {
  return apiGet<Product[]>("products");
}

export async function getCategories(): Promise<CategoryInfo[]> {
  return apiGet<CategoryInfo[]>("categories");
}

export async function getBrands(): Promise<Brand[]> {
  return apiGet<Brand[]>("brands");
}

export async function getOrders(): Promise<Order[]> {
  return apiGet<Order[]>("orders");
}

export async function getCustomers(): Promise<AdminCustomer[]> {
  return apiGet<AdminCustomer[]>("customers");
}

export async function changeOrderStatus(id: string, status: OrderStatus): Promise<void> {
  // Server validates transitions (ORDER_STATUS_TRANSITIONS → 409 on invalid).
  await apiVoid("PUT", `orders/${id}/status`, { status });
}

export async function getExperts(): Promise<Expert[]> {
  return apiGet<Expert[]>("experts");
}

export async function getArticles(): Promise<Article[]> {
  return apiGet<Article[]>("articles");
}

export async function getRoutines(): Promise<Routine[]> {
  return apiGet<Routine[]>("routines");
}

export async function getBundles(): Promise<Bundle[]> {
  return apiGet<Bundle[]>("bundles");
}

export async function saveHero(override: HeroOverride): Promise<void> {
  await apiVoid("PUT", "hero", override);
}

export async function saveShipping(governorates: Governorate[]): Promise<void> {
  await apiVoid("PUT", "shipping", governorates);
}

export async function getStats(): Promise<AdminStats> {
  return apiGet<AdminStats>("stats");
}

export async function getBanners(): Promise<AdminBanner[]> {
  return apiGet<AdminBanner[]>("banners");
}

export async function addBanner(banner: AdminBanner): Promise<AdminBanner[]> {
  await apiVoid("POST", "banners", banner);
  return getBanners();
}

export async function updateBanner(banner: AdminBanner): Promise<AdminBanner[]> {
  await apiVoid("PUT", `banners/${banner.id}`, banner);
  return getBanners();
}

export async function deleteBanner(id: string): Promise<AdminBanner[]> {
  await apiVoid("DELETE", `banners/${id}`);
  return getBanners();
}

export async function getBanner(id: string): Promise<AdminBanner | null> {
  const banners = await getBanners();
  return banners.find((b) => b.id === id) ?? null;
}

export async function getCoupons(): Promise<AdminCoupon[]> {
  return apiGet<AdminCoupon[]>("coupons");
}

/** Coupons are managed individually via the canonical API — bulk persist removed. */
export async function persistCoupons(_list: AdminCoupon[]): Promise<void> {
  throw new Error("persistCoupons is not supported — use addCoupon/patchCoupon/removeCoupon");
}

export async function addCoupon(coupon: AdminCoupon): Promise<AdminCoupon[]> {
  await apiVoid("POST", "coupons", coupon);
  return getCoupons();
}

export async function patchCoupon(
  id: string,
  patch: Partial<AdminCoupon>,
): Promise<AdminCoupon[]> {
  await apiVoid("PUT", `coupons/${id}`, patch);
  return getCoupons();
}

export async function removeCoupon(id: string): Promise<AdminCoupon[]> {
  await apiVoid("DELETE", `coupons/${id}`);
  return getCoupons();
}

export async function getReviews(): Promise<AdminReview[]> {
  return apiGet<AdminReview[]>("reviews");
}

export async function updateReviewStatus(
  id: string,
  status: AdminReviewStatus,
): Promise<void> {
  await apiVoid("PUT", `reviews/${id}`, { status });
}

export async function getHomepageSettings(): Promise<HomepageSettings> {
  return apiGet<HomepageSettings>("homepage");
}

export async function persistHomepageSettings(settings: HomepageSettings): Promise<void> {
  await apiVoid("PUT", "homepage", settings);
}
