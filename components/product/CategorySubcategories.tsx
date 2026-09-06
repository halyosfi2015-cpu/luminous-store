"use client";

import Link from "next/link";
import { useLang } from "@/lib/use-lang";
import { getTaxonomyProductCount } from "@/src/lib/taxonomy";
import type { CategoryInfo } from "@/src/types/product";

type CategorySubcategoriesProps = {
  subcategories: CategoryInfo[];
  activeSlug: string;
};

export default function CategorySubcategories({ subcategories, activeSlug }: CategorySubcategoriesProps) {
  const { lang } = useLang();
  const isAr = lang === "ar";

  return (
    <div className="mt-6 rounded-card border border-border bg-card p-4 shadow-card sm:p-5">
      <h2 className="mb-3 text-sm font-bold text-foreground">
        {isAr ? "التصنيفات الفرعية" : "Subcategories"}
      </h2>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide" role="navigation" aria-label={isAr ? "التصنيفات الفرعية" : "Subcategories"}>
        {subcategories.map((sub) => {
          const isActive = sub.slug === activeSlug;
          return (
            <Link
              key={sub.slug}
              href={`/categories/${sub.slug}`}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill px-4 py-2 text-sm font-medium transition-all duration-200 ease-out-smooth ${
                isActive
                  ? "bg-primary text-white shadow-primary"
                  : "border border-border bg-background text-muted hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              }`}
            >
              {isAr ? sub.nameAr : sub.name}
              <span className={`text-[10px] font-bold ${isActive ? "text-white/80" : "text-muted/60"}`}>
                {getTaxonomyProductCount(sub.slug)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
