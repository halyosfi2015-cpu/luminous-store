"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, RefreshCcw, Search } from "lucide-react";
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
  rules_version: string;
};

type CustomerIntelligence = {
  profile: CustomerProfile;
  segments: SegmentEvaluation;
  intent: IntentEvaluation;
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

function deriveLifecycle(p: CustomerProfile): { key: string; ar: string; variant: "neutral" | "primary" | "success" | "warning" | "error" } {
  const now = Date.now();
  const last = p.last_active_at ? new Date(p.last_active_at).getTime() : 0;
  const days = last ? Math.floor((now - last) / (24 * 60 * 60 * 1000)) : Number.POSITIVE_INFINITY;
  if (p.total_orders === 0 && p.first_seen && now - new Date(p.first_seen).getTime() < 7 * 24 * 60 * 60 * 1000) return { key: "new", ar: "جديد", variant: "primary" };
  if (Number.isFinite(days) && days >= 90) return { key: "inactive", ar: "غير نشط", variant: "neutral" };
  if (Number.isFinite(days) && days >= 30) return { key: "at_risk", ar: "معرّض للخطر", variant: "warning" };
  if (p.total_orders >= 3 || p.total_spent >= 100000) return { key: "high_value", ar: "قيمة عالية", variant: "success" };
  if (p.total_orders >= 1) return { key: "returning", ar: "عائد", variant: "success" };
  return { key: "active", ar: "نشط", variant: "primary" };
}

export default function CustomerIntelligenceAdmin() {
  const [items, setItems] = useState<CustomerIntelligence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async (): Promise<CustomerIntelligence[]> => {
    const r = await fetch("/api/analytics/customers?limit=100");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const json = (await r.json()) as { items: CustomerIntelligence[] };
    return Array.isArray(json.items) ? json.items : [];
  }, []);

  const applyData = useCallback(
    (promise: Promise<CustomerIntelligence[]>, isCurrent: () => boolean) => {
      void promise
        .then((items) => {
          if (!isCurrent()) return;
          setItems(items);
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
          <p className="text-xs text-muted">ملخص محدود من البيانات السلوكية والتجريبية</p>
        </div>
        <div className="flex items-center gap-2">
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

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="لا توجد بيانات ذكاء عملاء بعد"
            description="ستظهر شرائح العملاء ونيّة الشراء بمجرد تسجيل الأحداث والطلبات."
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
  const { profile, segments, intent } = data;
  const lifecycle = deriveLifecycle(profile);
  return (
    <Card>
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

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="الجلسات" value={formatInt(profile.total_sessions)} />
        <Stat label="مشاهدات" value={formatInt(profile.total_product_views)} />
        <Stat label="إضافة للسلة" value={formatInt(profile.total_cart_additions)} />
        <Stat label="الطلبات" value={formatInt(profile.total_orders)} />
        <Stat label="الإنفاق" value={`${formatInt(profile.total_spent)} ر.ي`} />
        <Stat label="متوسط الطلب" value={`${formatInt(profile.average_order_value)} ر.ي`} />
      </div>

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
