"use client";

import { useCommerceOverlay } from "@/src/lib/commerce-overlay";
import type { ProductSummary } from "@/src/types/product";

/**
 * Price block rendered from canonical commerce data with static fallback.
 * Used wherever prices are shown outside ProductCard (wishlist, search...).
 */
export default function CommercePrice({
  product,
  className = "text-sm font-bold text-foreground",
  originalClassName = "text-xs text-muted line-through",
  currency = "ر.ي",
}: {
  product: Pick<ProductSummary, "slug" | "pricing" | "discount">;
  className?: string;
  originalClassName?: string;
  currency?: string;
}) {
  const commerce = useCommerceOverlay(product.slug);
  const displayPrice = commerce?.price ?? product.pricing.price;
  const displayOriginalPrice = commerce?.originalPrice ?? product.pricing.originalPrice;
  const displayDiscount = commerce ? commerce.discount : product.discount;

  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={className}>
        {displayPrice.toLocaleString("ar-YE")} {currency}
      </span>
      {displayDiscount && displayOriginalPrice && (
        <span className={originalClassName}>
          {displayOriginalPrice.toLocaleString("ar-YE")} {currency}
        </span>
      )}
    </span>
  );
}
