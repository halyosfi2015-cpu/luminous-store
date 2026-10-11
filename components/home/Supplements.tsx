"use client";

import { useMemo } from "react";
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

/** Supplements + beauty-from-within category slugs (mirrors taxonomy). */
const SUPPLEMENT_SLUGS = new Set([
  "vitamins",
  "collagen",
  "immunity",
  "hair-nails",
  "kids-supplements",
  "women-health",
  "supplements",
]);

/** Subcategory shortcuts, louz-style: quick navigation + product rail. */
const SUBCATS: { slug: string; ar: string; en: string }[] = [
  { slug: "vitamins", ar: "فيتامينات", en: "Vitamins" },
  { slug: "collagen", ar: "كولاجين", en: "Collagen" },
  { slug: "immunity", ar: "المناعة", en: "Immunity" },
  { slug: "hair-nails", ar: "الشعر والأظافر", en: "Hair & Nails" },
  { slug: "kids-supplements", ar: "مكملات الأطفال", en: "Kids Supplements" },
  { slug: "women-health", ar: "صحة المرأة", en: "Women's Health" },
];

export default function Supplements() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { products: allProducts, loading, error } = useProducts();
  const content = useSectionContent("supplements");
  const siteContent = useSiteContent();

  const items: ProductSummary[] = useMemo(() => {
    // Live API uses top-level section slugs (health-wellness); static data
    // uses leaf slugs (vitamins, …) — accept both so the rail never empties.
    const base = allProducts.filter(
      (p) => p.categorySlug === "health-wellness" || (p.categorySlug && SUPPLEMENT_SLUGS.has(p.categorySlug))
    );
    const override = siteContent?.products?.supplements;
    return applySectionProductOverride(base, override).slice(0, 12);
  }, [allProducts, siteContent]);

  if (loading) return null;
  if (error) {
    return (
      <section id="supplements" className="w-full py-8" style={{ background: "var(--background)" }}>
        <Container>
          <div className="text-center py-12 text-[var(--muted)]">
            <p>{isAr ? "فشل تحميل المكملات" : "Failed to load supplements"}</p>
            <button onClick={() => window.location.reload()} className="mt-4 text-[var(--primary)] underline">
              {isAr ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        </Container>
      </section>
    );
  }

  if (items.length === 0) return null;
  if (!content.visible) return null;

  return (
    <section id="supplements" className="hide-sub-m w-full scroll-mt-28 bg-white py-8 sm:py-10 lg:py-12">
      <Container>
        <SectionTitle
          eyebrow={isAr ? content.eyebrowAr : content.eyebrowEn}
          title={isAr ? content.titleAr : content.titleEn}
          subtitle={isAr ? content.subtitleAr : content.subtitleEn}
          action={
            <Link
              href="/categories/supplements"
              className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-2.5 py-1.5 min-h-[38px] text-[11px] font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5 sm:px-4 sm:py-2.5 sm:min-h-[44px] sm:text-sm"
            >
              {isAr ? "عرض الكل" : "View All"}
            </Link>
          }
        />
      </Container>

      <MobileReveal delay={100}>
      {/* Subcategory shortcuts — louz-style quick navigation */}
      <Container className="pb-3">
        <div className="hide-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
          {SUBCATS.map((c) => (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className="inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-4 py-2.5 min-h-[44px] text-xs font-bold text-primary transition-all duration-200 hover:bg-primary hover:text-white active:scale-95 sm:text-[13px]"
            >
              {isAr ? c.ar : c.en}
            </Link>
          ))}
        </div>
      </Container>
      <Container>
        <HorizontalCarousel ariaLabel={isAr ? "المكملات الغذائية" : "Dietary supplements"} autoplay autoplaySpeed={4500}>
          {items.map((product) => (
              <div key={product.id} className="flex w-[calc(50dvw-24px)] min-w-[170px] max-w-[170px] shrink-0 snap-start flex-col sm:w-60 sm:max-w-none">
              <ProductCard product={product} />
            </div>
          ))}
        </HorizontalCarousel>
      </Container>
      </MobileReveal>
    </section>
  );
}
