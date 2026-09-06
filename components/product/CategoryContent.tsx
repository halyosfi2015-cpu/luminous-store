"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { ProductSummary, FilterState, SortOption, SkinType, SkinConcern } from "@/src/types/product";
import ProductGrid from "@/components/product/ProductGrid";
import FilterSidebar, { OTHER_BRAND, getMainBrands } from "@/components/product/FilterSidebar";
import ActiveFilters from "@/components/product/ActiveFilters";
import Link from "next/link";
import type { CategoryInfo } from "@/types/product";

const defaultFilters: FilterState = {
  brands: [],
  skinTypes: [],
  skinConcerns: [],
  priceRanges: [],
  ratings: [],
};

export default function CategoryContent({ products, subcategories = [] }: { products: ProductSummary[]; subcategories?: CategoryInfo[] }) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [manualSort, setManualSort] = useState<SortOption | null>(null);

  const sortParam = searchParams.get("sort");
  const sort: SortOption =
    sortParam === "best" ? "popular" : sortParam === "new" ? "newest" : sortParam === "smart" ? "smart" : manualSort ?? "smart";

  const handleSortChange = (next: SortOption) => setManualSort(next);

  const filtered = useMemo(() => {
    let result = [...products];

    if (filters.brands.length > 0) {
      const mainBrands = new Set(getMainBrands(products));
      result = result.filter((p) =>
        filters.brands.some((b) => (b === OTHER_BRAND ? !mainBrands.has(p.brand) : b === p.brand))
      );
    }
    if (filters.skinTypes.length > 0) {
      result = result.filter((p) => p.skinTypes.some((t) => filters.skinTypes.includes(t as SkinType)));
    }
    if (filters.skinConcerns.length > 0) {
      result = result.filter((p) => p.skinConcerns?.some((c) => filters.skinConcerns.includes(c as SkinConcern)));
    }
    if (filters.priceRanges.length > 0) {
      result = result.filter((p) =>
        filters.priceRanges.some((range) => {
          if (range === "15000+") return p.pricing.price >= 15000;
          const [min, max] = range.split("-").map(Number);
          return p.pricing.price >= min && p.pricing.price <= max;
        })
      );
    }
    if (filters.ratings.length > 0) {
      result = result.filter((p) => filters.ratings.some((r) => Math.floor(p.rating) >= r));
    }

    switch (sort) {
      case "price_asc":
        result.sort((a, b) => a.pricing.price - b.pricing.price);
        break;
      case "price_desc":
        result.sort((a, b) => b.pricing.price - a.pricing.price);
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        result.sort((a, b) => parseInt(b.id) - parseInt(a.id));
        break;
      case "name_asc":
        result.sort((a, b) => a.name.ar.localeCompare(b.name.ar));
        break;
      case "smart":
        result.sort((a, b) => {
          const aBest = a.isBestSeller ? 1 : 0;
          const bBest = b.isBestSeller ? 1 : 0;
          if (aBest !== bBest) return bBest - aBest;

          const aFeat = a.isFeatured ? 1 : 0;
          const bFeat = b.isFeatured ? 1 : 0;
          if (aFeat !== bFeat) return bFeat - aFeat;

          const aNew = a.isNew ? 1 : 0;
          const bNew = b.isNew ? 1 : 0;
          if (aNew !== bNew) return bNew - aNew;

          const aReviews = a.reviewCount ?? 0;
          const bReviews = b.reviewCount ?? 0;
          if (aReviews !== bReviews) return bReviews - aReviews;

          return (b.rating ?? 0) - (a.rating ?? 0);
        });
        break;
      default:
        result.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    }

    return result;
  }, [products, filters, sort]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleRemoveFilter = (key: keyof FilterState, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].filter((v) => String(v) !== String(value)),
    }));
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-0">
      <div className="lg:w-52 xl:w-56 shrink-0">
        <FilterSidebar filters={filters} onChange={handleFilterChange} products={products} />
      </div>
      <div className="flex-1 flex flex-col gap-0 min-w-0">
        <ActiveFilters
          filters={filters}
          onRemove={handleRemoveFilter}
          onClear={handleClearFilters}
        />
        <ProductGrid products={filtered} />
      </div>
    </div>
  );
}
