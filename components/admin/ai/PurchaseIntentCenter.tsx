"use client";

import { useEffect, useState } from "react";
import { Brain, TrendingUp, Users, BarChart3, Activity, Info } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { LoadingState, EmptyState, ErrorState } from "@/components/admin/ui/States";
import { useAdminGuard } from "@/src/admin/useAdminGuard";

type IntentLevel = "low" | "medium" | "high" | "very_high";

const INTENT_ORDER: IntentLevel[] = ["low", "medium", "high", "very_high"];
const INTENT_LABELS: Record<IntentLevel, { ar: string; en: string }> = {
  low: { ar: "منخفض", en: "Low" },
  medium: { ar: "متوسط", en: "Medium" },
  high: { ar: "مرتفع", en: "High" },
  very_high: { ar: "مرتفع جدًا", en: "Very High" },
};

const INTENT_TONES: Record<IntentLevel, "primary" | "secondary" | "accent" | "success" | "warning" | "error" | "neutral" | "outline"> = {
  low: "warning",
  medium: "accent",
  high: "success",
  very_high: "primary",
};

interface IntentCustomer {
  customer_id: string;
  score: number;
  level: IntentLevel;
  signals: Record<string, number>;
  segments: string[];
  total_orders: number;
  total_spent: number;
  first_seen: string | null;
  last_active_at: string | null;
}

interface IntentDistribution {
  total_evaluated: number;
  distribution: Record<string, number>;
}

interface IntentResponse {
  distribution: IntentDistribution;
  high_intent_customers: IntentCustomer[];
}

function formatInt(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("ar-YE") : "0";
}

function formatScore(n: number): string {
  return Number.isFinite(n) ? n.toFixed(0) : "0";
}

export default function PurchaseIntentCenter() {
  const { allowed } = useAdminGuard("ai");
  const [data, setData] = useState<IntentResponse | null>(null);
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
        const res = await fetch("/api/analytics/intent", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const distJson: IntentDistribution = await res.json();

        try {
          const res2 = await fetch(`/api/analytics/customers?limit=200`, {
            signal: controller.signal,
          });
          if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
          const custJson = await res2.json();
          const items = (custJson.items ?? []) as Array<{
            profile: { customer_id: string; total_orders: number; total_spent: number; first_seen: string | null; last_active_at: string | null };
            intent: { score: number; level: IntentLevel; signals: Record<string, number> };
            segments: { segments: string[] };
          }>;

          const highIntent = items
            .filter((c) => c.intent.level === "high" || c.intent.level === "very_high")
            .map((c) => ({
              customer_id: c.profile.customer_id,
              score: c.intent.score,
              level: c.intent.level,
              signals: c.intent.signals,
              segments: c.segments.segments ?? [],
              total_orders: c.profile.total_orders,
              total_spent: c.profile.total_spent,
              first_seen: c.profile.first_seen,
              last_active_at: c.profile.last_active_at,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);

          if (!cancelled && !controller.signal.aborted) {
            setData({ distribution: distJson, high_intent_customers: highIntent });
            setLoading(false);
          }
        } catch (e2) {
          if (!cancelled && !controller.signal.aborted) {
            setData({ distribution: distJson, high_intent_customers: [] });
            setLoading(false);
          }
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
  }, []);

  if (!allowed) {
    return (
      <EmptyState
        title="ليس لديك صلاحية الوصول"
        description="دورك الحالي لا يملك صلاحية عرض مركز تحكم الذكاء التجاري."
      />
    );
  }

  if (loading) return <LoadingState label="جارٍ حساب نية الشراء..." />;
  if (error) return <ErrorState title="خطأ في التحميل" description={error} />;
  if (!data)
    return (
      <EmptyState title="لا توجد بيانات" description="لم يتم العثور على بيانات نية الشراء." />
    );

  const hasData = data.distribution.total_evaluated > 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Brain size={20} className="text-primary" />
            نية الشراء
          </h1>
          <p className="text-xs text-muted">توزيع نية الشراء وإشارات العملاء والعملاء ذوو النية العالية</p>
        </div>
      </div>

      {hasData ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="إجمالي العملاء"
              value={formatInt(data.distribution.total_evaluated)}
              icon={Users}
              tone="primary"
            />
            {INTENT_ORDER.map((level) => (
              <KpiCard
                key={level}
                label={INTENT_LABELS[level].ar}
                value={formatInt(data.distribution.distribution[level] ?? 0)}
                icon={TrendingUp}
                tone={INTENT_TONES[level]}
              />
            ))}
          </div>

          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
              <Activity size={14} className="text-muted" />
              توزيع نية الشراء
            </h3>
            <div className="space-y-3">
              {INTENT_ORDER.map((level) => {
                const count = data.distribution.distribution[level] ?? 0;
                const total = data.distribution.total_evaluated || 1;
                const pct = (count / total) * 100;
                return (
                  <div key={level}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <Badge variant={INTENT_TONES[level]} className="text-[8px]">
                          {INTENT_LABELS[level].ar}
                        </Badge>
                      </span>
                      <span className="font-bold text-foreground">
                        {formatInt(count)} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted-bg">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] text-muted">
              الأوزان والعتامات محددة في <code className="rounded bg-muted-bg px-1 py-0.5">src/lib/analytics/intent.ts</code>
            </p>
          </Card>

          {data.high_intent_customers.length > 0 ? (
            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <Users size={14} className="text-muted" />
                العملاء ذوو النية العالية ({data.high_intent_customers.length})
              </h3>
              <p className="mb-3 text-[10px] text-muted">
                عرض نشاط العملاء الأخير ونية الشراء بناءً على الإشارات السلوكية. لا يتم كشف أي بيانات شخصية غير ضرورية.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-border text-muted">
                    <tr>
                      <th className="py-2 text-start">العميل</th>
                      <th className="py-2 text-end">النية</th>
                      <th className="py-2 text-end">الإشارات</th>
                      <th className="py-2 text-end">الطلبات</th>
                      <th className="py-2 text-end">إجمالي الإنفاق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.high_intent_customers.map((c) => (
                      <tr key={c.customer_id} className="border-b border-border/40">
                        <td className="py-2 font-mono text-[10px] text-muted">
                          {c.customer_id.slice(0, 8)}…
                        </td>
                        <td className="py-2 text-end">
                          <Badge variant={INTENT_TONES[c.level]} className="text-[9px]">
                            {INTENT_LABELS[c.level].ar}
                          </Badge>
                        </td>
                        <td className="py-2 text-end">
                          {Object.entries(c.signals)
                            .filter(([_, v]) => v > 0)
                            .map(([k, v]) => `${k}:${v}`)
                            .join(", ")}
                        </td>
                        <td className="py-2 text-end">{formatInt(c.total_orders)}</td>
                        <td className="py-2 text-end">{formatInt(c.total_spent)} ر.ي</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card>
              <EmptyState
                title="لا يوجد عملاء بنية مرتفعة"
                description="سيظهر العملاء الذين توصلت نيّتهم لمرحلة مرتفعة/مرتفعة جدًا هنا بمجرد توفر البيانات السلوكية."
              />
            </Card>
          )}
        </>
      ) : (
        <Card>
          <EmptyState
            title="لا توجد بيانات نية شراء بعد"
            description="سيتم احتساب نية الشراء عند توفر أحداث سلوكية (product_view, add_to_cart, checkout_started، إلخ) في جدول customer_events."
          />
        </Card>
      )}

      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Info size={14} className="text-muted" />
          مراحل التطوير القادمة
        </h3>
        <ul className="space-y-1 text-xs text-muted">
          <li>• إشارات نية الشراء لكل عميل (product_views, cart_adds, checkout_starts، إلخ)</li>
          <li>• التوقعات المنبثقة بناءً على السلوك الإضافي</li>
          <li>• التنبيهات عند تغير نية الشراء بشكل ملحوظ</li>
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
  tone: "primary" | "secondary" | "accent" | "success" | "warning" | "error" | "neutral" | "outline";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary-600",
    accent: "bg-accent/10 text-accent-700",
    success: "bg-success-soft text-success-fg",
    warning: "bg-warning-soft text-warning-fg",
    error: "bg-error-soft text-error-fg",
  };
  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-card p-3 shadow-card">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-input ${tones[tone] ?? tones.neutral}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-xs text-muted">{label}</div>
        <div className="text-base font-bold text-foreground">{value}</div>
      </div>
    </div>
  );
}
