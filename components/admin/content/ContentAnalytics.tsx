"use client";
import { timedController } from "@/src/lib/fetch-timeout";

import { useEffect, useState } from "react";
import { BarChart3, Activity, TrendingUp, ShoppingBag, Layers, AlertTriangle } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { LoadingState, EmptyState, ErrorState } from "@/components/admin/ui/States";
import { useAdminGuard } from "@/src/admin/useAdminGuard";
import {
  type PerformanceDashboard,
  type ContentFatigueReport,
  percent,
  formatInt,
  formatYER,
} from "./content-types";

interface AnalyticsPayload {
  dashboard: PerformanceDashboard;
  fatigue: ContentFatigueReport[];
}

const FATIGUE_LABELS: Record<ContentFatigueReport["recommendation"], { ar: string; tone: string }> = {
  healthy: { ar: "صحي", tone: "success" },
  watch: { ar: "راقب", tone: "accent" },
  refresh: { ar: "حدّث", tone: "warning" },
  rest: { ar: "أرح المحتوى", tone: "error" },
};

export default function ContentAnalytics() {
  const { allowed } = useAdminGuard("content");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = timedController(15000);
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/content?action=analytics", { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as AnalyticsPayload;
        setData(json);
        setLoading(false);
      } catch (e) {
        if (!controller.signal.aborted) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => controller.abort();
  }, []);

  if (!allowed) {
    return (
      <EmptyState
        title="ليس لديك صلاحية الوصول"
        description="دورك الحالي لا يملك صلاحية عرض الأداء."
      />
    );
  }

  if (loading) return <LoadingState label="جارٍ تحميل الأداء..." />;
  if (error) return <ErrorState title="خطأ في التحميل" description={error} />;
  if (!data) return <EmptyState title="لا توجد بيانات" />;

  const totals = data.dashboard.totals;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <BarChart3 size={20} className="text-primary" />
            أداء المحتوى
          </h1>
          <p className="text-xs text-muted">
            {formatInt(data.dashboard.totalEvents)} حدث — {formatInt(data.dashboard.uniqueContent)} عنصر فريد
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "الانطباعات", value: formatInt(totals.impressions), icon: Activity },
          { label: "المشاهدات", value: formatInt(totals.views), icon: TrendingUp },
          { label: "النقرات", value: formatInt(totals.clicks), icon: BarChart3 },
          { label: "الشراء", value: formatInt(totals.purchases), icon: ShoppingBag },
          { label: "الإيراد", value: formatYER(totals.revenueYER), icon: TrendingUp },
          { label: "معدل التفاعل", value: percent(totals.engagementRate), icon: Layers },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} padding="sm" className="flex flex-col gap-1.5" hover>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted">{card.label}</span>
                <Icon size={15} className="text-muted" />
              </div>
              <div className="text-lg font-bold text-foreground">{card.value}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <TrendingUp size={14} className="text-accent" />
            الأعلى تفاعلاً
          </h3>
          {data.dashboard.topByEngagement.length === 0 ? (
            <EmptyState title="لا توجد بيانات" description="لم تسجل أي أحداث أداء بعد." />
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="py-2 text-start">المحتوى</th>
                  <th className="py-2 text-center">التفاعلات</th>
                  <th className="py-2 text-end">المعدل</th>
                </tr>
              </thead>
              <tbody>
                {data.dashboard.topByEngagement.map((row) => (
                  <tr key={row.contentId} className="border-b border-border/40">
                    <td className="py-2 truncate font-medium text-foreground">{row.contentId}</td>
                    <td className="py-2 text-center">{formatInt(row.engagements)}</td>
                    <td className="py-2 text-end">{percent(row.engagementRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <ShoppingBag size={14} className="text-accent" />
            أعلى المنتجات مبيعًا
          </h3>
          {data.dashboard.topProducts.length === 0 ? (
            <EmptyState title="لا توجد بيانات" description="لم تسجل أي عمليات شراء بعد." />
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="py-2 text-start">المنتج</th>
                  <th className="py-2 text-center">عمليات الشراء</th>
                  <th className="py-2 text-end">الإيراد</th>
                </tr>
              </thead>
              <tbody>
                {data.dashboard.topProducts.map((row) => (
                  <tr key={row.productId} className="border-b border-border/40">
                    <td className="py-2 truncate font-medium text-foreground">{row.productId}</td>
                    <td className="py-2 text-center">{formatInt(row.purchases)}</td>
                    <td className="py-2 text-end">{formatYER(row.revenueYER)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <Layers size={14} className="text-accent" />
            الأداء حسب الفئة
          </h3>
          {data.dashboard.byContentType.length === 0 ? (
            <EmptyState title="لا توجد بيانات" />
          ) : (
            <ul className="space-y-2">
              {data.dashboard.byContentType.map((row) => (
                <li key={row.categoryId ?? "none"} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[10px] text-muted">{row.categoryId ?? "بدون فئة"}</span>
                  <span className="text-[10px] text-foreground">
                    {formatInt(row.impressions)} ظهور / {formatInt(row.engagements)} تفاعل
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <AlertTriangle size={14} className="text-warning-fg" />
            إجهاد المحتوى
          </h3>
          {data.fatigue.length === 0 ? (
            <EmptyState title="لا توجد بيانات" description="لم تسجل أي أحداث أداء بعد." />
          ) : (
            <ul className="space-y-2">
              {data.fatigue.slice(0, 10).map((row) => {
                const meta = FATIGUE_LABELS[row.recommendation];
                return (
                  <li key={row.contentId} className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-medium text-foreground">{row.contentId}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted">درجة {row.fatigueScore}</span>
                      <Badge variant={meta.tone as never} className="text-[9px]">{meta.ar}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}