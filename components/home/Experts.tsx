"use client"

import { useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, BadgeCheck, Star, MapPin, Stethoscope, ChevronLeft, ChevronRight } from "lucide-react"
import Container from "@/components/ui/Container"
import MobileReveal from "@/components/ui/MobileReveal"
import { useAdminExperts } from "@/hooks/useAdminExperts"
import { useLang } from "@/lib/use-lang"
import { useSectionContent } from "@/components/site-content/SiteContentProvider"
import { getExpertImage } from "@/lib/expert-images"

export default function Experts() {
  const { lang } = useLang()
  const isAr = lang === "ar"
  const t = (ar: string, en: string) => (isAr ? ar : en)
  const content = useSectionContent("experts")
  const stripRef = useRef<HTMLDivElement>(null)
  const experts = useAdminExperts()

  const scrollStrip = (dir: 1 | -1) => {
    const el = stripRef.current
    if (!el) return
    el.scrollBy({ left: dir * 200, behavior: "smooth" })
  }

  if (!content.visible) return null

  return (
    <section id="experts" className="w-full scroll-mt-28 bg-white py-8 sm:py-10 lg:py-12">
      <Container>
        {/* Header */}
        <div className="mb-5 sm:mb-7 flex flex-wrap items-end justify-between gap-4 max-sm:flex-nowrap max-sm:items-center max-sm:gap-2">
          <div className="max-sm:min-w-0 max-sm:flex-1">
            <span className="magic-eyebrow">
              <span className="magic-star" aria-hidden="true" />
              {t(content.eyebrowAr, content.eyebrowEn)}
            </span>
            <h2 className="magic-title text-[22px] font-bold sm:text-3xl">
              {t(content.titleAr, content.titleEn)}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-gray-600 max-sm:hidden">
              {t(content.subtitleAr, content.subtitleEn)}
            </p>
          </div>
          <Link
            href="/experts"
            className="group inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-primary transition-colors hover:text-primary-dark sm:text-sm"
          >
            {t("عرض الكل", "View All")}
            <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>

        {/* Horizontal strip — grows in width as count increases */}
        <MobileReveal delay={100}>
        <div className="relative">
          <button
            type="button"
            onClick={() => scrollStrip(1)}
            aria-label={isAr ? "التالي" : "Next"}
            className="absolute -end-3 top-1/2 z-20 hidden h-10 w-10 sm:flex -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-lg shadow-black/5 transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:text-primary hover:shadow-xl active:scale-95"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            onClick={() => scrollStrip(-1)}
            aria-label={isAr ? "السابق" : "Previous"}
            className="absolute -start-3 top-1/2 z-20 hidden h-10 w-10 sm:flex -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-lg shadow-black/5 transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:text-primary hover:shadow-xl active:scale-95"
          >
            <ChevronLeft size={18} />
          </button>

          <div ref={stripRef} className="magic-stagger magic-fade-x hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0" dir="ltr">
            {experts.map((expert) => (
            <Link
              key={expert.id}
              href={`/experts/${expert.slug}`}
              className="magic-card-glow group relative w-[64vw] max-w-[240px] shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 sm:w-48 sm:p-5 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg"
              dir="rtl"
            >
              {/* Avatar + Verified Seal */}
              <div className="magic-ping relative mx-auto mb-3 h-24 w-24 sm:h-28 sm:w-28">
                <div className="relative mx-auto mb-3 h-24 w-24 rounded-full bg-gradient-to-br from-primary via-accent to-secondary p-[2.5px] shadow-card transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20 sm:h-28 sm:w-28">
                <div className="h-full w-full overflow-hidden rounded-full bg-gray-50">
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
                    className="luminous-glow-pulse absolute -bottom-1 -end-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-primary-950 shadow-md ring-2 ring-white"
                    title={t("خبير معتمد", "Certified Expert")}
                  >
                    <BadgeCheck size={16} strokeWidth={2.5} />
                  </span>
                )}
                </div>
              </div>

              {/* Info */}
              <div className="text-center">
                <h3 className="text-sm font-bold text-gray-900 transition-colors duration-300 group-hover:text-primary">
                  {isAr ? expert.nameAr : expert.name}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-primary/70">
                  {isAr ? expert.titleAr : expert.title}
                </p>

                {/* Rating & Location */}
                <div className="mt-2 flex items-center justify-center gap-2 text-[11px] sm:text-xs text-gray-500">
                  {expert.rating && (
                    <span className="flex items-center gap-0.5">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-gray-600">{expert.rating}</span>
                    </span>
                  )}
                  {expert.cityAr && (
                    <span className="flex items-center gap-0.5">
                      <MapPin size={10} />
                      {isAr ? expert.cityAr : expert.city}
                    </span>
                  )}
                </div>

                {/* CTA */}
                <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-primary/5 py-2.5 min-h-[44px] justify-center text-xs font-bold text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white">
                  <Stethoscope size={15} />
                  {t("استشارة", "Consult")}
                  <ArrowLeft size={12} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}
          </div>
        </div>
        </MobileReveal>

        {/* Join-the-network CTA */}
        <div className="relative mt-7 flex flex-row flex-nowrap items-center gap-2 overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-l from-primary-50 via-white to-secondary-50 px-3 py-2.5 text-start sm:px-6 sm:py-6 sm:flex-row sm:justify-between sm:text-start">
          <div className="magic-ping flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-accent-light shadow-md shadow-primary/30">
            <BadgeCheck size={18} />
          </div>
          <div className="relative min-w-0 flex-1">
          <div className="magic-sparkles" aria-hidden="true">
            <i style={{ top: "20%", left: "10%" }} />
            <i style={{ top: "70%", left: "25%", animationDelay: "0.7s" }} />
            <i style={{ top: "30%", left: "60%", animationDelay: "1.2s" }} />
            <i style={{ top: "65%", left: "85%", animationDelay: "0.4s" }} />
            <i style={{ top: "45%", left: "42%", animationDelay: "1.8s" }} />
          </div>
          <div className="flex min-w-0 flex-row flex-nowrap items-center gap-2">
            <p className="min-w-0 flex-1 text-[13px] font-bold leading-relaxed text-gray-900 max-sm:text-[11px] max-sm:leading-snug sm:text-sm">
              {t(
                "انضم إلى شبكة خبراء Luminous Derma وشارك خبرتك لتقديم تجربة أكثر تخصصًا لعملائنا.",
                "Join the Luminous Derma expert network and help deliver a more specialised experience."
              )}
            </p>
            <Link
              href="/experts/join"
              className="magic-cta luminous-shine group inline-flex shrink-0 items-center gap-1 overflow-hidden whitespace-nowrap rounded-full py-1 pe-1.5 ps-3 min-h-[30px] justify-center text-[11px] font-bold sm:w-auto text-white transition-all duration-300 active:scale-95 sm:text-xs sm:ps-4 sm:py-1.5 sm:min-h-[34px]"
            >
              {t("انضم", "Join")}
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-primary-950 shadow-sm transition-transform duration-300 group-hover:-translate-x-0.5 sm:h-6 sm:w-6">
                <ArrowLeft size={12} strokeWidth={2.5} />
              </span>
            </Link>
          </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

