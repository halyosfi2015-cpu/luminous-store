"use client"

import { useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, BadgeCheck, Star, MapPin, Stethoscope, ChevronLeft, ChevronRight } from "lucide-react"
import Container from "@/components/ui/Container"
import { experts } from "@/lib/content"
import { useLang } from "@/lib/use-lang"
import { getExpertImage } from "@/lib/expert-images"

export default function Experts() {
  const { lang } = useLang()
  const isAr = lang === "ar"
  const t = (ar: string, en: string) => (isAr ? ar : en)
  const stripRef = useRef<HTMLDivElement>(null)

  const scrollStrip = (dir: 1 | -1) => {
    const el = stripRef.current
    if (!el) return
    el.scrollBy({ left: dir * 340, behavior: "smooth" })
  }

  return (
    <section id="experts" className="w-full scroll-mt-28 bg-white py-8 sm:py-10 lg:py-12">
      <Container>
        {/* Header */}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-secondary">
              <span className="h-0.5 w-6 rounded-pill bg-accent" />
              {t("خبراء موثوقون", "Trusted Experts")}
            </span>
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {t("خبراء العناية بالبشرة", "Skincare Experts")}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-gray-600">
              {t(
                "فريق متخصص يقدم استشارات مخصصة لاختيار المنتجات والروتين المناسبة",
                "Specialized team offering personalized consultations for your products and routines"
              )}
            </p>
          </div>
          <Link
            href="/experts"
            className="group inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-primary-dark"
          >
            {t("عرض جميع الخبراء", "View All Experts")}
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>

        {/* Horizontal strip — grows in width as count increases */}
        <div className="relative">
          <button
            type="button"
            onClick={() => scrollStrip(1)}
            aria-label={isAr ? "التالي" : "Next"}
            className="absolute -end-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-lg shadow-black/5 transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:text-primary hover:shadow-xl active:scale-95"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            onClick={() => scrollStrip(-1)}
            aria-label={isAr ? "السابق" : "Previous"}
            className="absolute -start-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-lg shadow-black/5 transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:text-primary hover:shadow-xl active:scale-95"
          >
            <ChevronLeft size={18} />
          </button>

          <div ref={stripRef} className="hide-scrollbar flex gap-4 overflow-x-auto pb-3" dir="ltr">
            {experts.map((expert) => (
            <Link
              key={expert.id}
              href={`/experts/${expert.slug}`}
              className="group relative w-48 shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg"
              dir="rtl"
            >
              {/* Avatar + Verified Seal */}
              <div className="relative mx-auto mb-3 h-28 w-28">
                <div className="relative mx-auto mb-3 h-28 w-28 overflow-hidden rounded-full border-2 border-gray-100 bg-gray-50 transition-all duration-300 group-hover:border-primary/30">
                  <Image
                    src={getExpertImage(expert)}
                    alt={isAr ? expert.nameAr : expert.name}
                    width={112}
                    height={112}
                    className="h-full w-full object-contain"
                  />
                </div>
                {expert.isVerified && (
                  <span
                    className="absolute -bottom-1 -end-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-primary-950 shadow-md ring-2 ring-white"
                    title={t("خبير معتمد", "Certified Expert")}
                  >
                    <BadgeCheck size={16} strokeWidth={2.5} />
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="text-center">
                <h3 className="text-sm font-bold text-gray-900 transition-colors duration-300 group-hover:text-primary">
                  {isAr ? expert.nameAr : expert.name}
                </h3>
                <p className="mt-0.5 text-[10px] font-medium text-primary/70">
                  {isAr ? expert.titleAr : expert.title}
                </p>

                {/* Rating & Location */}
                <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-gray-500">
                  {expert.rating && (
                    <span className="flex items-center gap-0.5">
                      <Star size={9} className="fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-gray-600">{expert.rating}</span>
                    </span>
                  )}
                  {expert.cityAr && (
                    <span className="flex items-center gap-0.5">
                      <MapPin size={8} />
                      {isAr ? expert.cityAr : expert.city}
                    </span>
                  )}
                </div>

                {/* CTA */}
                <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-primary/5 py-2 text-[11px] font-bold text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white">
                  <Stethoscope size={15} />
                  {t("استشارة", "Consult")}
                  <ArrowLeft size={12} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

