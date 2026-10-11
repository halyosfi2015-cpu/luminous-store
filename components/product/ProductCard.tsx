"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingCart, Star, Flame, Check } from "lucide-react";
import type { ProductSummary } from "@/src/types/product";
import Button from "@/components/ui/Button";
import ProductImage from "@/components/product/ProductImage";
import ProductBadges from "@/components/product/ProductBadges";
import { useCart } from "@/context/CartContext";

import { useLang } from "@/lib/use-lang";
import { safeRatingDisplay, safeReviewCountDisplay, safeBuyersDisplay } from "@/lib/ratings";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { useCommerceOverlay, toAvailability } from "@/src/lib/commerce-overlay";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

type ProductCardProps = {
  product: ProductSummary;
  /** When true, the Add to Cart button is shown but disabled — used inside bundles where only the bundle can be added */
  disableCart?: boolean;
  /** Hide the corner product badge (used where the section already shows its own badges) */
  hideBadges?: boolean;
};

export default function ProductCard({ product, disableCart, hideBadges }: ProductCardProps) {
  const rating = safeRatingDisplay(product);
  const reviewCount = safeReviewCountDisplay(product);
  const buyers = safeBuyersDisplay(product);
  const fullStars = Math.floor(rating);
  const { addItem } = useCart();
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { toast } = useAdminToast();
  const [justAdded, setJustAdded] = useState(false);
  const addedTimer = useRef<number | null>(null);

  // Canonical commerce overlay — price/discount/stock/active from the DB.
  // Falls back to bundled summary values until/unless the API responds.
  const commerce = useCommerceOverlay(product.slug);
  const displayPrice = commerce?.price ?? product.pricing.price;
  const displayOriginalPrice = commerce?.originalPrice ?? product.pricing.originalPrice;
  const displayDiscount = commerce ? commerce.discount : product.discount;
  // Availability Display is admin-controlled (in_stock) — never derived from stockQuantity.
  const availability = commerce?.availability ?? toAvailability(product.inStock);
  // Cart safety guard still respects canonical active/stock; checkout re-validates server-side.
  const outOfStock = availability === "out_of_stock" || (commerce ? !commerce.active || commerce.stockQuantity <= 0 : product.stock === 0);

  const handleAddToCart = () => {
    if (outOfStock) {
      toast(isAr ? "المخزون منتهي" : "Out of stock");
      return;
    }
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name.en,
      nameAr: product.name.ar,
      price: displayPrice,
      image: product.gallery[0],
      quantity: 1,
      inStock: !outOfStock,
    });
    toast(isAr ? "تمت إضافة المنتج إلى السلة" : "Product added to cart");
    setJustAdded(true);
    if (addedTimer.current) window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setJustAdded(false), 1400);
  };

  useEffect(() => () => { if (addedTimer.current) window.clearTimeout(addedTimer.current); }, []);

  const productName = isAr ? product.name.ar : product.name.en;
  const productBrand = isAr ? product.brandAr || product.brand : product.brand;
  const currencySymbol = isAr ? "ر.ي" : "YER";

  return (
    <div className="magic-card-glow group relative flex min-h-full flex-1 flex-col gap-1.5 rounded-card border border-border bg-card p-3 sm:p-2.5 shadow-card min-w-0 transition-all duration-300 ease-out hover:shadow-card-hover hover:-translate-y-1 active:scale-[0.99]">
      <Link href={`/products/${product.slug}`} className="magic-autoshine luminous-shine relative block aspect-square w-full overflow-hidden rounded-lg bg-muted-bg">
        {displayDiscount && (
          <span className="luminous-glow-pulse absolute start-2 top-2 rounded-full bg-error px-2 py-0.5 text-[10px] font-semibold text-white z-10 shadow-card max-w-[45%] truncate sm:text-[11px] sm:px-2.5">
            -{displayDiscount}%
          </span>
        )}
        {!hideBadges && <ProductBadges product={product} />}
        {product.gallery[0] ? (
          <ProductImage
            src={product.gallery[0]}
            alt={productName}
            productId={product.id}
            className="h-full w-full"
            sizes="(max-width: 640px) 50vw, 25vw"
            pedestal
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
            <span className="text-3xl">🧴</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-black/5" />
      </Link>
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-xs font-medium text-primary truncate sm:text-[11px]">{productBrand}</p>
        <Link href={`/products/${product.slug}`}>
          <p className="text-[13px] font-medium text-foreground line-clamp-2 min-h-[2.5rem] leading-snug break-words transition-colors hover:text-primary sm:text-sm sm:min-h-[2.5rem]">
            {productName}
          </p>
        </Link>
        <div className="flex min-h-[16px] items-center gap-1">
          {rating > 0 && reviewCount > 0 ? (
            <>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={11}
                    className={i < fullStars ? "fill-accent text-accent" : "text-border-strong"}
                  />
                ))}
              </div>
              <span className="text-[11px] text-muted">({rating})</span>
            </>
          ) : buyers >= 20 ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600">
              <Flame size={11} className="fill-orange-100" />
              {isAr ? `+${buyers} طلب` : `+${buyers} orders`}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0">
          <span className="text-[15px] font-extrabold tabular-nums text-foreground whitespace-nowrap sm:text-sm">
            {formatPrice(displayPrice)} {currencySymbol}
          </span>
          {displayDiscount && displayOriginalPrice && (
            <span className="text-xs text-muted line-through truncate max-w-full">
              {formatPrice(displayOriginalPrice)} {currencySymbol}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 max-sm:hidden">
        <Button variant="primary" className={`min-w-0 w-full gap-1 px-1 text-[11px] whitespace-nowrap min-h-[40px] transition-all active:scale-95 sm:text-[13px] sm:px-3 [&_svg]:shrink-0 ${justAdded ? "bg-emerald-600!" : ""}`} onClick={handleAddToCart} disabled={outOfStock || disableCart}>
          {justAdded ? (
            <Check size={14} />
          ) : (
            <ShoppingCart size={13} />
          )}
          {justAdded
            ? (isAr ? "تمت الإضافة ✓" : "Added ✓")
            : disableCart ? (isAr ? "أضيفي الباقة كاملة" : "Add Full Bundle") : outOfStock ? (isAr ? "نفد من المخزون" : "Out of Stock") : (isAr ? "إضافة للسلة" : "Add to Cart")}
        </Button>
      </div>
    </div>
  );
}
