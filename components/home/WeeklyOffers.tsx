"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { products } from "@/lib/products";
import ProductCard from "@/components/product/ProductCard";
import { useLang } from "@/lib/use-lang";

function getWeeklyOffers() {
  const featured = products.filter((p) => p.isBestSeller);
  const sorted = [...featured].sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
  return sorted.slice(0, 4);
}

function getCountdown() {
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() + ((7 - now.getDay()) % 7 || 7));
  end.setHours(23, 59, 59, 999);
  const diff = Math.max(0, end.getTime() - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

export default function WeeklyOffers() {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const { lang } = useLang();
  const isAr = lang === "ar";

  useEffect(() => {
    const tick = () => setCountdown(getCountdown());
    const timer = setInterval(tick, 1000);
    const first = setTimeout(tick, 50);
    return () => {
      clearInterval(timer);
      clearTimeout(first);
    };
  }, []);

  const offers = getWeeklyOffers();

  return (
    <section className="w-full bg-gradient-to-b from-card via-primary-50/40 to-card py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionTitle
          eyebrow={isAr ? "عروض لفترة محدودة" : "Limited Time Offers"}
          title={isAr ? "عروض الأسبوع" : "Weekly Offers"}
          subtitle={
            isAr
              ? "خصومات حصرية على منتجات مختارة بعناية - اغتنمي الفرصة قبل انتهاء الوقت"
              : "Exclusive discounts on carefully selected products - grab the chance before time runs out"
          }
          action={
            <Link
              href="/products"
              className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
            >
              {isAr ? "عرض الكل" : "View All"}
              <ArrowLeft size={15} className={`transition-transform duration-200 ease-out-smooth group-hover:-translate-x-0.5 ${isAr ? "" : "rotate-180"}`} />
            </Link>
          }
        />

        <div className="mb-8 flex flex-col items-center gap-3 rounded-card border border-secondary/20 bg-secondary-50/60 px-5 py-4 sm:flex-row sm:justify-center sm:gap-6">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-secondary-700">
            <Clock size={16} className="text-error" />
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
                className="flex h-12 w-12 flex-col items-center justify-center rounded-card bg-primary text-white shadow-card"
              >
                <span className="font-sans text-base font-extrabold leading-none tabular-nums">
                  {String(unit.value).padStart(2, "0")}
                </span>
                <span className="mt-0.5 text-[10px] text-white/70">{unit.label}</span>
              </div>
            ))}
          </div>
        </div>

        <HorizontalCarousel ariaLabel={isAr ? "عروض الأسبوع" : "Weekly offers"}>
          {offers.map((product) => (
            <div key={product.id} className="w-56 shrink-0 sm:w-60">
              <ProductCard product={product} />
            </div>
          ))}
        </HorizontalCarousel>
      </Container>
    </section>
  );
}
