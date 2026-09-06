"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Search, Plus, Pencil, Trash2, Image as ImageIcon, ChevronDown, Check } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/ui/States";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { bumpCacheVersion } from "@/hooks/useProducts";
import ImageReplaceModal from "@/components/admin/ImageReplaceModal";
import { formatPrice } from "@/lib/utils";
import type { Product, CategoryInfo } from "@/src/types/product";
import type { Brand } from "@/src/data/brands";
import type { Order, OrderStatus } from "@/types/cart";
import type { Article } from "@/src/types/article";
import type { AdminBanner, AdminCustomer } from "@/src/admin/types";

export type ResourceKey =
  | "products"
  | "categories"
  | "brands"
  | "orders"
  | "customers"
  | "articles"
  | "banners";

type ColumnDef = {
  key: string;
  label: string;
  render: (row: unknown) => ReactNode;
};

type ResourceConfig = {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  searchPlaceholder: string;
  addHref?: string;
  load: () => Promise<unknown[]>;
  searchText: (row: unknown) => string;
  rowKey: (row: unknown) => string;
  columns: ColumnDef[];
  actions?: (row: unknown, reload: () => void) => ReactNode;
  flagFilters?: { key: string; label: string; cls: string; match: (row: unknown) => boolean }[];
};

const qtyOf = (product: { stock: number; stockQuantity?: number }) =>
  product.stockQuantity ?? product.stock;

type Availability = "hidden" | "available" | "out_of_stock";
const toAvailability = (v?: boolean | null): Availability =>
  v === true ? "available" : v === false ? "out_of_stock" : "hidden";
const AVAILABILITY_LABEL: Record<Availability, string> = {
  hidden: "إخفاء",
  available: "متوفر",
  out_of_stock: "خلصت الكمية",
};

/** Read a flag preferring the enriched display value, falling back to raw DB columns. */
const flagOf = (p: Product, key: "featured" | "isNew" | "bestSeller"): boolean => {
  const raw = p as unknown as Record<string, unknown>;
  switch (key) {
    case "featured": return Boolean(raw.isFeatured ?? p.featured ?? raw.is_featured);
    case "isNew": return Boolean(raw.isNew ?? p.new ?? raw.is_new);
    case "bestSeller": return Boolean(raw.isBestSeller ?? raw.is_best_seller);
  }
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: "نشط", cls: "border-success/40 bg-success-soft text-success-fg" },
  published: { label: "منشور", cls: "border-success/40 bg-success-soft text-success-fg" },
  draft: { label: "مسودة", cls: "border-warning/40 bg-warning-soft text-warning-fg" },
  hidden: { label: "مخفي", cls: "border-border bg-muted-bg text-muted" },
  archived: { label: "مؤرشف", cls: "border-border bg-muted-bg text-muted" },
  rejected: { label: "مرفوض", cls: "border-error/30 bg-error-soft text-error-fg" },
  retired: { label: "متوقف", cls: "border-border bg-muted-bg text-muted" },
};

/** Editable product status select (colored like badges). */
function ProductStatusCell({ product }: { product: Product }) {
  const raw = product as unknown as Record<string, unknown>;
  const [value, setValue] = useState<string>(() => String(raw.status ?? "active"));
  const [saving, setSaving] = useState(false);
  const { toast } = useAdminToast();

  const change = async (next: string) => {
    if (next === value || saving) return;
    setValue(next);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partial: true, id: product.id, status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      toast("تم تحديث الحالة", "success");
      bumpCacheVersion();
    } catch (err) {
      toast((err as Error).message || "فشل الحفظ", "error");
      setValue(String(raw.status ?? "active"));
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  const meta = STATUS_META[value] ?? STATUS_META.active;
  return (
    <select
      value={value}
      disabled={saving}
      aria-label={`حالة المنتج: ${product.name.ar}`}
      onChange={(e) => change(e.target.value)}
      className={`rounded-md border px-1 py-1 text-xs outline-none transition focus:ring-2 focus:ring-primary/20 disabled:opacity-50 ${meta.cls}`}
    >
      {Object.entries(STATUS_META).map(([k, v]) => (
        <option key={k} value={k}>{v.label}</option>
      ))}
    </select>
  );
}

const FLAG_META = [
  { key: "featured" as const, label: "مميز", on: "border-accent/40 bg-accent-soft text-accent-fg", off: "" },
  { key: "isNew" as const, label: "وصل حديثاً", on: "border-primary/40 bg-primary-soft text-primary", off: "" },
  { key: "bestSeller" as const, label: "الأكثر مبيعاً", on: "border-success/40 bg-success-soft text-success-fg", off: "" },
];

/** Flag filter definitions for the products list (same names/colors as storefront badges). */
const PRODUCT_FLAG_FILTERS = FLAG_META.map((f) => ({
  key: f.key,
  label: f.label,
  cls: f.on,
  match: (row: unknown) => flagOf(row as Product, f.key),
}));

/** Status flags (مميز / جديد / الأكثر مبيعاً) — single-column filter dropdown, toggles save via the admin API. */
function StatusFlagsCell({ product }: { product: Product }) {
  const [state, setState] = useState<Record<string, boolean>>(() => ({
    featured: flagOf(product, "featured"),
    isNew: flagOf(product, "isNew"),
    bestSeller: flagOf(product, "bestSeller"),
  }));
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useAdminToast();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open ]);

  const toggle = async (key: string) => {
    if (saving) return;
    const next = !state[key];
    setState((prev) => ({ ...prev, [key]: next }));
    setSaving(true);
    try {
      const body: Record<string, unknown> = { partial: true, id: product.id };
      if (key === "featured") body.isFeatured = next;
      else if (key === "isNew") body.isNew = next;
      else body.isBestSeller = next;
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      toast("تم الحفظ", "success");
      bumpCacheVersion();
    } catch (err) {
      toast((err as Error).message || "فشل الحفظ", "error");
      setState((prev) => ({ ...prev, [key]: !next }));
    } finally {
      setSaving(false);
    }
  };

  const activeCount = FLAG_META.filter((f) => state[f.key]).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="فلترة الشارات"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted-bg px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        الشارات
        {activeCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`h-3 w-3 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="خيارات الشارات"
          className="absolute start-0 top-full z-30 mt-1.5 w-40 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-card-hover"
        >
          {FLAG_META.map((f) => {
            const checked = Boolean(state[f.key]);
            return (
              <button
                key={f.key}
                type="button"
                role="option"
                aria-selected={checked}
                disabled={saving}
                onClick={() => toggle(f.key)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium text-foreground transition-colors hover:bg-muted-bg disabled:opacity-50"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    checked ? "border-primary bg-primary text-white" : "border-border-strong bg-card"
                  }`}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span className={`rounded-full border px-2 py-0.5 ${checked ? f.on : "border-transparent text-muted"}`}>
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Inline stock + availability controls for the products list. */
function StockAvailabilityCell({ product, reload }: { product: Product; reload: () => void }) {
  const initialQty = qtyOf(product) ?? 0;
  const [qty, setQty] = useState<string>(String(initialQty));
  const [availability, setAvailability] = useState<Availability>(() => toAvailability(product.inStock));
  const [saving, setSaving] = useState(false);
  const { toast } = useAdminToast();

  const save = async (patch: { stockQuantity?: number; inStock?: boolean | null }) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partial: true, id: product.id, ...patch }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      toast("تم الحفظ", "success");
      bumpCacheVersion();
    } catch (err) {
      toast((err as Error).message || "فشل الحفظ", "error");
      setQty(String(initialQty));
      setAvailability(toAvailability(product.inStock));
    } finally {
      setSaving(false);
    }
  };

  const commitQty = () => {
    const n = Number(qty);
    if (!Number.isInteger(n) || n < 0 || n === initialQty) {
      setQty(String(initialQty));
      return;
    }
    // Quantity and availability are independent — changing one never touches the other.
    void save({ stockQuantity: n });
  };

  const changeAvailability = (next: Availability) => {
    if (next === availability) return;
    setAvailability(next);
    void save({ inStock: next === "available" ? true : next === "out_of_stock" ? false : null });
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        value={qty}
        disabled={saving}
        aria-label={`المخزون: ${product.name.ar}`}
        onChange={(e) => setQty(e.target.value)}
        onBlur={commitQty}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="w-14 rounded-md border border-border bg-white px-1.5 py-1 text-center text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
      />
      <select
        value={availability}
        disabled={saving}
        aria-label={`حالة التوفر: ${product.name.ar}`}
        onChange={(e) => changeAvailability(e.target.value as Availability)}
        className={`rounded-md border px-1 py-1 text-xs outline-none transition focus:ring-2 focus:ring-primary/20 disabled:opacity-50 ${
          availability === "available"
            ? "border-success/30 bg-success-soft text-success-fg"
            : availability === "out_of_stock"
              ? "border-error/30 bg-error-soft text-error-fg"
              : "border-border bg-muted-bg text-muted"
        }`}
      >
        <option value="hidden">إخفاء</option>
        <option value="available">متوفر</option>
        <option value="out_of_stock">خلصت الكمية</option>
      </select>
    </div>
  );
}

function DeleteAction({
  message,
  deleteUrl,
  onDeleted,
}: {
  message: string;
  deleteUrl: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useAdminToast();

  const handleConfirm = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(deleteUrl, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast("تم الحذف بنجاح", "success");
      onDeleted();
    } catch {
      toast("حدث خطأ أثناء الحذف، حاول مرة أخرى", "error");
      setDeleting(false);
      return;
    }
    setDeleting(false);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={deleting}
        aria-busy={deleting}
        aria-label="حذف"
        className="inline-flex items-center gap-1 text-xs font-medium text-error-fg transition-colors hover:text-error disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        حذف
      </button>
      <ConfirmDialog
        open={open}
        title="تأكيد الحذف"
        message={message}
        confirmLabel="حذف"
        tone="danger"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

const ORDER_STATUS: Record<OrderStatus, { label: string; variant: "primary" | "success" | "warning" | "error" | "accent" }> = {
  pending: { label: "جديد", variant: "warning" },
  awaiting_review: { label: "بانتظار المراجعة", variant: "warning" },
  contacted: { label: "تم التواصل", variant: "primary" },
  confirmed: { label: "تم التأكيد", variant: "primary" },
  awaiting_payment: { label: "بانتظار الدفع", variant: "warning" },
  paid: { label: "مدفوع", variant: "accent" },
  processing: { label: "قيد التجهيز", variant: "accent" },
  shipped: { label: "تم الشحن", variant: "accent" },
  delivered: { label: "تم التسليم", variant: "success" },
  cancelled: { label: "ملغي", variant: "error" },
};

function OrderStatusSelect({ order }: { order: Order }) {
  const { toast } = useAdminToast();
  const [saving, setSaving] = useState(false);

  const handleChange = (status: OrderStatus) => {
    if (saving) return;
    setSaving(true);
    fetch(`/api/admin/orders/${order.id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
        }
        toast("تم تحديث حالة الطلب", "success");
      })
      .catch((err: Error) => {
        toast(err.message || "حدث خطأ أثناء تحديث حالة الطلب", "error");
      })
      .finally(() => setSaving(false));
  };

  return (
    <select
      value={order.status}
      aria-label="تغيير حالة الطلب"
      onChange={(e) => handleChange(e.target.value as OrderStatus)}
      className="text-xs border rounded px-2 py-1"
    >
      {Object.entries(ORDER_STATUS).map(([k, v]) => (
        <option key={k} value={k}>{v.label}</option>
      ))}
    </select>
  );
}

const productsConfig: ResourceConfig = {
  title: "المنتجات",
  description: "إدارة منتجات المتجر — إضافة، تعديل، حذف",
  emptyTitle: "لا توجد منتجات",
  emptyDescription: "لم يتم إضافة أي منتجات بعد.",
  searchPlaceholder: "ابحث بالاسم، SKU، العلامة...",
  addHref: "/admin/products/new",
  flagFilters: PRODUCT_FLAG_FILTERS,
  load: async () => {
    const res = await fetch("/api/admin/products");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Product[];
  },
  searchText: (row) => {
    const p = row as Product;
    return [
      p.name.ar,
      p.name.en,
      p.id,
      p.sku,
      p.brand,
      p.brandAr ?? "",
      p.category,
      p.categoryAr ?? "",
    ].join(" ");
  },
  rowKey: (row) => (row as Product).id,
  columns: [
    {
      key: "image",
      label: "الصورة",
      render: (row) => {
        const p = row as Product;
        const img = p.heroImage || p.images?.[0] || "";
        return img ? (
          <img src={img} alt="" className="h-7 w-7 rounded-md border border-border object-contain bg-muted-bg" />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted-bg text-muted">
            <ImageIcon className="h-4 w-4" />
          </div>
        );
      },
    },
    {
      key: "name",
      label: "الاسم",
      render: (row) => <span className="font-semibold text-foreground">{(row as Product).name.ar}</span>,
    },
    {
      key: "brand",
      label: "العلامة",
      render: (row) => (row as Product).brandAr ?? (row as Product).brand,
    },
    {
      key: "category",
      label: "التصنيف",
      render: (row) => (row as Product).categoryAr ?? (row as Product).category,
    },
    {
      key: "price",
      label: "السعر",
      render: (row) => {
        const p = row as Product;
        return `${formatPrice(p.pricing.price)} ر.ي`;
      },
    },
    {
      key: "stock",
      label: "المخزون / التوفر",
      render: (row) => {
        const p = row as Product;
        return <StockAvailabilityCell product={p} reload={() => {}} />;
      },
    },
    {
      key: "rating",
      label: "التقييم",
      render: (row) => {
        const p = row as Product;
        return p.rating ? `${p.rating} ★` : "—";
      },
    },
    {
      key: "status",
      label: "الحالة",
      render: (row) => <ProductStatusCell product={row as Product} />,
    },
    {
      key: "flags",
      label: "الشارات",
      render: (row) => <StatusFlagsCell product={row as Product} />,
    },
  ],
  actions: (row, reload) => {
    const p = row as Product;
    return (
      <div className="flex items-center gap-2">
        <Link
          href={`/admin/products/${p.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary-700"
        >
          <Pencil className="h-3.5 w-3.5" />
          تعديل
        </Link>
        <DeleteAction
          message={`سيتم حذف المنتج "${p.name.ar}" من المتجر.`}
          deleteUrl={`/api/admin/products/${p.id}`}
          onDeleted={() => reload()}
        />
      </div>
    );
  },
};

const categoriesConfig: ResourceConfig = {
  title: "التصنيفات",
  description: "تصنيفات المنتجات في المتجر — إضافة، تعديل، حذف",
  emptyTitle: "لا توجد تصنيفات",
  emptyDescription: "لم يتم إضافة أي تصنيفات بعد.",
  searchPlaceholder: "ابحث بالاسم أو الرابط...",
  addHref: "/admin/categories/new",
  load: async () => {
    const res = await fetch("/api/admin/categories");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as CategoryInfo[];
  },
  searchText: (row) => {
    const c = row as CategoryInfo;
    return [c.nameAr, c.name, c.slug].join(" ");
  },
  rowKey: (row) => (row as CategoryInfo).slug,
  columns: [
    {
      key: "name",
      label: "الاسم",
      render: (row) => <span className="font-semibold text-foreground">{(row as CategoryInfo).nameAr}</span>,
    },
    {
      key: "nameEn",
      label: "الاسم بالإنجليزية",
      render: (row) => (row as CategoryInfo).name,
    },
    {
      key: "slug",
      label: "الرابط",
      render: (row) => <span dir="ltr" className="text-xs text-muted">{(row as CategoryInfo).slug}</span>,
    },
    {
      key: "products",
      label: "عدد المنتجات",
      render: (row) => {
        const count = (row as CategoryInfo).productCount;
        return count == null ? "—" : count;
      },
    },
  ],
  actions: (row, reload) => {
    const c = row as CategoryInfo;
    return (
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/categories/${c.slug}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary-700"
        >
          <Pencil className="h-3.5 w-3.5" />
          تعديل
        </Link>
        <DeleteAction
          message={`سيتم إخفاء التصنيف "${c.nameAr}" من المتجر.`}
          deleteUrl={`/api/admin/categories/${c.slug}`}
          onDeleted={() => reload()}
        />
      </div>
    );
  },
};

const brandsConfig: ResourceConfig = {
  title: "العلامات التجارية",
  description: "العلامات التجارية المعتمدة في المتجر — إضافة، تعديل، حذف",
  emptyTitle: "لا توجد علامات",
  emptyDescription: "لم يتم إضافة أي علامة تجارية بعد.",
  searchPlaceholder: "ابحث باسم العلامة...",
  addHref: "/admin/brands/new",
  load: async () => {
    const res = await fetch("/api/admin/brands");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Brand[];
  },
  searchText: (row) => {
    const b = row as Brand;
    return [b.name, b.nameAr, b.origin, b.originAr ?? ""].join(" ");
  },
  rowKey: (row) => (row as Brand).id,
  columns: [
    {
      key: "name",
      label: "الاسم",
      render: (row) => <span className="font-semibold text-foreground">{(row as Brand).nameAr}</span>,
    },
    {
      key: "origin",
      label: "المنشأ",
      render: (row) => (row as Brand).originAr ?? (row as Brand).origin,
    },
    {
      key: "verified",
      label: "موثّقة",
      render: (row) =>
        (row as Brand).isVerified ? (
          <Badge variant="success">موثّقة</Badge>
        ) : (
          <Badge variant="neutral">غير موثّقة</Badge>
        ),
    },
    {
      key: "featured",
      label: "مميزة",
      render: (row) =>
        (row as Brand).featured ? <Badge variant="accent">مميزة</Badge> : "—",
    },
    {
      key: "products",
      label: "عدد المنتجات",
      render: (row) => (row as Brand).productCount,
    },
  ],
  actions: (row, reload) => {
    const b = row as Brand;
    return (
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/brands/${b.slug}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary-700"
        >
          <Pencil className="h-3.5 w-3.5" />
          تعديل
        </Link>
        <DeleteAction
          message={`سيتم إخفاء العلامة "${b.nameAr}" من المتجر.`}
          deleteUrl={`/api/admin/brands/${b.slug}`}
          onDeleted={() => reload()}
        />
      </div>
    );
  },
};

const ordersConfig: ResourceConfig = {
  title: "الطلبات",
  description: "طلبات المتجر (محفوظة محلياً في المتصفح)",
  emptyTitle: "لا توجد طلبات",
  emptyDescription: "عند إتمام العملاء لطلباتهم ستظهر هنا.",
  searchPlaceholder: "ابحث برقم الطلب أو اسم العميل...",
  load: async () => { const res = await fetch("/api/admin/orders"); if (!res.ok) throw new Error(`HTTP ${res.status}`); return await res.json(); },
  searchText: (row) => {
    const o = row as Order;
    return [o.id, o.address.fullName, o.address.city, o.address.phone].join(" ");
  },
  rowKey: (row) => (row as Order).id,
  columns: [
    {
      key: "id",
      label: "رقم الطلب",
      render: (row) => <span dir="ltr" className="font-semibold text-foreground">{(row as Order).id}</span>,
    },
    {
      key: "customer",
      label: "العميل",
      render: (row) => {
        const o = row as Order;
        return (
          <div>
            <div className="font-medium text-foreground">{o.address.fullName}</div>
            <div className="text-xs text-muted">{o.address.city}</div>
            <div dir="ltr" className="text-end text-xs text-muted">{o.address.phone}</div>
          </div>
        );
      },
    },
    {
      key: "items",
      label: "المنتجات",
      render: (row) => {
        const o = row as Order;
        return (
          <div className="max-w-[260px] space-y-0.5 text-xs">
            {o.items.map((item) => (
              <div key={item.productId} className="truncate">
                {item.kind === "bundle" ? "🎁 " : item.kind === "routine" ? "💆‍♀️ " : ""}{item.nameAr} × {item.quantity}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      key: "total",
      label: "الإجمالي",
      render: (row) => `${formatPrice((row as Order).total)} ر.ي`,
    },
    {
      key: "status",
      label: "الحالة",
      render: (row) => {
        const status = (row as Order).status;
        const meta = ORDER_STATUS[status] ?? ORDER_STATUS.pending;
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
    {
      key: "date",
      label: "التاريخ",
      render: (row) => {
        const createdAt = (row as Order).createdAt;
        return createdAt ? new Date(createdAt).toLocaleDateString("ar-YE") : "—";
      },
    },
    {
      key: "action",
      label: "الإجراءات",
      render: (row) => <OrderStatusSelect order={row as Order} />,
    },
  ],
};

const customersConfig: ResourceConfig = {
  title: "العملاء",
  description: "سجل العملاء في المتجر",
  emptyTitle: "لا يوجد عملاء",
  emptyDescription: "لم يتم تسجيل أي عملاء بعد.",
  searchPlaceholder: "ابحث بالاسم، البريد، أو الهاتف...",
  load: async () => { const res = await fetch("/api/admin/customers"); if (!res.ok) throw new Error(`HTTP ${res.status}`); return await res.json(); },
  searchText: (row) => {
    const c = row as AdminCustomer;
    return [c.name, c.email, c.phone].join(" ");
  },
  rowKey: (row) => (row as AdminCustomer).id,
  columns: [
    {
      key: "name",
      label: "الاسم",
      render: (row) => <span className="font-semibold text-foreground">{(row as AdminCustomer).name}</span>,
    },
    {
      key: "email",
      label: "البريد الإلكتروني",
      render: (row) => <span dir="ltr" className="text-xs text-muted">{(row as AdminCustomer).email}</span>,
    },
    {
      key: "phone",
      label: "الهاتف",
      render: (row) => <span dir="ltr">{(row as AdminCustomer).phone}</span>,
    },
    {
      key: "orders",
      label: "الطلبات",
      render: (row) => (row as AdminCustomer).orderCount,
    },
    {
      key: "joined",
      label: "تاريخ الانضمام",
      render: (row) => {
        const joinedAt = (row as AdminCustomer).joinedAt;
        return joinedAt ? new Date(joinedAt).toLocaleDateString("ar-YE") : "—";
      },
    },
  ],
};

const articlesConfig: ResourceConfig = {
  title: "المقالات",
  description: "مقالات المدونة والمحتوى التعليمي",
  emptyTitle: "لا توجد مقالات",
  emptyDescription: "لم يتم نشر أي مقالات بعد.",
  searchPlaceholder: "ابحث بالعنوان أو الكاتب...",
  load: async () => { const res = await fetch("/api/admin/articles"); if (!res.ok) throw new Error(`HTTP ${res.status}`); return await res.json(); },
  searchText: (row) => {
    const a = row as Article;
    return [a.titleAr, a.title, a.author, a.category, a.categoryAr ?? ""].join(" ");
  },
  rowKey: (row) => (row as Article).id,
  columns: [
    {
      key: "title",
      label: "العنوان",
      render: (row) => <span className="font-semibold text-foreground">{(row as Article).titleAr}</span>,
    },
    {
      key: "category",
      label: "التصنيف",
      render: (row) => (row as Article).categoryAr ?? (row as Article).category,
    },
    {
      key: "author",
      label: "الكاتب",
      render: (row) => (row as Article).author,
    },
    {
      key: "date",
      label: "تاريخ النشر",
      render: (row) => new Date((row as Article).publishDate).toLocaleDateString("ar-YE"),
    },
    {
      key: "readTime",
      label: "مدة القراءة",
      render: (row) => `${(row as Article).readTime} دقيقة`,
    },
  ],
};

const bannersConfig: ResourceConfig = {
  title: "البانرات",
  description: "بانرات الإعلان في الصفحة الرئيسية",
  emptyTitle: "لا توجد بانرات",
  emptyDescription: "لم تتم إضافة أي بانرات إعلانية بعد.",
  searchPlaceholder: "ابحث بالعنوان أو الموضع...",
  load: async () => { const res = await fetch("/api/admin/banners"); if (!res.ok) throw new Error(`HTTP ${res.status}`); return await res.json(); },
  searchText: (row) => {
    const b = row as AdminBanner;
    return [b.titleAr, b.titleEn, b.position].join(" ");
  },
  rowKey: (row) => (row as AdminBanner).id,
  columns: [
    {
      key: "title",
      label: "العنوان",
      render: (row) => <span className="font-semibold text-foreground">{(row as AdminBanner).titleAr}</span>,
    },
    {
      key: "titleEn",
      label: "العنوان بالإنجليزية",
      render: (row) => <span dir="ltr" className="text-xs text-muted">{(row as AdminBanner).titleEn}</span>,
    },
    {
      key: "position",
      label: "الموضع",
      render: (row) => <span dir="ltr" className="text-xs">{(row as AdminBanner).position}</span>,
    },
    {
      key: "active",
      label: "الحالة",
      render: (row) =>
        (row as AdminBanner).active ? (
          <Badge variant="success">نشط</Badge>
        ) : (
          <Badge variant="neutral">غير نشط</Badge>
        ),
    },
  ],
};

const RESOURCE_CONFIGS: Record<ResourceKey, ResourceConfig> = {
  products: productsConfig,
  categories: categoriesConfig,
  brands: brandsConfig,
  orders: ordersConfig,
  customers: customersConfig,
  articles: articlesConfig,
  banners: bannersConfig,
};

function ResourceListView({ config, headerActions, reload }: { config: ResourceConfig; headerActions?: ReactNode; reload?: () => Promise<void> }) {
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [flagSel, setFlagSel] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const reloadData = useCallback(() => {
    if (reload) {
      reload();
    }
    setReloadKey((key) => key + 1);
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await config.load();
        if (!cancelled) {
          setRows(data);
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
  }, [config, reloadKey, reloadData]);

  const filtered = useMemo(() => {
    let out = rows;
    if (flagSel.length > 0 && config.flagFilters) {
      out = out.filter((row) =>
        config.flagFilters!.some((f) => flagSel.includes(f.key) && f.match(row)),
      );
    }
    const q = query.trim().toLowerCase();
    if (!q) return out;
    return out.filter((row) => config.searchText(row).toLowerCase().includes(q));
  }, [rows, query, flagSel, config]);

  const retry = useCallback(() => {
    setError(false);
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  if (loading) return <LoadingState label={`جارٍ تحميل ${config.title}...`} />;
  if (error) {
    return (
      <ErrorState
        title="تعذر تحميل البيانات"
        description={`حدث خطأ أثناء جلب ${config.title}.`}
        onRetry={retry}
      />
    );
  }
  if (rows.length === 0) {
    return <EmptyState title={config.emptyTitle} description={config.emptyDescription} />;
  }

  return (
    <Card className="overflow-hidden" padding="sm">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">{config.title}</h1>
          <p className="mt-1 text-sm text-muted">{config.description}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={config.searchPlaceholder}
              className="w-full rounded-xl border border-border bg-white pe-3 ps-9 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-64"
            />
          </div>
          {headerActions}
          {config.addHref && (
            <Link href={config.addHref}>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                إضافة
              </Button>
            </Link>
          )}
        </div>
      </div>
      {config.flagFilters && config.flagFilters.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-muted">فلترة بالشارات:</span>
          {config.flagFilters.map((f) => {
            const active = flagSel.includes(f.key);
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setFlagSel((prev) => (prev.includes(f.key) ? prev.filter((k) => k !== f.key) : [...prev, f.key]))
                }
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                  active ? `${f.cls} ring-2 ring-primary/30` : "border-border bg-muted-bg text-muted hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            );
          })}
          {flagSel.length > 0 && (
            <button
              type="button"
              onClick={() => setFlagSel([])}
              className="text-[11px] text-primary hover:underline"
            >
              مسح
            </button>
          )}
        </div>
      )}
      {filtered.length === 0 ? (
        <EmptyState title="لا توجد نتائج مطابقة" description="جرّب تغيير البحث أو الفلتر." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-muted">
                {config.columns.map((col) => {
                  const narrow = col.key === "name" || col.key === "brand" || col.key === "category";
                  return (
                  <th key={col.key} className={`px-0.5 py-1.5 text-start font-semibold text-[11px] ${narrow ? "max-w-[110px] truncate" : "whitespace-nowrap"}`}>
                    {col.label}
                  </th>
                  );
                })}
                {config.actions ? (
                  <th className="whitespace-nowrap px-0.5 py-1.5 text-start font-semibold text-[11px]">الإجراءات</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={config.rowKey(row)}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted-bg/50"
                >
                  {config.columns.map((col) => {
                    const narrow = col.key === "name" || col.key === "brand" || col.key === "category";
                    return (
                    <td key={col.key} className={`px-0.5 py-1.5 align-middle text-foreground ${narrow ? "max-w-[110px] truncate" : "whitespace-nowrap"}`}>
                      {col.render(row)}
                    </td>
                    );
                  })}
                  {config.actions ? (
                    <td className="whitespace-nowrap px-0.5 py-1.5 align-middle">
                      {config.actions(row, reloadData)}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-1 text-xs text-muted">
        إجمالي {config.title}: {rows.length}
      </p>
    </Card>
  );
}

export default function ResourcePage({ resource, reload, extraActions, headerActions }: { resource: ResourceKey; reload?: () => Promise<void>; extraActions?: (row: unknown, reload: () => void) => ReactNode; headerActions?: ReactNode }) {
  const baseConfig = RESOURCE_CONFIGS[resource];
  const config = extraActions
    ? {
        ...baseConfig,
        actions: (row: unknown, reloadFn: () => void) => (
          <div className="flex items-center gap-3">
            {baseConfig.actions?.(row, reloadFn)}
            {extraActions(row, reloadFn)}
          </div>
        ),
      }
    : baseConfig;
  return <ResourceListView config={config} headerActions={headerActions} reload={reload} />;
}
