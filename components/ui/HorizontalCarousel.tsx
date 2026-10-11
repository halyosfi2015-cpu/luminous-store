"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, Children, cloneElement, isValidElement, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "@/lib/use-lang";

type HorizontalCarouselProps = {
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
  /** Dawadose-style autoplay: page-by-page advance with loop wrap (default off). */
  autoplay?: boolean;
  /** ms between advances (dawadose uses 1500–3000). */
  autoplaySpeed?: number;
  /** Show page dots counter below the rail. */
  showDots?: boolean;
  /** Keep arrows visible on mobile too (default: desktop only). */
  arrowsAlways?: boolean;
};

export default function HorizontalCarousel({
  children,
  ariaLabel,
  className = "",
  autoplay = false,
  autoplaySpeed = 2500,
  showDots = false,
  arrowsAlways = false,
}: HorizontalCarouselProps) {
  const arrowVisibility = arrowsAlways ? "flex" : "hidden sm:flex";
  const trackRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [canScroll, setCanScroll] = useState({ start: false, end: false });
  const pausedRef = useRef(false);
  const visibleRef = useRef(true);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resettingRef = useRef(false);

  // One-direction infinite loop: triple the items and start from the middle
  // copy. Identical copies make the reset invisible — movement never reverses.
  // Loop only on desktop: tripled DOM hurts low-end mobile + causes RTL flashes.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const loop = autoplay && isDesktop;
  const items = useMemo(() => Children.toArray(children), [children]);
  const looped = useMemo(() => {
    if (!loop) return items;
    return [0, 1, 2].flatMap((copy) =>
      items.map((child, i) =>
        isValidElement(child) ? cloneElement(child, { key: `loop-${copy}-${i}` }) : child
      )
    );
  }, [loop, items]);

  const hasOverflow = useCallback(() => {
    const el = trackRef.current;
    return !!el && el.scrollWidth - el.clientWidth > 4;
  }, []);

  /** Instant jump without smooth animation (used for invisible loop resets). */
  const jumpTo = useCallback((offset: number) => {
    const el = trackRef.current;
    if (!el) return;
    resettingRef.current = true;
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = "auto";
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollLeft = rtl ? -offset : offset;
    void el.offsetWidth;
    el.style.scrollBehavior = prev;
    requestAnimationFrame(() => { resettingRef.current = false; });
  }, []);

  /** Invisible reset: when entering the 3rd copy, shift back exactly one copy. */
  const keepLoop = useCallback(() => {
    const el = trackRef.current;
    if (!el || !loop || resettingRef.current) return;
    const copyW = el.scrollWidth / 3;
    if (copyW - el.clientWidth <= 4) return; // single copy already fills the view
    const offset = Math.abs(el.scrollLeft);
    if (offset >= 2 * copyW - 2) jumpTo(offset - copyW);
    else if (offset <= 2) jumpTo(offset + copyW);
  }, [loop, jumpTo]);

  const [pages, setPages] = useState({ count: 1, active: 0 });

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    keepLoop();
    const maxScroll = el.scrollWidth - el.clientWidth;
    const current = Math.abs(el.scrollLeft);
    setCanScroll({
      start: current > 4,
      end: maxScroll - current > 4,
    });
    if (el.clientWidth > 0) {
      const count = Math.max(1, Math.round(el.scrollWidth / el.clientWidth));
      const active = Math.min(count - 1, Math.round(current / el.clientWidth));
      setPages((p) => (p.count === count && p.active === active ? p : { count, active }));
    }
  }, [keepLoop]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    // rAF-throttle: raw scroll events re-render every frame and hang weak machines
    let raf = 0;
    const throttled = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => updateArrows());
    };
    updateArrows();
    const onResize = () => updateArrows();
    el.addEventListener("scroll", throttled, { passive: true });
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(throttled);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", throttled);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [updateArrows]);

  // Pause autoplay while the carousel is off-screen
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !autoplay) return;
    const io = new IntersectionObserver(
      (entries) => { visibleRef.current = entries[0]?.isIntersecting ?? true; },
      { rootMargin: "200px" }
    );
    io.observe(root);
    return () => io.disconnect();
  }, [autoplay]);

  // Start from the middle copy so both directions have runway
  useLayoutEffect(() => {
    if (!loop) return;
    const id = requestAnimationFrame(() => {
      const el = trackRef.current;
      if (!el) return;
      const copyW = el.scrollWidth / 3;
      if (copyW - el.clientWidth <= 4) return;
      jumpTo(copyW);
    });
    return () => cancelAnimationFrame(id);
  }, [loop, jumpTo, looped.length]);

  const smoothTo = useCallback((target: number, duration = 800) => {
    const el = trackRef.current;
    if (!el) return;
    const start = el.scrollLeft;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for smoother deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      el.scrollLeft = start + (target - start) * eased;
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, []);

  const goToPage = useCallback((i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const target = i * el.clientWidth;
    el.scrollTo({ left: rtl ? -target : target, behavior: "smooth" });
  }, []);

  // Forward = next page in the current reading direction (RTL: scrollLeft goes negative)
  const fwdDir = (isAr ? -1 : 1) as 1 | -1;

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    // Scroll by one card width so motion lands on card boundaries
    const first = el.querySelector(":scope > *") as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).gap || "16");
    const cardStep = first ? first.clientWidth + gap : 0;
    const amount = cardStep > 0 ? cardStep : Math.max(280, el.clientWidth * 0.8);
    // Loop wrap (dawadose data-wrap="yes"): at the end, glide back to start
    const maxScroll = el.scrollWidth - el.clientWidth;
    const current = Math.abs(el.scrollLeft);
    const rtl = getComputedStyle(el).direction === "rtl";
    const forward = rtl ? dir === -1 : dir === 1;
    if (forward && maxScroll - current <= 4) {
      el.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    if (!forward && current <= 4) {
      const end = el.scrollWidth - el.clientWidth;
      el.scrollTo({ left: rtl ? -end : end, behavior: "smooth" });
      return;
    }
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }, []);

  // Autoplay: advance one page per tick, loop at the end, pause on interaction
  useEffect(() => {
    if (!autoplay) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const pause = () => {
      pausedRef.current = true;
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      resumeTimer.current = setTimeout(() => { pausedRef.current = false; }, 3000);
    };
    const el = trackRef.current;
    const onInteract = () => pause();
    el?.addEventListener("pointerdown", onInteract);
    el?.addEventListener("wheel", onInteract, { passive: true });
    el?.addEventListener("touchstart", onInteract, { passive: true });
    el?.addEventListener("focusin", onInteract);
    const id = setInterval(() => {
      if (pausedRef.current) return;
      if (document.hidden) return;
      if (!visibleRef.current) return;
      scrollBy(fwdDir);
    }, Math.max(4000, autoplaySpeed));
    return () => {
      clearInterval(id);
      el?.removeEventListener("pointerdown", onInteract);
      el?.removeEventListener("wheel", onInteract);
      el?.removeEventListener("touchstart", onInteract);
      el?.removeEventListener("focusin", onInteract);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [autoplay, autoplaySpeed, scrollBy, fwdDir]);

  // Mouse drag only — touch uses native momentum scrolling
  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: false });
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = trackRef.current;
    if (!el) return;
    drag.current = { down: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = trackRef.current;
    if (!drag.current.down || !el) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 5) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  };
  const endDrag = () => {
    drag.current.down = false;
  };

  return (
    <div
      ref={rootRef}
      className={`group/carousel relative ${className}`}
      onPointerEnter={() => { pausedRef.current = true; }}
      onPointerLeave={() => {
        if (resumeTimer.current) clearTimeout(resumeTimer.current);
        resumeTimer.current = setTimeout(() => { pausedRef.current = false; }, 1500);
      }}
    >
      <div
        ref={trackRef}
        role="region"
        aria-label={ariaLabel}
        className="magic-stagger magic-fade-x hide-scrollbar -mx-4 flex snap-x snap-proximity items-stretch gap-3 overflow-x-auto scroll-smooth px-4 pb-2 pt-1 sm:-mx-6 sm:gap-4 sm:px-6 sm:snap-mandatory lg:-mx-8 lg:px-8 [&>*]:snap-start"
        style={{ cursor: "grab", touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {looped}
      </div>

      <button
        type="button"
        aria-label={isAr ? "السابق" : "Previous"}
        onClick={() => scrollBy(1)}
        className={`absolute start-1 top-1/2 z-10 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-lg transition-all duration-200 ease-out-smooth hover:border-primary hover:bg-primary hover:text-white active:scale-90 sm:-start-5 ${arrowVisibility}`}
      >
        <ChevronLeft size={20} className={isAr ? "" : "rotate-180"} />
      </button>
      <button
        type="button"
        aria-label={isAr ? "التالي" : "Next"}
        onClick={() => scrollBy(-1)}
        className={`absolute end-1 top-1/2 z-10 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-lg transition-all duration-200 ease-out-smooth hover:border-primary hover:bg-primary hover:text-white active:scale-90 sm:-end-5 ${arrowVisibility}`}
      >
        <ChevronRight size={20} className={isAr ? "" : "rotate-180"} />
      </button>
      {showDots && pages.count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5" dir="ltr">
          {Array.from({ length: pages.count }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={isAr ? `صفحة ${i + 1}` : `Page ${i + 1}`}
              onClick={() => goToPage(i)}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center`}
            >
              <span className={`block h-2 rounded-full transition-all duration-300 ${
                i === pages.active ? "w-6 bg-primary" : "w-2 bg-border-strong/40 hover:bg-primary/50"
              }`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
