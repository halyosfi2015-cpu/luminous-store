"use client";

import { useMemo, useState } from "react";
import { Package, Search, Plus, Trash2, ArrowUp, ArrowDown, Check, Power, Eye, Percent } from "lucide-react";
import Card from "@/components/ui/Card";
import { useAdminGuard } from "@/src/admin/useAdminGuard";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { getBundleDiscountPercent, setBundleDiscountPercent, DEFAULT_BUNDLE_DISCOUNT_PERCENT } from "@/src/data/bundle-discount";
import { publishedProductSummaries as catalog } from "@/src/data/product-summaries";
import type { Bundle } from "@/src/types/bundle";

type EditableBundle = Bundle & {
  _items: { productId: string; quantity: number }[];
  _discountEnabled: boolean;
  _discountPercent: number;
  _originalSubtotal: number;
  _discount: number;
  _final: number;
};

const originalPriceOf = (id: string) => {
  const p = catalog.find((x) => x.id === id);
  return p ? (p.pricing.originalPrice ?? p.pricing.price) : 0;
};

const nameOf = (id: string) => catalog.find((x) => x.id === id)?.name.ar ?? id;

function buildEditable(b: Bundle, globalDefault: number): EditableBundle {
  const items = (b.bundleItems ?? b.productIds.map((id) => ({ productId: id, quantity: 1 })));
  const discountEnabled = b.discountEnabled ?? true;
  const discountPercent = b.discountPercent ?? globalDefault;
  const originalSubtotal = items.reduce((sum, it) => sum + originalPriceOf(it.productId) * it.quantity, 0);
  const discount = discountEnabled ? Math.round(originalSubtotal * (discountPercent / 100)) : 0;
  return {
    ...b,
    _items: items,
    _discountEnabled: discountEnabled,
    _discountPercent: discountPercent,
    _originalSubtotal: originalSubtotal,
    _discount: discount,
    _final: originalSubtotal - discount,
  };
}

function toBundle(e: EditableBundle): Bundle {
  return {
    ...e,
    productIds: e._items.map((it) => it.productId),
    bundleItems: e._items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
    originalPrice: e._originalSubtotal,
    bundlePrice: e._final,
    savingsPercent: e._originalSubtotal > 0 && e._discount > 0
      ? Math.round((e._discount / e._originalSubtotal) * 100)
      : 0,
    discountEnabled: e._discountEnabled,
    discountPercent: e._discountPercent,
  };
}

export default function BundlePricingAdmin() {
  const guard = useAdminGuard("bundles");
  const { toast } = useAdminToast();
  const [globalDefault, setGlobalDefault] = useState<number>(() => getBundleDiscountPercent());
  const [rows, setRows] = useState<EditableBundle[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [pickQuery, setPickQuery] = useState("");
  const [saved, setSaved] = useState(false);

  useMemo(() => {
    if (loaded) return;
    setLoaded(true);
    const def = getBundleDiscountPercent();
    setGlobalDefault(def);
    fetch("/api/admin/bundles")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((list: Bundle[]) => setRows((Array.isArray(list) ? list : []).map((b) => buildEditable(b, def))))
      .catch(() => toast("تعذر تحميل الباقات", "error"));
  }, [loaded, toast]);

  const recompute = (id: string, patch: Partial<EditableBundle>): EditableBundle[] => {
    return rows.map((r) => {
      if (r.id !== id) return r;
      const next: EditableBundle = { ...r, ...patch, _items: [...(patch._items ?? r._items)] };
      next._originalSubtotal = next._items.reduce((sum, it) => sum + originalPriceOf(it.productId) * it.quantity, 0);
      next._discount = next._discountEnabled ? Math.round(next._originalSubtotal * (next._discountPercent / 100)) : 0;
      next._final = next._originalSubtotal - next._discount;
      return next;
    });
  };

  const persist = (next: EditableBundle[]) => {
    const plain = next.map(toBundle);
    setRows(next);
    fetch("/api/admin/bundles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plain),
    }).catch(() => toast("حدث خطأ أثناء حفظ التغييرات", "error"));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const changeGlobalDefault = (val: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(val)));
    setGlobalDefault(clamped);
    setBundleDiscountPercent(clamped);
    setRows((prev) => prev.map((r) => {
      const next: EditableBundle = {
        ...r,
        _discountPercent: r.discountPercent !== undefined ? r._discountPercent : clamped,
      };
      next._discount = next._discountEnabled ? Math.round(next._originalSubtotal * (next._discountPercent / 100)) : 0;
      next._final = next._originalSubtotal - next._discount;
      return next;
    }));
    toast(`الخصم الافتراضي أصبح ${clamped}%`, "success");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.nameAr.toLowerCase().includes(q));
  }, [rows, query]);

  const catalogMatches = useMemo(() => {
    if (!pickerFor) return [];
    const q = pickQuery.trim().toLowerCase();
    const inBundle = new Set(rows.find((r) => r.id === pickerFor)?._items.map((it) => it.productId) ?? []);
    return catalog.filter((p) => {
      if (inBundle.has(p.id)) return false;
      if (!q) return true;
      return p.name.ar.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
    }).slice(0, 40);
  }, [pickerFor, pickQuery, rows]);

  if (!guard.allowed) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-error">لا تملك صلاحية</h1>
        <p className="mt-2 text-muted">دورك الحالي لا يملك صلاحية إدارة الباقات.</p>
      </div>
    );
  }

  const move = (id: string, dir: 1 | -1) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  };

  return (
    <div className="space-y-4">
      <Card padding="sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Percent size={18} className="text-primary" />
              خصومات الباقات والتسعير
            </h1>
            <p className="mt-1 text-sm text-muted">
              خصم افتراضي 20% لكل الباقات — قابل للتعديل لكل باقة على حدة. يُحتسب الخصم من السعر الأصلي للمنتجات تلقائياً.
            </p>
          </div>
          {saved && (
            <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-4 py-2 text-sm font-semibold text-success animate-fade-in">
              <Check size={15} /> تم الحفظ
            </span>
          )}
        </div>

        {/* Global default */}
        <div className="mb-5 flex flex-col gap-3 rounded-card border border-border bg-muted-bg/30 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold text-foreground">الخصم الافتراضي للباقات</p>
            <p className="text-xs text-muted">
              القيمة الافتراضية (20%) — تُطبَّق على الباقات التي لا تملك خصماً مخصصاً. عروض المنتجات الفردية لا تُكدَّس مع خصم الباقة.
            </p>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={globalDefault}
              onChange={(e) => changeGlobalDefault(Number(e.target.value))}
              className="w-28 rounded-input border border-border bg-card px-3 py-2 text-center text-sm font-bold text-foreground outline-none focus:border-primary"
            />
            <span className="text-sm font-bold text-muted">%</span>
            <button
              type="button"
              onClick={() => changeGlobalDefault(DEFAULT_BUNDLE_DISCOUNT_PERCENT)}
              className="rounded-input border border-border bg-card px-3 py-2 text-xs font-semibold text-muted transition hover:border-primary/30 hover:text-primary"
            >
              إعادة للافتراضي
            </button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن باقة..."
            className="w-full rounded-xl border border-border bg-white pe-3 ps-9 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-72"
          />
        </div>

        {rows.length === 0 ? (
          <div className="py-14 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-muted/30" />
            <p className="text-sm text-muted">لا توجد باقات. أضف باقات من قسم «إدارة الباقات والهدايا».</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => (
              <BundleRow
                key={b.id}
                bundle={b}
                onPatch={(patch) => setRows(recompute(b.id, patch))}
                onPersist={() => persist(rows)}
                onDelete={() => {
                  setRows((prev) => prev.filter((r) => r.id !== b.id));
                  persist(rows.filter((r) => r.id !== b.id));
                }}
                onMove={move}
                onPick={(id) => setPickerFor(id)}
                pickerFor={pickerFor}
                pickQuery={pickQuery}
                setPickQuery={setPickQuery}
                catalogMatches={catalogMatches}
                onAddToBundle={(productId) => {
                  setRows(recompute(b.id, {
                    _items: [...b._items, { productId, quantity: 1 }],
                  }));
                  setPickerFor(null);
                  setPickQuery("");
                }}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function BundleRow({
  bundle: b,
  onPatch,
  onPersist,
  onDelete,
  onMove,
  onPick,
  pickerFor,
  pickQuery,
  setPickQuery,
  catalogMatches,
  onAddToBundle,
}: {
  bundle: EditableBundle;
  onPatch: (patch: Partial<EditableBundle>) => void;
  onPersist: () => void;
  onDelete: () => void;
  onMove: (id: string, dir: 1 | -1) => void;
  onPick: (id: string | null) => void;
  pickerFor: string | null;
  pickQuery: string;
  setPickQuery: (v: string) => void;
  catalogMatches: { id: string; name: { ar: string }; brand: string }[];
  onAddToBundle: (productId: string) => void;
}) {
  const { toast } = useAdminToast();
  const fmt = (n: number) => n.toLocaleString("ar-YE");

  const setItemQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      onPatch({ _items: b._items.filter((it) => it.productId !== productId) });
    } else {
      onPatch({ _items: b._items.map((it) => (it.productId === productId ? { ...it, quantity } : it)) });
    }
  };

  return (
    <div className={`rounded-card border border-border bg-card p-4 shadow-card ${b.active === false ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={b.nameAr}
          onChange={(e) => onPatch({ nameAr: e.target.value, nameEn: e.target.value || b.nameEn })}
          className="w-64 rounded-input border border-transparent bg-transparent px-1 py-0.5 text-sm font-bold text-foreground outline-none transition hover:border-border focus:border-primary"
        />
        <BadgePill tone={b.active === false ? "muted" : "success"}>
          {b.active === false ? "مخفية" : "ظاهرة"}
        </BadgePill>
        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPatch({ active: b.active === false ? true : false })}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition hover:border-primary hover:text-primary"
            title={b.active === false ? "إظهار" : "إخفاء"}
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            onClick={() => onMove(b.id, -1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition hover:border-primary hover:text-primary"
            title="تحريك لأعلى"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => onMove(b.id, 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition hover:border-primary hover:text-primary"
            title="تحريك لأسفل"
          >
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => { onPatch({ _discountEnabled: !b._discountEnabled }); }}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
              b._discountEnabled ? "bg-emerald-500/10 text-emerald-600" : "bg-gray-200 text-gray-500"
            }`}
            title="تفعيل/إيقاف الخصم"
          >
            <Power size={12} />
            {b._discountEnabled ? "خصم مفعل" : "خصم معطل"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-gray-400 transition hover:border-red-300 hover:text-red-500"
            title="حذف الباقة"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Discount controls */}
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-muted-bg/30 p-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
          نسبة الخصم لهذه الباقة
          <input
            type="number"
            min={0}
            max={100}
            value={b._discountPercent}
            onChange={(e) => onPatch({ _discountPercent: Math.min(100, Math.max(0, Number(e.target.value))) })}
            disabled={!b._discountEnabled}
            className="w-24 rounded-input border border-border bg-card px-2.5 py-1.5 text-sm font-bold text-foreground outline-none focus:border-primary disabled:opacity-50"
          />
          %
        </label>
        <span className="text-[11px] text-muted">
          يُحتسب من السعر الأصلي للمنتجات فقط — عروض المنتجات الفردية لا تُكدَّس.
        </span>
      </div>

      {/* Product list */}
      <div className="mt-3 space-y-2">
        {b._items.map((it, idx) => (
          <div key={it.productId} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium text-foreground">{nameOf(it.productId)}</span>
            <span className="text-xs text-muted">{fmt(originalPriceOf(it.productId))} ر.ي</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setItemQty(it.productId, it.quantity - 1)} className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted hover:border-primary hover:text-primary">−</button>
              <span className="w-7 text-center text-xs font-bold">{it.quantity}</span>
              <button type="button" onClick={() => setItemQty(it.productId, it.quantity + 1)} className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted hover:border-primary hover:text-primary">+</button>
            </div>
            <button
              type="button"
              onClick={() => setItemQty(it.productId, 0)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500"
              title="إزالة"
            >
              <Trash2 size={12} />
            </button>
            {idx > 0 && (
              <button type="button" onClick={() => onPatch({ _items: swap(b._items, idx, idx - 1) })} className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-primary" title="أعلى">
                <ArrowUp size={12} />
              </button>
            )}
            {idx < b._items.length - 1 && (
              <button type="button" onClick={() => onPatch({ _items: swap(b._items, idx, idx + 1) })} className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:text-primary" title="أسفل">
                <ArrowDown size={12} />
              </button>
            )}
          </div>
        ))}

        {/* Add product */}
        {pickerFor === b.id ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                value={pickQuery}
                onChange={(e) => setPickQuery(e.target.value)}
                placeholder="ابحث عن منتج من كتالوج المتجر..."
                className="w-full rounded-xl border border-border bg-white pe-3 ps-9 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {catalogMatches.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-muted">لا توجد منتجات مطابقة.</p>
              ) : (
                catalogMatches.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onAddToBundle(p.id)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition hover:bg-primary/10"
                  >
                    <span className="truncate font-medium text-foreground">{p.name.ar}</span>
                    <span className="shrink-0 text-muted">{fmt(originalPriceOf(p.id))} ر.ي</span>
                  </button>
                ))
              )}
            </div>
            <button type="button" onClick={() => onPick(null)} className="mt-2 text-xs font-semibold text-muted hover:text-primary">
              إلغاء
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setPickQuery(""); onPick(b.id); }}
            className="flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted transition hover:border-primary/40 hover:text-primary"
          >
            <Plus size={13} /> إضافة / استبدال منتج من الكتالوج
          </button>
        )}
      </div>

      {/* Live pricing preview */}
      <div className="mt-3 space-y-1 rounded-xl border border-border bg-muted-bg/30 p-3 text-sm">
        <div className="flex items-center justify-between text-muted">
          <span>إجمالي المنتجات (بالسعر الأصلي)</span>
          <span className="font-semibold">{fmt(b._originalSubtotal)} ر.ي</span>
        </div>
        {b._discountEnabled && (
          <div className="flex items-center justify-between text-success">
            <span>خصم الباقة ({b._discountPercent}%)</span>
            <span className="font-semibold">-{fmt(b._discount)} ر.ي</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border pt-1.5 text-base font-extrabold text-foreground">
          <span>سعر الباقة النهائي</span>
          <span className="text-primary">{fmt(b._final)} ر.ي</span>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => { onPersist(); toast(`تم حفظ "الخصم والتسعير" للباقة`, "success"); }}
          className="inline-flex items-center gap-1.5 rounded-input bg-primary px-5 py-2 text-sm font-bold text-white shadow-md shadow-primary/30 transition-all hover:bg-primary-dark active:scale-95"
        >
          <Check size={15} /> حفظ الباقة
        </button>
      </div>
    </div>
  );
}

function BadgePill({ children, tone }: { children: React.ReactNode; tone: "success" | "muted" }) {
  return (
    <span className={`rounded-pill px-2.5 py-0.5 text-[10px] font-bold ${
      tone === "success" ? "bg-success-soft text-success-fg" : "bg-muted-bg text-muted"
    }`}>
      {children}
    </span>
  );
}

function swap<T>(arr: T[], a: number, b: number): T[] {
  const copy = [...arr];
  [copy[a], copy[b]] = [copy[b], copy[a]];
  return copy;
}