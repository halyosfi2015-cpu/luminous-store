"use client";

import Link from "next/link";
import Container from "@/components/ui/Container";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import SectionTitle from "@/components/ui/SectionTitle";
import MobileReveal from "@/components/ui/MobileReveal";
import ProductCard from "@/components/product/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { useLang } from "@/lib/use-lang";
import { useSectionContent, useSiteContent } from "@/components/site-content/SiteContentProvider";
import { applySectionProductOverride } from "@/src/lib/home-content";
import type { ProductSummary } from "@/src/types/product";

function MarqueeStrip({
  items,
  ariaLabel,
}: {
  items: ProductSummary[];
  ariaLabel: string;
}) {
  if (items.length === 0) return null;

  return (
    <Container>
      <MobileReveal delay={100}>
        <HorizontalCarousel ariaLabel={ariaLabel} autoplay autoplaySpeed={4500}>
        {items.map((product) => (
          <div key={product.id} className="flex w-[calc(50dvw-24px)] min-w-[170px] max-w-[170px] shrink-0 snap-start flex-col sm:w-60 sm:max-w-none">
            <ProductCard product={product} />
          </div>
        ))}
        </HorizontalCarousel>
      </MobileReveal>
    </Container>
  );
}

export default function Products() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { products: allProducts, loading, error } = useProducts();
  const featuredContent = useSectionContent("productsFeatured");
  const bestSellersContent = useSectionContent("productsFavorites");
  const siteContent = useSiteContent();
  const featuredOverride = siteContent?.products?.productsFeatured;
  const favoritesOverride = siteContent?.products?.productsFavorites;

  if (loading) return null;
  if (error) {
    return (
      <section className="w-full py-8" style={{ background: "var(--background)" }}>
        <Container>
          <div className="text-center py-12 text-[var(--muted)]">
            <p>{isAr ? "فشل تحميل المنتجات" : "Failed to load products"}</p>
            <button onClick={() => window.location.reload()} className="mt-4 text-[var(--primary)] underline">
              {isAr ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        </Container>
      </section>
    );
  }

  // Overrides applied on top of flag selection; pinned products are also
  // resolved from the full canonical summaries so a pinned product without
  // the section flag still surfaces (replacements work end-to-end).
  const featured = (() => {
    const base = applySectionProductOverride(allProducts.filter((p) => p.isFeatured), featuredOverride);
    const extra = (featuredOverride?.pinned ?? [])
      .filter((slug) => !base.some((p) => p.slug === slug))
      .map((slug) => allProducts.find((p) => p.slug === slug))
      .filter((p): p is ProductSummary => Boolean(p));
    return [...extra, ...base];
  })();
  const bestSellers = (() => {
    const base = applySectionProductOverride(allProducts.filter((p) => p.isBestSeller), favoritesOverride);
    const extra = (favoritesOverride?.pinned ?? [])
      .filter((slug) => !base.some((p) => p.slug === slug))
      .map((slug) => allProducts.find((p) => p.slug === slug))
      .filter((p): p is ProductSummary => Boolean(p));
    return [...extra, ...base];
  })();

  if (!featuredContent.visible && !bestSellersContent.visible) return null;

  return (
    <>
      {featuredContent.visible && (
      <section className="hide-sub-m hidden w-full bg-white py-8 sm:block sm:py-10 lg:py-12">
        <Container>
          <SectionTitle
            eyebrow={isAr ? featuredContent.eyebrowAr : featuredContent.eyebrowEn}
            title={isAr ? featuredContent.titleAr : featuredContent.titleEn}
            subtitle={isAr ? featuredContent.subtitleAr : featuredContent.subtitleEn}
            action={
              <Link
                href="/products"
                className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-2.5 py-1.5 min-h-[38px] text-[11px] font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5 sm:px-4 sm:py-2.5 sm:min-h-[44px] sm:text-sm"
              >
                {isAr ? "عرض الكل" : "View All"}
              </Link>
            }
          />
        </Container>
        <MarqueeStrip items={featured} ariaLabel={isAr ? "المنتجات المميزة" : "Featured products"} />
      </section>
      )}

      {bestSellersContent.visible && (
      <section className="hide-sub-m w-full bg-white py-8 sm:py-10 lg:py-12">
        <Container className="[&_h2]:text-[22px] [&_h2]:whitespace-nowrap sm:[&_h2]:text-3xl">
          <SectionTitle
            eyebrow={isAr ? bestSellersContent.eyebrowAr : bestSellersContent.eyebrowEn}
            title={isAr ? bestSellersContent.titleAr : bestSellersContent.titleEn}
            subtitle={isAr ? bestSellersContent.subtitleAr : bestSellersContent.subtitleEn}
            action={
              <Link
                href="/products"
                className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-2.5 py-1.5 min-h-[38px] text-[11px] font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5 sm:px-4 sm:py-2.5 sm:min-h-[44px] sm:text-sm"
              >
                {isAr ? "عرض الكل" : "View All"}
              </Link>
            }
          />
        </Container>
        <MarqueeStrip items={bestSellers} ariaLabel={isAr ? "الأكثر مبيعاً" : "Best sellers"} />
      </section>
      )}
    </>
  );
}
