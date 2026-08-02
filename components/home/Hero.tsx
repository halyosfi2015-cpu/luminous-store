"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "@/lib/use-lang";

const slides = [
  {
    id: 1,
    titleAr: "بشرة أكثر إشراقاً",
    titleEn: "Radiant Skin",
    subtitleAr: "جمال طبيعي يدوم",
    subtitleEn: "Natural beauty that lasts",
    descriptionAr: "منتجات العناية بالبشرة والشعر والجسم",
    descriptionEn: "Skincare, hair care & body care products",
    description2Ar: "لبشرة أكثر نضارة وصحة",
    description2En: "For a more radiant and healthy complexion",
    ctaAr: "اكتشفي المجموعة",
    ctaEn: "Discover the Collection",
    ctaLink: "/products",
  },
  {
    id: 2,
    titleAr: "بشرة نضرة متألقة",
    titleEn: "Glowing Complexion",
    subtitleAr: "عناية فاخرة بلمسة طبيعية",
    subtitleEn: "Luxury care with a natural touch",
    descriptionAr: "نظام عناية متكامل للبشرة والشعر والجسم",
    descriptionEn: "Complete care system for skin, hair, and body",
    description2Ar: "مع أفضل الماركات العالمية المعتمدة",
    description2En: "With the world's best verified brands",
    ctaAr: "اكتشفي العروض",
    ctaEn: "Discover Offers",
    ctaLink: "/products?filter=sale",
  },
  {
    id: 3,
    titleAr: "رحلة العناية الملكية",
    titleEn: "Royal Skincare Ritual",
    subtitleAr: "خطوة واحدة نحو الجمال الأنيق",
    subtitleEn: "One step towards elegant beauty",
    descriptionAr: "عطور وعناية طبيعية مصنوعة بحب",
    descriptionEn: "Natural fragrances and care made with love",
    description2Ar: "للنضارة الطبيعية والعطر المميز",
    description2En: "For natural radiance and signature scent",
    ctaAr: "اكتشفي العطور",
    ctaEn: "Discover Fragrances",
    ctaLink: "/categories/perfume",
  },
];

const MODEL_IMAGE = "/images/hero/beauty-model-image.png";

export default function Hero() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [current, setCurrent] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [autoplay, next]);

  const slide = slides[current];

  return (
    <section
      className="relative mx-auto w-full max-w-[1500px] overflow-hidden bg-gradient-to-br from-primary via-secondary/30 to-primary"
      style={{ minHeight: "680px" }}
      aria-roledescription="carousel"
      aria-label={isAr ? "عرض الترحيب" : "Welcome slideshow"}
      onMouseEnter={() => setAutoplay(false)}
      onMouseLeave={() => setAutoplay(true)}
    >
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -right-10 top-1/3 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute left-1/4 top-1/2 h-32 w-32 rounded-full bg-accent/8 blur-2xl" />
        <div className="absolute -right-32 bottom-1/4 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div
        className="absolute inset-0 opacity-35"
        aria-hidden="true"
        style={{
          backgroundImage: `url('${MODEL_IMAGE}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: "blur(2px)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/40 to-transparent" />
      </div>

      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute -top-40 -right-20 h-80 w-80 rounded-full bg-accent/8 blur-3xl" />
        <div className="absolute bottom-10 -left-32 h-64 w-64 rounded-full bg-accent/6 blur-2xl" />
      </div>

      <div className="relative z-10 mx-auto flex h-full min-h-[680px] w-full max-w-6xl items-center gap-8 px-4 sm:px-6 lg:gap-12 lg:px-8" dir={isAr ? "rtl" : "ltr"}>
        <div className={`relative flex w-full flex-col items-center gap-6 text-center lg:w-1/2 lg:items-start lg:text-left ${isAr ? "" : "lg:mr-auto"} lg:order-0`}>
          <div key={current} className={`flex w-full flex-col items-center gap-6 ${isAr ? "lg:items-end lg:text-right" : "lg:items-start lg:text-left"} lg:gap-8 animate-fade-slide-in`}>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="font-sans text-xs font-semibold tracking-wider text-accent uppercase">
                {isAr ? "مجموعة حصرية" : "Exclusive Collection"}
              </span>
            </div>

            <h1 className="font-serif text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              {isAr ? slide.titleAr : slide.titleEn}
            </h1>

            <h2 className="font-serif text-xl font-semibold leading-tight text-accent sm:text-2xl lg:text-3xl">
              {isAr ? slide.subtitleAr : slide.subtitleEn}
            </h2>

            <p className="font-sans text-sm leading-relaxed text-white/80 sm:text-base lg:text-lg">
              {isAr ? slide.descriptionAr : slide.descriptionEn}
            </p>
            <p className="font-sans text-sm leading-relaxed text-white/80 sm:text-base lg:text-lg">
              {isAr ? slide.description2Ar : slide.description2En}
            </p>

            <Link
              href={slide.ctaLink}
              className="inline-flex items-center justify-center font-medium rounded-button bg-accent px-8 py-3 text-sm font-bold text-primary shadow-card transition-all duration-200 ease-out-smooth hover:bg-accent/90 hover:shadow-primary"
            >
              {isAr ? slide.ctaAr : slide.ctaEn}
            </Link>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label={isAr ? "الانتقال للعرض السابق" : "Previous slide"}
            onClick={prev}
            className="absolute start-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all duration-200 ease-out-smooth hover:bg-white/20"
          >
            <ChevronRight size={18} className={isAr ? "" : "rotate-180"} />
          </button>
          <button
            type="button"
            aria-label={isAr ? "الانتقال للعرض التالي" : "Next slide"}
            onClick={next}
            className="absolute end-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all duration-200 ease-out-smooth hover:bg-white/20"
          >
            <ChevronLeft size={18} className={isAr ? "" : "rotate-180"} />
          </button>
          <div className="absolute bottom-4 start-1/2 z-20 flex -translate-x-1/2 gap-2" role="tablist" aria-label={isAr ? "نقاط التنقال" : "Slide navigation"}>
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={current === i}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setCurrent(i)}
                className={`h-2.5 rounded-full transition-all duration-300 ease-out-smooth ${current === i ? "w-8 bg-accent" : "w-2.5 bg-white/40 hover:bg-white/60"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
