"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { brands as staticBrands } from "@/lib/content";
import { useLang } from "@/lib/use-lang";
import { useSectionContent } from "@/components/site-content/SiteContentProvider";
import BrandLogo from "@/components/brand/BrandLogo";

type BrandData = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  logo: string;
  originAr: string;
  featured: boolean;
};

const t = (isAr: boolean, ar: string, en: string) => (isAr ? ar : en);

export default function Brands() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const content = useSectionContent("brands");

  const [allBrands, setAllBrands] = useState<BrandData[]>(staticBrands as BrandData[]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/content/brands", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setAllBrands(data as BrandData[]);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const featuredBrands = allBrands.filter((b) => b.featured);

  const [activeFilter, setActiveFilter] = useState<"ALL" | string>("ALL");

  if (!content.visible) return null;

  const displayBrands = featuredBrands.slice(0, 20);
  const looped = [...displayBrands, ...displayBrands, ...displayBrands];

  return (
    <section id="brands" className="w-full scroll-mt-28 bg-white py-4 sm:py-6 lg:py-8" dir={isAr ? "rtl" : "ltr"}>
      <Container className="[&_h2]:text-2xl sm:[&_h2]:text-3xl [&_div.mb-10]:mb-4">
        <SectionTitle
          eyebrow={<>
            <span className="h-0.5 w-6 rounded-pill bg-accent" />
            {t(isAr, content.eyebrowAr, content.eyebrowEn)}
          </>}
          title={t(isAr, content.titleAr, content.titleEn)}
          subtitle={t(isAr, content.subtitleAr, content.subtitleEn)}
          action={
            <Link
              href="/brands"
              className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
            >
              {t(isAr, "عرض الكل", "View All")}
            </Link>
          }
        />
      </Container>

      <div className="relative">
        <div className="relative overflow-hidden py-1" dir="ltr">
          <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-10 bg-gradient-to-r from-white via-white/60 to-transparent sm:w-16" />
          <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-10 bg-gradient-to-l from-white via-white/60 to-transparent sm:w-16" />

          <div
            role="region"
            aria-label={t(isAr, "العلامات التجارية", "Brands")}
            className="flex w-max gap-4 animate-marquee"
            style={{ animationDuration: "60s" }}
          >
            {looped.map((brand, i) => (
              <Link
                  key={`${brand.id}-${i}`}
                  href={`/brands/${brand.slug}`}
                  title={brand.nameAr}
                  aria-label={brand.nameAr}
                  className="group relative w-28 shrink-0 transition-all duration-300 ease-out-smooth hover:-translate-y-1 sm:w-32"
                >
              <div className="relative aspect-square overflow-hidden" title={brand.nameAr}>
                <BrandLogo src={brand.logo} nameEn={brand.name} nameAr={brand.nameAr} />
              </div>
            </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <Link
          href="/brands"
          className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all duration-300 ease-out-smooth hover:bg-primary-700 hover:shadow-primary/40 active:scale-95"
        >
          <span>{isAr ? "استعرض جميع الماركات" : "View All Brands"}</span>
          <span className="transition-transform group-hover:-translate-x-1">←</span>
        </Link>
      </div>
    </section>
  );
}
