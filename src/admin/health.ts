import type { Product } from "@/src/types/product";
import type { HealthIssue } from "./types";
import { products } from "@/src/data/products";
import { onlyPublished } from "@/src/lib/publication";

/**
 * Catalog health analysis. Runs over the FULL master catalog and reports
 * data-quality issues surfaced in the Admin Catalog Health Center. Purely
 * rule-based — never invents analytics or sales facts.
 */

export type CatalogHealthReport = {
  issues: HealthIssue[];
  totalProducts: number;
  publishedProducts: number;
  bySeverity: { error: number; warning: number; info: number };
};

function issue(
  id: string,
  severity: HealthIssue["severity"],
  category: string,
  labelAr: string,
  labelEn: string,
  count: number,
  sampleIds: string[] = [],
): HealthIssue {
  return { id, severity, category, labelAr, labelEn, count, sampleIds: sampleIds.slice(0, 20) };
}

export function analyzeCatalogHealth(list: Product[] = products): CatalogHealthReport {
  const issues: HealthIssue[] = [];
  const published = onlyPublished(list);

  // Missing prices / non-positive prices
  const noPrice = list.filter((p) => !Number.isFinite(p.pricing?.price) || p.pricing.price <= 0);
  if (noPrice.length > 0) {
    issues.push(
      issue(
        "no-price",
        "error",
        "pricing",
        "منتجات بدون سعر صالح",
        "Products without a valid price",
        noPrice.length,
        noPrice.map((p) => p.id),
      ),
    );
  }

  // Negative prices
  const negPrice = list.filter((p) => Number.isFinite(p.pricing?.price) && p.pricing.price < 0);
  if (negPrice.length > 0) {
    issues.push(
      issue(
        "neg-price",
        "error",
        "pricing",
        "منتجات بسعر سالب",
        "Products with a negative price",
        negPrice.length,
        negPrice.map((p) => p.id),
      ),
    );
  }

  // Missing name (ar)
  const noName = list.filter((p) => !p.name?.ar?.trim());
  if (noName.length > 0) {
    issues.push(
      issue(
        "no-name",
        "error",
        "identity",
        "منتجات بدون اسم عربي",
        "Products missing Arabic name",
        noName.length,
        noName.map((p) => p.id),
      ),
    );
  }

  // Missing gallery images
  const noGallery = published.filter((p) => !p.gallery || p.gallery.length === 0);
  if (noGallery.length > 0) {
    issues.push(
      issue(
        "no-gallery",
        "warning",
        "media",
        "منتجات منشورة بدون صور",
        "Published products without images",
        noGallery.length,
        noGallery.map((p) => p.id),
      ),
    );
  }

  // Missing category
  const noCategory = list.filter((p) => !p.categorySlug && !p.category);
  if (noCategory.length > 0) {
    issues.push(
      issue(
        "no-category",
        "warning",
        "identity",
        "منتجات بدون تصنيف",
        "Products missing category",
        noCategory.length,
        noCategory.map((p) => p.id),
      ),
    );
  }

  // Duplicate SKUs
  const skuCount = new Map<string, number>();
  for (const p of list) {
    if (p.sku) skuCount.set(p.sku, (skuCount.get(p.sku) ?? 0) + 1);
  }
  const dupSkus = [...skuCount.entries()].filter(([, n]) => n > 1);
  if (dupSkus.length > 0) {
    const sample = list.filter((p) => dupSkus.some(([s]) => s === p.sku));
    issues.push(
      issue(
        "dup-sku",
        "error",
        "identity",
        "رموز SKU مكررة",
        "Duplicate SKUs",
        dupSkus.length,
        sample.map((p) => p.id),
      ),
    );
  }

  // Duplicate slugs
  const slugCount = new Map<string, number>();
  for (const p of list) {
    slugCount.set(p.slug, (slugCount.get(p.slug) ?? 0) + 1);
  }
  const dupSlugs = [...slugCount.entries()].filter(([, n]) => n > 1);
  if (dupSlugs.length > 0) {
    const sample = list.filter((p) => dupSlugs.some(([s]) => s === p.slug));
    issues.push(
      issue(
        "dup-slug",
        "error",
        "identity",
        "روابط (slug) مكررة",
        "Duplicate slugs",
        dupSlugs.length,
        sample.map((p) => p.id),
      ),
    );
  }

  // Out of stock published products
  const outOfStock = published.filter((p) => (p.stockQuantity ?? p.stock ?? 0) <= 0);
  if (outOfStock.length > 0) {
    issues.push(
      issue(
        "out-of-stock",
        "warning",
        "inventory",
        "منتجات منشورة نفد مخزونها",
        "Published products out of stock",
        outOfStock.length,
        outOfStock.map((p) => p.id),
      ),
    );
  }

  // Low stock
  const lowStock = published.filter((p) => {
    const qty = p.stockQuantity ?? p.stock ?? 0;
    return qty > 0 && qty <= 10;
  });
  if (lowStock.length > 0) {
    issues.push(
      issue(
        "low-stock",
        "info",
        "inventory",
        "منتجات بمخزون منخفض",
        "Low-stock products",
        lowStock.length,
        lowStock.map((p) => p.id),
      ),
    );
  }

  // Non-published statuses (for awareness)
  const nonPublished = list.filter((p) => p.status && p.status !== "published");
  if (nonPublished.length > 0) {
    issues.push(
      issue(
        "non-published",
        "info",
        "lifecycle",
        "منتجات غير منشورة (مسودة/مخفية/مؤرشفة...)",
        "Non-published products",
        nonPublished.length,
        nonPublished.map((p) => p.id),
      ),
    );
  }

  // Discount sanity: discount exists but originalPrice missing (fake discount risk)
  const fakeDiscount = list.filter(
    (p) => p.discount && p.discount > 0 && !(p.pricing?.originalPrice && p.pricing.originalPrice > p.pricing.price),
  );
  if (fakeDiscount.length > 0) {
    issues.push(
      issue(
        "fake-discount",
        "error",
        "pricing",
        "خصم بدون سعر أصلي صالح — خطر عرض خصم وهمي",
        "Discount without a valid original price (fake-discount risk)",
        fakeDiscount.length,
        fakeDiscount.map((p) => p.id),
      ),
    );
  }

  const bySeverity = {
    error: issues.filter((i) => i.severity === "error").length,
    warning: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length,
  };

  return {
    issues,
    totalProducts: list.length,
    publishedProducts: published.length,
    bySeverity,
  };
}
