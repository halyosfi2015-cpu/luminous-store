"use client";


"use client";

import { useLang } from "@/lib/use-lang";

type Flagged = {
  isNew?: boolean;
  new?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  featured?: boolean;
};

/**
 * Single source of truth for product-level badges.
 * Renders wherever the product appears — section-independent.
 * Only ONE badge per product (highest priority wins):
 *   isNew        → «وصل حديثاً»   (green)
 *   isBestSeller → «الأكثر طلباً»  (amber)
 *   isFeatured   → «مميز»         (primary)
 */
export default function ProductBadges({
  product,
  position = "end-2 top-2",
  isAr: isArProp,
}: {
  product: Flagged;
  position?: string;
  /** Pass explicitly when used outside a client component (e.g. ProductInfo). */
  isAr?: boolean;
}) {
  const { lang } = useLang();
  const isAr = isArProp ?? lang === "ar";

  let label: string | null = null;
  let className: string | null = null;

  if (product.isNew || product.new) {
    label = isAr ? "وصل حديثاً" : "New";
    className = "bg-success";
  } else if (product.isBestSeller) {
    label = isAr ? "الأكثر طلباً" : "Best Seller";
    className = "bg-amber-500";
  } else if (product.isFeatured || product.featured) {
    label = isAr ? "مميز" : "Featured";
    className = "bg-primary";
  }

  if (!label || !className) return null;

  const posClass = position ? `absolute ${position}` : "";

  return (
    <span className={`${posClass} z-10 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-card ${className}`}>
      {label}
    </span>
  );
}
