"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Store } from "lucide-react";
import Container from "@/components/ui/Container";
import { brands as staticBrands } from "@/src/data/brands";
import { useLang } from "@/lib/use-lang";

type BrandData = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  logo: string;
  logoUnavailable?: boolean;
  originAr: string;
};

/**
 * Alphabet filter: English letters only (A-Z). Arabic names are preserved
 * in the data but never produce Arabic filter chips. Brands whose English
 * name/slug does not start with A-Z fall under "#".
 * This is the correct historical behavior — requirement §1.
 */
function getEnglishInitial(brand: BrandData): string {
  // Prefer canonical English name; fall back to slug for Arabic-named brands.
  const source = (brand.name && brand.name.trim()) || brand.slug || "";
  const firstAscii = source.trim().charAt(0).toUpperCase();
  if (/[A-Z]/.test(firstAscii)) return firstAscii;
  const slugFirst = (brand.slug || "").trim().charAt(0).toUpperCase();
  if (/[A-Z]/.test(slugFirst)) return slugFirst;
  return "#";
}

function BrandFallbackLogo({ brand }: { brand: BrandData }) {
  const label = brand.name?.trim() || brand.nameAr?.trim() || brand.slug;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-secondary-200/20 p-3 text-center">
      <span className="line-clamp-2 text-sm font-extrabold leading-tight text-primary">{label}</span>
      <span className="mt-1 text-[10px] font-medium tracking-wide text-muted">Official logo unavailable</span>
    </div>
  );
}

export default function BrandsPage() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  const [brands, setBrands] = useState<BrandData[]>(staticBrands as BrandData[]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/content/brands", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setBrands(data as BrandData[]);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const allBrands = useMemo(() =>
    brands
      .filter((b) => b.name !== "Unknown" && b.nameAr !== "ماركة غير محددة")
      .sort((a, b) => a.nameAr.localeCompare(b.nameAr)),
  [brands]);

  const brandsByInitial = useMemo(() => {
    const map = new Map<string, BrandData[]>();
    for (const brand of allBrands) {
      const initial = getEnglishInitial(brand);
      if (!map.has(initial)) map.set(initial, []);
      map.get(initial)!.push(brand);
    }
    return map;
  }, [allBrands]);

  const availableInitials = useMemo(() => {
    const initials = Array.from(brandsByInitial.keys()).sort((a, b) => {
      if (a === "#" && b !== "#") return 1;
      if (b === "#" && a !== "#") return -1;
      return a.localeCompare(b, "en");
    });
    return ["ALL", ...initials];
  }, [brandsByInitial]);

  const [activeFilter, setActiveFilter] = useState<"ALL" | string>("ALL");

  const filteredBrands = useMemo(() => {
    if (activeFilter === "ALL") return allBrands;
    return brandsByInitial.get(activeFilter) || [];
  }, [activeFilter, brandsByInitial, allBrands]);

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <div className="mb-8">
          <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-foreground">
            <Store size={24} className="text-primary" />
            {isAr ? "العلامات التجارية" : "Brands"}
          </h1>
          <p className="mb-8 text-sm text-muted">
            {isAr
              ? "اكتشفي أفضل العلامات العالمية للعناية بالبشرة"
              : "Discover the world's best skincare brands"}
          </p>
        </div>

        <div className="mb-8">
          <div className="hide-scrollbar flex flex-wrap gap-2 overflow-x-auto pb-2" role="tablist" aria-label={isAr ? "تصفية الماركات حسب الحرف" : "Filter brands by letter"}>
            {availableInitials.map((initial) => (
              <button
                key={initial}
                role="tab"
                aria-selected={activeFilter === initial}
                onClick={() => setActiveFilter(initial)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  activeFilter === initial
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-primary/40 hover:text-primary"
                }`}
              >
                {initial === "ALL" ? (isAr ? "الكل" : "ALL") : initial}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-6">
          {filteredBrands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.slug}`}
              className="group relative overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="relative aspect-square overflow-hidden bg-gray-50">
                {brand.logo && brand.logoUnavailable !== true ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={brand.logo}
                      alt={brand.nameAr}
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain" }}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = "none";
                        const fallback = target.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                    <div style={{ display: "none" }} className="absolute inset-0">
                      <BrandFallbackLogo brand={brand} />
                    </div>
                  </>
                ) : (
                  <BrandFallbackLogo brand={brand} />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              <div className="p-4 text-center">
                <p className="text-sm font-semibold text-foreground line-clamp-1 transition-colors group-hover:text-primary">
                  {brand.nameAr}
                </p>
                <p className="mt-1 text-[11px] text-muted">{brand.originAr}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/products"
            className="group inline-flex items-center gap-2 rounded-full border-2 border-dashed border-border-strong px-6 py-3 text-sm font-semibold text-muted transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
          >
            <span>{isAr ? "استعرض جميع المنتجات" : "View All Products"}</span>
            <span className="transition-transform group-hover:-translate-x-1">←</span>
          </Link>
        </div>
      </Container>
    </main>
  );
}