"use client";

import { useEffect, useState } from "react";
import { Megaphone, Info, Plus } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { LoadingState, EmptyState, ErrorState } from "@/components/admin/ui/States";
import { useAdminGuard } from "@/src/admin/useAdminGuard";

type CampaignStatus = "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled";

const STATUS_LABELS: Record<CampaignStatus, { ar: string; en: string }> = {
  draft: { ar: "مسودة", en: "Draft" },
  scheduled: { ar: "مجدول", en: "Scheduled" },
  running: { ar: "نشط", en: "Running" },
  paused: { ar: "متوقف", en: "Paused" },
  completed: { ar: "مكتمل", en: "Completed" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
};

const STATUS_TONES: Record<CampaignStatus, "primary" | "secondary" | "accent" | "success" | "warning" | "error" | "neutral" | "outline"> = {
  draft: "neutral",
  scheduled: "accent",
  running: "success",
  paused: "warning",
  completed: "secondary",
  cancelled: "error",
};

interface CampaignRow {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  description?: string;
  type: string;
  status: CampaignStatus;
  startAt: string | null;
  endAt: string | null;
  budget: number;
  spent: number;
  createdAt: string;
  updatedAt: string;
  stats?: {
    reach: number;
    engagement: number;
    conversions: number;
    revenue: number;
  };
}

interface CampaignResponse {
  campaigns: CampaignRow[];
  total: number;
  isSupabase: boolean;
}

function formatInt(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("ar-YE") : "0";
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(n: number): string {
  return `${formatInt(n)} ر.ي`;
}

export default function CampaignsCenter() {
  const { allowed } = useAdminGuard("ai");
  const [data, setData] = useState<CampaignResponse | null>(null);
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
        const res = await fetch("/api/admin/ai/campaigns", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as CampaignResponse;
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
  }, []);

  if (!allowed) {
    return (
      <EmptyState
        title="ليس لديك صلاحية الوصول"
        description="دورك الحالي لا يملك صلاحية عرض مركز تحكم الذكاء التجاري."
      />
    );
  }

  if (loading) return <LoadingState label="جارٍ تحميل الحملات..." />;
  if (error) return <ErrorState title="خطأ في التحميل" description={error} />;
  if (!data)
    return (
      <EmptyState title="لا توجد بيانات" description="لم يتم العثور على بيانات الحملات." />
    );

  const hasData = data.campaigns.length > 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Megaphone size={20} className="text-primary" />
            الحملات
          </h1>
          <p className="text-xs text-muted">
            {data.total} حملة — {data.isSupabase ? "قاعدة بيانات" : "وضعية التطوير (بدون قاعدة بيانات)"}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5" />
          حملة جديدة
        </Button>
      </div>

      {hasData ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="py-2.5 text-start">الحملة</th>
                <th className="py-2.5 text-start">النوع</th>
                <th className="py-2.5 text-center">الحالة</th>
                <th className="py-2.5 text-end">الميزانية</th>
                <th className="py-2.5 text-end">الإنفاق</th>
                <th className="py-2.5 text-end">الوصول</th>
                <th className="py-2.5 text-end">التحويلات</th>
                <th className="py-2.5 text-end">بدء/انتهاء</th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((c) => (
                <tr key={c.id} className="border-b border-border/40">
                  <td className="py-2.5">
                    <div className="font-medium text-foreground">{c.nameAr || c.name}</div>
                    <div className="truncate text-[9px] text-muted">
                      {c.slug}
                    </div>
                  </td>
                  <td className="py-2.5 text-muted">{c.type}</td>
                  <td className="py-2.5 text-center">
                    <Badge variant={STATUS_TONES[c.status as CampaignStatus]} className="text-[9px]">
                      {STATUS_LABELS[c.status as CampaignStatus]?.ar ?? c.status}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-end">{formatCurrency(c.budget)}</td>
                  <td className="py-2.5 text-end">{formatCurrency(c.spent)}</td>
                  <td className="py-2.5 text-end">
                    {c.stats?.reach ? formatInt(c.stats.reach) : "—"}
                  </td>
                  <td className="py-2.5 text-end">
                    {c.stats?.conversions ? formatInt(c.stats.conversions) : "—"}
                  </td>
                  <td className="py-2.5 text-end text-muted">
                    {formatDate(c.startAt)} / {formatDate(c.endAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card>
          <EmptyState
            title="لا توجد حملات"
            description="ستظهر الحملات التسويقية والتي يمكن استهدافها حسب شرائح العملاء هنا."
          />
        </Card>
      )}

      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Info size={14} className="text-muted" />
          مراحل التطوير القادمة
        </h3>
        <ul className="space-y-1 text-xs text-muted">
          <li>• نشر الحملات عبر Instagram / TikTok / Email / SMS</li>
          <li>• استهداف تلقائي بناءً على شرائح العملاء والنية</li>
          <li>• A/B testing للمحتوى</li>
          <li>• تتبع ROI والعائد على الإنفاق</li>
          <li>• جداول زمنية ومراجعات تلقائية</li>
        </ul>
        <p className="mt-2 text-[10px] text-muted">
          انتباه: لا يتم إرسال أي رسائل تلقائيًا في هذه المرحلة. الحملات تظل
          إدارية فقط.
        </p>
      </Card>
    </div>
  );
}
