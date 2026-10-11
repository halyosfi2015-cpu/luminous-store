"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
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
import ProductImage from "@/components/product/ProductImage"
import Container from "@/components/ui/Container"
import SectionTitle from "@/components/ui/SectionTitle"
import MobileReveal from "@/components/ui/MobileReveal"
import { getBundleProducts } from "@/src/data/bundles"
import { useCanonicalProducts } from "@/hooks/useCanonicalProducts"
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
  // Canonical linkage: bundle product basics (image/price/name/brand) always
  // resolve through the live catalog, so an admin change propagates here too.
  const bundleStaticProducts = useMemo(
    () => topBundles.flatMap((b) => getBundleProducts(b)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topBundles.map((b) => b.id).join(",")]
  )
  const canonicalBundleProducts = useCanonicalProducts(bundleStaticProducts)
  const canonicalById = useMemo(
    () => new Map(canonicalBundleProducts.map((p) => [p.id, p] as const)),
    [canonicalBundleProducts]
  )
  const resolveBundleProducts = useCallback(
    (bundle: Bundle) => getBundleProducts(bundle).map((p) => canonicalById.get(p.id) ?? p),
    [canonicalById]
  )
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
  // Makeup service always first, regardless of admin order.
  const activeServices = useMemo(() => {
    const list = adminServices ?? SERVICES
    return [...list].sort((a, b) => (a.id === "makeup" ? -1 : b.id === "makeup" ? 1 : 0))
  }, [adminServices])
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
  const servicesStripRef = useRef<HTMLDivElement | null>(null)
  const [servicesCanScroll, setServicesCanScroll] = useState({ start: false, end: false })

  const updateArrows = useCallback(() => {
    const el = stripRef.current
    if (!el) return
    setCanScroll({
      start: el.scrollLeft > 8,
      end: el.scrollLeft < el.scrollWidth - el.clientWidth - 8,
    })
  }, [])

  const updateServicesArrows = useCallback(() => {
    const el = servicesStripRef.current
    if (!el) return
    setServicesCanScroll({
      start: el.scrollLeft > 8,
      end: el.scrollLeft < el.scrollWidth - el.clientWidth - 8,
    })
  }, [])

  useEffect(() => {
    updateArrows()
    updateServicesArrows()
    const el = stripRef.current
    const sEl = servicesStripRef.current
    let observer: ResizeObserver | null = null
    if (el) {
      observer = new ResizeObserver(updateArrows)
      observer.observe(el)
      el.addEventListener("scroll", updateArrows, { passive: true })
    }
    let sObserver: ResizeObserver | null = null
    if (sEl) {
      sObserver = new ResizeObserver(updateServicesArrows)
      sObserver.observe(sEl)
      sEl.addEventListener("scroll", updateServicesArrows, { passive: true })
    }
    window.addEventListener("resize", updateArrows)
    window.addEventListener("resize", updateServicesArrows)
    return () => {
      observer?.disconnect()
      el?.removeEventListener("scroll", updateArrows)
      sEl?.removeEventListener("scroll", updateServicesArrows)
      sObserver?.disconnect()
      window.removeEventListener("resize", updateArrows)
      window.removeEventListener("resize", updateServicesArrows)
    }
  }, [updateArrows, updateServicesArrows])

  const scrollStrip = (dir: 1 | -1) => {
    const el = stripRef.current
    if (!el) return
    el.scrollBy({ left: dir * 200, behavior: "smooth" })
  }

  const scrollServices = (dir: 1 | -1) => {
    const el = servicesStripRef.current
    if (!el) return
    el.scrollBy({ left: dir * 200, behavior: "smooth" })
  }

  if (!bundlesContent.visible && !servicesContent.visible) return null

  return (
    <>
    <section id="bundles" className="w-full scroll-mt-28 bg-white py-8 sm:py-10 lg:py-12">
      <Container>
        {/* = BUNDLES SECTION — WITH ICONS = */}
        {bundlesContent.visible && (<div>
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
          <MobileReveal delay={100}>
          <div className="relative">
            <button
              type="button"
              onClick={() => scrollStrip(-1)}
              aria-label={t("السابق", "Previous")}
              className={`absolute -start-3 top-24 z-20 hidden h-10 w-10 sm:flex -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-lg shadow-black/5 transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:text-primary active:scale-95 ${
                canScroll.start ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollStrip(1)}
              aria-label={t("التالي", "Next")}
              className={`absolute -end-3 top-24 z-20 hidden h-10 w-10 sm:flex -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-lg shadow-black/5 transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:text-primary active:scale-95 ${
                canScroll.end ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <ChevronLeft size={18} />
            </button>

            <div
              ref={stripRef}
              className="magic-stagger magic-fade-x hide-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scroll-smooth scroll-px-4 sm:gap-5"
              dir="ltr"
            >
              {topBundles.map((bundle) => {
                const products = resolveBundleProducts(bundle)
                return (
                  <div key={bundle.id} className="w-[67%] max-w-[240px] sm:max-w-none shrink-0 snap-start sm:w-[calc(50%-1.25rem)] lg:w-[calc(25%-0.9375rem)]">
                    <Link
                      href={`/bundles/${bundle.slug}`}
                      className="magic-border-spin group relative flex h-full flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:ring-2 hover:ring-amber-400/40"
                    >
                  {/* Products — auto-fit segmented thumbs, never cropped, never overflow */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-secondary-50 px-3 pb-2 pt-8">
                    <div className="flex items-center justify-center gap-1.5">
                      {(() => {
                        const thumbs = products.filter((p) => p.gallery?.[0]);
                        const extra = thumbs.length > 4 ? thumbs.length - 3 : 0;
                        const shown = extra > 0 ? thumbs.slice(0, 3) : thumbs.slice(0, 4);
                        return (
                          <>
                            {shown.map((p) => (
                              <span key={p.id} className="magic-autoshine relative block aspect-square min-w-0 flex-1 max-w-[76px] shrink overflow-hidden rounded-2xl border-2 border-white bg-white p-1 shadow-md shadow-primary/10 transition-transform duration-300 group-hover:scale-105">
                                  <ProductImage
                                    src={p.gallery[0]}
                                    alt={p.name.ar}
                                    productId={p.id}
                                    variant="clean"
                                    hoverZoom={false}
                                    pedestal={false}
                                    className="h-full w-full rounded-xl"
                                    sizes="96px"
                                  />
                                </span>
                            ))}
                            {extra > 0 && (
                              <span className="flex aspect-square min-w-0 flex-1 max-w-[76px] shrink items-center justify-center rounded-2xl bg-primary text-sm font-extrabold text-white shadow-md shadow-primary/20">
                                +{extra}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>

                          {/* Badge */}
                          {bundle.badge && (
                            <div className="absolute top-3 start-3">
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-white shadow-lg">
                                  <Sparkles size={12} />
                                {bundle.badgeAr || bundle.badge}
                              </span>
                            </div>
                          )}

                          {/* Savings */}
                          <div className="absolute top-3 end-3">
                            <span className="luminous-glow-pulse inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold text-emerald-600 shadow-sm">
                              {t(`وفّري ${bundle.savingsPercent}%`, `Save ${bundle.savingsPercent}%`)}
                            </span>
                          </div>
                        </div>

                        {/* Content — WITH ICONS */}
                        <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">


                          <h3 className="text-[14px] font-bold text-gray-900 line-clamp-1 transition-colors duration-300 group-hover:text-primary sm:text-base">
                            {bundle.nameAr}
                          </h3>

                          <p className="text-[11px] text-gray-500 line-clamp-1 sm:line-clamp-2 leading-relaxed sm:text-xs">
                            {bundle.descriptionAr}
                          </p>

                          {/* Price */}
                          <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-1 min-w-0 sm:pt-2">
                            <span className="text-[16px] font-extrabold text-gray-900 sm:text-lg">
                              {formatPrice(bundle.bundlePrice)}
                            </span>
                            <span className="text-xs text-gray-400 line-through sm:text-sm">
                              {formatPrice(bundle.originalPrice)}
                            </span>
                            <span className="ms-auto text-[10px] font-bold text-emerald-600">ر.ي</span>
                          </div>

                          {/* Button */}
                          <div className="luminous-shine relative mt-1.5 flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary py-2 min-h-[40px] text-[12.5px] font-bold text-white transition-all duration-300 hover:bg-primary-700 group-hover:shadow-lg group-hover:shadow-primary/40 active:scale-[0.98] sm:mt-2 sm:py-3 sm:min-h-[44px] sm:text-sm">
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
          </MobileReveal>

          {/* Design Bundle CTA */}
          <div className="mt-8 text-center">
            <Link
              href="/bundles/design"
              className="magic-cta luminous-shine group inline-flex items-center gap-3 overflow-hidden rounded-full px-8 py-3.5 text-sm font-bold text-white transition-all duration-300 active:scale-95"
            >
              <Sparkles size={16} className="text-accent-light" />
              {t("صممي باقتك الخاصة", "Design Your Own Bundle")}
              <ArrowLeft size={15} className="transition-transform duration-300 group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>)}
      </Container>
    </section>

        {/* = SERVICES — OWN STANDALONE SECTION = */}
        {servicesContent.visible && (
        <section id="services" className="w-full scroll-mt-28 bg-white py-8 sm:py-10 lg:py-12">
        <Container>
        <SectionTitle
          eyebrow={<>
            <span className="h-0.5 w-6 rounded-pill bg-accent" />
            {t(servicesContent.eyebrowAr, servicesContent.eyebrowEn)}
          </>}
          title={t(servicesContent.titleAr, servicesContent.titleEn)}
          subtitle={t(servicesContent.subtitleAr, servicesContent.subtitleEn)}
        />

        {/* = SERVICES — open cards, horizontal strip with arrows = */}
        <MobileReveal delay={100}>
        <div className="relative">
          <button
            type="button"
            onClick={() => scrollServices(-1)}
            aria-label={t("السابق", "Previous")}
            className={`absolute -start-3 top-24 z-20 hidden h-10 w-10 sm:flex -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-lg transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:text-primary active:scale-95 sm:flex ${
              servicesCanScroll.start ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            onClick={() => scrollServices(1)}
            aria-label={t("التالي", "Next")}
            className={`absolute -end-3 top-24 z-20 hidden h-10 w-10 sm:flex -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-lg transition-all duration-300 hover:scale-110 hover:border-primary/30 hover:text-primary active:scale-95 sm:flex ${
              servicesCanScroll.end ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <ChevronLeft size={18} />
          </button>
          {/* Service Cards — WHITE, GOLD ICONS, horizontal strip */}
          <div ref={servicesStripRef} className="magic-stagger magic-fade-x hide-scrollbar relative flex snap-x gap-3 overflow-x-auto pb-2 scroll-px-4 sm:gap-4" dir="ltr">
            {activeServices.map((service) => (
                <div key={service.id} className="w-[67%] max-w-[240px] sm:max-w-none shrink-0 snap-start sm:w-[46%] lg:w-[23%]">
              <Link
                href={service.href}
                dir={isAr ? "rtl" : "ltr"}
                className="magic-card-glow group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white text-start shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/25 hover:shadow-[0_18px_40px_-16px_rgba(75,42,111,0.28)]"
              >
                {/* Optional service image */}
                {service.image ? (
                  <div className="relative h-28 overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50 sm:h-32">
                    <Image src={service.image} alt={service.titleAr} fill unoptimized className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent" />
                  </div>
                ) : null}

                <div className="p-5 flex flex-col flex-1">
                  {/* Gold underline on hover */}
                  <span className="pointer-events-none absolute inset-x-5 bottom-0 h-[3px] origin-center scale-x-0 rounded-full bg-gradient-to-l from-primary via-accent to-primary transition-transform duration-500 group-hover:scale-x-100" />

                  {/* Icon — gold → Luminous purple on hover, spinning magic ring on edges */}
                  <div className="magic-border-spin magic-ping magic-icon-edge luminous-glow-pulse mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-accent/25 bg-accent-50 text-accent transition-all duration-500 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-secondary group-hover:text-accent-light group-hover:shadow-md group-hover:shadow-primary/30">
                    <service.icon size={18} strokeWidth={1.6} />
                  </div>

                  {/* Title */}
                  <h3 className="text-[14px] font-bold text-primary-800 transition-colors duration-300 group-hover:text-primary sm:text-base">
                    {isAr ? service.titleAr : service.titleEn}
                  </h3>

                  {/* Description */}
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-600 sm:text-xs">
                    {isAr ? service.descAr : service.descEn}
                  </p>

                  {/* Features */}
                  <ul className="mt-2.5 space-y-1.5">
                      {(isAr ? service.features : service.featuresEn).map((feature, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 sm:text-xs">
                            <CheckCircle size={12} className="shrink-0 text-accent" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Availability */}
                  <div className="mt-auto pt-4">
                    {!service.available ? (
                      <div className="inline-flex items-center gap-2 self-start rounded-full bg-gradient-to-l from-primary to-secondary px-4 py-2 text-[11px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(75,42,111,0.5)] sm:text-sm">
                        <Clock size={14} className="shrink-0 text-accent-light" />
                        {t("قريباً", "Coming Soon")}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 self-start text-[11px] font-bold text-primary transition-all duration-300 group-hover:gap-2.5">
                        {t("احجزي الآن", "Book Now")}
                        <ArrowLeft size={12} />
                      </div>
                    )}
                  </div>
                </div>
              </Link>
              </div>
            ))}
          </div>
        </div>
        </MobileReveal>

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
              className="magic-cta luminous-shine group inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-full px-7 py-3.5 min-h-[44px] text-sm font-bold text-white transition-all duration-300 active:scale-95 sm:w-auto"
            >
              <Calendar size={15} className="text-accent-light" />
              {t("احجزي استشارة", "Book a Consultation")}
              <ArrowLeft size={13} className="text-accent-light transition-transform duration-300 group-hover:-translate-x-1" />
            </Link>
          </div>
        </Container>
        </section>
        )}
    </>
  )
}