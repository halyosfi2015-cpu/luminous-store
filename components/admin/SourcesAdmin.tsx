"use client";

import { useMemo, useState } from "react";
import { FileSearch, Plus, Trash2, Save, ShieldCheck, ShieldX } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { getSources, saveSources } from "@/src/admin/operations";
import type { SourceRecord } from "@/src/admin/types";

export default function SourcesAdmin() {
  const { toast } = useAdminToast();
  const [rows, setRows] = useState<SourceRecord[]>(() => getSources());

  const add = () =>
    setRows((prev) => [
      ...prev,
      { id: `src-${Date.now()}`, provider: "", verified: false },
    ]);

  const update = (id: string, patch: Partial<SourceRecord>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const save = () => {
    try {
      saveSources(rows);
    } catch (e) {
      toast(e instanceof Error ? e.message : "الخدمة غير متاحة", "error");
      return;
    }
    toast("تم حفظ المصادر", "success");
  };

  const verifiedCount = useMemo(() => rows.filter((r) => r.verified).length, [rows]);

  return (
    <main dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <FileSearch className="text-primary" size={20} />
            المصادر والتحقق
          </h1>
          <p className="mt-1 text-sm text-muted">
            سجلّ مصادر المنتجات والتحقق منها ({verifiedCount}/{rows.length} موثّق)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={add}>
            <Plus size={16} /> إضافة مصدر
          </Button>
          <Button onClick={save}>
            <Save size={16} /> حفظ
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card padding="md">
          <p className="text-sm text-muted">لا توجد مصادر بعد. أضف مصدراً لتوثيق منتجات الكتالوج.</p>
        </Card>
      ) : (
        <Card padding="sm">
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <input
                  value={r.provider}
                  onChange={(e) => update(r.id, { provider: e.target.value })}
                  placeholder="اسم المورد / المصدر"
                  className="min-w-40 flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <input
                  value={r.productId ?? ""}
                  onChange={(e) => update(r.id, { productId: e.target.value })}
                  placeholder="معرّف المنتج (اختياري)"
                  dir="ltr"
                  className="min-w-32 rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => update(r.id, { verified: !r.verified })}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                    r.verified ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {r.verified ? <ShieldCheck size={15} /> : <ShieldX size={15} />}
                  {r.verified ? "موثّق" : "غير موثّق"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  className="inline-flex items-center gap-1 rounded-xl px-2 py-2 text-red-500 hover:bg-red-50"
                  aria-label="حذف"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </main>
  );
}
