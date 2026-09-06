"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Package, Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronUp,
  Search, Eye, EyeOff, ArrowUp, ArrowDown, Power, Gift, Percent,
  Save, Link as LinkIcon, Image as ImageIcon, LayoutGrid,
} from "lucide-react";
import Container from "@/components/ui/Container";
import { LoadingState } from "@/components/admin/ui/States";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { getBundleDiscountPercent, fetchBundleDiscountFromAPI, setBundleDiscountPercent, DEFAULT_BUNDLE_DISCOUNT_PERCENT } from "@/src/data/bundle-discount";
import { publishedProductSummaries as catalog } from "@/src/data/product-summaries";
import type { Bundle as BundleType, BundleOccasion } from "@/src/types/bundle";
import type { GiftOption } from "@/src/data/bundles-admin";
import { occasionLabels } from "@/src/types/bundle";

const OCCASIONS: BundleOccasion[] = ["all", "bride", "engagement", "wedding", "holidays", "valentine", "mothers-day", "summer", "winter"];

const fmt = (n: number) => n.toLocaleString("ar-YE");
const originalPriceOf = (id: string) => {
  const p = catalog.find((x) => x.id === id);
  return p ? (p.pricing.originalPrice ?? p.pricing.price) : 0;
};
const nameOf = (id: string) => catalog.find((x) => x.id === id)?.name.ar ?? id;
const imgOf = (id: string) => catalog.find((x) => x.id === id)?.gallery?.[0];

const CATEGORY_MAP: Record<string, string> = {
  skincare: "العناية بالبشرة",
  haircare: "العناية بالشعر",
  bodycare: "العناية بالجسم",
  makeup: "المكياج",
  perfume: "العطور",
  fragrance: "العطور",
  bakhoor: "البخور",
  baby: "الأطفال",
  supplements: "المكملات",
  tools: "الأدوات",
};

function getCategoryGroup(p: { category?: string; categorySlug?: string; tags?: string[] }): string {
  const slug = (p.categorySlug ?? p.category ?? "").toLowerCase();
  if (slug.includes("skin") || slug.includes("face") || slug.includes("serum") || slug.includes("cleanser") || slug.includes("moisturiz")) return "skincare";
  if (slug.includes("hair")) return "haircare";
  if (slug.includes("body")) return "bodycare";
  if (slug.includes("makeup") || slug.includes("lip") || slug.includes("eye-shadow") || slug.includes("mascara") || slug.includes("foundation")) return "makeup";
  if (slug.includes("perfume") || slug.includes("eau")) return "perfume";
  if (slug.includes("bakhoor") || slug.includes("incense")) return "bakhoor";
  if (slug.includes("baby") || slug.includes("child")) return "baby";
  if (slug.includes("supplement") || slug.includes("vitamin")) return "supplements";
  if (slug.includes("tool") || slug.includes("brush") || slug.includes("device")) return "tools";
  const tags = (p.tags ?? []).map((t) => t.toLowerCase()).join(" ");
  if (tags.includes("hair")) return "haircare";
  if (tags.includes("body")) return "bodycare";
  if (tags.includes("perfume") || tags.includes("fragrance")) return "perfume";
  return "skincare";
}

type Tab = "products" | "pricing" | "gifts";

export default function BundlesAdmin() {
  const { toast } = useAdminToast();
  const [bundles, setBundles] = useState<BundleType[]>([]);
  const [giftOptions, setGiftOptions] = useState<GiftOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [deleteTarget, setDeleteTarget] = useState<{ type: "bundle" | "gift"; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const bundleRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BundleType>>({});
  const [globalDiscount, setGlobalDiscount] = useState<number>(() => getBundleDiscountPercent());
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [pickQuery, setPickQuery] = useState("");
  const [pickCategory, setPickCategory] = useState<string | null>(null);
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const [giftForm, setGiftForm] = useState({ labelAr: "", labelEn: "", price: "", descAr: "", descEn: "" });
  const [showGiftForm, setShowGiftForm] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/admin/bundles").then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))),
      fetch("/api/admin/gift-options").then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))),
      fetchBundleDiscountFromAPI(),
    ]).then(([apiBundles, apiGifts, discount]) => {
      if (!cancelled) {
        setBundles(Array.isArray(apiBundles) ? apiBundles : []);
        setGiftOptions(Array.isArray(apiGifts) ? apiGifts : []);
        setGlobalDiscount(discount);
      }
    }).catch(() => { if (!cancelled) toast("تعذر تحميل الباقات", "error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const persistBundles = (list: BundleType[]) => {
    setBundles(list);
    fetch("/api/admin/bundles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(list),
    }).then(async (r) => {
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        console.error("[BundlesAdmin] Save failed:", r.status, body);
        throw new Error(body.details || body.error || `HTTP ${r.status}`);
      }
      flash();
    })
      .catch((e) => { console.error("[BundlesAdmin] Save error:", e); toast("حدث خطأ أثناء حفظ الباقات", "error"); });
  };

  const persistGifts = (list: GiftOption[]) => {
    setGiftOptions(list);
    fetch("/api/admin/gift-options", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(list),
    }).then((r) => { if (!r.ok) throw new Error(); flash(); })
      .catch(() => toast("حدث خطأ أثناء حفظ خيارات الهدايا", "error"));
  };

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1500); };

  const scrollToBundle = useCallback((id: string) => {
    setTimeout(() => {
      const el = bundleRefs.current[id];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  }, []);

  const addBundle = async () => {
    const id = `bundle-${Date.now()}`;
    const newBundle: BundleType = {
      id, slug: id,
      nameAr: "باقة جديدة", nameEn: "New Bundle",
      descriptionAr: "", descriptionEn: "",
      occasion: ["all"], image: "", productIds: [],
      originalPrice: 0, bundlePrice: 0, savingsPercent: 0,
      giftWrap: false, giftWrapPrice: 0, giftCard: false, servicePrice: 0,
      active: true,
    };
    const updated = [...bundles, newBundle];
    try {
      const res = await fetch("/api/admin/bundles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.details || body.error || `HTTP ${res.status}`);
      }
      setBundles(updated);
      setEditingBundleId(id);
      setEditForm(newBundle);
      setExpandedId(id);
      scrollToBundle(id);
      flash();
    } catch (e) {
      toast((e as Error).message || "حدث خطأ أثناء إضافة الباقة", "error");
    }
  };

  const saveBundleEdit = async () => {
    if (!editingBundleId || !editForm) return;
    const updated = bundles.map((b) => (b.id === editingBundleId ? { ...b, ...editForm } : b));
    try {
      const res = await fetch("/api/admin/bundles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.details || body.error || `HTTP ${res.status}`);
      }
      setBundles(updated);
      setEditingBundleId(null);
      setEditForm({});
      flash();
    } catch (e) {
      toast((e as Error).message || "حدث خطأ أثناء حفظ التعديلات", "error");
    }
  };

  const confirmDelete = () => {
    if (deleting || !deleteTarget) return;
    setDeleting(true);
    if (deleteTarget.type === "bundle") {
      const bundle = bundles.find((b) => b.id === deleteTarget.id);
      setBundles((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      if (bundle?.slug) {
        fetch(`/api/admin/bundles/${encodeURIComponent(bundle.slug)}`, { method: "DELETE" })
          .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); toast("تم حذف الباقة", "success"); })
          .catch(() => toast("حدث خطأ أثناء الحذف", "error"))
          .finally(done);
      } else { toast("تم حذف الباقة", "success"); done(); }
    } else {
      setGiftOptions((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      fetch(`/api/admin/gift-options/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" })
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); toast("تم حذف الخيار", "success"); })
        .catch(() => toast("حدث خطأ أثناء الحذف", "error"))
        .finally(done);
    }
    function done() { setDeleting(false); setDeleteTarget(null); }
  };

  const toggleProductInBundle = (bundleId: string, productId: string) => {
    setBundles((prev) => {
      const updated = prev.map((b) => {
        if (b.id !== bundleId) return b;
        const has = b.bundleItems?.some((it) => it.productId === productId) ?? b.productIds.includes(productId);
        let newItems: { productId: string; quantity: number }[];
        if (has) {
          newItems = (b.bundleItems ?? b.productIds.map((id) => ({ productId: id, quantity: 1 })))
            .filter((it) => it.productId !== productId);
        } else {
          newItems = [...(b.bundleItems ?? b.productIds.map((id) => ({ productId: id, quantity: 1 }))), { productId, quantity: 1 }];
        }
        const newIds = newItems.map((it) => it.productId);
        const original = newItems.reduce((sum, it) => sum + originalPriceOf(it.productId) * it.quantity, 0);
        const discountPct = b.discountEnabled !== false ? (b.discountPercent ?? globalDiscount) : 0;
        const discount = Math.round(original * (discountPct / 100));
        return {
          ...b, bundleItems: newItems, productIds: newIds,
          originalPrice: original, bundlePrice: original - discount,
          savingsPercent: original > 0 && discount > 0 ? Math.round((discount / original) * 100) : 0,
        };
      });
      void fetch("/api/admin/bundles", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); flash(); })
        .catch(() => toast("حدث خطأ أثناء حفظ الباقات", "error"));
      return updated;
    });
  };

  const setItemQty = (bundleId: string, productId: string, qty: number) => {
    setBundles((prev) => {
      const updated = prev.map((b) => {
        if (b.id !== bundleId) return b;
        let newItems: { productId: string; quantity: number }[];
        if (qty <= 0) {
          newItems = (b.bundleItems ?? b.productIds.map((id) => ({ productId: id, quantity: 1 })))
            .filter((it) => it.productId !== productId);
        } else {
          newItems = (b.bundleItems ?? b.productIds.map((id) => ({ productId: id, quantity: 1 })))
            .map((it) => it.productId === productId ? { ...it, quantity: qty } : it);
        }
        const newIds = newItems.map((it) => it.productId);
        const original = newItems.reduce((sum, it) => sum + originalPriceOf(it.productId) * it.quantity, 0);
        const discountPct = b.discountEnabled !== false ? (b.discountPercent ?? globalDiscount) : 0;
        const discount = Math.round(original * (discountPct / 100));
        return {
          ...b, bundleItems: newItems, productIds: newIds,
          originalPrice: original, bundlePrice: original - discount,
          savingsPercent: original > 0 && discount > 0 ? Math.round((discount / original) * 100) : 0,
        };
      });
      void fetch("/api/admin/bundles", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); flash(); })
        .catch(() => toast("حدث خطأ أثناء حفظ الباقات", "error"));
      return updated;
    });
  };

  const moveItem = (bundleId: string, fromIdx: number, dir: 1 | -1) => {
    setBundles((prev) => {
      const updated = prev.map((b) => {
        if (b.id !== bundleId) return b;
        const items = [...(b.bundleItems ?? b.productIds.map((id) => ({ productId: id, quantity: 1 })))];
        const toIdx = fromIdx + dir;
        if (toIdx < 0 || toIdx >= items.length) return b;
        [items[fromIdx], items[toIdx]] = [items[toIdx], items[fromIdx]];
        return { ...b, bundleItems: items, productIds: items.map((it) => it.productId) };
      });
      void fetch("/api/admin/bundles", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); flash(); })
        .catch(() => toast("حدث خطأ أثناء حفظ الباقات", "error"));
      return updated;
    });
  };

  const moveBundle = (bundleId: string, dir: 1 | -1) => {
    setBundles((prev) => {
      const idx = prev.findIndex((b) => b.id === bundleId);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      // Update displayOrder based on new positions
      const withOrder = copy.map((bundle, index) => ({ ...bundle, displayOrder: index }));
      void fetch("/api/admin/bundles", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(withOrder) })
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); flash(); })
        .catch(() => toast("حدث خطأ أثناء حفظ ترتيب الباقات", "error"));
      return withOrder;
    });
  };

  const toggleBundleActive = (bundleId: string) => {
    setBundles((prev) => {
      const updated = prev.map((b) => b.id === bundleId ? { ...b, active: b.active === false ? true : false } : b);
      void fetch("/api/admin/bundles", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); flash(); })
        .catch(() => toast("حدث خطأ أثناء حفظ الباقات", "error"));
      return updated;
    });
  };

  const toggleDiscount = (bundleId: string) => {
    setBundles((prev) => {
      const updated = prev.map((b) => {
        if (b.id !== bundleId) return b;
        const next = { ...b, discountEnabled: b.discountEnabled === false ? true : false };
        const items = next.bundleItems ?? next.productIds.map((id) => ({ productId: id, quantity: 1 }));
        const original = items.reduce((sum, it) => sum + originalPriceOf(it.productId) * it.quantity, 0);
        const pct = next.discountEnabled ? (next.discountPercent ?? globalDiscount) : 0;
        const discount = Math.round(original * (pct / 100));
        return { ...next, originalPrice: original, bundlePrice: original - discount, savingsPercent: original > 0 && discount > 0 ? Math.round((discount / original) * 100) : 0 };
      });
      void fetch("/api/admin/bundles", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); flash(); })
        .catch(() => toast("حدث خطأ أثناء حفظ الباقات", "error"));
      return updated;
    });
  };

  const setDiscountPercent = (bundleId: string, pct: number) => {
    const clamped = Math.min(100, Math.max(0, pct));
    setBundles((prev) => {
      const updated = prev.map((b) => {
        if (b.id !== bundleId) return b;
        const items = b.bundleItems ?? b.productIds.map((id) => ({ productId: id, quantity: 1 }));
        const original = items.reduce((sum, it) => sum + originalPriceOf(it.productId) * it.quantity, 0);
        const discount = b.discountEnabled !== false ? Math.round(original * (clamped / 100)) : 0;
        return { ...b, discountPercent: clamped, originalPrice: original, bundlePrice: original - discount, savingsPercent: original > 0 && discount > 0 ? Math.round((discount / original) * 100) : 0 };
      });
      void fetch("/api/admin/bundles", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); flash(); })
        .catch(() => toast("حدث خطأ أثناء حفظ الباقات", "error"));
      return updated;
    });
  };

  const changeGlobalDiscount = async (val: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(val)));
    try {
      const res = await fetch("/api/admin/settings/bundle-discount", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountPercent: clamped }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setGlobalDiscount(clamped);
      setBundleDiscountPercent(clamped);
      toast(`الخصم الافتراضي أصبح ${clamped}%`, "success");
    } catch (err) {
      toast((err as Error).message || "فشل حفظ الخصم الافتراضي", "error");
    }
  };

  const catalogMatches = useMemo(() => {
    if (!pickerFor) return [];
    const q = pickQuery.trim().toLowerCase();
    const bundle = bundles.find((b) => b.id === pickerFor);
    const inBundle = new Set(bundle?.bundleItems?.map((it) => it.productId) ?? bundle?.productIds ?? []);
    return catalog.filter((p) => {
      if (inBundle.has(p.id)) return false;
      if (pickCategory && getCategoryGroup(p) !== pickCategory) return false;
      if (!q) return true;
      return p.name.ar.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.name.en.toLowerCase().includes(q);
    }).slice(0, 50);
  }, [pickerFor, pickQuery, pickCategory, bundles]);

  const availableCategories = useMemo(() => {
    if (!pickerFor) return [];
    const bundle = bundles.find((b) => b.id === pickerFor);
    const inBundle = new Set(bundle?.bundleItems?.map((it) => it.productId) ?? bundle?.productIds ?? []);
    const cats = new Set<string>();
    catalog.forEach((p) => {
      if (!inBundle.has(p.id)) cats.add(getCategoryGroup(p));
    });
    return [...cats];
  }, [pickerFor, bundles]);

  const saveGiftOption = () => {
    const labelAr = giftForm.labelAr.trim();
    const price = Number(giftForm.price);
    if (!labelAr) { toast("الاسم مطلوب", "error"); return; }
    if (!Number.isFinite(price) || price < 0) { toast("السعر غير صحيح", "error"); return; }
    const entry: GiftOption = {
      id: editingGiftId ?? `gift-${Date.now()}`,
      labelAr, labelEn: giftForm.labelEn.trim() || labelAr,
      price, descAr: giftForm.descAr.trim(), descEn: giftForm.descEn.trim(),
      enabled: editingGiftId ? (giftOptions.find((g) => g.id === editingGiftId)?.enabled ?? true) : true,
    };
    const next = editingGiftId
      ? giftOptions.map((g) => (g.id === editingGiftId ? entry : g))
      : [...giftOptions, entry];
    persistGifts(next);
    setShowGiftForm(false);
    setEditingGiftId(null);
    setGiftForm({ labelAr: "", labelEn: "", price: "", descAr: "", descEn: "" });
    toast(editingGiftId ? "تم تحديث الخيار" : "تم إضافة الخيار", "success");
  };

  const toggleGiftEnabled = (id: string) => {
    persistGifts(giftOptions.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g)));
  };

  if (loading) return <LoadingState label="جارٍ تحميل الباقات والهدايا..." />;

  const inputCls = "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Package size={24} className="text-primary" />
              باقات وهدايا — مركز التحكم
            </h1>
            <p className="mt-1 text-sm text-muted">إدارة كاملة للباقات والمنتجات والأسعار والخصومات والهدايا.</p>
          </div>
          {saved && (
            <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-4 py-2 text-sm font-semibold text-success animate-fade-in">
              <Check size={15} /> تم الحفظ
            </span>
          )}
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-card border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2">
            <Percent size={16} className="text-primary" />
            <span className="text-sm font-bold text-foreground">الخصم الافتراضي</span>
          </div>
          <input type="number" min={0} max={100} value={globalDiscount} onChange={(e) => changeGlobalDiscount(Number(e.target.value))} className="w-20 rounded-input border border-border bg-background px-2 py-1.5 text-center text-sm font-bold text-foreground outline-none focus:border-primary" />
          <span className="text-sm font-bold text-muted">%</span>
          <button type="button" onClick={() => changeGlobalDiscount(DEFAULT_BUNDLE_DISCOUNT_PERCENT)} className="rounded-input border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted hover:border-primary/30 hover:text-primary">إعادة للافتراضي</button>
          <div className="ms-auto">
            <button type="button" onClick={addBundle} className="flex items-center gap-2 rounded-input bg-primary px-5 py-2 text-sm font-bold text-white shadow-md shadow-primary/30 transition-all hover:bg-primary-dark active:scale-95">
              <Plus size={15} /> إضافة باقة جديدة
            </button>
          </div>
        </div>

        <div className="mb-4 flex gap-1 rounded-card border border-border bg-card p-1 shadow-card">
          {([["products", "المنتجات والباقات", Package], ["pricing", "التسعير والخصومات", Percent], ["gifts", "خيارات الهدايا", Gift]] as const).map(([key, label, Icon]) => (
            <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${activeTab === key ? "bg-primary text-white shadow-md" : "text-muted hover:bg-primary/5 hover:text-primary"}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {activeTab === "products" && (
          <div className="space-y-4">
            {bundles.length === 0 ? (
              <div className="py-14 text-center">
                <Package className="mx-auto mb-3 h-10 w-10 text-muted/30" />
                <p className="text-sm text-muted">لا توجد باقات. أضف باقة جديدة للبدء.</p>
              </div>
            ) : bundles.map((b) => {
              const isExpanded = expandedId === b.id;
              const isEditing = editingBundleId === b.id;
              const items = b.bundleItems ?? b.productIds.map((id) => ({ productId: id, quantity: 1 }));

              return (
                <div key={b.id} ref={(el) => { bundleRefs.current[b.id] = el; }} className={`overflow-hidden rounded-card border border-border bg-card shadow-card ${isEditing ? "ring-2 ring-primary/30" : ""} ${b.active === false ? "opacity-70" : ""}`}>
                  <div className="flex items-center gap-3 px-5 py-4">
                    <button type="button" onClick={() => setExpandedId(isExpanded ? null : b.id)} className="text-muted hover:text-foreground">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {isEditing ? (
                      <input value={editForm.nameAr ?? b.nameAr} onChange={(e) => setEditForm({ ...editForm, nameAr: e.target.value })} className="flex-1 rounded-input border border-primary bg-background px-3 py-1.5 text-sm font-semibold text-foreground outline-none" />
                    ) : (
                      <span className="flex-1 text-sm font-semibold text-foreground">{b.nameAr}</span>
                    )}

                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">{items.length} منتجات</span>
                    <span className="text-sm font-bold text-foreground">{b.bundlePrice.toLocaleString("ar-YE")} ر.ي</span>

                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => toggleBundleActive(b.id)} className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${b.active === false ? "border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366]" : "border-border text-muted hover:border-primary hover:text-primary"}`} title={b.active === false ? "إظهار" : "إخفاء"}>
                        {b.active === false ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button type="button" onClick={() => moveBundle(b.id, -1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition hover:border-primary hover:text-primary" title="تحريك لأعلى"><ArrowUp size={14} /></button>
                      <button type="button" onClick={() => moveBundle(b.id, 1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition hover:border-primary hover:text-primary" title="تحريك لأسفل"><ArrowDown size={14} /></button>
                      {isEditing ? (
                        <>
                          <button type="button" onClick={saveBundleEdit} className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success hover:bg-success/20"><Check size={14} /></button>
                          <button type="button" onClick={() => { setEditingBundleId(null); setEditForm({}); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100"><X size={14} /></button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => { setEditingBundleId(b.id); setEditForm({ ...b }); setExpandedId(b.id); scrollToBundle(b.id); }} className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition hover:border-primary hover:text-primary"><Pencil size={14} /></button>
                          <a href={`/bundles/${b.slug}`} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition hover:border-primary hover:text-primary" title="معاينة"><LinkIcon size={14} /></a>
                          <button type="button" onClick={() => setDeleteTarget({ type: "bundle", id: b.id })} className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-gray-400 transition hover:border-red-300 hover:text-red-500"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border px-5 py-4 space-y-4">
                      {isEditing ? (
                        <>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-foreground">الاسم بالعربي</label>
                              <input value={editForm.nameAr ?? ""} onChange={(e) => setEditForm({ ...editForm, nameAr: e.target.value })} className={inputCls} />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-foreground">الاسم بالإنجليزي</label>
                              <input value={editForm.nameEn ?? ""} onChange={(e) => setEditForm({ ...editForm, nameEn: e.target.value })} className={inputCls} />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-xs font-semibold text-foreground">الوصف بالعربي</label>
                              <textarea value={editForm.descriptionAr ?? ""} onChange={(e) => setEditForm({ ...editForm, descriptionAr: e.target.value })} rows={2} className={inputCls} />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-xs font-semibold text-foreground">الوصف بالإنجليزي</label>
                              <textarea value={editForm.descriptionEn ?? ""} onChange={(e) => setEditForm({ ...editForm, descriptionEn: e.target.value })} rows={2} className={inputCls} />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-foreground">رابط الصورة</label>
                              <input value={editForm.image ?? ""} onChange={(e) => setEditForm({ ...editForm, image: e.target.value })} placeholder="https://..." className={inputCls} />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-foreground">الشارة</label>
                              <input value={editForm.badgeAr ?? ""} onChange={(e) => setEditForm({ ...editForm, badgeAr: e.target.value })} placeholder="مثلاً: الأفضل مبيعاً" className={inputCls} />
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-xs font-semibold text-foreground">المناسبات</label>
                            <div className="flex flex-wrap gap-2">
                              {OCCASIONS.map((occ) => (
                                <button key={occ} type="button" onClick={() => {
                                  const cur = editForm.occasion ?? [];
                                  setEditForm({ ...editForm, occasion: cur.includes(occ) ? cur.filter((o) => o !== occ) : [...cur, occ] });
                                }} className={`rounded-full border-2 px-3 py-1.5 text-[11px] font-bold transition-all ${(editForm.occasion ?? []).includes(occ) ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-500 hover:border-primary/30"}`}>
                                  {occasionLabels[occ]}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-foreground">رسوم التغليف (ر.ي)</label>
                              <input type="number" min={0} value={editForm.giftWrapPrice ?? 0} onChange={(e) => setEditForm({ ...editForm, giftWrapPrice: Number(e.target.value), giftWrap: Number(e.target.value) > 0 })} className={inputCls} />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-foreground">رسوم الخدمة (ر.ي)</label>
                              <input type="number" min={0} value={editForm.servicePrice ?? 0} onChange={(e) => setEditForm({ ...editForm, servicePrice: Number(e.target.value) })} className={inputCls} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-muted">{b.descriptionAr || "لا يوجد وصف"}</p>
                          <div className="flex flex-wrap gap-2">
                            {b.occasion.map((occ) => (
                              <span key={occ} className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">{occasionLabels[occ]}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="mb-2 block text-xs font-semibold text-foreground">المنتجات في الباقة</label>
                        <div className="space-y-1.5">
                          {items.map((it, idx) => (
                            <div key={it.productId} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
                              {imgOf(it.productId) ? <img src={imgOf(it.productId)} alt={nameOf(it.productId)} className="h-8 w-8 rounded object-contain" /> : <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100"><ImageIcon size={12} className="text-gray-300" /></div>}
                              <span className="min-w-0 flex-1 truncate font-medium text-foreground">{nameOf(it.productId)}</span>
                              <span className="text-xs text-muted">{originalPriceOf(it.productId).toLocaleString("ar-YE")} ر.ي</span>
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => setItemQty(b.id, it.productId, it.quantity - 1)} className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted hover:border-primary hover:text-primary">−</button>
                                <span className="w-7 text-center text-xs font-bold">{it.quantity}</span>
                                <button type="button" onClick={() => setItemQty(b.id, it.productId, it.quantity + 1)} className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted hover:border-primary hover:text-primary">+</button>
                              </div>
                              {idx > 0 && <button type="button" onClick={() => moveItem(b.id, idx, -1)} className="text-muted hover:text-primary"><ArrowUp size={12} /></button>}
                              {idx < items.length - 1 && <button type="button" onClick={() => moveItem(b.id, idx, 1)} className="text-muted hover:text-primary"><ArrowDown size={12} /></button>}
                              <button type="button" onClick={() => toggleProductInBundle(b.id, it.productId)} className="text-red-400 hover:text-red-600" title="إزالة"><Trash2 size={12} /></button>
                            </div>
                          ))}
                        </div>

                        {pickerFor === b.id ? (
                          <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                            <div className="relative mb-2">
                              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                              <input autoFocus value={pickQuery} onChange={(e) => setPickQuery(e.target.value)} placeholder="ابحث عن منتج بالاسم أو العلامة التجارية..." className="w-full rounded-xl border border-border bg-white pe-3 ps-9 py-2 text-sm text-foreground outline-none focus:border-primary" />
                            </div>
                            {availableCategories.length > 0 && (
                              <div className="mb-2 flex flex-wrap gap-1.5">
                                <button type="button" onClick={() => setPickCategory(null)} className={`rounded-full px-3 py-1 text-[10px] font-bold transition-all ${pickCategory === null ? "bg-primary text-white" : "bg-white text-muted border border-border hover:border-primary/30"}`}>
                                  الكل
                                </button>
                                {availableCategories.map((cat) => (
                                  <button key={cat} type="button" onClick={() => setPickCategory(pickCategory === cat ? null : cat)} className={`rounded-full px-3 py-1 text-[10px] font-bold transition-all ${pickCategory === cat ? "bg-primary text-white" : "bg-white text-muted border border-border hover:border-primary/30"}`}>
                                    {CATEGORY_MAP[cat] ?? cat}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="max-h-56 space-y-1 overflow-y-auto">
                              {catalogMatches.length === 0 ? (
                                <p className="px-2 py-3 text-center text-xs text-muted">لا توجد منتجات مطابقة.</p>
                              ) : catalogMatches.map((p) => (
                                <button key={p.id} type="button" onClick={() => { toggleProductInBundle(b.id, p.id); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition hover:bg-primary/10">
                                  {p.gallery?.[0] && <img src={p.gallery[0]} alt={p.name.ar} className="h-6 w-6 rounded object-contain" />}
                                  <span className="truncate font-medium text-foreground">{p.name.ar}</span>
                                  <span className="text-[10px] text-muted">{p.brand}</span>
                                  <span className="ms-auto shrink-0 text-muted">{originalPriceOf(p.id).toLocaleString("ar-YE")} ر.ي</span>
                                </button>
                              ))}
                            </div>
                            <button type="button" onClick={() => { setPickerFor(null); setPickQuery(""); setPickCategory(null); }} className="mt-2 text-xs font-semibold text-muted hover:text-primary">إلغاء</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => { setPickQuery(""); setPickCategory(null); setPickerFor(b.id); }} className="mt-2 flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted transition hover:border-primary/40 hover:text-primary">
                            <Plus size={13} /> إضافة منتج من الكتالوج
                          </button>
                        )}
                      </div>

                      <div className="rounded-xl border border-border bg-muted-bg/30 p-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
                            خصم هذه الباقة
                            <input type="number" min={0} max={100} value={b.discountPercent ?? globalDiscount} onChange={(e) => setDiscountPercent(b.id, Number(e.target.value))} disabled={b.discountEnabled === false} className="w-24 rounded-input border border-border bg-card px-2.5 py-1.5 text-sm font-bold text-foreground outline-none focus:border-primary disabled:opacity-50" />
                            %
                          </label>
                          <button type="button" onClick={() => toggleDiscount(b.id)} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${b.discountEnabled !== false ? "bg-emerald-500/10 text-emerald-600" : "bg-gray-200 text-gray-500"}`}>
                            <Power size={12} /> {b.discountEnabled !== false ? "خصم مفعل" : "خصم معطل"}
                          </button>
                        </div>
                        <div className="mt-2 space-y-1 text-sm">
                          <div className="flex items-center justify-between text-muted"><span>إجمالي المنتجات</span><span className="font-semibold">{b.originalPrice.toLocaleString("ar-YE")} ر.ي</span></div>
                          {b.discountEnabled !== false && <div className="flex items-center justify-between text-success"><span>خصم ({b.discountPercent ?? globalDiscount}%)</span><span className="font-semibold">-{(b.originalPrice - b.bundlePrice).toLocaleString("ar-YE")} ر.ي</span></div>}
                          <div className="flex items-center justify-between border-t border-border pt-1.5 font-extrabold text-foreground"><span>السعر النهائي</span><span className="text-primary">{b.bundlePrice.toLocaleString("ar-YE")} ر.ي</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "pricing" && (
          <div className="space-y-4">
            {bundles.map((b) => {
              const items = b.bundleItems ?? b.productIds.map((id) => ({ productId: id, quantity: 1 }));
              const original = items.reduce((sum, it) => sum + originalPriceOf(it.productId) * it.quantity, 0);
              const pct = b.discountPercent ?? globalDiscount;
              const disc = b.discountEnabled !== false ? Math.round(original * (pct / 100)) : 0;
              return (
                <div key={b.id} className={`rounded-card border border-border bg-card p-4 shadow-card ${b.active === false ? "opacity-70" : ""}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex-1 text-sm font-bold text-foreground">{b.nameAr}</span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">{items.length} منتجات</span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs font-semibold text-foreground">
                        خصم
                        <input type="number" min={0} max={100} value={pct} onChange={(e) => setDiscountPercent(b.id, Number(e.target.value))} disabled={b.discountEnabled === false} className="w-20 rounded-input border border-border bg-background px-2 py-1 text-center text-sm font-bold outline-none focus:border-primary disabled:opacity-50" />
                        %
                      </label>
                      <button type="button" onClick={() => toggleDiscount(b.id)} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${b.discountEnabled !== false ? "bg-emerald-500/10 text-emerald-600" : "bg-gray-200 text-gray-500"}`}>
                        <Power size={12} /> {b.discountEnabled !== false ? "مفعل" : "معطل"}
                      </button>
                    </div>
                    <div className="flex items-baseline gap-2 text-sm">
                      <span className="font-extrabold text-primary">{b.bundlePrice.toLocaleString("ar-YE")} ر.ي</span>
                      <span className="text-muted line-through">{original.toLocaleString("ar-YE")} ر.ي</span>
                      {disc > 0 && <span className="text-[10px] font-bold text-success">-{disc.toLocaleString("ar-YE")} ر.ي</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "gifts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">إدارة الإضافات الاختيارية للهدايا والباقات.</p>
              <button type="button" onClick={() => { setEditingGiftId(null); setGiftForm({ labelAr: "", labelEn: "", price: "", descAr: "", descEn: "" }); setShowGiftForm(true); }} className="flex items-center gap-2 rounded-input bg-primary px-5 py-2 text-sm font-bold text-white shadow-md shadow-primary/30 transition-all hover:bg-primary-dark active:scale-95">
                <Plus size={15} /> خيار جديد
              </button>
            </div>
            {showGiftForm && (
              <div className="rounded-card border border-primary/20 bg-primary/5 p-5 shadow-card">
                <h3 className="mb-3 text-sm font-bold text-foreground">{editingGiftId ? "تعديل الخيار" : "خيار جديد"}</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><label className="mb-1 block text-xs font-semibold text-foreground">الاسم بالعربي *</label><input value={giftForm.labelAr} onChange={(e) => setGiftForm({ ...giftForm, labelAr: e.target.value })} placeholder="تغليف فاخر" className={inputCls} /></div>
                  <div><label className="mb-1 block text-xs font-semibold text-foreground">الاسم بالإنجليزي</label><input value={giftForm.labelEn} onChange={(e) => setGiftForm({ ...giftForm, labelEn: e.target.value })} placeholder="Luxury Wrap" dir="ltr" className={inputCls} /></div>
                  <div><label className="mb-1 block text-xs font-semibold text-foreground">السعر (ر.ي) *</label><input type="number" min={0} value={giftForm.price} onChange={(e) => setGiftForm({ ...giftForm, price: e.target.value })} className={inputCls} /></div>
                  <div><label className="mb-1 block text-xs font-semibold text-foreground">الوصف بالعربي</label><input value={giftForm.descAr} onChange={(e) => setGiftForm({ ...giftForm, descAr: e.target.value })} className={inputCls} /></div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={saveGiftOption} className="flex items-center gap-1.5 rounded-input bg-primary px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-dark active:scale-95"><Save size={15} /> حفظ</button>
                  <button type="button" onClick={() => { setShowGiftForm(false); setEditingGiftId(null); }} className="rounded-input border border-border bg-background px-5 py-2 text-sm font-semibold text-muted hover:border-primary/30 hover:text-primary">إلغاء</button>
                </div>
              </div>
            )}
            {giftOptions.length === 0 ? (
              <div className="py-14 text-center"><Gift className="mx-auto mb-3 h-10 w-10 text-muted/30" /><p className="text-sm text-muted">لا توجد خيارات هدايا.</p></div>
            ) : (
              <div className="space-y-2">
                {giftOptions.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3 shadow-card">
                    <Gift size={16} className="text-primary shrink-0" />
                    <span className="flex-1 text-sm font-bold text-foreground">{g.labelAr}</span>
                    {g.descAr && <span className="hidden text-xs text-muted sm:inline">{g.descAr}</span>}
                    <span className="text-sm font-bold text-foreground">{g.price.toLocaleString("ar-YE")} ر.ي</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${g.enabled ? "bg-success/10 text-success" : "bg-muted-bg text-muted"}`}>{g.enabled ? "مفعل" : "معطل"}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => { setEditingGiftId(g.id); setGiftForm({ labelAr: g.labelAr, labelEn: g.labelEn, price: String(g.price), descAr: g.descAr, descEn: g.descEn }); setShowGiftForm(true); }} className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition hover:border-primary hover:text-primary"><Pencil size={13} /></button>
                      <button type="button" onClick={() => toggleGiftEnabled(g.id)} className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition hover:border-primary hover:text-primary"><Power size={13} /></button>
                      <button type="button" onClick={() => setDeleteTarget({ type: "gift", id: g.id })} className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-gray-400 transition hover:border-red-300 hover:text-red-500"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="mt-4 text-xs text-muted">ملاحظة: التعديلات تُحفظ فوراً وتُطبَّق مباشرة في صفحة الباقات والهدايا.</p>

        <ConfirmDialog
          open={deleteTarget !== null}
          title="تأكيد الحذف"
          message={deleteTarget?.type === "bundle"
            ? `سيتم حذف الباقة "${bundles.find((b) => b.id === deleteTarget?.id)?.nameAr ?? ""}" نهائياً.`
            : `سيتم حذف خيار الهدايا "${giftOptions.find((g) => g.id === deleteTarget?.id)?.labelAr ?? ""}" نهائياً.`}
          confirmLabel="حذف"
          tone="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </Container>
    </main>
  );
}
