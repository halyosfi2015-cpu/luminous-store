"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, RefreshCcw, Search, Shield, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/ui/States";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

type SegmentKey =
  | "new_customer"
  | "returning_customer"
  | "cart_abandoner"
  | "category_interest"
  | "high_intent"
  | "high_value"
  | "at_risk"
  | "inactive";

type IntentLevel = "low" | "medium" | "high" | "very_high";

type CustomerProfile = {
  customer_id: string;
  first_seen: string | null;
  last_active_at: string | null;
  total_sessions: number;
  total_page_views: number;
  total_product_views: number;
  total_cart_additions: number;
  total_orders: number;
  total_spent: number;
  average_order_value: number;
  last_purchase_at: string | null;
  lifecycle_state: string;
  top_products: Array<{ product_id: string; units: number; spend: number }>;
  top_categories: Array<{ category_id: string; views: number }>;
  repeat_purchase_rate: number;
};

type SegmentEvaluation = {
  customer_id: string;
  segments: SegmentKey[];
  reasons: Record<SegmentKey, string>;
  rules_version: string;
};

type IntentEvaluation = {
  customer_id: string | null;
  score: number;
  level: IntentLevel;
  signals: Record<string, number>;
  contributors: Array<{ signal: string; weight: number; count: number; contribution: number }>;
  rules_version: string;
  evaluated_at: string;
};

type RFMScore = {
  recency: number;
  frequency: number;
  monetary: number;
  segment: string;
  segmentAr: string;
  explanation: string;
};

type CustomerValue = {
  totalSpend: number;
  orderCount: number;
  averageOrderValue: number;
  purchaseFrequency: number;
  recencyDays: number;
  valueTier: "vip" | "high" | "medium" | "low";
  valueTierAr: string;
  explanation: string;
};

type RetentionAlert = {
  type: string;
  priority: "high" | "medium" | "low";
  reason: string;
  reasonAr: string;
  evidence: string;
  recommendedAction: string;
  recommendedActionAr: string;
};

type CustomerOpportunity = {
  type: string;
  priority: "high" | "medium" | "low";
  explanationAr: string;
  evidence: string;
  recommendedActionAr: string;
};

type CustomerIntelligence = {
  profile: CustomerProfile;
  segments: SegmentEvaluation;
  intent: IntentEvaluation;
  intelligence: {
    rfm: RFMScore;
    value: CustomerValue;
    retention: RetentionAlert[];
    opportunities: CustomerOpportunity[];
    summary: {
      segmentAr: string;
      valueAr: string;
      riskLevel: "low" | "medium" | "high";
      riskLevelAr: string;
      nextActionAr: string;
    };
  } | null;
};

type Overview = {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  vipCustomers: number;
  atRiskCustomers: number;
  inactiveCustomers: number;
  totalRevenue: number;
  averageOrderValue: number;
  segmentDistribution: Array<{ segment: string; segmentAr: string; count: number; percentage: number }>;
};

const SEGMENT_LABELS: Record<SegmentKey, { ar: string; en: string }> = {
  new_customer: { ar: "عميل جديد", en: "New" },
  returning_customer: { ar: "عميل عائد", en: "Returning" },
  cart_abandoner: { ar: "متروك السلة", en: "Abandoner" },
  category_interest: { ar: "مهتم بفئة", en: "Category" },
  high_intent: { ar: "نيّة عالية", en: "High Intent" },
  high_value: { ar: "قيمة عالية", en: "High Value" },
  at_risk: { ar: "معرّض للخطر", en: "At Risk" },
  inactive: { ar: "غير نشط", en: "Inactive" },
};

const LIFECYCLE_LABELS: Record<string, { ar: string; variant: "neutral" | "primary" | "success" | "warning" | "error" }> = {
  new: { ar: "جديد", variant: "primary" },
  active: { ar: "نشط", variant: "primary" },
  returning: { ar: "عائد", variant: "success" },
  high_value: { ar: "قيمة عالية", variant: "success" },
  at_risk: { ar: "معرّض للخطر", variant: "warning" },
  inactive: { ar: "غير نشط", variant: "neutral" },
};

const INTENT_TONE: Record<IntentLevel, "neutral" | "warning" | "primary" | "success"> = {
  low: "neutral",
  medium: "warning",
  high: "primary",
  very_high: "success",
};

const INTENT_AR: Record<IntentLevel, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "مرتفع",
  very_high: "مرتفع جدًا",
};

const VALUE_TONE: Record<string, "success" | "primary" | "warning" | "neutral"> = {
  vip: "success",
  high: "primary",
  medium: "warning",
  low: "neutral",
};

const RISK_TONE: Record<string, "error" | "warning" | "neutral"> = {
  high: "error",
  medium: "warning",
  low: "neutral",
};

const PRIORITY_TONE: Record<string, "error" | "warning" | "primary"> = {
  high: "error",
  medium: "warning",
  low: "primary",
};

function formatInt(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("ar-YE") : "0";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ar-YE");
  } catch {
    return "—";
  }
}

function getLifecycle(label: string): { ar: string; variant: "neutral" | "primary" | "success" | "warning" | "error" } {
  return LIFECYCLE_LABELS[label] ?? { ar: label, variant: "neutral" };
}

export default function CustomerIntelligenceAdmin() {
  const [items, setItems] = useState<CustomerIntelligence[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showOverview, setShowOverview] = useState(true);

  const fetchData = useCallback(async (): Promise<{ items: CustomerIntelligence[]; overview: Overview | null }> => {
    const [itemsRes, overviewRes] = await Promise.all([
      fetch("/api/analytics/customers?limit=100"),
      fetch("/api/analytics/customers?mode=overview"),
    ]);
    if (!itemsRes.ok) throw new Error(`HTTP ${itemsRes.status}`);
    const itemsJson = (await itemsRes.json()) as { items: CustomerIntelligence[] };
    const overviewJson = overviewRes.ok ? (await overviewRes.json()) as Overview : null;
    return { items: Array.isArray(itemsJson.items) ? itemsJson.items : [], overview: overviewJson };
  }, []);

  const applyData = useCallback(
    (promise: Promise<{ items: CustomerIntelligence[]; overview: Overview | null }>, isCurrent: () => boolean) => {
      void promise
        .then((data) => {
          if (!isCurrent()) return;
          setItems(data.items);
          if (data.overview) setOverview(data.overview);
          setError(null);
          setLoading(false);
        })
        .catch((e) => {
          if (!isCurrent()) return;
          setError((e as Error).message);
          setLoading(false);
        });
    },
    []
  );

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError(null);
    applyData(fetchData(), () => true);
  }, [fetchData, applyData]);

  useEffect(() => {
    let cancelled = false;
    applyData(fetchData(), () => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchData, applyData]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState title="تعذر التحميل" description={error} />;

  const filtered = items.filter((it) => {
    if (!search.trim()) return true;
    return it.profile.customer_id.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Brain size={20} className="text-primary" />
            ذكاء العملاء
          </h1>
          <p className="text-xs text-muted">تحليل RFM + قيمة العميل + الاحتفاظ + الفرص — بيانات حقيقية من Supabase</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOverview(!showOverview)}
            className="flex items-center gap-1.5 rounded-input border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted hover:bg-muted-bg"
            type="button"
          >
            {showOverview ? "إخفاء الملخص" : "عرض الملخص"}
          </button>
          <div className="relative">
            <Search size={14} className="absolute end-2 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالمعرّف…"
              className="h-8 rounded-input border border-border bg-card pe-7 ps-2 text-xs"
            />
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 rounded-input border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted hover:bg-muted-bg"
            type="button"
          >
            <RefreshCcw size={12} />
            تحديث
          </button>
        </div>
      </div>

      {/* Overview Dashboard */}
      {showOverview && overview && overview.totalCustomers === 0 && (
        <Card>
          <div className="text-sm font-bold text-foreground">ملخص ذكاء العملاء</div>
          <p className="mt-2 text-xs text-muted">
            بيانات غير كافية — لا يوجد عملاء أو طلبات بعد في قاعدة البيانات، لذلك لا يمكن
            إنتاج تحليلات موثوقة (شرائح، قيمة، احتفاظ).
          </p>
        </Card>
      )}
      {showOverview && overview && overview.totalCustomers > 0 && (
        <Card>
          <div className="mb-3 text-sm font-bold text-foreground">ملخص ذكاء العملاء</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="إجمالي العملاء" value={formatInt(overview.totalCustomers)} />
            <Stat label="الإيرادات" value={`${formatInt(overview.totalRevenue)} ر.ي`} />
            <Stat label="متوسط الطلب" value={`${formatInt(overview.averageOrderValue)} ر.ي`} />
            <Stat label="عملاء VIP" value={formatInt(overview.vipCustomers)} />
            <Stat label="جديد" value={formatInt(overview.newCustomers)} />
            <Stat label="عائد" value={formatInt(overview.returningCustomers)} />
            <Stat label="معرّض للخطر" value={formatInt(overview.atRiskCustomers)} />
            <Stat label="غير نشط" value={formatInt(overview.inactiveCustomers)} />
          </div>
          {overview.segmentDistribution.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] font-medium text-muted mb-1">توزيع الشرائح</div>
              <div className="flex flex-wrap gap-1">
                {overview.segmentDistribution.map((s) => (
                  <Badge key={s.segment} variant="primary">
                    {s.segmentAr}: {s.count} ({s.percentage}%)
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="لا توجد بيانات ذكاء عملاء بعد"
            description="ستظهر شرائح العملاء ونيّة الشراء وتحليل RFM بمجرد تسجيل الأحداث والطلبات."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((it) => (
            <CustomerCard key={it.profile.customer_id} data={it} />
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerCard({ data }: { data: CustomerIntelligence }) {
  const { profile, segments, intent, intelligence } = data;
  const lifecycle = getLifecycle(profile.lifecycle_state);
  const rfm = intelligence?.rfm;
  const value = intelligence?.value;
  const retention = intelligence?.retention ?? [];
  const opportunities = intelligence?.opportunities ?? [];
  const summary = intelligence?.summary;

  return (
    <Card>
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[10px] text-muted">{profile.customer_id.slice(0, 8)}…</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant={lifecycle.variant}>{lifecycle.ar}</Badge>
            {segments.segments.map((s) => (
              <Badge key={s} variant="primary">
                {SEGMENT_LABELS[s]?.ar ?? s}
              </Badge>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-end">
          <div className="text-[10px] text-muted">نيّة الشراء</div>
          <Badge variant={INTENT_TONE[intent.level]}>{INTENT_AR[intent.level]}</Badge>
          <div className="mt-1 text-[10px] text-muted">درجة: {intent.score}</div>
        </div>
      </div>

      {/* Core Stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="الجلسات" value={formatInt(profile.total_sessions)} />
        <Stat label="مشاهدات" value={formatInt(profile.total_product_views)} />
        <Stat label="إضافة للسلة" value={formatInt(profile.total_cart_additions)} />
        <Stat label="الطلبات" value={formatInt(profile.total_orders)} />
        <Stat label="الإنفاق" value={`${formatInt(profile.total_spent)} ر.ي`} />
        <Stat label="متوسط الطلب" value={`${formatInt(profile.average_order_value)} ر.ي`} />
      </div>

      {/* RFM + Value */}
      {rfm && value && (
        <div className="mt-3 rounded-input border border-border bg-muted-bg/30 p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-foreground">
            <Shield size={12} className="text-primary" />
            تحليل RFM + القيمة
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div>
              <div className="text-muted">الحداثة</div>
              <div className="font-bold text-foreground">{rfm.recency}/5</div>
            </div>
            <div>
              <div className="text-muted">التكرار</div>
              <div className="font-bold text-foreground">{rfm.frequency}/5</div>
            </div>
            <div>
              <div className="text-muted">القيمة</div>
              <div className="font-bold text-foreground">{rfm.monetary}/5</div>
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Badge variant="primary">{rfm.segmentAr}</Badge>
            <Badge variant={VALUE_TONE[value.valueTier] ?? "neutral"}>{value.valueTierAr}</Badge>
          </div>
          <div className="mt-1 text-[10px] text-muted">{rfm.explanation}</div>
        </div>
      )}

      {/* Risk Summary */}
      {summary && (
        <div className="mt-2 rounded-input border border-border bg-muted-bg/30 p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-foreground">
            <TrendingUp size={12} className="text-primary" />
            ملخص: {summary.segmentAr} — {summary.valueAr}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge variant={RISK_TONE[summary.riskLevel] ?? "neutral"}>
              المخاطر: {summary.riskLevelAr}
            </Badge>
            <Badge variant="primary">{summary.nextActionAr}</Badge>
          </div>
        </div>
      )}

      {/* Retention Alerts */}
      {retention.length > 0 && (
        <div className="mt-2 rounded-input border border-warning/20 bg-warning/5 p-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium text-foreground">
            <AlertTriangle size={12} className="text-warning" />
            تنبيهات الاحتفاظ ({retention.length})
          </div>
          {retention.map((alert, i) => (
            <div key={i} className="mt-1 text-[10px]">
              <Badge variant={PRIORITY_TONE[alert.priority] ?? "neutral"}>
                {alert.priority === "high" ? "عالي" : alert.priority === "medium" ? "متوسط" : "منخفض"}
              </Badge>{" "}
              {alert.reasonAr}
              <div className="text-muted">{alert.evidence}</div>
              <div className="text-primary">{alert.recommendedActionAr}</div>
            </div>
          ))}
        </div>
      )}

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <div className="mt-2 rounded-input border border-success/20 bg-success/5 p-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium text-foreground">
            <Target size={12} className="text-success" />
            فرص ({opportunities.length})
          </div>
          {opportunities.map((opp, i) => (
            <div key={i} className="mt-1 text-[10px]">
              <Badge variant={PRIORITY_TONE[opp.priority] ?? "neutral"}>
                {opp.type === "retention" ? "احتفاظ" : opp.type === "cross_sell" ? "بيع مشترك" : opp.type === "loyalty" ? "ولاء" : opp.type === "upsell" ? "زيادة قيمة" : opp.type}
              </Badge>{" "}
              {opp.explanationAr}
              <div className="text-primary">{opp.recommendedActionAr}</div>
            </div>
          ))}
        </div>
      )}

      {/* Top Products */}
      {profile.top_products.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-medium text-muted mb-1">المنتجات الأكثر شراءً</div>
          <div className="space-y-1">
            {profile.top_products.slice(0, 3).map((p, i) => (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <span className="font-mono text-muted">{p.product_id.slice(0, 6)}…</span>
                <span className="text-foreground">{formatInt(p.units)} وحدة / {formatInt(p.spend)} ر.ي</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Categories */}
      {profile.top_categories.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] font-medium text-muted mb-1">أهم الفئات</div>
          <div className="flex flex-wrap gap-1">
            {profile.top_categories.slice(0, 3).map((c, i) => (
              <span key={i} className="text-[10px] text-muted">
                {c.category_id} ({formatInt(c.views)})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Repeat Purchase Rate */}
      {profile.total_orders > 0 && (
        <div className="mt-2 text-[10px] text-muted">
          معدل إعادة الشراء: {profile.repeat_purchase_rate}%
        </div>
      )}

      {/* Dates */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted">
        <div>
          <div className="text-muted">أول ظهور</div>
          <div className="font-bold text-foreground">{formatDate(profile.first_seen)}</div>
        </div>
        <div>
          <div className="text-muted">آخر نشاط</div>
          <div className="font-bold text-foreground">{formatDate(profile.last_active_at)}</div>
        </div>
        <div>
          <div className="text-muted">آخر شراء</div>
          <div className="font-bold text-foreground">{formatDate(profile.last_purchase_at)}</div>
        </div>
        <div>
          <div className="text-muted">قواعد</div>
          <div className="font-mono text-foreground">{intent.rules_version}</div>
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-input border border-border bg-muted-bg/40 p-2">
      <div className="text-[10px] text-muted">{label}</div>
      <div className="text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}
