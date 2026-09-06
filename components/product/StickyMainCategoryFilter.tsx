"use client";

import Link from "next/link";
import { useLang } from "@/lib/use-lang";
import type { TaxonomyCategoryCard } from "@/src/lib/taxonomy";

type StickyMainCategoryFilterProps = {
  categories: Array<{
    slug: string;
    nameAr: string;
    nameEn: string;
    productCount?: number;
  }>;
  activeSlug: string;
};

export default function StickyMainCategoryFilter({
  categories,
  activeSlug,
}: StickyMainCategoryFilterProps) {
  const { lang } = useLang();
  const isAr = lang === "ar";

  if (categories.length === 0) return null;

  return (
    <div className="sticky top-16 z-40 w-full bg-card/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-muted">
          {isAr ? "فلاتر الأقسام الرئيسية" : "Main Category Filters"}
        </h3>
        <Link href="/categories" className="text-[10px] font-medium text-primary hover:underline">
          {isAr ? "كل الأقسام" : "All Categories"}
        </Link>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide" role="navigation" aria-label={isAr ? "فلاتر الأقسام الرئيسية" : "Main category filters"}>
        {categories.map((cat) => {
          const isActive = cat.slug === activeSlug;
          const linkClass = isActive
            ? "inline-flex items-center gap-0.5 rounded-pill px-3 py-1.5 text-[10px] font-medium transition-all duration-150 ease-out-smooth flex-shrink-0 bg-primary text-white shadow-primary"
            : "inline-flex items-center gap-0.5 rounded-pill px-3 py-1.5 text-[10px] font-medium transition-all duration-150 ease-out-smooth flex-shrink-0 border border-border bg-background text-muted/60 hover:border-primary/30 hover:bg-primary/5 hover:text-primary";
          return (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className={linkClass}
              aria-current={isActive ? "page" : undefined}
            >
              {isAr ? cat.nameAr : cat.nameEn}
              <span className="text-[8px] font-bold">
                {cat.productCount ?? 0}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}