"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Eye,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  TriangleAlert,
  BarChart3,
  ArrowDown,
} from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/ui/States";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

type AnalyticsRange = "today" | "7d" | "30d" | "90d";

type Overview = {
  range: AnalyticsRange;
  visitors: number;
  sessions: number;
  product_views: number;
  add_to_cart: number;
  checkout_started: number;
  purchases: number;
  revenue: number;
  conversion_rate: number;
  cart_abandonment_rate: number;
  checkout_abandonment_rate: number;
};

type Funnel = {
  range: AnalyticsRange;
  stages: { key: string; label_en: string; label_ar: string; count: number }[];
};

type TopProduct = {
  product_id: string;
  views: number;
  add_to_cart: number;
  purchases: number;
  revenue: number;
};

type TopCategory = {
  category_id: string;
  views: number;
  add_to_cart: number;
  purchases: number;
  revenue: number;
};

type SegmentDistribution = {
  total_customers: number;
  distribution: Record<string, number>;
};

type IntentDistribution = {
  total_evaluated: number;
  distribution: Record<string, number>;
};

const RANGE_OPTIONS: { key: AnalyticsRange; ar: string; en: string }[] = [
  { key: "today", ar: "اليوم", en: "Today" },
  { key: "7d", ar: "7 أيام", en: "Last 7 days" },
  { key: "30d", ar: "30 يومًا", en: "Last 30 days" },
  { key: "90d", ar: "90 يومًا", en: "Last 90 days" },
];

const SEGMENT_LABELS: Record<string, { ar: string; en: string }> = {
  new_customer: { ar: "عميل جديد", en: "New" },
  returning_customer: { ar: "عميل عائد", en: "Returning" },
  cart_abandoner: { ar: "متروك السلة", en: "Cart Abandoner" },
  category_interest: { ar: "مهتم بفئة", en: "Category Interest" },
  high_intent: { ar: "نيّة شراء عالية", en: "High Intent" },
  high_value: { ar: "قيمة عالية", en: "High Value" },
  at_risk: { ar: "معرّض للخطر", en: "At Risk" },
  inactive: { ar: "غير نشط", en: "Inactive" },
};

const INTENT_LABELS: Record<string, { ar: string; en: string }> = {
  low: { ar: "منخفض", en: "Low" },
  medium: { ar: "متوسط", en: "Medium" },
  high: { ar: "مرتفع", en: "High" },
  very_high: { ar: "مرتفع جدًا", en: "Very High" },
};

const SEGMENT_ORDER = [
  "new_customer",
  "returning_customer",
  "cart_abandoner",
  "category_interest",
  "high_intent",
  "high_value",
  "at_risk",
  "inactive",
];

const INTENT_ORDER = ["low", "medium", "high", "very_high"];

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  return `${(n * 100).toFixed(1)}%`;
}

function formatInt(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("ar-YE") : "0";
}

function formatRevenue(n: number): string {
  return `${formatInt(n)} ر.ي`;
}

export default function AdminAnalytics() {
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCategories, setTopCategories] = useState<TopCategory[]>([]);
  const [segments, setSegments] = useState<SegmentDistribution | null>(null);
  const [intent, setIntent] = useState<IntentDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const qs = `?range=${range}`;
    const [ov, fn, tp, tc, sg, it] = await Promise.all([
      fetch(`/api/analytics/overview${qs}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/analytics/funnel${qs}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/analytics/top-products${qs}&limit=10`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/analytics/top-categories${qs}&limit=10`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/analytics/segments`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/analytics/intent`).then((r) => (r.ok ? r.json() : null)),
    ]);
    return { ov, fn, tp, tc, sg, it } as const;
  }, [range]);

  const handleRangeChange = useCallback((r: AnalyticsRange) => {
    setLoading(true);
    setError(null);
    setRange(r);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAll()
      .then(({ ov, fn, tp, tc, sg, it }) => {
        if (cancelled) return;
        if (!ov) {
          setError("تعذر تحميل بيانات التحليلات");
          setLoading(false);
          return;
        }
        setOverview(ov);
        setFunnel(fn);
        setTopProducts(Array.isArray(tp) ? tp : []);
        setTopCategories(Array.isArray(tc) ? tc : []);
        setSegments(sg);
        setIntent(it);
        setError(null);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as Error).message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchAll]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState title="تعذر التحميل" description={error} />;
  if (!overview) return <EmptyState title="لا توجد بيانات" description="لم يتم تسجيل أي أحداث تحليلية بعد." />;

  const emptyAnalytics =
    overview.visitors === 0 &&
    overview.product_views === 0 &&
    overview.add_to_cart === 0 &&
    overview.purchases === 0;

  if (emptyAnalytics) {
    return (
      <div className="space-y-6" dir="rtl">
        <Header range={range} onRangeChange={handleRangeChange} />
        <Card>
          <EmptyState
            title="لا توجد بيانات تحليلية بعد"
            description="ستظهر التحليلات هنا بمجرد أن يبدأ الزوار بالتفاعل مع المتجر. هذا طبيعي للمتاجر الجديدة."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Header range={range} onRangeChange={handleRangeChange} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="الزوار" value={formatInt(overview.visitors)} icon={Users} tone="primary" />
        <Kpi label="مشاهدات المنتجات" value={formatInt(overview.product_views)} icon={Eye} tone="secondary" />
        <Kpi label="إضافة للسلة" value={formatInt(overview.add_to_cart)} icon={ShoppingCart} tone="accent" />
        <Kpi label="بدء الدفع" value={formatInt(overview.checkout_started)} icon={CreditCard} tone="warning" />
        <Kpi label="الشراء" value={formatInt(overview.purchases)} icon={TrendingUp} tone="success" />
        <Kpi label="الإيرادات" value={formatRevenue(overview.revenue)} icon={BarChart3} tone="success" />
        <Kpi label="معدل التحويل" value={formatPct(overview.conversion_rate)} icon={TrendingUp} tone="primary" />
        <Kpi
          label="نسبة ترك السلة"
          value={formatPct(overview.cart_abandonment_rate)}
          icon={TriangleAlert}
          tone="warning"
        />
      </div>

      {funnel && <FunnelCard funnel={funnel} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopProductsCard rows={topProducts} />
        <TopCategoriesCard rows={topCategories} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SegmentsCard data={segments} />
        <IntentCard data={intent} />
      </div>
    </div>
  );
}

function Header({
  range,
  onRangeChange,
}: {
  range: AnalyticsRange;
  onRangeChange: (r: AnalyticsRange) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <BarChart3 size={20} className="text-primary" />
          التحليلات
        </h1>
        <p className="text-xs text-muted">رصد سلوك التجارة الإلكترونية من بيانات حقيقية</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onRangeChange(opt.key)}
            className={`rounded-input border px-3 py-1.5 text-xs font-medium transition-colors ${
              range === opt.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted hover:bg-muted-bg"
            }`}
            type="button"
          >
            {opt.ar}
          </button>
        ))}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  tone: "primary" | "secondary" | "accent" | "success" | "warning";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary-600",
    accent: "bg-accent/10 text-accent-700",
    success: "bg-success-soft text-success-fg",
    warning: "bg-warning-soft text-warning-fg",
  };
  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-card p-3 shadow-card">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-input ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-xs text-muted">{label}</div>
        <div className="text-base font-bold text-foreground">{value}</div>
      </div>
    </div>
  );
}

function FunnelCard({ funnel }: { funnel: Funnel }) {
  const max = Math.max(1, ...funnel.stages.map((s) => s.count));
  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <ArrowDown size={16} className="text-primary" />
        مسار التحويل
      </h3>
      <div className="space-y-3">
        {funnel.stages.map((stage, idx) => {
          const width = Math.max(2, Math.round((stage.count / max) * 100));
          return (
            <div key={stage.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted">{stage.label_ar}</span>
                <span className="font-bold text-foreground">{formatInt(stage.count)}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted-bg">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${width}%` }}
                />
              </div>
              {idx > 0 && funnel.stages[idx - 1].count > 0 && (
                <div className="mt-1 text-[10px] text-muted">
                  {formatPct(stage.count / funnel.stages[idx - 1].count)} من المرحلة السابقة
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TopProductsCard({ rows }: { rows: TopProduct[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-bold text-foreground">أفضل المنتجات</h3>
        <EmptyState title="لا توجد بيانات" description="ستظهر المنتجات الأكثر مشاهدة عند تسجيل أحداث المشاهدة." />
      </Card>
    );
  }
  return (
    <Card>
      <h3 className="mb-3 text-sm font-bold text-foreground">أفضل المنتجات (مشاهدات)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="py-2 text-start">المنتج</th>
              <th className="py-2 text-end">مشاهدات</th>
              <th className="py-2 text-end">إضافة للسلة</th>
              <th className="py-2 text-end">شراء</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.product_id} className="border-b border-border/40">
                <td className="py-2 font-mono text-[10px] text-muted">{row.product_id.slice(0, 8)}…</td>
                <td className="py-2 text-end font-bold">{formatInt(row.views)}</td>
                <td className="py-2 text-end">{formatInt(row.add_to_cart)}</td>
                <td className="py-2 text-end">{formatInt(row.purchases)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TopCategoriesCard({ rows }: { rows: TopCategory[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-bold text-foreground">أفضل الفئات</h3>
        <EmptyState title="لا توجد بيانات" description="ستظهر الفئات الأكثر شعبية عند تسجيل أحداث التصفح." />
      </Card>
    );
  }
  return (
    <Card>
      <h3 className="mb-3 text-sm font-bold text-foreground">أفضل الفئات</h3>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.category_id} className="flex items-center justify-between text-xs">
            <span className="font-mono text-[10px] text-muted">{row.category_id.slice(0, 8)}…</span>
            <span className="font-bold text-foreground">{formatInt(row.views)} مشاهدة</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SegmentsCard({ data }: { data: SegmentDistribution | null }) {
  if (!data || data.total_customers === 0) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-bold text-foreground">شرائح العملاء</h3>
        <EmptyState title="لا يوجد عملاء بعد" description="ستظهر شرائح العملاء عند تسجيل أول عملية شراء أو نشاط." />
      </Card>
    );
  }
  return (
    <Card>
      <h3 className="mb-3 text-sm font-bold text-foreground">شرائح العملاء</h3>
      <div className="space-y-2">
        {SEGMENT_ORDER.map((key) => {
          const count = data.distribution[key] ?? 0;
          return (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-muted">{SEGMENT_LABELS[key]?.ar ?? key}</span>
              <Badge variant={count > 0 ? "primary" : "neutral"}>{formatInt(count)}</Badge>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-muted">
        من إجمالي {formatInt(data.total_customers)} عميل — القواعد محدّثة في طبقة `lib/analytics/segments.ts`
      </p>
    </Card>
  );
}

function IntentCard({ data }: { data: IntentDistribution | null }) {
  if (!data || data.total_evaluated === 0) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-bold text-foreground">توزيع نيّة الشراء</h3>
        <EmptyState title="لا يوجد عملاء" description="سيتم احتساب نيّة الشراء عند تسجيل الأحداث السلوكية." />
      </Card>
    );
  }
  return (
    <Card>
      <h3 className="mb-3 text-sm font-bold text-foreground">توزيع نيّة الشراء</h3>
      <div className="space-y-2">
        {INTENT_ORDER.map((key) => {
          const count = data.distribution[key] ?? 0;
          return (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-muted">{INTENT_LABELS[key]?.ar ?? key}</span>
              <Badge variant={count > 0 ? "primary" : "neutral"}>{formatInt(count)}</Badge>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-muted">
        أوزان وقواعد محدّدة وقابلة للتفسير في `lib/analytics/intent.ts`
      </p>
    </Card>
  );
}
