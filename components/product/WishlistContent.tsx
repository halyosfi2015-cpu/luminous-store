"use client";

import { Heart, ShoppingCart, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useWishlist } from "@/context/WishlistContext";
import { products } from "@/lib/products";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import WishlistButton from "@/components/product/WishlistButton";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

export default function WishlistContent() {
  const { items, count } = useWishlist();
  const wishlisted = products.filter((p) => items.includes(p.id));

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
                  <Image
                    src={product.gallery[0]}
                    alt={product.name.ar}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
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
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={11}
                    className={i < Math.floor(product.rating) ? "fill-accent text-accent" : "text-border-strong"}
                  />
                ))}
                <span className="text-[11px] text-muted me-1">({product.reviewCount ?? product.rating})</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-foreground">
                  {formatPrice(product.pricing.price)} ر.ي
                </span>
                {product.pricing.originalPrice && (
                  <span className="text-xs text-muted line-through">
                    {formatPrice(product.pricing.originalPrice)} ر.ي
                  </span>
                )}
              </div>
            </div>
            <Button variant="outline" className="w-full gap-1.5 text-xs mt-auto">
              <ShoppingCart size={13} />
              أضف إلى السلة
            </Button>
          </Card>
        ))}
      </div>
    </Container>
  );
}
