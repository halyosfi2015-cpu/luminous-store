"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Network,
  Plus,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Pencil,
  Check,
  X,
  FolderTree,
  PackageOpen,
  Trash2,
  ShoppingBag,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { LoadingState, ErrorState } from "@/components/admin/ui/States";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import ProductOverridePicker from "@/components/admin/ProductOverridePicker";
import type { CategoryProductOverride } from "@/src/lib/content-store";
import { taxonomyIconByName } from "@/components/layout/taxonomyCategoryUi";
import type { TaxonomyNode, TaxonomyNodeType, TaxonomyStatus } from "@/src/types/taxonomy";

const ICON_NAMES = Object.keys(taxonomyIconByName);
const STATUS_OPTIONS: TaxonomyStatus[] = ["ACTIVE", "FUTURE", "HIDDEN"];
const TYPE_LABEL: Record<TaxonomyNodeType, string> = {
  ROOT: "جذر",
  CATEGORY: "فئة رئيسية",
  SUBCATEGORY: "تصنيف فرعي",
  PRODUCT_TYPE: "نوع المنتج",
};

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nodeEquals(a: TaxonomyNode, b: TaxonomyNode | undefined): boolean {
  if (!b) return false;
  return (
    a.id === b.id &&
    a.parentId === b.parentId &&
    a.slug === b.slug &&
    a.nameAr === b.nameAr &&
    a.nameEn === b.nameEn &&
    a.type === b.type &&
    a.order === b.order &&
    a.status === b.status &&
    (a.icon ?? "") === (b.icon ?? "") &&
    (a.image ?? "") === (b.image ?? "") &&
    (a.descriptionAr ?? "") === (b.descriptionAr ?? "") &&
    (a.descriptionEn ?? "") === (b.descriptionEn ?? "")
  );
}

interface NodeRowProps {
  node: TaxonomyNode;
  depth: number;
  canAddChild: boolean;
  onChange: (id: string, patch: Partial<TaxonomyNode>) => void;
  onHide: (id: string) => void;
  onAddChild: (parentId: string, type: TaxonomyNodeType) => void;
  onRemove: (id: string) => void;
  isCustom: boolean;
}

function NodeRow({
  node,
  depth,
  canAddChild,
  onChange,
  onHide,
  onAddChild,
  onRemove,
  isCustom,
}: NodeRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TaxonomyNode>(node);

  const iconEl = () => {
    const Icon = taxonomyIconByName[node.icon ?? ""] ?? taxonomyIconByName.sparkles;
    return <Icon size={14} />;
  };

  return (
    <div
      className={`rounded-xl border ${
        isCustom ? "border-primary/30 bg-primary/5" : "border-border bg-muted-bg/40"
      }`}
      style={{ marginInlineStart: depth * 20 }}
    >
      <div className="flex flex-wrap items-center gap-2 p-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {iconEl()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{node.nameAr}</p>
          <p className="truncate text-[11px] text-muted" dir="ltr">
            {node.slug} · {TYPE_LABEL[node.type]} · #{node.order}
          </p>
        </div>
        <Badge variant={node.status === "ACTIVE" ? "success" : node.status === "FUTURE" ? "warning" : "neutral"}>
          {node.status === "ACTIVE" ? "مفعل" : node.status === "FUTURE" ? "قادم" : "مخفي"}
        </Badge>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="تعديل"
            onClick={() => setEditing((v) => !v)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              editing
                ? "border-primary bg-primary text-white"
                : "border-border bg-white text-muted hover:border-primary hover:text-primary"
            }`}
          >
            {editing ? <X size={14} /> : <Pencil size={14} />}
          </button>
          {canAddChild && (
            <button
              type="button"
              title="إضافة عنصر فرعي"
              onClick={() => onAddChild(node.id, node.type === "CATEGORY" ? "SUBCATEGORY" : "PRODUCT_TYPE")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <Plus size={14} />
            </button>
          )}
          <button
            type="button"
            title="إخفاء"
            onClick={() => onHide(node.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-muted transition-colors hover:border-error hover:text-error"
          >
            <EyeOff size={14} />
          </button>
          {isCustom && (
            <button
              type="button"
              title="حذف (عنصر مخصص)"
              onClick={() => onRemove(node.id)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-error/30 bg-white text-error transition-colors hover:bg-error hover:text-white"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="grid grid-cols-1 gap-3 border-t border-border p-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label="الاسم (عربي)"
            value={draft.nameAr}
            onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })}
          />
          <Input
            label="الاسم (إنجليزي)"
            value={draft.nameEn}
            onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
          />
          <Input
            label="الرابط (slug)"
            dir="ltr"
            value={draft.slug}
            onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })}
          />
          <Select
            label="الأيقونة"
            value={draft.icon ?? "sparkles"}
            onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
          >
            {ICON_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
          <Select
            label="الحالة"
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as TaxonomyStatus })}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Input
            label="الترتيب"
            type="number"
            value={String(draft.order)}
            onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) || 0 })}
          />
          <Input
            label="الوصف (عربي)"
            value={draft.descriptionAr ?? ""}
            onChange={(e) => setDraft({ ...draft, descriptionAr: e.target.value })}
          />
          <Input
            label="الوصف (إنجليزي)"
            value={draft.descriptionEn ?? ""}
            onChange={(e) => setDraft({ ...draft, descriptionEn: e.target.value })}
          />
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (!draft.slug || !draft.nameAr) return;
                onChange(draft.id, {
                  nameAr: draft.nameAr,
                  nameEn: draft.nameEn || draft.nameAr,
                  slug: draft.slug,
                  icon: draft.icon,
                  status: draft.status,
                  order: draft.order,
                  descriptionAr: draft.descriptionAr,
                  descriptionEn: draft.descriptionEn,
                });
                setEditing(false);
              }}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-input bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary-700"
            >
              <Check size={15} />
              حفظ
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(node);
                setEditing(false);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-input border border-border bg-white px-4 text-sm font-medium text-muted transition-colors hover:text-error"
            >
              <X size={15} />
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TaxonomyAdmin() {
  const { toast } = useAdminToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [base, setBase] = useState<TaxonomyNode[]>([]);
  const [working, setWorking] = useState<TaxonomyNode[]>([]);
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<Record<string, CategoryProductOverride>>({});
  const [productsOpenFor, setProductsOpenFor] = useState<string | null>(null);

  const setCategoryOverride = useCallback((slug: string, next: CategoryProductOverride) => {
    setCategoryProducts((prev) => ({ ...prev, [slug]: next }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/content/taxonomy");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setBase(data.base ?? []);
          setWorking(data.merged ?? []);
          setHiddenSlugs(data.overrides?.hiddenSlugs ?? []);
          setCategoryProducts(data.overrides?.categoryProducts ?? {});
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retry = useCallback(() => {
    setError(false);
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  const baseById = useMemo(() => new Map(base.map((n) => [n.id, n])), [base]);

  const categories = useMemo(
    () =>
      working
        .filter((n) => n.type === "CATEGORY")
        .sort((a, b) => a.order - b.order),
    [working],
  );

  const childrenOf = useCallback(
    (parentId: string, type?: TaxonomyNodeType) =>
      working
        .filter((n) => n.parentId === parentId && (type ? n.type === type : true))
        .sort((a, b) => a.order - b.order),
    [working],
  );

  const nextOrder = (parentId: string | null) => {
    const siblings = working.filter((n) => n.parentId === parentId);
    return siblings.length > 0 ? Math.max(...siblings.map((n) => n.order)) + 1 : 1;
  };

  const createNode = (parentId: string | null, type: TaxonomyNodeType, baseSlug: string) => {
    const id = `tax-custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    let slug = slugify(baseSlug);
    if (!slug) slug = `new-${type.toLowerCase()}`;
    let n = 2;
    const taken = new Set(working.map((w) => w.slug));
    while (taken.has(slug)) {
      slug = `${slugify(baseSlug) || `new-${type.toLowerCase()}`}-${n}`;
      n++;
    }
    const node: TaxonomyNode = {
      id,
      parentId,
      slug,
      nameAr: baseSlug || slug,
      nameEn: baseSlug || slug,
      type,
      order: nextOrder(parentId),
      status: "ACTIVE",
      icon: type === "CATEGORY" ? "sparkles" : "droplets",
    };
    setWorking((prev) => [...prev, node]);
    return node;
  };

  const addCategory = () => {
    const node = createNode(null, "CATEGORY", "فئة جديدة");
    toast(`أضيفت الفئة «${node.nameAr}» — عدّلي بياناتها ثم احفظي`, "info");
  };

  const addChild = (parentId: string, type: TaxonomyNodeType) => {
    const parent = working.find((n) => n.id === parentId);
    const node = createNode(parentId, type, "عنصر جديد");
    toast(`أضيف «${node.nameAr}» تحت ${parent?.nameAr ?? "القسم"} — عدّليه ثم احفظي`, "info");
  };

  const changeNode = (id: string, patch: Partial<TaxonomyNode>) => {
    setWorking((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  const hideNode = (id: string) => {
    const node = working.find((n) => n.id === id);
    if (!node) return;
    const toHide = new Set<string>();
    const stack = [node];
    while (stack.length) {
      const cur = stack.pop()!;
      toHide.add(cur.slug);
      stack.push(...working.filter((n) => n.parentId === cur.id));
    }
    setWorking((prev) => prev.filter((n) => !toHide.has(n.slug)));
    setHiddenSlugs((prev) => Array.from(new Set([...prev, ...toHide])));
    toast(`تم إخفاء «${node.nameAr}» وكل فروعه`, "info");
  };

  const unhide = (slug: string) => {
    setHiddenSlugs((prev) => prev.filter((s) => s !== slug));
    const baseNode = base.find((n) => n.slug === slug);
    if (baseNode) {
      setWorking((prev) => {
        if (prev.some((n) => n.id === baseNode.id)) return prev;
        return [...prev, baseNode];
      });
    }
    toast("تمت الإعادة للظهور", "success");
  };

  const removeCustom = (id: string) => {
    const node = working.find((n) => n.id === id);
    if (!node) return;
    const descendants = new Set<string>([node.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of working) {
        if (n.parentId && descendants.has(n.parentId) && !descendants.has(n.id)) {
          descendants.add(n.id);
          changed = true;
        }
      }
    }
    setWorking((prev) => prev.filter((n) => !descendants.has(n.id)));
    toast(`تم حذف «${node.nameAr}» وكل فروعه`, "success");
  };

  const save = async () => {
    setSaving(true);
    try {
      const nodes = working.filter((n) => !nodeEquals(n, baseById.get(n.id)));
      const res = await fetch("/api/admin/content/taxonomy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, hiddenSlugs, categoryProducts }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const fresh = await fetch("/api/admin/content/taxonomy");
      if (fresh.ok) {
        const data = await fresh.json();
        setBase(data.base ?? []);
        setWorking(data.merged ?? []);
        setHiddenSlugs(data.overrides?.hiddenSlugs ?? []);
        setCategoryProducts(data.overrides?.categoryProducts ?? {});
      }
      toast("تم حفظ التصنيف. سيظهر في المتجر بعد إعادة البناء (Rebuild).", "success");
    } catch {
      toast("حدث خطأ أثناء الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="جارٍ تحميل شجرة التصنيف..." />;
  if (error) {
    return (
      <ErrorState
        title="تعذر تحميل شجرة التصنيف"
        description="حدث خطأ أثناء جلب البيانات."
        onRetry={retry}
      />
    );
  }

  const customIds = new Set(working.filter((n) => n.id.startsWith("tax-custom-")).map((n) => n.id));
  const hiddenNodes = hiddenSlugs
    .map((slug) => base.find((n) => n.slug === slug))
    .filter(Boolean) as TaxonomyNode[];

  return (
    <main dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Network className="text-primary" size={20} />
            محرر تصنيف المنتجات
          </h1>
          <p className="mt-1 text-sm text-muted">
            أضيفي/عدّلي/أخفي الفئات والتصنيفات الفرعية وأنواع المنتجات — تُحفظ التغييرات بشكل دائم في ملفات التصنيف.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة تحميل
          </button>
          <button
            type="button"
            onClick={addCategory}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-white"
          >
            <Plus className="h-4 w-4" />
            فئة جديدة
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white transition-all hover:bg-primary-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-2xl font-extrabold text-foreground">{categories.length}</p>
          <p className="mt-1 text-xs font-semibold text-muted">فئة رئيسية</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-2xl font-extrabold text-foreground">{working.length}</p>
          <p className="mt-1 text-xs font-semibold text-muted">إجمالي العقد</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-2xl font-extrabold text-foreground">{hiddenSlugs.length}</p>
          <p className="mt-1 text-xs font-semibold text-muted">مخفية</p>
        </div>
      </div>

      <Card padding="md">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
          <FolderTree className="text-primary" size={18} />
          شجرة التصنيف
        </h2>
        <div className="space-y-2">
          {categories.map((cat) => {
            const subs = childrenOf(cat.id, "SUBCATEGORY");
            const customCat = customIds.has(cat.id);
            return (
              <div key={cat.id} className="space-y-1.5">
                <NodeRow
                  node={cat}
                  depth={0}
                  canAddChild
                  onChange={changeNode}
                  onHide={hideNode}
                  onAddChild={addChild}
                  onRemove={removeCustom}
                  isCustom={customCat}
                />
                <button
                  type="button"
                  onClick={() => setProductsOpenFor((prev) => (prev === cat.slug ? null : cat.slug))}
                  aria-expanded={productsOpenFor === cat.slug}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-primary hover:text-primary"
                >
                  <ShoppingBag size={13} />
                  {productsOpenFor === cat.slug ? "إغلاق تحكم المنتجات" : `منتجات ${cat.nameAr}`}
                </button>
                {productsOpenFor === cat.slug && (
                  <ProductOverridePicker
                    label={`قسم ${cat.nameAr} في الصفحة الرئيسية`}
                    override={categoryProducts[cat.slug]}
                    onChange={(next) => setCategoryOverride(cat.slug, next)}
                  />
                )}
                {subs.map((sub) => {
                  const pts = childrenOf(sub.id, "PRODUCT_TYPE");
                  return (
                    <div key={sub.id} className="space-y-1.5">
                      <NodeRow
                        node={sub}
                        depth={1}
                        canAddChild
                        onChange={changeNode}
                        onHide={hideNode}
                        onAddChild={addChild}
                        onRemove={removeCustom}
                        isCustom={customIds.has(sub.id)}
                      />
                      {pts.map((pt) => (
                        <NodeRow
                          key={pt.id}
                          node={pt}
                          depth={2}
                          canAddChild={false}
                          onChange={changeNode}
                          onHide={hideNode}
                          onAddChild={addChild}
                          onRemove={removeCustom}
                          isCustom={customIds.has(pt.id)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Card>

      <Card padding="md">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
          <Eye className="text-primary" size={18} />
          العناصر المخفية ({hiddenNodes.length})
        </h2>
        {hiddenNodes.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">لا توجد عناصر مخفية.</p>
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {hiddenNodes.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted-bg/40 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{n.nameAr}</p>
                  <p className="truncate text-[11px] text-muted" dir="ltr">{n.slug}</p>
                </div>
                <button
                  type="button"
                  onClick={() => unhide(n.slug)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-white"
                >
                  <Eye size={13} />
                  إظهار
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted-bg/40 p-4 text-sm text-muted">
        <PackageOpen className="h-4 w-4 shrink-0 text-primary" />
        ملاحظة: لتظهر التغييرات في المتجر (القائمة والفئات والرئيسية) يجب إعادة بناء المشروع بعد الحفظ كما في جلساتنا السابقة.
      </div>
    </main>
  );
}