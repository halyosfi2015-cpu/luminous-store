"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import SectionTitle from "@/components/ui/SectionTitle";
import MobileReveal from "@/components/ui/MobileReveal";
import { useLang } from "@/lib/use-lang";
import { getTaxonomyCategoryCards, type TaxonomyCategoryCard } from "@/src/lib/taxonomy";
import { useSectionContent } from "@/components/site-content/SiteContentProvider";
import { taxonomyCategoryIcons, taxonomyCategoryColors as categoryGradient, resolveTaxonomyIcon } from "@/components/layout/taxonomyCategoryUi";

export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  skincare: "/images/categories-luminous/category-skincare.webp",
  bodycare: "/images/categories-luminous/category-bodycare.webp",
  haircare: "/images/categories-luminous/category-haircare.webp",
  makeup: "/images/categories-luminous/category-makeup.webp",
  perfume: "/images/categories-luminous/category-perfume.webp",
  "oral-care": "/images/categories-luminous/category-oral-care.webp",
  "personal-care": "/images/categories-luminous/category-personal-care.webp",
  "contact-lenses": "/images/categories-luminous/category-contact-lenses.webp",
  "mother-baby": "/images/categories-luminous/category-mother-baby.webp",
  "health-wellness": "/images/categories-luminous/category-health-wellness.webp",
  "appliances-tools": "/images/categories-luminous/category-appliances-tools.webp",
  "home-fragrance": "/images/categories-luminous/category-home-fragrance.webp",
  "medical-supplies": "/images/categories-luminous/category-medical-supplies.jpg",
  accessories: "/images/categories-luminous/category-accessories.webp",
};

// All categories on the homepage are shown; extra tabs wrap to a centered row
export default function TrendingNow() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const content = useSectionContent("trendingNow");
  const [tabCategories, setTabCategories] = useState<TaxonomyCategoryCard[]>(() => getTaxonomyCategoryCards());

  useEffect(() => {
    fetch("/api/content/taxonomy", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.categoryCards) && data.categoryCards.length > 0) {
          setTabCategories(data.categoryCards);
        }
      })
      .catch(() => {});
  }, []);

  const categoryImages = useMemo(
    () => new Map(tabCategories.map((cat) => [cat.slug, CATEGORY_IMAGE_MAP[cat.slug]])),
    [tabCategories]
  );

  if (!content.visible) return null;

  const t = (ar: string, en: string) => (isAr ? ar : en);

  return (
    <section className="hide-sub-m w-full bg-white py-6 sm:py-10 lg:py-12">
        <Container className="[&_h2]:text-[22px] sm:[&_h2]:text-3xl">
        <SectionTitle
          eyebrow={t(content.eyebrowAr, content.eyebrowEn)}
          title={t(content.titleAr, content.titleEn)}
          subtitle={t(content.subtitleAr, content.subtitleEn)}
        />
      </Container>
      {/* Circular rail — aligned container, one screen at a time with pause */}
      <MobileReveal delay={100}>
      <Container className="bg-transparent pb-4">
        <HorizontalCarousel ariaLabel={isAr ? "تصفحي حسب القسم" : "Browse by category"} autoplay autoplaySpeed={3500}>
          {tabCategories.map((cat, categoryIndex) => {
              const Icon = taxonomyCategoryIcons[cat.slug] || resolveTaxonomyIcon(cat.icon);
              const imageSrc = categoryImages.get(cat.slug);
              return (
                <Link
                  key={cat.slug}
                  href={`/categories/${cat.slug}`}
                  aria-label={isAr ? `تصفحي منتجات ${cat.nameAr}` : `Browse ${cat.name}`}
                  className="group flex w-[84px] shrink-0 snap-start flex-col items-center gap-3 text-center text-foreground transition-colors duration-200 ease-out-smooth hover:text-primary sm:w-[164px]"
                >
                  <span
                    className="category-orbit relative flex h-[84px] w-[84px] items-center justify-center rounded-full sm:h-[164px] sm:w-[164px]"
                    style={{ "--category-delay": `${(categoryIndex % 7) * 140}ms` } as React.CSSProperties}
                  >
                    <span className="luminous-ring-conic relative z-10 flex h-[77px] w-[77px] items-center justify-center rounded-full p-[3px] shadow-card transition-all duration-300 ease-out-smooth group-hover:scale-105 sm:h-[156px] sm:w-[156px]">
                    <span className="luminous-shine flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#f9e2e8]">
                      <span
                        data-category-icon
                        className={`category-product-move flex items-center justify-center rounded-full bg-gradient-to-br p-4 text-white shadow-card ${imageSrc ? "hidden" : ""} ${categoryGradient[cat.slug] ?? "from-primary to-secondary"}`}
                        style={{ "--category-delay": `${(categoryIndex % 7) * 140}ms` } as React.CSSProperties}
                      >
                        <Icon size={30} strokeWidth={1.6} aria-hidden="true" />
                      </span>
                      {imageSrc && (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element -- curated local category artwork */}
                          <img
                            src={imageSrc}
                            alt=""
                            className="category-product-move h-full w-full object-cover"
                            style={{ "--category-delay": `${(categoryIndex % 7) * 140}ms` } as React.CSSProperties}
                            draggable={false}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                              event.currentTarget.parentElement?.previousElementSibling?.classList.remove("hidden");
                            }}
                          />
                        </>
                      )}
                    </span>
                    </span>
                  </span>
                  <span className="max-w-[112px] text-[12px] font-bold leading-[1.7] text-primary line-clamp-2 min-h-[2.5em] sm:max-w-[148px] sm:text-[15px]">
                    {isAr ? cat.nameAr : cat.name}
                  </span>
                </Link>
              );
            })}
        </HorizontalCarousel>
      </Container>
      </MobileReveal>
    </section>
  );
}
