"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Save, Check, Gift, Pencil } from "lucide-react";
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
import type { GiftOption } from "@/src/data/bundles-admin";

const emptyForm = {
  labelAr: "",
  labelEn: "",
  price: "",
  descAr: "",
  descEn: "",
};

type FormState = typeof emptyForm;

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function GiftOptionsAdmin() {
  const [options, setOptions] = useState<GiftOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
        const res = await fetch("/api/admin/gift-options");
        if (!res.ok) throw new Error(String(res.status));
        const list = await res.json();
        if (!cancelled) {
          setOptions(Array.isArray(list) ? list : []);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setOptions([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retry = useCallback(() => {
    setError(false);
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  const persist = (next: GiftOption[]) => {
    setOptions(next);
    fetch("/api/admin/gift-options", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {
      toast("حدث خطأ أثناء حفظ التغييرات", "error");
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setFormError("");
    setEditingId(null);
    setShowForm(false);
  };

  const startAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  };

  const startEdit = (option: GiftOption) => {
    setEditingId(option.id);
    setForm({
      labelAr: option.labelAr,
      labelEn: option.labelEn,
      price: String(option.price),
      descAr: option.descAr,
      descEn: option.descEn,
    });
    setFormError("");
    setShowForm(true);
  };

  const saveForm = () => {
    if (saving) return;
    const labelAr = form.labelAr.trim();
    const labelEn = form.labelEn.trim();
    const price = Number(form.price);
    if (!labelAr && !labelEn) {
      setFormError("اسم الخيار مطلوب.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setFormError("السعر مطلوب ويجب أن يكون رقماً صحيحاً.");
      return;
    }
    setFormError("");
    setSaving(true);
    const entry: GiftOption = {
      id: editingId ?? `gift-${Date.now()}`,
      labelAr: labelAr || labelEn,
      labelEn: labelEn || labelAr,
      price,
      descAr: form.descAr.trim(),
      descEn: form.descEn.trim(),
      enabled: editingId
        ? (options.find((o) => o.id === editingId)?.enabled ?? true)
        : true,
    };
    if (editingId) {
      persist(options.map((o) => (o.id === editingId ? entry : o)));
    } else {
      persist([...options, entry]);
    }
    resetForm();
    setSaving(false);
  };

  const handleToggle = (id: string) => {
    persist(options.map((o) => (o.id === id ? { ...o, enabled: !o.enabled } : o)));
  };

  const confirmDelete = () => {
    if (deleting || !deleteId) return;
    setDeleting(true);
    setOptions((prev) => prev.filter((o) => o.id !== deleteId));
    fetch(`/api/admin/gift-options/${encodeURIComponent(deleteId)}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast("تم حذف الخيار بنجاح", "success");
      })
      .catch(() => {
        toast("حدث خطأ أثناء حذف الخيار", "error");
      })
      .finally(() => {
        setDeleting(false);
        setDeleteId(null);
      });
  };

  if (loading) return <LoadingState label="جارٍ تحميل خيارات الهدايا..." />;
  if (error) {
    return (
      <ErrorState
        title="تعذر تحميل خيارات الهدايا"
        description="حدث خطأ أثناء جلب البيانات المحلية."
        onRetry={retry}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">خيارات الهدايا</h1>
          <p className="mt-1 text-sm text-muted">إدارة الإضافات الاختيارية للهدايا والباقات</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <Badge variant="success">
              <Check className="h-3.5 w-3.5" />
              تم الحفظ
            </Badge>
          )}
          <Button onClick={startAdd}>
            <Plus className="h-4 w-4" />
            خيار جديد
          </Button>
        </div>
      </div>

      {showForm && (
        <Card padding="md">
          <h2 className="mb-4 text-sm font-bold text-foreground">
            {editingId ? "تعديل الخيار" : "خيار جديد"}
          </h2>
          {formError && (
            <div className="mb-4 rounded-xl border border-error-border bg-error-soft p-3 text-sm text-error-fg">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted">الاسم بالعربية *</span>
              <input
                value={form.labelAr}
                onChange={(event) => setForm((prev) => ({ ...prev, labelAr: event.target.value }))}
                placeholder="تغليف فاخر"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted">الاسم بالإنجليزية *</span>
              <input
                value={form.labelEn}
                onChange={(event) => setForm((prev) => ({ ...prev, labelEn: event.target.value }))}
                placeholder="Luxury Wrap"
                dir="ltr"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted">السعر (ر.ي) *</span>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted">الوصف بالعربية</span>
              <input
                value={form.descAr}
                onChange={(event) => setForm((prev) => ({ ...prev, descAr: event.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-muted">الوصف بالإنجليزية</span>
              <input
                value={form.descEn}
                onChange={(event) => setForm((prev) => ({ ...prev, descEn: event.target.value }))}
                dir="ltr"
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={saveForm} loading={saving} disabled={saving}>
              <Save className="h-4 w-4" />
              {editingId ? "حفظ التعديلات" : "حفظ الخيار"}
            </Button>
            <Button variant="outline" onClick={resetForm} disabled={saving}>
              إلغاء
            </Button>
          </div>
        </Card>
      )}

      {options.length === 0 ? (
        <EmptyState
          title="لا توجد خيارات هدايا"
          description="استخدم زر «خيار جديد» لإضافة خيار إهداء."
        />
      ) : (
        <Card className="overflow-hidden" padding="sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs text-muted">
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">الخيار</th>
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">السعر</th>
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">الحالة</th>
                  <th className="whitespace-nowrap px-3 py-3 text-start font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {options.map((option) => (
                  <tr key={option.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted-bg/50">
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2 font-semibold text-foreground">
                        <Gift className="h-4 w-4 text-primary" />
                        {option.labelAr}
                      </span>
                      {option.descAr && (
                        <div className="mt-0.5 text-xs text-muted">{option.descAr}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-foreground">
                      {option.price.toLocaleString("ar-YE")} ر.ي
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <Badge variant={option.enabled ? "success" : "neutral"}>
                        {option.enabled ? "مفعل" : "معطل"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(option)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(option.id)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                            option.enabled
                              ? "border-border bg-white text-muted hover:border-warning-border hover:text-warning-fg"
                              : "border-primary bg-primary text-white hover:bg-primary-700"
                          }`}
                        >
                          {option.enabled ? "تعطيل" : "تفعيل"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(option.id)}
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
        message={`سيتم حذف خيار الهدايا "${options.find((o) => o.id === deleteId)?.labelAr ?? ""}" نهائياً من القائمة.`}
        confirmLabel="حذف"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
