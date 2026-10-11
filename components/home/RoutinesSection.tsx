"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { Star, Clock, Users, ShoppingBag, Flame } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import MobileReveal from "@/components/ui/MobileReveal";
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

  const [routinesLoaded, setRoutinesLoaded] = useState(false);
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
    } catch {} finally {
      setRoutinesLoaded(true);
    }
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

  const trackRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const touchXRef = useRef<number | null>(null);
  const levelStripRef = useRef<HTMLDivElement | null>(null);

  // Center the tapped level tab on screen (user-initiated only — never auto).
  useEffect(() => {
    const el = levelStripRef.current;
    if (!el || window.innerWidth >= 640) return;
    const order: (RoutineLevel | "all")[] = ["all", ...(Object.keys(LEVEL_META) as RoutineLevel[])];
    const target = el.children[order.indexOf(activeLevel)] as HTMLElement | undefined;
    if (target) {
      const t = window.setTimeout(() => {
        target.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
      }, 60);
      return () => window.clearTimeout(t);
    }
  }, [activeLevel, activeType]);
  const [viewportW, setViewportW] = useState(0);
  useEffect(() => {
    const update = () => {
      const el = viewportRef.current;
      if (el) setViewportW(el.clientWidth);
    };
    update();
    window.addEventListener("resize", update);
    const t = window.setTimeout(update, 500);
    return () => {
      window.removeEventListener("resize", update);
      window.clearTimeout(t);
    };
  }, []);
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

useEffect(() => {
    const update = () => {
      // Quarter-step on desktop; measured card on mobile (cards are 72vw there)
      if (window.innerWidth >= 1024) {
        const vp = viewportRef.current;
        if (vp) { setSlideW(vp.getBoundingClientRect().width / 4); return; }
      }
      const el = trackRef.current;
      if (el) {
        const card = el.querySelector("[data-slide-card]");
        if (card) setSlideW((card as HTMLElement).getBoundingClientRect().width + 8);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [looped]);

  // Auto-advance ONLY in the outer unfiltered "All" view — any specific
  // filter freezes the slider (manual swipe only).
  const isAutoScrolling = activeType === "all" && activeLevel === "all" && filtered.length > 0;
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<number | null>(null);
  const pauseAuto = () => {
    setPaused(true);
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), 4000);
  };
  useEffect(() => {
    if (!isAutoScrolling || paused) return;
    (window as unknown as Record<string, unknown>).__dbgRou =
      (((window as unknown as Record<string, unknown>).__dbgRou as number) ?? 0) + 1;
    // طلقة واحدة كل مرة: انتقال سريع ثم وقفة واضحة قبل الطلقة التالية
    // NaN-guard: slideIndex must stay finite (empty list % could poison it)
    const id = setInterval(() => {
      setSlideIndex((i) => (Number.isFinite(i) ? i + 1 : 0));
    }, 1500);
    return () => clearInterval(id);
  }, [isAutoScrolling, filtered.length, paused]);
  useEffect(() => () => { if (resumeTimer.current) window.clearTimeout(resumeTimer.current); }, []);

  // seamless loop: after crossing one full set, snap back to the start without animation
  // (% 0 === NaN would poison the state forever — guard empty lists + non-finite index)
  useEffect(() => {
    if (filtered.length === 0) return;
    if (!Number.isFinite(slideIndex)) {
      setSlideIndex(0);
      return;
    }
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

  if (routinesLoaded && types.length === 0) return null;
  if (!content.visible) return null;

  return (
    <section id="routines" className="magic-aurora hide-sub-m w-full scroll-mt-28 py-8 sm:py-10 lg:py-12">
      <Container>
        <SectionTitle
          eyebrow={isAr ? content.eyebrowAr : content.eyebrowEn}
          title={isAr ? content.titleAr : content.titleEn}
          subtitle={isAr ? content.subtitleAr : content.subtitleEn}

        />

        {/* Type + level tabs */}
        <div className="mt-4 flex flex-nowrap items-center justify-start gap-2.5 overflow-x-auto snap-x pb-2 -mx-4 px-4 sm:mx-0 sm:gap-2 sm:px-0 sm:flex-wrap sm:justify-center sm:mt-6">
          {/* All tab */}
          <button
            type="button"
            onClick={() => {
              setActiveType("all");
              setActiveLevel("all");
              setHasFiltered(true);
              resetSlider();
            }}
            className={`group inline-flex shrink-0 snap-start items-center gap-1.5 rounded-pill border px-3.5 py-2 min-h-[44px] text-[11px] font-bold transition-all duration-200 ease-out-smooth sm:px-3 sm:py-2 sm:text-xs sm:whitespace-nowrap ${
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
                className={`group inline-flex shrink-0 snap-start items-center gap-1.5 rounded-pill border px-3.5 py-2 min-h-[44px] text-[11px] font-bold transition-all duration-200 ease-out-smooth sm:px-3 sm:py-2 sm:text-xs sm:whitespace-nowrap ${
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

        {/* Level tabs — only when a specific type is selected (never under "All"):
            static (never auto-moves), but the tapped tab glides to screen center */}
        {activeType !== "all" && (
          <div ref={levelStripRef} className="hide-scrollbar mt-3 flex flex-nowrap items-center [justify-content:safe_center] gap-2 overflow-x-auto scroll-smooth pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center">
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

      {/* Routine cards — 4 per view on desktop, no peeking card on the edge */}
      <MobileReveal delay={100}>
      <div className="mx-auto mt-2 w-full max-w-[1400px] overflow-hidden border-0 bg-transparent px-4 shadow-none sm:px-6 sm:mt-8 lg:px-8">
        <div className="relative overflow-hidden shadow-none" dir="ltr">

          <div ref={viewportRef} onPointerDown={pauseAuto} onTouchStart={(e) => { pauseAuto(); const t = e.touches[0]; if (t) touchXRef.current = t.clientX; }} onTouchEnd={(e) => {
            const startX = touchXRef.current;
            touchXRef.current = null;
            const t = e.changedTouches[0];
            if (startX === null || !t || filtered.length <= 1) return;
            const dx = t.clientX - startX;
            if (Math.abs(dx) < 40) return;
            pauseAuto();
            // LTR track: swipe left → next, swipe right → previous
            setSnap(false);
            setSlideIndex((i) => (dx < 0 ? i + 1 : Math.max(0, i - 1)));
          }} className="overflow-hidden py-2 [container-type:inline-size] [touch-action:pan-y]" role="region" aria-label={isAr ? 'روتينات متحركة' : 'Routines showcase'}>
            <div
              ref={trackRef}
              className="magic-stagger flex w-max will-change-transform"
              style={{
                transform: `translate3d(${-slideIndex * slideW}px, 0, 0)`,
                transition: snap ? "none" : "transform 0.35s cubic-bezier(0.33, 1, 0.68, 1)",
              }}
            >
              {looped.map((routine, idx) => (
                <div
                  key={`${routine.id}-${idx}`}
                  data-slide-card
                  dir="rtl"
                  className="inline-block w-[64vw] max-w-[248px] shrink-0 sm:w-[330px] lg:w-[330px]"
                  style={{
                    paddingInlineEnd: 8,
                    minWidth: 0,
                    ...(viewWidth >= 1024
                      ? { width: "25cqw", maxWidth: "none" }
                      : {}),
                  }}
                >
                   <RoutineCard routine={routine} index={idx % filtered.length} isAr={isAr} animate={!hasFiltered} allProducts={apiProducts} />
                </div>
              ))}
              {!routinesLoaded && looped.length === 0 && (
                [0, 1].map((k) => (
                  <div key={`skel-${k}`} dir="rtl" className="inline-block w-[64vw] max-w-[248px] shrink-0 sm:w-[330px]" style={{ paddingInlineEnd: 8 }}>
                    <div className="flex animate-pulse flex-col overflow-hidden rounded-card border border-border bg-card">
                      <div className="animate-shimmer h-36 bg-muted-bg sm:h-48" />
                      <div className="flex flex-col gap-2 p-4">
                        <div className="h-4 w-3/4 rounded-full bg-muted-bg" />
                        <div className="h-3 w-1/2 rounded-full bg-muted-bg" />
                        <div className="mt-2 h-11 w-full rounded-full bg-muted-bg" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      </MobileReveal>

      <Container>
        <div className="mt-3 text-center sm:mt-6">
          <Link
            href="/routines"
            className="inline-flex items-center gap-2 rounded-pill border border-primary/30 bg-primary/5 px-5 py-2.5 text-xs font-bold text-primary transition-all duration-200 ease-out-smooth hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20"
          >
            <ShoppingBag size={14} />
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
      className={`shrink-0 rounded-pill border px-3 py-2 min-h-[44px] text-[10px] font-bold transition-all duration-200 ease-out-smooth ${
        active
          ? "border-primary/40 bg-primary/10 text-primary shadow-md shadow-primary/25 scale-[1.07]"
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
      className="group relative flex h-full min-h-[264px] flex-col overflow-hidden rounded-card border border-border bg-card shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-card-hover sm:min-h-0"
      style={{ animation: animate ? `slideUp 0.5s cubic-bezier(0.23, 1, 0.32, 1) ${index * 70}ms both` : 'none' }}
    >
      {/* Image — routine products strip */}
      <div className="magic-autoshine luminous-shine relative h-24 overflow-hidden bg-gray-100 sm:h-40">
        {validProducts.length > 0 && (
          <div className="flex h-full w-full items-stretch">
            {validProducts.slice(0, 4).map(
              (p, pi) =>
                p.gallery?.[0] && (
                  <div key={p.id} className={`relative min-w-0 flex-1 overflow-hidden ${pi === 3 ? "hidden sm:block" : ""}`}>
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
        )}
      </div>

        {/* Level badge */}
        <div className="absolute top-3 start-3 z-10">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold backdrop-blur-sm ${levelMeta.color}`}
          >
              <Flame size={11} className="fill-current" />
            {levelMeta.ar}
          </span>
        </div>

        {/* Savings badge */}
        <div className="absolute top-3 end-3 z-10">
          <span className="luminous-glow-pulse inline-flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-rose-600 shadow-sm backdrop-blur-sm">
            {isAr ? "توفير" : "save"}
          </span>
        </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3 space-y-2 sm:p-4 sm:space-y-3">
        {/* Content */}
        <div className="space-y-1.5 sm:space-y-2">
          <h3 className="text-[13px] font-medium text-gray-900 tracking-wide line-clamp-1 transition-colors duration-300 group-hover:text-primary sm:text-sm">
            {routine.nameAr}
          </h3>
          <p className="text-[11.5px] font-light leading-relaxed text-muted line-clamp-2 sm:text-[13px]">{routine.descriptionAr}</p>
        </div>



        {/* Meta — rating, buyers, duration (numbers removed per request) */}
        <div className="flex flex-wrap items-center gap-2 text-[11.5px] pt-2 border-t border-border sm:gap-3 sm:text-sm">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted sm:text-sm">
            <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />
            <span className="font-medium text-gray-600">{isAr ? "تقييم ممتاز" : "Excellent"}</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11.5px] text-muted sm:text-sm">
            <Users size={12} className="shrink-0" />
            <span className="text-gray-400">{isAr ? "عميلات راضيات" : "happy clients"}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted sm:text-sm">
            <Clock size={11} className="shrink-0" />
            <span className="font-medium text-gray-600">{isAr ? "روتين يومي" : "daily routine"}</span>
          </span>
        </div>

        {/* CTA only — prices removed per request */}
        <div className="mt-auto flex items-center justify-between border-t border-border pt-2.5 sm:pt-4">
          <span className="inline-flex w-full justify-center items-center gap-1.5 rounded-pill bg-primary px-5 py-2 min-h-[40px] text-[12.5px] font-bold text-white transition-all duration-200 ease-out-smooth group-hover:bg-primary-dark group-hover:shadow-lg group-hover:shadow-primary/20 sm:w-auto sm:py-2.5 sm:min-h-[44px] sm:text-sm">
            {isAr ? "شاهدي الروتين" : "View Routine"}
          </span>
        </div>
      </div>
    </Link>
  );
}
