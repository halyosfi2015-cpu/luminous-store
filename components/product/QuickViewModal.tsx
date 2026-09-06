"use client";

import { useState } from "react";
import Link from "next/link";
import { X, ShoppingCart, Star, Eye, Plus, Minus, ChevronLeft } from "lucide-react";
import { toAvailability } from "@/src/lib/commerce-overlay";
import type { ProductSummary } from "@/src/types/product";
import ProductImage from "@/components/product/ProductImage";
import ProductBadges from "@/components/product/ProductBadges";
import { useCart } from "@/context/CartContext";
import { useLang } from "@/lib/use-lang";
import { safeRatingDisplay, safeReviewCountDisplay } from "@/lib/ratings";
import { useAdminToast } from "@/components/admin/ui/AdminToast";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

type QuickViewModalProps = {
  product: ProductSummary;
  onClose: () => void;
  /** When true, the Add to Cart button is disabled — used inside bundles */
  disableCart?: boolean;
};

export default function QuickViewModal({ product, onClose, disableCart }: QuickViewModalProps) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { addItem } = useCart();
  const { toast } = useAdminToast();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const rating = safeRatingDisplay(product);
  const reviewCount = safeReviewCountDisplay(product);
  const fullStars = Math.floor(rating);
  const productName = isAr ? product.name.ar : product.name.en;
  const productBrand = isAr ? product.brandAr || product.brand : product.brand;
  const currencySymbol = isAr ? "ر.ي" : "YER";
  // Availability Display is admin-controlled (in_stock tri-state) — never derived from stock.
  const availability = toAvailability(product.inStock);
  const inStock = availability !== "out_of_stock" && product.stock > 0;

  const handleAdd = () => {
    if (!inStock) return;
    for (let i = 0; i < quantity; i++) {
      addItem({
        productId: product.id,
        slug: product.slug,
        name: product.name.en,
        nameAr: product.name.ar,
        price: product.pricing.price,
        image: product.gallery[0],
        quantity: 1,
        inStock,
      });
    }
    toast(isAr ? "تمت إضافة المنتج إلى السلة" : "Product added to cart");
    setAdded(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "megaMenuFadeIn 0.25s ease-out" }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-md transition-all hover:bg-white hover:text-gray-900"
        >
          <X size={18} />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          {/* Image */}
          <div className="relative flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            {product.gallery[0] ? (
              <ProductImage
                src={product.gallery[0]}
                alt={productName}
                productId={product.id}
                className="h-64 w-64 object-contain sm:h-80 sm:w-80"
                sizes="(max-width: 640px) 100vw, 50vw"
                pedestal={false}
              />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center sm:h-80 sm:w-80">
                <span className="text-6xl">🧴</span>
              </div>
            )}
            {product.discount && (
              <span className="absolute start-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                -{product.discount}%
              </span>
            )}
            <ProductBadges product={product} position="end-4 top-4" />
          </div>

          {/* Info */}
          <div className="flex flex-col gap-4 p-6">
            <div>
              <p className="text-xs font-semibold text-primary">{productBrand}</p>
              <h2 className="mt-1 text-lg font-bold text-gray-900 line-clamp-2">{productName}</h2>
            </div>

            {/* Rating */}
            {rating > 0 && reviewCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < fullStars ? "fill-amber-400 text-amber-400" : "text-gray-200"}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">({rating})</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400">{reviewCount} {isAr ? "تقييم" : "reviews"}</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-gray-900">
                {formatPrice(product.pricing.price)} {currencySymbol}
              </span>
              {product.discount && product.pricing.originalPrice && (
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(product.pricing.originalPrice)} {currencySymbol}
                </span>
              )}
            </div>

            {/* Availability — hidden shows nothing */}
            {availability !== "hidden" && (
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  availability === "available" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${availability === "available" ? "bg-emerald-500" : "bg-red-500"}`} />
                  {availability === "available" ? (isAr ? "متوفر" : "In Stock") : (isAr ? "خلصت الكمية" : "Out of Stock")}
                </span>
              </div>
            )}

            {/* Quantity */}
            {inStock && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">{isAr ? "الكمية" : "Quantity"}</span>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-gray-900">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-auto flex flex-col gap-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!inStock || disableCart}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white shadow-lg shadow-[#25D366]/30 transition-all hover:bg-[#1ebe5b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingCart size={16} />
                {disableCart
                  ? (isAr ? "أضيفي الباقة كاملة من الأسفل" : "Add Full Bundle Below")
                  : added
                    ? (isAr ? "تمت الإضافة ✓" : "Added ✓")
                    : (isAr ? "إضافة للسلة" : "Add to Cart")}
              </button>
              <Link
                href={`/products/${product.slug}`}
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 transition-all hover:border-primary hover:text-primary active:scale-[0.98]"
              >
                <Eye size={16} />
                {isAr ? "عرض المنتج بالكامل" : "View Full Product"}
                <ChevronLeft size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
