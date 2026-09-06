"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Star,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  PackageX,
  Tags,
  Boxes,
  Repeat,
  Gift,
  Stethoscope,
  Newspaper,
  ShoppingCart,
  Users,
  Receipt,
  TicketPercent,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { useAdminData } from "@/src/admin/AdminDataProvider";
import { LoadingState, ErrorState } from "@/components/admin/ui/States";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import DashboardOrdersChart from "@/components/admin/DashboardOrdersChart";
import type { AdminCoupon, AdminCustomer, AdminReview, AdminStats } from "@/src/admin/types";
import type { Product } from "@/src/types/product";
import type { Order } from "@/types/cart";

const qtyOf = (product: { stock: number; stockQuantity?: number }) =>
  product.stockQuantity ?? product.stock;

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const record = value as { data?: unknown; items?: unknown };
    if (Array.isArray(record.data)) return record.data as T[];
    if (Array.isArray(record.items)) return record.items as T[];
  }
  return [];
}

const iconTone: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary-600",
  accent: "bg-accent/10 text-accent-700",
  success: "bg-success-soft text-success-fg",
  warning: "bg-warning-soft text-warning-fg",
  error: "bg-error-soft text-error-fg",
};

const quickActions = [
  { label: "كل المنتجات", href: "/admin/products" },
  { label: "إضافة منتج", href: "/admin/products/new" },
  { label: "أقسام الصفحة الرئيسية", href: "/admin/homepage" },
  { label: "العروض الأسبوعية", href: "/admin/offers" },
  { label: "القسائم والخصومات", href: "/admin/coupons" },
  { label: "التقييمات والمراجعات", href: "/admin/reviews" },
  { label: "المستخدمون والأدوار", href: "/admin/users" },
  { label: "التقارير", href: "/admin/reports" },
  { label: "تخصيص الواجهة الرئيسية", href: "/admin/hero" },
  { label: "رسوم التوصيل", href: "/admin/shipping" },
  { label: "إدارة الخبراء", href: "/admin/experts" },
  { label: "الباقات والهدايا", href: "/admin/bundles" },
  { label: "الروتينات", href: "/admin/routines" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statsRes, prodsRes, ordersRes, custRes, coupRes, revRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/products"),
          fetch("/api/admin/orders"),
          fetch("/api/admin/customers"),
          fetch("/api/admin/coupons"),
          fetch("/api/admin/reviews"),
        ]);
        if (![statsRes, prodsRes, ordersRes, custRes, coupRes, revRes].every((response) => response.ok)) {
          throw new Error("Admin data request failed");
        }
        const nextStats = await statsRes.json();
        const nextProducts = asArray<Product>(await prodsRes.json());
        const nextOrders = asArray<Order>(await ordersRes.json());
        const nextCustomers = asArray<AdminCustomer>(await custRes.json());
        const nextCoupons = asArray<AdminCoupon>(await coupRes.json());
        const nextReviews = asArray<AdminReview>(await revRes.json());

        if (cancelled) return;
        setStats(nextStats);
        setProducts(nextProducts);
        setOrders(nextOrders);
        setCustomers(nextCustomers);
        setCoupons(nextCoupons);
        setReviews(nextReviews);
        setError(false);
        setErrorMessage(null);
      } catch (caught) {
        if (!cancelled) {
          setError(true);
          setErrorMessage(caught instanceof Error ? caught.message : "Unknown dashboard loading error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const load = useCallback(() => {
    setError(false);
    setErrorMessage(null);
    setLoading(true);

    setReloadKey((key) => key + 1);
  }, []);

  if (loading) return <LoadingState label="جارٍ تحميل بيانات لوحة التحكم..." />;
  if (error || !stats) {
    return (
      <ErrorState
        title="تعذر تحميل بيانات لوحة التحكم"
        description={errorMessage ?? "حدث خطأ أثناء جلب البيانات المحلية."}
        onRetry={load}
      />
    );
  }

  const lowStockList = products
    .filter((product) => {
      const qty = qtyOf(product);
      return (product.inStock ?? qty > 0) && qty > 0 && qty <= 10;
    })
    .sort((a, b) => qtyOf(a) - qtyOf(b))
    .slice(0, 5);

  const outOfStockList = products
    .filter((product) => product.inStock === false || qtyOf(product) <= 0)
    .slice(0, 5);

  const statCards: { label: string; value: number; icon: LucideIcon; tone: string }[] = [
    { label: "إجمالي المنتجات", value: stats.productTotal, icon: Package, tone: "primary" },
    { label: "منتجات مميزة", value: stats.featuredProducts, icon: Star, tone: "accent" },
    { label: "منتجات جديدة", value: stats.newProducts, icon: Sparkles, tone: "secondary" },
    { label: "الأكثر مبيعاً", value: stats.bestSellers, icon: TrendingUp, tone: "success" },
    { label: "مخزون منخفض", value: stats.lowStock, icon: TriangleAlert, tone: "warning" },
    { label: "غير متوفر", value: stats.outOfStock, icon: PackageX, tone: "error" },
    { label: "التصنيفات", value: stats.categoryCount, icon: Tags, tone: "primary" },
    { label: "العلامات التجارية", value: stats.brandCount, icon: Boxes, tone: "secondary" },
    { label: "الروتينات", value: stats.routinesCount, icon: Repeat, tone: "primary" },
    { label: "الباقات", value: stats.bundlesCount, icon: Gift, tone: "accent" },
    { label: "الخبراء", value: stats.expertsCount, icon: Stethoscope, tone: "secondary" },
    { label: "المقالات", value: stats.articlesCount, icon: Newspaper, tone: "primary" },
  ];

  const completedOrders = orders.filter((order) => order.status !== "cancelled");
  const revenue = completedOrders.reduce((sum, order) => sum + (order.total ?? 0), 0);
  const avgOrder = completedOrders.length ? Math.round(revenue / completedOrders.length) : 0;
  const visibleReviews = reviews.filter((review) => review.status === "visible").length;
  const activeCoupons = coupons.filter((coupon) => coupon.active).length;

  const commerceCards: { label: string; value: string | number; icon: LucideIcon; tone: string }[] = [
    { label: "الطلبات", value: orders.length, icon: ShoppingCart, tone: "primary" },
    { label: "العملاء", value: customers.length, icon: Users, tone: "secondary" },
    { label: "الإيرادات", value: `${formatPrice(revenue)} ر.ي`, icon: Receipt, tone: "success" },
    { label: "متوسط الطلب", value: `${formatPrice(avgOrder)} ر.ي`, icon: TrendingUp, tone: "accent" },
    { label: "كوبونات مفعلة", value: `${activeCoupons} / ${coupons.length}`, icon: TicketPercent, tone: "secondary" },
    { label: "تقييمات ظاهرة", value: `${visibleReviews} / ${reviews.length}`, icon: Star, tone: "accent" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="mt-1 text-sm text-muted">نظرة عامة على مؤشرات المتجر الرئيسية</p>
      </div>

      <section>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">مؤشرات الطلبات والمبيعات</h2>
            <Badge variant="primary">بيانات من المصادر المتاحة</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {commerceCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="flex items-center gap-3 rounded-card border border-border bg-white p-4"
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconTone[card.tone]}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-foreground">{card.value}</p>
                    <p className="truncate text-xs text-muted">{card.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">الطلبات خلال آخر 7 أيام</h2>
            <Badge variant="neutral">{orders.length} إجمالي الطلبات</Badge>
          </div>
          <DashboardOrdersChart orders={orders} />
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} padding="sm" className="flex items-center gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconTone[card.tone]}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xl font-bold text-foreground">{card.value}</p>
                <p className="truncate text-xs text-muted">{card.label}</p>
              </div>
            </Card>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">تنبيهات المخزون</h2>
              <Badge variant="warning">{stats.lowStock + stats.outOfStock} منتج</Badge>
            </div>
            {lowStockList.length === 0 && outOfStockList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                لا توجد تنبيهات مخزون — جميع المنتجات متوفرة بمخزون كافٍ
              </p>
            ) : (
              <div className="space-y-4">
                {lowStockList.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-bold text-warning-fg">مخزون منخفض (أقل من 10)</h3>
                    <ul className="space-y-1.5">
                      {lowStockList.map((product) => (
                        <li key={product.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate text-foreground">{product.name.ar}</span>
                          <Badge variant="warning">{qtyOf(product)} قطعة</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {outOfStockList.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-bold text-error-fg">غير متوفر في المخزون</h3>
                    <ul className="space-y-1.5">
                      {outOfStockList.map((product) => (
                        <li key={product.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate text-foreground">{product.name.ar}</span>
                          <Badge variant="error">نفد</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">محرك العروض الأسبوعية</h2>
              {stats.offersEngine ? (
                <Badge variant="success">مفعل</Badge>
              ) : (
                <Badge variant="neutral">لا توجد إحصائيات بعد</Badge>
              )}
            </div>
            {stats.offersEngine ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-lg font-bold text-foreground">{stats.offersEngine.totalOffersGenerated}</p>
                  <p className="text-xs text-muted">عروض مولدة</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{stats.offersEngine.uniqueProductsOffered}</p>
                  <p className="text-xs text-muted">منتجات مفردة</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {Object.keys(stats.offersEngine.categoryCoverage ?? {}).length}
                  </p>
                  <p className="text-xs text-muted">فئات مشمولة</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {stats.offersEngine.lastGeneratedWeek ?? "—"}
                  </p>
                  <p className="text-xs text-muted">آخر أسبوع</p>
                </div>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted">
                إحصائيات محرك العروض ستظهر بعد التوليد الأول
              </p>
            )}
          </Card>
        </section>

        <section className="space-y-6">
          <Card>
            <h2 className="mb-4 text-base font-bold text-foreground">حالة الأقسام</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-muted">تخصيص الواجهة الرئيسية</span>
                {stats.heroActive ? (
                  <Badge variant="success">مخصص</Badge>
                ) : (
                  <Badge variant="neutral">افتراضي</Badge>
                )}
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted">محافظات توصيل مفعلة</span>
                <Badge variant="primary">{stats.enabledGovernorates}</Badge>
              </li>
            </ul>
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-bold text-foreground">إجراءات سريعة</h2>
            <ul className="space-y-1">
              {quickActions.map((action) => (
                <li key={action.href}>
                  <Link
                    href={action.href}
                    className="group flex items-center justify-between rounded-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                  >
                    {action.label}
                    <ArrowLeft className="h-4 w-4 text-muted transition-transform group-hover:-translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>
    </div>
  );
}