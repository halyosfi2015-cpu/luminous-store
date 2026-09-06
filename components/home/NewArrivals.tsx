"use client";

import { useMemo } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import SectionTitle from "@/components/ui/SectionTitle";
import ProductImage from "@/components/product/ProductImage";
import ProductBadges from "@/components/product/ProductBadges";
import { useProducts } from "@/hooks/useProducts";
import { useLang } from "@/lib/use-lang";
import { useSectionContent, useSiteContent } from "@/components/site-content/SiteContentProvider";
import type { ProductSummary } from "@/src/types/product";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

export default function NewArrivals() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { products: allProducts, loading, error } = useProducts();
  const content = useSectionContent("newArrivals");
  const siteContent = useSiteContent();

  const newArrivals: ProductSummary[] = useMemo(() => {
    const override = siteContent?.products?.newArrivals;
    const newOnes = allProducts.filter((p) => p.isNew);
    if (!override || (!override.pinned?.length && !override.excluded?.length)) {
      return newOnes.slice(0, 10);
    }
    const excluded = new Set(override.excluded ?? []);
    const filtered = newOnes.filter((p) => !excluded.has(p.slug));
    const rest = filtered.filter((p) => !override.pinned?.includes(p.slug));
    const pinned = (override.pinned ?? [])
      .map((slug) => allProducts.find((p) => p.slug === slug))
      .filter((p): p is ProductSummary => Boolean(p));
    return [...pinned, ...rest].slice(0, 10);
  }, [allProducts, siteContent]);

  if (loading) return null;
  if (error) {
    return (
      <section id="new-arrivals" className="w-full py-8" style={{ background: "var(--background)" }}>
        <Container>
          <div className="text-center py-12 text-[var(--muted)]">
            <p>{isAr ? "فشل تحميل المنتجات الجديدة" : "Failed to load new arrivals"}</p>
            <button onClick={() => window.location.reload()} className="mt-4 text-[var(--primary)] underline">
              {isAr ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        </Container>
      </section>
    );
  }



  if (newArrivals.length === 0) return null;
  if (!content.visible) return null;

  const items: ProductSummary[] = newArrivals;

  return (
    <section id="new-arrivals" className="w-full scroll-mt-28 bg-white py-8 sm:py-10 lg:py-12">
      <Container>
        <SectionTitle
          eyebrow={<>
            <span className="h-0.5 w-6 rounded-pill bg-primary" />
            <span className="text-sm font-bold text-primary">{isAr ? content.eyebrowAr : content.eyebrowEn}</span>
          </>}
          title={isAr ? content.titleAr : content.titleEn}
          subtitle={isAr ? content.subtitleAr : content.subtitleEn}
          action={
            <Link
              href="/new-arrivals"
              className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
            >
              {isAr ? "عرض الكل" : "View All"}
            </Link>
          }
        />
      </Container>

      <Container>
        <HorizontalCarousel ariaLabel={isAr ? "وصل حديثاً" : "New arrivals"} autoplay autoplaySpeed={2500}>
            {items.map((product, i) => {
              const productName = isAr ? product.name.ar : product.name.en;
              return (
                <Link
                  key={`${product.id}-${i}`}
                  href={`/products/${product.slug}`}
                  className="group flex w-56 shrink-0 flex-col gap-2.5 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-50">
                    {product.gallery[0] ? (
                      <ProductImage
                        src={product.gallery[0]}
                        alt={productName}
                        productId={product.id}
                        className="h-full w-full"
                        sizes="224px"
                        pedestal
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
                        <span className="text-2xl">🧴</span>
                      </div>
                    )}
                    <ProductBadges product={product} position="start-2 top-2" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="line-clamp-2 text-xs font-semibold text-gray-700 transition-colors group-hover:text-gray-900">
                      {productName}
                    </p>
                    <span className="text-sm font-extrabold text-gray-900">
                      {formatPrice(product.pricing.price)}
                      <span className="ms-0.5 text-[10px] font-normal text-gray-400">{isAr ? "ريال" : "YER"}</span>
                    </span>
                  </div>
                </Link>
              );
            })}
        </HorizontalCarousel>
      </Container>
    </section>
  );
}
