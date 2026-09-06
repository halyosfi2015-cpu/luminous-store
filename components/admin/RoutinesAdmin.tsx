"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Power,
  Save,
  Check,
  X,
  Search,
  ExternalLink,
  Layers,
} from "lucide-react";
import Container from "@/components/ui/Container";
import { useProducts } from "@/hooks/useProducts";
import {
  getRoutineTypes,
  resolveRoutineProducts,
} from "@/src/data/routines-store";
import {
  listRoutines,
  saveRoutineLocal,
  removeRoutineLocal,
} from "@/src/admin/adapters/local/routines";
import type { Routine, RoutineLevel, ProductSummary } from "@/src/types/product";
import { EmptyState, LoadingState } from "@/components/admin/ui/States";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useAdminToast } from "@/components/admin/ui/AdminToast";

function formatPrice(n: number) {
  return n.toLocaleString("ar-YE");
}

const LEVEL_LABELS: Record<RoutineLevel | "none", string> = {
  basic: "أساسي",
  standard: "قياسي",
  premium: "متقدم",
  none: "بدون مستوى",
};

const LEVEL_COLORS: Record<RoutineLevel | "none", string> = {
  basic: "bg-emerald-50 text-emerald-700",
  standard: "bg-sky-50 text-sky-700",
  premium: "bg-purple-50 text-purple-700",
  none: "bg-gray-100 text-gray-600",
};

export default function RoutinesAdmin() {
  const { products: allApiProducts } = useProducts();
  const [allRoutines, setAllRoutines] = useState<Routine[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useAdminToast();

  const normalize = (data: unknown): Routine[] => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray((data as any).routines)) return (data as any).routines;
    return listRoutines();
  };

  const refresh = () => {
    fetch("/api/admin/routines")
      .then((r) => r.json())
      .then((data) => setAllRoutines(normalize(data)))
      .catch(() => setAllRoutines(listRoutines()));
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/routines")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAllRoutines(normalize(data));
      })
      .catch(() => {
        if (!cancelled) setAllRoutines(listRoutines());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const types = useMemo(() => getRoutineTypes(), []);

  const filtered = useMemo(() => {
    return allRoutines
      .filter((r) => typeFilter === "all" || r.type === typeFilter)
      .filter((r) => {
        const q = query.trim();
        if (!q) return true;
        return (
          r.nameAr.includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.descriptionAr.includes(q)
        );
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [allRoutines, typeFilter, query]);

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const saveRoutine = (routine: Routine) => {
    saveRoutineLocal(routine);
    fetch("/api/admin/routines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(routine),
    }).catch(() => {});
    flashSaved();
    refresh();
  };

  const toggleActive = (r: Routine) => {
    saveRoutine({ ...r, active: !r.active });
  };

  const confirmDelete = () => {
    if (deleting || !deleteId) return;
    setDeleting(true);
    removeRoutineLocal(deleteId);
    fetch(`/api/admin/routines/${encodeURIComponent(deleteId)}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast("تم حذف الروتين بنجاح", "success");
      })
      .catch(() => {
        toast("حدث خطأ أثناء حذف الروتين", "error");
      })
      .finally(() => {
        setDeleting(false);
        setDeleteId(null);
        refresh();
      });
  };

  const openNew = () => {
    setEditing({
      id: `rt-custom-${Date.now()}`,
      name: "Custom Routine",
      nameAr: "روتين مخصص",
      description: "Custom routine",
      descriptionAr: "روتين مخصص جديد",
      products: [],
      type: types[0]?.type || "daily",
      typeAr: types[0]?.typeAr || "روتين يومي",
      level: "standard",
      active: true,
      displayOrder: allRoutines.length + 1,
      savingsPercent: 15,
      duration: "30 يوم",
      durationEn: "30 days",
      forWhom: ["كل أنواع البشرة"],
      forWhomEn: ["All skin types"],
      expectedResults: ["نتيجة متوقعة"],
      expectedResultsEn: ["Expected result"],
      rating: 4.5,
      reviewCount: 0,
      buyersCount: 0,
      steps: [],
      whyChoseIt: "روتين مخصص أُضيف من لوحة التحكم.",
    });
    setIsNew(true);
  };

  const saveEdit = (draft: Routine) => {
    saveRoutine(draft);
    setEditing(null);
    setIsNew(false);
  };

  if (loading) return <LoadingState label="جارٍ تحميل الروتينات..." />;

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Sparkles size={24} className="text-primary" />
              إدارة الروتينات
            </h1>
            <p className="mt-1 text-sm text-muted">
              {allRoutines.length} روتيناً (المضمنة + المخصصة) — عدّلي حالة الروتينات أو أضيفي روتينك الخاص.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-4 py-2 text-sm font-semibold text-success animate-fade-in">
                <Check size={15} />
                تم الحفظ
              </span>
            )}
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-2 rounded-input bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/30 transition-all hover:bg-primary-dark active:scale-95"
            >
              <Plus size={16} />
              روتين جديد
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحثي عن روتين بالاسم أو الوصف..."
              className="w-full rounded-input border border-border bg-background py-2.5 ps-10 pe-4 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={typeFilter === "all"} onClick={() => setTypeFilter("all")} label="الكل" />
            {types.map((t) => (
              <FilterChip
                key={t.type}
                active={typeFilter === t.type}
                onClick={() => setTypeFilter(t.type)}
                label={t.typeAr}
              />
            ))}
          </div>
        </div>

        {/* Editor */}
        {editing && (
          <RoutineEditor
            routine={editing}
            isNew={isNew}
            allRoutines={allRoutines}
            types={types}
            onCancel={() => {
              setEditing(null);
              setIsNew(false);
            }}
            onSave={(draft) => saveEdit(draft)}
          />
        )}

        {/* List */}
        <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
          <div className="grid grid-cols-[1fr_90px_60px] items-center gap-2 border-b border-border bg-muted-bg/50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted sm:grid-cols-[1fr_160px_120px_90px_90px]">
            <span>الروتين</span>
            <span className="hidden sm:block">النوع / المستوى</span>
            <span className="hidden sm:block">المنتجات</span>
            <span className="hidden sm:block">الحالة</span>
            <span className="text-end">إجراءات</span>
          </div>
          {filtered.map((r) => (
            <div
              key={r.id}
              className={`grid grid-cols-[1fr_90px_60px] items-center gap-2 border-b border-border px-5 py-3 text-sm last:border-b-0 sm:grid-cols-[1fr_160px_120px_90px_90px] ${
                !r.active ? "opacity-50" : ""
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="relative hidden h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-background sm:block">
                  {(() => {
                    const imgSrc = r.heroImage || allApiProducts.find((p) => p.id === r.products[0])?.gallery?.[0];
                    return imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : null;
                  })()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{r.nameAr}</p>
                  <p className="truncate text-[11px] text-muted">{r.descriptionAr}</p>
                  <Link
                    href={`/routines/${r.id}`}
                    className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                  >
                    معاينة <ExternalLink size={9} />
                  </Link>
                </div>
              </div>

              <div className="hidden sm:block">
                <span className="block text-[11px] font-semibold text-foreground">{r.typeAr}</span>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_COLORS[r.level || "none"]}`}>
                  {LEVEL_LABELS[r.level || "none"]}
                </span>
              </div>

              <div className="hidden sm:block">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                  <Layers size={11} />
                  {r.products.length}
                </span>
              </div>

              <div className="hidden sm:block">
                <button
                  type="button"
                  onClick={() => toggleActive(r)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                    r.active
                      ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                      : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                  }`}
                >
                  <Power size={12} />
                  {r.active ? "مفعل" : "موقوف"}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => toggleActive(r)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full sm:hidden ${
                    r.active ? "bg-emerald-500/10 text-emerald-600" : "bg-gray-200 text-gray-500"
                  }`}
                  aria-label="تبديل الحالة"
                >
                  <Power size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing({ ...r });
                    setIsNew(false);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-all hover:border-primary hover:text-primary"
                  aria-label="تعديل"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(r.id)}
                  disabled={deleting}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-all hover:border-red-300 hover:text-red-500 disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-400"
                  aria-label="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <EmptyState title="لا توجد روتينات مطابقة" />
          )}
        </div>

        <p className="mt-4 text-xs text-muted">
          ملاحظة: إيقاف أو تعديل الروتينات المضمنة يُنشئ نسخة مخصصة تُحفظ محلياً في المتصفح. الحذف متاح للروتينات المخصصة فقط.
        </p>

        <ConfirmDialog
          open={deleteId !== null}
          title="تأكيد الحذف"
          message={`سيتم حذف الروتين "${allRoutines.find((r) => r.id === deleteId)?.nameAr ?? ""}" نهائياً.`}
          confirmLabel="حذف"
          tone="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      </Container>
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-pill border px-3.5 py-1.5 text-xs font-bold transition-all ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted hover:border-primary/30 hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}

function RoutineEditor({
  routine,
  isNew,
  allRoutines,
  types,
  onCancel,
  onSave,
}: {
  routine: Routine;
  isNew: boolean;
  allRoutines: Routine[];
  types: { type: string; typeAr: string }[];
  onCancel: () => void;
  onSave: (draft: Routine) => void;
}) {
  const { products: allApiProducts } = useProducts();
  const [draft, setDraft] = useState<Routine>({ ...routine, steps: [...routine.steps] });
  const [selectedIds, setSelectedIds] = useState<string[]>(routine.products);
  const [productQuery, setProductQuery] = useState("");

  // Derive selected products from selected IDs and the full API catalog
  const selectedProducts = useMemo<ProductSummary[]>(
    () => selectedIds.map((id) => allApiProducts.find((p) => p.id === id)).filter((p): p is ProductSummary => Boolean(p)),
    [selectedIds, allApiProducts]
  );

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) {
      // No query: return all products from the API catalog
      return allApiProducts;
    }
    return allApiProducts
      .filter(
        (p) =>
          p.name.ar.includes(q) ||
          p.name.en.toLowerCase().includes(q) ||
          (p.brandAr || "").includes(q) ||
          p.brand.toLowerCase().includes(q)
      );
  }, [productQuery, allApiProducts]);

  const set = <K extends keyof Routine>(key: K, value: Routine[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const buildStepsFromProducts = () => {
    const steps = selectedIds.map((id, i) => ({
      productId: id,
      time: "both" as const,
      titleAr: `الخطوة ${i + 1}`,
      titleEn: `Step ${i + 1}`,
      descriptionAr: "",
      descriptionEn: "",
    }));
    setDraft((d) => ({ ...d, products: selectedIds, steps }));
  };

  // selectedProducts is now derived via useMemo above

  return (
    <div className="mb-6 overflow-hidden rounded-card border-2 border-primary/30 bg-card shadow-card-hover">
      <div className="flex items-center justify-between border-b border-border bg-primary/5 px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
          {isNew ? <Plus size={16} className="text-primary" /> : <Pencil size={16} className="text-primary" />}
          {isNew ? "روتين جديد" : `تعديل: ${draft.nameAr}`}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-xs font-bold text-muted transition-all hover:border-red-300 hover:text-red-500"
          >
            <X size={13} />
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onSave({ ...draft, products: selectedIds, steps: draft.steps })}
            className="flex items-center gap-1.5 rounded-pill bg-primary px-5 py-2 text-xs font-bold text-white shadow-md shadow-primary/30 transition-all hover:bg-primary-dark active:scale-95"
          >
            <Save size={13} />
            حفظ
          </button>
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-2">
        {/* Basics */}
        <div className="space-y-4">
          <Field label="اسم الروتين (عربي)">
            <input
              value={draft.nameAr}
              onChange={(e) => set("nameAr", e.target.value)}
              className="w-full rounded-input border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </Field>
          <Field label="الوصف (عربي)">
            <textarea
              value={draft.descriptionAr}
              onChange={(e) => set("descriptionAr", e.target.value)}
              rows={2}
              className="w-full rounded-input border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="النوع">
              <select
                value={draft.type}
                onChange={(e) => {
                  const t = types.find((x) => x.type === e.target.value);
                  set("type", e.target.value);
                  set("typeAr", t?.typeAr || e.target.value);
                }}
                className="w-full rounded-input border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                {types.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.typeAr}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="المستوى">
              <select
                value={draft.level || "standard"}
                onChange={(e) => set("level", e.target.value as RoutineLevel)}
                className="w-full rounded-input border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                <option value="basic">أساسي</option>
                <option value="standard">قياسي</option>
                <option value="premium">متقدم</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="نسبة التوفير %">
              <input
                type="number"
                value={draft.savingsPercent}
                onChange={(e) => set("savingsPercent", Number(e.target.value))}
                className="w-full rounded-input border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </Field>
            <Field label="المدة">
              <input
                value={draft.duration}
                onChange={(e) => set("duration", e.target.value)}
                className="w-full rounded-input border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </Field>
            <Field label="الترتيب">
              <input
                type="number"
                value={draft.displayOrder}
                onChange={(e) => set("displayOrder", Number(e.target.value))}
                className="w-full rounded-input border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </Field>
          </div>
          <Field label="لمن هذا الروتين (افصلي بفاصلة)">
            <input
              value={draft.forWhom.join("، ")}
              onChange={(e) =>
                set("forWhom", e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean))
              }
              className="w-full rounded-input border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </Field>
          <Field label="النتائج المتوقعة (افصلي بفاصلة)">
            <input
              value={draft.expectedResults.join("، ")}
              onChange={(e) =>
                set("expectedResults", e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean))
              }
              className="w-full rounded-input border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </Field>
          <Field label="لماذا اخترناه">
            <textarea
              value={draft.whyChoseIt}
              onChange={(e) => set("whyChoseIt", e.target.value)}
              rows={3}
              className="w-full rounded-input border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </Field>
        </div>

        {/* Products */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              المنتجات المختارة ({selectedIds.length})
            </p>
            <button
              type="button"
              onClick={buildStepsFromProducts}
              className="flex items-center gap-1.5 rounded-pill border border-primary/30 bg-primary/5 px-3.5 py-1.5 text-[11px] font-bold text-primary transition-all hover:bg-primary hover:text-white"
            >
              <Sparkles size={11} />
              أنشئ الخطوات تلقائياً
            </button>
          </div>

          {/* Selected chips */}
          <div className="flex flex-wrap gap-2">
            {selectedProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleProduct(p.id)}
                className="inline-flex items-center gap-1.5 rounded-pill border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] font-bold text-primary transition-all hover:bg-red-50 hover:border-red-300 hover:text-red-500"
              >
                <span className="relative h-5 w-5 overflow-hidden rounded-full">
                  {p.gallery[0] ? <Image src={p.gallery[0]} alt="" fill unoptimized className="object-cover" /> : null}
                </span>
                {p.name.ar}
                <X size={10} />
              </button>
            ))}
            {selectedIds.length === 0 && (
              <span className="text-xs text-muted">لم تختاري أي منتج بعد</span>
            )}
          </div>

          {/* Search products */}
          <div>
            <input
              placeholder="ابحثي عن منتج لإضافته..."
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              className="w-full rounded-input border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className="max-h-80 overflow-y-auto rounded-card border border-border">
            {filteredProducts.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 text-sm last:border-b-0 transition-colors ${
                  selectedIds.includes(p.id) ? "bg-primary/5" : "hover:bg-muted-bg/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-background">
                  {p.gallery[0] ? <Image src={p.gallery[0]} alt="" fill unoptimized className="object-cover" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-foreground">{p.name.ar}</span>
                  <span className="block text-[10px] text-muted">{p.brandAr || p.brand}</span>
                </span>
                <span className="text-xs font-bold text-foreground">{formatPrice(p.pricing.price)}</span>
              </label>
            ))}
          </div>

<p className="text-[11px] text-muted">
            تعرض هذه القائمة جميع منتجات الكتالوج. يمكنك أيضاً نسخ منتجات من روتين موجود:
          </p>
          <div className="flex flex-wrap gap-2">
            {allRoutines.slice(0, 5).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedIds((prev) => [...new Set([...prev, ...r.products])])}
                className="rounded-pill border border-border bg-background px-3 py-1.5 text-[11px] font-bold text-muted transition-all hover:border-primary/40 hover:text-primary"
              >
                + {r.nameAr}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-foreground">{label}</label>
      {children}
    </div>
  );
}
