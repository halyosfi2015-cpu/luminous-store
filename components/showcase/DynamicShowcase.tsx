"use client";

/*
 * DynamicShowcase — reusable cinematic-scene infrastructure.
 *
 * Exports:
 *   useReducedMotion()            — media-query state
 *   useInView(ref)                — IntersectionObserver visibility gate
 *   useSceneCycle(count, opts)    — curated slide cadence: index, directional
 *                                   prev/next/goTo, autoplay, pause controls
 *   SceneProgress                 — chapter-style segmented progress line
 *
 * Content-agnostic: scenes supply their own figures/captions/atmosphere.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/* ── Reduced motion ───────────────────────────────────────────── */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/* ── Visibility gate ──────────────────────────────────────────── */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, inView] as const;
}

/* ── Scene cadence ────────────────────────────────────────────── */
export interface SceneCycle {
  index: number;
  /** Index of the outgoing slide while a cinematic transition plays */
  prevIndex: number | null;
  /** 1 = forward, -1 = backward */
  direction: 1 | -1;
  next: () => void;
  prev: () => void;
  goTo: (i: number, d?: 1 | -1) => void;
  paused: boolean;
  pause: () => void;
  resume: () => void;
}

export function useSceneCycle(
  count: number,
  opts: {
    autoplayMs?: number;
    inView: boolean;
    reduced: boolean;
    initialPaused?: boolean;
  },
): SceneCycle {
  const { autoplayMs = 6000, inView, reduced, initialPaused = false } =
    opts || {};
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(initialPaused);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (i: number, d?: 1 | -1) => {
      if (count === 0) return;
      const target = ((i % count) + count) % count;
      setDirection(d ?? (target > i ? 1 : -1));
      setIndex((cur) => {
        if (target === cur) return cur;
        setPrevIndex(cur);
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        clearTimerRef.current = setTimeout(() => setPrevIndex(null), 900);
        return target;
      });
    },
    [count],
  );

  const next = useCallback(() => {
    setIndex((cur) => {
      const target = (cur + 1) % count;
      setDirection(1);
      setPrevIndex(cur);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => setPrevIndex(null), 900);
      return target;
    });
  }, [count]);

  const prev = useCallback(() => {
    setIndex((cur) => {
      const target = (cur - 1 + count) % count;
      setDirection(-1);
      setPrevIndex(cur);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => setPrevIndex(null), 900);
      return target;
    });
  }, [count]);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  /* Autoplay */
  useEffect(() => {
    if (!autoplayMs || reduced || !inView || paused || count < 2) return;
    const timer = setInterval(next, autoplayMs);
    return () => clearInterval(timer);
  }, [autoplayMs, reduced, inView, paused, count, next]);

  /* Clear pending exit timer on unmount */
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  return {
    index,
    prevIndex,
    direction,
    next,
    prev,
    goTo,
    paused,
    pause,
    resume,
  };
}

/* ── Chapter-style progress ───────────────────────────────────── */
export function SceneProgress({
  count,
  index,
  onSelect,
  durationMs,
  paused,
  rtl,
}: {
  count: number;
  index: number;
  onSelect: (i: number) => void;
  durationMs: number;
  paused: boolean;
  rtl: boolean;
}) {
  if (count < 2) return null;
  return (
    <div className="flex items-center gap-2" role="presentation">
      {Array.from({ length: count }).map((_, i) => {
        const active = i === index;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`${i + 1}`}
            aria-current={active ? "true" : undefined}
            className="
              group flex h-7 w-11 cursor-pointer items-center
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2
              focus-visible:ring-offset-transparent rounded-full
            "
          >
            <span className="relative block h-[2px] w-full overflow-hidden rounded-full bg-white/[0.14]">
              {active ? (
                <span
                  key={`fill-${index}-${paused}`}
                  className="stage-progress-fill absolute inset-0 rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, #d4af37, #f3e3b3)",
                    animationDuration: `${durationMs}ms`,
                    transformOrigin: rtl ? "right" : "left",
                    animationPlayState: paused ? "paused" : "running",
                  }}
                />
              ) : (
                <span
                  className={`absolute inset-0 rounded-full transition-colors duration-500 ${
                    i < index ? "bg-white/35" : "bg-white/[0.14]"
                  }`}
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
