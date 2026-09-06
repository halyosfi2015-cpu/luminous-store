"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/use-lang";
import { getTaxonomyCategoryCards, type TaxonomyCategoryCard } from "@/src/lib/taxonomy";
import { useSectionContent } from "@/components/site-content/SiteContentProvider";
import { taxonomyCategoryIcons, resolveTaxonomyIcon } from "@/components/layout/taxonomyCategoryUi";

const CATEGORY_IMAGE_MAP: Record<string, string> = {
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

  return (
    <section className="w-full bg-white py-8 sm:py-10 lg:py-12">
      {/* Enlarged circular category rail — direct link to category page, no container, spaced */}
      <div className="overflow-x-auto px-4 pb-4 sm:px-6 lg:px-8">
        <div className="flex min-w-max items-start justify-center gap-8 sm:grid sm:min-w-0 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 lg:gap-x-8 lg:gap-y-8">
            {tabCategories.map((cat, categoryIndex) => {
              const Icon = taxonomyCategoryIcons[cat.slug] || resolveTaxonomyIcon(cat.icon);
              const imageSrc = categoryImages.get(cat.slug);
              return (
                <Link
                  key={cat.slug}
                  href={`/categories/${cat.slug}`}
                  aria-label={isAr ? `تصفحي منتجات ${cat.nameAr}` : `Browse ${cat.name}`}
                  className="group flex w-[148px] shrink-0 flex-col items-center gap-3 text-center text-foreground transition-colors duration-200 ease-out-smooth hover:text-primary sm:w-auto"
                >
                  <span
                    className="category-orbit relative flex h-[148px] w-[148px] items-center justify-center rounded-full sm:h-[164px] sm:w-[164px]"
                    style={{ "--category-delay": `${(categoryIndex % 7) * 140}ms` } as React.CSSProperties}
                  >
                    <span className="relative z-10 flex h-[136px] w-[136px] items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#f9e2e8] shadow-card transition-all duration-300 ease-out-smooth group-hover:scale-105 group-hover:border-primary/40 sm:h-[152px] sm:w-[152px]">
                      <span
                        data-category-icon
                        className={`category-product-move flex items-center justify-center text-primary ${imageSrc ? "hidden" : ""}`}
                        style={{ "--category-delay": `${(categoryIndex % 7) * 140}ms` } as React.CSSProperties}
                      >
                        <Icon size={34} strokeWidth={1.6} aria-hidden="true" />
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
                  <span className="max-w-[148px] text-sm font-bold leading-tight sm:text-[15px]">
                    {isAr ? cat.nameAr : cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
    </section>
  );
}
