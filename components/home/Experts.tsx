"use client"

import { useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, BadgeCheck, Star, MapPin, Stethoscope, ChevronLeft, ChevronRight } from "lucide-react"
import Container from "@/components/ui/Container"
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
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-secondary">
              <span className="h-0.5 w-6 rounded-pill bg-accent" />
              {t(content.eyebrowAr, content.eyebrowEn)}
            </span>
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {t(content.titleAr, content.titleEn)}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-gray-600">
              {t(content.subtitleAr, content.subtitleEn)}
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

        {/* Join-the-network CTA */}
        <div className="mt-7 flex flex-col items-center gap-3 rounded-3xl border border-primary/10 bg-gradient-to-l from-primary/[0.04] via-white to-secondary/[0.06] px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-start">
          <div>
            <h3 className="text-sm font-bold text-gray-900 sm:text-base">
              {t("لديك خبرة تستحق أن تصل إلى من يحتاجها؟", "Have expertise that deserves to reach those who need it?")}
            </h3>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              {t(
                "انضم إلى شبكة خبراء Luminous Derma وشارك خبرتك لتقديم تجربة أكثر تخصصًا لعملائنا.",
                "Join the Luminous Derma expert network and help deliver a more specialised experience."
              )}
            </p>
          </div>
          <Link
            href="/experts/join"
            className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-bold text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:bg-primary-700 hover:shadow-primary/40 active:scale-95 sm:text-sm"
          >
            <Stethoscope size={15} className="text-accent-light" />
            {t("انضم إلى خبرائنا", "Join Our Experts")}
            <ArrowLeft size={13} className="transition-transform duration-300 group-hover:-translate-x-1" />
          </Link>
        </div>
      </Container>
    </section>
  )
}

