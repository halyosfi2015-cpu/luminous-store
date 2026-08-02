"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { Product, FilterState, SortOption, SkinType, SkinConcern } from "@/types/product";
import ProductGrid from "@/components/product/ProductGrid";
import FilterSidebar from "@/components/product/FilterSidebar";
import SortSelect from "@/components/product/SortSelect";
import ActiveFilters from "@/components/product/ActiveFilters";

type CategoryContentProps = {
  products: Product[];
};

const defaultFilters: FilterState = {
  brands: [],
  skinTypes: [],
  skinConcerns: [],
  priceRanges: [],
  ratings: [],
};

export default function CategoryContent({ products }: CategoryContentProps) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [manualSort, setManualSort] = useState<SortOption | null>(null);

  const sortParam = searchParams.get("sort");
  const sort: SortOption =
    sortParam === "best" ? "popular" : sortParam === "new" ? "newest" : manualSort ?? "popular";

  const handleSortChange = (next: SortOption) => setManualSort(next);

  const filtered = useMemo(() => {
    let result = [...products];

    if (filters.brands.length > 0) {
      result = result.filter((p) => filters.brands.includes(p.brand));
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
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-64 xl:w-72 shrink-0">
        <FilterSidebar filters={filters} onChange={handleFilterChange} />
      </div>
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <ActiveFilters
            filters={filters}
            onRemove={handleRemoveFilter}
            onClear={handleClearFilters}
          />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted whitespace-nowrap">
              {filtered.length} {filtered.length === 1 ? "منتج" : "منتجات"}
            </span>
            <SortSelect value={sort} onChange={handleSortChange} />
          </div>
        </div>
        <ProductGrid products={filtered} />
      </div>
    </div>
  );
}
