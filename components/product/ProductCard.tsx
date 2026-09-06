"use client";

import Link from "next/link";
import { ShoppingCart, Star, Heart } from "lucide-react";
import type { ProductSummary } from "@/src/types/product";
import Button from "@/components/ui/Button";
import ProductImage from "@/components/product/ProductImage";
import ProductBadges from "@/components/product/ProductBadges";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCompare } from "@/context/CompareContext";
import { useLang } from "@/lib/use-lang";
import { safeRatingDisplay, safeReviewCountDisplay } from "@/lib/ratings";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { useCommerceOverlay, toAvailability } from "@/src/lib/commerce-overlay";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

type ProductCardProps = {
  product: ProductSummary;
  /** When true, the Add to Cart button is shown but disabled — used inside bundles where only the bundle can be added */
  disableCart?: boolean;
};

export default function ProductCard({ product, disableCart }: ProductCardProps) {
  const rating = safeRatingDisplay(product);
  const reviewCount = safeReviewCountDisplay(product);
  const fullStars = Math.floor(rating);
  const { addItem } = useCart();
  const { toggle: toggleWishlist, isWishlisted } = useWishlist();
  const { toggle: toggleCompare, isCompared } = useCompare();
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { toast } = useAdminToast();

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
  };

  const productName = isAr ? product.name.ar : product.name.en;
  const productBrand = isAr ? product.brandAr || product.brand : product.brand;
  const currencySymbol = isAr ? "ر.ي" : "YER";

  return (
    <div className="group relative flex flex-col gap-2 rounded-card border border-border bg-card p-2.5 shadow-card transition-all duration-300 ease-out hover:shadow-card-hover hover:-translate-y-1">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square w-full overflow-hidden rounded-lg bg-muted-bg">
        {displayDiscount && (
          <span className="absolute start-2 top-2 rounded-full bg-error px-2.5 py-0.5 text-[11px] font-semibold text-white z-10 shadow-card">
            -{displayDiscount}%
          </span>
        )}
        <ProductBadges product={product} />
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
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-medium text-primary">{productBrand}</p>
        <Link href={`/products/${product.slug}`}>
          <p className="text-sm font-medium text-foreground line-clamp-1 transition-colors hover:text-primary">
            {productName}
          </p>
        </Link>
        {rating > 0 && reviewCount > 0 && (
          <div className="flex items-center gap-1">
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
          </div>
        )}
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-foreground">
            {formatPrice(displayPrice)} {currencySymbol}
          </span>
          {displayDiscount && displayOriginalPrice && (
            <span className="text-xs text-muted line-through">
              {formatPrice(displayOriginalPrice)} {currencySymbol}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Button variant="primary" className="flex-1 gap-1.5 text-xs" onClick={handleAddToCart} disabled={outOfStock || disableCart}>
          <ShoppingCart size={14} />
          {disableCart ? (isAr ? "أضيفي الباقة كاملة" : "Add Full Bundle") : outOfStock ? (isAr ? "نفد من المخزون" : "Out of Stock") : (isAr ? "إضافة للسلة" : "Add to Cart")}
        </Button>
        <button
          type="button"
          aria-label={isWishlisted(product.id) ? (isAr ? "إزالة من المفضلة" : "Remove from wishlist") : (isAr ? "أضف إلى المفضلة" : "Add to wishlist")}
          onClick={() => toggleWishlist(product.id)}
          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 ease-out-smooth active:scale-90 ${
            isWishlisted(product.id)
              ? "border-secondary-200 bg-secondary-50 text-secondary-500"
              : "border-border text-muted hover:border-secondary-200 hover:bg-secondary-50 hover:text-secondary-500"
          }`}
        >
          <Heart size={14} fill={isWishlisted(product.id) ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          aria-label={isCompared(product.id) ? (isAr ? "إزالة من المقارنة" : "Remove from comparison") : (isAr ? "أضف إلى المقارنة" : "Add to comparison")}
          onClick={() => toggleCompare(product.id)}
          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 ease-out-smooth active:scale-90 ${
            isCompared(product.id)
              ? "border-primary/20 bg-primary/5 text-primary"
              : "border-border text-muted hover:border-primary/20 hover:bg-primary/5 hover:text-primary"
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5M8 3H3v5M16 21h5v-5M8 21H3v-5M21 3l-7 7M3 3l7 7M21 21l-7-7M3 21l7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
