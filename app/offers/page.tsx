"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Sparkles } from "lucide-react";
import Container from "@/components/ui/Container";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import ProductCard from "@/components/product/ProductCard";
import { useLang } from "@/lib/use-lang";
import { getCurrentWeekOffers, getWeekLabel } from "@/src/engine/engine";
import type { OfferProduct } from "@/src/engine/types";
import type { ProductSummary } from "@/src/types/product";
import { productSummaries as allProducts } from "@/src/data/product-summaries";

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getCountdown(targetDate: Date): Countdown {
  const now = new Date();
  const diff = Math.max(0, targetDate.getTime() - now.getTime());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

const REASON_META: Record<string, { ar: string; en: string; color: string }> = {
  best_seller:   { ar: "الأكثر مبيعاً", en: "Best Seller",     color: "bg-amber-100 text-amber-700" },
  high_demand:   { ar: "طلب مرتفع",  en: "High Demand",      color: "bg-emerald-100 text-emerald-700" },
  low_demand:    { ar: "تحفيز المبيعات", en: "Boost Sales",  color: "bg-blue-100 text-blue-700" },
  new:           { ar: "جديد",       en: "New",              color: "bg-purple-100 text-purple-700" },
  seasonal:      { ar: "موسمي",      en: "Seasonal",         color: "bg-orange-100 text-orange-700" },
  boost_sales:   { ar: "تعزيز",      en: "Boost",            color: "bg-pink-100 text-pink-700" },
  admin_pinned:  { ar: "مثبت",       en: "Pinned",           color: "bg-red-100 text-red-700" },
  month_top:     { ar: "top الشهر",  en: "Month Top",        color: "bg-yellow-100 text-yellow-700" },
};

export default function OffersPage() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  const [countdown, setCountdown] = useState<Countdown>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [weekLabel, setWeekLabel] = useState("");
  const [offers, setOffers] = useState<OfferProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loadedRef = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const apply = () => {
      try {
        const data = getCurrentWeekOffers(allProducts);
        setOffers(data.offers);
        if (data.campaign) {
          setWeekLabel(getWeekLabel(data.campaign.week, isAr));
          const endDate = new Date(data.campaign.endDate);
          const tick = () => setCountdown(getCountdown(endDate));
          tick();
          timer = setInterval(tick, 1000);
        }
        loadedRef.current = true;
      } catch (err) {
        console.error("[OffersPage] Failed to load offers:", err);
        setError(isAr ? "حدث خطأ أثناء تحميل العروض" : "Failed to load offers");
      } finally {
        setLoading(false);
      }
    };
    apply();
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAr, reloadKey]);

  useEffect(() => {
    const failSafe = setTimeout(() => {
      if (loadedRef.current) return;
      setLoading(false);
      setError(isAr ? "حدث خطأ أثناء تحميل العروض" : "Failed to load offers");
    }, 8000);
    return () => clearTimeout(failSafe);
  }, [isAr]);

  const offerProducts = useMemo(() => {
    return offers
      .map((op: OfferProduct) => {
        const product = allProducts.find((p: ProductSummary) => p.id === op.productId);
        if (!product) return null;
        return { product, offer: op };
      })
      .filter(Boolean) as { product: ProductSummary; offer: OfferProduct }[];
  }, [offers]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex items-center gap-3 text-[var(--muted)]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          <span className="text-sm">{isAr ? "جارٍ تحميل العروض..." : "Loading offers..."}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <Container>
          <div className="py-16 text-center">
            <h2 className="text-xl font-bold text-[var(--foreground)]">{error}</h2>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setLoading(true);
                setReloadKey((k) => k + 1);
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              {isAr ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        </Container>
      </div>
    );
  }

  if (offerProducts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <Container>
          <div className="py-16 text-center">
            <Sparkles size={48} className="mx-auto text-[var(--muted)]" />
            <h2 className="mt-4 text-xl font-bold text-[var(--foreground)]">
              {isAr ? "لا توجد عروض حالياً" : "No offers at the moment"}
            </h2>
            <p className="mt-2 text-[var(--muted)]">
              {isAr ? "ستظهر العروض الجديدة بداية الأسبوع القادم" : "New offers will appear next week"}
            </p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--card)]">
        <Container>
          <div className="py-6 sm:py-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              <ArrowLeft size={14} className={isAr ? "rotate-180" : ""} />
              {isAr ? "الرئيسية" : "Home"}
            </Link>
            <h1 className="mt-3 text-2xl font-extrabold text-[var(--foreground)] sm:text-3xl">
              {isAr ? "عروض هذا الأسبوع" : "This Week's Offers"}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {isAr
                ? "محرك العروض الذكي يختار لك أفضل المنتجات والخصومات كل أسبوع"
                : "Our smart engine picks the best products and discounts every week"}
            </p>
          </div>
        </Container>
      </div>

      <Container>
        {/* Week Label + Countdown */}
        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-3 py-1.5 text-sm font-bold text-[var(--primary)]">
              <Sparkles size={14} />
              {weekLabel}
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-6">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--muted)]">
              <Clock size={16} className="text-[var(--error)]" />
              {isAr ? "ينتهي العرض خلال" : "Ends in"}
            </span>
            <div className="flex items-center gap-2">
              {[
                { label: isAr ? "يوم" : "Days", value: countdown.days },
                { label: isAr ? "ساعة" : "Hrs", value: countdown.hours },
                { label: isAr ? "دقيقة" : "Min", value: countdown.minutes },
                { label: isAr ? "ثانية" : "Sec", value: countdown.seconds },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="flex h-12 w-12 flex-col items-center justify-center rounded-[var(--radius-card)] bg-[var(--primary)] text-white shadow-[var(--shadow-card)]"
                >
                  <span className="font-sans text-base font-extrabold leading-none tabular-nums">
                    {String(unit.value).padStart(2, "0")}
                  </span>
                  <span className="mt-0.5 text-[10px] text-white/70">{unit.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="mt-8">
          <HorizontalCarousel ariaLabel={isAr ? "عروض هذا الأسبوع" : "This week offers"}>
            {offerProducts.map(({ product, offer }) => (
              <div key={product.id} className="w-60 shrink-0 sm:w-64">
                <div className="relative">
                  <ProductCard product={product} />
                  {/* Discount Badge */}
                  <span className="absolute top-3 end-3 z-10 inline-flex items-center gap-1 rounded-full bg-[var(--error)] px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
                    -{offer.discount}%
                  </span>
                  {/* Reason Badge */}
                  <span className={`absolute top-3 start-3 z-10 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${REASON_META[offer.reason]?.color ?? "bg-gray-100 text-gray-700"}`}>
                    {REASON_META[offer.reason]?.ar ?? offer.reason}
                  </span>
                </div>
              </div>
            ))}
          </HorizontalCarousel>
        </div>

        {/* Info note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            {isAr
              ? "العروض تتحدّث تلقائياً كل أسبوع — لا حاجة لتحديث الصفحة"
              : "Offers update automatically every week — no need to refresh"}
          </p>
        </div>
      </Container>
    </div>
  );
}