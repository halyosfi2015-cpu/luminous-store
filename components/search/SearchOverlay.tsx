"use client";

import { useEffect, useState, useRef, useMemo, useDeferredValue } from "react";
import { Search, X, TrendingUp, Clock, PackageSearch, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useSearch } from "@/context/SearchContext";
import { productSummaries } from "@/src/data/product-summaries";
import CommercePrice from "@/components/product/CommercePrice";
import { getTaxonomyCategoryCards, type TaxonomyCategoryCard } from "@/src/lib/taxonomy";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";
import type { ProductSummary } from "@/src/types/product";

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



/** Normalize Arabic text for smart matching (strip diacritics, unify alef/hamza/taa). */
function normalizeAr(value: string): string {
  return value
    .replace(/[\u064B-\u0652\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

type Suggestion = {
  type: "product" | "brand" | "category";
  product?: ProductSummary;
  brand?: string;
  category?: { slug: string; nameAr: string; nameEn: string };
  score: number;
};

/** Pre-normalized product fields — built ONCE per catalog so typing never
    re-normalizes thousands of strings (the cause of "Page Unresponsive"). */
type IndexedProduct = {
  p: ProductSummary;
  nameAr: string;
  nameEn: string;
  brandAr: string;
  brandEn: string;
  catAr: string;
  catEn: string;
  tags: string[];
};

function buildIndex(products: ProductSummary[]): IndexedProduct[] {
  return products.map((p) => ({
    p,
    nameAr: normalizeAr(p.name.ar),
    nameEn: p.name.en.toLowerCase(),
    brandAr: normalizeAr(p.brandAr ?? p.brand),
    brandEn: p.brand.toLowerCase(),
    catAr: normalizeAr(p.categoryAr ?? p.category),
    catEn: p.category.toLowerCase(),
    tags: (p.tags ?? []).map((t) => normalizeAr(t)),
  }));
}

/** Score a pre-indexed product against a query. Higher = better match. */
function scoreIndexed(x: IndexedProduct, nq: string, q: string): number {
  if (!nq) return -1;
  const { nameAr, nameEn, brandAr, brandEn, catAr, catEn, tags } = x;
  let score = -1;

  // Exact / prefix matches rank highest
  if (nameAr === nq || nameEn === q) score = 1000;
  else if (nameAr.startsWith(nq) || nameEn.startsWith(q)) score = 900;
  else if (nameAr.includes(nq) || nameEn.includes(q)) score = 700;

  // Brand matches
  if (brandAr.startsWith(nq) || brandEn.startsWith(q)) score = Math.max(score, 600);
  else if (brandAr.includes(nq) || brandEn.includes(q)) score = Math.max(score, 450);

  // Category matches
  if (catAr.includes(nq) || catEn.includes(q)) score = Math.max(score, 350);

  // Keyword matches (e.g. "كولاجين")
  if (tags.some((t) => t.includes(nq))) score = Math.max(score, 300);

  return score;
}

function SearchOverlayInner({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  // Defer heavy filtering so typing never janks the keyboard on low-end phones
  const deferredQuery = useDeferredValue(query);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecent());
  const [taxonomyCategories, setTaxonomyCategories] = useState<TaxonomyCategoryCard[]>(() => getTaxonomyCategoryCards());
  const [catalogProducts, setCatalogProducts] = useState<ProductSummary[]>(productSummaries);
  const searchIndex = useMemo(() => buildIndex(catalogProducts), [catalogProducts]);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Retry focus: mobile browsers often ignore the first programmatic
    // focus, leaving the keyboard closed ("stuck").
    const raf = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    const retry = setTimeout(() => {
      if (document.activeElement !== inputRef.current) inputRef.current?.focus({ preventScroll: true });
    }, 350);
    return () => { cancelAnimationFrame(raf); clearTimeout(retry); };
  }, []);

  useEffect(() => {
    fetch("/api/content/products?limit=1000", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.products) && data.products.length > 0) {
          setCatalogProducts(data.products as ProductSummary[]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/content/taxonomy", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.categoryCards) && data.categoryCards.length > 0) {
          setTaxonomyCategories(data.categoryCards);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const rawQ = deferredQuery.trim();
    if (rawQ.length < 1) return [];
    const nq = normalizeAr(rawQ);
    const q = rawQ.toLowerCase();

    const productHits: Suggestion[] = [];
    const brandMap = new Map<string, number>();

    for (const x of searchIndex) {
      const score = scoreIndexed(x, nq, q);
      if (score < 0) continue;
      productHits.push({ type: "product", product: x.p, score });
      if (x.p.brand && !brandMap.has(x.p.brand)) brandMap.set(x.p.brand, Math.max(0, score - 200));
    }

    const brandHits: Suggestion[] = [...brandMap.entries()]
      .map(([brand, score]) => ({ type: "brand" as const, brand, score }));

    const catHits: Suggestion[] = taxonomyCategories
      .map((cat) => ({
        cat,
        score: Math.max(
          normalizeAr(cat.nameAr).includes(nq) || normalizeAr(cat.name).includes(nq) ? 380 : -1,
          normalizeAr(cat.nameAr).startsWith(nq) || normalizeAr(cat.name).startsWith(nq) ? 450 : -1,
        ),
      }))
      .filter((x) => x.score >= 0)
      .map(({ cat, score }) => ({ type: "category" as const, category: { slug: cat.slug, nameAr: cat.nameAr, nameEn: cat.name }, score }));

    return [...brandHits, ...catHits, ...productHits]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [deferredQuery, taxonomyCategories, searchIndex]);

  const results = useMemo(() => {
    const rawQ = deferredQuery.trim();
    if (!rawQ) return [];
    const nq = normalizeAr(rawQ);
    const q = rawQ.toLowerCase();
    return searchIndex
      .map((x) => ({ p: x.p, score: scoreIndexed(x, nq, q) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p);
  }, [deferredQuery, searchIndex]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim().length >= 2) {
      trackClient({
        event_type: ANALYTICS_EVENT_TYPES.SEARCH,
        properties: { query: query.trim(), result_count: suggestions.length },
      });
    }
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const s = suggestions[activeIndex];
      if (s.type === "product" && s.product) {
        const term = s.product.name.ar;
        const updated = [term, ...recentSearches.filter((x) => x !== term)];
        setRecentSearches(updated);
        saveRecent(updated);
        onClose();
        window.location.href = `/products/${s.product.slug}`;
      } else if (s.type === "brand" && s.brand) {
        const term = s.brand;
        const updated = [term, ...recentSearches.filter((x) => x !== term)];
        setRecentSearches(updated);
        saveRecent(updated);
        onClose();
        window.location.href = `/search?q=${encodeURIComponent(term)}`;
      } else if (s.type === "category" && s.category?.slug) {
        onClose();
        window.location.href = `/categories/${s.category.slug}`;
      }
    }
  };

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

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="البحث عن المنتجات"
      className="fixed inset-0 z-[60] flex flex-col bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-h-[100dvh] overflow-y-auto overscroll-contain bg-card shadow-elevated" dir="rtl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleKeyDown}
              placeholder="ابحثي عن منتجاتك، ماركتك، أو تصنيفك المفضل..."
              aria-label="بحث"
              aria-controls="search-suggestions"
              aria-activedescendant={activeIndex >= 0 ? `search-suggestion-${activeIndex}` : undefined}
              autoComplete="off"
              className="h-12 w-full rounded-button border border-border bg-muted-bg ps-5 pe-12 text-base text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary-light focus:bg-card sm:text-sm"
            />
            <Search size={18} className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق البحث"
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-6 sm:px-6">
          {/* Live smart suggestions */}
          {query.trim() !== "" && suggestions.length > 0 && (
            <section aria-label="اقتراحات البحث" className="mb-6">
                  <div id="search-suggestions" ref={listRef} role="listbox" aria-label="اقتراحات البحث" className="overflow-hidden rounded-card border border-border bg-card shadow-card">
                {suggestions.map((s, index) => (
                  <button
                    key={`${s.type}-${s.product?.id ?? s.brand ?? s.category?.slug}`}
                    id={`search-suggestion-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      if (s.type === "product" && s.product) {
                        const term = s.product.name.ar;
                        const updated = [term, ...recentSearches.filter((x) => x !== term)];
                        setRecentSearches(updated);
                        saveRecent(updated);
                        onClose();
                        window.location.href = `/products/${s.product.slug}`;
                      } else if (s.type === "brand" && s.brand) {
                        const term = s.brand;
                        const updated = [term, ...recentSearches.filter((x) => x !== term)];
                        setRecentSearches(updated);
                        saveRecent(updated);
                        onClose();
                        window.location.href = `/search?q=${encodeURIComponent(term)}`;
                      } else if (s.category?.slug) {
                        onClose();
                        window.location.href = `/categories/${s.category.slug}`;
                      }
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-start transition-colors ${
                      index === activeIndex ? "bg-primary/5" : ""
                    } ${index > 0 ? "border-t border-border/50" : ""}`}
                  >
                    {s.type === "product" && s.product ? (
                      <>
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted-bg">
                          {s.product.gallery[0] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.product.gallery[0]} alt={s.product.name.ar} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{s.product.name.ar}</p>
                          <p className="text-xs text-muted">{s.product.brand}</p>
                        </div>
                        <CommercePrice product={s.product} className="shrink-0 text-xs font-semibold text-primary" originalClassName="hidden" />
                      </>
                    ) : s.type === "brand" ? (
                      <>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Search size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{s.brand}</p>
                          <p className="text-xs text-muted">ماركة</p>
                        </div>
                        <ChevronLeft size={16} className="shrink-0 text-muted" />
                      </>
                    ) : (
                      <>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                          <PackageSearch size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{s.category?.nameAr}</p>
                          <p className="text-xs text-muted">تصنيف</p>
                        </div>
                        <ChevronLeft size={16} className="shrink-0 text-muted" />
                      </>
                    )}
                  </button>
                ))}
                <Link
                  href={`/search?q=${encodeURIComponent(query.trim())}`}
                  onClick={onClose}
                  className="flex w-full items-center justify-center gap-2 border-t border-border bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  <Search size={14} />
                  عرض جميع النتائج ({results.length})
                </Link>
              </div>
            </section>
          )}

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
                        className="rounded-full border border-border px-4 py-2.5 min-h-[44px] text-sm text-muted transition-colors hover:border-primary/30 hover:text-foreground"
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
                      className="rounded-full border border-primary/20 bg-primary/5 px-4 py-2.5 min-h-[44px] text-sm text-primary transition-colors hover:bg-primary/10"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {query.trim() !== "" && suggestions.length === 0 && (
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
        </div>
      </div>
    </div>
  );
}

export default function SearchOverlay() {
  const { isOpen, closeSearch } = useSearch();

  if (!isOpen) return null;

  return <SearchOverlayInner onClose={closeSearch} />;
}
