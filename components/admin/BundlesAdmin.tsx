"use client";

import { useState, useEffect } from "react";
import { Package, Plus, Trash2, Pencil, Check, Power } from "lucide-react";
import Container from "@/components/ui/Container";
import { LoadingState } from "@/components/admin/ui/States";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { getBundlesWithDefaults, saveBundles } from "@/src/data/bundles-admin";
import { removeBundleLocal } from "@/src/admin/adapters/local/bundles";
import type { Bundle as BundleType } from "@/src/types/bundle";

export default function BundlesAdmin() {
  const [bundles, setBundles] = useState<BundleType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGiftWrap, setEditGiftWrap] = useState<number>(0);
  const [editServicePrice, setEditServicePrice] = useState<number>(0);
  const [newName, setNewName] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useAdminToast();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/bundles")
      .then((r) => r.json())
      .then((list) => {
        if (!cancelled) setBundles(list);
      })
      .catch(() => {
        if (!cancelled) setBundles(getBundlesWithDefaults());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = (list: BundleType[]) => {
    setBundles(list);
    saveBundles(list);
    fetch("/api/admin/bundles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(list),
    }).catch(() => {
      toast("حدث خطأ أثناء حفظ التغييرات", "error");
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const toggleGiftEnabled = (id: string) => {
    persist(
      bundles.map((b) => (b.id === id ? { ...b, giftWrap: !b.giftWrap } : b))
    );
  };

  const startEdit = (b: BundleType) => {
    setEditingId(b.id);
    setEditGiftWrap(b.giftWrapPrice || 0);
    setEditServicePrice(b.servicePrice || 0);
  };

  const saveEdit = (id: string) => {
    persist(
      bundles.map((b) => (b.id === id ? { ...b, giftWrap: editGiftWrap > 0, giftWrapPrice: editGiftWrap, servicePrice: editServicePrice } : b))
    );
    setEditingId(null);
    setEditGiftWrap(0);
    setEditServicePrice(0);
  };

  const addBundle = () => {
    const name = newName.trim();
    const slug = `bundle-new-${Date.now()}`;
    const newBundle: BundleType = {
      id: slug,
      slug,
      nameAr: name || "باقة جديدة",
      nameEn: name || "New Bundle",
      descriptionAr: "",
      descriptionEn: "",
      occasion: ["all"],
      image: "",
      productIds: [],
      originalPrice: 0,
      bundlePrice: 0,
      savingsPercent: 0,
      giftWrap: editGiftWrap > 0,
      giftWrapPrice: editGiftWrap,
      giftCard: false,
      servicePrice: editServicePrice,
      placeholder: false,
    };
    persist([...bundles, newBundle]);
    setNewName("");
    setEditGiftWrap(0);
    setEditServicePrice(0);
  };

  const confirmDelete = () => {
    if (deleting || !deleteId) return;
    setDeleting(true);
    const bundle = bundles.find((b) => b.id === deleteId);
    setBundles((prev) => prev.filter((b) => b.id !== deleteId));
    removeBundleLocal(deleteId);
    const done = () => {
      setDeleting(false);
      setDeleteId(null);
    };
    if (bundle?.slug) {
      fetch(`/api/admin/bundles/${encodeURIComponent(bundle.slug)}`, {
        method: "DELETE",
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          toast("تم حذف الباقة بنجاح", "success");
        })
        .catch(() => {
          toast("حدث خطأ أثناء حذف الباقة", "error");
        })
        .finally(done);
    } else {
      toast("تم حذف الباقة بنجاح", "success");
      done();
    }
  };

  if (loading) return <LoadingState label="جارٍ تحميل الباقات..." />;

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Package size={24} className="text-primary" />
              إدارة الباقات والهدايا
            </h1>
            <p className="mt-1 text-sm text-muted">
              إدارة صور الخبراء، الباقات، الأسعار، الرسوم الإضافية — التعديلات تُحفظ فوراً.
            </p>
          </div>
          {saved && (
            <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-4 py-2 text-sm font-semibold text-success animate-fade-in">
              <Check size={15} />
              تم الحفظ
            </span>
          )}
        </div>

        {/* Add new bundle */}
        <div className="mb-6 rounded-card border border-border bg-card p-5 shadow-card sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold text-foreground">اسم الباقة</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="مثال: باقة عيد الأم"
              className="w-full rounded-input border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div className="w-full sm:w-40">
            <label className="mb-1.5 block text-xs font-semibold text-foreground">رسوم التغليف (ر.ي)</label>
            <input
              type="number"
              min={0}
              value={editGiftWrap}
              onChange={(e) => setEditGiftWrap(Number(e.target.value))}
              className="w-full rounded-input border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div className="w-full sm:w-40">
            <label className="mb-1.5 block text-xs font-semibold text-foreground">رسوم الخدمة (ر.ي)</label>
            <input
              type="number"
              min={0}
              value={editServicePrice}
              onChange={(e) => setEditServicePrice(Number(e.target.value))}
              className="w-full rounded-input border border-border bg-background px-4 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <button
            type="button"
            onClick={addBundle}
            className="flex items-center justify-center gap-2 rounded-input bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/30 transition-all hover:bg-primary-dark active:scale-95"
          >
            <Plus size={16} />
            إضافة باقة
          </button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
          <div className="grid grid-cols-[1fr_80px_100px_100px] items-center gap-2 border-b border-border bg-muted-bg/50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted sm:grid-cols-[1fr_120px_100px_100px_80px]">
            <span>الباقة</span>
            <span>رسوم التغليف</span>
            <span>رسوم الخدمة</span>
            <span>الحالة</span>
            <span className="text-end">إجراءات</span>
          </div>
          {bundles.map((b) => (
            <div
              key={b.id}
              className={`grid grid-cols-[1fr_80px_100px_100px] items-center gap-2 border-b border-border px-5 py-3 text-sm last:border-b-0 sm:grid-cols-[1fr_120px_100px_100px_80px] ${
                !b.giftWrap ? "opacity-50" : ""
              }`}
            >
              <span className="font-semibold text-foreground">{b.nameAr}</span>

              <div>
                {editingId === b.id ? (
                  <input
                    type="number"
                    min={0}
                    value={editGiftWrap}
                    onChange={(e) => setEditGiftWrap(Number(e.target.value))}
                    autoFocus
                    className="w-full rounded-input border border-primary bg-background px-2.5 py-1.5 text-sm text-foreground outline-none ring-1 ring-primary/30"
                  />
                ) : (
                  <span className="font-medium text-foreground">{b.giftWrapPrice ? `${b.giftWrapPrice.toLocaleString("ar-YE")} ر.ي` : "—"}</span>
                )}
              </div>

              <div>
                {editingId === b.id ? (
                  <input
                    type="number"
                    min={0}
                    value={editServicePrice}
                    onChange={(e) => setEditServicePrice(Number(e.target.value))}
                    autoFocus
                    className="w-full rounded-input border border-primary bg-background px-2.5 py-1.5 text-sm text-foreground outline-none ring-1 ring-primary/30"
                  />
                ) : (
                  <span className="font-medium text-foreground">{b.servicePrice ? `${b.servicePrice.toLocaleString("ar-YE")} ر.ي` : "—"}</span>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => toggleGiftEnabled(b.id)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                    b.giftWrap
                      ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                      : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                  }`}
                >
                  <Power size={12} />
                  {b.giftWrap ? "مفعل" : "معطل"}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => (editingId === b.id ? saveEdit(b.id) : startEdit(b))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-all hover:border-primary hover:text-primary"
                  aria-label="تعديل"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(b.id)}
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
          ملاحظة: التعديلات تُحفظ محلياً وتُطبق مباشرة في صفحة الهدايا والباقات. لتبديل الصلاحيات على مستوى الخادم، يمكن الربط لاحقاً بقاعدة بيانات.
        </p>

        <ConfirmDialog
          open={deleteId !== null}
          title="تأكيد الحذف"
          message={`سيتم حذف الباقة "${bundles.find((b) => b.id === deleteId)?.nameAr ?? ""}" نهائياً من القائمة.`}
          confirmLabel="حذف"
          tone="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      </Container>
    </main>
  );
}