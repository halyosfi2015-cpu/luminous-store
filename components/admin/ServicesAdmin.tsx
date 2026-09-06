"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Save, Trash2, X, Plus, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import Card from "@/components/ui/Card";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import type { ServiceItemOverride } from "@/src/lib/content-store";

const ICON_OPTIONS = ["Palette", "Droplets", "Zap", "Flower2", "Sparkles", "Heart", "Star", "CheckCircle", "Calendar", "Clock", "Award", "Magic"] as const;

const DEFAULTS: ServiceItemOverride[] = [
  {
    id: "makeup", titleAr: "خدمات المكياج", titleEn: "Makeup Services",
    descAr: "مكياج احترافي لأجمل إطلالة في مناسباتك", descEn: "Professional makeup for your best look",
    featuresAr: "مكياج عروس|مكياج مناسبات|تعليم المكياج",
    featuresEn: "Bridal Makeup|Event Makeup|Makeup Lessons",
    icon: "Palette", href: "/contact", available: false, image: "",
    taglineAr: "إطلالة مشرقة لكل مناسبة", taglineEn: "A radiant look for every occasion",
  },
  {
    id: "skincare", titleAr: "العناية بالبشرة", titleEn: "Skincare Treatments",
    descAr: "جلسات علاجية لبشرة مشرقة وصحية", descEn: "Therapeutic sessions for radiant, healthy skin",
    featuresAr: "تنظيف بشرة|هيدرا فيشل|علاج حب الشباب",
    featuresEn: "Skin Cleansing|HydraFacial|Acne Treatment",
    icon: "Droplets", href: "/contact", available: false, image: "",
    taglineAr: "علاجات مخصصة لاحتياجات بشرتك", taglineEn: "Treatments tailored to your skin needs",
  },
  {
    id: "laser", titleAr: "الإزالة بالليزر", titleEn: "Laser Hair Removal",
    descAr: "بشرة ناعمة خالية من الشعر بتقنيات حديثة", descEn: "Smooth hair-free skin with advanced techniques",
    featuresAr: "إزالة الشعر نهائياً|تقنيات آمنة|نتائج فورية",
    featuresEn: "Permanent Removal|Safe Techniques|Instant Results",
    icon: "Zap", href: "/contact", available: false, image: "",
    taglineAr: "تقنيات متقدمة لأمان 최대", taglineEn: "Advanced techniques for maximum safety",
  },
  {
    id: "hair", titleAr: "عناية الشعر", titleEn: "Hair Care",
    descAr: "علاجات مخصصة لتقوية وترطيب شعرك", descEn: "Personalized treatments to strengthen and moisturize",
    featuresAr: "علاج التساقط|ترطيب عميق|تصفيف احترافي",
    featuresEn: "Hair Loss Treatment|Deep Conditioning|Professional Styling",
    icon: "Flower2", href: "/contact", available: false, image: "",
    taglineAr: "صحة شعرك تبدأ من هنا", taglineEn: "Your hair health starts here",
  },
];

export default function ServicesAdmin() {
  const { toast } = useAdminToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [items, setItems] = useState<ServiceItemOverride[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/content/services", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const loaded = Array.isArray(data.items) && data.items.length > 0 ? data.items : DEFAULTS;
      setItems(loaded);
      setDirty(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const update = (idx: number, patch: Partial<ServiceItemOverride>) => {
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
    if (!confirm("هل أنت متأكد من حذف هذه الخدمة؟")) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const add = () => {
    const newItem: ServiceItemOverride = {
      id: `service-${Date.now()}`,
      titleAr: "", titleEn: "",
      descAr: "", descEn: "",
      featuresAr: "", featuresEn: "",
      icon: "Sparkles", href: "/contact", available: false, hidden: false,
      image: "", taglineAr: "", taglineEn: "",
    };
    setItems((prev) => [...prev, newItem]);
    setExpandedId(newItem.id);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/content/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDirty(false);
      toast("تم حفظ الخدمات بنجاح", "success");
    } catch {
      toast("تعذر حفظ الخدمات", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-8 text-sm text-muted">جاري التحميل...</div>;
  if (error) return <div className="py-8 text-center text-sm text-muted">حدث خطأ في التحميل</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">إدارة الخدمات التجميلية</h1>
          <p className="mt-1 text-sm text-muted">
            أضيفي، عدّلي، أخفي أو أعيدي ترتيب الخدمات الظاهرة في قسم «خدمات تجميلية» بالشاشة الرئيسية.
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
            <Plus className="h-4 w-4" /> خدمة جديدة
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
            لا توجد خدمات محفوظة بعد — اضغطي «خدمة جديدة» للبدء.
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
                  <div className="flex flex-col gap-1">
                    <button type="button" aria-label="تحريك للأعلى" onClick={() => move(idx, -1)} disabled={idx === 0}
                      className="rounded-lg border border-border p-1.5 text-muted hover:text-primary disabled:opacity-30">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" aria-label="تحريك للأسفل" onClick={() => move(idx, 1)} disabled={idx === items.length - 1}
                      className="rounded-lg border border-border p-1.5 text-muted hover:text-primary disabled:opacity-30">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {item.image && (
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      <Image src={item.image} alt="" fill unoptimized className="object-cover" />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getIconEmoji(item.icon)}</span>
                      <span className="truncate font-semibold text-foreground">{item.titleAr || item.id}</span>
                      <span className="text-xs text-muted">/ {item.titleEn || item.id}</span>
                    </div>
                    <span className="text-xs text-muted">{item.taglineAr || item.descAr}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select value={String(item.available)} onChange={(e) => update(idx, { available: e.target.value === "true" })}
                      className="rounded-lg border border-border bg-white px-2 py-1 text-xs focus:border-primary focus:outline-none">
                      <option value="true">متاحة</option>
                      <option value="false">غير متاحة</option>
                    </select>
                    <button type="button" onClick={() => update(idx, { hidden: !item.hidden })}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold ${item.hidden ? "bg-yellow-50 text-yellow-700" : "bg-green-50 text-green-700"}`}>
                      {item.hidden ? "مخفي" : "ظاهر"}
                    </button>
                    <button type="button" onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-primary">
                      {isExpanded ? "إخفاء" : "تعديل"}
                    </button>
                    <button type="button" onClick={() => remove(idx)}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50">
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
                        <label className="mb-1 block text-xs font-semibold text-foreground">معرّف الخدمة (slug)</label>
                        <input value={item.id} onChange={(e) => update(idx, { id: e.target.value })} disabled
                          className="w-full rounded-lg border border-border bg-gray-50 px-3 py-2 text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-foreground">العنوان بالعربي</label>
                          <input value={item.titleAr} onChange={(e) => update(idx, { titleAr: e.target.value })}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-foreground">العنوان بالإنجليزي</label>
                          <input value={item.titleEn} onChange={(e) => update(idx, { titleEn: e.target.value })}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" dir="ltr" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-foreground">الشعار بالعربي</label>
                          <input value={item.taglineAr ?? ""} onChange={(e) => update(idx, { taglineAr: e.target.value })}
                            placeholder="اختياري"
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-foreground">الشعار بالإنجليزي</label>
                          <input value={item.taglineEn ?? ""} onChange={(e) => update(idx, { taglineEn: e.target.value })}
                            placeholder="Optional"
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" dir="ltr" />
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

                    {/* Visual + features */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-foreground">الأيقونة</label>
                          <select value={item.icon} onChange={(e) => update(idx, { icon: e.target.value })}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none">
                            {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-foreground">الرابط</label>
                          <input value={item.href} onChange={(e) => update(idx, { href: e.target.value })}
                            placeholder="/contact" dir="ltr"
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-foreground">رابط الصورة</label>
                        <input value={item.image ?? ""} onChange={(e) => update(idx, { image: e.target.value })}
                          placeholder="https://... أو /images/..."
                          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        {item.image && (
                          <span className="mt-1 block h-20 overflow-hidden rounded-lg bg-gray-100">
                            <Image src={item.image} alt="" width={200} height={80} unoptimized className="h-full w-full object-cover" />
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-foreground">الميزات بالعربي (سطر واحد لكل ميزة)</label>
                        <textarea value={(item.featuresAr ?? "").replace(/\|/g, "\n")} rows={3}
                          onChange={(e) => update(idx, { featuresAr: e.target.value.split("\n").filter(Boolean).join("|") })}
                          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-foreground">الميزات بالإنجليزي (سطر واحد لكل ميزة)</label>
                        <textarea value={(item.featuresEn ?? "").replace(/\|/g, "\n")} rows={3}
                          onChange={(e) => update(idx, { featuresEn: e.target.value.split("\n").filter(Boolean).join("|") })}
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
    </div>
  );
}

function getIconEmoji(icon: string): string {
  const map: Record<string, string> = {
    Palette: "🎨", Droplets: "💧", Zap: "⚡", Flower2: "🌸",
    Sparkles: "✨", Heart: "❤️", Star: "⭐", CheckCircle: "✅",
    Calendar: "📅", Clock: "🕐", Award: "🏆", Magic: "🪄",
  };
  return map[icon] ?? "✨";
}
