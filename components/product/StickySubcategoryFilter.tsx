"use client";

import Link from "next/link";
import { useLang } from "@/lib/use-lang";
import { getTaxonomyProductCount } from "@/src/lib/taxonomy";
import type { CategoryInfo } from "@/src/types/product";

type StickySubcategoryFilterProps = {
  subcategories: CategoryInfo[];
  activeSlug: string;
  categorySlug: string;
  categoryNameAr: string;
  categoryNameEn: string;
};

export default function StickySubcategoryFilter({
  subcategories,
  activeSlug,
  categorySlug,
  categoryNameAr,
  categoryNameEn,
}: StickySubcategoryFilterProps) {
  const { lang } = useLang();
  const isAr = lang === "ar";

  return (
    <div className="sticky top-20 z-40 w-full bg-transparent px-4 py-3 mt-1">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" role="navigation" aria-label={isAr ? "فلاتر الأقسام الفرعية" : "Subcategory filters"}>
        {subcategories.map((sub) => {
          const isActive = sub.slug === activeSlug;
          const linkClass = isActive
            ? "inline-flex items-center gap-0.5 rounded-pill px-3 py-1.5 text-[10px] font-medium transition-all duration-150 ease-out-smooth flex-shrink-0 bg-primary text-white shadow-primary"
            : "inline-flex items-center gap-0.5 rounded-pill px-3 py-1.5 text-[10px] font-medium transition-all duration-150 ease-out-smooth flex-shrink-0 border border-border bg-background text-muted/60 hover:border-primary/30 hover:bg-primary/5 hover:text-primary";
          return (
            <Link
              key={sub.slug}
              href={`/categories/${sub.slug}`}
              className={linkClass}
              aria-current={isActive ? "page" : undefined}
            >
              {isAr ? sub.nameAr : sub.name}
              <span className="text-[8px] font-bold">
                {getTaxonomyProductCount(sub.slug)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}