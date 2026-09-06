"use client";

import { Heart, ShoppingCart, Star } from "lucide-react";
import Link from "next/link";
import ProductImage from "@/components/product/ProductImage";
import { safeRatingDisplay, safeReviewCountDisplay } from "@/lib/ratings";
import { useWishlist } from "@/context/WishlistContext";
import { productSummaries } from "@/src/data/product-summaries";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import WishlistButton from "@/components/product/WishlistButton";
import CommercePrice from "@/components/product/CommercePrice";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

export default function WishlistContent() {
  const { items, count } = useWishlist();
  const wishlisted = productSummaries.filter((p) => items.includes(p.id));

  if (wishlisted.length === 0) {
    return (
      <Container className="py-16">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-card bg-muted-bg mb-6">
            <Heart size={48} className="text-border-strong" />
          </div>
          <p className="text-xl font-bold text-foreground">المفضلة فارغة</p>
          <p className="mt-2 text-sm text-muted max-w-sm">
            أضيفي منتجاتك المفضلة هنا لتجديها بسهولة وسرعة
          </p>
          <Link
            href="/categories/skincare"
            className="mt-8 inline-flex items-center rounded-button bg-primary px-8 py-3 text-sm font-medium text-white shadow-card transition-all duration-200 hover:bg-primary-700 hover:shadow-card-hover active:scale-95"
          >
            تصفح المنتجات
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <SectionTitle
        title="المفضلة"
        subtitle={`${count} ${count === 1 ? "منتج" : "منتجات"}`}
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {wishlisted.map((product) => (
          <Card key={product.id} hover padding="sm" className="flex flex-col gap-3 group">
            <div className="relative aspect-square w-full rounded-xl bg-muted-bg overflow-hidden">
              <Link href={`/products/${product.slug}`}>
                {product.discount && (
                  <span className="absolute start-2 top-2 rounded-full bg-error px-2.5 py-0.5 text-[11px] font-semibold text-white z-10 shadow-card">
                    -{product.discount}%
                  </span>
                )}
                {product.gallery[0] && (
                  <ProductImage
                    src={product.gallery[0]}
                    alt={product.name.ar}
                    productId={product.id}
                    hoverZoom
                    pedestal={false}
                    className="absolute inset-0 h-full w-full"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                )}
              </Link>
              <div className="absolute end-2 top-2 z-10">
                <WishlistButton productId={product.id} iconOnly size={14} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-medium text-primary">{product.brand}</p>
              <Link href={`/products/${product.slug}`}>
               <p className="text-sm font-medium text-foreground line-clamp-2 transition-colors hover:text-primary">
                 {product.name.ar}
               </p>
              </Link>
              {safeRatingDisplay(product) > 0 && safeReviewCountDisplay(product) > 0 && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={11}
                                      className={i < Math.floor(safeRatingDisplay(product)) ? "fill-accent text-accent" : "text-border-strong"}
                    />
                  ))}
                                  <span className="text-[11px] text-muted me-1">({safeReviewCountDisplay(product)})</span>
                </div>
              )}
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <CommercePrice product={product} />
              </div>
            </div>
            <Button variant="outline" className="w-full gap-1.5 text-xs mt-auto">
              <ShoppingCart size={13} />
              إضافة للسلة
            </Button>
          </Card>
        ))}
      </div>
    </Container>
  );
}
