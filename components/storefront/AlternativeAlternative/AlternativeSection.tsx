"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

interface AlternativeProduct {
  id: string;
  slug: string;
  name: {
    ar: string;
    en: string;
  };
  brand: string;
  brandAr?: string;
  price: number;
  currency: string;
  originalPrice?: number;
  discount?: number;
  gallery: string[];
  description?: {
    ar: string;
    en: string;
  };
  benefits?: {
    ar: string[];
    en: string[];
  };
  usageInstructions?: {
    ar: string;
    en: string;
  };
}

interface AlternativeSectionProps {
  product: {
    id: string;
    name: {
      ar: string;
      en: string;
    };
    price: number;
    currency: string;
    originalPrice?: number;
    discount?: number;
    gallery: string[];
    brand: string;
    brandAr?: string;
    alternativeFeature?: "hidden" | "enabled";
  };
  cheaperAlternative?: AlternativeProduct | null;
}

const AlternativeSection: React.FC<AlternativeSectionProps> = ({
  product,
  cheaperAlternative,
}) => {
  const router = useRouter();

// Storefront rule:
  // Alternative exists → Admin Feature Flag / Visibility Rule → VISIBLE or HIDDEN
  // Default: hidden from storefront. Admin can enable per product.
  const isAlternativeVisible =
    product.alternativeFeature === "enabled" ? true : false;

  if (!cheaperAlternative || !isAlternativeVisible) {
    return null;
  }

  const priceDiff = product.price - cheaperAlternative.price;
  const savingsPercent = Math.round((priceDiff / product.price) * 100);

  // Build Arabic benefits bullets from verified data (3-6 bullets)
  const benefitsList = (cheaperAlternative.benefits?.ar || [])
    .filter((b) => b && b.trim().length > 0 && b.trim().length < 80)
    .slice(0, 6);
  const benefits = benefitsList.length > 0
    ? benefitsList.map((b) => (<li key={b} className="text-sm text-foreground mb-1 flex items-center">
        <span className="text-primary me-2">•</span>{b}
      </li>))
    : [];

  const savingsDisplay = savingsPercent > 0
    ? <p className="mt-2 text-sm text-primary">
        وفر {savingsPercent}% مع البديل الأوفر
      </p>
    : null;

  return (
    <section
      className="border-y border-border border-t-0 my-6"
    >
      <div className="grid max-w-2xl mx-auto">
        {/* MAIN SECTION TITLE at top */}
        <header className="mb-4">
          <h2 className="text-xl font-bold text-primary rtl:text-right">
            اشترِ البديل الأوفر
          </h2>
        </header>

        {/* GUIDANCE SUBHEADING + SENTENCE */}
        <div className="mb-4">
          <p className="text-sm text-primary rtl:text-right">
            💡 خيار أوفر لنفس احتياجك
          </p>
          <p className="text-xs text-primary/80 rtl:text-right">
            إذا كنت تبحث عن خيار قريب في الاستخدام بسعر أقل، قد يكون هذا البديل الأنسب لك
          </p>
        </div>

        {/* Alternative Product Card */}
        <div className="rounded-xl overflow-hidden bg-card p-4 shadow-sm border border-border">
          {/* Product Image */}
          <div className="rounded-xl overflow-hidden mb-4">
            <Image
              src={cheaperAlternative.gallery[0]}
              alt={cheaperAlternative.name.ar}
              width={400}
              height={400}
              className="object-cover"
            />
          </div>

          {/* Brand + Name */}
          <div className="mb-3">
            <p className="text-sm text-muted rtl:text-right">
              {cheaperAlternative.brandAr || cheaperAlternative.brand}
            </p>
            <h3 className="text-lg font-semibold text-foreground rtl:text-right line-clamp-2">
              {cheaperAlternative.name.ar}
            </h3>
          </div>

          {/* Price + Savings */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <p className="text-[10px] text-muted">السعر الحالي</p>
              <p className="text-2xl font-bold text-foreground">
                {product.price.toLocaleString("ar-YE")} ر.ي
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted">سعر البديل</p>
              <p className="text-2xl font-bold text-primary">
                {cheaperAlternative.price.toLocaleString("ar-YE")} ر.ي
              </p>
            </div>
          </div>
          {savingsDisplay}

          {/* Benefits bullets - Arabic only */}
          {benefits.length > 0 && (
            <ul className="mt-3 space-y-1 max-w-xl rtl:text-right">
              {benefits}
            </ul>
          )}

          {/* CTA inside card */}
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <button
              type="button"
              className="w-full text-sm font-medium text-primary rtl:text-right hover:underline"
              onClick={() => router.push(`/products/${cheaperAlternative.slug}`)}
            >
              عرض البديل
            </button>
          </div>
        </div>

        {/* "قد يعجبك أيضًا" separator goes AFTER this section */}
      </div>
    </section>
  );
};

export default AlternativeSection;
export { type AlternativeProduct };