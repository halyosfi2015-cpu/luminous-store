"use client";

import { useLang } from "@/lib/use-lang";

/**
 * MAGIC promo ribbon — infinite scrolling gold-on-purple ticker,
 * YesStyle/Sephora-style promo strip with a magical twist.
 * Rendered right under the hero on all screens.
 */
const PERKS_AR = [
  "توصيل سريع لباب البيت",
  "منتجات أصلية 100%",
  "عروض أسبوعية متجددة",
  "استشارات خبيرات تجميل",
  "تغليف هدايا مجاني",
  "دفع آمن ومتعدد",
];
const PERKS_EN = [
  "Fast doorstep delivery",
  "100% authentic products",
  "Fresh weekly offers",
  "Beauty expert consults",
  "Free gift wrapping",
  "Secure checkout",
];

export default function MagicRibbon() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const perks = isAr ? PERKS_AR : PERKS_EN;
  const looped = [...perks, ...perks];
  return (
    <div className="overflow-hidden py-1.5" dir="ltr">
      <div
        className="animate-marquee flex w-max items-center gap-2.5 motion-reduce:animate-none"
        style={{ animationDuration: "30s" }}
        role="marquee"
        aria-label={isAr ? "مميزات المتجر" : "Store perks"}
      >
        {looped.map((perk, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center gap-2 rounded-full border border-primary/15 bg-transparent px-4 py-2"
          >
            <span aria-hidden="true" className="text-[11px] text-[#B58A3A]">✦</span>
            <span className="whitespace-nowrap text-[12px] font-extrabold text-primary sm:text-[13px]">{perk}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
