"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { Star, Clock, Users, ShoppingBag, Flame } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import ProductImage from "@/components/product/ProductImage";
import { useLang } from "@/lib/use-lang";
import { useProducts } from "@/hooks/useProducts";
import { safeRatingDisplay, safeReviewCountDisplay, safeBuyersDisplay } from "@/lib/ratings";
import { getRoutines, getRoutineTypes, resolveRoutineProducts } from "@/src/data/routines-store";
import { useSectionContent } from "@/components/site-content/SiteContentProvider";
import type { Routine, RoutineLevel } from "@/types/product";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

const LEVEL_META: Record<RoutineLevel, { ar: string; en: string; color: string; badge: string }> = {
  basic: {
    ar: "أساسي",
    en: "Essential",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badge: "من emerald-500 to-teal-500",
  },
  standard: {
    ar: "قياسي",
    en: "Standard",
    color: "bg-sky-50 text-sky-700 border-sky-200",
    badge: "from-sky-500 to-blue-500",
  },
  premium: {
    ar: "متقدم",
    en: "Premium",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    badge: "from-purple-500 to-fuchsia-500",
  },
};

const TYPE_META: Record<string, { icon: string }> = {
  daily: { icon: "from-amber-100 to-orange-100" },
  brightening: { icon: "from-pink-100 to-rose-100" },
  acne: { icon: "from-red-100 to-rose-100" },
  dryness: { icon: "from-sky-100 to-cyan-100" },
  oiliness: { icon: "from-teal-100 to-emerald-100" },
  firming: { icon: "from-violet-100 to-purple-100" },
  sensitivity: { icon: "from-green-100 to-emerald-100" },
  eye: { icon: "from-indigo-100 to-blue-100" },
};

export default function RoutinesSection() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { products: apiProducts } = useProducts();
  const content = useSectionContent("routines");
  const [routines, setRoutines] = useState<Routine[]>(() => getRoutines());
  // Type tabs derive from the live routines list (static seed or admin Supabase data)
  const types = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of routines) {
      if (!seen.has(r.type)) seen.set(r.type, r.typeAr);
    }
    return Array.from(seen, ([type, typeAr]) => ({ type, typeAr }));
  }, [routines]);

  // Admin routines (Supabase) override the static seed once loaded.
  // Empty/error response keeps the built-in defaults — never renders fake data.
  const fetchRoutines = useCallback(async () => {
    try {
      const res = await fetch("/api/content/routines", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.routines) && data.routines.length > 0) {
        setRoutines(data.routines as Routine[]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchRoutines();
    return () => { cancelled = true };
  }, [fetchRoutines]);

  // Refetch when tab becomes visible again (catches admin edits).
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden) fetchRoutines();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [fetchRoutines]);
  const [activeType, setActiveType] = useState<string>("all");
  const [activeLevel, setActiveLevel] = useState<RoutineLevel | "all">("all");

  // Entrance animation only on first render — disabled once any filter is clicked
  const [hasFiltered, setHasFiltered] = useState(false);

  const filtered = useMemo(() => {
    const seen = new Set<string>();
    return routines
      .filter((r) => activeType === 'all' ? true : r.type === activeType)
      .filter((r) => activeLevel === "all" || (r.level ?? "standard") === activeLevel)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .filter((r) => {
        const key = r.slug || r.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [routines, activeType, activeLevel]);

  const hasLevels = useMemo(
    () => routines.filter((r) => r.type === activeType).some((r) => r.level),
    [routines, activeType]
  );

  // Slider (auto-advancing slides, one routine per slide, fast speed)
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideW, setSlideW] = useState(400);
  const [snap, setSnap] = useState(false);
  // viewport width in state (set client-side only) to avoid SSR/CSR hydration mismatch
  const [viewWidth, setViewWidth] = useState(1280);
  useEffect(() => {
    const update = () => setViewWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  // duplicate list so the slider can loop seamlessly
  const looped = useMemo(() => {
    if (!filtered.length) return filtered;
    // For small lists (type+level filter), show each routine once — no cloning
    if (filtered.length <= 4) return filtered;
    const cardWidth = 490;
    const copies = Math.max(2, Math.ceil(viewWidth / (filtered.length * cardWidth)));
    return Array.from({ length: copies }, () => filtered).flat();
  }, [filtered, viewWidth]);

  const isSmallView = looped.length <= 4;

useEffect(() => {
    const update = () => {
      const el = trackRef.current;
      if (el) {
        const card = el.querySelector("[data-slide-card]");
        if (card) setSlideW((card as HTMLElement).offsetWidth);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [looped]);

  // Auto-advance always (was only for "الكل")
  const isAutoScrolling = filtered.length > 0;
  useEffect(() => {
    if (!isAutoScrolling) return;
    const id = setInterval(() => setSlideIndex((i) => i + 1), 3200);
    return () => clearInterval(id);
  }, [isAutoScrolling, filtered.length]);

  // seamless loop: after crossing one full set, snap back to the start without animation
  useEffect(() => {
    if (slideIndex >= filtered.length) {
      const t = setTimeout(() => {
        setSnap(true);
        setSlideIndex(slideIndex % filtered.length);
        setTimeout(() => {
          setSnap(false);
        }, 50);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [slideIndex, filtered.length]);

  // Jump instantly to the start of the list when the active filter changes
  // (no sliding/jumping movement) — only the unfiltered "الكل" view auto-advances.
  const resetSlider = () => {
    setSnap(true);
    setSlideIndex(0);
    window.setTimeout(() => setSnap(false), 100);
  };

  if (types.length === 0) return null;
  if (!content.visible) return null;

  return (
    <section id="routines" className="w-full scroll-mt-28 bg-gradient-to-b from-white via-primary/5 to-white py-8 sm:py-10 lg:py-12">
      <Container>
        <SectionTitle
          eyebrow={isAr ? content.eyebrowAr : content.eyebrowEn}
          title={isAr ? content.titleAr : content.titleEn}
          subtitle={isAr ? content.subtitleAr : content.subtitleEn}
          action={
            <Link
              href="/products"
              className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
            >
              {isAr ? "تصفحي المنتجات" : "Browse Products"}
            </Link>
          }
        />

        {/* Type tabs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          {/* All tab */}
          <button
            type="button"
            onClick={() => {
              setActiveType("all");
              setActiveLevel("all");
              setHasFiltered(true);
              resetSlider();
            }}
            className={`group inline-flex items-center gap-2 rounded-pill border px-3 py-2 text-xs font-bold transition-all duration-200 ease-out-smooth ${
              activeType === "all"
                ? "border-primary bg-primary text-white shadow-md shadow-primary/30"
                : "border-border bg-card text-muted hover:border-primary/40 hover:text-primary"
            }`}
          >
            <span>{isAr ? "الكل" : "All"}</span>
          </button>

          {types.map((t) => {
            const isActive = activeType === t.type;
            return (
              <button
                key={t.type}
                type="button"
                onClick={() => {
                  setActiveType(t.type);
                  setActiveLevel("all");
                  setHasFiltered(true);
                  resetSlider();
                }}
                className={`group inline-flex items-center gap-2 rounded-pill border px-3 py-2 text-xs font-bold transition-all duration-200 ease-out-smooth ${
                  isActive
                    ? "border-primary bg-primary text-white shadow-md shadow-primary/30"
                    : "border-border bg-card text-muted hover:border-primary/40 hover:text-primary"
                }`}
              >
                <span>{t.typeAr}</span>
              </button>
            );
          })}
        </div>

        {/* Level tabs */}
        {hasLevels && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <LevelTab
              active={activeLevel === "all"}
              onClick={() => {
                setActiveLevel("all");
                setHasFiltered(true);
                resetSlider();
              }}
              label={isAr ? "الكل" : "All"}
            />
            {(Object.keys(LEVEL_META) as RoutineLevel[]).map((lv) => (
              <LevelTab
                key={lv}
                active={activeLevel === lv}
                onClick={() => {
                  setActiveLevel(lv);
                  setHasFiltered(true);
                  resetSlider();
                }}
                label={isAr ? LEVEL_META[lv].ar : LEVEL_META[lv].en}
              />
            ))}
          </div>
        )}
      </Container>

      {/* Routine cards — fast auto-advancing slider, kept inside viewport with edge breathing room */}
      <div className="mx-auto mt-8 w-full max-w-[1800px] px-4 sm:px-6 lg:px-8">
        <div className="relative" dir="ltr">
          {/* Edge fades — cards that peek out dissolve instead of being hard-cut */}
          <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-10 bg-gradient-to-r from-white to-transparent sm:w-16" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-10 bg-gradient-to-l from-white to-transparent sm:w-16" aria-hidden="true" />

          <div className="overflow-hidden py-6" role="region" aria-label={isAr ? 'روتينات متحركة' : 'Routines showcase'}>
            <div
              ref={trackRef}
              className={`flex will-change-transform ${isSmallView ? 'w-full justify-center' : 'w-max'}`}
              style={{
                transform: isSmallView
                  ? 'none'
                  : `translate3d(${-slideIndex * slideW}px, 0, 0)`,
                transition: snap ? "none" : "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {looped.map((routine, idx) => (
                <div
                  key={`${routine.id}-${idx}`}
                  data-slide-card
                  dir="rtl"
                  className="inline-block w-[80vw] max-w-[420px] shrink-0 sm:w-[400px] lg:w-[440px]"
                  style={{ paddingInlineEnd: 20 }}
                >
                   <RoutineCard routine={routine} index={idx % filtered.length} isAr={isAr} animate={!hasFiltered} allProducts={apiProducts} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Container>
        <div className="mt-10 text-center">
          <Link
            href="/routines"
            className="inline-flex items-center gap-2 rounded-pill border border-primary/30 bg-primary/5 px-6 py-3 text-sm font-bold text-primary transition-all duration-200 ease-out-smooth hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20"
          >
            <ShoppingBag size={16} />
            {isAr ? "تصفحي جميع الروتينات" : "Browse All Routines"}
          </Link>
        </div>
      </Container>
    </section>
  );
}

function LevelTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-pill border px-3 py-1 text-[11px] font-bold transition-all duration-200 ease-out-smooth ${
        active
          ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
          : "border-border bg-transparent text-muted hover:border-primary/30 hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}

function RoutineCard({
  routine,
  index,
  isAr,
  animate,
  allProducts,
}: {
  routine: Routine;
  index: number;
  isAr: boolean;
  animate: boolean;
  allProducts?: import("@/src/types/product").ProductSummary[];
}) {
  const routineProducts = resolveRoutineProducts(routine, allProducts ?? []);
  // Filter to only products with a valid real image (gallery[0] present + verified)
  const validProducts = routineProducts.filter((p) => p.gallery?.[0]);
  const totalPrice = validProducts.reduce((sum, p) => sum + p.pricing.price, 0);
  const discountedPrice = Math.round(totalPrice * (1 - routine.savingsPercent / 100));
  const level = (routine.level ?? "standard") as RoutineLevel;
  const levelMeta = LEVEL_META[level];

  return (
    <Link
      href={`/routines/${routine.id}`}
      className="group relative flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-card-hover"
      style={{ animation: animate ? `slideUp 0.5s cubic-bezier(0.23, 1, 0.32, 1) ${index * 70}ms both` : 'none' }}
    >
      {/* Image — only valid real images, no placeholders */}
      <div className="relative h-48 overflow-hidden bg-gray-100 sm:h-56">
        {validProducts.length > 0 ? (
          <div className="flex h-full w-full items-stretch">
            {validProducts.slice(0, 4).map(
              (p) =>
                p.gallery?.[0] && (
                  <div key={p.id} className="relative min-w-0 flex-1 overflow-hidden">
                    <ProductImage
                      src={p.gallery[0]}
                      alt={p.name.ar}
                      productId={p.id}
                      variant="clean"
                      hoverZoom={false}
                      pedestal={false}
                      className="absolute inset-0 h-full w-full"
                      sizes="220px"
                    />
                  </div>
                )
            )}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {/* No placeholder — per requirement, if no valid image, show nothing */}
            {/* The routine card still displays info below */}{" "}
          </div>
        )}
      </div>

        {/* Level badge */}
        <div className="absolute top-3 start-3 z-10">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold backdrop-blur-sm ${levelMeta.color}`}
          >
            <Flame size={9} className="fill-current" />
            {levelMeta.ar}
          </span>
        </div>

        {/* Savings badge */}
        <div className="absolute top-3 end-3 z-10">
          <span className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-rose-600 shadow-sm backdrop-blur-sm">
            {isAr ? "توفير" : "save"}
          </span>
        </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5 space-y-4">
        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-base font-medium text-gray-900 tracking-wide line-clamp-1 transition-colors duration-300 group-hover:text-primary">
            {routine.nameAr}
          </h3>
          <p className="text-sm font-light leading-relaxed text-muted line-clamp-2">{routine.descriptionAr}</p>
        </div>

        {/* Product count + type indicator */}
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2 space-x-reverse">
            {routineProducts.slice(0, 3).map(
              (p) =>
                p.gallery?.[0] && (
                  <span
                    key={p.id}
                    className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-card bg-card shadow-sm ring-1 ring-white"
                  >
                    <ProductImage
                      src={p.gallery[0]}
                      alt={p.name.ar}
                      productId={p.id}
                      variant="clean"
                      hoverZoom={false}
                      pedestal={false}
                      className="absolute inset-0 h-full w-full"
                    />
                  </span>
                )
            )}
          </div>
          {/* Routine type badge */}
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-600">
            {TYPE_META[routine.type] ? routine.type : "روتين"}
          </span>
        </div>

        {/* Meta — rating, buyers, duration (numbers removed per request) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Star size={13} className="fill-amber-400 text-amber-400 shrink-0" />
            <span className="font-medium text-gray-600">{isAr ? "تقييم ممتاز" : "Excellent"}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Users size={13} className="shrink-0" />
            <span className="text-gray-400">{isAr ? "عميلات راضيات" : "happy clients"}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Clock size={13} className="shrink-0" />
            <span className="font-medium text-gray-600">{isAr ? "روتين يومي" : "daily routine"}</span>
          </span>
        </div>

        {/* CTA only — prices removed per request */}
        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 ease-out-smooth group-hover:bg-primary-dark group-hover:shadow-lg group-hover:shadow-primary/20">
            {isAr ? "شاهدي الروتين" : "View Routine"}
          </span>
        </div>
      </div>
    </Link>
  );
}
