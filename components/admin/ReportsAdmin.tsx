"use client";

import { useCallback, useEffect, useState } from "react";
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
  Truck,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { useAdminData } from "@/src/admin/AdminDataProvider";
import { LoadingState, ErrorState } from "@/components/admin/ui/States";
import Card from "@/components/ui/Card";
import type { AdminStats } from "@/src/admin/types";

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: string;
};

const iconTone: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary-600",
  accent: "bg-accent/10 text-accent-700",
  success: "bg-success-soft text-success-fg",
  warning: "bg-warning-soft text-warning-fg",
  error: "bg-error-soft text-error-fg",
  muted: "bg-muted-bg text-muted",
};

function StatCard({ label, value, icon: Icon, tone }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-white p-4">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconTone[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm text-muted">{label}</div>
        <div className="text-xl font-bold text-foreground">{value}</div>
      </div>
    </div>
  );
}

export default function ReportsAdmin() {
  const { services } = useAdminData();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/stats");
        const data = res.ok ? await res.json() : await services.getStats();
        if (!cancelled) {
          setStats(data);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [services, reloadKey]);

  const retry = useCallback(() => {
    setError(false);
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  if (loading) return <LoadingState label="جارٍ تجميع التقارير..." />;
  if (error || !stats) {
    return (
      <ErrorState
        title="تعذر تجميع التقارير"
        description="حدث خطأ أثناء جلب البيانات المحلية."
        onRetry={retry}
      />
    );
  }

  const inventoryRatio = stats.productTotal
    ? Math.round(((stats.productTotal - stats.outOfStock) / stats.productTotal) * 100)
    : 0;

  const cards: StatCardProps[] = [
    { label: "إجمالي المنتجات", value: stats.productTotal, icon: Package, tone: "primary" },
    { label: "منتجات مميزة", value: stats.featuredProducts, icon: Star, tone: "accent" },
    { label: "منتجات جديدة", value: stats.newProducts, icon: Sparkles, tone: "secondary" },
    { label: "الأكثر مبيعاً", value: stats.bestSellers, icon: TrendingUp, tone: "success" },
    { label: "مخزون منخفض", value: stats.lowStock, icon: TriangleAlert, tone: "warning" },
    { label: "نفد المخزون", value: stats.outOfStock, icon: PackageX, tone: "error" },
    { label: "نسبة التوفر", value: `${inventoryRatio}%`, icon: Boxes, tone: "success" },
    { label: "التصنيفات", value: stats.categoryCount, icon: Tags, tone: "muted" },
    { label: "العلامات التجارية", value: stats.brandCount, icon: Boxes, tone: "muted" },
    { label: "الروتينات", value: stats.routinesCount, icon: Repeat, tone: "muted" },
    { label: "الباقات", value: stats.bundlesCount, icon: Gift, tone: "muted" },
    { label: "الخبراء", value: stats.expertsCount, icon: Stethoscope, tone: "muted" },
    { label: "المقالات", value: stats.articlesCount, icon: Newspaper, tone: "muted" },
    { label: "المحافظات المفعلة", value: stats.enabledGovernorates, icon: Truck, tone: "muted" },
    {
      label: "حالة محرك العروض",
      value: stats.offersEngine ? "مفعل" : "متوقف",
      icon: Megaphone,
      tone: stats.offersEngine ? "success" : "warning",
    },
    {
      label: "الواجهة الرئيسية",
      value: stats.heroActive ? "مخصصة" : "افتراضية",
      icon: Sparkles,
      tone: stats.heroActive ? "accent" : "muted",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">التقارير</h1>
        <p className="mt-1 text-sm text-muted">نظرة شاملة على مؤشرات المتجر الرئيسية</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
      {stats.offersEngine && (
        <Card padding="md">
          <h2 className="text-sm font-bold text-foreground">محرك العروض الأسبوعية</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-muted-bg p-4">
              <div className="text-sm text-muted">إجمالي العروض المولدة</div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {stats.offersEngine.totalOffersGenerated}
              </div>
            </div>
            <div className="rounded-xl bg-muted-bg p-4">
              <div className="text-sm text-muted">منتجات فريدة شملتها العروض</div>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {stats.offersEngine.uniqueProductsOffered}
              </div>
            </div>
            <div className="rounded-xl bg-muted-bg p-4">
              <div className="text-sm text-muted">آخر أسبوع مولّد</div>
              <div className="mt-1 text-xl font-bold text-foreground">
                {stats.offersEngine.lastGeneratedWeek ?? "لم يُولّد بعد"}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
