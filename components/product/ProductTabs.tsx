"use client";

import { useState, Fragment } from "react";
import { Check, Droplets, FlaskConical } from "lucide-react";
import type { Product } from "@/types/product";

type ProductTabsProps = {
  product: Product;
};

/** عزل المقاطع اللاتينية/الرقمية لتبقى في موضعها الصحيح داخل السطر العربي */
function Bidi({ text }: { text: string }) {
  const parts = (text || "").split(/([A-Za-z0-9][A-Za-z0-9\s.,%\-+×/()]*)/g).filter((p) => p !== "");
  if (parts.length <= 1) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) =>
        /[A-Za-z0-9]/.test(p[0] || "") ? (
          <bdi key={i} dir="auto">{p}</bdi>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}

/** نقطة نهاية واضحة للجملة الكاملة فقط */
function endStop(s: string): string {
  const t = (s || "").trim();
  if (!t) return t;
  if (/[.،؛:؟!…]$/.test(t)) return t;
  if (/[\p{L}\p{N}]$/u.test(t)) return t + ".";
  return t;
}

const tabs = [
  { key: "benefits", label: "تفاصيل المنتج", en: "Product Details" },
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
    <section className="mt-8">
      <div className="hide-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={`shrink-0 snap-start min-h-[48px] px-4 py-3.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-[1px] whitespace-nowrap ${
              active === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground hover:border-border-strong"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {active === "benefits" && (
          <div>
            <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
              {(() => {
                // النص كامل قطعة واحدة مترابطة كما هو — دون تحويل لنقاط أو إعادة هيكلة
                const paras = (product.description.ar || "").split(/\n+/).map((s) => s.trim()).filter(Boolean);
                const chipTones = [
                  "border-primary/25 bg-primary/10 text-primary",
                  "border-accent/30 bg-accent/10 text-accent-800",
                  "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
                  "border-rose-500/25 bg-rose-500/10 text-rose-700",
                  "border-sky-500/25 bg-sky-500/10 text-sky-700",
                  "border-amber-500/30 bg-amber-500/10 text-amber-700",
                ];
                return (
                  <div className="space-y-3">
                    {product.benefits.ar.filter(Boolean).length > 0 && (
                      <div className="hide-scrollbar flex snap-x gap-2 overflow-x-auto pb-2" dir="rtl">
                        {product.benefits.ar.filter(Boolean).map((b, i) => (
                          <span
                            key={`chip-${i}`}
                            className={`shrink-0 snap-start rounded-full border px-4 py-2.5 min-h-[36px] text-[13px] font-bold shadow-sm sm:text-xs sm:py-1.5 ${chipTones[i % chipTones.length]}`}
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                    <div>
                      <p className="text-start text-[14px] leading-[1.9] break-words [overflow-wrap:anywhere] text-foreground/90 sm:text-justify sm:text-[15px] sm:leading-[1.5]">
                        {paras.map((para, i) => {
                          const m = para.match(/^([^:\n]{2,70}):\s+([\s\S]+)$/);
                          const body = m ? m[2] : para;
                          return (
                            <Fragment key={`d-${i}`}>
                              {i > 0 && " "}
                              {m ? (<><strong className="font-extrabold text-primary"><Bidi text={m[1]} />:</strong> <Bidi text={endStop(body)} /></>) : <Bidi text={endStop(body)} />}
                            </Fragment>
                          );
                        })}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {active === "ingredients" && (
          <div>
            {product.ingredients.ar.filter(Boolean).length > 0 ? (
              <div className="hide-scrollbar flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-nowrap sm:overflow-x-auto" dir="rtl">
                {product.ingredients.ar.filter(Boolean).map((ingName, i) => (
                  <span
                    key={i}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-accent/25 bg-accent/5 px-4 py-2.5 min-h-[36px] text-[13px] font-bold text-accent-800 sm:text-xs sm:py-2"
                  >
                    <FlaskConical size={13} className="shrink-0 text-accent" />
                    <Bidi text={ingName} />
                  </span>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
                مكونات هذا المنتج غير متوفرة حالياً.
              </p>
            )}
          </div>
        )}

        {active === "howToUse" && (
          <div className="space-y-4">
            <p className="text-sm text-muted"><span className="hidden sm:inline">How to Use | </span>طريقة الاستخدام</p>
            <div className="space-y-4">
              {product.usageInstructions.ar.split('. ').filter(step => step).map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 min-h-[40px] shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-card">
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
          <div>
            <div className="rounded-2xl border border-border bg-gradient-to-l from-success-soft/60 via-card to-primary/5 p-4">
              <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto" dir="rtl">
                {(product.skinTypes.length > 0 ? product.skinTypes : ["all"]).map((type) => (
                  <span
                    key={`t-${type}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success-border bg-success-soft px-3.5 py-2 text-xs font-bold text-success-fg shadow-sm"
                  >
                    <Check size={12} />
                    {skinTypeLabels[type] || type}
                  </span>
                ))}
                <span className="h-6 w-px shrink-0 bg-border" aria-hidden="true" />
                {(product.skinConcerns?.length ? product.skinConcerns : product.benefits.ar.filter(Boolean)).map((concern, i) => (
                  <span
                    key={`c-${i}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-2 text-xs font-bold text-primary shadow-sm"
                  >
                    <Droplets size={12} />
                    {skinConcernLabels[concern] || concern}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
