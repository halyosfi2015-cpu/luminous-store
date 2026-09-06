"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Package,
  Sparkles,
  CheckCircle,
  Calendar,
  Clock,
  Palette,
  Droplets,
  Zap,
  Flower2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Star,
} from "lucide-react"
import AutoProductStrip from "@/components/home/AutoProductStrip"
import Container from "@/components/ui/Container"
import SectionTitle from "@/components/ui/SectionTitle"
import Reveal from "@/components/ui/Reveal"
import { getBundleProducts } from "@/src/data/bundles"
import { fetchCanonicalBundles } from "@/src/lib/canonical-bundles"
import type { Bundle } from "@/src/types/bundle"
import { useLang } from "@/lib/use-lang"
import { useSectionContent } from "@/components/site-content/SiteContentProvider"
import type { ServiceItemOverride } from "@/src/lib/content-store"

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>> = {
  Palette,
  Droplets,
  Zap,
  Flower2,
  Sparkles,
  Heart,
  Star,
}

function toBeautyService(item: ServiceItemOverride): BeautyService {
  const split = (s: string) => s.split("|").map((x) => x.trim()).filter(Boolean)
  return {
    id: item.id,
    titleAr: item.titleAr,
    titleEn: item.titleEn,
    descAr: item.descAr,
    descEn: item.descEn,
    features: split(item.featuresAr),
    featuresEn: split(item.featuresEn),
    icon: ICON_MAP[item.icon] ?? Sparkles,
    href: item.href || "/contact",
    available: item.available === true,
    image: item.image || "",
    taglineAr: item.taglineAr || "",
    taglineEn: item.taglineEn || "",
  }
}

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE")
}
/* ================================================================================================ */
/* SERVICES DATA — LUXURY EDITORIAL       */
/* ================================================================================================ */
export interface BeautyService {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  features: string[];
  featuresEn: string[];
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  href: string;
  available: boolean;
  image?: string;
  taglineAr?: string;
  taglineEn?: string;
}

export const SERVICES: BeautyService[] = [
  {
    id: "makeup",
    titleAr: "خدمات المكياج",
    titleEn: "Makeup Services",
    descAr: "مكياج احترافي لأجمل إطلالة في مناسباتك",
    descEn: "Professional makeup for your best look",
    features: ["مكياج عروس", "مكياج مناسبات", "تعليم المكياج"],
    featuresEn: ["Bridal Makeup", "Event Makeup", "Makeup Lessons"],
    icon: Palette,
    href: "/contact",
    available: false,
  },
  {
    id: "skincare",
    titleAr: "العناية بالبشرة",
    titleEn: "Skincare Treatments",
    descAr: "جلسات علاجية لبشرة مشرقة وصحية",
    descEn: "Therapeutic sessions for radiant, healthy skin",
    features: ["تنظيف بشرة", "هيدرا فيشل", "علاج حب الشباب"],
    featuresEn: ["Skin Cleansing", "HydraFacial", "Acne Treatment"],
    icon: Droplets,
    href: "/contact",
    available: false,
  },
  {
    id: "laser",
    titleAr: "الإزالة بالليزر",
    titleEn: "Laser Hair Removal",
    descAr: "بشرة ناعمة خالية من الشعر بتقنيات حديثة",
    descEn: "Smooth hair-free skin with advanced techniques",
    features: ["إزالة الشعر نهائياً", "تقنيات آمنة", "نتائج فورية"],
    featuresEn: ["Permanent Removal", "Safe Techniques", "Instant Results"],
    icon: Zap,
    href: "/contact",
    available: false,
  },
  {
    id: "hair",
    titleAr: "عناية الشعر",
    titleEn: "Hair Care",
    descAr: "علاجات مخصصة لتقوية وترطيب شعرك",
    descEn: "Personalized treatments to strengthen and moisturize",
    features: ["علاج التساقط", "ترطيب عميق", "تصفيف احترافي"],
    featuresEn: ["Hair Loss Treatment", "Deep Conditioning", "Professional Styling"],
    icon: Flower2,
    href: "/contact",
    available: false,
  },
]
/* ================================================================================================ */
/* MAIN SECTION                           */
/* ================================================================================================ */
export default function PremiumServicesAndBundles({ serverBundles }: { serverBundles?: Bundle[] }) {
  const { lang } = useLang()
  const isAr = lang === "ar"
  const t = (ar: string, en: string) => (isAr ? ar : en)
  const bundlesContent = useSectionContent("bundles")
  const servicesContent = useSectionContent("services")

  const [topBundles, setTopBundles] = useState<Bundle[]>(serverBundles?.slice(0, 4) ?? [])
  // Admin-managed services: empty saved list → hardcoded defaults stay in place.
  const [adminServices, setAdminServices] = useState<BeautyService[] | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch("/api/content/services")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!cancelled && Array.isArray(d.items) && d.items.length > 0) {
          setAdminServices(d.items.filter((s: ServiceItemOverride) => s.hidden !== true).map(toBeautyService))
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  const activeServices = adminServices ?? SERVICES
  useEffect(() => {
    let cancelled = false
    fetchCanonicalBundles()
      .then((d) => {
        if (!cancelled && d.bundles.length > 0) {
          setTopBundles(d.bundles.slice(0, 4))
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const stripRef = useRef<HTMLDivElement | null>(null)
  const [canScroll, setCanScroll] = useState({ start: false, end: false })

  const updateArrows = useCallback(() => {
    const el = stripRef.current
    if (!el) return
    setCanScroll({
      start: el.scrollLeft > 8,
      end: el.scrollLeft < el.scrollWidth - el.clientWidth - 8,
    })
  }, [])

  useEffect(() => {
    updateArrows()
    const el = stripRef.current
    if (!el) return
    const observer = new ResizeObserver(updateArrows)
    observer.observe(el)
    el.addEventListener("scroll", updateArrows, { passive: true })
    window.addEventListener("resize", updateArrows)
    return () => {
      observer.disconnect()
      el.removeEventListener("scroll", updateArrows)
      window.removeEventListener("resize", updateArrows)
    }
  }, [updateArrows])

  const scrollStrip = (dir: 1 | -1) => {
    const el = stripRef.current
    if (!el) return
    el.scrollBy({ left: dir * 200, behavior: "smooth" })
  }

  if (!bundlesContent.visible && !servicesContent.visible) return null

  return (
    <section id="bundles" className="w-full scroll-mt-28 bg-white py-8 sm:py-10 lg:py-12">
      <Container>
        {/* = BUNDLES SECTION — WITH ICONS = */}
        {bundlesContent.visible && (<div className="mb-12">
          {/* Header */}
          <SectionTitle
            eyebrow={<>
              <span className="h-0.5 w-6 rounded-pill bg-accent" />
              {t(bundlesContent.eyebrowAr, bundlesContent.eyebrowEn)}
            </>}
            title={t(bundlesContent.titleAr, bundlesContent.titleEn)}
            subtitle={t(bundlesContent.subtitleAr, bundlesContent.subtitleEn)}
            action={
              <Link
                href="/bundles"
                className="group inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-primary-dark"
              >
                {t("عرض الكل", "View All")}
              </Link>
            }
          />

          {/* Bundle Cards — WITH ICONS, responsive scroll track + nav arrows */}
          <div className="relative">
            <button
              type="button"
              onClick={() => scrollStrip(-1)}
              aria-label={t("السابق", "Previous")}
              className={`absolute -start-3 top-24 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-lg shadow-black/5 transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:text-primary active:scale-95 ${
                canScroll.start ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollStrip(1)}
              aria-label={t("التالي", "Next")}
              className={`absolute -end-3 top-24 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-lg shadow-black/5 transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:text-primary active:scale-95 ${
                canScroll.end ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <ChevronLeft size={18} />
            </button>

            <div
              ref={stripRef}
              className="hide-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 scroll-smooth"
              dir="ltr"
            >
              {topBundles.map((bundle) => {
                const products = getBundleProducts(bundle)
                return (
                  <div key={bundle.id} className="w-[calc(100%-1.5rem)] shrink-0 snap-start sm:w-[calc(50%-1.25rem)] lg:w-[calc(25%-0.9375rem)]">
                    <Link
                      href={`/bundles/${bundle.slug}`}
                      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:ring-2 hover:ring-amber-400/40"
                    >
                  {/* Image — auto product strip */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                    <AutoProductStrip products={products} speed={0} itemClassName="w-36" itemRounded="rounded-xl" gapClass="me-1.5" />

                          {/* Badge */}
                          {bundle.badge && (
                            <div className="absolute top-3 start-3">
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-white shadow-lg">
                                <Sparkles size={10} />
                                {bundle.badgeAr || bundle.badge}
                              </span>
                            </div>
                          )}

                          {/* Savings */}
                          <div className="absolute top-3 end-3">
                            <span className="inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold text-emerald-600 shadow-sm">
                              {t(`وفّري ${bundle.savingsPercent}%`, `Save ${bundle.savingsPercent}%`)}
                            </span>
                          </div>
                        </div>

                        {/* Content — WITH ICONS */}
                        <div className="flex flex-1 flex-col gap-2 p-4">
                          <div className="flex items-center gap-1.5">
                            <Package size={13} className="text-primary" />
                            <span className="text-[11px] font-medium text-gray-400">
                              {t(`${products.length} منتجات`, `${products.length} Products`)}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-gray-900 line-clamp-1 transition-colors duration-300 group-hover:text-primary">
                            {bundle.nameAr}
                          </h3>

                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {bundle.descriptionAr}
                          </p>

                          {/* Price */}
                          <div className="mt-auto flex items-baseline gap-2 pt-2">
                            <span className="text-lg font-extrabold text-gray-900">
                              {formatPrice(bundle.bundlePrice)}
                            </span>
                            <span className="text-sm text-gray-400 line-through">
                              {formatPrice(bundle.originalPrice)}
                            </span>
                            <span className="ms-auto text-[10px] font-bold text-emerald-600">ر.ي</span>
                          </div>

                          {/* Button */}
                          <div className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white transition-all duration-300 hover:bg-primary-700 group-hover:shadow-lg group-hover:shadow-primary/40 active:scale-[0.98]">
                            {t("استكشف الباقة", "Explore Bundle")}
                            <ArrowLeft size={13} className="text-accent-light transition-transform duration-300 group-hover:-translate-x-1" />
                          </div>
                        </div>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>

          {/* Design Bundle CTA */}
          <div className="mt-8 text-center">
            <Link
              href="/bundles/design"
              className="group inline-flex items-center gap-3 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary/25 transition-all duration-300 hover:bg-primary-700 hover:shadow-primary/40 active:scale-95"
            >
              <Sparkles size={16} className="text-accent-light" />
              {t("صممي باقتك الخاصة", "Design Your Own Bundle")}
              <ArrowLeft size={15} className="transition-transform duration-300 group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>)}

        {/* = DIVIDER = */}
        {bundlesContent.visible && servicesContent.visible && (
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        )}

        {/* = SERVICES TITLE — OUTSIDE THE BOX = */}
        {servicesContent.visible && (
        <div id="services">
        <SectionTitle
          eyebrow={<>
            <span className="h-0.5 w-6 rounded-pill bg-accent" />
            {t(servicesContent.eyebrowAr, servicesContent.eyebrowEn)}
          </>}
          title={t(servicesContent.titleAr, servicesContent.titleEn)}
          subtitle={t(servicesContent.subtitleAr, servicesContent.subtitleEn)}
          action={
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-4 py-2 text-xs font-bold text-primary transition-all duration-300 hover:border-primary hover:bg-primary hover:text-white sm:text-sm"
            >
              {t("احجزي موعدك", "Book Appointment")}
            </Link>
          }
        />

        {/* = SERVICES — LUXURY EDITORIAL (compact size) = */}
        <div className="relative mx-auto mt-8 w-full max-w-5xl scroll-mt-28 overflow-hidden rounded-[2.5rem] border border-primary/15 bg-gradient-to-br from-[#FFF7F2] via-primary-50 to-secondary-50 p-6 sm:p-8">
          {/* Top gold hairline */}
          <span className="pointer-events-none absolute inset-x-10 top-0 h-[3px] rounded-b-full bg-gradient-to-l from-primary via-accent to-primary" />

          {/* Subtle decorative glows — static, calm */}
          <div className="pointer-events-none absolute -top-32 -start-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -end-32 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
          <Sparkles size={14} className="pointer-events-none absolute top-8 end-8 text-accent/40" />
          <Sparkles size={10} className="pointer-events-none absolute bottom-10 start-10 text-secondary/30" />

          {/* Service Cards — WHITE, GOLD ICONS */}
          <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {activeServices.map((service, i) => (
              <Reveal key={service.id} index={i}>
              <Link
                href={service.href}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/25 hover:shadow-[0_18px_40px_-16px_rgba(75,42,111,0.28)]"
              >
                {/* Optional service image */}
                {service.image ? (
                  <div className="relative h-32 overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50">
                    <Image src={service.image} alt={service.titleAr} fill unoptimized className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent" />
                  </div>
                ) : null}

                <div className="p-5 flex flex-col flex-1">
                  {/* Gold underline on hover */}
                  <span className="pointer-events-none absolute inset-x-5 bottom-0 h-[3px] origin-center scale-x-0 rounded-full bg-gradient-to-l from-primary via-accent to-primary transition-transform duration-500 group-hover:scale-x-100" />

                  {/* Icon — gold → Luminous purple on hover */}
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-accent/25 bg-accent-50 text-accent transition-all duration-500 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-secondary group-hover:text-accent-light group-hover:shadow-md group-hover:shadow-primary/30">
                    <service.icon size={18} strokeWidth={1.6} />
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-primary-800 transition-colors duration-300 group-hover:text-primary">
                    {isAr ? service.titleAr : service.titleEn}
                  </h3>

                  {/* Description */}
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
                    {isAr ? service.descAr : service.descEn}
                  </p>

                  {/* Features */}
                  <ul className="mt-2.5 space-y-1.5">
                    {(isAr ? service.features : service.featuresEn).map((feature, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                        <CheckCircle size={11} className="shrink-0 text-accent" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Availability */}
                  <div className="mt-auto pt-4">
                    {!service.available ? (
                      <div className="inline-flex items-center gap-2 self-start rounded-full bg-gradient-to-l from-primary to-secondary px-4 py-2 text-xs font-bold text-white shadow-[0_8px_20px_-8px_rgba(75,42,111,0.5)] sm:text-sm">
                        <Clock size={14} className="shrink-0 text-accent-light" />
                        {t("قريباً", "Coming Soon")}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 self-start text-[11px] font-bold text-primary transition-all duration-300 group-hover:gap-2.5">
                        {t("احجزي الآن", "Book Now")}
                        <ArrowLeft size={10} />
                      </div>
                    )}
                  </div>
                </div>
              </Link>
              </Reveal>
            ))}
          </div>

          {/* Bottom CTA — Luminous purple + gold */}
          <div className="relative mt-8 flex flex-col items-center gap-2.5 text-center">
            <p className="text-[11px] text-gray-500">
              {t(
                "خدمة مخصصة للعروس أو لإطلالة ليلتك — راسلينا",
                "Bespoke service for the bride or your night's look — reach out"
              )}
            </p>
            <Link
              href="/contact"
              className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-l from-primary to-secondary px-7 py-3 text-xs font-bold text-white shadow-[0_12px_28px_-10px_rgba(75,42,111,0.5)] transition-all duration-300 hover:shadow-[0_16px_36px_-10px_rgba(75,42,111,0.65)] active:scale-95 sm:text-sm"
            >
              <Calendar size={15} className="text-accent-light" />
              {t("احجزي استشارة", "Book a Consultation")}
              <ArrowLeft size={13} className="text-accent-light transition-transform duration-300 group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>
        </div>
        )}
      </Container>
    </section>
  )
}