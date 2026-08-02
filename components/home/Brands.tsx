"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { brands } from "@/lib/content";
import { useLang } from "@/lib/use-lang";
import Image from "next/image";

const t = (isAr: boolean, ar: string, en: string) => (isAr ? ar : en);

export default function Brands() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  const featuredBrands = brands.filter((b) => b.featured);

  return (
    <section className="w-full bg-gradient-to-b from-card via-primary-50/30 to-card py-16 sm:py-20 lg:py-24" dir={isAr ? "rtl" : "ltr"}>
      <Container>
        <SectionTitle
          eyebrow={t(isAr, "شركاء الجمال", "Beauty Partners")}
          title={t(isAr, "علامات تجارية موثوقة", "Trusted Brands")}
          subtitle={
            isAr
              ? "نقدم لكِ أشهر الماركات العالمية المعتمدة والأصلية 100%"
              : "The world's most renowned, 100% authentic brands"
          }
          action={
            <Link
              href="/brands"
              className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
            >
              {t(isAr, "عرض الكل", "View All")}
              <ArrowLeft
                size={15}
                className={`transition-transform duration-200 ease-out-smooth group-hover:-translate-x-0.5 ${isAr ? "" : "rotate-180"}`}
              />
            </Link>
          }
        />

        <HorizontalCarousel ariaLabel={t(isAr, "العلامات التجارية", "Brands")}>
          {featuredBrands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.slug}`}
              className="group relative w-56 shrink-0 rounded-card border border-border bg-gradient-to-br from-card via-card to-card px-6 py-6 text-center shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/10 sm:w-60"
            >
              <div className="relative mx-auto h-20 w-32">
                <Image
                  src={brand.logo}
                  alt={isAr ? brand.nameAr : brand.name}
                  fill
                  sizes="(max-width: 640px) 128px, 160px"
                  className="object-contain opacity-90 transition-all duration-300 group-hover:scale-105 group-hover:opacity-100"
                />
              </div>
              <span className="mt-3 block text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-primary">
                {isAr ? brand.nameAr : brand.name}
              </span>
            </Link>
          ))}
        </HorizontalCarousel>
      </Container>
    </section>
  );
}
