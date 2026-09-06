"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ExternalLink, LayoutDashboard } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/admin/ui/States";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { useAdminData } from "@/src/admin/AdminDataProvider";
import type {
  HomepageSectionKey,
  AllAdminHomepageKey,
  HomepageSettings,
  AdminStats,
} from "@/src/admin/types";

const SECTION_EDITORS: Partial<Record<string, string>> = {
  hero: "/admin/hero",
  categories: "/admin/taxonomy",
  bestSellers: "/admin/merchandising",
  newArrivals: "/admin/merchandising",
  offers: "/admin/offers",
  bundles: "/admin/bundles",
  experts: "/admin/experts",
  articles: "/admin/articles",
  // Main sections -> full control pages
  trendingNow: "/admin/trending",
  routines: "/admin/routines",
  problemSolutions: "/admin/problemSolutions",
  brands: "/admin/brands",
  services: "/admin/services",
  productsFeatured: "/admin/merchandising",
  productsFavorites: "/admin/merchandising",
  smartRecommendations: "/admin/ai/recommendations",
  weeklyOffers: "/admin/offers",
  // Grid variants -> same as parent
  about: "/admin/luminous-stage",
  testimonials: "/admin/reviews",
  features: "/admin/luminous-stage",
  newsletter: "/admin/luminous-stage",
  premiumServices: "/admin/services",
  productMarquee: "/admin/merchandising",
  problemSolutionsGrid: "/admin/problemSolutions",
  customerReviewsGrid: "/admin/reviews",
  expertGrid: "/admin/experts",
  brandsGrid: "/admin/brands",
  bundlesGrid: "/admin/bundles",
  newArrivalsGrid: "/admin/merchandising",
  smartRecsGrid: "/admin/ai/recommendations",
  weeklyOffersGrid: "/admin/offers",
};

const SECTION_STATUS: Record<string, (stats: AdminStats) => string> = {
  hero: (stats) => (stats.heroActive ? "واجهة مخصصة" : "واجهة افتراضية"),
  categories: (stats) => `${stats.categoryCount} تصنيف`,
  bestSellers: (stats) => `${stats.bestSellers} منتج`,
  newArrivals: (stats) => `${stats.newProducts} منتج`,
  offers: (stats) => (stats.offersEngine ? "المحرك مفعل" : "المحرك متوقف"),
  bundles: (stats) => `${stats.bundlesCount} باقة`,
  experts: (stats) => `${stats.expertsCount} خبير`,
  articles: (stats) => `${stats.articlesCount} مقال`,
  about: () => "قسم تعريفي",
  testimonials: () => "آراء العملاء",
  features: () => "المميزات",
  newsletter: () => "النشرة البريدية",
  premiumServices: () => "خدمات مميزة",
  productMarquee: () => "شريط المنتجات",
  problemSolutionsGrid: () => "شبكة مشاكل البشرة",
  customerReviewsGrid: () => "شبكة التقييمات",
  expertGrid: () => "شبكة الخبراء",
  brandsGrid: () => "شبكة الماركات",
  bundlesGrid: () => "شبكة الباقات",
  newArrivalsGrid: () => "شبكة وصل حديثاً",
  smartRecsGrid: () => "شبكة موصى لك",
  weeklyOffersGrid: () => "شبكة العروض الأسبوعية",
};

const SECTION_KEYS: AllAdminHomepageKey[] = [
  "hero",
  "categories",
  "bestSellers",
  "newArrivals",
  "offers",
  "bundles",
  "experts",
  "articles",
  // Missing control sections — now controllable (visibility + copy)
  "about",
  "testimonials",
  "features",
  "newsletter",
  "premiumServices",
  "productMarquee",
  "problemSolutionsGrid",
  "customerReviewsGrid",
  "expertGrid",
  "brandsGrid",
  "bundlesGrid",
  "newArrivalsGrid",
  "smartRecsGrid",
  "weeklyOffersGrid",
];

export default function HomepageAdmin() {
  const { services } = useAdminData();
  const { toast } = useAdminToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [settings, setSettings] = useState<HomepageSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statsRes, settingsRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/homepage"),
        ]);
        const nextStats = statsRes.ok ? await statsRes.json() : await services.getStats();
        const nextSettings = settingsRes.ok ? await settingsRes.json() : await services.getHomepageSettings();
        if (!cancelled) {
          setStats(nextStats);
          setSettings(nextSettings);
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

  const toggle = (key: AllAdminHomepageKey) => {
    if (!settings) return;
    const sections: any = { ...settings.sections, [key]: !settings.sections[key] };
    const next: any = { sections };
    const wasVisible = (settings.sections as any)[key] !== false;
    setSettings(next);
    services.persistHomepageSettings(next);
    fetch("/api/admin/homepage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast(wasVisible ? "تم إخفاء القسم" : "تم إظهار القسم", "success");
      })
      .catch(() => {
        toast("حدث خطأ أثناء حفظ التغييرات", "error");
      });
  };

  if (loading) return <LoadingState label="جارٍ تحميل أقسام الصفحة الرئيسية..." />;
  if (error || !stats || !settings) {
    return (
      <ErrorState
        title="تعذر تحميل أقسام الصفحة الرئيسية"
        description="حدث خطأ أثناء جلب البيانات المحلية."
        onRetry={retry}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">أقسام الصفحة الرئيسية</h1>
          <p className="mt-1 text-sm text-muted">
            إدارة رؤية كل قسم والانتقال إلى أدوات التحرير المرتبطة به
          </p>
        </div>
        <Badge variant="outline">
          <LayoutDashboard className="h-3.5 w-3.5" />
          تخزين محلي (Phase 5)
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {SECTION_KEYS.map((key) => {
          const visible = settings.sections[key] !== false;
          const editor = SECTION_EDITORS[key];
          const status = SECTION_STATUS[key](stats);
          return (
            <Card key={key} padding="md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-foreground">{key}</h2>
                  <p className="mt-1 text-sm text-muted">{status}</p>
                </div>
                <Badge variant={visible ? "success" : "neutral"}>
                  {visible ? "ظاهر" : "مخفي"}
                </Badge>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                    visible
                      ? "border-border bg-white text-muted hover:border-error/40 hover:text-error"
                      : "border-primary bg-primary text-white hover:bg-primary-700"
                  }`}
                >
                  {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {visible ? "إخفاء" : "إظهار"}
                </button>
                {editor && (
                  <Link
                    href={editor}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                    أدوات التحرير
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
