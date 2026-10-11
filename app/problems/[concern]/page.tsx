"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductImage from "@/components/product/ProductImage";
import { useParams, notFound } from "next/navigation";
import { Sparkles, CheckCircle, Star, ArrowLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import { publishedProductSummaries as products } from "@/src/data/product-summaries";
import { useLang } from "@/lib/use-lang";
import type { SkinConcern } from "@/types/product";
import { matchProblemProducts } from "@/src/lib/problem-matching";

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
    labelAr: "الهالات السوداء", labelEn: "Dark Circles", emoji: "👁️",
    descAr: "حلول لتفتيح منطقة تحت العين وتقليل الانتفاخ والهالات",
    descEn: "Brighten the eye area & reduce dark circles and puffiness",
    routineAr: ["استخدمي كريم عين مرطب", "سيروم كافيين لتقليل الانتفاخ", "رطبي منطقة العين ليلاً", "نامي جيداً"],
    routineEn: ["Use hydrating eye cream", "Caffeine serum to reduce puffiness", "Night eye moisturizer", "Enough sleep"],
  },
  // ── New skin concerns (louz parity) ──
  rosacea: {
    labelAr: "الوردية", labelEn: "Rosacea", emoji: "🌸",
    descAr: "عناية مهدئة تقلل الاحمرار وتهيج البشرة الحساسة",
    descEn: "Soothing care that calms redness and sensitive flare-ups",
    routineAr: ["غسول لطيف بدون عطور", "سيروم مهدئ بالنياسيناميد", "مرطب يقوي حاجز البشرة", "واقي شمس معدني يومياً"],
    routineEn: ["Fragrance-free gentle cleanser", "Soothing niacinamide serum", "Barrier-strengthening moisturizer", "Daily mineral sunscreen"],
  },
  eczema: {
    labelAr: "الأكزيما", labelEn: "Eczema", emoji: "🤲",
    descAr: "ترطيب عميق وتهدئة للحكة والجفاف المصاحب للأكزيما",
    descEn: "Deep hydration and relief for eczema dryness and itch",
    routineAr: ["غسول كريمي فائق اللطف", "سيروم مرمم بالسيراميد", "كريم غني يحبس الرطوبة", "تجنبي المعطرات والمهيجات"],
    routineEn: ["Ultra-gentle creamy cleanser", "Repairing ceramide serum", "Rich moisture-locking cream", "Avoid fragrances and irritants"],
  },
  tired_skin: {
    labelAr: "البشرة المرهقة", labelEn: "Tired Skin", emoji: "😌",
    descAr: "انتعاش فوري ونضارة للبشرة المجهدة من السهر والإرهاق",
    descEn: "Instant freshness and glow for tired, dull skin",
    routineAr: ["غسول منعش ومنشط", "سيروم فيتامين سي للنضارة", "مرطب خفيف مشرق", "ماسك انتعاش أسبوعي"],
    routineEn: ["Refreshing energizing cleanser", "Vitamin C glow serum", "Light brightening moisturizer", "Weekly refreshing mask"],
  },
  stretch_marks: {
    labelAr: "علامات التمدد", labelEn: "Stretch Marks", emoji: "🤰",
    descAr: "مرونة محسنة ومظهر أنعم لعلامات التمدد",
    descEn: "Improved elasticity and smoother-looking stretch marks",
    routineAr: ["ترطيب يومي مكثف", "زيوت مرنة للجسم", "كريم بزبدة الشيا", "تدليك لتحفيز الدورة الدموية"],
    routineEn: ["Daily intensive hydration", "Elastic body oils", "Shea butter cream", "Massage to boost circulation"],
  },
  // ── Hair concerns ──
  hair_loss: {
    labelAr: "تساقط الشعر", labelEn: "Hair Loss", emoji: "💇‍♀️",
    descAr: "قوة وكثافة من الجذور ضد تساقط الشعر",
    descEn: "Strength and density from the roots against hair fall",
    routineAr: ["شامبو مقوٍ ضد التساقط", "سيروم فروة محفز للنمو", "ماسك مغذٍ أسبوعي", "تجنبي الحرارة العالية"],
    routineEn: ["Strengthening anti-fall shampoo", "Growth-stimulating scalp serum", "Weekly nourishing mask", "Avoid high heat"],
  },
  dandruff: {
    labelAr: "القشرة", labelEn: "Dandruff", emoji: "❄️",
    descAr: "فروة نظيفة وصحية بدون قشرة أو حكة",
    descEn: "Clean healthy scalp with no flakes or itch",
    routineAr: ["شامبو ضد القشرة", "تونر فروة منقٍ", "بلسم خفيف على الأطراف", "اغسلي بماء فاتر"],
    routineEn: ["Anti-dandruff shampoo", "Purifying scalp toner", "Light conditioner on ends", "Wash with lukewarm water"],
  },
  dry_hair: {
    labelAr: "الشعر الجاف", labelEn: "Dry Hair", emoji: "💧",
    descAr: "ترطيب عميق ولمعان للشعر الجاف والمتعطش",
    descEn: "Deep hydration and shine for dry thirsty hair",
    routineAr: ["شامبو مرطب خالٍ من السلفات", "بلسم غني بالزيوت", "ماسك ترطيب أسبوعي", "سيروم أطراف يومي"],
    routineEn: ["Sulfate-free hydrating shampoo", "Oil-rich conditioner", "Weekly hydration mask", "Daily ends serum"],
  },
  oily_scalp: {
    labelAr: "الفروة الدهنية", labelEn: "Oily Scalp", emoji: "🍃",
    descAr: "توازن الإفرازات الدهنية وانتعاش يدوم",
    descEn: "Balanced oil production and lasting freshness",
    routineAr: ["شامبو منقٍ للفروة", "مقشر فروة أسبوعي", "بلسم على الأطراف فقط", "تجنبي الماء الساخن"],
    routineEn: ["Purifying scalp shampoo", "Weekly scalp scrub", "Conditioner on ends only", "Avoid hot water"],
  },
  split_ends: {
    labelAr: "تقصف الأطراف", labelEn: "Split Ends", emoji: "✂️",
    descAr: "إصلاح وحماية أطراف الشعر المتقصفة",
    descEn: "Repair and protect split hair ends",
    routineAr: ["قص منتظم للأطراف", "بلسم مرمم", "زيت أطراف يومي", "ماسك بروتين أسبوعي"],
    routineEn: ["Regular trims", "Repairing conditioner", "Daily ends oil", "Weekly protein mask"],
  },
  dyed_hair: {
    labelAr: "الشعر المصبوغ", labelEn: "Dyed Hair", emoji: "🎨",
    descAr: "حماية اللون وإشراقة تدوم للشعر المصبوغ",
    descEn: "Color protection and lasting shine for dyed hair",
    routineAr: ["شامبو مخصص للون", "بلسم يحمي الصبغة", "ماسك لمعان أسبوعي", "واقي حرارة قبل التصفيف"],
    routineEn: ["Color-safe shampoo", "Color-protecting conditioner", "Weekly shine mask", "Heat protectant before styling"],
  },
  curly_hair: {
    labelAr: "الشعر الكيرلي", labelEn: "Curly Hair", emoji: "🌀",
    descAr: "تموجات محددة ورطبة بدون نفشة",
    descEn: "Defined hydrated curls with no frizz",
    routineAr: ["غسول مشترك (كو-ووش) لطيف", "بلسم يفك التشابك", "كريم تحديد التموجات", "تجفيف بالناشر على حرارة منخفضة"],
    routineEn: ["Gentle co-wash", "Detangling conditioner", "Curl-defining cream", "Diffuse on low heat"],
  },
  sensitive_scalp: {
    labelAr: "الفروة التحسسية", labelEn: "Sensitive Scalp", emoji: "🤍",
    descAr: "راحة وتهدئة للفروة الحساسة سريعة التهيج",
    descEn: "Comfort and calm for easily irritated scalps",
    routineAr: ["شامبو مهدئ بدون عطور", "تونر فروة لطيف", "تجنبي المواد الكيميائية القاسية", "ماء فاتر دائماً"],
    routineEn: ["Soothing fragrance-free shampoo", "Gentle scalp toner", "Avoid harsh chemicals", "Always lukewarm water"],
  },
  frizzy_hair: {
    labelAr: "الشعر المتطاير", labelEn: "Frizzy Hair", emoji: "🌊",
    descAr: "نعومة وانسيابية تقضي على النفشة",
    descEn: "Smooth sleekness that tames frizz",
    routineAr: ["شامبو مضاد للنفشة", "بلسم غني بالكيراتين", "سيروم تنعيم يومي", "وسادة حريرية للنوم"],
    routineEn: ["Anti-frizz shampoo", "Keratin-rich conditioner", "Daily smoothing serum", "Silk pillowcase"],
  },
  dull_hair: {
    labelAr: "الشعر الباهت", labelEn: "Dull Hair", emoji: "💫",
    descAr: "لمعان وحيوية للشعر المطفأ",
    descEn: "Shine and vitality for lackluster hair",
    routineAr: ["شامبو منقٍ للترسبات", "ماسك لمعان أسبوعي", "زيت خفيف ملمع", "شطف أخير بماء بارد"],
    routineEn: ["Clarifying buildup shampoo", "Weekly shine mask", "Light glossing oil", "Final cold-water rinse"],
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
  // Real condition photos (Wikimedia Commons + user-provided artwork).
  rosacea: "/images/problems/rosacea.jpg",
  eczema: "/images/problems/eczema.webp",
  redness: "/images/problems/redness.webp",
  tired_skin: "/images/problems/tired-skin.webp",
  stretch_marks: "/images/problems/stretch-marks.webp",
  hair_loss: "/images/problems/hair-loss.webp",
  dandruff: "/images/problems/dandruff.webp",
  dry_hair: "/images/problems/dry-hair.webp",
  oily_scalp: "/images/problems/oily-scalp.webp",
  split_ends: "/images/problems/split-ends.webp",
  dyed_hair: "/images/problems/dyed-hair.webp",
  curly_hair: "/images/problems/curly-hair.webp",
  sensitive_scalp: "/images/problems/sensitive-scalp.webp",
  frizzy_hair: "/images/problems/frizzy-hair.webp",
  dull_hair: "/images/problems/dull-hair.webp",
};
/* ================================================================================================ */
/* MAIN PAGE                               */
/* ================================================================================================ */
export default function ProblemPage() {
  const params = useParams<{ concern: string }>();
  const { lang } = useLang();
  const isAr = lang === "ar";
  const concern = params?.concern || "acne";
  // Removed sections (psoriasis, burns_scars, vitiligo) resolve to the 404 page.
  if (concern === "psoriasis" || concern === "burns_scars" || concern === "vitiligo") notFound();
  const defaultInfo = PROBLEM_INFO[concern] || PROBLEM_INFO.acne;

  const [adminInfo, setAdminInfo] = useState<typeof defaultInfo | null>(null);
  const [adminImage, setAdminImage] = useState<string | null>(null);

  const recommended = useMemo(() => {
    return matchProblemProducts(products, concern);
  }, [concern]);
  const [productOverride, setProductOverride] = useState<{ pinned?: string[]; excluded?: string[] } | undefined>();

  // Fetch admin overrides: productOverrides + concern info
  useEffect(() => {
    let cancelled = false;
    fetch("/api/content/problemSolutions", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (cancelled) return;
        if (d.productOverrides && typeof d.productOverrides === "object") {
          setProductOverride(d.productOverrides[concern]);
        }
        if (Array.isArray(d.items)) {
          const item = d.items.find((it: any) => it.id === concern);
          if (item) {
            setAdminInfo({
              labelAr: item.labelAr || item.id,
              labelEn: item.labelEn || item.id,
              emoji: item.emoji || "🔍",
              descAr: item.descAr || "",
              descEn: item.descEn || "",
              routineAr: item.routineAr ?? [],
              routineEn: item.routineEn ?? [],
            });
            if (item.image) setAdminImage(item.image);
          }
        }
      })
      .catch(() => {});
    return () => { cancelled = true };
  }, [concern]);

  const info = adminInfo || defaultInfo;
  const heroImage = adminImage || PROBLEM_IMAGES[concern] || PROBLEM_IMAGES.acne;

  const finalProducts = useMemo(() => {
    const base = recommended;
    const ov = productOverride;
    if (!ov || (!ov.pinned?.length && !ov.excluded?.length)) return base;
    const excluded = new Set(ov.excluded ?? []);
    const filtered = base.filter((p) => !excluded.has(p.slug));
    const pinnedSet = new Set(ov.pinned ?? []);
    const rest = filtered.filter((p) => !pinnedSet.has(p.slug));
    // Pinned products may come from outside the automatic skinConcerns list.
    const pinned = (ov.pinned ?? [])
      .map((slug) => products.find((p) => p.slug === slug))
      .filter((p): p is (typeof products)[0] => Boolean(p));
    return [...pinned, ...rest];
  }, [recommended, productOverride, products]);

  return (
    <div dir="rtl" className="w-full pb-16">
      <Container>
        {/* = Compact brand-colored hero with real image = */}
        <div className="relative mt-4 h-44 overflow-hidden rounded-2xl sm:h-52">
          {/* Real condition image */}
          <ProductImage
            src={heroImage}
            alt={info.labelAr}
            productId={concern}
            variant="clean"
            hoverZoom={false}
            pedestal={false}
            className="absolute inset-0"
            sizes="(max-width: 768px) 100vw, 60vw"
            objectPosition="center 70%"
          />
          {/* Brand color overlay removed for clear product visibility */}

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
              {isAr ? `${finalProducts.length} منتج لكِ` : `${finalProducts.length} picks`}
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
            {finalProducts.map((product) => (
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
                        variant="clean"
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
