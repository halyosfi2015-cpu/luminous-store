"use client";

import { useEffect, useState } from "react";
import { ScrollText, Trash2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import type { AuditEntry } from "@/src/admin/types";

const ACTION_LABELS: Record<string, string> = {
  create: "إنشاء",
  update: "تعديل",
  delete: "حذف",
  status_change: "تغيير حالة",
  publish: "نشر",
  unpublish: "إلغاء نشر",
  duplicate: "تكرار",
  pricing: "تسعير",
  merchandising: "تسويق",
  bulk: "تعديل جماعي",
  import: "استيراد",
  export: "تصدير",
  source_verify: "تحقق مصدر",
  media: "وسائط",
  ai_generate: "توليد بالذكاء",
  ai_approve: "اعتماد بالذكاء",
};

export default function AuditAdmin() {
  const { toast } = useAdminToast();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/admin/audit", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((remote) => {
        setEntries([...(remote ?? [])].sort((a, b) =>
          (b.at ?? "").localeCompare(a.at ?? ""),
        ).slice(0, 500));
      })
      .catch(() => {
        setEntries([]);
        toast("تعذر تحميل سجل التدقيق", "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
     
  }, []);

  return (
    <main dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <ScrollText className="text-primary" size={20} />
            سجل التدقيق
          </h1>
          <p className="mt-1 text-sm text-muted">سجل كل التغييرات على الكتالوج ({entries.length} إدخالاً)</p>
        </div>
        <Button variant="outline" onClick={load}>
          <Trash2 size={16} /> تحديث السجل
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted">جارٍ التحميل...</p>
      ) : entries.length === 0 ? (
        <Card padding="md">
          <p className="text-sm text-muted">لا توجد إدخالات تدقيق بعد.</p>
        </Card>
      ) : (
        <Card padding="sm">
          <div className="divide-y divide-border">
            {entries.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <Badge variant="neutral">{ACTION_LABELS[e.action] ?? e.action}</Badge>
                <span className="text-sm font-semibold text-foreground">
                  {e.targetLabel ?? e.targetId ?? e.resource}
                </span>
                {e.note && <span className="text-xs text-muted">{e.note}</span>}
                <span className="ms-auto text-xs text-muted" dir="ltr">
                  {e.at ? new Date(e.at).toLocaleString("ar-YE") : ""}
                </span>
                <span className="text-xs text-muted">{e.by}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </main>
  );
}
