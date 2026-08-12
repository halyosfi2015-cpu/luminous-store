"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import ProductCard from "@/components/product/ProductCard";
import { productSummaries, sectionCategoriesMap } from "@/src/data/product-summaries";
import { useLang } from "@/lib/use-lang";
import type { ProductSummary } from "@/src/types/product";

function isGlobalBrand(brand: string): boolean {
  return /[a-zA-Z]/.test(brand || "");
}

function getTopProducts(slug: string, count = 4): ProductSummary[] {
  const cat = sectionCategoriesMap.find((c) => c.slug === slug);
  if (!cat) return [];
  const list = productSummaries.filter(
    (p) => p.categorySlug && cat.children.includes(p.categorySlug)
  );
  return list
    .map((p) => {
      let score = 0;
      if (p.isBestSeller) score += 1000;
      if (p.isFeatured) score += 800;
      if (p.isNew) score += 400;
      score += (p.rating || 0) * 50;
      score += Math.min(p.reviewCount || 0, 200);
      if (isGlobalBrand(p.brand)) score += 300;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.p);
}

export default function TrendingNow() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [activeSlug, setActiveSlug] = useState(sectionCategoriesMap[0]?.slug ?? "skincare");

  const activeCat = useMemo(
    () => sectionCategoriesMap.find((c) => c.slug === activeSlug) ?? sectionCategoriesMap[0],
    [activeSlug]
  );

  const topProducts = useMemo(
    () => getTopProducts(activeSlug, 4),
    [activeSlug]
  );

  return (
    <section className="w-full bg-white py-8 sm:py-10 lg:py-12">
      <Container>
        <SectionTitle
          eyebrow={isAr ? "تصفحي حسب القسم" : "Browse by Category"}
          title={isAr ? "أبرز منتجات كل قسم" : "Top Products per Category"}
          subtitle={
            isAr
              ? "كل قسم يعرض لك أشهر المنتجات من أفضل الماركات العالمية"
              : "Each section shows you the best-selling products from top global brands"
          }
        />

        {/* Category tabs — horizontally scrollable on phones */}
        <div className="mt-6 -mx-4 overflow-x-auto px-4 pb-2 hide-scrollbar sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex w-max items-center gap-2.5">
            {sectionCategoriesMap.map((cat) => {
              const isActive = cat.slug === activeSlug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setActiveSlug(cat.slug)}
                  className={`shrink-0 rounded-pill border px-4 py-2.5 text-sm font-bold transition-colors duration-150 ease-out ${
                    isActive
                      ? "border-primary bg-primary text-white shadow-md shadow-primary/30"
                      : "border-border bg-card text-muted hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {cat.nameAr}
                </button>
              );
            })}
          </div>
        </div>

        {/* Top products grid — instant switching, mobile friendly */}
        <div key={activeSlug} className="mt-6">
          {topProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {topProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 text-center">
              <p className="text-sm text-muted">
                {isAr ? "لا توجد منتجات في هذا القسم بعد" : "No products in this category yet"}
              </p>
            </div>
          )}

          {activeCat && (
            <div className="mt-8 text-center">
              <Link
                href={`/categories/${activeCat.slug}`}
                className="inline-flex items-center gap-2 rounded-pill border border-primary/30 bg-primary/5 px-6 py-3 text-sm font-bold text-primary transition-all duration-200 ease-out-smooth hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20"
              >
                {isAr ? `تصفحي كل منتجات ${activeCat.nameAr}` : `Browse all ${activeCat.name}`}
              </Link>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
