"use client";

import { useEffect, useState } from "react";
import { Users, Info } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { LoadingState, EmptyState, ErrorState } from "@/components/admin/ui/States";
import { useAdminGuard } from "@/src/admin/useAdminGuard";

type SegmentKey =
  | "new_customer"
  | "returning_customer"
  | "cart_abandoner"
  | "category_interest"
  | "high_intent"
  | "high_value"
  | "at_risk"
  | "inactive";

const SEGMENT_ORDER: SegmentKey[] = [
  "new_customer",
  "returning_customer",
  "cart_abandoner",
  "category_interest",
  "high_intent",
  "high_value",
  "at_risk",
  "inactive",
];

const SEGMENT_LABELS: Record<SegmentKey, { ar: string; en: string }> = {
  new_customer: { ar: "عميل جديد", en: "New Customer" },
  returning_customer: { ar: "عميل عائد", en: "Returning Customer" },
  cart_abandoner: { ar: "متروك السلة", en: "Cart Abandoner" },
  category_interest: { ar: "مهتم بفئة", en: "Category Interest" },
  high_intent: { ar: "نية شراء عالية", en: "High Intent" },
  high_value: { ar: "قيمة عالية", en: "High Value" },
  at_risk: { ar: "معرض للخطر", en: "At Risk" },
  inactive: { ar: "غير نشط", en: "Inactive" },
};

const SEGMENT_TONES: Record<SegmentKey, "primary" | "secondary" | "accent" | "success" | "warning" | "error" | "neutral"> = {
  new_customer: "secondary",
  returning_customer: "secondary",
  cart_abandoner: "warning",
  category_interest: "accent",
  high_intent: "success",
  high_value: "primary",
  at_risk: "error",
  inactive: "neutral",
};

const SEGMENT_DESCRIPTIONS: Record<SegmentKey, { ar: string; en: string }> = {
  new_customer: {
    ar: "لم يقموا بأي شراء، انضموا خلال آخر 7 أيام",
    en: "Placed zero orders and signed up within the last 7 days.",
  },
  returning_customer: {
    ar: "لديهم طلبات سابقة على الأقل",
    en: "Have placed at least one order.",
  },
  cart_abandoner: {
    ar: "أضافوا منتجات للسلة لكن لم يكملوا الشراء",
    en: "Added products to cart but never completed a purchase.",
  },
  category_interest: {
    ar: "شاهدوا 3+ منتجات في فئة واحدة خلال 30 يومًا",
    en: "Viewed 3+ products in a single category within 30 days.",
  },
  high_intent: {
    ar: "بيعتهم على إنجاز الشراء (سلة، checkout، wishlist)",
    en: "Showed strong purchase signals (cart, checkout, wishlist).",
  },
  high_value: {
    ar: "3+ طلبات أو إنفاق 100,000+ ر.ي",
    en: "Placed 3+ orders or spent 100,000+ YER.",
  },
  at_risk: {
    ar: "عملاء سابقون غير نشطين لمدة 30-90 يومًا",
    en: "Previously purchased customers inactive for 30-90 days.",
  },
  inactive: {
    ar: "غير نشطين لمدة 90+ يومًا",
    en: "Inactive for 90+ days.",
  },
};

interface SegmentMember {
  customer_id: string;
  score: number | null;
  total_orders: number;
  total_spent: number;
  last_active_at: string | null;
  first_seen: string | null;
}

interface SegmentData {
  segment_key: SegmentKey;
  label: { ar: string; en: string };
  description_ar: string;
  description_en: string;
  customer_count: number;
  is_dynamic: boolean;
  members: SegmentMember[];
}

interface SegmentsResponse {
  total_customers: number;
  segments: SegmentData[];
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

export default function CustomerSegments() {
  const { allowed } = useAdminGuard("ai");
  const [data, setData] = useState<SegmentsResponse | null>(null);
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
        const res = await fetch("/api/analytics/segments", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const dist: {
          total_customers: number;
          distribution: Record<string, number>;
        } = await res.json();

        const customersRes = await fetch(`/api/analytics/customers?limit=200`, {
          signal: controller.signal,
        });
        let customers: Array<{
          profile: {
            customer_id: string;
            total_orders: number;
            total_spent: number;
            last_active_at: string | null;
            first_seen: string | null;
          };
          segments: { segments: string[] };
        }> = [];
        if (customersRes.ok) {
          const custJson = await customersRes.json();
          customers = (custJson.items ?? []) as typeof customers;
        }

        const segments: SegmentData[] = SEGMENT_ORDER.map((key) => {
          const members: SegmentMember[] = [];
          for (const c of customers) {
            if (c.segments.segments.includes(key)) {
              members.push({
                customer_id: c.profile.customer_id,
                score: null,
                total_orders: c.profile.total_orders,
                total_spent: c.profile.total_spent,
                last_active_at: c.profile.last_active_at,
                first_seen: c.profile.first_seen,
              });
            }
          }
          return {
            segment_key: key,
            label: SEGMENT_LABELS[key],
            description_ar: SEGMENT_DESCRIPTIONS[key].ar,
            description_en: SEGMENT_DESCRIPTIONS[key].en,
            customer_count: dist.distribution[key] ?? 0,
            is_dynamic: true,
            members: members.slice(0, 10),
          };
        });

        if (!cancelled && !controller.signal.aborted) {
          setData({
            total_customers: dist.total_customers,
            segments,
          });
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

  if (loading) return <LoadingState label="جارٍ تحميل شرائح العملاء..." />;
  if (error) return <ErrorState title="خطأ في التحميل" description={error} />;
  if (!data)
    return (
      <EmptyState title="لا توجد بيانات" description="لم يتم العثور على بيانات شرائح العملاء." />
    );

  const total = data.total_customers;
  const hasSegmentData = data.segments.some((s) => s.customer_count > 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Users size={20} className="text-primary" />
            شرائح العملاء
          </h1>
          <p className="text-xs text-muted">
            إجمالي العملاء: {formatInt(total)} — القواعد المحددة في{" "}
            <code className="rounded bg-muted-bg px-1 py-0.5 text-[10px]">src/lib/analytics/segments.ts</code>
          </p>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {total > 0 ? "ديناميكي" : "بدون بيانات"}
        </Badge>
      </div>

      {hasSegmentData ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.segments
            .filter((s) => s.customer_count > 0)
            .map((seg) => (
              <Card key={seg.segment_key}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {seg.label.ar}
                    </h3>
                    <Badge variant={SEGMENT_TONES[seg.segment_key as SegmentKey]} className="mt-1 text-[9px]">
                      {formatInt(seg.customer_count)} عميل
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-[9px]">
                    {seg.is_dynamic ? "ديناميكي" : "ثابت"}
                  </Badge>
                </div>
                <p className="mt-2 text-[11px] text-muted">{seg.description_ar}</p>

                {seg.members.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead className="border-b border-border/40 text-muted">
                        <tr>
                          <th className="py-1.5 text-start">العميل</th>
                          <th className="py-1.5 text-end">طلبات</th>
                          <th className="py-1.5 text-end">إنفاق</th>
                          <th className="py-1.5 text-end">آخر نشاط</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seg.members.map((m) => (
                          <tr key={m.customer_id} className="border-b border-border/20">
                            <td className="py-1 font-mono text-[8px] text-muted">
                              {m.customer_id.slice(0, 8)}…
                            </td>
                            <td className="py-1 text-end">{formatInt(m.total_orders)}</td>
                            <td className="py-1 text-end">{formatInt(m.total_spent)} ر.ي</td>
                            <td className="py-1 text-end text-muted">
                              {formatDate(m.last_active_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="لا توجد بيانات شرائح بعد"
            description="ستظهر شرائح العملاء (جديد، عائد، متروك السلة، إلخ) عند توفر بيانات سلوك العملاء."
          />
        </Card>
      )}

      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Info size={14} className="text-muted" />
          مراحل التطوير القادمة
        </h3>
        <ul className="space-y-1 text-xs text-muted">
          <li>• إنشاء شرائح يدوية (static) بالإضافة إلى الديناميكية</li>
          <li>• استهداف الحملات حسب الشريحة</li>
          <li>• تصدير قوائم العملاء من الشرائح</li>
          <li>• مراقبة تطور الشرائح عبر الزمن</li>
        </ul>
      </Card>
    </div>
  );
}
