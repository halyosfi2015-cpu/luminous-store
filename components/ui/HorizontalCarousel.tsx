"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "@/lib/use-lang";

type HorizontalCarouselProps = {
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
};

export default function HorizontalCarousel({
  children,
  ariaLabel,
  className = "",
}: HorizontalCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [canScroll, setCanScroll] = useState({ start: false, end: false });

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScroll({
      start: el.scrollLeft > 4,
      end: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    });
  }, []);

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

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.max(280, el.clientWidth * 0.8);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

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
    <div className={`group/carousel relative ${className}`}>
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
        {children}
      </div>

      <button
        type="button"
        aria-label={isAr ? "السابق" : "Previous"}
        onClick={() => scrollBy(1)}
        className={`absolute start-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-card transition-all duration-200 ease-out-smooth hover:bg-primary hover:text-white hover:shadow-primary active:scale-90 ${
          canScroll.start ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <ChevronLeft size={20} className={isAr ? "" : "rotate-180"} />
      </button>
      <button
        type="button"
        aria-label={isAr ? "التالي" : "Next"}
        onClick={() => scrollBy(-1)}
        className={`absolute end-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-card transition-all duration-200 ease-out-smooth hover:bg-primary hover:text-white hover:shadow-primary active:scale-90 ${
          canScroll.end ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <ChevronRight size={20} className={isAr ? "" : "rotate-180"} />
      </button>
    </div>
  );
}
