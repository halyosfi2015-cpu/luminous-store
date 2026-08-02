"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Search, X, TrendingUp, Clock, PackageSearch, Star } from "lucide-react";
import Link from "next/link";
import { useSearch } from "@/context/SearchContext";
import { products } from "@/lib/products";
import type { Product } from "@/types/product";

const trendingSearches = [
  "سيروم فيتامين سي",
  "واقي شمس",
  "مرطب",
  "منظف وجه",
  "نياسيناميد",
];

const STORAGE_KEY = "luminous-recent-searches";

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecent(searches: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(searches.slice(0, 10))); } catch {}
}

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

function SearchOverlayInner({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecent());
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

    const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.name.ar.includes(q) ||
        p.name.en.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.categoryAr && p.categoryAr.includes(q))
    );
  }, [query]);

  const handleSelect = (term: string) => {
    const updated = [term, ...recentSearches.filter((s) => s !== term)];
    setRecentSearches(updated);
    saveRecent(updated);
    setQuery(term);
  };

  const clearRecent = () => {
    setRecentSearches([]);
    saveRecent([]);
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="البحث عن المنتجات"
      className="fixed inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full bg-card shadow-elevated" dir="rtl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحثي عن منتجاتك، ماركتك، أو تصنيفك المفضل..."
              aria-label="بحث"
              autoComplete="off"
              className="h-12 w-full rounded-button border border-border bg-muted-bg ps-5 pe-12 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary-light focus:bg-card"
            />
            <Search size={18} className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق البحث"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-6 sm:px-6">
          {query.trim() === "" && (
            <>
              {recentSearches.length > 0 && (
                <section className="mb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Clock size={16} className="text-muted" />
                      عمليات البحث الأخيرة
                    </h3>
                    <button
                      type="button"
                      onClick={clearRecent}
                      className="text-xs text-muted transition-colors hover:text-foreground"
                    >
                      مسح الكل
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => handleSelect(term)}
                        className="rounded-full border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-primary/30 hover:text-foreground"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <TrendingUp size={16} className="text-muted" />
                  الأكثر بحثاً
                </h3>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleSelect(term)}
                      className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm text-primary transition-colors hover:bg-primary/10"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {query.trim() !== "" && results.length === 0 && (
            <div role="status" className="flex flex-col items-center justify-center py-16 text-center">
              <PackageSearch size={48} className="text-muted/30" />
              <p className="mt-4 text-base font-medium text-muted">
                لا توجد نتائج لـ &quot;{query}&quot;
              </p>
              <p className="mt-1 text-sm text-muted">
                تحققي من الإملاء أو جربي كلمة بحث مختلفة
              </p>
            </div>
          )}

          {query.trim() !== "" && results.length > 0 && (
            <section aria-label="نتائج البحث">
              <p className="mb-3 text-xs text-muted" role="status">{results.length} نتيجة</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {results.map((product) => (
                  <SearchResultCard key={product.id} product={product} onSelect={onClose} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchResultCard({ product, onSelect }: { product: Product; onSelect: () => void }) {
  const fullStars = Math.floor(product.rating);

  return (
    <Link
      href={`/products/${product.slug}`}
      onClick={onSelect}
      aria-label={`${product.name.ar} - ${formatPrice(product.pricing.price)} ريال`}
      className="flex gap-3 rounded-card border border-border bg-card p-3 shadow-card transition-colors hover:border-primary/20 hover:shadow-card-hover"
    >
      <div className="h-16 w-16 shrink-0 rounded-lg bg-muted-bg overflow-hidden" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-primary">{product.brand}</p>
        <p className="truncate text-sm font-medium text-foreground">{product.name.ar}</p>
        <div className="mt-0.5 flex items-center gap-1" aria-label={`التقييم ${product.rating} من 5`}>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={11} className={i < fullStars ? "fill-accent text-accent" : "text-border-strong"} />
            ))}
          </div>
          <span className="text-[10px] text-muted">({product.reviewCount ?? product.rating})</span>
        </div>
        <p className="mt-0.5 text-xs font-semibold text-foreground">
          {formatPrice(product.pricing.price)} ر.ي
        </p>
      </div>
    </Link>
  );
}

export default function SearchOverlay() {
  const { isOpen, closeSearch } = useSearch();

  if (!isOpen) return null;

  return <SearchOverlayInner onClose={closeSearch} />;
}
