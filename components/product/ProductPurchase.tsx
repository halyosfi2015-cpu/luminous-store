"use client";

import { useState } from "react";
import { Heart, ShoppingCart, ShieldCheck, Truck, Headphones, Minus, Plus, Scale } from "lucide-react";
import Button from "@/components/ui/Button";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCompare } from "@/context/CompareContext";
import type { Product } from "@/types/product";

type ProductPurchaseProps = {
  product: Product;
};

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

export default function ProductPurchase({ product }: ProductPurchaseProps) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { toggle: toggleWishlist, isWishlisted } = useWishlist();
  const { toggle: toggleCompare, isCompared } = useCompare();

  const decrement = () => setQuantity((q) => Math.max(1, q - 1));
  const increment = () => setQuantity((q) => q + 1);

  const wishlisted = isWishlisted(product.id);
  const compared = isCompared(product.id);

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name.en,
      nameAr: product.name.ar,
      price: product.pricing.price,
      image: product.gallery[0],
      quantity,
      inStock: product.stock > 0,
    });
  };

  return (
    <div className="flex flex-col gap-5 rounded-card border border-border bg-card p-5 sm:p-6 shadow-card">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-3xl font-bold text-foreground">
            {formatPrice(product.pricing.price * quantity)} ر.ي
          </span>
          {product.pricing.originalPrice && (
            <>
              <span className="text-lg text-muted line-through">
                {formatPrice(product.pricing.originalPrice * quantity)} ر.ي
              </span>
              {product.discount && (
                <span className="rounded-full bg-error-soft px-2.5 py-0.5 text-xs font-semibold text-error-fg border border-error-border">
                  -{product.discount}%
                </span>
              )}
            </>
          )}
        </div>
        {product.pricing.originalPrice && (
          <p className="text-xs text-muted">
            وفر {formatPrice((product.pricing.originalPrice - product.pricing.price) * quantity)} ر.ي
          </p>
        )}
        {!product.stock && (
          <div className="flex items-center gap-2 text-sm text-error-fg bg-error-soft px-3 py-2 rounded-lg border border-error-border">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            نفدت الكمية حالياً
          </div>
        )}
        {product.stock > 0 && (
          <div className="flex items-center gap-2 text-xs text-success-fg">
            <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
            متوفر في المخزون
            {product.stock <= 5 && (
              <span className="text-warning-fg">(آخر {product.stock} قطع)</span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center rounded-button border border-border bg-card">
          <button
            type="button"
            aria-label="إنقاص الكمية"
            onClick={decrement}
            disabled={quantity <= 1}
            className="flex h-11 w-11 items-center justify-center text-muted transition-colors hover:bg-muted-bg hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed rounded-ee-button rounded-se-button"
          >
            <Minus size={16} />
          </button>
          <span className="flex h-11 w-14 items-center justify-center text-sm font-semibold text-foreground tabular-nums border-x border-border">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="زيادة الكمية"
            onClick={increment}
            className="flex h-11 w-11 items-center justify-center text-muted transition-colors hover:bg-muted-bg hover:text-foreground rounded-es-button rounded-ss-button"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            aria-label={wishlisted ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
            onClick={() => toggleWishlist(product.id)}
            className={`flex h-11 w-11 items-center justify-center rounded-button border transition-all duration-200 ${
              wishlisted
                ? "border-secondary-200 bg-secondary-50 text-secondary-500 shadow-card"
                : "border-border text-muted hover:border-secondary-200 hover:bg-secondary-50 hover:text-secondary-500"
            }`}
          >
            <Heart size={20} fill={wishlisted ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            aria-label={compared ? "إزالة من المقارنة" : "إضافة إلى المقارنة"}
            onClick={() => toggleCompare(product.id)}
            className={`flex h-11 w-11 items-center justify-center rounded-button border transition-all duration-200 ${
              compared
                ? "border-primary/20 bg-primary/5 text-primary shadow-card"
                : "border-border text-muted hover:border-primary/20 hover:bg-primary/5 hover:text-primary"
            }`}
          >
            <Scale size={20} />
          </button>
        </div>
      </div>

      <Button
        variant="primary"
        className="w-full gap-2 py-3.5 text-base"
        onClick={handleAddToCart}
        disabled={product.stock === 0}
      >
        <ShoppingCart size={20} />
        {product.stock > 0 ? "أضف إلى السلة" : "غير متوفر"}
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="flex items-center gap-2.5 rounded-lg bg-muted-bg/60 px-3 py-2.5 border border-border">
          <ShieldCheck size={16} className="shrink-0 text-success-fg" />
          <span className="text-xs text-muted">منتج أصلي 100%</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg bg-muted-bg/60 px-3 py-2.5 border border-border">
          <Truck size={16} className="shrink-0 text-primary" />
          <span className="text-xs text-muted">شحن لجميع المحافظات</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg bg-muted-bg/60 px-3 py-2.5 border border-border">
          <Headphones size={16} className="shrink-0 text-primary" />
          <span className="text-xs text-muted">دعم العملاء 24/7</span>
        </div>
      </div>
    </div>
  );
}
