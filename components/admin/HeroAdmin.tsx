"use client";

import { useEffect, useState } from "react";
import {
  HERO_CAMPAIGNS,
  HERO_THEMES,
  buildHeroContent,
  getHeroOverride,
  saveHeroOverride,
  clearHeroOverride,
} from "@/src/engine/hero/engine";
import type { HeroOverride, HeroThemeKey } from "@/src/engine/hero/types";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";

function Field({
  label,
  value,
  onChange,
  placeholder = "",
  dir = "rtl",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-gray-500">{label}</span>
      <input
        type="text"
        value={value}
        dir={dir}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

export default function HeroAdmin() {
  const [campaignId, setCampaignId] = useState("glow");
  const [custom, setCustom] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [form, setForm] = useState({
    titleAr: "",
    titleEn: "",
    accentAr: "",
    accentEn: "",
    subtitleAr: "",
    subtitleEn: "",
    badgeAr: "",
    badgeEn: "",
    primaryCtaAr: "",
    primaryCtaEn: "",
    primaryLink: "/products",
    secondaryCtaAr: "",
    secondaryCtaEn: "",
    secondaryLink: "/routines",
    productId: "yq-2685",
    theme: "premium" as HeroThemeKey,
  });

  useEffect(() => {
    const apply = () => {
      fetch("/api/admin/hero")
        .then((r) => r.json())
        .then((ov) => {
          if (ov && ov.campaignId) {
            if (ov.campaignId) setCampaignId(ov.campaignId);
            setCustom(!!ov.custom);
            setForm((prev) => ({
              ...prev,
              titleAr: ov.title?.ar ?? prev.titleAr,
              titleEn: ov.title?.en ?? prev.titleEn,
              accentAr: ov.accent?.ar ?? prev.accentAr,
              accentEn: ov.accent?.en ?? prev.accentEn,
              subtitleAr: ov.subtitle?.ar ?? prev.subtitleAr,
              subtitleEn: ov.subtitle?.en ?? prev.subtitleEn,
              badgeAr: ov.badge?.ar ?? prev.badgeAr,
              badgeEn: ov.badge?.en ?? prev.badgeEn,
              primaryCtaAr: ov.primaryCta?.ar ?? prev.primaryCtaAr,
              primaryCtaEn: ov.primaryCta?.en ?? prev.primaryCtaEn,
              primaryLink: ov.primaryLink ?? prev.primaryLink,
              secondaryCtaAr: ov.secondaryCta?.ar ?? prev.secondaryCtaAr,
              secondaryCtaEn: ov.secondaryCta?.en ?? prev.secondaryCtaEn,
              secondaryLink: ov.secondaryLink ?? prev.secondaryLink,
              productId: ov.productId ?? prev.productId,
              theme: ov.theme ?? prev.theme,
            }));
          }
        })
        .catch(() => {
          const ov = getHeroOverride();
          if (ov) {
            if (ov.campaignId) setCampaignId(ov.campaignId);
            setCustom(!!ov.custom);
            setForm((prev) => ({
              ...prev,
              titleAr: ov.title?.ar ?? prev.titleAr,
              titleEn: ov.title?.en ?? prev.titleEn,
              accentAr: ov.accent?.ar ?? prev.accentAr,
              accentEn: ov.accent?.en ?? prev.accentEn,
              subtitleAr: ov.subtitle?.ar ?? prev.subtitleAr,
              subtitleEn: ov.subtitle?.en ?? prev.subtitleEn,
              badgeAr: ov.badge?.ar ?? prev.badgeAr,
              badgeEn: ov.badge?.en ?? prev.badgeEn,
              primaryCtaAr: ov.primaryCta?.ar ?? prev.primaryCtaAr,
              primaryCtaEn: ov.primaryCta?.en ?? prev.primaryCtaEn,
              primaryLink: ov.primaryLink ?? prev.primaryLink,
              secondaryCtaAr: ov.secondaryCta?.ar ?? prev.secondaryCtaAr,
              secondaryCtaEn: ov.secondaryCta?.en ?? prev.secondaryCtaEn,
              secondaryLink: ov.secondaryLink ?? prev.secondaryLink,
              productId: ov.productId ?? prev.productId,
              theme: ov.theme ?? prev.theme,
            }));
          }
        });
    };
    apply();
  }, []);

  const set = (key: keyof typeof form) => (v: string) => setForm((prev) => ({ ...prev, [key]: v }));

  const handleSave = () => {
    const override: HeroOverride = { campaignId, custom };

    if (custom) {
      override.title = { ar: form.titleAr, en: form.titleEn };
      override.accent = { ar: form.accentAr, en: form.accentEn };
      override.subtitle = { ar: form.subtitleAr, en: form.subtitleEn };
      override.badge = { ar: form.badgeAr, en: form.badgeEn };
      override.primaryCta = { ar: form.primaryCtaAr, en: form.primaryCtaEn };
      override.primaryLink = form.primaryLink;
      override.secondaryCta = { ar: form.secondaryCtaAr, en: form.secondaryCtaEn };
      override.secondaryLink = form.secondaryLink;
      override.productId = form.productId;
      override.theme = form.theme;
    }

    saveHeroOverride(override);
    fetch("/api/admin/hero", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(override),
    }).catch(() => {});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    clearHeroOverride();
    fetch("/api/admin/hero", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(null),
    }).catch(() => {});
    setCampaignId("glow");
    setCustom(false);
    setSaved(false);
    setConfirmReset(false);
  };

  const preview = buildHeroContent(new Date().getMonth() + 1, {
    campaignId,
    custom,
    ...(custom
      ? {
          title: { ar: form.titleAr, en: form.titleEn },
          accent: { ar: form.accentAr, en: form.accentEn },
          subtitle: { ar: form.subtitleAr, en: form.subtitleEn },
          badge: { ar: form.badgeAr, en: form.badgeEn },
          primaryCta: { ar: form.primaryCtaAr, en: form.primaryCtaEn },
          primaryLink: form.primaryLink,
          secondaryCta: { ar: form.secondaryCtaAr, en: form.secondaryCtaEn },
          secondaryLink: form.secondaryLink,
          productId: form.productId,
          theme: form.theme,
        }
      : {}),
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900">لوحة التحكم — البانر الرئيسي</h1>
          <p className="mt-1 text-sm text-gray-500">التحكم في محتوى قسم الـ Hero في الصفحة الرئيسية</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* = CONTROL PANEL = */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-extrabold text-primary">اختر الحملة</h2>
            <div className="grid gap-2.5">
              {HERO_CAMPAIGNS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCampaignId(c.id)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-start transition-all ${
                    campaignId === c.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-gray-200 hover:border-primary/30"
                  }`}
                >
                  <div>
                    <span className="block text-sm font-bold text-gray-900">{c.title.ar}</span>
                    <span className="block text-xs text-gray-400">{c.id} — {c.seasonal ? `موسمي (${c.seasonal.startMonth}-${c.seasonal.endMonth})` : "دائم"}</span>
                  </div>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      campaignId === c.id ? "border-primary bg-primary" : "border-gray-300"
                    }`}
                  >
                    {campaignId === c.id && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <div>
                <span className="block text-sm font-bold text-gray-900">تخصيص مخصص</span>
                <span className="block text-xs text-gray-400">تفعيل لتعديل المحتوى يدويًا</span>
              </div>
              <button
                type="button"
                onClick={() => setCustom((v) => !v)}
                className={`relative h-7 w-12 rounded-full transition-colors ${custom ? "bg-primary" : "bg-gray-300"}`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${custom ? "start-6" : "start-1"}`}
                />
              </button>
            </div>

            {custom && (
              <div className="mt-6 space-y-4">
                <h3 className="text-xs font-extrabold text-gray-700">العنوان الرئيسي</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="النص (عربي)" value={form.titleAr} onChange={set("titleAr")} />
                  <Field label="النص (إنجليزي)" value={form.titleEn} onChange={set("titleEn")} dir="ltr" />
                  <Field label="الكلمة المميزة (عربي)" value={form.accentAr} onChange={set("accentAr")} />
                  <Field label="الكلمة المميزة (إنجليزي)" value={form.accentEn} onChange={set("accentEn")} dir="ltr" />
                </div>

                <h3 className="text-xs font-extrabold text-gray-700">الوصف</h3>
                <div className="grid gap-3">
                  <Field label="الوصف (عربي)" value={form.subtitleAr} onChange={set("subtitleAr")} />
                  <Field label="الوصف (إنجليزي)" value={form.subtitleEn} onChange={set("subtitleEn")} dir="ltr" />
                </div>

                <h3 className="text-xs font-extrabold text-gray-700">الأزرار</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="الزر الأساسي (عربي)" value={form.primaryCtaAr} onChange={set("primaryCtaAr")} />
                  <Field label="الزر الأساسي (إنجليزي)" value={form.primaryCtaEn} onChange={set("primaryCtaEn")} dir="ltr" />
                  <Field label="الرابط الأساسي" value={form.primaryLink} onChange={set("primaryLink")} dir="ltr" />
                  <Field label="الزر الثانوي (عربي)" value={form.secondaryCtaAr} onChange={set("secondaryCtaAr")} />
                  <Field label="الزر الثانوي (إنجليزي)" value={form.secondaryCtaEn} onChange={set("secondaryCtaEn")} dir="ltr" />
                  <Field label="الرابط الثانوي" value={form.secondaryLink} onChange={set("secondaryLink")} dir="ltr" />
                </div>

                <h3 className="text-xs font-extrabold text-gray-700">المنتج والخلفية</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="معرف المنتج (Product ID)" value={form.productId} onChange={set("productId")} dir="ltr" />
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-gray-500">الثيم</span>
                    <select
                      value={form.theme}
                      onChange={(e) => setForm((p) => ({ ...p, theme: e.target.value as HeroThemeKey }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary"
                    >
                      {Object.keys(HERO_THEMES).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark active:scale-[0.98]"
              >
                {saved ? "تم الحفظ والتطبيق ✓" : "حفظ وتطبيق"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-bold text-gray-600 transition-colors hover:border-red-300 hover:text-red-500"
              >
                استعادة الافتراضي
              </button>
            </div>
          </div>

          {/* = LIVE PREVIEW = */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-extrabold text-primary">معاينة مباشرة</h2>
            <div className={`overflow-hidden rounded-2xl p-6 text-white ${preview.theme.bg}`}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[9px] font-bold uppercase tracking-widest">
                {preview.campaign.badge.ar}
              </span>
              <h3 className="mt-3 text-xl font-extrabold leading-snug">
                {preview.campaign.title.ar}{" "}
                <span className={`bg-clip-text text-transparent ${preview.theme.accentText}`}>
                  {preview.campaign.accent.ar}
                </span>
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-white/70 line-clamp-3">
                {preview.campaign.subtitle.ar}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 px-4 py-2 text-[11px] font-bold text-primary-950">
                  {preview.campaign.primaryCta.ar}
                </span>
                <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-bold">
                  {preview.campaign.secondaryCta.ar}
                </span>
              </div>
              {preview.product && (
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/10 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- dynamic product image, unknown size/format (may be SVG); next/image unsafe here */}
                  <img src={preview.product.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  <div>
                    <p className="text-xs font-bold">{preview.product.nameAr}</p>
                    <p className="mt-0.5 text-[11px] text-amber-300">
                      {preview.product.price.toLocaleString("ar-YE")} ر.ي
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="استعادة الواجهة الافتراضية"
        message="سيتم حذف جميع تخصيصاتك الحالية والعودة إلى الحملة الافتراضية. هل أنت متأكد؟"
        confirmLabel="استعادة"
        tone="danger"
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}

