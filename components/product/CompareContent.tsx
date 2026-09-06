"use client";

import { Scale, Star, Check, X, Trash2, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import ProductImage from "@/components/product/ProductImage";
import { useCompare } from "@/context/CompareContext";
import { productSummaries } from "@/src/data/product-summaries";
import { productCompareDetails } from "@/src/data/product-compare-details";
import { safeRatingDisplay, safeReviewCountDisplay } from "@/lib/ratings";
import { toAvailability } from "@/src/lib/commerce-overlay";
import CompareButton from "@/components/product/CompareButton";
import SectionTitle from "@/components/ui/SectionTitle";
import type { ProductSummary } from "@/src/types/product";
import type { SkinType, SkinConcern } from "@/types/product";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

const skinTypeLabels: Record<SkinType, string> = {
  dry: "جافة", oily: "دهنية", combination: "مختلطة", sensitive: "حساسة", normal: "عادية", all: "جميع الأنواع",
};

const skinConcernLabels: Record<SkinConcern, string> = {
  acne: "حبوب الشباب", dryness: "الجفاف", pigmentation: "التصبغات", aging: "الشيخوخة",
  redness: "الاحمرار", large_pores: "المسام الواسعة", uneven_texture: "الملمس غير المتجانس",
  dark_circles: "الهالات السوداء", oiliness: "اللمعة الزائدة", sensitivity: "الحساسية",
};

type RowProps = {
  label: string;
  cells: React.ReactNode[];
};

function CompareRow({ label, cells }: RowProps) {
  return (
    <tr className="border-b border-border">
      <td className="sticky end-0 bg-card px-4 py-3.5 text-sm font-medium text-foreground whitespace-nowrap min-w-[120px] border-e border-border">
        {label}
      </td>
      {cells.map((cell, i) => (
        <td key={i} className="px-4 py-3.5 text-sm text-muted text-center min-w-[180px]">
          {cell}
        </td>
      ))}
    </tr>
  );
}

const MAX_PICKER = 12;

export default function CompareContent() {
  const { items, clear, count } = useCompare();
  const compared = productSummaries.filter((p) => items.includes(p.id));

  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => {
    const list = productSummaries.filter((p) => p.status === "published" && p.gallery?.[0]);
    if (query.trim()) {
      const term = query.trim().toLowerCase();
      return list.filter(
        (p) =>
          p.name.ar.toLowerCase().includes(term) ||
          p.name.en.toLowerCase().includes(term) ||
          (p.brandAr || "").toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term)
      );
    }
    return list;
  }, [query]);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-6">
        {/* Picker — always available inside the section itself */}
        <ProductPicker
          query={query}
          setQuery={setQuery}
          suggestions={suggestions}
          comparedIdsSet={new Set(items)}
        />

        {count === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <SectionTitle
                title="مقارنة المنتجات"
                subtitle={`${count} من 4 منتجات`}
              />
              <button
                type="button"
                onClick={clear}
                className="flex items-center gap-1.5 rounded-button border border-border px-4 py-2 text-xs font-medium text-muted transition-all duration-200 hover:border-secondary-200 hover:bg-secondary-50 hover:text-secondary-500"
              >
                <Trash2 size={14} />
                مسح الكل
              </button>
            </div>

            <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-border bg-card">
                    <th className="sticky end-0 bg-card px-4 py-4 min-w-[120px]" />
                    {compared.map((product) => (
                      <th key={product.id} className="px-4 py-4 text-center min-w-[200px]">
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative aspect-square w-28 rounded-xl bg-muted-bg overflow-hidden">
                            {product.gallery[0] && (
                              <ProductImage
                                src={product.gallery[0]}
                                alt={product.name.ar}
                                productId={product.id}
                                hoverZoom={false}
                                pedestal={false}
                                className="absolute inset-0 h-full w-full"
                              />
                            )}
                          </div>
                          <div className="flex gap-1">
                            <CompareButton productId={product.id} iconOnly size={14} />
                          </div>
                          <Link
                            href={`/products/${product.slug}`}
                            className="text-sm font-semibold text-foreground transition-colors hover:text-primary line-clamp-2"
                          >
                            {product.name.ar}
                          </Link>
                          <p className="text-[11px] text-primary font-medium">{product.brand}</p>
                          {safeRatingDisplay(product) > 0 && safeReviewCountDisplay(product) > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star
                                    key={i}
                                    size={11}
                                    className={
                                      i < Math.floor(safeRatingDisplay(product))
                                        ? "fill-accent text-accent"
                                        : "text-border-strong"
                                    }
                                  />
                                ))}
                              </div>
                              <span className="text-[11px] text-muted">
                                ({safeReviewCountDisplay(product)})
                              </span>
                            </div>
                          )}
                          <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-base font-bold text-foreground">
                              {formatPrice(product.pricing.price)} ر.ي
                            </span>
                            {product.discount && product.pricing.originalPrice && (
                              <span className="text-xs text-muted line-through">
                                {formatPrice(product.pricing.originalPrice)} ر.ي
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/products/${product.slug}`}
                            className="mt-1 block w-full rounded-full bg-primary px-3 py-1.5 text-center text-[11px] font-bold text-white shadow transition-all duration-200 hover:bg-primary-700 active:scale-95"
                          >
                            اعرض المنتج
                          </Link>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <CompareRow
                    label="السعر"
                    cells={compared.map((p) => (
                      <span key={p.id} className="font-bold text-foreground">
                        {formatPrice(p.pricing.price)} ر.ي
                      </span>
                    ))}
                  />
                  <CompareRow
                    label="الخصم"
                    cells={compared.map((p) =>
                      p.discount ? (
                        <span
                          key={p.id}
                          className="inline-flex rounded-full bg-error-soft border border-error-border px-2 py-0.5 text-xs font-semibold text-error-fg"
                        >
                          -{p.discount}%
                        </span>
                      ) : (
                        <span key={p.id} className="text-muted">—</span>
                      )
                    )}
                  />
                  <CompareRow
                    label="التقييم"
                    cells={compared.map((p) =>
                      safeRatingDisplay(p) > 0 ? (
                        <div key={p.id} className="flex items-center justify-center gap-1">
                          <Star size={14} className="fill-accent text-accent" />
                          <span className="font-medium text-foreground">{safeRatingDisplay(p)}</span>
                          <span className="text-muted">/5</span>
                        </div>
                      ) : (
                        <span key={p.id} className="text-muted">—</span>
                      )
                    )}
                  />
                  <CompareRow
                    label="الوصف"
                    cells={compared.map((p) => (
                      <span key={p.id} className="text-xs leading-relaxed">
                        {productCompareDetails[p.id]?.descriptionAr ?? "—"}
                      </span>
                    ))}
                  />
                  <CompareRow
                    label="المناسب لأنواع البشرة"
                    cells={compared.map((p) => (
                      <div key={p.id} className="flex flex-wrap justify-center gap-1">
                        {(p.skinTypes ?? p.suitableFor ?? []).length > 0
                          ? (p.skinTypes ?? p.suitableFor ?? []).map((t) => (
                              <span
                                key={t}
                                className="inline-flex rounded-full bg-success-soft border border-success-border px-2 py-0.5 text-[11px] font-medium text-success-fg"
                              >
                                {skinTypeLabels[t as SkinType] ?? t}
                              </span>
                            ))
                          : <span className="text-[11px] text-muted">جميع الأنواع</span>}
                      </div>
                    ))}
                  />
                  <CompareRow
                    label="مشاكل البشرة"
                    cells={compared.map((p) => (
                      <div key={p.id} className="flex flex-wrap justify-center gap-1">
                        {(p.skinConcerns ?? []).map((c) => (
                          <span
                            key={c}
                            className="inline-flex rounded-full bg-primary/5 border border-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                          >
                            {skinConcernLabels[c as SkinConcern] ?? c}
                          </span>
                        ))}
                      </div>
                    ))}
                  />
                  <CompareRow
                    label="المكونات الرئيسية"
                    cells={compared.map((p) => (
                      <ul key={p.id} className="space-y-1 text-xs">
                        {(productCompareDetails[p.id]?.ingredientsAr ?? [])
                          .slice(0, 4)
                          .map((ingName, i) => (
                            <li key={i} className="text-muted">
                              {ingName}
                            </li>
                          ))}
                        {(productCompareDetails[p.id]?.ingredientsAr ?? []).length > 4 && (
                          <li className="text-[11px] text-primary">
                            +{(productCompareDetails[p.id]?.ingredientsAr ?? []).length - 4} أخرى
                          </li>
                        )}
                      </ul>
                    ))}
                  />
                  <CompareRow
                    label="حالة التوفر"
                    cells={compared.map((p) => {
                      const availability = toAvailability(p.inStock);
                      if (availability === "hidden") {
                        return (
                          <div key={p.id} className="flex items-center justify-center gap-1">
                            <span className="text-xs text-muted">—</span>
                          </div>
                        );
                      }
                      return availability === "available" ? (
                        <div key={p.id} className="flex items-center justify-center gap-1">
                          <Check size={16} className="text-success" />
                          <span className="text-xs text-success-fg">متوفر</span>
                        </div>
                      ) : (
                        <div key={p.id} className="flex items-center justify-center gap-1">
                          <X size={16} className="text-error" />
                          <span className="text-xs text-muted">خلصت الكمية</span>
                        </div>
                      );
                    })}
                  />
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-card bg-muted-bg mb-6">
        <Scale size={48} className="text-border-strong" />
      </div>
      <p className="text-xl font-bold text-foreground">لم تختر منتجات للمقارنة</p>
      <p className="mt-2 text-sm text-muted max-w-sm">
        أضيفي منتجات إلى المقارنة لترى الفروقات بينها بسهولة
      </p>
    </div>
  );
}

type ProductPickerProps = {
  query: string;
  setQuery: (v: string) => void;
  suggestions: ProductSummary[];
  comparedIdsSet: Set<string>;
};

function ProductPicker({ query, setQuery, suggestions, comparedIdsSet }: ProductPickerProps) {
  return (
    <div className="rounded-card border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <Search size={16} className="text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحثي عن منتج للمقارنة..."
          className="flex-1 rounded-button border border-border bg-muted-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:ring-2 focus:ring-primary/20"
          aria-label="ابحث عن منتج للمقارنة"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {suggestions.slice(0, MAX_PICKER).map((product) => {
          const inCompare = comparedIdsSet.has(product.id);
          return (
            <div
              key={product.id}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className="relative mx-auto mt-2 aspect-square w-14 rounded-lg bg-muted-bg overflow-hidden">
                {product.gallery[0] && (
                  <ProductImage
                    src={product.gallery[0]}
                    alt={product.name.ar}
                    productId={product.id}
                    hoverZoom={false}
                    pedestal={false}
                    className="absolute inset-0 h-full w-full"
                  />
                )}
              </div>
              <div className="flex-1 p-2 text-center">
                <p className="line-clamp-1 text-[10px] font-medium text-foreground">
                  {product.brandAr || product.brand}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-gray-800">
                  {product.name.ar}
                </p>
                <p className="mt-1 text-[10px] text-primary font-medium">
                  {formatPrice(product.pricing.price)} ر.ي
                </p>
              </div>
              <div className="absolute top-1.5 end-1.5">
                <CompareButton productId={product.id} iconOnly size={12} />
              </div>
              {inCompare && (
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-success/90 text-[10px] font-bold text-white">
                  في المقارنة
                </span>
              )}
            </div>
          );
        })}
        {suggestions.slice(0, MAX_PICKER).length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-muted">
            {query.trim() ? "لم يُعثر على منتجات مطابقة" : "جارٍ تحميل المنتجات..."}
          </p>
        )}
      </div>
    </div>
  );
}
