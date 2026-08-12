"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Stethoscope, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { productSummaries } from "@/src/data/product-summaries";
import { useLang } from "@/lib/use-lang";
import type { SkinConcern } from "@/types/product";
/* ================================================================================================ */
/* DATA                                                 */
/* ================================================================================================ */
type Problem = {
  concern: SkinConcern;
  labelAr: string;
  labelEn: string;
  taglineAr: string;
  taglineEn: string;
  image: string;
  accent: string;
  accentBg: string;
};

const PROBLEMS: Problem[] = [
  { concern: "acne", labelAr: "حب الشباب", labelEn: "Acne", taglineAr: "بشرة نقية خلال 14 يوم", taglineEn: "Clear skin in 14 days", image: "/images/problems/acne.webp", accent: "#e11d48", accentBg: "rgba(225,29,72,0.08)" },
  { concern: "dryness", labelAr: "جفاف البشرة", labelEn: "Dryness", taglineAr: "ترطيب عميق يدوم 24 ساعة", taglineEn: "24h deep hydration", image: "/images/problems/dryness.webp", accent: "#0284c7", accentBg: "rgba(2,132,199,0.08)" },
  { concern: "pigmentation", labelAr: "تصبغات وكلف", labelEn: "Pigmentation", taglineAr: "توحيد لون وإشراقة", taglineEn: "Even tone & radiance", image: "/images/problems/pigmentation.webp", accent: "#d97706", accentBg: "rgba(217,119,6,0.08)" },
  { concern: "large_pores", labelAr: "مسام واسعة", labelEn: "Pores", taglineAr: "مسام ضيقة وبشرة ناعمة", taglineEn: "Refined & smooth skin", image: "/images/problems/large-pores-v2.webp", accent: "#7c3aed", accentBg: "rgba(124,58,237,0.08)" },
  { concern: "oiliness", labelAr: "لمعة زائدة", labelEn: "Oiliness", taglineAr: "مات بدون جفاف", taglineEn: "Matte without drying", image: "/images/problems/oiliness.webp", accent: "#0891b2", accentBg: "rgba(8,145,178,0.08)" },
  { concern: "sensitivity", labelAr: "بشرة حساسة", labelEn: "Sensitivity", taglineAr: "هدوء وراحة فورية", taglineEn: "Instant calm & comfort", image: "/images/problems/sensitivity-v2.webp", accent: "#059669", accentBg: "rgba(5,150,105,0.08)" },
  { concern: "aging", labelAr: "مكافحة الشيخوخة", labelEn: "Anti-Aging", taglineAr: "بشرة شابة ومشدودة", taglineEn: "Youthful, firm skin", image: "/images/problems/aging.webp", accent: "#db2777", accentBg: "rgba(219,39,119,0.08)" },
  { concern: "dark_circles", labelAr: "هالات سوداء", labelEn: "Dark Circles", taglineAr: "عيون منتعشة ومشرقة", taglineEn: "Bright, refreshed eyes", image: "/images/problems/dark-circles-v2.webp", accent: "#4f46e5", accentBg: "rgba(79,70,229,0.08)" },
];
/* ================================================================================================ */
/* MAIN SECTION                                         */
/* ================================================================================================ */
export default function ProblemSolutions() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  const stripRef = useRef<HTMLDivElement | null>(null);
  const [canScroll, setCanScroll] = useState({ start: false, end: false });

  const updateArrows = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    setCanScroll({
      start: el.scrollLeft > 4,
      end: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = stripRef.current;
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

  const scrollStrip = (dir: 1 | -1) => {
    const el = stripRef.current;
    if (!el) return;
    const amount = Math.max(300, el.clientWidth * 0.8);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <section id="problems" className="w-full bg-white py-8 sm:py-10 lg:py-12">
      <Container>
        {/* = HEADER — aligned to the side = */}
        <SectionTitle
          eyebrow={isAr ? "تشخيص البشرة" : "Skin Diagnosis"}
          title={isAr ? "اختاري مشكلتك" : "Choose Your Concern"}
          subtitle={
            isAr
              ? "كل بشرة فريدة — اكتشفي ما تحتاجه بضغطة واحدة"
              : "Every skin is unique — discover what it needs in one tap"
          }
        />

        {/* = HORIZONTAL STRIP — distinct image per slide = */}
        <div className="relative mt-10">
          <button
            type="button"
            onClick={() => scrollStrip(1)}
            aria-label={isAr ? "التالي" : "Next"}
            className={`absolute -end-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-lg shadow-black/5 transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:text-primary hover:shadow-xl active:scale-95 sm:-end-4 ${
              canScroll.end ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <ChevronRight size={20} />
          </button>
          <button
            type="button"
            onClick={() => scrollStrip(-1)}
            aria-label={isAr ? "السابق" : "Previous"}
            className={`absolute -start-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-lg shadow-black/5 transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:text-primary hover:shadow-xl active:scale-95 sm:-start-4 ${
              canScroll.start ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <ChevronLeft size={20} />
          </button>

          <div
            ref={stripRef}
            className="hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" dir="ltr"
          >
            {PROBLEMS.map((problem, i) => {
              const count = productSummaries.filter((p) =>
                p.skinConcerns?.includes(problem.concern)
              ).length;

              return (
                <Link
                  key={problem.concern}
                  href={`/problems/${problem.concern}`}
                  className="group relative flex w-72 shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white transition-all duration-500 hover:-translate-y-2 hover:border-transparent hover:shadow-2xl sm:w-80"
                  style={{ animation: `slideUp 0.6s cubic-bezier(0.23, 1, 0.32, 1) ${i * 70}ms both` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 25px 50px -12px ${problem.accentBg.replace("0.08", "0.22")}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Image — distinct per problem */}
                  <div className="relative h-48 overflow-hidden bg-gray-50 sm:h-56">
                    <Image
                      src={problem.image}
                      alt={isAr ? problem.labelAr : problem.labelEn}
                      fill
                      sizes="(max-width: 640px) 288px, 320px"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent"
                      style={{ opacity: 0.9 }}
                    />
                    {/* Accent chip */}
                    <span
                      className="absolute top-3 end-3 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-lg backdrop-blur-sm"
                      style={{ backgroundColor: problem.accent }}
                    >
                      {count} {isAr ? "منتج" : "picks"}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <h3
                      className="text-base font-bold text-gray-900 transition-colors duration-300 sm:text-lg"
                      style={{ color: undefined }}
                    >
                      {isAr ? problem.labelAr : problem.labelEn}
                    </h3>
                    <p className="mt-1 text-xs text-gray-400 sm:text-sm">
                      {isAr ? problem.taglineAr : problem.taglineEn}
                    </p>

                    <div className="flex-1" />

                    {/* Explore row */}
                    <div
                      className="mt-4 flex items-center gap-1.5 text-xs font-semibold transition-all duration-300 group-hover:gap-2.5"
                      style={{ color: problem.accent }}
                    >
                      <span>{isAr ? "اكتشفي" : "Explore"}</span>
                      <ArrowLeft
                        size={13}
                        className="transition-transform duration-300 group-hover:-translate-x-1"
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* = CTA — Premium glass banner = */}
        <div className="relative mt-12 overflow-hidden rounded-3xl border border-gray-100 bg-gradient-to-br from-gray-50 via-white to-primary/5 p-6 sm:p-8">
          {/* Decorative dot grid */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

          <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-md shadow-primary/30">
                <Stethoscope size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 sm:text-lg">
                  {isAr ? "مترددة؟ دعينا نساعدك" : "Not sure? Let us help"}
                </h3>
                <p className="mt-0.5 text-sm text-gray-400">
                  {isAr
                    ? "اختبار بشرتك في 60 ثانية — توصيات مخصصة لكِ"
                    : "Your skin quiz in 60 seconds — personalized picks for you"}
                </p>
              </div>
            </div>
            <Link
              href="/quiz"
              className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-7 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:bg-primary hover:shadow-xl hover:shadow-primary/20 active:scale-95"
            >
              <Sparkles size={14} className="text-amber-400" />
              {isAr ? "ابدئي التشخيص" : "Start Quiz"}
              <ArrowLeft size={14} className="transition-transform duration-300 group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
