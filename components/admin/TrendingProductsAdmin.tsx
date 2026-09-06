"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, RefreshCw, Save, Trash2, ArrowUp, ArrowDown, X, Search } from "lucide-react";
import Card from "@/components/ui/Card";
import Image from "next/image";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { productSummaries, publishedProductSummaries } from "@/src/data/product-summaries";
import { getTaxonomySummariesForNode } from "@/src/lib/taxonomy";
import { useCategoryProductOverrides } from "@/src/lib/category-products";

interface ProductCardData {
  slug: string;
  nameAr: string;
  nameEn: string;
  image: string | null;
  brand: string;
  isPinned: boolean;
}

interface ReplaceState {
  catSlug: string;
  oldSlug: string;
  oldIndex: number;
}

export default function TrendingProductsAdmin() {
  const { toast } = useAdminToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cats, setCats] = useState<{ slug: string; nameAr: string }[]>([]);
  const [overrides, setOverrides] = useState<Record<string, { pinned: string[]; excluded: string[] }>>({});
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState<ReplaceState | null>(null);
  const [replaceQuery, setReplaceQuery] = useState("");

  const categoryOverrides = useCategoryProductOverrides();

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/content/taxonomy");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const merged: { slug: string; nameAr: string; type: string; status?: string }[] = Array.isArray(data.merged) ? data.merged : [];
      setCats(
        merged
          .filter((n) => n.type === "CATEGORY" && n.status !== "HIDDEN")
          .map((n) => ({ slug: n.slug, nameAr: n.nameAr })),
      );
      setOverrides(data.overrides?.categoryProducts ?? {});
      setDirty(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/content/taxonomy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: [], hiddenSlugs: [], categoryProducts: overrides }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDirty(false);
      toast("تم الحفظ بنجاح", "success");
    } catch {
      toast("تعذر الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const getScored = useCallback((catSlug: string) => {
    return getTaxonomySummariesForNode(publishedProductSummaries, catSlug)
      .map((p) => {
        let score = 0;
        if (p.isBestSeller) score += 1000;
        if (p.isFeatured) score += 800;
        if (p.isNew) score += 400;
        score += (p.rating || 0) * 50;
        score += Math.min(p.reviewCount || 0, 200);
        if (/[a-zA-Z]/.test(p.brand || "")) score += 300;
        return { product: p, score };
      })
      .sort((a, b) => b.score - a.score);
  }, []);

  const getDisplayedProducts = useCallback((catSlug: string): ProductCardData[] => {
    const catOverrides = { ...categoryOverrides[catSlug], ...overrides[catSlug] };
    const scored = getScored(catSlug).slice(0, 8);
    const excluded = new Set(catOverrides.excluded ?? []);
    const pinnedSlugs = catOverrides.pinned ?? [];
    const pinnedSet = new Set(pinnedSlugs);
    const filtered = scored.filter((p) => !excluded.has(p.product.slug));
    const pinned = pinnedSlugs
      .map((slug) => filtered.find((p) => p.product.slug === slug))
      .filter((p): p is (typeof filtered)[0] => Boolean(p));
    const rest = filtered.filter((p) => !pinnedSet.has(p.product.slug));
    return [...pinned, ...rest].slice(0, 4).map((item) => ({
      slug: item.product.slug,
      nameAr: item.product.name.ar,
      nameEn: item.product.name.en,
      image: item.product.gallery?.[0] ?? null,
      brand: item.product.brand,
      isPinned: pinnedSet.has(item.product.slug),
    }));
  }, [overrides, categoryOverrides, getScored]);

  const removeProduct = useCallback((catSlug: string, productSlug: string) => {
    setOverrides((prev) => {
      const cat = prev[catSlug] ?? { pinned: [], excluded: [] };
      return {
        ...prev,
        [catSlug]: {
          pinned: (cat.pinned ?? []).filter((s) => s !== productSlug),
          excluded: [...(cat.excluded ?? []), productSlug],
        },
      };
    });
    setDirty(true);
  }, []);

  const pinProduct = useCallback((catSlug: string, productSlug: string) => {
    setOverrides((prev) => {
      const cat = prev[catSlug] ?? { pinned: [], excluded: [] };
      const newPinned = cat.pinned?.includes(productSlug) ? cat.pinned : [...(cat.pinned ?? []), productSlug];
      const newExcluded = (cat.excluded ?? []).filter((s) => s !== productSlug);
      return { ...prev, [catSlug]: { pinned: newPinned, excluded: newExcluded } };
    });
    setDirty(true);
  }, []);

  const moveProduct = useCallback((catSlug: string, productSlug: string, direction: "up" | "down") => {
    setOverrides((prev) => {
      const cat = prev[catSlug] ?? { pinned: [], excluded: [] };
      const pinned = cat.pinned?.slice() ?? [];
      const idx = pinned.indexOf(productSlug);
      if (idx === -1) return prev;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= pinned.length) return prev;
      const next = [...pinned];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, [catSlug]: { ...cat, pinned: next } };
    });
    setDirty(true);
  }, []);

  const replaceProduct = useCallback((catSlug: string, oldSlug: string, newSlug: string) => {
    setOverrides((prev) => {
      const cat = prev[catSlug] ?? { pinned: [], excluded: [] };
      const pinned = cat.pinned?.slice() ?? [];
      const idx = pinned.indexOf(oldSlug);
      let newPinned: string[];
      if (idx !== -1) {
        newPinned = [...pinned];
        newPinned[idx] = newSlug;
      } else {
        newPinned = [...pinned, newSlug];
      }
      const newExcluded = [...(cat.excluded ?? []), oldSlug].filter((s) => s !== newSlug);
      return { ...prev, [catSlug]: { pinned: newPinned, excluded: newExcluded } };
    });
    setDirty(true);
    setReplacing(null);
    setReplaceQuery("");
    toast("تم الاستبدال — اضغطي حفظ لتطبيقه", "success");
  }, [toast]);

  const getReplaceSuggestions = useCallback((catSlug: string, query: string) => {
    const displayed = new Set(getDisplayedProducts(catSlug).map((p) => p.slug));
    const catOverrides = { ...categoryOverrides[catSlug], ...overrides[catSlug] };
    const excluded = new Set(catOverrides.excluded ?? []);
    const scored = getScored(catSlug);
    const q = query.trim().toLowerCase();
    return scored
      .filter((item) => {
        if (displayed.has(item.product.slug)) return false;
        if (excluded.has(item.product.slug) && !q) return false;
        if (q) {
          const nameAr = item.product.name.ar?.toLowerCase() ?? "";
          const nameEn = item.product.name.en?.toLowerCase() ?? "";
          const brand = (item.product.brand ?? "").toLowerCase();
          if (!nameAr.includes(q) && !nameEn.includes(q) && !brand.includes(q)) return false;
        }
        return true;
      })
      .slice(0, 12)
      .map((item) => ({
        slug: item.product.slug,
        nameAr: item.product.name.ar,
        nameEn: item.product.name.en,
        image: item.product.gallery?.[0] ?? null,
        brand: item.product.brand,
      }));
  }, [getScored, categoryOverrides, overrides]);

  const replacingSuggestions = useMemo(() => {
    if (!replacing) return [];
    return getReplaceSuggestions(replacing.catSlug, replaceQuery);
  }, [replacing, replaceQuery, getReplaceSuggestions]);

  if (loading) return <div className="flex items-center justify-center py-8">جاري التحميل...</div>;
  if (error) return <div className="py-8 text-center">حدث خطأ في التحميل</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">إدارة منتجات «تصفحي حسب القسم»</h1>
          <p className="mt-1 text-sm text-muted">
            المنتجات المعروضة حالياً على الشاشة الرئيسية. اضغطي <b>استبدال</b> لتحلّ منتج بآخر. اضغطي <b>حذف</b> لإزالتها. التغييرات تظهر بعد الحفظ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary">
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button type="button" onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white transition-all hover:bg-primary-700 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </div>

      {dirty && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          ⚠ لديك تغييرات غير محفوظة — اضغطي «حفظ التغييرات» لتطبيقها على الشاشة الرئيسية.
        </div>
      )}

      <div className="space-y-2">
        {cats.map((cat) => {
          const displayedProducts = getDisplayedProducts(cat.slug);
          const open = openSlug === cat.slug;
          return (
            <Card key={cat.slug} padding="sm" className="overflow-hidden !p-0">
              <button type="button" onClick={() => setOpenSlug(open ? null : cat.slug)}
                className="flex w-full items-center gap-2 px-4 py-3 text-start transition-colors hover:bg-primary/5">
                <ChevronLeft size={14} className={`shrink-0 text-muted transition-transform duration-200 ${open ? "-rotate-90" : ""}`} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{cat.nameAr}</span>
                <span className="shrink-0 text-[10px] text-muted">{cat.slug}</span>
                <ChevronDown size={14} className={`shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
              </button>
              <div className="border-t border-border bg-white px-4 pb-4">
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
                    المنتجات المعروضة حالياً على الرئيسية ({displayedProducts.length}/4)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {displayedProducts.length === 0 ? (
                      <div className="col-span-full text-center py-6 text-muted">لا توجد منتجات معروضة لهذا القسم</div>
                    ) : (
                      displayedProducts.map((p, index) => (
                        <div key={p.slug}
                          className={`relative group bg-white rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow ${p.isPinned ? "ring-2 ring-primary" : ""}`}>
                          <div className="aspect-square relative bg-gray-50 overflow-hidden">
                            {p.image ? (
                              <Image src={p.image} alt={p.nameAr} fill sizes="160px"
                                className="object-cover p-2 transition-transform group-hover:scale-105" />
                            ) : (
                              <div className="flex items-center justify-center h-full bg-gray-100">
                                <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </div>
                            )}
                            <div className="absolute top-1.5 left-1.5 flex gap-1">
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${p.isPinned ? "bg-primary/10 text-primary" : "bg-green-50 text-green-700"}`}>
                                {p.isPinned ? "مثبت" : `الترتيب ${index + 1}`}
                              </span>
                            </div>
                            {/* Replace button */}
                            <button type="button" onClick={() => { setReplacing({ catSlug: cat.slug, oldSlug: p.slug, oldIndex: index }); setReplaceQuery(""); }}
                              className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full bg-blue-500/90 px-2 py-1 text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600"
                              title="استبدال المنتج">
                              <RefreshCw className="h-2.5 w-2.5" /> استبدال
                            </button>
                          </div>
                          <div className="p-2">
                            <h4 className="text-[11px] font-bold text-foreground line-clamp-1">{p.nameAr}</h4>
                            <p className="text-[10px] text-muted mt-0.5">{p.brand}</p>
                            <div className="mt-1.5 flex items-center gap-1">
                              {index > 0 && (
                                <button type="button" onClick={() => moveProduct(cat.slug, p.slug, "up")}
                                  className="flex-1 text-[10px] font-medium text-primary hover:underline">
                                  <ArrowUp className="h-3 w-3 mr-1 inline" /> أعلى
                                </button>
                              )}
                              {index < displayedProducts.length - 1 && (
                                <button type="button" onClick={() => moveProduct(cat.slug, p.slug, "down")}
                                  className="flex-1 text-[10px] font-medium text-primary hover:underline">
                                  <ArrowDown className="h-3 w-3 mr-1 inline" /> أسفل
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Replace picker — shows when "استبدال" is clicked */}
                {replacing && replacing.catSlug === cat.slug && (
                  <div className="mt-3 p-3 rounded-xl border-2 border-blue-200 bg-blue-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-blue-800">
                        اختر منتجاً ليحلّ محل: {(() => { const old = displayedProducts.find((p) => p.slug === replacing.oldSlug); return old?.nameAr ?? replacing.oldSlug; })()}
                      </h4>
                      <button type="button" onClick={() => { setReplacing(null); setReplaceQuery(""); }}
                        className="rounded-full p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="relative mb-3">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                      <input type="text" placeholder="ابحثي بالاسم أو البراند..."
                        value={replaceQuery} onChange={(e) => setReplaceQuery(e.target.value)}
                        className="w-full rounded-lg border border-border bg-white py-2 pr-9 pl-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" autoFocus />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-72 overflow-y-auto">
                      {replacingSuggestions.length === 0 ? (
                        <div className="col-span-full text-center py-4 text-sm text-muted">لا توجد نتائج</div>
                      ) : (
                        replacingSuggestions.map((s) => (
                          <button key={s.slug} type="button"
                            onClick={() => replaceProduct(cat.slug, replacing.oldSlug, s.slug)}
                            className="flex flex-col items-center rounded-lg border border-border bg-white p-2 text-center transition-all hover:border-primary hover:shadow-md hover:scale-105">
                            <div className="aspect-square relative w-full overflow-hidden rounded-md bg-gray-50">
                              {s.image ? (
                                <Image src={s.image} alt={s.nameAr} fill sizes="100px" className="object-cover p-1" />
                              ) : (
                                <div className="flex items-center justify-center h-full bg-gray-100">
                                  <svg className="h-6 w-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-foreground mt-1 line-clamp-1 w-full">{s.nameAr}</p>
                            <p className="text-[9px] text-muted w-full truncate">{s.brand}</p>
                            <span className="mt-1 text-[9px] font-bold text-blue-600">استبدال</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {dirty && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          ⚠ لديك تغييرات غير محفوظة — اضغطي «حفظ التغييرات» لتطبيقها على الشاشة الرئيسية.
        </div>
      )}

      <div>
        <button type="button" onClick={save} disabled={saving}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition-all hover:bg-primary-700 disabled:opacity-50">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "جارٍ الحفظ..." : "حفظ التغييرات على الشاشة الرئيسية"}
        </button>
      </div>
    </div>
  );
}
