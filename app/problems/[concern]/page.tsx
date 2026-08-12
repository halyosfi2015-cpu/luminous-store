"use client";

import { useMemo } from "react";
import Link from "next/link";
import ProductImage from "@/components/product/ProductImage";
import { useParams } from "next/navigation";
import { Sparkles, CheckCircle, Star, ArrowLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import { productSummaries as products } from "@/src/data/product-summaries";
import { useLang } from "@/lib/use-lang";
import type { SkinConcern } from "@/types/product";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}
/* ================================================================================================ */
/* PROBLEM DATA                            */
/* ================================================================================================ */
const PROBLEM_INFO: Record<string, { labelAr: string; labelEn: string; emoji: string; descAr: string; descEn: string; routineAr: string[]; routineEn: string[] }> = {
  acne: {
    labelAr: "حب الشباب", labelEn: "Acne", emoji: "🌋",
    descAr: "حلول فعّالة للسيطرة على حب الشباب وتنقية البشرة من الشوائب",
    descEn: "Effective solutions to control acne and purify the skin",
    routineAr: ["نظفي بشرتك بمنظف لطيف", "استخدمي سيروم مضاد للبكتيريا", "رتّبي بالمرطب الخالي من الزيوت", "استخدمي واقي شمس خفيف"],
    routineEn: ["Clean with a gentle cleanser", "Use an antibacterial serum", "Moisturize with oil-free cream", "Apply light sunscreen"],
  },
  dryness: {
    labelAr: "جفاف البشرة", labelEn: "Dry Skin", emoji: "🏜️",
    descAr: "ترطيب عميق يعيد للبشرة نعومتها وحيويتها ويحميها من الجفاف",
    descEn: "Deep hydration restores softness and protects from dryness",
    routineAr: ["اغسلي بمطهر كريمي لطيف", "ضعي سيروم حمض الهيالورونيك", "استخدمي مرطباً غنياً", "احمي بشرتك بواقي الشمس"],
    routineEn: ["Wash with a gentle creamy cleanser", "Apply hyaluronic acid serum", "Use a rich moisturizer", "Protect with sunscreen"],
  },
  pigmentation: {
    labelAr: "تصبغات وكلف", labelEn: "Pigmentation", emoji: "✨",
    descAr: "تفتيح موحّد للون البشرة وتقليل ظهور البقع الداكنة والكلف",
    descEn: "Even skin tone and reduce dark spots & melasma",
    routineAr: ["نظفي بلطف لإزالة الخلايا الميتة", "استخدمي سيروم فيتامين C", "طبقي كريم التفتيح ليلاً", "واقي شمس عالي SPF يومياً"],
    routineEn: ["Clean gently to remove dead cells", "Use Vitamin C serum", "Apply brightening cream at night", "High SPF sunscreen daily"],
  },
  large_pores: {
    labelAr: "مسام واسعة", labelEn: "Large Pores", emoji: "🔍",
    descAr: "شدّ المسام وتقليل مظهرها لبشرة ناعمة ومشدودة",
    descEn: "Tighten pores and reduce their appearance",
    routineAr: ["نظفي بعمق لإزالة الدهون", "استخدمي تونر مقشر", "ضعي سيروم النياسيناميد", "رتّبي بمرطب خفيف"],
    routineEn: ["Deep clean to remove oil", "Use exfoliating toner", "Apply niacinamide serum", "Moisturize lightly"],
  },
  oiliness: {
    labelAr: "لمعة زائدة", labelEn: "Oily Skin", emoji: "💧",
    descAr: "تحكم في اللمعة والزيوت الزائدة لبشرة متوازنة طوال اليوم",
    descEn: "Control shine & excess oil for balanced skin all day",
    routineAr: ["نظفي بمنظف رغوي", "استخدمي تونر متوازن", "سيروم ينظم إفراز الزيوت", "مرطب جل خفيف"],
    routineEn: ["Cleanse with foaming cleanser", "Use balancing toner", "Regulating serum", "Light gel moisturizer"],
  },
  sensitivity: {
    labelAr: "بشرة حساسة", labelEn: "Sensitive Skin", emoji: "🌿",
    descAr: "عناية لطيفة تهدئ البشرة الحساسة وتحميها من التهيج والاحمرار",
    descEn: "Gentle care that soothes and protects sensitive skin",
    routineAr: ["نظفي بمنظف خالٍ من العطور", "استخدمي سيروم مهدئ", "مرطب بتركيبة لطيفة", "تجنبي المنتجات القاسية"],
    routineEn: ["Clean with fragrance-free cleanser", "Use soothing serum", "Gentle moisturizer", "Avoid harsh products"],
  },
  aging: {
    labelAr: "مكافحة الشيخوخة", labelEn: "Anti-Aging", emoji: "⏳",
    descAr: "مكافحة التجاعيد والخطوط الدقيقة لبشرة شابة ومشدودة",
    descEn: "Fight wrinkles & fine lines for youthful skin",
    routineAr: ["نظفي بلطف", "استخدمي سيروم الريتينول", "طبقي مرطب مكافح للتجاعيد", "واقي شمس يومي"],
    routineEn: ["Clean gently", "Use retinol serum", "Apply anti-wrinkle moisturizer", "Daily sunscreen"],
  },
  dark_circles: {
    labelAr: "هالات سوداء", labelEn: "Dark Circles", emoji: "🌙",
    descAr: "تفتيح منطقة العين وتقليل الهالات والانتفاخات لإطلالة منتعشة",
    descEn: "Brighten the eye area & reduce dark circles and puffiness",
    routineAr: ["استخدمي كريم عين مرطب", "سيروم الكافيين لتقليل الانتفاخ", "طبقي مرطب العين ليلاً", "نوم كافٍ"],
    routineEn: ["Use hydrating eye cream", "Caffeine serum to reduce puffiness", "Night eye moisturizer", "Enough sleep"],
  },
};

const PROBLEM_IMAGES: Record<string, string> = {
  acne: "/images/problems/acne.webp",
  dryness: "/images/problems/dryness.webp",
  pigmentation: "/images/problems/pigmentation.webp",
  large_pores: "/images/problems/large-pores.webp",
  oiliness: "/images/problems/oiliness.webp",
  sensitivity: "/images/problems/sensitivity.webp",
  aging: "/images/problems/aging.webp",
  dark_circles: "/images/problems/dark-circles.webp",
};
/* ================================================================================================ */
/* MAIN PAGE                               */
/* ================================================================================================ */
export default function ProblemPage() {
  const params = useParams<{ concern: string }>();
  const { lang } = useLang();
  const isAr = lang === "ar";
  const concern = (params?.concern || "acne") as SkinConcern;
  const info = PROBLEM_INFO[concern] || PROBLEM_INFO.acne;

  const recommended = useMemo(() => {
    return products
      .filter((p) => p.skinConcerns?.includes(concern))
      .sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0))
      .slice(0, 8);
  }, [concern]);

  return (
    <div dir="rtl" className="w-full pb-16">
      <Container>
        {/* = Compact brand-colored hero with real image = */}
        <div className="relative mt-4 h-44 overflow-hidden rounded-2xl sm:h-52">
          {/* Real condition image */}
          <ProductImage
            src={PROBLEM_IMAGES[concern] || PROBLEM_IMAGES.acne}
            alt={info.labelAr}
            productId={concern}
            variant="soft"
            hoverZoom={false}
            pedestal={false}
            className="absolute inset-0"
            sizes="(max-width: 768px) 100vw, 60vw"
            objectPosition="center 70%"
          />
          {/* Brand color overlay */}
          <div className="absolute inset-0 bg-gradient-to-l from-primary/90 via-primary/60 to-primary-light/40" />

          {/* Decorative */}
          <div className="pointer-events-none absolute -end-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-xl" />
          <div className="pointer-events-none absolute -bottom-10 -start-10 h-32 w-32 rounded-full bg-amber-300/30 blur-xl" />

          {/* Content */}
          <div className="relative flex h-full flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl backdrop-blur-sm">
                {info.emoji}
              </span>
              <div>
                <h1 className="text-lg font-extrabold text-white sm:text-xl">{isAr ? info.labelAr : info.labelEn}</h1>
                <p className="mt-0.5 max-w-sm text-[11px] text-white/85 sm:text-xs">{isAr ? info.descAr : info.descEn}</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm">
              <Sparkles size={11} className="text-amber-200" />
              {isAr ? `${recommended.length} منتج لكِ` : `${recommended.length} picks`}
            </span>
          </div>
        </div>

        {/* = Selected products message = */}
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
          <CheckCircle size={20} className="shrink-0 text-primary" />
          <p className="text-sm font-semibold text-gray-800">
            {isAr
              ? "هذه المنتجات اخترناها لكِ خصيصاً بناءً على مشكلتك"
              : "We've selected these products specifically for your concern"}
          </p>
        </div>

        {/* = Routine = */}
        <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-gray-900">
            {isAr ? "روتينك الموصى به" : "Recommended Routine"}
          </h2>
          <ol className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {(isAr ? info.routineAr : info.routineEn).map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-xl bg-gray-50 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-light text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-xs font-medium text-gray-700 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* = Products = */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {isAr ? "المنتجات المختارة لكِ" : "Selected Products For You"}
            </h2>
            <Link
              href={`/products?concern=${concern}`}
              className="group inline-flex items-center gap-1.5 text-xs font-bold text-primary transition-colors hover:text-primary-light"
            >
              {isAr ? "عرض الكل" : "View All"}
              <ArrowLeft size={12} className="transition-transform group-hover:-translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recommended.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:border-primary/30"
              >
                <div className="relative aspect-square overflow-hidden bg-gray-50">
                  {product.gallery[0] && (
                    <ProductImage
                      src={product.gallery[0]}
                      alt={product.name.ar}
                      productId={product.id}
                      hoverZoom
                      pedestal
                      className="absolute inset-0"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  )}
                  {product.isBestSeller && (
                    <span className="absolute top-2.5 start-2.5 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      <Star size={9} className="fill-current" />
                      {isAr ? "الأكثر مبيعاً" : "Best Seller"}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-[10px] font-medium text-gray-400">{product.brandAr || product.brand}</p>
                  <h3 className="mt-1 line-clamp-2 text-xs font-semibold text-gray-900">{product.name.ar}</h3>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">{formatPrice(product.pricing.price)}</span>
                    <span className="text-[10px] text-gray-400">{isAr ? "ر.ي" : "YER"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* = CTA: Back = */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/#problems"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-500 transition-all duration-300 hover:border-primary hover:text-primary"
          >
            {isAr ? "رجوع" : "Back"}
          </Link>
        </div>
      </Container>
    </div>
  );
}
