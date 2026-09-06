import type { Product, ProductStatus } from "@/src/types/product";

/**
 * Publication lifecycle for the Luminous catalog.
 *
 * The storefront must ONLY consume products whose status is `published`
 * (or `undefined`, i.e. legacy products that predate the lifecycle and were
 * already live). Everything else — draft, hidden, archived, rejected,
 * duplicate — is excluded from the public storefront.
 *
 * These helpers are pure and work on both the server (full master) and the
 * client (slim published summaries) so the same rule drives every surface.
 */

export const PUBLISHED_STATUS: ReadonlySet<ProductStatus | undefined> = new Set([
  "published",
  undefined,
]);

/** True when a product is allowed to appear on the public storefront. */
export function isPublished(product: Pick<Product, "status">): boolean {
  return PUBLISHED_STATUS.has(product.status);
}

/** Filter an array of products down to the published subset. */
export function onlyPublished<T extends Pick<Product, "status">>(
  products: T[],
): T[] {
  return products.filter(isPublished);
}

/** Human-readable Arabic label for a product status. */
export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  published: "منشور",
  draft: "مسودة",
  hidden: "مخفي",
  archived: "مؤرشف",
  rejected: "مرفوض",
  duplicate: "مكرر",
  retired: "مقاعد",
};

/** Tailwind badge classes per status (used by the admin UI). */
export const PRODUCT_STATUS_STYLES: Record<ProductStatus, string> = {
  published: "bg-emerald-50 text-emerald-700",
  draft: "bg-gray-100 text-gray-600",
  hidden: "bg-amber-50 text-amber-700",
  archived: "bg-slate-100 text-slate-600",
  rejected: "bg-red-50 text-red-700",
  duplicate: "bg-purple-50 text-purple-700",
  retired: "bg-slate-50 text-slate-600",
};

export const ALL_PRODUCT_STATUSES: ProductStatus[] = [
  "published",
  "draft",
  "hidden",
  "archived",
  "rejected",
  "duplicate",
  "retired",
];
