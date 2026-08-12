"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Star, Users, Clock, ShoppingCart, Sparkles } from "lucide-react";
import Container from "@/components/ui/Container";
import { useLang } from "@/lib/use-lang";
import { routines, productSummaries } from "@/src/data/product-summaries";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}
/* ================================================================================================ */
/* ROUTINE DATA WITH PLACEHOLDER METRICS   */
/* ================================================================================================ */
interface RoutineMeta {
  rating: number;
  reviews: number;
  buyers: number;
  savingsPercent: number;
  duration: string;
  forWhom: string;
  expectedResult: string;
}

const ROUTINE_META: Record<string, RoutineMeta> = {
  rt1: { rating: 4.8, reviews: 234, buyers: 1850, savingsPercent: 15, duration: "30 يوم", forWhom: "لكل أنواع البشرة", expectedResult: "بشرة نضرة وصحية طوال اليوم" },
  rt2: { rating: 4.9, reviews: 187, buyers: 1420, savingsPercent: 18, duration: "30 يوم", forWhom: "لكل أنواع البشرة", expectedResult: "بشرة متجددة عند الاستيقاظ" },
  rt3: { rating: 4.7, reviews: 312, buyers: 2450, savingsPercent: 20, duration: "14 يوم", forWhom: "بشرة دهنية ومعرضة لحب الشباب", expectedResult: "تقليل ظهور الحبوب بنسبة 80%" },
  rt4: { rating: 4.8, reviews: 203, buyers: 1560, savingsPercent: 16, duration: "21 يوم", forWhom: "بشرة جافة ومتعبة", expectedResult: "ترطيب عميق يدوم 24 ساعة" },
};
/* ================================================================================================ */
/* ROUTINE CARD COMPONENT                  */
/* ================================================================================================ */
function RoutineCard({ routine, index, isAr }: { routine: typeof routines[0]; index: number; isAr: boolean }) {
  const meta = ROUTINE_META[routine.id] || ROUTINE_META.rt1;
  const routineProducts = routine.products.map((id) => productSummaries.find((p) => p.id === id)).filter(Boolean);
  const totalPrice = routineProducts.reduce((sum, p) => sum + (p?.pricing?.price || 0), 0);
  const discountedPrice = Math.round(totalPrice * (1 - meta.savingsPercent / 100));
  const mainImage = routineProducts[0]?.gallery?.[0];

  const GRADIENTS = [
    "from-rose-500/10 to-pink-500/10",
    "from-violet-500/10 to-purple-500/10",
    "from-amber-500/10 to-orange-500/10",
    "from-emerald-500/10 to-teal-500/10",
    "from-sky-500/10 to-blue-500/10",
  ];

  return (
    <div
      className="group shrink-0 w-72 sm:w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:border-primary/20"
      style={{ animation: `slideUp 0.5s cubic-bezier(0.23, 1, 0.32, 1) ${index * 80}ms both` }}
    >
      {/* Image */}
      <div className={`relative h-40 overflow-hidden bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]}`}>
        {mainImage && (
          <Image
            src={mainImage}
            alt={routine.nameAr}
            fill
            sizes="320px"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {/* Badge */}
        <span className="absolute top-3 end-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-gray-800 shadow-sm backdrop-blur-sm">
          <Sparkles size={10} className="text-amber-500" />
          {isAr ? `${meta.savingsPercent}% توفير` : `Save ${meta.savingsPercent}%`}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-base font-bold text-gray-900 mb-1">{routine.nameAr}</h3>
        <p className="text-xs text-gray-500 mb-3">{routine.descriptionAr}</p>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            {meta.rating} ({meta.reviews})
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} />
            {meta.buyers.toLocaleString("ar-YE")} {isAr ? "اشتري" : "bought"}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {meta.duration}
          </span>
        </div>

        {/* Products preview */}
        <div className="flex items-center gap-1 mb-3">
          <div className="flex -space-x-2">
            {routineProducts.slice(0, 4).map((p, i) => p?.gallery?.[0] && (
              <div key={i} className="relative h-7 w-7 overflow-hidden rounded-full border-2 border-white bg-gray-100">
                <Image src={p.gallery[0]} alt="" fill sizes="28px" className="object-cover" />
              </div>
            ))}
          </div>
          <span className="ms-2 text-[11px] text-gray-400">
            {routineProducts.length} {isAr ? "منتجات" : "products"}
          </span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-lg font-extrabold text-gray-900">{formatPrice(discountedPrice)}</span>
          <span className="text-sm text-gray-400 line-through">{formatPrice(totalPrice)}</span>
          <span className="text-[11px] text-gray-400">{isAr ? "ر.ي" : "YER"}</span>
        </div>

        {/* CTA */}
        <Link
          href={`/routines/${routine.id}`}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-md shadow-primary/30 transition-all duration-300 hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/40 active:scale-[0.98]"
        >
          <ShoppingCart size={16} />
          {isAr ? "شاهدي الروتين" : "View Routine"}
        </Link>
      </div>
    </div>
  );
}
/* ================================================================================================ */
/* MAIN COMPONENT                          */
/* ================================================================================================ */
export default function SmartRoutineBuilder() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setCanScroll] = useState({ start: false, end: false });

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScroll({
      start: el.scrollLeft > 4,
      end: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  return (
    <section className="w-full bg-gradient-to-b from-gray-50 to-white py-12 sm:py-16 lg:py-20">
      <Container>
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 shadow-lg shadow-primary/20">
            <Sparkles size={12} className="text-amber-400" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">
              {isAr ? "روتينات متكاملة" : "Complete Routines"}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-primary sm:text-3xl">
            {isAr ? "روتينات متكاملة" : "Complete Routines"}
          </h2>
          <p className="mt-2 max-w-md text-sm text-gray-500">
            {isAr
              ? "روتينات جاهزة لكل مشكلة — شاهدي تفاصيل كل روتين ومنتجاتة"
              : "Ready routines for every concern — view full details and products"}
          </p>
        </div>

        {/* Horizontal scrollable carousel */}
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto scroll-smooth pb-4 px-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {routines.map((routine, i) => (
              <RoutineCard key={routine.id} routine={routine} index={i} isAr={isAr} />
            ))}
          </div>

          {/* Arrows — left pulls left, right pulls right (physical) */}
          <button
            type="button"
            onClick={() => scrollBy(isAr ? 1 : -1)}
            aria-label={isAr ? "التالي" : "Next"}
            className="absolute start-0 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-lg backdrop-blur-sm transition-all hover:bg-primary hover:text-white hover:shadow-xl active:scale-90"
          >
            {isAr ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button
            type="button"
            onClick={() => scrollBy(isAr ? -1 : 1)}
            aria-label={isAr ? "السابق" : "Previous"}
            className="absolute end-0 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-lg backdrop-blur-sm transition-all hover:bg-primary hover:text-white hover:shadow-xl active:scale-90"
          >
            {isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </Container>
    </section>
  );
}

