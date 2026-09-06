"use client";

import Image from "next/image";
import { ShoppingBag, Save, Search, X } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { useEffect, useMemo, useState, useCallback } from "react";
import { productSummaries } from "@/src/data/product-summaries";
import { saveProductOverride } from "@/src/admin/operations";
import type { Product } from "@/src/types/product";

export default function MerchandisingAdmin() {
  const { toast } = useAdminToast();
  const [list, setList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/products", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: Product[]) => {
        if (!cancelled) setList(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) toast("تعذر تحميل المنتجات من قاعدة البيانات", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [toast]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchOther, setSearchOther] = useState("");
  const [aiLoading, setAILoading] = useState(false);
  const [aiRecommendation, setAIRecommendation] = useState<string | null>(null);
  const [selectedAlternativeFeature, setSelectedAlternativeFeature] = useState<
    "hidden" | "enabled"
  >("hidden");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list.slice(0, 200);
    return list
      .filter(
        (p) =>
          p.name.ar.includes(q) ||
          p.name.en.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          (p.brandAr ?? "").includes(q),
      )
      .slice(0, 200);
  }, [list, query]);

  const selected = selectedId ? list.find((p) => p.id === selectedId) : null;

  const otherOptions = useMemo(() => {
    const q = searchOther.trim().toLowerCase();
    return productSummaries
      .filter(
        (p) =>
          p.id !== selectedId &&
          (!q ||
            p.name.ar.includes(q) ||
            p.name.en.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q)),
      )
      .slice(0, 30);
  }, [searchOther, selectedId]);

  const saveProduct = async (p: Product) => {
    try {
      await saveProductOverride(p);
      setList((prev) => prev.map((x) => (x.id === p.id ? p : x)));
      toast("تم حفظ إعدادات التسويق", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "تعذر الحفظ", "error");
    }
  };

  const setCheaper = (altId: string | null) => {
    if (!selected) return;
    const alt = altId ? productSummaries.find((p) => p.id === altId) : undefined;
    const cheaper = alt
      ? {
          id: alt.id,
          slug: alt.slug,
          name: alt.name,
          price: alt.pricing.price,
          savings: Math.max(0, selected.pricing.price - alt.pricing.price),
        }
      : undefined;
    saveProduct({ ...selected, cheaperAlternative: cheaper });
  };

  const toggleRecommendation = (id: string) => {
    if (!selected) return;
    const recs = selected.recommendations ?? [];
    const next = recs.includes(id) ? recs.filter((r) => r !== id) : [...recs, id];
    saveProduct({ ...selected, recommendations: next });
  };

  const generateAIRecommendation = async (productId: string) => {
    setAILoading(true);
    try {
      // Server-side AI via the guarded API — never import the server-only
      // AI service into client components.
      const res = await fetch("/api/admin/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "Provide merchandising recommendations for this product including pricing strategy, visibility optimization, and placement suggestions. Focus on actionable advice based on product performance data.",
          scope: "merchandising",
          range: "30d",
          productId,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.error?.message ?? `HTTP ${res.status}`;
        setAIRecommendation("الخدمة غير متاحة حاليًا — " + msg);
      } else if (json?.success && json?.response) {
        setAIRecommendation(json.response);
      } else {
        setAIRecommendation("الخدمة غير متاحة حاليًا");
      }
    } catch {
      setAIRecommendation("الخدمة غير متاحة حاليًا — تعذر الاتصال بالخدمة");
    } finally {
      setAILoading(false);
    }
  };

  return (
    <main dir="rtl" className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <ShoppingBag className="text-primary" size={20} />
          التسويق والترتيب
        </h1>
        <p className="mt-1 text-sm text-muted">
          إدارة البديل الأوفر وقد يعجبك (التوصيات) لكل منتج
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Product list */}
        <Card padding="sm">
          <div className="mb-3 flex items-center gap-2 px-3 pt-3">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="max-h-[520px] divide-y divide-border overflow-y-auto">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
        setSelectedId(p.id);
        setSelectedAlternativeFeature(p.alternativeFeature ?? "hidden");
      }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-start transition-colors hover:bg-muted-bg/50 ${
                  selectedId === p.id ? "bg-primary/5" : ""
                }`}
              >
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted-bg">
                  <Image src={p.gallery?.[0] ?? ""} alt="" fill unoptimized className="object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{p.name.ar}</span>
                  <span className="block text-xs text-muted">{p.brandAr ?? p.brand}</span>
                </span>
                <span className="text-xs font-bold text-foreground">{p.pricing.price} ر.ي</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Editor */}
        <Card padding="md">
          {!selected ? (
            <p className="text-sm text-muted">اختر منتجاً من القائمة لتعديل إعدادات التسويق الخاصة به.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <span className="relative h-12 w-12 overflow-hidden rounded-xl bg-muted-bg">
                  <Image src={selected.gallery?.[0] ?? ""} alt="" fill unoptimized className="object-cover" />
                </span>
                <div>
                  <p className="font-bold text-foreground">{selected.name.ar}</p>
                  <p className="text-xs text-muted">{selected.pricing.price} ر.ي</p>
                </div>
              </div>

              {/* Cheaper alternative */}
              <div>
                <h3 className="mb-2 text-sm font-bold text-foreground">البديل الأوفر</h3>
                {selected.cheaperAlternative ? (
                  <div className="mb-2 flex items-center justify-between rounded-xl border border-border bg-muted-bg/40 px-3 py-2">
                    <span className="text-sm">{selected.cheaperAlternative.name.ar}</span>
                    <button
                      type="button"
                      onClick={() => setCheaper(null)}
                      className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline"
                    >
                      <X size={13} /> إزالة
                    </button>
                  </div>
                ) : (
                  <p className="mb-2 text-xs text-muted">لا يوجد بديل أوفر محدد.</p>
                )}
                {/* Alternative feature control */}
                {selected.id && (
                  <div className="mt-3 p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                    <h4 className="text-xs text-secondary mb-2">{selected.alternativeFeature === "enabled" ? "مفعّل" : "مخفي"}</h4>
                    <button
                      type="button"
                      onClick={() => setSelectedAlternativeFeature(
                        selected.alternativeFeature === "enabled" ? "hidden" : "enabled"
                      )}
                      className="w-full text-sm text-secondary hover:text-primary mt-2"
                    >
                      {selected.alternativeFeature === "enabled"
                        ? "إخفاء البديل الأوفر"
                        : "عرض البديل الأوفر في المتجر"}
                    </button>
                  </div>
                )}
                <input
                  value={searchOther}
                  onChange={(e) => setSearchOther(e.target.value)}
                  placeholder="ابحث عن منتج بديل أوفر..."
                  className="mb-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <div className="max-h-40 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                  {otherOptions.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setCheaper(o.id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm hover:bg-muted-bg/50"
                    >
                      <span className="truncate">{o.name.ar}</span>
                      <span className="shrink-0 text-xs font-bold">{o.pricing.price} ر.ي</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h3 className="mb-2 text-sm font-bold text-foreground">
                  قد يعجبك (التوصيات) — {selected.recommendations?.length ?? 0}
                </h3>
                {selected.recommendations && selected.recommendations.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {selected.recommendations.map((rid) => {
                      const r = productSummaries.find((p) => p.id === rid);
                      return (
                        <button
                          key={rid}
                          type="button"
                          onClick={() => toggleRecommendation(rid)}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary hover:bg-red-50 hover:text-red-500"
                        >
                          {r?.name.ar ?? rid} <X size={10} />
                        </button>
                      );
                    })}
                  </div>
                )}
                <input
                  value={searchOther}
                  onChange={(e) => setSearchOther(e.target.value)}
                  placeholder="ابحث عن منتجات للتوصية..."
                  className="mb-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <Button
                  onClick={() => generateAIRecommendation(selectedId ?? "")}
                  disabled={!selectedId || aiLoading}
                  className="mb-2 w-full rounded-xl bg-primary/20 text-primary px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                >
                  {aiLoading ? (
                    <span className="align-middle">جاري generating...</span>
                  ) : (
                    <>
                      <ShoppingBag size={14} /> توليد توصية AI
                    </>
                  )}
                </Button>
                <div className="max-h-40 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                  {otherOptions.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggleRecommendation(o.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-muted-bg/50"
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={selected.recommendations?.includes(o.id) ?? false}
                        className="accent-primary"
                      />
                      <span className="truncate">{o.name.ar}</span>
                    </button>
                  ))}
                </div>

                {/* AI-powered recommendation */}
                {aiRecommendation && (
                  <div className="mt-3 p-4 rounded-card border border-primary/20 bg-card">
                    <p className="text-sm font-medium text-foreground">توصية مدعومة بالذكاء الاصطناعي</p>
                    <p className="mt-1 text-muted">{aiRecommendation}</p>
                    <button
                      onClick={() => setAIRecommendation(null)}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <X size={12} /> إغلاق
                    </button>
                  </div>
                )}
              </div>

              <Button onClick={() => saveProduct(selected)}>
                <Save size={16} /> حفظ تغييرات {selected.name.ar}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
