"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import MobileReveal from "@/components/ui/MobileReveal";
import { brands as staticBrands } from "@/lib/content";
import { useLang } from "@/lib/use-lang";
import { useSectionContent } from "@/components/site-content/SiteContentProvider";

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

/** Marquee tile: renders ONLY a confirmed-real logo image.
    While loading it keeps its width invisible; on error it vanishes —
    never a name-only fallback tile. */
function BrandTile({ brand, tileClass }: { brand: BrandData; tileClass: string }) {
  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
  if (!brand.logo || state === "fail") return null;
  return (
    <Link
      href={`/brands/${brand.slug}`}
      title={brand.nameAr}
      aria-label={brand.nameAr}
      className={`luminous-shine group relative shrink-0 overflow-hidden rounded-2xl text-center transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:[filter:drop-shadow(0_10px_18px_rgba(75,42,111,0.30))] ${tileClass} ${state === "loading" ? "invisible" : ""}`}
    >
      <div className="relative aspect-square overflow-hidden transition-transform duration-300 group-hover:scale-105" title={brand.nameAr}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brand.logo}
          alt={brand.nameAr}
          loading="lazy"
          draggable={false}
          className="h-full w-full object-contain p-2"
          onLoad={() => setState("ok")}
          onError={() => setState("fail")}
        />
      </div>
    </Link>
  );
}

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

  // Merchandising curation (reversible): home marquee shows global brands
  // with distinctive logos only.
  const GLOBAL_BRAND_SLUGS = new Set([
    "loreal-paris", "garnier", "bioderma", "maybelline", "dove", "eucerin",
    "vaseline", "vichy", "cerave", "nivea", "la-roche-posay", "cosrx",
    "nyx", "gillette", "rexona", "colgate", "oral-b", "cetaphil",
    "the-ordinary", "bourjois", "essence", "herbal-essences", "palmers",
    "st-ives", "carmex", "qv", "uriage", "eveline", "filorga", "flormar",
    "beesline", "medicube", "beauty-of-joseon", "skin1004", "some-by-mi",
    "numbuzin", "crest", "labello", "old-spice", "garnier", "now-foods",
    "california-gold-nutrition", "giovanni", "dr-melaxin", "uni-pro",
    "arm-hammer", "eveline", "acure", "vitabiotics", "optimal",
    "sheamoisture", "parachute", "abdul-samad-alqurashi", "ajmal",
    "puretto", "the-balm", "filorga",
  ]);
  const globalBrands = featuredBrands.filter((b) => GLOBAL_BRAND_SLUGS.has(b.slug));

  const [activeFilter, setActiveFilter] = useState<"ALL" | string>("ALL");
  const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set());

  // Probe logo URLs: brands without a loadable colored image are hidden
  useEffect(() => {
    let cancelled = false;
    featuredBrands.forEach((b) => {
      if (!b.logo || failedLogos.has(b.logo)) return;
      const img = new window.Image();
      img.onerror = () => {
        if (!cancelled) {
          setFailedLogos((prev) => {
            if (prev.has(b.logo)) return prev;
            const next = new Set(prev);
            next.add(b.logo);
            return next;
          });
        }
      };
      img.src = b.logo;
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allBrands]);

  if (!content.visible) return null;

  const displayBrands = (globalBrands.length > 0 ? globalBrands : featuredBrands)
    .filter((b) => b.logo && !failedLogos.has(b.logo)).slice(0, 32);
  const looped = [...displayBrands, ...displayBrands, ...displayBrands];

  return (
    <section id="brands" className="hide-sub-m w-full scroll-mt-28 bg-white py-2 sm:py-6 lg:py-8" dir={isAr ? "rtl" : "ltr"}>
          <Container className="[&_h2]:text-[22px] sm:[&_h2]:text-3xl [&_div.mb-10]:mb-4">
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
              className="group inline-flex items-center gap-1 rounded-pill border border-border px-3 py-1.5 min-h-[36px] text-xs font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
            >
              {t(isAr, "عرض الكل", "View All")}
            </Link>
          }
        />
      </Container>

      <Container className="bg-transparent">
      <MobileReveal delay={100}>
      <div className="relative">
        <div className="relative overflow-hidden py-1" dir="ltr">
          <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-6 bg-gradient-to-r from-white via-white/60 to-transparent sm:w-16" />
          <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-6 bg-gradient-to-l from-white via-white/60 to-transparent sm:w-16" />

          {/* Looping marquee on all screens (30+ logos, pauses on touch) */}
          <div
            role="region"
            aria-label={t(isAr, "العلامات التجارية", "Brands")}
            className="magic-stagger flex w-max gap-6 animate-marquee motion-reduce:animate-none hover:[animation-play-state:paused] active:[animation-play-state:paused] sm:gap-8"
            style={{ animationDuration: "70s" }}
          >
            {looped.map((brand, i) => (
              <BrandTile key={`${brand.id}-${i}`} brand={brand} tileClass="w-28 sm:w-44" />
            ))}
          </div>
        </div>
      </div>
      </MobileReveal>
      </Container>

    </section>
  );
}
