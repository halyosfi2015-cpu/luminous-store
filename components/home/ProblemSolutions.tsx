"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Sparkles, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import MobileReveal from "@/components/ui/MobileReveal";
import { productSummaries } from "@/src/data/product-summaries";
import { useLang } from "@/lib/use-lang";
import type { ProblemConcern } from "@/src/types/product";
import { countProblemProducts } from "@/src/lib/problem-matching";
/* ================================================================================================ */
/* DATA                                                 */
/* ================================================================================================ */
type Problem = {
  concern: ProblemConcern;
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
  { concern: "large_pores", labelAr: "مسام واسعة", labelEn: "Pores", taglineAr: "مسام ضيقة وبشرة ناعمة", taglineEn: "Refined & smooth skin", image: "/images/problems/large-pores-v2.webp", accent: "#7c3aed", accentBg: "rgba(124,58,237,0.08)" },
  { concern: "oiliness", labelAr: "لمعة زائدة", labelEn: "Oiliness", taglineAr: "مات بدون جفاف", taglineEn: "Matte without drying", image: "/images/problems/oiliness.webp", accent: "#0891b2", accentBg: "rgba(8,145,178,0.08)" },
  { concern: "sensitivity", labelAr: "بشرة حساسة", labelEn: "Sensitivity", taglineAr: "هدوء وراحة فورية", taglineEn: "Instant calm & comfort", image: "/images/problems/sensitivity-v2.webp", accent: "#059669", accentBg: "rgba(5,150,105,0.08)" },
  { concern: "aging", labelAr: "مكافحة الشيخوخة", labelEn: "Anti-Aging", taglineAr: "بشرة شابة ومشدودة", taglineEn: "Youthful, firm skin", image: "/images/problems/aging.webp", accent: "#db2777", accentBg: "rgba(219,39,119,0.08)" },
  { concern: "dark_circles", labelAr: "هالات سوداء", labelEn: "Dark Circles", taglineAr: "عيون منتعشة ومشرقة", taglineEn: "Bright, refreshed eyes", image: "/images/problems/dark-circles-v2.webp", accent: "#4f46e5", accentBg: "rgba(79,70,229,0.08)" },
  // ── New concerns (louz parity) with real condition photos. ──
  { concern: "rosacea", labelAr: "الوردية", labelEn: "Rosacea", taglineAr: "تهدئة الاحمرار", taglineEn: "Calm redness", image: "/images/problems/rosacea-card.webp", accent: "#e11d48", accentBg: "rgba(225,29,72,0.08)" },
  { concern: "eczema", labelAr: "الأكزيما", labelEn: "Eczema", taglineAr: "راحة للبشرة المتهيجة", taglineEn: "Relief for irritated skin", image: "/images/problems/eczema.webp", accent: "#0284c7", accentBg: "rgba(2,132,199,0.08)" },
  { concern: "tired_skin", labelAr: "البشرة المرهقة", labelEn: "Tired Skin", taglineAr: "انتعاش وحيوية", taglineEn: "Freshness & vitality", image: "/images/problems/tired-skin.webp", accent: "#0891b2", accentBg: "rgba(8,145,178,0.08)" },
  { concern: "stretch_marks", labelAr: "علامات التمدد", labelEn: "Stretch Marks", taglineAr: "مرونة وتحسين المظهر", taglineEn: "Elasticity & smoother look", image: "/images/problems/stretch-marks.webp", accent: "#059669", accentBg: "rgba(5,150,105,0.08)" },
  { concern: "pigmentation", labelAr: "تصبغات وكلف", labelEn: "Pigmentation", taglineAr: "توحيد لون وإشراقة", taglineEn: "Even tone & radiance", image: "/images/problems/pigmentation.webp", accent: "#d97706", accentBg: "rgba(217,119,6,0.08)" },
];

/* Hair artwork: real local category photography (no watermarks, instant load).
   Swap any entry with a dedicated photo later by changing its image path. */
const HAIR_PROBLEMS: Problem[] = [
  { concern: "hair_loss", labelAr: "تساقط الشعر", labelEn: "Hair Loss", taglineAr: "كثافة وقوة من الجذور", taglineEn: "Density & strength from roots", image: "/images/problems/hair-loss.webp", accent: "#7c3aed", accentBg: "rgba(124,58,237,0.08)" },
  { concern: "dandruff", labelAr: "القشرة", labelEn: "Dandruff", taglineAr: "فروة نظيفة بدون قشرة", taglineEn: "Clean flake-free scalp", image: "/images/problems/dandruff.webp", accent: "#0284c7", accentBg: "rgba(2,132,199,0.08)" },
  { concern: "dry_hair", labelAr: "الشعر الجاف", labelEn: "Dry Hair", taglineAr: "ترطيب ولمعان", taglineEn: "Hydration & shine", image: "/images/problems/dry-hair.webp", accent: "#d97706", accentBg: "rgba(217,119,6,0.08)" },
  { concern: "oily_scalp", labelAr: "الفروة الدهنية", labelEn: "Oily Scalp", taglineAr: "انتعاش يدوم", taglineEn: "Lasting freshness", image: "/images/problems/oily-scalp.webp", accent: "#0891b2", accentBg: "rgba(8,145,178,0.08)" },
  { concern: "split_ends", labelAr: "تقصف الأطراف", labelEn: "Split Ends", taglineAr: "أطراف صحية", taglineEn: "Healthy ends", image: "/images/problems/split-ends.webp", accent: "#db2777", accentBg: "rgba(219,39,119,0.08)" },
  { concern: "dyed_hair", labelAr: "الشعر المصبوغ", labelEn: "Dyed Hair", taglineAr: "لون يدوم وإشراقة", taglineEn: "Lasting color & shine", image: "/images/problems/dyed-hair.webp", accent: "#9333ea", accentBg: "rgba(147,51,234,0.08)" },
  { concern: "curly_hair", labelAr: "الشعر الكيرلي", labelEn: "Curly Hair", taglineAr: "تموجات محددة", taglineEn: "Defined curls", image: "/images/problems/curly-hair.webp", accent: "#059669", accentBg: "rgba(5,150,105,0.08)" },
  { concern: "sensitive_scalp", labelAr: "الفروة التحسسية", labelEn: "Sensitive Scalp", taglineAr: "راحة بدون تهيج", taglineEn: "Calm without irritation", image: "/images/problems/sensitive-scalp.webp", accent: "#4f46e5", accentBg: "rgba(79,70,229,0.08)" },
  { concern: "frizzy_hair", labelAr: "الشعر المتطاير", labelEn: "Frizzy Hair", taglineAr: "نعومة وانسيابية", taglineEn: "Smooth & sleek", image: "/images/problems/frizzy-hair.webp", accent: "#ea580c", accentBg: "rgba(234,88,12,0.08)" },
  { concern: "dull_hair", labelAr: "الشعر الباهت", labelEn: "Dull Hair", taglineAr: "لمعان وحيوية", taglineEn: "Shine & vitality", image: "/images/problems/dull-hair.webp", accent: "#ca8a04", accentBg: "rgba(202,138,4,0.08)" },
];
/* ================================================================================================ */
/* SHARED RAIL (skin + hair strips use the identical premium card) */
/* ================================================================================================ */
function ProblemRail({ items, ariaLabel }: { items: Problem[]; ariaLabel: string }) {
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
    <MobileReveal delay={100}>
    <div className="relative mt-6 sm:mt-10">
      <button
        type="button"
        onClick={() => scrollStrip(1)}
        aria-label={isAr ? "التالي" : "Next"}
        className={`absolute -end-3 top-1/2 z-20 hidden h-11 w-11 sm:flex -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-lg shadow-black/5 transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:text-primary hover:shadow-xl active:scale-95 sm:-end-4 ${
          canScroll.end ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <ChevronRight size={20} />
      </button>
      <button
        type="button"
        onClick={() => scrollStrip(-1)}
        aria-label={isAr ? "السابق" : "Previous"}
        className={`absolute -start-3 top-1/2 z-20 hidden h-11 w-11 sm:flex -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-lg shadow-black/5 transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:text-primary hover:shadow-xl active:scale-95 sm:-start-4 ${
          canScroll.start ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <ChevronLeft size={20} />
      </button>

      <div
        ref={stripRef}
        role="region"
        aria-label={ariaLabel}
        className="magic-stagger magic-fade-x hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 scroll-px-4 sm:-mx-6 sm:px-6 sm:gap-5 lg:-mx-8 lg:px-8" dir="ltr"
      >
        {items.map((problem, i) => {
          const count = countProblemProducts(productSummaries, problem.concern);

          return (
            <Link
              key={problem.concern}
              href={`/problems/${problem.concern}`}
              className="group relative flex w-[64vw] max-w-[240px] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white transition-all duration-500 hover:-translate-y-2 hover:border-transparent hover:shadow-2xl sm:w-80 sm:max-w-none"
              style={{ animation: `slideUp 0.6s cubic-bezier(0.23, 1, 0.32, 1) ${i * 70}ms both` }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 25px 50px -12px ${problem.accentBg.replace("0.08", "0.22")}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Image — distinct per problem */}
              <div className="magic-autoshine luminous-shine relative h-36 overflow-hidden bg-gray-50 sm:h-56">
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
                  className="luminous-glow-pulse absolute top-3 end-3 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-lg backdrop-blur-sm"
                  style={{ backgroundColor: problem.accent }}
                >
                  {count} {isAr ? "منتج" : "picks"}
                </span>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-3 sm:p-5">
                <div dir={isAr ? "rtl" : "ltr"} className="text-start">
                <h3
                  className="text-[14px] font-bold text-gray-900 transition-colors duration-300 sm:text-lg"
                  style={{ color: undefined }}
                >
                  {isAr ? problem.labelAr : problem.labelEn}
                </h3>
                <p className="mt-1 text-[12px] leading-[1.6] text-gray-500 sm:text-sm">
                  {isAr ? problem.taglineAr : problem.taglineEn}
                </p>
                </div>

                <div className="flex-1" />

                {/* Explore row */}
                <div
                  className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold transition-all duration-300 group-hover:gap-2.5 sm:text-xs"
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
    </MobileReveal>
  );
}

/* ================================================================================================ */
/* MAIN SECTION                                         */
/* ================================================================================================ */
export default function ProblemSolutions() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [problemTab, setProblemTab] = useState<"skin" | "hair">("skin");

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

        {/* = SKIN / HAIR TOGGLE = */}
        <div className="mt-6 flex items-center justify-center gap-2" role="tablist" aria-label={isAr ? "نوع المشكلة" : "Concern type"}>
          {(["skin", "hair"] as const).map((t) => {
            const active = problemTab === t;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setProblemTab(t)}
                className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-pill border px-5 py-2 text-[12.5px] font-bold transition-all duration-200 active:scale-95 sm:min-h-[44px] sm:px-6 sm:py-2.5 sm:text-sm sm:font-extrabold ${
                  active
                    ? "border-primary bg-primary text-white shadow-lg shadow-primary/30"
                    : "border-border bg-card text-muted hover:border-primary/40 hover:text-primary"
                }`}
              >
                {isAr ? (t === "skin" ? "مشاكل البشرة" : "مشاكل الشعر") : (t === "skin" ? "Skin" : "Hair")}
              </button>
            );
          })}
        </div>

        <ProblemRail
          key={problemTab}
          items={problemTab === "skin" ? PROBLEMS : HAIR_PROBLEMS}
          ariaLabel={isAr ? (problemTab === "skin" ? "مشاكل البشرة" : "مشاكل الشعر") : (problemTab === "skin" ? "Skin concerns" : "Hair concerns")}
        />

        {/* = CTA — Premium glass banner with starfield = */}
        <div className="relative mt-4 overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-l from-primary-50 via-white to-secondary-50 px-3 py-2.5 sm:mt-12 sm:p-8">
          {/* Decorative dot grid */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          {/* Twinkling stars */}
          <div className="magic-sparkles" aria-hidden="true">
            <i style={{ top: "18%", left: "8%" }} />
            <i style={{ top: "30%", left: "22%", animationDelay: "0.5s" }} />
            <i style={{ top: "12%", left: "55%", animationDelay: "1.1s" }} />
            <i style={{ top: "65%", left: "12%", animationDelay: "0.8s" }} />
            <i style={{ top: "75%", left: "48%", animationDelay: "1.6s" }} />
            <i style={{ top: "25%", left: "82%", animationDelay: "0.3s" }} />
            <i style={{ top: "60%", left: "70%", animationDelay: "2s" }} />
            <i style={{ top: "80%", left: "90%", animationDelay: "1.3s" }} />
          </div>

            <div className="relative flex flex-row items-center gap-2.5 text-start sm:gap-6 sm:justify-between">
              <h3 className="min-w-0 flex-1 text-[13px] font-bold leading-snug text-gray-900 sm:text-lg">
                {isAr ? "مترددة؟ دعينا نساعدك" : "Not sure? Let us help"}
              </h3>
            <Link
              href="/quiz"
              className="magic-cta luminous-shine group inline-flex shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full px-4 py-2 min-h-[40px] text-[11px] font-bold text-white transition-all duration-300 active:scale-95 sm:px-7 sm:py-3.5 sm:text-sm"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                <ClipboardCheck size={13} className="text-white" />
              </span>
              {isAr ? "ابدئي التشخيص" : "Start Quiz"}
              <ArrowLeft size={14} className="transition-transform duration-300 group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
