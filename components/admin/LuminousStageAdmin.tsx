"use client";

import { useEffect, useMemo, useState } from "react";
import { publishedProductSummaries } from "@/src/data/product-summaries";
import {
  defaultStageConfigs,
  resolveStageSlides,
  type StageSlideConfig,
  type ProductConfig,
} from "@/lib/luminous-stage";
import { STAGE_MOOD_OPTIONS } from "@/lib/stage-moods";
import LuminousStage from "@/components/home/LuminousStage";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";

const BG_PRESETS: { label: string; value: string }[] = [
  { label: "عاجي ذهبي", value: "linear-gradient(165deg,#fffdf8 0%,#fbf3e2 55%,#f5e9cf 100%)" },
  { label: "أخضر هادئ", value: "linear-gradient(165deg,#f5faf7 0%,#e9f2ec 55%,#dbeae0 100%)" },
  { label: "أزرق ملكي", value: "linear-gradient(165deg,#f3f6fb 0%,#e7edf6 55%,#dae4f0 100%)" },
  { label: "رملي دافئ", value: "linear-gradient(165deg,#fdfaf3 0%,#f6ecd8 55%,#eedfc0 100%)" },
  { label: "بيج فاخر", value: "linear-gradient(165deg,#faf5f0 0%,#f2e5da 55%,#e9d6c6 100%)" },
  { label: "بنفسجي ناعم", value: "linear-gradient(165deg,#fbf5fb 0%,#f3e6f3 55%,#ead4ea 100%)" },
  { label: "وردي أنيق", value: "linear-gradient(165deg,#fef2f5 0%,#fadfe7 55%,#f3cbd8 100%)" },
  { label: "سماوي منعش", value: "linear-gradient(165deg,#f2fafc 0%,#e2f1f6 55%,#d2e7ef 100%)" },
];

function Field({
  label,
  value,
  onChange,
  dir = "rtl",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "rtl" | "ltr";
  placeholder?: string;
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

function ProductPicker({
  productId,
  onPick,
  onClear,
}: {
  productId: string | null;
  onPick: (id: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const product = useMemo(
    () => publishedProductSummaries.find((p) => p.id === productId) ?? null,
    [productId]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return publishedProductSummaries
      .filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.name.ar.includes(query.trim()) ||
          p.name.en.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2">
        {product?.gallery[0] ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic catalog thumbnail; next/image fill unsuitable in picker row
          <img src={product.gallery[0]} alt="" className="h-12 w-12 rounded-lg bg-gray-50 object-contain" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-[10px] text-gray-400">فارغ</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-gray-800">
            {product ? product.name.ar : "لم يتم الاختيار"}
          </p>
          <p className="truncate text-[10px] text-gray-400">{product ? `${product.brand} — ${product.id}` : "ابحث واختر منتجًا"}</p>
        </div>
        {product && (
          <button type="button" onClick={onClear} className="rounded-lg px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50">
            إزالة
          </button>
        )}
      </div>

      <input
        type="text"
        value={query}
        dir="rtl"
        placeholder="بحث بالاسم أو الماركة أو المعرف…"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      {open && results.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(p.id);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-start hover:bg-primary/5"
              >
                {p.gallery[0] && (
                  // eslint-disable-next-line @next/next/no-img-element -- dynamic catalog thumbnail
                  <img src={p.gallery[0]} alt="" className="h-9 w-9 rounded-md bg-gray-50 object-contain" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-gray-800">{p.name.ar}</span>
                  <span className="block truncate text-[10px] text-gray-400">{p.brand} — {p.categoryAr ?? p.category}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function LuminousStageAdmin() {
  const [configs, setConfigs] = useState<StageSlideConfig[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<"template" | "custom-image" | null>(null);

  useEffect(() => {
    fetch("/api/admin/content/luminous-stage")
      .then((r) => r.json())
      .then((data) => {
        if (data?.configs && Array.isArray(data.configs) && data.configs.length > 0) {
          setConfigs(data.configs);
        } else {
          setConfigs(defaultStageConfigs());
        }
        setLoaded(true);
      })
      .catch(() => {
        setConfigs(defaultStageConfigs());
        setLoaded(true);
      });
  }, []);

  const patch = (id: string, changes: Partial<StageSlideConfig>) =>
    setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)));

  const move = (idx: number, dir: -1 | 1) =>
    setConfigs((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  const removeSlide = (id: string) =>
    setConfigs((prev) => prev.filter((c) => c.id !== id));

  // ── Reorder: drag & drop + move to first/last ──────────────────────────
  const [dragId, setDragId] = useState<string | null>(null);

  const reorder = (fromIdx: number, toIdx: number) =>
    setConfigs((prev) => {
      if (fromIdx === toIdx || toIdx < 0 || toIdx >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });

  const moveToEnd = (idx: number, end: "first" | "last") =>
    setConfigs((prev) => {
      if (idx < 0 || idx >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      if (end === "first") next.unshift(item);
      else next.push(item);
      return next;
    });

  // ── Add-slide builder modes ────────────────────────────────────────────
  const addSlide = (mode: "template" | "custom-image", imageUrl?: string) => {
    const id = `custom-${Date.now()}`;
    const base: StageSlideConfig = {
      id,
      kind: "custom",
      eyebrowAr: "عرض خاص",
      eyebrowEn: "Special",
      headlineAr: "سلايد جديد",
      headlineEn: "New Slide",
      subAr: "وصف قصير جذاب",
      subEn: "Short slide description",
      ctaAr: "تسوقي الآن",
      ctaEn: "Shop Now",
      ctaHref: "/products",
      accent: "#a8842c",
      bg: BG_PRESETS[0].value,
      products: [],
      hidden: false,
      slideType: mode,
      ...(mode === "custom-image" ? { customImage: imageUrl ?? "", showBrandMark: false } : { showBrandMark: true }),
    };
    setConfigs((prev) => [...prev, base]);
    setExpanded(id);
  };

  const uploadImage = async (slideId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    try {
      const res = await fetch("/api/admin/content/stage-image", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.url) throw new Error(body?.error?.message ?? "فشل الرفع");
      patch(slideId, { customImage: body.url });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  // ── Preview (same renderer as homepage) ────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const previewSlides = useMemo(
    () => resolveStageSlides(configs.filter((c) => !c.hidden)),
    [configs],
  );

  const setProductAt = (slideId: string, slot: number, productId: string) =>
    setConfigs((prev) =>
      prev.map((c) => {
        if (c.id !== slideId) return c;
        const items: ProductConfig[] = [...c.products];
        while (items.length < 3) items.push({ id: "" });
        items[slot] = { ...items[slot], id: productId };
        return { ...c, products: items };
      })
    );

  const patchProductAt = (slideId: string, slot: number, changes: Partial<ProductConfig>) =>
    setConfigs((prev) =>
      prev.map((c) => {
        if (c.id !== slideId) return c;
        const items: ProductConfig[] = [...c.products];
        while (items.length < 3) items.push({ id: "" });
        items[slot] = { ...items[slot], ...changes };
        return { ...c, products: items };
      })
    );

  const handleSave = () => {
    fetch("/api/admin/content/luminous-stage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides: configs }),
    })
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      })
      .catch(() => {});
  };

  const handleReset = () => {
    fetch("/api/admin/content/luminous-stage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(null),
    })
      .then(() => {
        setConfigs(defaultStageConfigs());
        setConfirmReset(false);
      })
      .catch(() => {});
  };

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">لوحة التحكم — Luminous Stage</h1>
            <p className="mt-1 text-sm text-gray-500">
              تحكم كامل في سلايدات الصفحة الرئيسية: النصوص، المنتجات، الألوان، وإضافة سلايدات جديدة
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAddMode(addMode ? null : "template")}
              className="rounded-xl border border-primary px-5 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
            >
              + سلايد جديد
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-bold text-gray-700 transition-colors hover:border-primary hover:text-primary"
            >
              معاينة
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark active:scale-[0.98]"
            >
              {saved ? "تم الحفظ والتطبيق ✓" : "حفظ وتطبيق"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 transition-colors hover:border-red-300 hover:text-red-500"
            >
              استعادة الافتراضي
            </button>
          </div>
        </div>

        {/* Add-slide mode chooser */}
        {addMode && (
          <div className="mb-6 grid gap-3 rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 sm:grid-cols-2">
            <p className="text-xs font-bold text-gray-500 sm:col-span-2">اختاري نوع السلايد الجديد:</p>
            <button
              type="button"
              onClick={() => { addSlide("template"); setAddMode(null); }}
              className="rounded-xl border border-gray-200 bg-white p-4 text-start transition-all hover:border-primary/50"
            >
              <span className="block text-sm font-extrabold text-gray-900">Luminous Template</span>
              <span className="mt-1 block text-xs text-gray-500">نفس التصميم المعتمد: خلفية + إضاءة + شعار + Product Stage — المنتج محتوى داخل التصميم.</span>
            </button>
            <button
              type="button"
              onClick={() => { addSlide("custom-image"); setAddMode(null); }}
              className="rounded-xl border border-gray-200 bg-white p-4 text-start transition-all hover:border-primary/50"
            >
              <span className="block text-sm font-extrabold text-gray-900">Custom Image</span>
              <span className="mt-1 block text-xs text-gray-500">رفع صورة جاهزة تُعرض داخل نفس الإطار دون تحويلها لقالب.</span>
            </button>
          </div>
        )}

        <div className="space-y-4">
          {configs.map((c, idx) => {
            const open = expanded === c.id;
            return (
              <div
                key={c.id}
                draggable
                onDragStart={(e) => { setDragId(c.id); e.dataTransfer.effectAllowed = "move"; }}
                onDragOver={(e) => { if (dragId && dragId !== c.id) e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId && dragId !== c.id) reorder(configs.findIndex((x) => x.id === dragId), idx);
                  setDragId(null);
                }}
                onDragEnd={() => setDragId(null)}
                className={`rounded-2xl border bg-white shadow-sm transition-opacity ${c.hidden ? "border-gray-100 opacity-60" : "border-gray-200"} ${dragId === c.id ? "opacity-50" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : c.id)}
                  className="flex w-full cursor-grab items-center gap-3 p-4 text-start active:cursor-grabbing"
                >
                  <span title="اسحبي لإعادة الترتيب" className="shrink-0 cursor-grab text-gray-300">⠿</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold" style={{ background: c.accent, color: "#fff" }}>
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-gray-900">{c.headlineAr || "(بدون عنوان)"}</span>
                    <span className="block truncate text-xs text-gray-400">
                      {c.slideType === "custom-image" ? "🖼 صورة جاهزة" : "✦ Luminous Template"} —{" "}
                      {c.slideType === "custom-image" ? (c.customImage ? "مرفوعة ✓" : "بلا صورة بعد") : `${c.products.filter((p) => p.id).length} منتجات`}
                      {c.hidden ? " — مخفي" : ""}
                    </span>
                  </span>
                  <span className="hidden gap-1 sm:flex">
                    {[0, 1, 2].map((slot) => {
                      const pid = c.products[slot]?.id;
                      const prod = pid ? publishedProductSummaries.find((x) => x.id === pid) : null;
                      return prod?.gallery[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element -- mini preview thumb
                        <img key={slot} src={prod.gallery[0]} alt="" className="h-10 w-10 rounded-lg border border-gray-100 bg-gray-50 object-contain" />
                      ) : (
                        <span key={slot} className="h-10 w-10 rounded-lg border border-dashed border-gray-200 bg-gray-50" />
                      );
                    })}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {open && (
                  <div className="border-t border-gray-100 p-5">
                    {c.slideType === "custom-image" ? (
                      /* ── CUSTOM IMAGE editor ── */
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          {c.customImage ? (
                            // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded artwork
                            <img src={c.customImage} alt="" className="h-24 w-44 rounded-xl border border-gray-200 object-cover" />
                          ) : (
                            <span className="flex h-24 w-44 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">لا توجد صورة بعد</span>
                          )}
                          <label className={`cursor-pointer rounded-xl border border-primary px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/5 ${uploading ? "pointer-events-none opacity-50" : ""}`}>
                            {uploading ? "جارٍ الرفع..." : "رفع صورة من الجهاز"}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/svg+xml"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) void uploadImage(c.id, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {c.customImage && (
                            <button type="button" onClick={() => patch(c.id, { customImage: "" })} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-500 hover:text-red-500">
                              إزالة
                            </button>
                          )}
                        </div>
                        {uploadError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{uploadError}</p>}
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600">
                          <input
                            type="checkbox"
                            checked={c.showBrandMark === true}
                            onChange={(e) => patch(c.id, { showBrandMark: e.target.checked })}
                            className="accent-purple-600"
                          />
                          إضافة طبقة شعار Luminous Derma على الصورة (اختياري)
                        </label>
                      </div>
                    ) : (
                      /* ── TEMPLATE editor ── */
                      <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="السطر العلوي (عربي)" value={c.eyebrowAr} onChange={(v) => patch(c.id, { eyebrowAr: v })} />
                      <Field label="Eyebrow (EN)" value={c.eyebrowEn} onChange={(v) => patch(c.id, { eyebrowEn: v })} dir="ltr" />
                      <Field label="العنوان الرئيسي (عربي)" value={c.headlineAr} onChange={(v) => patch(c.id, { headlineAr: v })} />
                      <Field label="Headline (EN)" value={c.headlineEn} onChange={(v) => patch(c.id, { headlineEn: v })} dir="ltr" />
                      <Field label="الوصف (عربي)" value={c.subAr} onChange={(v) => patch(c.id, { subAr: v })} />
                      <Field label="Subtitle (EN)" value={c.subEn} onChange={(v) => patch(c.id, { subEn: v })} dir="ltr" />
                      <Field label="نص الزر (عربي)" value={c.ctaAr} onChange={(v) => patch(c.id, { ctaAr: v })} />
                      <Field label="CTA (EN)" value={c.ctaEn} onChange={(v) => patch(c.id, { ctaEn: v })} dir="ltr" />
                      <Field label="رابط الزر" value={c.ctaHref} onChange={(v) => patch(c.id, { ctaHref: v })} dir="ltr" />
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-gray-500">لون التمييز</span>
                        <input
                          type="color"
                          value={c.accent}
                          onChange={(e) => patch(c.id, { accent: e.target.value })}
                          className="h-10 w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-1"
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-xs font-bold text-gray-500">خلفية السلايد</span>
                        <select
                          value={BG_PRESETS.some((p) => p.value === c.bg) ? c.bg : BG_PRESETS[0].value}
                          onChange={(e) => patch(c.id, { bg: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                        >
                          {BG_PRESETS.map((p) => (
                            <option key={p.label} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-bold text-gray-500">Mood المشهد (Semantic Stage)</span>
                          <select
                            value={c.stageMood ?? ""}
                            onChange={(e) => patch(c.id, { stageMood: e.target.value || undefined })}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                          >
                            <option value="">تلقائي حسب القسم</option>
                            {STAGE_MOOD_OPTIONS.filter((m) => m.key !== "default").map((m) => (
                              <option key={m.key} value={m.key}>{m.labelAr} — {m.labelEn}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 sm:col-span-2">
                          <input
                            type="checkbox"
                            checked={c.showBrandMark !== false}
                            onChange={(e) => patch(c.id, { showBrandMark: e.target.checked })}
                            className="accent-purple-600"
                          />
                          إظهار شعار Luminous Derma في خلفية السلايد (موصى به)
                        </label>
                      </div>

                    <div className="mt-5">
                      <h3 className="mb-2 text-xs font-extrabold text-gray-700">منتجات السلايد (ثلاثة)</h3>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {[0, 1, 2].map((slot) => {
                          const pc = c.products[slot];
                          const pid = pc?.id ?? "";
                          const hasProduct = !!pid;
                          return (
                            <div key={slot} className="rounded-xl border border-gray-100 bg-gray-50/60 p-2.5">
                              <span className="mb-1.5 block text-[10px] font-bold text-gray-400">موضع {slot + 1}</span>
                              <ProductPicker
                                productId={pid || null}
                                onPick={(v) => setProductAt(c.id, slot, v)}
                                onClear={() => setProductAt(c.id, slot, "")}
                              />
                              {hasProduct && (
                                <div className="mt-2 space-y-1.5">
                                  <label className="block">
                                    <span className="mb-0.5 flex items-center justify-between text-[10px] font-bold text-gray-500">
                                      الحجم
                                      <span>{Math.round((pc?.scale ?? 1) * 100)}%</span>
                                    </span>
                                    <input
                                      type="range"
                                      min={70}
                                      max={135}
                                      value={Math.round((pc?.scale ?? 1) * 100)}
                                      onChange={(e) => patchProductAt(c.id, slot, { scale: Number(e.target.value) / 100 })}
                                      className="w-full accent-purple-600"
                                    />
                                  </label>
                                  <label className="block">
                                    <span className="mb-0.5 flex items-center justify-between text-[10px] font-bold text-gray-500">
                                      الدوران
                                      <span>{Math.round(pc?.rotate ?? 0)}°</span>
                                    </span>
                                    <input
                                      type="range"
                                      min={-12}
                                      max={12}
                                      value={Math.round(pc?.rotate ?? 0)}
                                      onChange={(e) => patchProductAt(c.id, slot, { rotate: Number(e.target.value) })}
                                      className="w-full accent-purple-600"
                                    />
                                  </label>
                                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600">
                                    <input
                                      type="checkbox"
                                      checked={pc?.hero === true}
                                      onChange={(e) => patchProductAt(c.id, slot, { hero: e.target.checked })}
                                      className="accent-purple-600"
                                    />
                                    منتج رئيسي (أكبر وأمامي)
                                  </label>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => patch(c.id, { hidden: !c.hidden })}
                        className={`relative h-7 w-12 rounded-full transition-colors ${!c.hidden ? "bg-emerald-500" : "bg-gray-300"}`}
                        title={c.hidden ? "مخفي" : "ظاهر"}
                      >
                        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${!c.hidden ? "start-6" : "start-1"}`} />
                      </button>
                      <span className="text-xs font-bold text-gray-500">{c.hidden ? "مخفي عن الموقع" : "ظاهر على الموقع"}</span>
                      <span className="mx-2 h-5 w-px bg-gray-200" />
                      <button type="button" onClick={() => moveToEnd(idx, "first")} disabled={idx === 0} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 disabled:opacity-40" title="نقل للأول">⇤ أول</button>
                      <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 disabled:opacity-40">↑</button>
                      <button type="button" onClick={() => move(idx, 1)} disabled={idx === configs.length - 1} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 disabled:opacity-40">↓</button>
                      <button type="button" onClick={() => moveToEnd(idx, "last")} disabled={idx === configs.length - 1} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 disabled:opacity-40" title="نقل لآخر">آخر ⇥</button>
                      <button type="button" onClick={() => removeSlide(c.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50">حذف السلايد</button>
                    </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          بعد الحفظ حدّث الصفحة الرئيسية لرؤية التغييرات مباشرة.
        </p>
      </div>

      {/* ── Preview modal — renders the ACTUAL homepage renderer ── */}
      {previewOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/60 p-4 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 pb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${previewDevice === "desktop" ? "bg-white text-gray-900" : "bg-white/20 text-white hover:bg-white/30"}`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${previewDevice === "mobile" ? "bg-white text-gray-900" : "bg-white/20 text-white hover:bg-white/30"}`}
              >
                Mobile
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
            >
              إغلاق ✕
            </button>
          </div>
          <div className="mx-auto w-full overflow-y-auto" style={{ maxWidth: previewDevice === "mobile" ? 420 : 1152 }}>
            <div
              className="overflow-hidden rounded-2xl bg-white shadow-2xl"
              style={{ transform: previewDevice === "mobile" ? undefined : undefined }}
            >
              {/* Same renderer as the homepage — zero divergence */}
              <LuminousStage slides={previewSlides} />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        title="استعادة الإعداد الافتراضي"
        message="سيتم حذف جميع تعديلاتك والعودة إلى السلايدات التلقائية من الكتالوج. هل أنت متأكد؟"
        confirmLabel="استعادة"
        tone="danger"
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
