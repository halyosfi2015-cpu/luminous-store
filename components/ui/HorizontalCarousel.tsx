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
};

export default function HorizontalCarousel({
  children,
  ariaLabel,
  className = "",
  autoplay = false,
  autoplaySpeed = 2500,
}: HorizontalCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [canScroll, setCanScroll] = useState({ start: false, end: false });
  const pausedRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resettingRef = useRef(false);

  // One-direction infinite loop: triple the items and start from the middle
  // copy. Identical copies make the reset invisible — movement never reverses.
  const loop = autoplay;
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
  }, [keepLoop]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    const onResize = () => updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [updateArrows]);

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

  // Forward = next page in the current reading direction (RTL: scrollLeft goes negative)
  const fwdDir = (isAr ? -1 : 1) as 1 | -1;

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.max(280, el.clientWidth * 0.8);
    // Loop wrap (dawadose data-wrap="yes"): at the end, glide back to start
    const maxScroll = el.scrollWidth - el.clientWidth;
    const current = Math.abs(el.scrollLeft);
    const rtl = getComputedStyle(el).direction === "rtl";
    const forward = rtl ? dir === -1 : dir === 1;
    if (forward && maxScroll - current <= 4) {
      smoothTo(0, 900);
      return;
    }
    if (!forward && current <= 4) {
      const end = el.scrollWidth - el.clientWidth;
      smoothTo(rtl ? -end : end, 900);
      return;
    }
    smoothTo(el.scrollLeft + dir * amount, 800);
  }, [smoothTo]);

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
    const id = setInterval(() => {
      if (pausedRef.current) return;
      if (document.hidden) return;
      scrollBy(fwdDir);
    }, Math.max(1200, autoplaySpeed));
    return () => {
      clearInterval(id);
      el?.removeEventListener("pointerdown", onInteract);
      el?.removeEventListener("wheel", onInteract);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [autoplay, autoplaySpeed, scrollBy, fwdDir]);

  // Mouse drag
  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: false });
  const onPointerDown = (e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el) return;
    drag.current = { down: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
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
        className="hide-scrollbar -mx-4 flex gap-4 overflow-x-auto scroll-smooth px-4 pb-2 pt-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
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
        className="absolute start-1 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-lg transition-all duration-200 ease-out-smooth hover:border-primary hover:bg-primary hover:text-white active:scale-90 sm:-start-5 sm:flex"
      >
        <ChevronLeft size={20} className={isAr ? "" : "rotate-180"} />
      </button>
      <button
        type="button"
        aria-label={isAr ? "التالي" : "Next"}
        onClick={() => scrollBy(-1)}
        className="absolute end-1 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-lg transition-all duration-200 ease-out-smooth hover:border-primary hover:bg-primary hover:text-white active:scale-90 sm:-end-5 sm:flex"
      >
        <ChevronRight size={20} className={isAr ? "" : "rotate-180"} />
      </button>
    </div>
  );
}
