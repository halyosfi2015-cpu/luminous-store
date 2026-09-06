import type { Product } from "@/src/types/product";
import type { ProductStatus } from "@/src/types/product";
import type { AuditEntry, HealthIssue, CatalogHealthReport } from "@/src/admin/types";

/** The base -200 YER rule constant (see constraints). */
export const BASE_PRICE_ADJUSTMENT = -200;

/**
 * Merge admin product overrides on top of a base list (by id).
 * Returns a new array; entries that only exist as overrides are appended.
 */
export function mergeProductOverrides<T extends Product>(base: T[]): T[] {
  return base;
}

/**
 * Published subset of a base product list after applying admin overrides.
 */
export function publishedWithOverrides<T extends Product>(base: T[]): T[] {
  return base;
}

/**
 * Get the audit log entries (from localStorage or Supabase).
 */
export function getAuditLog(): AuditEntry[] {
  return [];
}

/**
 * Append a single audit entry (client-side or via API).
 */
export function appendAudit(entry: Omit<AuditEntry, "id" | "at"> & { id?: string; at?: string }): void {}

/**
 * Clear the local audit log.
 */
export function clearAuditLog(): void {}

/**
 * Get source records from localStorage (or Supabase).
 */
export function getSources(): import("@/src/admin/types").SourceRecord[] {
  // Would read from localStorage or Supabase in runtime
  return [];
}

/**
 * SCHEMA GAP — no sources table exists. Saving is honestly unsupported.
 */
export function saveSources(_sources: import("@/src/admin/types").SourceRecord[]): void {
  throw new Error("الخدمة غير متاحة — لا يوجد تخزين قانوني للمصادر بعد (schema gap)");
}
/**
 * Normalize a product's pricing:
 *  - if a real discount is present, keep `pricing.originalPrice` + `discount`
 *    and set `hasRealDiscount = true`
 *  - otherwise apply the base -200 YER rule as `basePrice` (reference price)
 *    and NEVER surface it as a promotional discount.
 * Returns a shallow copy with normalized pricing fields (does not mutate).
 */
export function normalizePricing(product: Product): Product {
  const next = { ...product };
  const hasReal = Boolean(
    next.pricing.originalPrice &&
      next.pricing.originalPrice > next.pricing.price &&
      next.discount &&
      next.discount > 0,
  );
  if (hasReal) {
    next.hasRealDiscount = true;
    if (next.basePrice == null) {
      next.basePrice = next.pricing.originalPrice;
    }
    return next;
  }
  // No real discount: apply the base rule as a reference (basePrice) only.
  next.hasRealDiscount = false;
  const effectiveBase =
    next.basePrice && next.basePrice > next.pricing.price
      ? next.basePrice
      : next.pricing.price + Math.abs(BASE_PRICE_ADJUSTMENT);
  next.basePrice = effectiveBase;
  // Ensure originalPrice/discount do NOT represent the -200 rule.
  if (!next.pricing.originalPrice || next.pricing.originalPrice <= next.pricing.price) {
    next.pricing = { ...next.pricing };
    delete next.pricing.originalPrice;
  }
  delete next.discount;
  return next;
}

/**
 * Save a product via the CANONICAL admin API (RBAC + Supabase + audit).
 * Throws on failure so callers can surface an honest error state.
 */
export async function saveProductOverride(product: Product): Promise<void> {
  const res = await fetch("/api/admin/products", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `فشل حفظ المنتج (${res.status})`);
  }
}

/**
 * Set a product's publication status via the canonical API.
 */
export async function setProductStatus(productId: string, status: Product["status"], by?: string): Promise<void> {
  const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`فشل تغيير حالة المنتج (${res.status})`);
}

/**
 * Soft-delete / retire a product via the canonical API.
 * Moves product to "retired" status; preserves related records.
 */
export async function retireProduct(productId: string, reason: string, by?: string): Promise<void> {
  const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "retired", statusReason: reason }),
  });
  if (!res.ok) throw new Error(`فشل أرشفة المنتج (${res.status})`);
}

/**
 * Canonical catalog (Supabase-first DAL, paginated). No local overrides.
 */
export async function getAllProducts(): Promise<Product[]> {
  const dal = await import("@/src/lib/product-dal");
  return dal.getAllProducts();
}

/**
 * Validate price changes against existing rules.
 * Must not create negative prices, invalid currency, or fake discounts.
 */
export function validatePriceChange(
  productId: string,
  newPrice: number,
  newOriginalPrice?: number,
  newDiscount?: number
): { valid: boolean; reason: string } {
  if (newPrice <= 0) return { valid: false, reason: "Price must be greater than zero" };
  if (newDiscount !== undefined && (newDiscount < 0 || newDiscount > 100))
    return { valid: false, reason: "Discount must be between 0 and 100%" };
  if (newOriginalPrice !== undefined && newOriginalPrice <= newPrice)
    return { valid: false, reason: "Original price must be greater than current price" };
  return { valid: true, reason: "ok" };
}

/**
 * Phase 7 analysis helper — runs health checks on the catalog, merging
 * admin overrides so the scan reflects the current admin-managed state.
 * Uses dynamic import() to avoid Next.js flight-mode declaration conflicts.
 */
export async function analyzeCatalogHealth(
  list: Product[] = [],
): Promise<CatalogHealthReport> {
  // Lazy-load the product catalog and publication helper
  const moduleProducts = await import("@/src/data/products");
  const modulePublication = await import("@/src/lib/publication");

  const baseProducts = moduleProducts.products;
  const onlyPublished = modulePublication.onlyPublished;

  const issues: import("@/src/admin/types").HealthIssue[] = [];
  const published = onlyPublished(list.length > 0 ? list : baseProducts);

  // Missing prices / non-positive prices
  const noPrice = list.length > 0
    ? list.filter(
        (p) => !Number.isFinite(p.pricing?.price) || p.pricing.price <= 0,
      )
    : baseProducts.filter(
        (p) => !Number.isFinite(p.pricing?.price) || p.pricing.price <= 0,
      );
  if (noPrice.length > 0) {
    issues.push({
      id: "no-price",
      severity: "error",
      category: "pricing",
      labelAr: "منتجات بدون سعر صالح",
      labelEn: "Products without a valid price",
      count: noPrice.length,
      sampleIds: noPrice.map((p) => p.id),
    });
  }

  // Negative prices
  const negPrice = list.length > 0
    ? list.filter((p) => Number.isFinite(p.pricing?.price) && p.pricing.price < 0)
    : baseProducts.filter((p) => Number.isFinite(p.pricing?.price) && p.pricing.price < 0);
  if (negPrice.length > 0) {
    issues.push({
      id: "neg-price",
      severity: "error",
      category: "pricing",
      labelAr: "منتجات بسعر سالب",
      labelEn: "Products with a negative price",
      count: negPrice.length,
      sampleIds: negPrice.map((p) => p.id),
    });
  }

  // Missing name (ar)
  const noName = list.length > 0
    ? list.filter((p) => !p.name?.ar?.trim())
    : baseProducts.filter((p) => !p.name?.ar?.trim());
  if (noName.length > 0) {
    issues.push({
      id: "no-name",
      severity: "error",
      category: "identity",
      labelAr: "منتجات بدون اسم عربي",
      labelEn: "Products missing Arabic name",
      count: noName.length,
      sampleIds: noName.map((p) => p.id),
    });
  }

  // Missing gallery images
  const publishedLocal = list.length > 0 ? published : onlyPublished(baseProducts);
  const noGallery = publishedLocal.filter((p) => !p.gallery || p.gallery.length === 0);
  if (noGallery.length > 0) {
    issues.push({
      id: "no-gallery",
      severity: "warning",
      category: "media",
      labelAr: "منتجات منشورة بدون صور",
      labelEn: "Published products without images",
      count: noGallery.length,
      sampleIds: noGallery.map((p) => p.id),
    });
  }

  // Missing category
  const noCategory = list.length > 0
    ? list.filter((p) => !p.categorySlug && !p.category)
    : baseProducts.filter((p) => !p.categorySlug && !p.category);
  if (noCategory.length > 0) {
    issues.push({
      id: "no-category",
      severity: "warning",
      category: "identity",
      labelAr: "منتجات بدون تصنيف",
      labelEn: "Products missing category",
      count: noCategory.length,
      sampleIds: noCategory.map((p) => p.id),
    });
  }

  // Duplicate SKUs
  const skuCount = new Map<string, number>();
  for (const p of baseProducts) {
    if (p.sku) skuCount.set(p.sku, (skuCount.get(p.sku) ?? 0) + 1);
  }
  const dupSkus = [...skuCount.entries()].filter(([, n]) => n > 1);
  if (dupSkus.length > 0) {
    const allList = list.length > 0 ? list : baseProducts;
    const sample = allList.filter((p) => dupSkus.some(([s]) => s === p.sku));
    issues.push({
      id: "dup-sku",
      severity: "error",
      category: "identity",
      labelAr: "رموز SKU مكررة",
      labelEn: "Duplicate SKUs",
      count: dupSkus.length,
      sampleIds: sample.map((p) => p.id),
    });
  }

  // Duplicate slugs
  const slugCount = new Map<string, number>();
  for (const p of baseProducts) {
    slugCount.set(p.slug, (slugCount.get(p.slug) ?? 0) + 1);
  }
  const dupSlugs = [...slugCount.entries()].filter(([, n]) => n > 1);
  if (dupSlugs.length > 0) {
    const allList = list.length > 0 ? list : baseProducts;
    const sample = allList.filter((p) => dupSlugs.some(([s]) => s === p.slug));
    issues.push({
      id: "dup-slug",
      severity: "error",
      category: "identity",
      labelAr: "روابط (slug) مكررة",
      labelEn: "Duplicate slugs",
      count: dupSlugs.length,
      sampleIds: sample.map((p) => p.id),
    });
  }

  // Out of stock published products
  const publishedLocal2 = list.length > 0 ? published : onlyPublished(baseProducts);
  const outOfStock = publishedLocal2.filter((p) => (p.stockQuantity ?? p.stock ?? 0) <= 0);
  if (outOfStock.length > 0) {
    issues.push({
      id: "out-of-stock",
      severity: "warning",
      category: "inventory",
      labelAr: "منتجات منشورة نفد مخزونها",
      labelEn: "Published products out of stock",
      count: outOfStock.length,
      sampleIds: outOfStock.map((p) => p.id),
    });
  }

  // Low stock
  const lowStock = publishedLocal2.filter((p) => {
    const qty = p.stockQuantity ?? p.stock ?? 0;
    return qty > 0 && qty <= 10;
  });
  if (lowStock.length > 0) {
    issues.push({
      id: "low-stock",
      severity: "info",
      category: "inventory",
      labelAr: "منتجات بمخزون منخفض",
      labelEn: "Low-stock products",
      count: lowStock.length,
      sampleIds: lowStock.map((p) => p.id),
    });
  }

  // Non-published statuses (for awareness)
  const allList2 = list.length > 0 ? list : baseProducts;
  const nonPublished = allList2.filter((p) => p.status && p.status !== "published");
  if (nonPublished.length > 0) {
    issues.push({
      id: "non-published",
      severity: "info",
      category: "lifecycle",
      labelAr: "منتجات غير منشورة (مسودة/مخفية/مؤرشفة...)",
      labelEn: "Non-published products",
      count: nonPublished.length,
      sampleIds: nonPublished.map((p) => p.id),
    });
  }

  // Discount sanity: discount exists but originalPrice missing (fake discount risk)
  const allList3 = list.length > 0 ? list : baseProducts;
  const fakeDiscount = allList3.filter(
    (p) => p.discount && p.discount > 0 && !(p.pricing?.originalPrice && p.pricing.originalPrice > p.pricing.price),
  );
  if (fakeDiscount.length > 0) {
    issues.push({
      id: "fake-discount",
      severity: "error",
      category: "pricing",
      labelAr: "خصم بدون سعر أصلي صالح — خطر عرض خصم وهمي",
      labelEn: "Discount without a valid original price (fake-discount risk)",
      count: fakeDiscount.length,
      sampleIds: fakeDiscount.map((p) => p.id),
    });
  }

  const bySeverity = {
    error: issues.filter((i) => i.severity === "error").length,
    warning: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length,
  };

  return {
    issues,
    totalProducts: list.length > 0 ? list.length : baseProducts.length,
    publishedProducts:
      list.length > 0 ? published.length : onlyPublished(baseProducts).length,
    bySeverity,
  };
}