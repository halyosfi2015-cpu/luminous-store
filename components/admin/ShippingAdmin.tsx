"use client";

import { useState, useEffect } from "react";
import { Truck, Plus, Pencil, Trash2, Power, Save, Check } from "lucide-react";
import Container from "@/components/ui/Container";
import { loadGovernorates, saveGovernorates, type Governorate } from "@/src/data/shipping";
import { LoadingState } from "@/components/admin/ui/States";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useAdminToast } from "@/components/admin/ui/AdminToast";

export default function ShippingAdmin() {
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFee, setEditFee] = useState<number>(0);
  const [newName, setNewName] = useState("");
  const [newFee, setNewFee] = useState<number>(1500);
  const [saved, setSaved] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useAdminToast();

  useEffect(() => {
    fetch("/api/admin/shipping")
      .then((r) => r.json())
      .then(setGovernorates)
      .catch(() => setGovernorates(loadGovernorates()))
      .finally(() => setLoading(false));
  }, []);

  const [saving, setSaving] = useState(false);

  const persist = async (list: Governorate[]) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(list),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setGovernorates(list);
      saveGovernorates(list);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      toast((err as Error).message || "حدث خطأ أثناء حفظ بيانات التوصيل", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = (id: string) => {
    persist(
      governorates.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g))
    );
  };

  const startEdit = (g: Governorate) => {
    setEditingId(g.id);
    setEditFee(g.fee);
  };

  const saveEdit = (id: string) => {
    persist(
      governorates.map((g) => (g.id === id ? { ...g, fee: editFee } : g))
    );
    setEditingId(null);
  };

  const addGovernorate = () => {
    const name = newName.trim();
    if (!name) return;
    const id = name.replace(/\s+/g, "-").toLowerCase();
    persist([
      ...governorates,
      { id, name, nameEn: name, fee: newFee, enabled: true },
    ]);
    setNewName("");
    setNewFee(1500);
  };

const confirmDelete = async () => {
    if (deleting || !deleteId) return;
    setDeleting(true);
    try {
      const newList = governorates.filter((g) => g.id !== deleteId);
      const res = await fetch("/api/admin/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newList),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setGovernorates(newList);
      saveGovernorates(newList);
      toast("تم حذف المحافظة بنجاح", "success");
    } catch (err) {
      toast((err as Error).message || "حدث خطأ أثناء حذف المحافظة", "error");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        {loading ? (
          <LoadingState label="جارٍ تحميل بيانات التوصيل..." />
        ) : (
        <>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Truck size={24} className="text-primary" />
              إدارة رسوم التوصيل
            </h1>
            <p className="mt-1 text-sm text-muted">
              تحكم بأسعار التوصيل لكل محافظة يمنية — التعديلات تُحفظ فوراً وتُطبق في صفحة إتمام الطلب.
            </p>
          </div>
          {saved && (
            <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-4 py-2 text-sm font-semibold text-success animate-fade-in">
              <Check size={15} />
              تم الحفظ
            </span>
          )}
        </div>

        {/* Add new governorate */}
        <div className="mb-6 flex flex-col gap-3 rounded-card border border-border bg-card p-5 shadow-card sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold text-foreground">اسم المحافظة</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="مثال: إب"
              className="w-full rounded-input border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div className="w-full sm:w-40">
            <label className="mb-1.5 block text-xs font-semibold text-foreground">رسوم التوصيل (ر.ي)</label>
            <input
              type="number"
              min={0}
              value={newFee}
              onChange={(e) => setNewFee(Number(e.target.value))}
              className="w-full rounded-input border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <button
            type="button"
            onClick={addGovernorate}
            className="flex items-center justify-center gap-2 rounded-input bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/30 transition-all hover:bg-primary-dark active:scale-95"
          >
            <Plus size={16} />
            إضافة محافظة
          </button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
          <div className="grid grid-cols-[1fr_120px_90px_40px] items-center gap-2 border-b border-border bg-muted-bg/50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted sm:grid-cols-[1fr_150px_130px_90px_90px]">
            <span>المحافظة</span>
            <span>رسوم التوصيل</span>
            <span className="hidden sm:block">الحالة</span>
            <span className="hidden sm:block">تعديل</span>
            <span className="text-end">حذف</span>
          </div>
          {governorates.map((g) => (
            <div
              key={g.id}
              className={`grid grid-cols-[1fr_120px_90px_40px] items-center gap-2 border-b border-border px-5 py-3 text-sm last:border-b-0 sm:grid-cols-[1fr_150px_130px_90px_90px] ${
                !g.enabled ? "opacity-50" : ""
              }`}
            >
              <span className="font-semibold text-foreground">{g.name}</span>

              <div>
                {editingId === g.id ? (
                  <input
                    type="number"
                    min={0}
                    value={editFee}
                    onChange={(e) => setEditFee(Number(e.target.value))}
                    autoFocus
                    className="w-full rounded-input border border-primary bg-background px-2.5 py-1.5 text-sm text-foreground outline-none ring-1 ring-primary/30"
                  />
                ) : (
                  <span className="font-medium text-foreground">{g.fee.toLocaleString("ar-YE")} ر.ي</span>
                )}
              </div>

              <div className="hidden sm:block">
                {editingId === g.id ? (
                  <button
                    type="button"
                    onClick={() => saveEdit(g.id)}
                    className="flex items-center gap-1 rounded-full bg-success/10 px-3 py-1.5 text-xs font-bold text-success hover:bg-success/20"
                  >
                    <Save size={12} /> حفظ
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleEnabled(g.id)}
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                      g.enabled
                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                        : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                    }`}
                  >
                    <Power size={12} />
                    {g.enabled ? "مفعل" : "موقوف"}
                  </button>
                )}
              </div>

              <div className="hidden sm:block">
                <button
                  type="button"
                  onClick={() => (editingId === g.id ? saveEdit(g.id) : startEdit(g))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-all hover:border-primary hover:text-primary"
                  aria-label="تعديل"
                >
                  <Pencil size={14} />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2">
                {/* mobile toggle */}
                <button
                  type="button"
                  onClick={() => toggleEnabled(g.id)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full sm:hidden ${
                    g.enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-gray-200 text-gray-500"
                  }`}
                  aria-label="تبديل الحالة"
                >
                  <Power size={13} />
                </button>
<button
                  type="button"
                  onClick={() => setDeleteId(g.id)}
                  disabled={deleting}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-all hover:border-red-300 hover:text-red-500 disabled:opacity-50"
                  aria-label="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

<p className="mt-4 text-xs text-muted">
          ملاحظة: التعديلات تُحفظ في Supabase وتُطبق مباشرة في صفحة إتمام الطلب.
        </p>

        <ConfirmDialog
          open={deleteId !== null}
          title="تأكيد الحذف"
          message={`سيتم حذف محافظة "${governorates.find((g) => g.id === deleteId)?.name ?? ""}" نهائياً من قائمة التوصيل.`}
          confirmLabel="حذف"
          tone="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
        </>
        )}
      </Container>
    </main>
  );
}

