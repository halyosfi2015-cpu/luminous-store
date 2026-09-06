"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject, TouchEvent as ReactTouchEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLang } from "@/lib/use-lang";
import {
  defaultStageConfigs,
  resolveStageSlides,
  sanitizeConfigs,
  type LuminousStageSlide,
} from "@/lib/luminous-stage";

interface LuminousStageProps {
  slides?: LuminousStageSlide[];
}

const EASE = "cubic-bezier(0.22,1,0.36,1)";

const STAGE_WEB_PACK_ART: Record<string, string> = {
  "luminous-offers": "/images/stage-references/luminous-offers-blend.jpg",
  "luminous-routine": "/images/stage-references/luminous-routine-blend.jpg",
  "luminous-bestsellers": "/images/stage-references/luminous-offers-blend.jpg",
  "luminous-brands": "/images/stage-references/luminous-brands-ai.png",
  "luminous-hair": "/images/stage-references/luminous-hair-blend.jpg",
  "luminous-serums": "/images/stage-references/luminous-bestsellers-blend.jpg",
  "luminous-body": "/images/stage-references/luminous-body-blend.jpg",
  "luminous-perfume": "/images/stage-references/luminous-perfume-blend.jpg",
  "luminous-bakhoor": "/images/stage-references/luminous-bakhoor-blend.jpg",
  "luminous-makeup": "/images/stage-references/luminous-makeup-blend.jpg",
  "luminous-eye": "/images/stage-references/luminous-eye-blend.jpg", 
  "luminous-nail": "/images/stage-references/luminous-nail-blend.jpg",
  "luminous-supplements": "/images/stage-references/luminous-supplements-blend.jpg",
  "luminous-oral": "/images/stage-references/luminous-oral-blend.jpg",
  "luminous-trending": "/images/stage-references/luminous-makeup-blend.jpg",
};

const BLOB_PATHS = [
  "M44.9,-64.2C57.8,-55.9,67.7,-43.1,73.2,-28.3C78.7,-13.5,79.8,3.3,74.9,17.9C70,32.5,59.1,44.9,46.2,54.3C33.3,63.7,18.4,70.1,2.2,68.6C-14,67.1,-31.5,57.7,-45.1,45.6C-58.7,33.5,-68.4,18.7,-71.2,2.3C-74,-14.1,-69.9,-32.1,-59.5,-44.6C-49.1,-57.1,-32.4,-64.1,-16.4,-66.3C-0.4,-68.5,15.3,-66,44.9,-64.2Z",
  "M39.4,-58.3C52.7,-51.1,65.9,-42.1,71.8,-29.5C77.7,-16.9,76.3,-0.8,72.2,13.6C68.1,28,61.3,40.7,51.1,50.6C40.9,60.5,27.3,67.6,12.5,70.4C-2.3,73.2,-18.3,71.7,-32.1,65.3C-45.9,58.9,-57.5,47.6,-64.4,34.1C-71.3,20.6,-73.5,4.9,-70.4,-9.4C-67.3,-23.7,-58.9,-36.6,-47.6,-44.4C-36.3,-52.2,-22.1,-54.9,-7.6,-59C6.9,-63.1,26.1,-65.5,39.4,-58.3Z",
  "M46.1,-67.3C58.3,-59.1,65.9,-44.6,70.5,-30C75.1,-15.4,76.7,0.4,72.7,14.3C68.7,28.2,59.1,40.2,47.5,49.8C35.9,59.4,22.3,66.6,6.9,69.5C-8.5,72.4,-25.7,71,-39.6,63.6C-53.5,56.2,-64.1,42.8,-69.7,27.6C-75.3,12.4,-75.9,-4.6,-70.6,-19.4C-65.3,-34.2,-54.1,-46.8,-41.2,-55.3C-28.3,-63.8,-13.7,-68.2,1.3,-70.2C16.3,-72.2,33.9,-75.5,46.1,-67.3Z",
];

interface SceneDef {
  glowA: { x: number; y: number; op: number };
  glowB: { x: number; y: number; op: number };
  blob: { variant: number; x: number; y: number; size: number; rot: number; op: number };
  ring: { x: number; y: number; size: number; dash: boolean } | null;
  sweepOp: number;
}

const SCENES: Record<string, SceneDef> = {
  "luminous-offers": {
    glowA: { x: 82, y: 10, op: 0.22 }, glowB: { x: 8, y: 85, op: 0.14 },
    blob: { variant: 0, x: 62, y: -18, size: 480, rot: -12, op: 0.10 }, ring: { x: 88, y: 30, size: 300, dash: true }, sweepOp: 0.30,
  },
  "luminous-routine": {
    glowA: { x: 12, y: 12, op: 0.18 }, glowB: { x: 86, y: 80, op: 0.16 },
    blob: { variant: 1, x: 55, y: 8, size: 520, rot: 18, op: 0.11 }, ring: null, sweepOp: 0.22,
  },
  "luminous-bestsellers": {
    glowA: { x: 78, y: 22, op: 0.20 }, glowB: { x: 18, y: 78, op: 0.12 },
    blob: { variant: 2, x: 50, y: -6, size: 500, rot: -24, op: 0.09 }, ring: { x: 12, y: 20, size: 260, dash: false }, sweepOp: 0.26,
  },
  "luminous-brands": {
    glowA: { x: 85, y: 15, op: 0.16 }, glowB: { x: 10, y: 82, op: 0.15 },
    blob: { variant: 0, x: 48, y: 14, size: 460, rot: 8, op: 0.08 }, ring: { x: 90, y: 68, size: 340, dash: true }, sweepOp: 0.18,
  },
  "luminous-hair": {
    glowA: { x: 15, y: 18, op: 0.19 }, glowB: { x: 84, y: 84, op: 0.13 },
    blob: { variant: 1, x: 58, y: 4, size: 540, rot: -30, op: 0.10 }, ring: null, sweepOp: 0.24,
  },
  "luminous-serums": {
    glowA: { x: 80, y: 8, op: 0.21 }, glowB: { x: 6, y: 70, op: 0.13 },
    blob: { variant: 2, x: 44, y: 20, size: 490, rot: 14, op: 0.10 }, ring: { x: 84, y: 14, size: 280, dash: false }, sweepOp: 0.28,
  },
  "luminous-body": {
    glowA: { x: 20, y: 10, op: 0.17 }, glowB: { x: 82, y: 86, op: 0.15 },
    blob: { variant: 0, x: 52, y: 10, size: 500, rot: 26, op: 0.10 }, ring: null, sweepOp: 0.20,
  },
  "luminous-perfume": {
    glowA: { x: 84, y: 12, op: 0.22 }, glowB: { x: 12, y: 88, op: 0.16 },
    blob: { variant: 1, x: 60, y: 0, size: 520, rot: -8, op: 0.12 }, ring: { x: 8, y: 30, size: 240, dash: true }, sweepOp: 0.32,
  },
  "luminous-bakhoor": {
    glowA: { x: 78, y: 18, op: 0.24 }, glowB: { x: 14, y: 80, op: 0.18 },
    blob: { variant: 2, x: 56, y: 6, size: 510, rot: 10, op: 0.12 }, ring: null, sweepOp: 0.30,
  },
  "luminous-makeup": {
    glowA: { x: 16, y: 14, op: 0.20 }, glowB: { x: 86, y: 82, op: 0.17 },
    blob: { variant: 0, x: 50, y: 16, size: 480, rot: -16, op: 0.11 }, ring: { x: 92, y: 24, size: 260, dash: false }, sweepOp: 0.26,
  },
  "luminous-eye": {
    glowA: { x: 82, y: 10, op: 0.18 }, glowB: { x: 8, y: 78, op: 0.14 },
    blob: { variant: 1, x: 54, y: 12, size: 470, rot: 22, op: 0.09 }, ring: null, sweepOp: 0.22,
  },
  "luminous-nail": {
    glowA: { x: 80, y: 20, op: 0.19 }, glowB: { x: 16, y: 84, op: 0.15 },
    blob: { variant: 2, x: 46, y: 8, size: 495, rot: -20, op: 0.10 }, ring: { x: 10, y: 16, size: 250, dash: true }, sweepOp: 0.24,
  },
  "luminous-supplements": {
    glowA: { x: 14, y: 16, op: 0.17 }, glowB: { x: 84, y: 80, op: 0.14 },
    blob: { variant: 0, x: 58, y: 4, size: 505, rot: 12, op: 0.09 }, ring: null, sweepOp: 0.20,
  },
  "luminous-oral": {
    glowA: { x: 86, y: 14, op: 0.18 }, glowB: { x: 10, y: 86, op: 0.15 },
    blob: { variant: 1, x: 52, y: 10, size: 485, rot: -26, op: 0.09 }, ring: { x: 88, y: 74, size: 290, dash: true }, sweepOp: 0.22,
  },
  "luminous-trending": {
    glowA: { x: 18, y: 12, op: 0.21 }, glowB: { x: 84, y: 84, op: 0.16 },
    blob: { variant: 2, x: 50, y: 14, size: 500, rot: 16, op: 0.10 }, ring: { x: 6, y: 40, size: 270, dash: false }, sweepOp: 0.28,
  },
};

function sceneFor(slideId: string, index: number): SceneDef {
  const known = SCENES[slideId];
  if (known) return known;
  const pick = index % BLOB_PATHS.length;
  return {
    glowA: { x: 82, y: 12, op: 0.18 }, glowB: { x: 12, y: 84, op: 0.14 },
    blob: { variant: pick, x: 52, y: 8, size: 490, rot: index * 17 - 20, op: 0.10 },
    ring: index % 2 === 0 ? { x: 90, y: 30, size: 280, dash: true } : null,
    sweepOp: 0.24,
  };
}

function useInViewLite<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

export default function LuminousStage({ slides: slidesProp }: LuminousStageProps) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [sectionRef, inView] = useInViewLite<HTMLElement>();
  const [configs, setConfigs] = useState<ReturnType<typeof sanitizeConfigs>>(null);
  const slides = useMemo(() => {
    if (slidesProp && slidesProp.length > 0) {
      const hero = resolveStageSlides([])[0];
      const withoutHero = slidesProp.filter((slide) => slide.id !== hero?.id);
      return hero ? [hero, ...withoutHero] : slidesProp;
    }
    const base = configs && configs.length > 0 ? configs : defaultStageConfigs();
    return resolveStageSlides(base);
  }, [slidesProp, configs]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/content/luminous-stage")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        // GET already returns the sanitized configs ARRAY ({overrides:[...]}).
        // Re-running sanitizeConfigs here expected {slides:[...]} and always
        // returned null → the homepage silently rendered defaults forever.
        const overrides = data?.overrides;
        const sanitized = Array.isArray(overrides) && overrides.length > 0 ? overrides : null;
        if (!cancelled && sanitized && sanitized.length > 0) setConfigs(sanitized);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const count = slides.length;

  const [index, setIndex] = useState(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
      )
        return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isAr) next();
        else prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isAr) prev();
        else next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAr, next, prev]);

  useEffect(() => {
    if (!inView || count < 2) return;
    const timer = window.setTimeout(() => {
      setIndex((i) => (i + 1) % count);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [count, inView, index]);

  if (count === 0) return null;

  // Editorial entrance: soft rise + fade, staggered eyebrow → headline →
  // sub → CTA. Exit is quick and unobtrusive so the next composition owns
  // the frame immediately.
  const reveal = (active: boolean, _delay: number, lift = 14) =>
    ({
      opacity: active ? 1 : 0,
      transform: active ? "translateY(0)" : `translateY(${lift}px)`,
      transition: active
        ? `opacity 380ms ${EASE}, transform 420ms ${EASE}`
        : "opacity 180ms ease, transform 180ms ease",
    }) as const;

  const handleTouchStart = (e: ReactTouchEvent<HTMLElement>) => {
    const t = e.touches[0];
    if (t) touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e: ReactTouchEvent<HTMLElement>) => {
    const start = touchRef.current;
    const t = e.changedTouches[0];
    if (start && t) {
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        const forward = isAr ? dx > 0 : dx < 0;
        if (forward) next();
        else prev();
      }
    }
    touchRef.current = null;
  };

  // Layered slide transition: the outgoing composition recedes gently
  // (slight drift + scale-down, fast fade), the incoming one establishes
  // slowly from a whisper of depth. No bouncing, no aggressive zoom.
  const layerIn = "opacity 420ms ease, transform 460ms cubic-bezier(0.22,1,0.36,1)";
  const layerOut = "opacity 240ms ease, transform 260ms ease";

  return (
    <section
      ref={sectionRef}
      dir={isAr ? "rtl" : "ltr"}
      role="region"
      aria-roledescription="carousel"
      aria-label={isAr ? "عرض لومينوس المميز" : "Luminous premium showcase"}
      className="relative my-2 w-full overflow-hidden rounded-[1.25rem] border border-primary/10 isolate sm:my-3"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {slides.map((s, i) => {
        const active = i === index;
        const scene = sceneFor(s.id, i);
        const acc = s.theme.accent;
        // Custom-image slides replace the template composition entirely.
        const isCustomImage = s.slideType === "custom-image" && !!s.customImage;

        return (
          <article
            key={s.id}
            aria-hidden={!active || undefined}
            aria-label={isAr ? s.headlineAr : s.headlineEn}
            className={
              "w-full " +
              (active ? "relative z-10" : "absolute inset-0 z-0 pointer-events-none")
            }
            style={{
              opacity: active ? 1 : 0,
              transform: active
                ? "translateX(0) scale(1)"
                : `translateX(${i > index ? 1.8 : -1.8}%) scale(0.988)`,
              transition: active ? layerIn : layerOut,
              willChange: "opacity, transform",
            }}
          >
            {/* ── CUSTOM IMAGE SLIDE ───────────────────────────────────────
                Ready-made artwork fills the same boxed stage (object-cover,
                no distortion). Optionally overlaid with the brand mark. */}
            {isCustomImage ? (
              <div
                className="relative aspect-[1024/340] min-h-[280px] w-full overflow-hidden sm:min-h-[330px] lg:min-h-[340px]"
                style={{ opacity: active ? 1 : 0, transition: "opacity 520ms ease" }}
              >
                {s.id !== "luminous-model-hero" && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundColor: "#f9e2e8",
                      backgroundImage: "url('/images/hero/luminous-stage-background.png')",
                      backgroundPosition: "center",
                      backgroundSize: "cover",
                    }}
                    aria-hidden="true"
                  />
                )}
                <Image
                  src={s.customImage!}
                  alt={isAr ? s.headlineAr : s.headlineEn}
                  fill
                  sizes="100vw"
                  className={`absolute inset-0 h-full w-full object-center ${s.id === "luminous-model-hero" ? "object-cover" : "object-contain bg-transparent"}`}
                  priority={s.id === "luminous-model-hero"}
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-[#f1d9e5]/45" aria-hidden="true" />
                <div className="absolute inset-0 grid grid-cols-[minmax(0,36%)_minmax(0,64%)] items-center gap-1 px-2 sm:grid-cols-[minmax(0,38%)_minmax(0,62%)] sm:px-5 lg:grid-cols-[minmax(0,40%)_minmax(0,60%)] lg:px-8" dir="ltr">
                  <div className="relative z-10 col-start-2 flex min-w-0 translate-x-[4%] flex-col items-center justify-center px-2 text-center sm:translate-x-[5%] sm:px-5 lg:translate-x-[7%] lg:px-10" dir={isAr ? "rtl" : "ltr"}>
                    {(isAr ? s.eyebrowAr : s.eyebrowEn) && (
                      <span className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-xs" style={reveal(active, 60)}>
                        <span className="inline-block h-[2px] w-7 rounded-full bg-accent" />
                        {isAr ? s.eyebrowAr : s.eyebrowEn}
                      </span>
                    )}
                    <h2 className="max-w-xl whitespace-pre-line text-balance text-2xl font-bold leading-[1.16] text-foreground sm:text-3xl lg:text-[clamp(30px,3.6vw,54px)]" style={{ fontFamily: "var(--font-display)", ...reveal(active, 120, 12) }}>
                      {isAr ? s.headlineAr : s.headlineEn}
                    </h2>
                    <p className="mt-2 max-w-lg whitespace-pre-line text-xs leading-relaxed text-muted sm:text-sm lg:text-base" style={reveal(active, 180)}>
                      {isAr ? s.subAr : s.subEn}
                    </p>
                    <Link href={s.ctaHref} tabIndex={active ? 0 : -1} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-primary transition-all duration-300 hover:bg-primary-dark active:scale-[0.97] sm:text-sm" style={reveal(active, 240, 8)}>
                      {isAr ? s.ctaAr : s.ctaEn}
                      <svg className="h-4 w-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>

                </div>
              </div>
            ) : (
            <>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundColor: "#f9e2e8",
                backgroundImage: "url('/images/hero/luminous-stage-background.png')",
                backgroundPosition: "center",
                backgroundSize: "cover",
                opacity: active ? 1 : 0,
                transform: active ? "scale(1)" : "scale(1.02)",
                transition: active
                  ? "opacity 700ms ease 0ms, transform 1100ms cubic-bezier(0.22,1,0.36,1) 0ms"
                  : "opacity 320ms ease 0ms",
              }}
            />
            {/* Luminous Derma Brand Mark — part of the template background
                composition (not a product/text overlay). Fixed position in
                the design system, responsive size, RTL-safe. Soft halo keeps
                it legible without ever covering products or copy. */}
            {s.showBrandMark === true && (
              <div
                className="absolute pointer-events-none select-none"
                style={{
                  insetInlineEnd: "3%",
                  bottom: "4%",
                  width: "clamp(110px, 16vw, 240px)",
                  opacity: active ? 0.13 : 0,
                  transform: active ? "scale(1)" : "scale(0.965)",
                  transition: active
                    ? "opacity 750ms ease 180ms, transform 900ms cubic-bezier(0.22,1,0.36,1) 160ms"
                    : "opacity 260ms ease 0ms",
                }}
                aria-hidden="true"
              >
                <Image
                  src="/images/logo/luminous-derma-icon.svg"
                  alt=""
                  width={240}
                  height={240}
                  className="w-full h-auto"
                  style={{
                    filter:
                      "saturate(0.9) drop-shadow(0 1px 6px rgba(255,255,255,0.55)) drop-shadow(0 0 18px rgba(255,255,255,0.35))",
                  }}
                />
              </div>
            )}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  `radial-gradient(ellipse 55% 60% at ${scene.glowA.x}% ${scene.glowA.y}%, ${acc}${Math.round(scene.glowA.op * 255).toString(16).padStart(2, "0")} 0%, transparent 70%),` +
                  `radial-gradient(ellipse 50% 55% at ${scene.glowB.x}% ${scene.glowB.y}%, ${acc}${Math.round(scene.glowB.op * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
                opacity: active ? 1 : 0,
                transition: "opacity 550ms ease",
              }}
            />
            {/* Luxury studio caustics — soft light sheens tinted by the slide accent */}
            <div
              className="absolute -top-[18%] -start-[8%] w-[60%] h-[60%] blur-3xl pointer-events-none"
              style={{
                background: `conic-gradient(from 210deg at 50% 50%, transparent 0deg, ${acc}14 60deg, transparent 130deg, #ffffff2b 200deg, transparent 300deg)`,
                opacity: active ? 0.55 : 0,
                transition: "opacity 600ms ease",
              }}
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-[22%] -end-[10%] w-[55%] h-[55%] blur-3xl pointer-events-none"
              style={{
                background: `conic-gradient(from 30deg at 50% 50%, transparent 0deg, #ffffff22 80deg, transparent 160deg, ${acc}12 240deg, transparent 330deg)`,
                opacity: active ? 0.5 : 0,
                transition: "opacity 600ms ease 40ms",
              }}
              aria-hidden="true"
            />
            <svg
              viewBox="0 0 200 200"
              className="luminous-blob absolute pointer-events-none hidden lg:block"
              style={
                {
                  width: scene.blob.size,
                  height: scene.blob.size,
                  insetInlineEnd: `${scene.blob.x / 2}%`,
                  top: `${scene.blob.y}px`,
                  opacity: active ? scene.blob.op : 0,
                  transform: active ? "translateY(0) scale(1)" : "translateY(14px) scale(1.05)",
                  "--lrot": `${scene.blob.rot}deg`,
                  transition: active
                    ? `opacity 650ms ease 100ms, transform 1200ms ${EASE} 80ms`
                    : "opacity 300ms ease 0ms",
                } as React.CSSProperties
              }
              aria-hidden="true"
            >
              <path d={BLOB_PATHS[scene.blob.variant % BLOB_PATHS.length]} fill={acc} />
            </svg>
            {scene.ring && (
              <div
                className="absolute rounded-full border pointer-events-none hidden lg:block"
                style={{
                  width: scene.ring.size,
                  height: scene.ring.size,
                  borderStyle: scene.ring.dash ? "dashed" : "solid",
                  borderColor: `${acc}30`,
                  insetInlineEnd: `${scene.ring.x}%`,
                  top: `${scene.ring.y}%`,
                  opacity: active ? 1 : 0,
                  transform: active ? "scale(1)" : "scale(0.94)",
                  transition: active
                    ? `opacity 600ms ease 140ms, transform 1150ms ${EASE} 120ms`
                    : "opacity 300ms ease 0ms",
                }}
                aria-hidden="true"
              />
            )}
            <div
              className="absolute inset-y-[-10%] w-[36%] pointer-events-none"
              style={{
                insetInlineEnd: "-6%",
                background: `linear-gradient(${isAr ? 255 : 105}deg, transparent 0%, rgba(255,255,255,${scene.sweepOp}) 50%, transparent 100%)`,
                filter: "blur(6px)",
                opacity: active ? 1 : 0,
                transition: "opacity 550ms ease 40ms",
              }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-[0.03]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                backgroundSize: "220px",
                opacity: active ? 0.035 : 0,
                transition: "opacity 450ms ease",
              }}
              aria-hidden="true"
            />
            </>
            )}

            {/* Template content (text + products) — custom-image slides are
                pure artwork and render no template composition. */}
            {!isCustomImage && (
            <div className="relative w-full max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-10 py-5 sm:py-6 lg:py-7" dir="ltr">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,60%)_minmax(0,40%)] lg:gap-6 lg:items-center">
                <div className="flex flex-col items-center text-center lg:order-2" dir={isAr ? "rtl" : "ltr"}>
                  <span
                    className="inline-flex items-center gap-2 mb-2.5"
                    style={reveal(active, 90)}
                  >
                    <span
                      className="inline-block w-8 h-[2px] rounded-full"
                      style={{ background: acc }}
                    />
                    <span
                      className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em]"
                      style={{ color: acc }}
                    >
                      {isAr ? s.eyebrowAr : s.eyebrowEn}
                    </span>
                  </span>

                  <h2
                    className="mb-2 leading-[1.16]"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(28px, 3.5vw, 46px)",
                      fontWeight: 700,
                      color: "#241f16",
                      ...reveal(active, 180, 18),
                    }}
                  >
                    {isAr ? s.headlineAr : s.headlineEn}
                  </h2>

                  <p
                    className="max-w-sm text-xs leading-relaxed text-[#3a352c] sm:text-sm lg:text-base lg:mb-5"
                    style={{ ...reveal(active, 300) }}
                  >
                    {isAr ? s.subAr : s.subEn}
                  </p>

                  <Link
                    href={s.ctaHref}
                    tabIndex={active ? 0 : -1}
                    className="group inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-semibold transition-all duration-300 active:scale-[0.97]"
                    style={{
                      background: acc,
                      color: "#fff",
                      boxShadow: `0 8px 24px ${acc}3d`,
                      ...reveal(active, 520, 12),
                    }}
                  >
                    <span>{isAr ? s.ctaAr : s.ctaEn}</span>
                    <svg
                      className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>

                <div
                  className="relative h-[240px] select-none sm:order-2 sm:h-[300px] lg:order-1 lg:h-[360px]"
                  style={{
                    transform: active ? "translateY(0)" : "translateY(12px)",
                    transition: active ? "transform 520ms cubic-bezier(0.22,1,0.36,1)" : "transform 220ms ease",
                  }}
                >
                  <div className="absolute inset-x-[4%] bottom-[4%] z-10 h-[92%]" style={{ opacity: active ? 1 : 0, transform: active ? "translateY(0) scale(1)" : "translateY(18px) scale(0.94)", transition: active ? `opacity 520ms ${EASE}, transform 560ms ${EASE}` : "opacity 180ms ease, transform 180ms ease" }}>
                    <Image
                      src={STAGE_WEB_PACK_ART[s.id] ?? "/images/stage-references/luminous-bestsellers-blend.jpg"}
                      alt={isAr ? `منتجات ${s.headlineAr}` : `${s.headlineEn} products`}
                      fill
                      sizes="(max-width: 640px) 48vw, 34vw"
                      className="object-contain object-bottom drop-shadow-[0_10px_14px_rgba(30,22,44,0.12)]"
                    />
                  </div>
                </div>
               </div>
             </div>
            )}
           </article>
        );
      })}

      <button
        type="button"
        onClick={isAr ? next : prev}
        aria-label={isAr ? "السابق" : "Previous slide"}
        className="hidden md:inline-flex absolute start-4 lg:start-6 top-1/2 -translate-y-1/2 z-30 h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95"
        style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(0,0,0,0.06)", color: "#3a352c", boxShadow: "0 4px 14px rgba(0,0,0,0.07)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isAr ? <path d="m9 18 6-6-6-6" /> : <path d="m15 18-6-6 6-6" />}
        </svg>
      </button>
      <button
        type="button"
        onClick={isAr ? prev : next}
        aria-label={isAr ? "التالي" : "Next slide"}
        className="hidden md:inline-flex absolute end-4 lg:end-6 top-1/2 -translate-y-1/2 z-30 h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95"
        style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(0,0,0,0.06)", color: "#3a352c", boxShadow: "0 4px 14px rgba(0,0,0,0.07)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isAr ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
        </svg>
      </button>

      <div className="absolute top-4 end-6 z-30 text-[11px] tabular-nums tracking-widest text-black/40">
        <span className="text-black/70">{String(index + 1).padStart(2, "0")}</span>
        {" / "}
        {String(count).padStart(2, "0")}
      </div>

      <p className="sr-only" aria-live="polite">
        {isAr
          ? `${index + 1} من ${count}: ${slides[index]?.headlineAr ?? ""}`
          : `${index + 1} of ${count}: ${slides[index]?.headlineEn ?? ""}`}
      </p>
    </section>
  );
}
