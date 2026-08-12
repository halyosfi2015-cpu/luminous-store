"use client";

import { useRef, useCallback } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import ProductCard from "@/components/product/ProductCard";
import { productSummaries } from "@/src/data/product-summaries";
import { useLang } from "@/lib/use-lang";
import type { ProductSummary } from "@/src/types/product";

function getFeaturedProducts(): ProductSummary[] {
  return productSummaries.filter((p) => p.isFeatured);
}

function getBestSellers(): ProductSummary[] {
  return productSummaries.filter((p) => p.isBestSeller);
}

function MarqueeStrip({
  items,
  duration,
  ariaLabel,
}: {
  items: ProductSummary[];
  duration: string;
  ariaLabel: string;
}) {
  const marqueeRef = useRef<HTMLDivElement | null>(null);

  const pause = useCallback(() => {
    if (marqueeRef.current) marqueeRef.current.style.animationPlayState = "paused";
  }, []);
  const resume = useCallback(() => {
    if (marqueeRef.current) marqueeRef.current.style.animationPlayState = "running";
  }, []);

  if (items.length === 0) return null;
  const looped = [...items, ...items, ...items];

  return (
    <div className="relative group/carousel" onMouseEnter={pause} onMouseLeave={resume}>
      <div className="relative overflow-hidden py-2" dir="ltr">
        <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-10 bg-gradient-to-r from-card to-transparent sm:w-16" />
        <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-10 bg-gradient-to-l from-card to-transparent sm:w-16" />

        <div
          ref={marqueeRef}
          role="region"
          aria-label={ariaLabel}
          className="flex w-max gap-4 animate-marquee group-hover/carousel:[animation-play-state:paused]"
          style={{ animationDuration: duration }}
        >
          {looped.map((product, i) => (
            <div key={`${product.id}-${i}`} className="w-56 shrink-0 sm:w-60">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Products() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  const featured = getFeaturedProducts();
  const bestSellers = getBestSellers();

  return (
    <>
      <section className="w-full bg-gradient-to-b from-card via-secondary-50/40 to-card py-8 sm:py-10 lg:py-12">
        <Container>
          <SectionTitle
            eyebrow={isAr ? "تشكيلة مختارة" : "Curated Selection"}
            title={isAr ? "منتجاتنا المميزة" : "Featured Products"}
            subtitle={
              isAr
                ? "اختاري من مجموعتنا المختارة بعناية لعناية متكاملة ببشرتك"
                : "Choose from our carefully curated collection for complete skincare"
            }
            action={
              <Link
                href="/products"
                className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
              >
                {isAr ? "عرض الكل" : "View All"}
              </Link>
            }
          />
          <MarqueeStrip items={featured} duration="70s" ariaLabel={isAr ? "المنتجات المميزة" : "Featured products"} />
        </Container>
      </section>

      <section className="w-full bg-gradient-to-b from-card via-primary-50/30 to-card py-8 sm:py-10 lg:py-12">
        <Container>
          <SectionTitle
            eyebrow={isAr ? "الأكثر طلباً" : "Most Requested"}
            title={isAr ? "المفضلة لدى عملائنا" : "Customer Favorites"}
            subtitle={
              isAr
                ? "المنتجات الأكثر شعبية بين عملائنا في كل فئة"
                : "The most popular products across all categories"
            }
            action={
              <Link
                href="/products"
                className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
              >
                {isAr ? "عرض الكل" : "View All"}
              </Link>
            }
          />
          <MarqueeStrip items={bestSellers} duration="80s" ariaLabel={isAr ? "الأكثر مبيعاً" : "Best sellers"} />
        </Container>
      </section>
    </>
  );
}
