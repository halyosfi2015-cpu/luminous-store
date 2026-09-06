"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Star, Clock, Users, Sparkles, Flame } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import ProductImage from "@/components/product/ProductImage";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { useLang } from "@/lib/use-lang";
import { useProducts } from "@/hooks/useProducts";
import { getRoutines, getRoutineTypes, resolveRoutineProducts, fetchRoutinesFromAPI } from "@/src/data/routines-store";
import { safeRatingDisplay, safeReviewCountDisplay, safeBuyersDisplay } from "@/lib/ratings";
import type { Routine, RoutineLevel } from "@/types/product";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

const LEVEL_META: Record<RoutineLevel, { ar: string; en: string; color: string }> = {
  basic: { ar: "أساسي", en: "Essential", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  standard: { ar: "قياسي", en: "Standard", color: "bg-sky-50 text-sky-700 border-sky-200" },
  premium: { ar: "متقدم", en: "Premium", color: "bg-purple-50 text-purple-700 border-purple-200" },
};

export default function RoutinesPage() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { products: apiProducts } = useProducts();
  const [routines, setRoutines] = useState<Routine[]>(() => getRoutines());
  const [types, setTypes] = useState<{ type: string; typeAr: string }[]>(() => getRoutineTypes());
  const [activeType, setActiveType] = useState<string>("all");
  const [activeLevel, setActiveLevel] = useState<RoutineLevel | "all">("all");

  useEffect(() => {
    fetchRoutinesFromAPI().then((apiRoutines) => {
      if (apiRoutines.length > 0) {
        setRoutines(apiRoutines);
        const seen = new Map<string, string>();
        for (const r of apiRoutines) {
          if (!seen.has(r.type)) seen.set(r.type, r.typeAr);
        }
        setTypes(Array.from(seen, ([type, typeAr]) => ({ type, typeAr })));
      }
    });
  }, []);

  const typeFiltered = useMemo(
    () => routines.filter((r) => (activeType === "all" ? true : r.type === activeType)),
    [routines, activeType]
  );

  const filtered = useMemo(
    () =>
      typeFiltered
        .filter((r) => activeLevel === "all" || (r.level ?? "standard") === activeLevel)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [typeFiltered, activeLevel]
  );

  // Levels available within the currently selected type — hierarchical sub-filter
  const availableLevels = useMemo(
    () =>
      (Object.keys(LEVEL_META) as RoutineLevel[]).filter((lv) =>
        typeFiltered.some((r) => (r.level ?? "standard") === lv)
      ),
    [typeFiltered]
  );

  const countForLevel = (lv: RoutineLevel | "all") =>
    lv === "all"
      ? typeFiltered.length
      : typeFiltered.filter((r) => (r.level ?? "standard") === lv).length;

  if (types.length === 0) return null;

  return (
    <div dir="rtl" className="w-full pb-16">
      <section className="w-full bg-gradient-to-b from-white via-primary/5 to-white py-14 sm:py-18 lg:py-20">
        <Container>
          <SectionTitle
            eyebrow={isAr ? "روتينك المثالي بخطوات بسيطة" : "Your Perfect Routine, Simplified"}
            title={isAr ? "اختاري روتينك، نحن نوفر عليك التفكير" : "Pick Your Routine — We Handle the Rest"}
            subtitle={
              isAr
                ? "كل روتين يشمل المنتجات كاملة بثلاثة مستويات (أساسي / قياسي / متقدم) — وفّري حتى 20% مقارنة بالشراء المنفصل"
                : "Every routine includes full products in three levels (Essential / Standard / Premium) — save up to 20% vs buying separately"
            }
          />

          {/* Type tabs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {/* All tab */}
            <button
              type="button"
              onClick={() => {
                setActiveType("all");
                setActiveLevel("all");
              }}
              className={`group inline-flex items-center gap-2 rounded-pill border px-3 py-2 text-xs font-bold transition-all duration-200 ease-out-smooth ${
                activeType === "all"
                  ? "border-primary bg-primary text-white shadow-md shadow-primary/30"
                  : "border-border bg-card text-muted hover:border-primary/40 hover:text-primary"
              }`}
            >
              <span>{isAr ? "الكل" : "All"}</span>
            </button>

            {types.map((t) => {
              const isActive = activeType === t.type;
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => {
                    setActiveType(t.type);
                    setActiveLevel("all");
                  }}
                  className={`group inline-flex items-center gap-2 rounded-pill border px-3 py-2 text-xs font-bold transition-all duration-200 ease-out-smooth ${
                    isActive
                      ? "border-primary bg-primary text-white shadow-md shadow-primary/30"
                      : "border-border bg-card text-muted hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  <span>{t.typeAr}</span>
                </button>
              );
            })}
          </div>

          {/* Level tabs — only levels available within the selected type (no screen jump) */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <LevelTab
              active={activeLevel === "all"}
              onClick={() => setActiveLevel("all")}
              label={isAr ? "الكل" : "All"}
            />
            {availableLevels.map((lv) => (
              <LevelTab
                key={lv}
                active={activeLevel === lv}
                onClick={() => setActiveLevel(lv)}
                label={isAr ? LEVEL_META[lv].ar : LEVEL_META[lv].en}
              />
            ))}
          </div>

          {/* Routines grid — organized, no overlap */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((routine, i) => {
              const routineProducts = resolveRoutineProducts(routine, apiProducts ?? []);
              const totalPrice = routineProducts.reduce((sum, p) => sum + p.pricing.price, 0);
              const discountedPrice = Math.round(totalPrice * (1 - routine.savingsPercent / 100));
              const level = (routine.level ?? "standard") as RoutineLevel;
              const levelMeta = LEVEL_META[level];
              return (
                <Link
                  key={routine.id}
                  href={`/routines/${routine.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-card-hover"
                  style={{ animation: `slideUp 0.5s cubic-bezier(0.23, 1, 0.32, 1) ${i * 70}ms both` }}
                >
                  <div className="relative h-44 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 sm:h-48">
                    {routineProducts.length > 0 ? (
                      <div className="flex h-full w-full items-stretch">
                        {routineProducts.slice(0, 4).map(
                          (p) =>
                            p.gallery?.[0] && (
                              <div key={p.id} className="relative min-w-0 flex-1 overflow-hidden">
                                <ProductImage
                                  src={p.gallery[0]}
                                  alt={p.name.ar}
                                  productId={p.id}
                                  variant="soft"
                                  hoverZoom={false}
                                  pedestal={false}
                                  className="absolute inset-0 h-full w-full"
                                  sizes="220px"
                                />
                              </div>
                            )
                        )}
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-100 to-secondary-100">
                        <Sparkles size={26} className="text-primary/60" />
                      </div>
                    )}

                    <div className="absolute top-3 start-3 z-10">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold backdrop-blur-sm ${levelMeta.color}`}>
                        <Flame size={9} className="fill-current" />
                        {levelMeta.ar}
                      </span>
                    </div>

                    <div className="absolute top-3 end-3 z-10">
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-rose-600 shadow-sm backdrop-blur-sm">
                        {isAr ? "توفير" : "save"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-base font-bold text-gray-900 line-clamp-1 transition-colors duration-300 group-hover:text-primary">
                      {routine.nameAr}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{routine.descriptionAr}</p>

                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex -space-x-3 space-x-reverse">
                        {routineProducts.slice(0, 4).map(
                          (p) =>
                            p.gallery?.[0] && (
                              <span key={p.id} className="relative h-11 w-11 overflow-hidden rounded-full border-2 border-card bg-card shadow-sm">
                                <ProductImage src={p.gallery[0]} alt={p.name.ar} productId={p.id} variant="soft" hoverZoom={false} pedestal={false} className="absolute inset-0 h-full w-full" />
                              </span>
                            )
                        )}
                      </div>
                      <span className="rounded-pill bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                        {isAr ? "منتجات مختارة" : "selected products"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                      <span className="inline-flex items-center gap-1"><Star size={11} className="fill-amber-400 text-amber-400" /> {isAr ? "تقييم ممتاز" : "Excellent"}</span>
                      <span className="inline-flex items-center gap-1"><Users size={11} /> {isAr ? "عميلات راضيات" : "happy clients"}</span>
                      <span className="inline-flex items-center gap-1"><Clock size={11} /> {isAr ? "روتين يومي" : "daily routine"}</span>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                      <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary px-4 py-2 text-xs font-bold text-white transition-all duration-200 ease-out-smooth group-hover:bg-primary-dark">
                        {isAr ? "شاهدي الروتين" : "View Routine"}
                        <ArrowLeft size={13} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border bg-card/50 py-16 text-center">
              <Sparkles size={22} className="text-primary/50" />
              <p className="text-sm font-semibold text-muted">
                {isAr ? "لا توجد روتينات في هذا المستوى Currently" : "No routines at this level yet"}
              </p>
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}

function LevelTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-pill border px-3 py-1 text-[11px] font-bold transition-all duration-200 ease-out-smooth ${active ? "border-primary/40 bg-primary/10 text-primary shadow-sm" : "border-border bg-transparent text-muted hover:border-primary/30 hover:text-primary"}`}>
      {label}
    </button>
  );
}