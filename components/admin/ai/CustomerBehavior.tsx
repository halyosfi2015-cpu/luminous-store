"use client";

import { useEffect, useState } from "react";
import { Users, BarChart3, Target, Activity } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { LoadingState, EmptyState, ErrorState } from "@/components/admin/ui/States";
import { useAdminGuard } from "@/src/admin/useAdminGuard";

interface SegmentsResponse {
  total_customers: number;
  distribution: Record<string, number>;
}

interface IntentResponse {
  total_evaluated: number;
  distribution: Record<string, number>;
}

const SEGMENT_LABELS: Record<string, { ar: string; en: string }> = {
  new_customer: { ar: "عملاء جدد", en: "New Customers" },
  returning_customer: { ar: "عملاء عائدون", en: "Returning Customers" },
  cart_abandoner: { ar: "مهربون من السلة", en: "Cart Abandoners" },
  category_interest: { ar: "مهتمون بفئات", en: "Category Interested" },
  high_intent: { ar: "نية شراء عالية", en: "High Purchase Intent" },
  high_value: { ar: "قيمة عالية", en: "High Value" },
  at_risk: { ar: "معرضون للخطر", en: "At Risk" },
  inactive: { ar: "غير نشطين", en: "Inactive" },
};

const SEGMENT_TONES: Record<string, "primary" | "secondary" | "accent" | "success" | "warning" | "error" | "neutral"> = {
  new_customer: "secondary",
  returning_customer: "secondary",
  cart_abandoner: "warning",
  category_interest: "accent",
  high_intent: "success",
  high_value: "primary",
  at_risk: "error",
  inactive: "neutral",
};

const INTENT_LABELS: Record<string, { ar: string; en: string }> = {
  low: { ar: "نية منخفضة", en: "Low Intent" },
  medium: { ar: "نية متوسطة", en: "Medium Intent" },
  high: { ar: "نية عالية", en: "High Intent" },
  very_high: { ar: "نية قوية", en: "Very High Intent" },
};

const INTENT_TONES: Record<string, "primary" | "secondary" | "accent" | "success" | "warning" | "error" | "neutral"> = {
  low: "neutral",
  medium: "secondary",
  high: "success",
  very_high: "primary",
};

interface BehaviorData {
  segments: SegmentsResponse;
  intent: IntentResponse;
}

function formatInt(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("ar-YE") : "0";
}

export default function CustomerBehavior() {
  const { allowed } = useAdminGuard("ai");
  const [data, setData] = useState<BehaviorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;

    let cancelled = false;

    async function fetchData() {
      if (cancelled) return;
      setLoading(true);
      setError(null);

      try {
        const [segRes, intentRes] = await Promise.all([
          fetch("/api/analytics/segments"),
          fetch("/api/analytics/intent"),
        ]);
        if (!segRes.ok) throw new Error(`HTTP ${segRes.status}`);
        if (!intentRes.ok) throw new Error(`HTTP ${intentRes.status}`);

        const segments: SegmentsResponse = await segRes.json();
        const intent: IntentResponse = await intentRes.json();

        if (!cancelled) {
          setData({ segments, intent });
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (!allowed) {
    return (
      <EmptyState
        title="ليس لديك صلاحية الوصول"
        description="دورك الحالي لا يملك صلاحية عرض مركز تحكم الذكاء التجاري."
      />
    );
  }

  if (loading) return <LoadingState label="جارٍ تحميل سلوك العملاء..." />;
  if (error)
    return (
      <Card>
        <ErrorState title="خطأ" description={error} />
      </Card>
    );
  if (!data) return null;

  const { segments, intent } = data;
  const totalCustomers = segments.total_customers || 0;

  const segmentEntries = Object.entries(segments.distribution ?? {}).filter(
    ([, count]) => count > 0,
  );
  segmentEntries.sort((a, b) => (b[1] as number) - (a[1] as number));

  const intentEntries = Object.entries(intent.distribution ?? {}).filter(
    ([, count]) => count > 0,
  );
  intentEntries.sort((a, b) => (b[1] as number) - (a[1] as number));

  const highIntentCount = (intent.distribution?.high ?? 0) + (intent.distribution?.very_high ?? 0);
  const highIntentPct = totalCustomers > 0 ? (highIntentCount / totalCustomers) * 100 : 0;

  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <Activity size={14} className="text-primary" />
        سلوك العملاء
      </h3>
      <p className="mb-3 text-[11px] text-muted">
        {formatInt(totalCustomers)} عميل — توزيعهم حسب الشرائح والنية
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Users size={12} className="text-muted" />
            التوزيع حسب الشريحة
          </h4>
          <div className="space-y-1.5">
            {segmentEntries.length > 0 ? (
              segmentEntries.map(([key, count]) => {
                const label = SEGMENT_LABELS[key]?.ar || key;
                const pct = totalCustomers > 0 ? ((count as number) / totalCustomers) * 100 : 0;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <Badge variant={SEGMENT_TONES[key] || "neutral"} className="text-[8px]">
                      {label}
                    </Badge>
                    <div className="h-1.5 flex-1 rounded-full bg-muted-bg">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-[10px] text-muted">{formatInt(count as number)}</span>
                    <span className="w-8 text-[10px] text-muted">{pct.toFixed(1)}%</span>
                  </div>
                );
              })
            ) : (
              <p className="text-[10px] text-muted">لا توجد بيانات شرائح</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Target size={12} className="text-muted" />
            نية الشراء
          </h4>
          <div className="space-y-1.5">
            {intentEntries.length > 0 ? (
              intentEntries.map(([key, count]) => {
                const label = INTENT_LABELS[key]?.ar || key;
                const pct = totalCustomers > 0 ? ((count as number) / totalCustomers) * 100 : 0;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <Badge variant={INTENT_TONES[key] || "neutral"} className="text-[8px]">
                      {label}
                    </Badge>
                    <div className="h-1.5 flex-1 rounded-full bg-muted-bg">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-[10px] text-muted">{formatInt(count as number)}</span>
                    <span className="w-8 text-[10px] text-muted">{pct.toFixed(1)}%</span>
                  </div>
                );
              })
            ) : (
              <p className="text-[10px] text-muted">لا توجد بيانات نية شراء</p>
            )}
          </div>
          <div className="mt-2 rounded-input border border-border bg-muted-bg/30 p-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted">عملاء بقصارى النية العالية:</span>
              <Badge variant={highIntentPct > 15 ? "success" : "warning"} className="text-[8px]">
                {formatInt(highIntentCount)} ({highIntentPct.toFixed(1)}%)
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px] text-muted">
        <BarChart3 size={10} />
        <span>
          التوزيع يعتمد على آخر 30 يومًا ويتم تحديثه تلقائياً
        </span>
      </div>
    </Card>
  );
}
