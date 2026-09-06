"use client";

import { useRef, useMemo } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import Link from "next/link";
import ProductImage from "@/components/product/ProductImage";
import { useLang } from "@/lib/use-lang";
import type { ProductSummary } from "@/src/types/product";
import { HERO_SLIDES } from "@/lib/hero-slides";
import {
  useSceneCycle,
  useInView,
  useReducedMotion,
} from "@/components/showcase/DynamicShowcase";

interface ProductMarqueeProps {
  products: ProductSummary[];
  entering: boolean;
  sceneKey: number;
}

const SLIDE_MS = 5000;

/** Convert a hex accent color to rgba with the given alpha. */
function tint(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(0,0,0,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Luxury studio backdrop built purely from CSS gradients, auto-tinted by the
 * slide's accent color. Layered: soft studio key light + gentle caustic sheen
 * + floor glow that blends into the podium area. No images → zero payload.
 */
function LuxuryBackdrop({ accent, base }: { accent: string; base: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {/* Base slide gradient (existing signature palette) */}
      <div className="absolute inset-0" style={{ background: base }} />
      {/* Studio key light from top */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 85% at 80% -10%, ${tint(accent, 0.14)} 0%, transparent 55%)`,
        }}
      />
      {/* Soft counter light */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(90% 70% at 5% 108%, ${tint(accent, 0.10)} 0%, transparent 58%)`,
        }}
      />
      {/* Light caustics — two blurred conic sheens */}
      <div
        className="absolute -top-[20%] -start-[10%] w-[70%] h-[70%] blur-3xl"
        style={{
          background: `conic-gradient(from 210deg at 50% 50%, transparent 0deg, ${tint(accent, 0.08)} 60deg, transparent 130deg, ${tint("#ffffff", 0.35)} 200deg, transparent 300deg)`,
          opacity: 0.55,
        }}
      />
      <div
        className="absolute -bottom-[25%] -end-[12%] w-[65%] h-[65%] blur-3xl"
        style={{
          background: `conic-gradient(from 30deg at 50% 50%, transparent 0deg, ${tint("#ffffff", 0.28)} 80deg, transparent 160deg, ${tint(accent, 0.07)} 240deg, transparent 330deg)`,
          opacity: 0.5,
        }}
      />
    </div>
  );
}

/**
 * Luxury marble/rose-gold display plinth. Pure CSS: elliptical marble top,
 * rose-gold rim highlight, veined front face, contact shadow + reflection.
 * Sits flush with the bottom of the boxed banner.
 */
function Podium({ accent }: { accent: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-0 flex flex-col items-center">
      {/* Contact shadow on the "floor" */}
      <div
        className="absolute bottom-[2%] w-[86%] h-[26px] rounded-[50%] blur-md"
        style={{ background: `radial-gradient(closest-side, rgba(26,26,46,0.18), transparent)` }}
      />
      {/* Marble top surface (ellipse) */}
      <div
        className="relative w-[76%] max-w-[520px] rounded-[50%]"
        style={{
          height: "clamp(34px, 6vw, 58px)",
          marginBottom: "-1px",
          background: `
            radial-gradient(120% 140% at 30% 20%, #ffffff 0%, #f7f4ef 38%, #ece5da 62%, #ddd2c4 100%),
            linear-gradient(180deg, #f9f6f1, #e7dfd3)
          `,
          boxShadow: `
            inset 0 2px 6px rgba(255,255,255,0.95),
            inset 0 -3px 8px rgba(150,120,90,0.22),
            0 0 0 1.5px ${tint("#c9a24b", 0.45)},
            0 10px 24px -8px rgba(26,26,46,0.22)
          `,
        }}
      >
        {/* subtle marble veins */}
        <div
          className="absolute inset-0 rounded-[50%]"
          style={{
            background:
              "repeating-linear-gradient(115deg, transparent 0 14px, rgba(160,140,115,0.10) 14px 15px, transparent 15px 30px)",
            maskImage: "radial-gradient(closest-side, black 60%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(closest-side, black 60%, transparent 100%)",
          }}
        />
        {/* rose-gold rim light */}
        <div
          className="absolute inset-x-[6%] top-[8%] h-[38%] rounded-[50%]"
          style={{
            background: `linear-gradient(180deg, ${tint(accent, 0.16)}, transparent 80%)`,
            filter: "blur(2px)",
          }}
        />
      </div>
      {/* Front face of the plinth */}
      <div
        className="w-[58%] max-w-[380px]"
        style={{
          height: "clamp(26px, 4.5vw, 44px)",
          borderRadius: "0 0 18px 18px / 0 0 14px 14px",
          background: `
            linear-gradient(180deg, #efe9df 0%, #e2d8c9 40%, #d4c6b2 78%, #c8b89f 100%)
          `,
          boxShadow: `
            inset 0 6px 8px -6px rgba(255,255,255,0.9),
            inset 0 -2px 6px rgba(120,95,65,0.25),
            inset 3px 0 6px -4px ${tint("#c9a24b", 0.5)},
            inset -3px 0 6px -4px ${tint("#c9a24b", 0.5)}
          `,
        }}
      >
        {/* vertical marble veining */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: "inherit",
            background:
              "repeating-linear-gradient(92deg, transparent 0 22px, rgba(150,125,95,0.09) 22px 23px, transparent 23px 44px)",
            opacity: 0.7,
          }}
        />
      </div>
      {/* Soft reflection under the plinth */}
      <div
        className="w-[52%] max-w-[340px]"
        style={{
          height: "clamp(10px, 1.8vw, 18px)",
          marginTop: "2px",
          borderRadius: "0 0 50% 50%",
          background: `linear-gradient(180deg, ${tint(accent, 0.10)}, transparent 85%)`,
          filter: "blur(3px)",
        }}
      />
    </div>
  );
}

export default function ProductMarquee({ products }: ProductMarqueeProps) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const reduced = useReducedMotion();
  const [sceneRef, inView] = useInView<HTMLDivElement>();
  const slideCount = HERO_SLIDES.length;
  const cycle = useSceneCycle(slideCount, { autoplayMs: SLIDE_MS, inView, reduced });
  const touchXRef = useRef<number | null>(null);

  const productsByCategory = useMemo(() => {
    const map: Record<string, ProductSummary[]> = {};
    for (const s of HERO_SLIDES) {
      map[s.categorySlug] = products
        .filter((p) => p.categorySlug === s.categorySlug)
        .slice(0, 4);
    }
    return map;
  }, [products]);

  if (!products || products.length === 0 || HERO_SLIDES.length === 0) return null;

  return (
    <section
      ref={sceneRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={isAr ? "عروض لومينوس" : "Luminous Offers"}
      tabIndex={-1}
      onMouseEnter={cycle.pause}
      onMouseLeave={cycle.resume}
      onFocus={cycle.pause}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) cycle.resume(); }}
      onTouchStart={(e: ReactTouchEvent) => { cycle.pause(); if (e.touches[0]) touchXRef.current = e.touches[0].clientX; }}
      onTouchEnd={(e: ReactTouchEvent) => {
        if (touchXRef.current !== null && e.changedTouches[0]) {
          const d = e.changedTouches[0].clientX - touchXRef.current;
          if (Math.abs(d) > 48) { if (isAr ? d > 0 : d < 0) cycle.next(); else cycle.prev(); }
        }
        touchXRef.current = null;
        cycle.resume();
      }}
      className="relative w-full overflow-hidden"
      style={{ height: "clamp(340px, 52vw, 620px)" }}
    >
      {HERO_SLIDES.map((s, i) => {
        const isActive = i === cycle.index;
        const slideProducts = productsByCategory[s.categorySlug] || [];

        return (
          <div
            key={s.id}
            className="absolute inset-0 w-full h-full"
            aria-hidden={!isActive || undefined}
            style={{
              zIndex: isActive ? 10 : 1,
              opacity: isActive ? 1 : 0,
              transform: "translateX(" + (isActive ? "0%" : i > cycle.index ? "100%" : "-100%") + ")",
              transition: "opacity 600ms ease, transform 800ms cubic-bezier(0.22,1,0.36,1)",
              pointerEvents: isActive ? "auto" : "none",
            }}
          >
            <LuxuryBackdrop accent={s.accent} base={s.bg} />
            <div className={s.shape1} style={{ background: s.accent }} />
            <div className={s.shape2} style={{ background: s.accent }} />
            <div className={s.shape3} style={{ background: s.accent }} />

            <div className="relative h-full w-full flex items-center justify-between px-8 sm:px-14 lg:px-24 max-w-[1400px] mx-auto">

              <div className={"flex flex-col " + (isAr ? "items-end text-right order-2" : "items-start text-left order-1") + " z-10 max-w-[420px]"}>
                <div
                  className="w-10 h-[3px] rounded-full mb-4"
                  style={{
                    background: s.accent,
                    opacity: isActive ? 1 : 0,
                    transform: "scaleX(" + (isActive ? 1 : 0) + ")",
                    transformOrigin: isAr ? "right" : "left",
                    transition: "opacity 400ms ease 50ms, transform 450ms ease 50ms",
                  }}
                />

                <h2
                  className="leading-[1.15] mb-2"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(22px, 3.5vw, 42px)",
                    fontWeight: 700,
                    color: "#1a1a2e",
                    opacity: isActive ? 1 : 0,
                    transform: "translateY(" + (isActive ? "0" : "14px") + ")",
                    transition: "opacity 500ms ease 100ms, transform 550ms ease 100ms",
                  }}
                >
                  {isAr ? s.headlineAr : s.headlineEn}
                </h2>

                {(s.subAr || s.subEn) && (
                  <p
                    className="text-sm sm:text-base leading-relaxed mb-5"
                    style={{
                      color: "#666",
                      opacity: isActive ? 1 : 0,
                      transform: "translateY(" + (isActive ? "0" : "10px") + ")",
                      transition: "opacity 450ms ease 180ms, transform 500ms ease 180ms",
                    }}
                  >
                    {isAr ? s.subAr : s.subEn}
                  </p>
                )}

                <Link
                  href={s.ctaHref}
                  className="group inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-300 active:scale-[0.97]"
                  style={{
                    background: s.accent,
                    color: "white",
                    opacity: isActive ? 1 : 0,
                    transform: "translateY(" + (isActive ? "0" : "10px") + ")",
                    transition: "opacity 500ms ease 260ms, transform 550ms ease 260ms",
                  }}
                >
                  <span>{isAr ? s.ctaAr : s.ctaEn}</span>
                  <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>

              <div className={"relative " + (isAr ? "order-1" : "order-2") + " flex items-center justify-center w-[55%] h-full"}>
                {/* Luxury 3D display plinth — auto-tinted per slide */}
                <Podium accent={s.accent} />
                {slideProducts.map((p, pi) => {
                  const positions = [
                    { top: "16%", left: "5%", w: "42%", rotate: "-3deg", z: 2 },
                    { top: "13%", left: "38%", w: "38%", rotate: "2deg", z: 3 },
                    { top: "40%", left: "15%", w: "35%", rotate: "4deg", z: 4 },
                    { top: "44%", left: "50%", w: "40%", rotate: "-2deg", z: 5 },
                  ];
                  const pos = positions[pi % positions.length];

                  return (
                    <div
                      key={p.id}
                      className="absolute"
                      style={{
                        top: pos.top,
                        left: pos.left,
                        width: pos.w,
                        zIndex: pos.z,
                        transform: "rotate(" + pos.rotate + ") translateY(" + (isActive ? "0" : "30px") + ") scale(" + (isActive ? 1 : 0.9) + ")",
                        opacity: isActive ? 1 : 0,
                        transition: "opacity 500ms ease " + (100 + pi * 80) + "ms, transform 550ms ease " + (100 + pi * 80) + "ms",
                      }}
                    >
                      {p.gallery[0] && (
                        <div style={{ filter: "drop-shadow(0 16px 18px rgba(26,26,46,0.20)) drop-shadow(0 3px 5px rgba(26,26,46,0.10))" }}>
                          <ProductImage
                            src={p.gallery[0]}
                            alt=""
                            productId={p.id}
                            sizes="(max-width: 768px) 50vw, 25vw"
                            className="w-full h-auto object-contain"
                            noOverlay
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => isAr ? cycle.next() : cycle.prev()}
        aria-label={isAr ? "السابق" : "Previous"}
        className="absolute start-4 top-1/2 -translate-y-1/2 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 active:scale-95"
        style={{ background: "rgba(0,0,0,0.05)", color: "#555" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isAr ? <path d="m9 18 6-6-6-6" /> : <path d="m15 18-6-6 6-6" />}
        </svg>
      </button>

      <button
        type="button"
        onClick={() => isAr ? cycle.prev() : cycle.next()}
        aria-label={isAr ? "التالي" : "Next"}
        className="absolute end-4 top-1/2 -translate-y-1/2 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 active:scale-95"
        style={{ background: "rgba(0,0,0,0.05)", color: "#555" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isAr ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
        </svg>
      </button>

      <div className="absolute inset-x-0 bottom-5 z-30 flex items-center justify-center gap-2">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => cycle.goTo(i, i > cycle.index ? 1 : -1)}
            aria-label={isAr ? "شريحة " + (i + 1) : "Slide " + (i + 1)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === cycle.index ? "24px" : "8px",
              height: "8px",
              background: i === cycle.index ? s.accent : "rgba(0,0,0,0.12)",
            }}
          />
        ))}
      </div>
    </section>
  );
}
