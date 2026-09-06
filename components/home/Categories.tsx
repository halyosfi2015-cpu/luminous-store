"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { useLang } from "@/lib/use-lang";
import {
  taxonomyCategoryIcons,
  taxonomyCategoryColors,
  taxonomyCategoryBgColors,
  resolveTaxonomyIcon,
} from "@/components/layout/taxonomyCategoryUi";
import { getTaxonomyCategoryCards, type TaxonomyCategoryCard } from "@/src/lib/taxonomy";

export const categoryIcons = taxonomyCategoryIcons;
export const categoryColors = taxonomyCategoryColors;
export const categoryBgColors = taxonomyCategoryBgColors;

export default function Categories() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [sectionCategories, setSectionCategories] = useState<TaxonomyCategoryCard[]>(() => getTaxonomyCategoryCards());

  useEffect(() => {
    fetch("/api/content/taxonomy", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.categoryCards) && data.categoryCards.length > 0) {
          setSectionCategories(data.categoryCards);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="w-full bg-gradient-to-b from-card via-accent-50/30 to-card py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionTitle
          eyebrow={isAr ? "تسوقي حسب الفئة" : "Shop by Category"}
          title={isAr ? "اكتشفي تشكيلتنا" : "Discover Our Collection"}
          subtitle={
            isAr
              ? "مجموعة مختارة بعناية من أفضل المنتجات لكل احتياجاتك"
              : "Carefully curated selection of best products for all your needs"
          }
          action={
            <Link
              href="/categories"
              className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
            >
              {isAr ? "عرض الكل" : "View All"}
              <ArrowLeft size={15} className={`transition-transform duration-200 ease-out-smooth group-hover:-translate-x-0.5 ${isAr ? "" : "rotate-180"}`} />
            </Link>
          }
        />
        <HorizontalCarousel ariaLabel={isAr ? "الفئات" : "Categories"} autoplay autoplaySpeed={2500}>
          {sectionCategories.map((cat) => {
            const Icon = categoryIcons[cat.slug] || resolveTaxonomyIcon(cat.icon) || ArrowLeft;
            const bgColor = categoryBgColors[cat.slug] || "from-primary/5 to-secondary/5";
            return (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="group relative w-64 shrink-0 overflow-hidden rounded-card border border-border bg-gradient-to-br from-card via-card to-card p-5 text-center shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/10 sm:w-72 sm:p-6"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${bgColor} opacity-0 transition-opacity duration-300 ease-out-smooth group-hover:opacity-100`}
                />
                <div className="relative flex flex-col items-center gap-2.5">
                  <span className="flex h-18 w-18 items-center justify-center rounded-button bg-primary text-white text-2xl shadow-card transition-transform duration-300 ease-spring group-hover:-rotate-6 group-hover:scale-110 sm:h-20 sm:w-20 sm:text-3xl">
                    <Icon size={30} />
                  </span>
                  <span className="text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-primary sm:text-base">
                    {isAr ? cat.nameAr : cat.name}
                  </span>
                  <span className="rounded-pill bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-muted transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary">
                    {cat.productCount} {isAr ? "منتج" : "products"}
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
