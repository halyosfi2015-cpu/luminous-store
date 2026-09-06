"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Pin, Ban, Package } from "lucide-react";
import Image from "next/image";

export interface ProductHit {
  slug: string;
  nameAr: string;
  nameEn: string;
  brand: string;
  image?: string | null;
}

export interface PickerOverride {
  pinned?: string[];
  excluded?: string[];
}

function useProductSearch(query: string) {
  const [hits, setHits] = useState<ProductHit[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`/api/admin/products/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d) => setHits(Array.isArray(d.results) ? d.results : []))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);
  return { hits, searching };
}

function Chip({ slug, name, image, onRemove, variant }: { slug: string; name?: string; image?: string | null; onRemove: () => void; variant: "pin" | "ban" }) {
  const isPin = variant === "pin";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-bold ${
      isPin ? "bg-primary/10 text-primary" : "bg-error/10 text-error"
    }`}>
      {isPin ? <Pin className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
      {image && (
        <span className="relative h-4 w-4 shrink-0 overflow-hidden rounded">
          <Image src={image} alt="" fill unoptimized className="object-cover" />
        </span>
      )}
      <span className="max-w-[140px] truncate">{name || slug}</span>
      <button type="button" onClick={onRemove} className="rounded-full p-0.5 hover:bg-black/10">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export default function ProductOverridePicker({
  label,
  override,
  onChange,
  allProducts,
}: {
  label: string;
  override?: PickerOverride;
  onChange: (next: PickerOverride) => void;
  allProducts?: { slug: string; nameAr: string; nameEn: string; brand: string; image?: string | null }[];
}) {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const { hits, searching } = useProductSearch(showResults ? query : "");

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const pinned = useMemo(() => override?.pinned ?? [], [override]);
  const excluded = useMemo(() => override?.excluded ?? [], [override]);
  const pinnedSet = useMemo(() => new Set(pinned), [pinned]);
  const excludedSet = useMemo(() => new Set(excluded), [excluded]);

  const productMap = useMemo(() => {
    const m = new Map<string, { nameAr: string; nameEn: string; brand: string; image?: string | null }>();
    if (allProducts) allProducts.forEach((p) => m.set(p.slug, p));
    return m;
  }, [allProducts]);

  const lookup = (slug: string) => productMap.get(slug);

  const localHits = useMemo(() => {
    if (!query.trim() || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    if (!allProducts || allProducts.length === 0) return [];
    return allProducts
      .filter((p) =>
        p.nameAr.includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.slug.includes(q)
      )
      .slice(0, 10)
      .map((p) => ({ slug: p.slug, nameAr: p.nameAr, nameEn: p.nameEn, brand: p.brand, image: p.image }));
  }, [query, allProducts]);

  const displayHits = localHits.length > 0 ? localHits : hits;

  const addPinned = (hit: ProductHit) => {
    onChange({
      pinned: pinnedSet.has(hit.slug) ? pinned : [...pinned, hit.slug],
      excluded: excluded.filter((s) => s !== hit.slug),
    });
    setQuery("");
    setShowResults(false);
  };
  const addExcluded = (slug: string) => {
    onChange({ pinned: pinned.filter((s) => s !== slug), excluded: [...excluded, slug] });
  };
  const removePinned = (slug: string) => onChange({ pinned: pinned.filter((s) => s !== slug), excluded });
  const removeExcluded = (slug: string) => onChange({ pinned, excluded: excluded.filter((s) => s !== slug) });

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted-bg/40 p-3">
      <p className="mb-2 text-xs font-bold text-foreground">
        التحكم بالمنتجات المعروضة
        <span className="mr-1 font-normal text-muted">— {label}</span>
      </p>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {pinned.length === 0 && <span className="text-[11px] text-muted">لا توجد منتجات مثبتة.</span>}
        {pinned.map((slug) => {
          const info = lookup(slug);
          return (
            <Chip
              key={slug}
              slug={slug}
              name={info ? info.nameAr : slug}
              image={info?.image}
              onRemove={() => removePinned(slug)}
              variant="pin"
            />
          );
        })}
      </div>

      {excluded.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {excluded.map((slug) => {
            const info = lookup(slug);
            return (
              <Chip
                key={slug}
                slug={slug}
                name={info ? info.nameAr : slug}
                image={info?.image}
                onRemove={() => removeExcluded(slug)}
                variant="ban"
              />
            );
          })}
        </div>
      )}

      <div ref={boxRef} className="relative">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            type="text"
            value={query}
            onFocus={() => setShowResults(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            placeholder="ابحثي بالاسم أو الماركة…"
            aria-label={`بحث المنتجات — ${label}`}
            className="w-full bg-transparent text-sm text-foreground outline-none"
          />
          {searching && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
        </div>
        {showResults && query.trim().length >= 2 && (
          <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-white shadow-lg">
            {displayHits.length === 0 && !searching && (
              <li className="px-3 py-2.5 text-xs text-muted">لا نتائج مطابقة.</li>
            )}
            {displayHits.map((hit) => (
              <li key={hit.slug}>
                <div className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-primary/5">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {hit.image && (
                      <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded bg-gray-100">
                        <Image src={hit.image} alt="" fill unoptimized className="object-cover" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                      {hit.nameAr || hit.nameEn}
                      <span className="mr-1 text-[10px] font-normal text-muted">{hit.brand}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addPinned(hit)}
                    disabled={pinnedSet.has(hit.slug)}
                    className="shrink-0 rounded-lg border border-primary px-2 py-1 text-[10px] font-bold text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-40"
                  >
                    تثبيت
                  </button>
                  <button
                    type="button"
                    onClick={() => addExcluded(hit.slug)}
                    disabled={excludedSet.has(hit.slug)}
                    className="shrink-0 rounded-lg border border-error/50 px-2 py-1 text-[10px] font-bold text-error transition-colors hover:bg-error hover:text-white disabled:opacity-40"
                  >
                    استبعاد
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
