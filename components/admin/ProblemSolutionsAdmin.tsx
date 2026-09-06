"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Save, Trash2, X, Plus, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import Card from "@/components/ui/Card";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import ProductOverridePicker from "@/components/admin/ProductOverridePicker";
import type { ProblemSolutionItem, CategoryProductOverride } from "@/src/lib/content-store";
import { publishedProductSummaries } from "@/src/data/product-summaries";

const DEFAULTS: ProblemSolutionItem[] = [
  { id: "acne", labelAr: "حب الشباب", labelEn: "Acne", taglineAr: "بشرة نقية خلال 14 يوم", taglineEn: "Clear skin in 14 days", descAr: "حلول فعّالة للسيطرة على حب الشباب والحفاظ على بشرة نقية", descEn: "Effective solutions to control acne and maintain clear skin", image: "/images/problems/acne.webp", accent: "#e11d48", accentBg: "rgba(225,29,72,0.08)", emoji: "🌋", routineAr: ["نظفي بشرتك بمنظف لطيف", "ضعي سيروم حمض الساليسيليك", "ترطيبي بشرتك بمرطب خفيف"], routineEn: ["Cleanse with a gentle cleanser", "Apply salicylic acid serum", "Moisturize with a lightweight moisturizer"] },
  { id: "dryness", labelAr: "جفاف البشرة", labelEn: "Dryness", taglineAr: "ترطيب عميق يدوم 24 ساعة", taglineEn: "24h deep hydration", descAr: "حلول ترطيب مكثفة للبشرة الجافة والمتشققة", descEn: "Intensive hydration solutions for dry and cracked skin", image: "/images/problems/dryness.webp", accent: "#0284c7", accentBg: "rgba(2,132,199,0.08)", emoji: "💧", routineAr: ["استخدمي منظف كريمي خالٍ من الصابون", "ضعي سيروم هايالورونيك أسيد", "ترطيبي بكريم مرطب كثيف"], routineEn: ["Use a soap-free cream cleanser", "Apply hyaluronic acid serum", "Moisturize with a rich cream"] },
  { id: "pigmentation", labelAr: "تصبغات وكلف", labelEn: "Pigmentation", taglineAr: "توحيد لون وإشراقة", taglineEn: "Even tone & radiance", descAr: "علاج التصبغات والبقع الداكنة للحصول على لون موحد", descEn: "Treat dark spots and pigmentation for an even skin tone", image: "/images/problems/pigmentation.webp", accent: "#d97706", accentBg: "rgba(217,119,6,0.08)", emoji: "✨", routineAr: ["نظفي بشرتك جيداً", "ضعي سيروم فيتامين سي", "واقي شمس SPF 50+ morning"], routineEn: ["Cleanse thoroughly", "Apply vitamin C serum", "Use SPF 50+ sunscreen daily"] },
  { id: "large_pores", labelAr: "مسام واسعة", labelEn: "Pores", taglineAr: "مسام ضيقة وبشرة ناعمة", taglineEn: "Refined & smooth skin", descAr: " تقليص حجم المسام وتنعيم ملمس البشرة", descEn: "Minimize pore size and smooth skin texture", image: "/images/problems/large-pores-v2.webp", accent: "#7c3aed", accentBg: "rgba(124,58,237,0.08)", emoji: "🔬", routineAr: ["نظفي بشرتك بمنظف عميق", "ضعي تونر بالنياسيناميد", "ترطيبي بمرطب خفيف"], routineEn: ["Deep cleanse with a foaming cleanser", "Apply niacinamide toner", "Use a lightweight moisturizer"] },
  { id: "oiliness", labelAr: "لمعة زائدة", labelEn: "Oiliness", taglineAr: "مات بدون جفاف", taglineEn: "Matte without drying", descAr: "التحكم في إفرازات اللمعة الزائدة مع الحفاظ على الترطيب", descEn: "Control excess oil while maintaining hydration", image: "/images/problems/oiliness.webp", accent: "#0891b2", accentBg: "rgba(8,145,178,0.08)", emoji: "🫧", routineAr: ["نظفي بشرتك مرتين يومياً", "استخدمي تونر متوازن للزهم", "ترطيبي بمرطب مائي خفيف"], routineEn: ["Cleanse twice daily", "Use an oil-balancing toner", "Apply a water-based moisturizer"] },
  { id: "sensitivity", labelAr: "بشرة حساسة", labelEn: "Sensitivity", taglineAr: "هدوء وراحة فورية", taglineEn: "Instant calm & comfort", descAr: "تهدئة وتقوية البشرة الحساسة المتضررة", descEn: "Soothe and strengthen sensitive, compromised skin", image: "/images/problems/sensitivity-v2.webp", accent: "#059669", accentBg: "rgba(5,150,105,0.08)", emoji: "🌿", routineAr: ["نظفي بشرتك بمنظف لطيف خالٍ من العطور", "ضعي سيروم كوليدول مهدئ", "ترطيبي بكريم مُهدئ للبشرة الحساسة"], routineEn: ["Use a fragrance-free gentle cleanser", "Apply a calming centella serum", "Moisturize with a sensitive-skin cream"] },
  { id: "aging", labelAr: "مكافحة الشيخوخة", labelEn: "Anti-Aging", taglineAr: "بشرة شابة ومشدودة", taglineEn: "Youthful, firm skin", descAr: "محاربة علامات التقدم بالسن وتجديد خلايا البشرة", descEn: "Fight signs of aging and renew skin cells", image: "/images/problems/aging.webp", accent: "#db2777", accentBg: "rgba(219,39,119,0.08)", emoji: "🌸", routineAr: ["نظفي بشرتك بمنظف لطيف", "ضعي سيروم ريتينول", "ترطيبي بكريم مكافحة الشيخوخة", "واقي شمس كل صباح"], routineEn: ["Cleanse with a gentle cleanser", "Apply retinol serum", "Use anti-aging moisturizer", "Sunscreen every morning"] },
  { id: "dark_circles", labelAr: "هالات سوداء", labelEn: "Dark Circles", taglineAr: "عيون منتعشة ومشرقة", taglineEn: "Bright, refreshed eyes", descAr: "تقليل الهالات السوداء وتوحيد لون منطقة حول العين", descEn: "Reduce dark circles and even out the eye area", image: "/images/problems/dark-circles-v2.webp", accent: "#4f46e5", accentBg: "rgba(79,70,229,0.08)", emoji: "👁️", routineAr: ["ضعي كريم عيون بالكافيين صباحاً", "استخدمي سيروم فيتامين سي حول العين", "ATIONAL مرر بالكولد"], routineEn: ["Apply caffeine eye cream in the morning", "Use vitamin C eye serum", "Gently massage with a cold roller"] },
];

const EMPTY_ITEM: ProblemSolutionItem = {
  id: "",
  labelAr: "",
  labelEn: "",
  taglineAr: "",
  taglineEn: "",
  descAr: "",
  descEn: "",
  image: "/images/problems/acne.webp",
  accent: "#7c3aed",
  accentBg: "rgba(124,58,237,0.08)",
  emoji: "🔍",
  routineAr: [],
  routineEn: [],
  hidden: false,
};

export default function ProblemSolutionsAdmin() {
  const { toast } = useAdminToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [items, setItems] = useState<ProblemSolutionItem[]>([]);
  const [productOverrides, setProductOverrides] = useState<Record<string, CategoryProductOverride>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/content/problemSolutions", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let loadedItems: ProblemSolutionItem[] = [];
      if (Array.isArray(data.items) && data.items.length > 0) {
        loadedItems = data.items;
      } else {
        loadedItems = [...DEFAULTS];
      }
      setItems(loadedItems);
      setProductOverrides(data.productOverrides && typeof data.productOverrides === "object" ? data.productOverrides : {});
      setDirty(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const update = (idx: number, patch: Partial<ProblemSolutionItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    setDirty(true);
  };

  const move = (idx: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    setDirty(true);
  };

  const remove = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const add = () => {
    setItems((prev) => [...prev, { ...EMPTY_ITEM, id: `custom-${Date.now()}` }]);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/content/problemSolutions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, productOverrides }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDirty(false);
      toast("تم حفظ إعدادات تشخيص البشرة بنجاح", "success");
    } catch {
      toast("تعذر حفظ الإعدادات", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-8 text-sm text-muted">جاري التحميل...</div>;
  if (error) return <div className="py-8 text-center text-sm text-muted">حدث خطأ في التحميل</div>;

  return (
    <div dir="rtl" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">إدارة تشخيص البشرة</h1>
          <p className="mt-1 text-sm text-muted">
            أضفي مشاكل بشرة جديدة، عدّلي البيانات والصور، أو أدرِج المنتجات لكل مشكلة.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button type="button" onClick={() => void load()} disabled={saving}
              className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm text-muted hover:text-foreground">
              <X className="h-4 w-4" /> إلغاء
            </button>
          )}
          <button type="button" onClick={add}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10">
            <Plus className="h-4 w-4" /> مشكلة جديدة
          </button>
          <button type="button" onClick={save} disabled={saving || !dirty}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white transition-all hover:bg-primary-700 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card padding="lg">
          <p className="text-center text-sm text-muted py-6">
            لا توجد مشاكل مخزَّنة بعد — اضغطي «مشكلة جديدة» للبدء، أو «حفظ» لتطبيق القيم الافتراضية.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            return (
              <Card key={item.id} padding="sm" className={item.hidden ? "opacity-60" : ""}>
                {/* Collapsed header */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0}
                      className="p-0.5 text-muted hover:text-foreground disabled:opacity-30"><ChevronUp size={14} /></button>
                    <button type="button" onClick={() => move(idx, 1)} disabled={idx === items.length - 1}
                      className="p-0.5 text-muted hover:text-foreground disabled:opacity-30"><ChevronDown size={14} /></button>
                  </div>

                  {item.image && (
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      <Image src={item.image} alt="" fill unoptimized className="object-cover" />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.emoji}</span>
                      <span className="truncate font-semibold text-foreground">{item.labelAr || item.id}</span>
                      <span className="text-xs text-muted">/ {item.labelEn || item.id}</span>
                    </div>
                    <span className="text-xs text-muted">{item.taglineAr}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select value={String(item.hidden)} onChange={(e) => update(idx, { hidden: e.target.value === "true" })}
                      className="rounded-lg border border-border bg-white px-2 py-1 text-xs focus:border-primary focus:outline-none">
                      <option value="false">ظاهر</option>
                      <option value="true">مخفي</option>
                    </select>
                    <button type="button" onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted hover:text-primary hover:border-primary/40">
                      {isExpanded ? "إخفاء" : "تعديل"}
                    </button>
                    <button type="button" onClick={() => remove(idx)}
                      className="rounded-lg border border-red-200 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded form */}
                {isExpanded && (
                  <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
                    {/* Basic info */}
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-foreground">معرّف الفكرة (slug)</label>
                        <input value={item.id} onChange={(e) => update(idx, { id: e.target.value })} disabled
                          className="w-full rounded-lg border border-border bg-gray-50 px-3 py-2 text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-foreground">الاسم بالعربي</label>
                          <input value={item.labelAr} onChange={(e) => update(idx, { labelAr: e.target.value })}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-foreground">الاسم بالإنجليزي</label>
                          <input value={item.labelEn} onChange={(e) => update(idx, { labelEn: e.target.value })}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-foreground">الشعار بالعربي</label>
                          <input value={item.taglineAr} onChange={(e) => update(idx, { taglineAr: e.target.value })}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-foreground">الشعار بالإنجليزي</label>
                          <input value={item.taglineEn} onChange={(e) => update(idx, { taglineEn: e.target.value })}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-foreground">الوصف بالعربي</label>
                        <textarea value={item.descAr} onChange={(e) => update(idx, { descAr: e.target.value })} rows={2}
                          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-foreground">الوصف بالإنجليزي</label>
                        <textarea value={item.descEn} onChange={(e) => update(idx, { descEn: e.target.value })} rows={2}
                          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                      </div>
                    </div>

                    {/* Visual + routine */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-foreground">الإيموجي</label>
                          <input value={item.emoji} onChange={(e) => update(idx, { emoji: e.target.value })}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-center focus:border-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-foreground">اللون الرئيسي</label>
                          <div className="flex gap-1">
                            <input type="color" value={item.accent} onChange={(e) => update(idx, { accent: e.target.value })}
                              className="h-9 w-9 cursor-pointer rounded border border-border" />
                            <input value={item.accent} onChange={(e) => update(idx, { accent: e.target.value })}
                              className="flex-1 rounded-lg border border-border bg-white px-2 py-1 text-xs focus:border-primary focus:outline-none" />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-foreground">خلفية اللون</label>
                          <input value={item.accentBg} onChange={(e) => update(idx, { accentBg: e.target.value })}
                            className="w-full rounded-lg border border-border bg-white px-2 py-1 text-xs focus:border-primary focus:outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-foreground">رابط الصورة</label>
                        <input value={item.image} onChange={(e) => update(idx, { image: e.target.value })}
                          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        {item.image && (
                          <span className="mt-1 block h-20 overflow-hidden rounded-lg bg-gray-100">
                            <Image src={item.image} alt="" width={200} height={80} unoptimized className="h-full w-full object-cover" />
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-foreground">خطوات الروتين بالعربي (سطر واحد لكل خطوة)</label>
                        <textarea value={(item.routineAr ?? []).join("\n")} rows={3}
                          onChange={(e) => update(idx, { routineAr: e.target.value.split("\n").filter(Boolean) })}
                          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-foreground">خطوات الروتين بالإنجليزي (سطر واحد لكل خطوة)</label>
                        <textarea value={(item.routineEn ?? []).join("\n")} rows={3}
                          onChange={(e) => update(idx, { routineEn: e.target.value.split("\n").filter(Boolean) })}
                          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {dirty && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          ⚠ لديك تغييرات غير محفوظة — اضغطي «حفظ التغييرات» لتطبيقها على الموقع.
        </div>
      )}

      {/* Per-concern product overrides */}
      <Card padding="sm">
        <h2 className="mb-1 text-sm font-bold text-foreground">منتجات كل مشكلة (اختياري)</h2>
        <p className="mb-4 text-xs text-muted">
          الاختيار التلقائي يعتمد على خصائص المنتجات نفسها. أي تثبيت/استبعاد هنا يطبق فوقه.
        </p>
        <div className="space-y-3">
          {items.filter((it) => !it.hidden).map((item) => (
            <div key={item.id} className="rounded-xl border border-border p-3">
              <ProductOverridePicker
                label={`${item.emoji} ${item.labelAr}`}
                override={productOverrides[item.id]}
                allProducts={publishedProductSummaries.map((p) => ({ slug: p.slug, nameAr: p.name.ar, nameEn: p.name.en, brand: p.brand, image: p.heroImage || (p.gallery?.[0] ?? null) }))}
                onChange={(next) => {
                  setProductOverrides((prev) => ({ ...prev, [item.id]: { pinned: next.pinned ?? [], excluded: next.excluded ?? [] } }));
                  setDirty(true);
                }}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
