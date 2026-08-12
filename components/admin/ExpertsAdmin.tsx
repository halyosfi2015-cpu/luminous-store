"use client";

import { useState, useEffect } from "react";
import { Stethoscope, Plus, Pencil, Trash2, Power, Save, Check } from "lucide-react";
import Container from "@/components/ui/Container";
import Input from "@/components/ui/Input";
import type { Expert } from "@/src/types/expert";
import { listExperts, saveExpertLocal, removeExpertLocal } from "@/src/admin/adapters/local/experts";
import { getExpertImage, DEFAULT_MALE_IMAGE, DEFAULT_FEMALE_IMAGE } from "@/lib/expert-images";
import { EmptyState, LoadingState } from "@/components/admin/ui/States";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useAdminToast } from "@/components/admin/ui/AdminToast";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function ExpertsAdmin() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Expert>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useAdminToast();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/experts")
      .then((r) => r.json())
      .then((list) => {
        if (!cancelled) setExperts(list);
      })
      .catch(() => {
        if (!cancelled) setExperts(listExperts());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const saveExpert = (expert: Expert) => {
    setExperts((prev) => prev.map((e) => (e.id === expert.id ? expert : e)));
    saveExpertLocal(expert);
    fetch("/api/admin/experts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expert),
    }).catch(() => {});
    flashSaved();
  };

  const toggleEnabled = (id: string) => {
    const expert = experts.find((e) => e.id === id);
    if (!expert) return;
    saveExpert({ ...expert, availableForConsultation: !expert.availableForConsultation });
  };

  const startEdit = (e: Expert) => {
    setEditingId(e.id);
    setEditData({
      nameAr: e.nameAr,
      titleAr: e.titleAr,
      specialtyAr: e.specialtyAr,
      shortBioAr: e.shortBioAr,
      profileImage: e.profileImage,
      gender: e.gender,
      cityAr: e.cityAr,
      isVerified: e.isVerified,
      availableForConsultation: e.availableForConsultation,
    });
  };

  const saveEdit = (id: string) => {
    const expert = experts.find((e) => e.id === id);
    if (!expert) return;
    saveExpert({ ...expert, ...editData });
    setEditingId(null);
    setEditData({});
  };

  const addExpert = (newExpert: Expert) => {
    setExperts((prev) => [...prev, newExpert]);
    saveExpertLocal(newExpert);
    fetch("/api/admin/experts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newExpert),
    }).catch(() => {});
    flashSaved();
  };

  const confirmDelete = () => {
    if (deleting || !deleteId) return;
    const expert = experts.find((e) => e.id === deleteId);
    setDeleting(true);
    setExperts((prev) => prev.filter((e) => e.id !== deleteId));
    removeExpertLocal(deleteId);
    if (expert) {
      fetch(`/api/admin/experts/${encodeURIComponent(expert.slug)}`, { method: "DELETE" })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          toast("تم حذف الخبير بنجاح", "success");
        })
        .catch(() => {
          toast("حدث خطأ أثناء حذف الخبير", "error");
        })
        .finally(() => {
          setDeleting(false);
          setDeleteId(null);
        });
    } else {
      setDeleting(false);
      setDeleteId(null);
      toast("تم حذف الخبير بنجاح", "success");
    }
  };

  if (loading) return <LoadingState label="جارٍ تحميل الخبراء..." />;

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Stethoscope size={24} className="text-primary" />
              إدارة الخبراء
            </h1>
            <p className="mt-1 text-sm text-muted">
              إدارة صور الخبراء، بياناتهم، وتوافرهم للاستشارات — التعديلات تُحفظ فوراً.
            </p>
          </div>
          {saved && (
            <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-4 py-2 text-sm font-semibold text-success animate-fade-in">
              <Check size={15} />
              تم الحفظ
            </span>
          )}
        </div>

        {/* Add new expert */}
        <div className="mb-6 rounded-card border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">إضافة خبير جديد</h2>
          <AddExpertForm onAdd={addExpert} />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
          <div className="grid grid-cols-[1fr_100px_80px_80px_40px] items-center gap-2 border-b border-border bg-muted-bg/50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted sm:grid-cols-[1fr_120px_120px_100px_100px_100px]">
            <span>الخبير</span>
            <span>التخصص</span>
            <span className="hidden sm:block">المدينة</span>
            <span className="hidden sm:block">الحالة</span>
            <span className="text-end">إجراءات</span>
          </div>
          {experts.length === 0 ? (
            <EmptyState title="لا يوجد خبراء" description="أضف أول خبير من النموذج أعلاه." />
          ) : (
            experts.map((e) => (
              <div
                key={e.id}
                className={`grid grid-cols-[1fr_100px_80px_80px_40px] items-center gap-2 border-b border-border px-5 py-3 text-sm last:border-b-0 sm:grid-cols-[1fr_120px_120px_100px_100px_100px] ${
                  !e.availableForConsultation ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element -- expert image may be SVG/unknown-size; next/image requires dangerouslyAllowSVG + known dimensions */}
                    <img
                       src={getExpertImage(e)}
                      alt={e.nameAr}
                      className="h-full w-full object-contain p-0.5"
                    />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">{e.nameAr}</span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                      {e.isVerified && <span className="text-amber-600 font-bold">✓ معتمد</span>}
                      <span className="text-muted capitalize">{e.gender === "male" ? "طبيب" : "طبيبة"}</span>
                    </div>
                  </div>
                </div>

                <span className="text-muted hidden sm:block">{e.specialtyAr}</span>

                <span className="hidden sm:block text-muted">{e.cityAr}</span>

                <div className="hidden sm:block">
                  <button
                    type="button"
                    onClick={() => toggleEnabled(e.id)}
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                      e.availableForConsultation
                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                        : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                    }`}
                  >
                    <Power size={12} />
                    {e.availableForConsultation ? "متاح" : "غير متاح"}
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => toggleEnabled(e.id)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full sm:hidden ${
                      e.availableForConsultation ? "bg-emerald-500/10 text-emerald-600" : "bg-gray-200 text-gray-500"
                    }`}
                    aria-label="تبديل الحالة"
                  >
                    <Power size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(e.id)}
                    disabled={deleting}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-all hover:border-red-300 hover:text-red-500 disabled:opacity-50"
                    aria-label="حذف"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => (editingId === e.id ? saveEdit(e.id) : startEdit(e))}
                    disabled={deleting}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-all hover:border-primary hover:text-primary disabled:opacity-40"
                    aria-label="تعديل"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {editingId && (
          <div className="mt-6 rounded-card border border-border bg-card p-5 shadow-card">
            <h3 className="mb-4 text-lg font-semibold text-foreground">تعديل الخبير</h3>
            <EditExpertForm
              expert={experts.find((e) => e.id === editingId)!}
              editData={editData}
              onChange={(field, value) => setEditData((prev) => ({ ...prev, [field]: value }))}
              onSave={() => saveEdit(editingId!)}
              onCancel={() => { setEditingId(null); setEditData({}); }}
            />
          </div>
        )}

        <p className="mt-4 text-xs text-muted">
          ملاحظة: التعديلات تُحفظ محلياً وتُطبق مباشرة في قسم الخبراء بالصفحة الرئيسية.
        </p>

        <ConfirmDialog
          open={deleteId !== null}
          title="تأكيد الحذف"
          message={`سيتم حذف الخبير "${experts.find((e) => e.id === deleteId)?.nameAr ?? ""}" نهائياً.`}
          confirmLabel="حذف"
          tone="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      </Container>
    </main>
  );
}

function AddExpertForm({ onAdd }: { onAdd: (e: Expert) => void }) {
  const [form, setForm] = useState({
    nameAr: "", nameEn: "", titleAr: "", titleEn: "", specialtyAr: "", specialtyEn: "",
    shortBioAr: "", bioAr: "", profileImage: "", coverImage: "",
    gender: "male" as "male" | "female",
    cityAr: "", cityEn: "", languages: ["ar"], consultationTypes: ["online"],
    isVerified: true, availableForConsultation: true, isFeatured: false,
    yearsOfExperience: 0, rating: 5, reviewCount: 0,
    socialLinks: [], services: [], products: [], articles: [], specialties: [], specialtiesAr: [],
  });

  const handleChange = (field: string, value: string | string[] | boolean | number) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameAr.trim()) return;
    const id = `exp-${Date.now()}`;
    const slug = slugify(form.nameEn) || slugify(form.nameAr) || `expert-${Date.now()}`;
    const newExpert: Expert = {
      id, slug,
      name: form.nameEn || form.nameAr,
      nameAr: form.nameAr,
      title: form.titleEn || form.titleAr,
      titleAr: form.titleAr,
      specialty: form.specialtyEn || form.specialtyAr,
      specialtyAr: form.specialtyAr,
      bio: form.bioAr || form.shortBioAr,
      bioAr: form.bioAr || form.shortBioAr,
      profileImage: form.profileImage || (form.gender === "female" ? DEFAULT_FEMALE_IMAGE : DEFAULT_MALE_IMAGE),
      coverImage: form.coverImage || "",
      avatar: form.profileImage || (form.gender === "female" ? DEFAULT_FEMALE_IMAGE : DEFAULT_MALE_IMAGE),
      gender: form.gender,
      languages: form.languages,
      consultationTypes: form.consultationTypes,
      services: form.services,
      products: form.products,
      articles: form.articles,
      specialties: form.specialties,
      specialtiesAr: form.specialtiesAr,
      yearsOfExperience: form.yearsOfExperience,
      isVerified: form.isVerified,
      availableForConsultation: form.availableForConsultation,
      rating: form.rating,
      reviewCount: form.reviewCount,
      isFeatured: form.isFeatured,
      city: form.cityEn,
      cityAr: form.cityAr,
      shortBio: form.shortBioAr,
      shortBioAr: form.shortBioAr,
      socialLinks: form.socialLinks,
      seoMetadata: { title: { ar: form.nameAr, en: form.nameEn }, description: { ar: form.bioAr, en: "" }, keywords: [] },
    };
    onAdd(newExpert);
    setForm({ ...form, nameAr: "", nameEn: "", titleAr: "", specialtyAr: "", shortBioAr: "", bioAr: "", profileImage: "", coverImage: "", cityAr: "" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="الاسم بالعربي" required value={form.nameAr} onChange={(e) => handleChange("nameAr", e.target.value)} />
        <Input label="الاسم بالإنجليزي" value={form.nameEn} onChange={(e) => handleChange("nameEn", e.target.value)} />
        <Input label="اللقب بالعربي" value={form.titleAr} onChange={(e) => handleChange("titleAr", e.target.value)} />
        <Input label="التخصص بالعربي" value={form.specialtyAr} onChange={(e) => handleChange("specialtyAr", e.target.value)} />
        <Input label="المدينة (عربي)" value={form.cityAr} onChange={(e) => handleChange("cityAr", e.target.value)} />
        <Input label="سنوات الخبرة" type="number" min="0" value={form.yearsOfExperience} onChange={(e) => handleChange("yearsOfExperience", Number(e.target.value))} />
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-foreground">الصورة الشخصية</label>
          <Input
            value={form.profileImage}
            onChange={(e) => handleChange("profileImage", e.target.value)}
            placeholder="/images/experts/dr-name.svg"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-foreground">صورة الغلاف</label>
          <Input
            value={form.coverImage}
            onChange={(e) => handleChange("coverImage", e.target.value)}
            placeholder="/images/experts/dr-name-cover.svg"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-foreground">نبذة مختصرة</label>
          <textarea
            value={form.shortBioAr}
            onChange={(e) => handleChange("shortBioAr", e.target.value)}
            rows={2}
            className="w-full rounded-input border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-foreground">السيرة الذاتية الكاملة</label>
          <textarea
            value={form.bioAr}
            onChange={(e) => handleChange("bioAr", e.target.value)}
            rows={3}
            className="w-full rounded-input border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="gender" value="male" checked={form.gender === "male"} onChange={() => handleChange("gender", "male")} />
            <span className="flex items-center gap-1">
              <span className="h-5 w-5 overflow-hidden rounded-full bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size thumbnail; image may be SVG, next/image unsafe here */}
                <img src={DEFAULT_MALE_IMAGE} alt="طبيب" className="h-full w-full object-cover" />
              </span>
              طبيب
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="gender" value="female" checked={form.gender === "female"} onChange={() => handleChange("gender", "female")} />
            <span className="flex items-center gap-1">
              <span className="h-5 w-5 overflow-hidden rounded-full bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size thumbnail; image may be SVG, next/image unsafe here */}
                <img src={DEFAULT_FEMALE_IMAGE} alt="طبيبة" className="h-full w-full object-cover" />
              </span>
              طبيبة
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isVerified} onChange={() => handleChange("isVerified", !form.isVerified)} />
            <span>معتمد ✓</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.availableForConsultation} onChange={() => handleChange("availableForConsultation", !form.availableForConsultation)} />
            <span>متاح للاستشارة</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isFeatured} onChange={() => handleChange("isFeatured", !form.isFeatured)} />
            <span>مميز</span>
          </label>
        </div>
      </div>
      <button type="submit" className="flex items-center justify-center gap-2 rounded-input bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/30 transition-all hover:bg-primary-dark active:scale-95">
        <Plus size={16} />
        إضافة الخبير
      </button>
    </form>
  );
}

function EditExpertForm({
  expert,
  editData,
  onChange,
  onSave,
  onCancel,
}: {
  expert: Expert;
  editData: Partial<Expert>;
  onChange: (field: string, value: string | boolean) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="الاسم بالعربي" required value={editData.nameAr || expert.nameAr} onChange={(e) => onChange("nameAr", e.target.value)} />
        <Input label="اللقب بالعربي" value={editData.titleAr || expert.titleAr} onChange={(e) => onChange("titleAr", e.target.value)} />
        <Input label="التخصص بالعربي" value={editData.specialtyAr || expert.specialtyAr} onChange={(e) => onChange("specialtyAr", e.target.value)} />
        <Input label="المدينة (عربي)" value={editData.cityAr || expert.cityAr} onChange={(e) => onChange("cityAr", e.target.value)} />
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-foreground">الصورة الشخصية</label>
          <Input
            value={editData.profileImage || expert.profileImage}
            onChange={(e) => onChange("profileImage", e.target.value)}
            placeholder="/images/experts/dr-name.svg"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-foreground">نبذة مختصرة</label>
          <textarea
            value={editData.shortBioAr || expert.shortBioAr || ""}
            onChange={(e) => onChange("shortBioAr", e.target.value)}
            rows={2}
            className="w-full rounded-input border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="gender" value="male" checked={editData.gender === "male" || (!editData.gender && expert.gender === "male")} onChange={() => onChange("gender", "male")} />
            <span className="flex items-center gap-1">
              <span className="h-5 w-5 overflow-hidden rounded-full bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size thumbnail; image may be SVG, next/image unsafe here */}
                <img src={DEFAULT_MALE_IMAGE} alt="طبيب" className="h-full w-full object-cover" />
              </span>
              طبيب
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="gender" value="female" checked={editData.gender === "female" || (!editData.gender && expert.gender === "female")} onChange={() => onChange("gender", "female")} />
            <span className="flex items-center gap-1">
              <span className="h-5 w-5 overflow-hidden rounded-full bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size thumbnail; image may be SVG, next/image unsafe here */}
                <img src={DEFAULT_FEMALE_IMAGE} alt="طبيبة" className="h-full w-full object-cover" />
              </span>
              طبيبة
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={editData.isVerified ?? expert.isVerified} onChange={() => onChange("isVerified", !(editData.isVerified ?? expert.isVerified))} />
            <span>معتمد ✓</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={editData.availableForConsultation ?? expert.availableForConsultation} onChange={() => onChange("availableForConsultation", !(editData.availableForConsultation ?? expert.availableForConsultation))} />
            <span>متاح للاستشارة</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={editData.isFeatured ?? expert.isFeatured} onChange={() => onChange("isFeatured", !(editData.isFeatured ?? expert.isFeatured))} />
            <span>مميز</span>
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-border">
        <button type="button" onClick={onCancel} className="rounded-input border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted-bg">
          إلغاء
        </button>
        <button type="submit" className="rounded-input bg-primary px-6 py-2 text-sm font-bold text-white shadow-md shadow-primary/30 hover:bg-primary-dark">
          <Save size={14} className="inline me-1" />
          حفظ التغييرات
        </button>
      </div>
    </form>
  );
}