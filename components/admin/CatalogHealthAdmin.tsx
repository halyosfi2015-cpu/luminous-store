"use client";

import { useEffect, useMemo, useState } from "react";
import { HeartPulse, RefreshCw, AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { analyzeCatalogHealth } from "@/src/admin/health";
import { getAllProducts } from "@/src/admin/operations";
import type { CatalogHealthReport } from "@/src/admin/types";
import type { HealthIssue } from "@/src/admin/types";

const SEVERITY_META: Record<
  HealthIssue["severity"],
  { label: string; icon: typeof AlertTriangle; cls: string }
> = {
  error: { label: "خطأ", icon: AlertTriangle, cls: "bg-red-50 text-red-700 border-red-200" },
  warning: { label: "تنبيه", icon: AlertCircle, cls: "bg-amber-50 text-amber-700 border-amber-200" },
  info: { label: "معلومة", icon: Info, cls: "bg-sky-50 text-sky-700 border-sky-200" },
};

export default function CatalogHealthAdmin() {
  const [reloadKey, setReloadKey] = useState(0);
  const [report, setReport] = useState<CatalogHealthReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Scan the CANONICAL catalog (Supabase-first DAL) — not the static snapshot.
    getAllProducts()
      .then((products) => analyzeCatalogHealth(products))
      .then((r) => {
        if (!cancelled) setReport(r);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  return (
    <main dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <HeartPulse className="text-primary" size={20} />
            صحة الكتالوج
          </h1>
          <p className="mt-1 text-sm text-muted">
            فحوصات جودة البيانات تلقائياً على كامل الكتالوج ({report?.totalProducts ?? 0} منتجاً، منها{" "}
            {report?.publishedProducts ?? 0} منشوراً)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold text-foreground transition-colors hover:border-primary/40"
        >
          <RefreshCw size={15} />
          إعادة الفحص
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "أخطاء", value: report?.bySeverity.error ?? 0, cls: "bg-red-50 text-red-700" },
          { label: "تنبيهات", value: report?.bySeverity.warning ?? 0, cls: "bg-amber-50 text-amber-700" },
          { label: "ملاحظات", value: report?.bySeverity.info ?? 0, cls: "bg-sky-50 text-sky-700" },
          { label: "سليم", value: (report?.issues.length ?? 1) === 0 ? "✔" : "—", cls: "bg-emerald-50 text-emerald-700" },
        ].map((s, i) => (
          <div key={i} className={`rounded-2xl border border-border p-4 ${s.cls}`}>
            <p className="text-2xl font-extrabold">{s.value}</p>
            <p className="mt-1 text-xs font-semibold">{s.label}</p>
          </div>
        ))}
      </div>

      {(report?.issues.length ?? 0) === 0 ? (
        <Card padding="md">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-success" />
            <span className="font-bold text-foreground">الكتالوج سليم — لا توجد مشكلات.</span>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {(report?.issues ?? []).map((iss) => {
            const meta = SEVERITY_META[iss.severity];
            const Icon = meta.icon;
            return (
              <Card key={iss.id} padding="md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5" />
                    <div>
                      <p className="font-bold text-foreground">{iss.labelAr}</p>
                      <p className="text-xs text-muted">{iss.labelEn}</p>
                      <p className="mt-1 text-sm text-foreground">
                        العدد: <span className="font-bold">{iss.count}</span>
                      </p>
                    </div>
                  </div>
                  <Badge variant="neutral" className={meta.cls}>
                    {meta.label}
                  </Badge>
                </div>
                {iss.sampleIds && iss.sampleIds.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {iss.sampleIds.map((id) => (
                      <span key={id} dir="ltr" className="rounded-full bg-muted-bg px-2 py-0.5 text-[11px] text-muted">
                        {id}
                      </span>
                    ))}
                    {((iss.count ?? 0) > (iss.sampleIds.length ?? 0)) && (
                      <span className="text-[11px] text-muted">+{(iss.count ?? 0) - (iss.sampleIds.length ?? 0)} أخرى</span>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
