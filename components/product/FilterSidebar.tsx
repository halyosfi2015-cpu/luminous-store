"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Filter, Star, SlidersHorizontal, RotateCcw } from "lucide-react";
import type { FilterState, SkinType, SkinConcern, Product } from "@/types/product";

type FilterSidebarProps = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  products?: Product[];
};

export const OTHER_BRAND = "__other__";
const MAX_LISTED_BRANDS = 10;

export function getMainBrands(products: Product[]): string[] {
  const counts = new Map<string, number>();
  products.forEach((p) => {
    const b = p.brand?.trim();
    if (b) counts.set(b, (counts.get(b) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([brand]) => brand)
    .slice(0, MAX_LISTED_BRANDS);
}

const skinTypeOptions: SkinType[] = ["dry", "oily", "combination", "sensitive", "normal", "all"];
const skinConcernOptions: SkinConcern[] = ["acne", "pigmentation", "aging", "dryness", "redness", "large_pores", "uneven_texture", "dark_circles", "oiliness", "sensitivity"];
const priceRangeOptions = [
  { value: "0-5000", label: "أقل من 5,000 ر.ي", en: "Under 5,000 YER" },
  { value: "5000-10000", label: "5,000 - 10,000 ر.ي", en: "5,000 - 10,000 YER" },
  { value: "10000-15000", label: "10,000 - 15,000 ر.ي", en: "10,000 - 15,000 YER" },
  { value: "15000+", label: "أكثر من 15,000 ر.ي", en: "Over 15,000 YER" },
];
const ratingOptions = [4, 3, 2, 1];

const skinTypeLabels: Record<SkinType, string> = {
  dry: "جافة", oily: "دهنية", combination: "مختلطة", sensitive: "حساسة", normal: "عادية", all: "جميع الأنواع",
};

const skinConcernLabels: Record<SkinConcern, string> = {
  acne: "حبوب الشباب", dryness: "الجفاف", pigmentation: "التصبغات", aging: "الشيخوخة",
  redness: "الاحمرار", large_pores: "المسام الواسعة", uneven_texture: "الملمس غير المتجانس",
  dark_circles: "الهالات السوداء", oiliness: "اللمعة الزائدة", sensitivity: "الحساسية",
};

function toggleArray<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

type FilterGroupProps = {
  label: string;
  children: React.ReactNode;
};

function FilterGroup({ label, children }: FilterGroupProps) {
  const [open, setOpen] = useState(true);
  return (
    <fieldset>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between mb-2"
      >
        <legend className="text-sm font-semibold text-foreground">{label}</legend>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className={`space-y-1 overflow-hidden transition-all duration-200 ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
        {children}
      </div>
    </fieldset>
  );
}

function Checkbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label onClick={onChange} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted-bg group">
      <div className={`flex h-3.5 w-3.5 items-center justify-center rounded border-2 transition-all duration-150 ${
        checked ? "bg-primary border-primary" : "border-border-strong group-hover:border-primary/50"
      }`}>
        {checked && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
      </div>
      <span className="text-xs text-muted truncate">{label}</span>
    </label>
  );
}

export default function FilterSidebar({ filters, onChange, products = [] }: FilterSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const dynamicBrands = useMemo(() => getMainBrands(products), [products]);

  const otherBrands = useMemo(() => {
    const set = new Set(dynamicBrands);
    return products.filter((p) => p.brand && !set.has(p.brand)).length;
  }, [products, dynamicBrands]);

  const brandOptions = [...dynamicBrands, ...(otherBrands > 0 ? [OTHER_BRAND] : [])];

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const update = (partial: Partial<FilterState>) => {
    onChange({ ...filters, ...partial });
  };

  const hasActiveFilters = filters.brands.length > 0 || filters.skinTypes.length > 0 ||
    filters.skinConcerns.length > 0 || filters.priceRanges.length > 0 || filters.ratings.length > 0;

  const filterContent = (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-primary" />
          <h3 className="text-base font-semibold text-foreground">الفلترز</h3>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => onChange({ brands: [], skinTypes: [], skinConcerns: [], priceRanges: [], ratings: [] })}
            className="flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors"
          >
            <RotateCcw size={12} />
            إعادة تعيين
          </button>
        )}
      </div>

      <FilterGroup label="الماركة">
        {brandOptions.map((brand) => (
          <Checkbox
            key={brand}
            checked={filters.brands.includes(brand)}
            label={brand === OTHER_BRAND ? `أخرى ${otherBrands > 0 ? `(${otherBrands})` : ""}` : brand}
            onChange={() => update({ brands: toggleArray(filters.brands, brand) })}
          />
        ))}
        {brandOptions.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted">لا توجد ماركات</p>
        )}
      </FilterGroup>

      <FilterGroup label="نوع البشرة">
        {skinTypeOptions.map((type) => (
          <Checkbox
            key={type}
            checked={filters.skinTypes.includes(type)}
            label={`${skinTypeLabels[type]}`}
            onChange={() => update({ skinTypes: toggleArray(filters.skinTypes, type) })}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="مشاكل البشرة">
        {skinConcernOptions.map((concern) => (
          <Checkbox
            key={concern}
            checked={filters.skinConcerns.includes(concern)}
            label={`${skinConcernLabels[concern]}`}
            onChange={() => update({ skinConcerns: toggleArray(filters.skinConcerns, concern) })}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="نطاق السعر">
        {priceRangeOptions.map((opt) => (
          <Checkbox
            key={opt.value}
            checked={filters.priceRanges.includes(opt.value)}
            label={opt.label}
            onChange={() => update({ priceRanges: toggleArray(filters.priceRanges, opt.value) })}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="التقييم">
        {ratingOptions.map((stars) => (
          <label
            key={stars}
            onClick={() => update({ ratings: toggleArray(filters.ratings, stars) })}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted-bg group"
          >
            <div className={`flex h-3.5 w-3.5 items-center justify-center rounded border-2 transition-all duration-150 ${
              filters.ratings.includes(stars) ? "bg-primary border-primary" : "border-border-strong group-hover:border-primary/50"
            }`}>
              {filters.ratings.includes(stars) && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
            </div>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: stars }, (_, i) => (
                <Star key={i} size={11} className="fill-accent text-accent" />
              ))}
              <span className="me-1 text-xs text-muted">+</span>
            </div>
          </label>
        ))}
      </FilterGroup>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="flex items-center gap-2 rounded-button border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-card transition-all duration-200 hover:shadow-card-hover lg:hidden"
      >
        <Filter size={16} />
        الفلترز
        {hasActiveFilters && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
            {filters.brands.length + filters.skinTypes.length + filters.skinConcerns.length + filters.priceRanges.length + filters.ratings.length}
          </span>
        )}
      </button>

      <aside className="hidden lg:block">
        <div className="rounded-card border border-border bg-card p-5 shadow-card">
          {filterContent}
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 end-0 w-80 max-w-[85vw] bg-card p-5 shadow-elevated overflow-y-auto animate-slide-in-right">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">الفلترز</h3>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="إغلاق"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>
            {filterContent}
          </div>
        </div>
      )}
    </>
  );
}
