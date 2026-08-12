"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/ui/States";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { formatPrice } from "@/lib/utils";
import {
  getProducts,
  getCategories,
  getBrands,
  getOrders,
  getCustomers,
  getArticles,
  getBanners,
} from "@/src/admin/services";
import { applyProductOverrides, removeProductLocal } from "@/src/admin/adapters/local/products";
import { applyCategoryOverrides, removeCategoryLocal } from "@/src/admin/adapters/local/categories";
import { applyBrandOverrides, removeBrandLocal } from "@/src/admin/adapters/local/brands";
import * as services from "@/src/admin/services";
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
};

const qtyOf = (product: { stock: number; stockQuantity?: number }) =>
  product.stockQuantity ?? product.stock;

function StockBadge({ qty }: { qty: number }) {
  if (qty <= 0) return <Badge variant="error">نفد المخزون</Badge>;
  if (qty <= 10) return <Badge variant="warning">{qty} متبقٍ</Badge>;
  return <Badge variant="success">متوفر</Badge>;
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
  pending: { label: "قيد الانتظار", variant: "warning" },
  confirmed: { label: "مؤكد", variant: "primary" },
  shipped: { label: "تم الشحن", variant: "accent" },
  delivered: { label: "تم التسليم", variant: "success" },
  cancelled: { label: "ملغي", variant: "error" },
};

function OrderStatusSelect({ order }: { order: Order }) {
  const { toast } = useAdminToast();

  const handleChange = (status: OrderStatus) => {
    services.changeOrderStatus(order.id, status);
    fetch(`/api/admin/orders/${order.id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast("تم تحديث حالة الطلب", "success");
      })
      .catch(() => {
        toast("حدث خطأ أثناء تحديث حالة الطلب", "error");
      });
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
  load: async () => {
    const res = await fetch("/api/admin/products");
    const base = (res.ok ? await res.json() : await getProducts()) as Product[];
    return applyProductOverrides(base);
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
      label: "المخزون",
      render: (row) => <StockBadge qty={qtyOf(row as Product)} />,
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
      key: "flags",
      label: "الحالة",
      render: (row) => {
        const p = row as Product;
        return (
          <div className="flex flex-wrap gap-1">
            {p.isFeatured ? <Badge variant="accent">مميز</Badge> : null}
            {p.isNew ? <Badge variant="primary">جديد</Badge> : null}
            {p.isBestSeller ? <Badge variant="success">الأكثر مبيعاً</Badge> : null}
          </div>
        );
      },
    },
  ],
  actions: (row, reload) => {
    const p = row as Product;
    return (
      <div className="flex items-center gap-4">
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
          onDeleted={() => {
            removeProductLocal(p.id);
            reload();
          }}
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
    const base = (res.ok ? await res.json() : await getCategories()) as CategoryInfo[];
    return applyCategoryOverrides(base);
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
          onDeleted={() => {
            removeCategoryLocal(c);
            reload();
          }}
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
    const base = (res.ok ? await res.json() : await getBrands()) as Brand[];
    return applyBrandOverrides(base);
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
          onDeleted={() => {
            removeBrandLocal(b);
            reload();
          }}
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
  load: async () => { const res = await fetch("/api/admin/orders"); return res.ok ? await res.json() : await getOrders(); },
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
          </div>
        );
      },
    },
    {
      key: "items",
      label: "عدد المنتجات",
      render: (row) => (row as Order).items.length,
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
  load: async () => { const res = await fetch("/api/admin/customers"); return res.ok ? await res.json() : await getCustomers(); },
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
  load: async () => { const res = await fetch("/api/admin/articles"); return res.ok ? await res.json() : await getArticles(); },
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
  load: async () => { const res = await fetch("/api/admin/banners"); return res.ok ? await res.json() : await getBanners(); },
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

function ResourceListView({ config, reload }: { config: ResourceConfig; reload?: () => Promise<void> }) {
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
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
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => config.searchText(row).toLowerCase().includes(q));
  }, [rows, query, config]);

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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      {filtered.length === 0 ? (
        <EmptyState title="لا توجد نتائج مطابقة" description="جرّب تغيير البحث أو الفلتر." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-muted">
                {config.columns.map((col) => (
                  <th key={col.key} className="whitespace-nowrap px-3 py-3 text-start font-semibold">
                    {col.label}
                  </th>
                ))}
                {config.actions ? (
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">الإجراءات</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={config.rowKey(row)}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted-bg/50"
                >
                  {config.columns.map((col) => (
                    <td key={col.key} className="whitespace-nowrap px-3 py-3 align-middle text-foreground">
                      {col.render(row)}
                    </td>
                  ))}
                  {config.actions ? (
                    <td className="whitespace-nowrap px-3 py-3 align-middle">
                      {config.actions(row, reloadData)}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        إجمالي {config.title}: {rows.length}
      </p>
    </Card>
  );
}

export default function ResourcePage({ resource, reload }: { resource: ResourceKey; reload?: () => Promise<void> }) {
  const config = RESOURCE_CONFIGS[resource];
  return <ResourceListView config={config} reload={reload} />;
}
