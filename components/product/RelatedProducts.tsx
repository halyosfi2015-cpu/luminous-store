"use client"

import Link from "next/link";
import { ShoppingCart, Star } from "lucide-react";
import ProductImage from "@/components/product/ProductImage";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SectionTitle from "@/components/ui/SectionTitle";
import type { ProductSummary } from "@/src/types/product";
import { safeRatingDisplay } from "@/lib/ratings";
import { useEffect } from "react";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";
import { useCart } from "@/context/CartContext";

type RelatedProductsProps = {
  products: ProductSummary[];
};

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

export default function RelatedProducts({ products }: RelatedProductsProps) {
  const recommendationType = "similar" as const;
  const { addItem } = useCart();

  const handleAddToCart = (product: ProductSummary) => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name.en,
      nameAr: product.name.ar,
      price: product.pricing.price,
      image: product.gallery[0],
      quantity: 1,
      inStock: product.stock > 0,
    });
  };

  useEffect(() => {
    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.RECOMMENDATION_IMPRESSION,
      properties: {
        type: recommendationType,
        product_ids: products.map((p) => p.id),
        count: products.length,
      },
    });
  }, [products]);

  if (products.length === 0) return null;

  const handleRecommendationClick = (productId: string, index: number) => {
    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.RECOMMENDATION_CLICK,
      entity_type: "product",
      entity_id: productId,
      properties: {
        type: recommendationType,
        position: index + 1,
        source: "related_products",
      },
    });
  };

  return (
    <section className="mt-12">
      <SectionTitle
        title="قد يعجبك أيضاً"
        subtitle="You May Also Like"
        align="center"
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product, index) => (
          <Card key={product.id} hover padding="sm" className="flex flex-col gap-3 group">
            <Link
              href={`/products/${product.slug}`}
              onClick={() => handleRecommendationClick(product.id, index)}
              className="relative aspect-square w-full rounded-xl bg-muted-bg overflow-hidden"
            >
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
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-medium text-primary">{product.brand}</p>
              <Link href={`/products/${product.slug}`}>
                <p className="text-sm font-medium text-foreground line-clamp-2 transition-colors hover:text-primary">
                  {product.name.ar}
                </p>
              </Link>
              {safeRatingDisplay(product) > 0 && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={11}
                                      className={i < Math.floor(safeRatingDisplay(product)) ? "fill-accent text-accent" : "text-border-strong"}
                    />
                  ))}
                </div>
              )}
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-foreground">
                  {formatPrice(product.pricing.price)} ر.ي
                </span>
                {product.discount && product.pricing.originalPrice && (
                  <span className="text-xs text-muted line-through">
                    {formatPrice(product.pricing.originalPrice)} ر.ي
                  </span>
                )}
              </div>
            </div>
            <Button variant="outline" className="mt-auto w-full gap-1.5 text-xs" onClick={() => handleAddToCart(product)} disabled={product.stock <= 0}>
              <ShoppingCart size={13} />
              إضافة للسلة
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}
