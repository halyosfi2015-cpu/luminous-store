"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, MousePointer, Package, Info } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { LoadingState, EmptyState, ErrorState } from "@/components/admin/ui/States";
import { useAdminGuard } from "@/src/admin/useAdminGuard";

type AnalyticsRange = "today" | "7d" | "30d" | "90d";

const RANGE_OPTIONS: { key: AnalyticsRange; ar: string; en: string }[] = [
  { key: "today", ar: "اليوم", en: "Today" },
  { key: "7d", ar: "7 أيام", en: "Last 7 days" },
  { key: "30d", ar: "30 يومًا", en: "Last 30 days" },
  { key: "90d", ar: "90 يومًا", en: "Last 90 days" },
];

interface RecSummary {
  total_impressions: number;
  total_clicks: number;
  ctr: number;
  conversion: number;
}

interface RecByType {
  type: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface RecResponse {
  range: string;
  summary: RecSummary;
  byType: RecByType[];
}

function formatInt(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("ar-YE") : "0";
}

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  return `${(n * 100).toFixed(1)}%`;
}

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  similar: { ar: "مشابه", en: "Similar Products" },
  complementary: { ar: "مكمل", en: "Complementary Products" },
  personalized: { ar: "شخصي", en: "Personalized Products" },
  trending: { ar: "رائج", en: "Trending" },
  category_based: { ar: "فئة", en: "Category Based" },
  routine_based: { ar: "روتين", en: "Routine Based" },
  bundle_based: { ar: "باقة", en: "Bundle Based" },
};

export default function RecommendationsCenter() {
  const { allowed } = useAdminGuard("ai");
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [data, setData] = useState<RecResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function fetchData() {
      if (controller.signal.aborted) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/ai/recommendations?range=${range}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled && !controller.signal.aborted) {
          setData(json);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled && !controller.signal.aborted) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    }

    void fetchData();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [range]);

  if (!allowed) {
    return (
      <EmptyState
        title="ليس لديك صلاحية الوصول"
        description="دورك الحالي لا يملك صلاحية عرض مركز التحكم هذا."
      />
    );
  }

  if (loading) return <LoadingState label="جارٍ تحميل بيانات التوصيات..." />;
  if (error) return <ErrorState title="خطأ في التحميل" description={error} />;
  if (!data) return <EmptyState title="لا توجد بيانات" description="لم يتم العثور على بيانات توصيات." />;

  const hasData =
    data.summary.total_impressions > 0 || data.summary.total_clicks > 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <BarChart3 size={20} className="text-primary" />
            مركز التوصيات
          </h1>
          <p className="text-xs text-muted">مراقبة أداء نظام التوصيات وفعاليتها</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setRange(opt.key)}
              type="button"
              className={`rounded-input border px-3 py-1.5 text-xs font-medium transition-colors ${
                range === opt.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted hover:bg-muted-bg"
              }`}
            >
              {opt.ar}
            </button>
          ))}
        </div>
      </div>

      {hasData ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="العرض"
              value={formatInt(data.summary.total_impressions)}
              icon={BarChart3}
              tone="primary"
            />
            <KpiCard
              label="النقرات"
              value={formatInt(data.summary.total_clicks)}
              icon={MousePointer}
              tone="secondary"
            />
            <KpiCard
              label="معدل التحويل"
              value={formatPct(data.summary.ctr)}
              icon={TrendingUp}
              tone="accent"
            />
            <KpiCard
              label="الإجرام"
              value={formatPct(data.summary.conversion)}
              icon={BarChart3}
              tone="success"
            />
          </div>

          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
              <Package size={14} className="text-muted" />
              الأنواع — {range}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border text-muted">
                  <tr>
                    <th className="py-2 text-start">النوع</th>
                    <th className="py-2 text-end">العرض</th>
                    <th className="py-2 text-end">نقرات</th>
                    <th className="py-2 text-end">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byType
                    .filter((t) => t.impressions > 0 || t.clicks > 0)
                    .sort((a, b) => b.impressions - a.impressions)
                    .map((t) => (
                      <tr key={t.type} className="border-b border-border/40">
                        <td className="py-2">
                          {TYPE_LABELS[t.type]?.ar ?? t.type}
                        </td>
                        <td className="py-2 text-end">{formatInt(t.impressions)}</td>
                        <td className="py-2 text-end">{formatInt(t.clicks)}</td>
                        <td className="py-2 text-end">{formatPct(t.ctr)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <EmptyState
            title="لا توجد بيانات توصيات بعد"
            description="ستظهر إحصاءات التوصيات عند بدء تسجيل أحداث recommendation_impression و recommendation_click."
          />
        </Card>
      )}

      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Info size={14} className="text-muted" />
          مراحل التطوير القادمة
        </h3>
        <ul className="space-y-1 text-xs text-muted">
          <li>• سيتوفر أداء كل نوع توصية (similar, complementary, personalized, trending)</li>
          <li>• تحويلات من توصية إلى إضافة للسلة وشراء</li>
          <li>• تحسين الخوارزميات بناءً على الفعالية</li>
          <li>• اختبار A/B لخوارزميات التوصية المختلفة</li>
        </ul>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof BarChart3;
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
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-input ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-xs text-muted">{label}</div>
        <div className="text-base font-bold text-foreground">{value}</div>
      </div>
    </div>
  );
}
