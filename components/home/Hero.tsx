"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useLang } from "@/lib/use-lang";
import {
  getEnabledSections,
  getProductCount,
  getProductsForSection,
  getHeroCopy,
  type HeroSectionConfig,
} from "@/lib/hero-config";
import ProductMarquee from "@/components/home/ProductMarquee";
import { HeroProvider, useHeroContext } from "@/components/home/HeroContext";
import { useHeroTimer } from "@/components/home/useHeroTimer";
import Link from "next/link";

type ScenePhase = "visible" | "exiting" | "entering";

function HeroContent() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { currentSection, setCurrentSection } = useHeroContext();

  const enabledSections = useMemo(() => getEnabledSections(), []);
  const currentIndex = enabledSections.findIndex(s => s.id === currentSection.id);

  const [scenePhase, setScenePhase] = useState<ScenePhase>("entering");
  const [heroCopy, setHeroCopy] = useState<string>(() => getHeroCopy(currentSection.id));
  const [prevSectionId, setPrevSectionId] = useState(currentSection.id);
  const [sceneKey, setSceneKey] = useState(0);
  const [copyVisible, setCopyVisible] = useState(true);
  const [productRotation, setProductRotation] = useState(0);

  if (currentSection.id !== prevSectionId) {
    setPrevSectionId(currentSection.id);
    setHeroCopy(getHeroCopy(currentSection.id));
  }

  const productCount = useMemo(() => getProductCount(), []);

  const currentProducts = useMemo(() => {
    return getProductsForSection(currentSection.id, productCount, sceneKey + productRotation);
  }, [currentSection.id, productCount, sceneKey, productRotation]);

  /* Preload every section's product images so section swaps never flash blank
     (the Fragrance gap was caused by its products being fetched on demand). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = new Set<string>();
    const preload = () => {
      enabledSections.forEach((s) => {
        for (let k = 1; k <= 3; k++) {
          getProductsForSection(s.id, productCount, k).forEach((p) => {
            const src = p.gallery?.[0];
            if (src && !seen.has(src)) {
              seen.add(src);
              const img = new Image();
              img.decoding = "async";
              img.src = src;
            }
          });
        }
      });
    };
    const t = setTimeout(preload, 400);
    return () => clearTimeout(t);
  }, [enabledSections, productCount]);

  const darkMode =
    currentSection.gradientVar === "hero-grad-fragrance" ||
    currentSection.gradientVar === "hero-grad-routines";

  /* First mount: enter scene, then settle */
  useEffect(() => {
    const t = setTimeout(() => setScenePhase("visible"), 400);
    return () => clearTimeout(t);
  }, [currentSection.id]);

  /* Cycle phrases within each section — every ~5s */
  useEffect(() => {
    if (scenePhase !== "visible") return;

    const interval = setInterval(() => {
      setCopyVisible(false);
      setTimeout(() => {
        setHeroCopy(getHeroCopy(currentSection.id));
        setCopyVisible(true);
      }, 250);
    }, 5000);

    return () => clearInterval(interval);
  }, [scenePhase, currentSection.id]);

  /* Rotate products within each section — every ~7s */
  useEffect(() => {
    if (scenePhase !== "visible") return;

    const interval = setInterval(() => {
      setProductRotation(r => r + 1);
    }, 7000);

    return () => clearInterval(interval);
  }, [scenePhase]);

  /* ── Scene transition ──────────────────────────
       0–220ms  → exiting (cross-dissolve out)
       220ms    → swap section + products + copy
       220–580ms→ entering (cross-dissolve in)
  ────────────────────────────────────────────── */
  const triggerSceneTransition = useCallback(
    (nextSection: HeroSectionConfig) => {
      if (nextSection.id === currentSection.id) return;
      setScenePhase("exiting");

      const exitTimer = setTimeout(() => {
        setCurrentSection(nextSection);
        setHeroCopy(getHeroCopy(nextSection.id));
        setSceneKey(k => k + 1);
        setCopyVisible(true);
        setScenePhase("entering");

        const enterTimer = setTimeout(
          () => setScenePhase("visible"),
          280,
        );
        return () => clearTimeout(enterTimer);
      }, 80);

      return () => clearTimeout(exitTimer);
    },
    [currentSection.id, setCurrentSection],
  );

  /* Auto-advance timer */
  useHeroTimer(() => {
    const nextIndex = (currentIndex + 1) % enabledSections.length;
    triggerSceneTransition(enabledSections[nextIndex]);
  }, 10000, { immediate: false });

  /* Keyboard navigation */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleKeydown = (e: KeyboardEvent) => {
      if (scenePhase !== "visible") return;
      if (
        e.target instanceof HTMLElement &&
        (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
      )
        return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          {
            const prev =
              (currentIndex - 1 + enabledSections.length) % enabledSections.length;
            triggerSceneTransition(enabledSections[prev]);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          {
            const next = (currentIndex + 1) % enabledSections.length;
            triggerSceneTransition(enabledSections[next]);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [currentIndex, enabledSections, triggerSceneTransition, scenePhase]);

  const sceneExiting = scenePhase === "exiting";
  const sceneEntering = scenePhase === "entering";

  return (
    <section
      className={`
        relative mx-auto w-full isolate overflow-hidden
        transition-[background-color] duration-[800ms]
        ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
      `}
      data-theme={darkMode ? "dark" : "light"}
      style={{
        backgroundColor: "transparent",
      }}
      aria-roledescription="carousel"
      aria-label={isAr ? "عرض الترحيب" : "Welcome showcase"}
    >
      {/* Subtle section-tinted background — transparent, blends with page */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `var(--${currentSection.gradientVar})`,
          opacity: 0.06,
        }}
        aria-hidden="true"
      />

      {/* Subtle noise texture — pure Apple-style grain */}
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "256px",
        }}
        aria-hidden="true"
      />

      {/* Main Content */}
      <div
        className={`
          relative z-10 flex
          min-h-[440px] lg:min-h-[520px]
          flex-col items-center justify-start
          px-4 sm:px-6 lg:px-8 pt-10 pb-4
        `}
        dir={isAr ? "rtl" : "ltr"}
      >
        <div className="relative w-full max-w-[1000px] mx-auto flex flex-col items-center justify-center gap-4 sm:gap-5">
          {/* Dynamic copy — cycles within each section */}
          {heroCopy && (
            <div
              className={`
                text-center
                transition-opacity duration-250 ease-out
                ${sceneExiting ? "scene-exit" : ""}
                ${sceneEntering ? "scene-enter" : ""}
                ${!sceneExiting && !sceneEntering && !copyVisible ? "opacity-0" : ""}
                ${!sceneExiting && !sceneEntering && copyVisible ? "opacity-100" : ""}
              `}
              style={{ animationDelay: sceneEntering ? "40ms" : "0ms" }}
              aria-live="polite"
              aria-atomic="true"
            >
              <p
                className={`
                  font-display
                  text-lg sm:text-xl md:text-2xl lg:text-3xl
                  font-light leading-relaxed
                  text-[var(--hero-text-primary)] dark:text-[var(--hero-text-primary-dark)]
                  px-4
                  max-w-[760px]
                `}
              >
                {heroCopy}
              </p>
            </div>
          )}

          {/* CTA Button — elegant minimal */}
          <div
            className={`
              transition-opacity duration-200 ease-out
              ${sceneExiting ? "scene-exit" : ""}
              ${sceneEntering ? "scene-enter" : ""}
            `}
            style={{ animationDelay: sceneEntering ? "100ms" : "0ms" }}
          >
            <Link
              href={currentSection.targetUrl}
              className={`
                group relative inline-flex items-center justify-center
                rounded-full
                border border-[var(--primary)]/30
                bg-transparent
                text-[var(--hero-btn-primary)]
                px-6 py-2.5
                font-medium text-sm tracking-wider
                transition-all duration-[250ms]
                ease-[cubic-bezier(0.22,1,0.36,1)]
                hover:bg-[var(--hero-btn-primary)]
                hover:text-[var(--hero-btn-primary-text)]
                hover:border-transparent
                hover:shadow-[0_4px_14px_-4px_rgba(75,42,111,0.25)]
                active:scale-[0.97]
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-[var(--primary-light)]
                focus-visible:ring-offset-2
                focus-visible:ring-offset-[var(--background)]
                will-change-transform
              `}
              aria-label={isAr ? `اكتشفي ${currentSection.labelAr}` : `Discover ${currentSection.labelEn}`}
            >
              <span className="relative flex items-center gap-1.5">
                <span>
                  {isAr ? `اكتشفي ${currentSection.labelAr}` : `Discover ${currentSection.labelEn}`}
                </span>
              </span>
            </Link>
          </div>
        </div>

        {/* Product Marquee — section-specific, clean transition */}
        <div
          className={`
            relative w-full -mx-4 sm:-mx-6 lg:-mx-8
            ${sceneExiting ? "scene-exit" : ""}
          `}
        >
          <ProductMarquee
            key={sceneKey}
            products={currentProducts}
            entering={sceneEntering}
            sceneKey={sceneKey}
          />
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="sr-only" aria-live="polite">
        {isAr
          ? "استخدم الأسهم للتنقل بين الأقساط"
          : "Use arrow keys to navigate sections"}
      </div>
    </section>
  );
}

export default function Hero() {
  return (
    <HeroProvider>
      <HeroContent />
    </HeroProvider>
  );
}
