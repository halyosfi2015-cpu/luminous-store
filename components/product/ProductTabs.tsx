"use client";

import { useState } from "react";
import { Check, Droplets, Sparkles, FlaskConical, UserCheck } from "lucide-react";
import type { Product } from "@/types/product";

type ProductTabsProps = {
  product: Product;
};

const tabs = [
  { key: "benefits", label: "الفوائد والمزايا", en: "Benefits" },
  { key: "ingredients", label: "المكونات", en: "Ingredients" },
  { key: "howToUse", label: "طريقة الاستخدام", en: "How to Use" },
  { key: "compatibility", label: "توافق البشرة", en: "Skin Compatibility" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const skinTypeLabels: Record<string, string> = {
  dry: "جافة", oily: "دهنية", combination: "مختلطة", sensitive: "حساسة", normal: "عادية", all: "جميع الأنواع",
};

const skinConcernLabels: Record<string, string> = {
  acne: "حبوب الشباب", dryness: "الجفاف", pigmentation: "التصبغات", aging: "الشيخوخة",
  redness: "الاحمرار", large_pores: "المسام الواسعة", uneven_texture: "الملمس غير المتجانس",
  dark_circles: "الهالات السوداء", oiliness: "اللمعة الزائدة", sensitivity: "الحساسية",
};

export default function ProductTabs({ product }: ProductTabsProps) {
  const [active, setActive] = useState<TabKey>("benefits");

  if (!product) return null;

  return (
    <section className="mt-12">
      <div className="flex overflow-x-auto border-b border-border gap-1 hide-scrollbar" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={`shrink-0 px-5 py-3.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-[1px] whitespace-nowrap ${
              active === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground hover:border-border-strong"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {active === "benefits" && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Benefits | الفوائد والمزايا</p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {product.benefits.ar.map((b, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/10 px-4 py-3.5 transition-all duration-200 hover:bg-primary/10 hover:border-primary/20">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles size={16} className="text-primary" />
                  </div>
                  <div>
                    <span className="text-sm text-foreground font-medium">{b}</span>
                    {product.benefits.en[i] && (
                      <p className="text-xs text-muted mt-0.5">{product.benefits.en[i]}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {active === "ingredients" && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Ingredients | المكونات</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {product.ingredients.ar.map((ingName, i) => (
                <div key={i} className={`rounded-xl border p-4 transition-all duration-200 ${
                  i === 0
                    ? "border-accent/30 bg-accent/5 shadow-card"
                    : "border-border bg-card hover:shadow-card"
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      i === 0 ? "bg-accent/10" : "bg-primary/5"
                    }`}>
                      <FlaskConical size={15} className={i === 0 ? "text-accent" : "text-primary"} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{ingName}</p>
                      <p className="text-xs text-muted mt-0.5">{product.ingredients.en[i]}</p>
                      <p className="text-sm text-muted mt-2 leading-relaxed">Key ingredient for skin care</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === "howToUse" && (
          <div className="space-y-4">
            <p className="text-sm text-muted">How to Use | طريقة الاستخدام</p>
            <div className="space-y-4">
              {product.usageInstructions.ar.split('. ').filter(step => step).map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-card">
                    {i + 1}
                  </div>
                  <div className="flex-1 pt-1.5">
                    <p className="text-sm text-foreground font-medium">{step}.</p>
                    {product.usageInstructions.en[i] && (
                      <p className="text-xs text-muted mt-0.5">{product.usageInstructions.en[i]}.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === "compatibility" && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Skin Compatibility | توافق البشرة</p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck size={18} className="text-success-fg" />
                  <h4 className="text-sm font-semibold text-foreground">مناسب لأنواع البشرة</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.skinTypes.length > 0 ? product.skinTypes.map((type) => (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1.5 rounded-full bg-success-soft border border-success-border px-3 py-1.5 text-xs font-medium text-success-fg"
                    >
                      <Check size={12} />
                      {skinTypeLabels[type] || type}
                    </span>
                  )) : (
                    <span className="text-sm text-muted">جميع أنواع البشرة</span>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Droplets size={18} className="text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">يعالج مشاكل البشرة</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.benefits.ar.map((benefit, concern) => (
                    <span
                      key={concern}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 border border-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                    >
                      <Droplets size={12} />
                      {skinConcernLabels[benefit] || benefit}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
