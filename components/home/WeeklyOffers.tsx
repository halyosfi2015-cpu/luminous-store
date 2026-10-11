"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Clock, Sparkles, TrendingUp, Tag } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import MobileReveal from "@/components/ui/MobileReveal";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import ProductCard from "@/components/product/ProductCard";
import { useLang } from "@/lib/use-lang";
import { getCurrentWeekOffers } from "@/src/engine/engine";
import type { OfferProduct } from "@/src/engine/types";
import type { ProductSummary } from "@/src/types/product";
import { productSummaries as allProducts } from "@/src/data/product-summaries";

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const REASON_META: Record<string, { ar: string; en: string; icon: typeof Sparkles; color: string }> = {
  best_seller:   { ar: "الأكثر مبيعاً", en: "Best Seller",     icon: TrendingUp, color: "bg-amber-100 text-amber-700" },
  high_demand:   { ar: "طلب مرتفع",  en: "High Demand",      icon: TrendingUp, color: "bg-emerald-100 text-emerald-700" },
  low_demand:    { ar: "تحفيز المبيعات", en: "Boost Sales",  icon: Tag,        color: "bg-blue-100 text-blue-700" },
  new:           { ar: "جديد",       en: "New",              icon: Sparkles,   color: "bg-purple-100 text-purple-700" },
  seasonal:      { ar: "موسمي",      en: "Seasonal",         icon: Sparkles,   color: "bg-orange-100 text-orange-700" },
  boost_sales:   { ar: "تعزيز",      en: "Boost",            icon: Tag,        color: "bg-pink-100 text-pink-700" },
  admin_pinned:  { ar: "مثبت",       en: "Pinned",           icon: Sparkles,   color: "bg-red-100 text-red-700" },
  month_top:     { ar: "top الشهر",  en: "Month Top",        icon: TrendingUp, color: "bg-yellow-100 text-yellow-700" },
};

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

export default function WeeklyOffers() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  const [mounted, setMounted] = useState(false);
  const [countdown, setCountdown] = useState<Countdown>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => setMounted(true), []);

  const weekData = useMemo(() => {
    if (!mounted) return { offers: [] as OfferProduct[], campaign: null as any };
    const data = getCurrentWeekOffers(allProducts);
    return data;
  }, [mounted]);

  const { offers, campaign } = weekData;
  const weekLabel = isAr ? "الأسبوع" : "This Week";

  useEffect(() => {
    if (!campaign) return;

    const endDate = new Date(campaign.endDate);

    const tick = () => setCountdown(getCountdown(endDate));
    tick();
    const timer = setInterval(tick, 1000);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      clearInterval(timer);
    }

    return () => clearInterval(timer);
  }, [campaign]);

  // Fallback: when the engine has no active campaign on this device,
  // show discounted / best-seller products so the section never disappears.
  const fallbackOffers = useMemo<OfferProduct[]>(() => {
    if (offers.length > 0) return [];
    const cands = allProducts.filter(
      (p: ProductSummary) => ((p as { discount?: number }).discount ?? 0) > 0 || p.isBestSeller
    );
    const pool = cands.length > 0 ? cands : allProducts.slice(0, 10);
    return pool.slice(0, 10).map((p: ProductSummary) => ({
      productId: p.id,
      discount: (p as { discount?: number }).discount ?? 10,
      reason: (p.isBestSeller ? "best_seller" : "boost_sales") as OfferProduct["reason"],
    }));
  }, [offers]);

  const offerProducts = useMemo(() => {
    return (offers.length > 0 ? offers : fallbackOffers)
      .map((op: OfferProduct) => {
        const product = allProducts.find((p: ProductSummary) => p.id === op.productId);
        if (!product) return null;
        if (op.reason === "month_top") return null;
        return { product, offer: op };
      })
      .filter(Boolean) as { product: ProductSummary; offer: OfferProduct }[];
  }, [offers, fallbackOffers]);

  if (!mounted) return null;
  if (offerProducts.length === 0) return null;

  return (
    <section
      id="offers"
      className="magic-aurora w-full scroll-mt-28 py-8 sm:py-10 lg:py-12"
    >
      <Container className="[&_h2]:text-[22px] sm:[&_h2]:text-4xl">
        <SectionTitle
          eyebrow={isAr ? "عروض لفترة محدودة" : "Limited Time Offers"}
          title={isAr ? `عروض ${weekLabel}` : `${weekLabel} Offers`}
          action={
            <Link
              href="/offers"
              className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1.5 min-h-[38px] text-[11px] font-semibold text-[var(--foreground)] transition-all duration-200 ease-out-smooth hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5 sm:px-4 sm:py-2.5 sm:min-h-[44px] sm:text-sm"
            >
              {isAr ? "عرض الكل" : "View All"}
            </Link>
          }
        />

        <MobileReveal delay={100}>
        {/* Countdown */}
        <div className="mb-5 flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] px-5 py-4 sm:flex-row sm:justify-center sm:gap-6">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--muted)]">
            <Clock size={16} className="text-[var(--error)]" />
            {isAr ? "ينتهي العرض خلال" : "Ends in"}
          </span>
          <div className="flex flex-nowrap items-center justify-center gap-1.5 sm:gap-2">
            {[
              { label: isAr ? "يوم" : "Days", value: countdown.days },
              { label: isAr ? "ساعة" : "Hrs", value: countdown.hours },
              { label: isAr ? "دقيقة" : "Min", value: countdown.minutes },
              { label: isAr ? "ثانية" : "Sec", value: countdown.seconds },
            ].map((unit) => (
              <div
                key={unit.label}
                className="magic-countbox flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl border border-accent/30 bg-gradient-to-b from-primary-dark via-primary to-primary-dark text-white sm:h-14 sm:w-14"
              >
                <span className="font-sans text-sm font-extrabold leading-none tabular-nums text-[#F7D98C] [text-shadow:0_0_12px_rgba(247,217,140,0.55)] sm:text-lg">
                  {String(unit.value).padStart(2, "0")}
                </span>
                <span className="mt-1 text-[10px] font-bold text-white/60 sm:text-[9px]">{unit.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Products */}
        <HorizontalCarousel ariaLabel={isAr ? "عروض الأسبوع" : "Weekly offers"} autoplay autoplaySpeed={4500}>
          {offerProducts.map(({ product, offer }) => (
            <div key={product.id} className="w-[calc(50dvw-24px)] min-w-[140px] max-w-[170px] shrink-0 snap-start sm:w-64 sm:min-w-[256px] sm:max-w-none">
              <div className="relative">
                <ProductCard product={product} hideBadges />
                {/* Discount Badge */}
                <span className="luminous-ribbon absolute top-2 end-2 z-10 inline-flex max-w-[42%] items-center gap-1 truncate rounded-full bg-gradient-to-l from-[var(--error)] via-[#ff7a7a] to-[var(--error)] px-2 py-0.5 text-[10px] font-bold text-white shadow-lg sm:top-3 sm:end-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
                  -{offer.discount}%
                </span>
                {/* Reason Badge */}
                <span className={`absolute top-2 start-2 z-10 inline-flex max-w-[42%] items-center gap-1 truncate rounded-full px-1.5 py-0.5 text-[10px] font-bold sm:top-3 sm:start-3 sm:px-2 sm:py-1 sm:text-[9px] ${REASON_META[offer.reason]?.color ?? "bg-gray-100 text-gray-700"}`}>
                  {REASON_META[offer.reason]?.ar ?? offer.reason}
                </span>
              </div>
            </div>
          ))}
        </HorizontalCarousel>
        </MobileReveal>
      </Container>
    </section>
  );
}
