"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Save, Check, Ticket } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/admin/ui/States";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { useAdminData } from "@/src/admin/AdminDataProvider";
import type { AdminCoupon } from "@/src/admin/types";

const emptyForm = {
  code: "",
  description: "",
  type: "percent" as "percent" | "fixed",
  value: "",
  minOrder: "",
  maxDiscount: "",
  usageLimit: "",
};

type FormState = typeof emptyForm;

export default function CouponsAdmin() {
  const { services } = useAdminData();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useAdminToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/coupons");
        const list = res.ok ? await res.json() : await services.getCoupons();
        if (!cancelled) {
          setCoupons(list);
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

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const refresh = async (next: AdminCoupon[]) => {
    setCoupons(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleAdd = async () => {
    if (saving) return;
    const code = form.code.trim().toUpperCase().replace(/\s+/g, "");
    const value = Number(form.value);
    if (!code) {
      setFormError("رمز الكوبون مطلوب.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setFormError("قيمة الخصم مطلوبة وأكبر من صفر.");
      return;
    }
    setFormError("");
    setSaving(true);
    const coupon: AdminCoupon = {
      id: `coupon-${Date.now()}`,
      code,
      description: form.description.trim() || undefined,
      type: form.type,
      value,
      minOrder: form.minOrder ? Number(form.minOrder) : undefined,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      usedCount: 0,
      active: true,
      createdAt: new Date().toISOString(),
    };
    try {
      fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coupon),
      }).catch(() => {
        toast("حدث خطأ أثناء حفظ الكوبون", "error");
      });
      const next = await services.addCoupon(coupon);
      await refresh(next);
      toast("تم إنشاء الكوبون بنجاح", "success");
      setForm(emptyForm);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    const coupon = coupons.find((item) => item.id === id);
    if (!coupon) return;
    fetch(`/api/admin/coupons/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !coupon.active }),
    }).catch(() => {
      toast("حدث خطأ أثناء تحديث الكوبون", "error");
    });
    const next = await services.patchCoupon(id, { active: !coupon.active });
    await refresh(next);
  };

  const confirmDelete = async () => {
    if (deleting || !deleteId) return;
    setDeleting(true);
    try {
      fetch(`/api/admin/coupons/${deleteId}`, {
        method: "DELETE",
      }).catch(() => {
        toast("حدث خطأ أثناء حذف الكوبون", "error");
      });
      const next = await services.removeCoupon(deleteId);
      await refresh(next);
      toast("تم حذف الكوبون بنجاح", "success");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  if (loading) return <LoadingState label="جارٍ تحميل الكوبونات..." />;
  if (error) {
    return (
      <ErrorState
        title="تعذر تحميل الكوبونات"
        description="حدث خطأ أثناء جلب البيانات المحلية."
        onRetry={retry}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">القسائم والخصومات</h1>
          <p className="mt-1 text-sm text-muted">إدارة كوبونات الخصم والعروض الترويجية</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <Badge variant="success">
              <Check className="h-3.5 w-3.5" />
              تم الحفظ
            </Badge>
          )}
          <Button onClick={() => setShowForm((value) => !value)}>
            <Plus className="h-4 w-4" />
            كوبون جديد
          </Button>
        </div>
      </div>

      {showForm && (
        <Card padding="md">
          <h2 className="mb-4 text-sm font-bold text-foreground">كوبون جديد</h2>
          {formError && (
            <div className="mb-4 rounded-xl border border-error-border bg-error-soft p-3 text-sm text-error-fg">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted">رمز الكوبون *</span>
              <input
                value={form.code}
                onChange={(event) => set("code")(event.target.value)}
                placeholder="SAVE10"
                dir="ltr"
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted">النوع</span>
              <select
                value={form.type}
                onChange={(event) => set("type")(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
              >
                <option value="percent">نسبة مئوية</option>
                <option value="fixed">قيمة ثابتة (ر.ي)</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted">القيمة *</span>
              <input
                type="number"
                min="0"
                value={form.value}
                onChange={(event) => set("value")(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted">الحد الأدنى للطلب</span>
              <input
                type="number"
                min="0"
                value={form.minOrder}
                onChange={(event) => set("minOrder")(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted">أقصى خصم</span>
              <input
                type="number"
                min="0"
                value={form.maxDiscount}
                onChange={(event) => set("maxDiscount")(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted">حد الاستخدام</span>
              <input
                type="number"
                min="0"
                value={form.usageLimit}
                onChange={(event) => set("usageLimit")(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-muted">الوصف</span>
              <input
                value={form.description}
                onChange={(event) => set("description")(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={handleAdd} loading={saving} disabled={saving}>
              <Save className="h-4 w-4" />
              حفظ الكوبون
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setFormError(""); }} disabled={saving}>
              إلغاء
            </Button>
          </div>
        </Card>
      )}

      {coupons.length === 0 ? (
        <EmptyState
          title="لا توجد كوبونات"
          description="استخدم زر «كوبون جديد» لإنشاء أول كوبون خصم."
        />
      ) : (
        <Card className="overflow-hidden" padding="sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs text-muted">
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">الكود</th>
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">الخصم</th>
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">الحد الأدنى</th>
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">الاستخدام</th>
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">الحالة</th>
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted-bg/50">
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="flex items-center gap-2 font-semibold text-foreground">
                        <Ticket className="h-4 w-4 text-primary" />
                        <span dir="ltr">{coupon.code}</span>
                      </span>
                      {coupon.description && (
                        <div className="mt-0.5 text-xs text-muted">{coupon.description}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-foreground">
                      {coupon.type === "percent" ? `${coupon.value}%` : `${coupon.value} ر.ي`}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-foreground">
                      {coupon.minOrder ? `${coupon.minOrder} ر.ي` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-foreground">
                      {coupon.usedCount}
                      {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <Badge variant={coupon.active ? "success" : "neutral"}>
                        {coupon.active ? "مفعل" : "معطل"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggle(coupon.id)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                            coupon.active
                              ? "border-border bg-white text-muted hover:border-warning-border hover:text-warning-fg"
                              : "border-primary bg-primary text-white hover:bg-primary-700"
                          }`}
                        >
                          {coupon.active ? "تعطيل" : "تفعيل"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(coupon.id)}
                          disabled={deleting}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-medium text-error transition-colors hover:border-error hover:bg-error-soft disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="تأكيد الحذف"
        message={`سيتم حذف كوبون "${coupons.find((c) => c.id === deleteId)?.code ?? ""}" نهائياً.`}
        confirmLabel="حذف"
        tone="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
