"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Edit,
  Search,
  Save,
} from "lucide-react";
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
import type { AdminBanner } from "@/src/admin/types";

const emptyForm = {
  titleAr: "",
  titleEn: "",
  image: "",
  link: "",
  position: "top" as AdminBanner["position"],
  active: true,
  id: "",
};

type FormState = typeof emptyForm;

export default function BannersAdmin() {
  const { services } = useAdminData();
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useAdminToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/banners");
        const list = res.ok ? await res.json() : await services.getBanners();
        if (!cancelled) {
          setBanners(list);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return banners;
    return banners.filter((b) =>
      [b.titleAr, b.titleEn, b.position].join(" ").toLowerCase().includes(q),
    );
  }, [banners, search]);

  const handleCreate = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const banner: AdminBanner = {
        ...form,
        id: Date.now().toString(),
      };
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(banner),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      toast("تم إنشاء البانر بنجاح", "success");
      setReloadKey((k) => k + 1);
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      toast((err as Error).message || "حدث خطأ أثناء حفظ البانر", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (saving || !editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/banners/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      toast("تم حفظ تعديلات البانر بنجاح", "success");
      setReloadKey((k) => k + 1);
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      toast((err as Error).message || "حدث خطأ أثناء حفظ التعديلات", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (deleting || !deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/banners/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      toast("تم حذف البانر بنجاح", "success");
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast((err as Error).message || "حدث خطأ أثناء حذف البانر", "error");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleEdit = (banner: AdminBanner) => {
    setForm(banner);
    setEditingId(banner.id);
  };

  const cancelEdit = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const statusBadge = (active: boolean) =>
    active ? <Badge variant="success">نشط</Badge> : <Badge variant="neutral">غير نشط</Badge>;

  const formActions = () => {
    const isCreate = !editingId;
    const btn = isCreate
      ? <Button variant="primary" onClick={handleCreate} loading={saving} disabled={saving}>
          <Plus className="h-4 w-4" />
          إنشاء بانر
        </Button>
      : null;
    return btn;
  };

  if (loading)
    return (
      <Card padding="sm">
        <LoadingState label="جارٍ تحميل البانرات..." />
      </Card>
    );

  if (error)
    return (
      <Card padding="sm">
        <ErrorState
          title="تعذر جلب البانرات"
          description="حدث خطأ أثناء جلب البيانات."
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      </Card>
    );

  return (
    <Card padding="sm">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">البانرات</h1>
          <p className="mt-1 text-sm text-muted">
            إدارة البانرات الإعلانية (محفوظة محلياً)
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالعنوان أو الموضع..."
            className="w-full rounded-xl border border-border bg-white pe-3 ps-9 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-64"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {formActions()}
      </div>

      {editingId && (
        <Card padding="md" className="mt-4">
          <h2 className="mb-4 text-sm font-bold text-foreground">تعديل البانر</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted">العنوان (عربي) *</span>
              <input
                value={form.titleAr}
                onChange={(event) => setForm((prev) => ({ ...prev, titleAr: event.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted">العنوان (إنجليزي)</span>
              <input
                value={form.titleEn}
                dir="ltr"
                onChange={(event) => setForm((prev) => ({ ...prev, titleEn: event.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted">رابط الصورة</span>
              <input
                value={form.image}
                dir="ltr"
                onChange={(event) => setForm((prev) => ({ ...prev, image: event.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted">الرابط</span>
              <input
                value={form.link}
                dir="ltr"
                onChange={(event) => setForm((prev) => ({ ...prev, link: event.target.value }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-muted">الموضع</span>
              <select
                value={form.position}
                onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value as AdminBanner["position"] }))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
              >
                <option value="top">top</option>
                <option value="middle">middle</option>
                <option value="bottom">bottom</option>
              </select>
            </label>
            <label className="flex items-end gap-2 pb-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm font-medium text-foreground">بانر نشط</span>
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={handleUpdate} loading={saving} disabled={saving}>
              <Save className="h-4 w-4" />
              حفظ التعديلات
            </Button>
            <Button variant="outline" onClick={cancelEdit} disabled={saving}>
              إلغاء
            </Button>
          </div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="لا توجد بانرات" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-muted">
                <th className="whitespace-nowrap px-3 py-3 font-semibold">العنوان</th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold">العنوان بالإنجليزية</th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold">الموضع</th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold">الحالة</th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((banner) => (
                <tr
                  key={banner.id}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted-bg/50"
                >
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="font-semibold text-foreground">{banner.titleAr}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted">
                    {banner.titleEn}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted">{banner.position}</td>
                  <td className="whitespace-nowrap px-3 py-3">{statusBadge(banner.active)}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleEdit(banner)}
                      >
                        <Edit className="h-4 w-4" />
                        تعديل
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(banner.id)}
                        disabled={deleting}
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="تأكيد الحذف"
        message={`سيتم حذف البانر "${banners.find((b) => b.id === deleteId)?.titleAr ?? ""}" نهائياً.`}
        confirmLabel="حذف"
        tone="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </Card>
  );
}
