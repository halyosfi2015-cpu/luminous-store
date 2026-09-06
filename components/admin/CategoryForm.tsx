"use client";

import { useState } from "react";
import Link from "next/link";
import { Save, Database, Check, Undo2, AlertTriangle, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { CategoryInfo } from "@/src/types/product";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const emptyForm = {
  nameAr: "",
  nameEn: "",
  slug: "",
  descriptionAr: "",
  descriptionEn: "",
  image: "",
  coverImage: "",
  icon: "",
  productCount: "",
};

type FormState = typeof emptyForm;

function formFromCategory(c: CategoryInfo): FormState {
  return {
    nameAr: c.nameAr,
    nameEn: c.name,
    slug: c.slug,
    descriptionAr: c.descriptionAr || "",
    descriptionEn: c.description || "",
    image: c.image || "",
    coverImage: c.coverImage || "",
    icon: c.icon || "",
    productCount: c.productCount == null ? "" : String(c.productCount),
  };
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  dir = "rtl",
  required = false,
  disabled = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  dir?: "rtl" | "ltr";
  required?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted">
        {label}
        {required && <span className="text-error"> *</span>}
      </span>
      <input
        type="text"
        value={value}
        dir={dir}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted-bg disabled:text-muted"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export default function CategoryForm({ initialCategory }: { initialCategory?: CategoryInfo }) {
  const isEdit = !!initialCategory;
  const [form, setForm] = useState<FormState>(() =>
    initialCategory ? formFromCategory(initialCategory) : emptyForm,
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [built, setBuilt] = useState<CategoryInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setForm(emptyForm);
    setErrors([]);
    setBuilt(null);
    setSaveError(null);
  };

  const handleSubmit = () => {
    if (saving) return;
    const validation: string[] = [];
    if (!form.nameAr.trim()) validation.push("الاسم بالعربية مطلوب.");
    if (!isEdit && !form.slug.trim() && !form.nameEn.trim()) {
      validation.push("الرابط (slug) أو الاسم بالإنجليزية مطلوب لإنشاء التصنيف.");
    }
    setErrors(validation);
    if (validation.length > 0) return;

    const category: CategoryInfo = {
      ...initialCategory,
      slug: isEdit ? initialCategory!.slug : slugify(form.slug || form.nameEn || form.nameAr),
      name: form.nameEn.trim() || form.nameAr.trim(),
      nameAr: form.nameAr.trim(),
      description: form.descriptionEn.trim(),
      descriptionAr: form.descriptionAr.trim(),
      image: form.image.trim() || undefined,
      coverImage: form.coverImage.trim() || undefined,
      icon: form.icon.trim() || undefined,
      productCount: Number(form.productCount) || initialCategory?.productCount || 0,
    };

    setSaving(true);
    setSaveError(null);

    fetch("/api/admin/categories", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(category),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        setBuilt(category);
        setSaveError(null);
      })
      .catch((err) => {
        console.error("فشل حفظ التصنيف:", err);
        setSaveError("حدث خطأ أثناء حفظ التصنيف. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.");
        setBuilt(null);
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">
            {isEdit ? "تعديل التصنيف" : "إضافة تصنيف جديد"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            نموذج وفق بنية <span dir="ltr">CategoryInfo</span> المستخدمة في المتجر
          </p>
        </div>
        <Badge variant="success">
          <Database className="h-3.5 w-3.5" />
          Supabase — الحفظ الفعلي مفعّل
        </Badge>
      </div>

      {errors.length > 0 && (
        <div className="rounded-xl border border-error-border bg-error-soft p-4">
          <ul className="list-inside list-disc space-y-1 text-sm text-error-fg">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {saving && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted">جارٍ حفظ التصنيف في قاعدة البيانات...</span>
        </div>
      )}

      {saveError && (
        <div className="flex items-start gap-3 rounded-xl border border-error-border bg-error-soft p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error-fg" />
          <div>
            <h3 className="text-sm font-bold text-error-fg">فشل الحفظ</h3>
            <p className="mt-1 text-sm text-error-fg">{saveError}</p>
          </div>
        </div>
      )}

      {built ? (
        <Card padding="md">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success-fg">
              <Check className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-foreground">تم حفظ التصنيف بنجاح</h2>
              <p className="text-sm text-muted">
                تم حفظ كائن <span dir="ltr">CategoryInfo</span> محلياً وعبر واجهة API.
              </p>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <pre dir="ltr" className="max-h-80 overflow-auto bg-muted-bg p-4 text-xs text-foreground">
              {JSON.stringify(built, null, 2)}
            </pre>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" onClick={reset}>
              <Undo2 className="h-4 w-4" />
              نموذج جديد
            </Button>
            <Link
              href="/admin/categories"
              className="inline-flex items-center gap-2 rounded-button border-2 border-primary px-6 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white"
            >
              العودة إلى قائمة التصنيفات
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <Card padding="md">
            <h2 className="mb-4 text-sm font-bold text-foreground">المعلومات الأساسية</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="الاسم (عربي)" value={form.nameAr} onChange={set("nameAr")} required />
              <TextField
                label="الاسم (إنجليزي)"
                value={form.nameEn}
                onChange={set("nameEn")}
                dir="ltr"
              />
              <TextField
                label="الرابط (slug)"
                value={form.slug}
                onChange={set("slug")}
                dir="ltr"
                disabled={isEdit}
                hint={
                  isEdit
                    ? "لا يمكن تغيير الرابط لأن المنتجات ترتبط بالتصنيف عبره."
                    : "يُترك فارغاً ليُولّد تلقائياً من الاسم بالإنجليزية."
                }
              />
              <TextField
                label="الأيقونة"
                value={form.icon}
                onChange={set("icon")}
                dir="ltr"
                placeholder="مثال: droplets, spray, pill..."
              />
              <TextField label="الوصف (عربي)" value={form.descriptionAr} onChange={set("descriptionAr")} />
              <TextField label="الوصف (إنجليزي)" value={form.descriptionEn} onChange={set("descriptionEn")} dir="ltr" />
              <TextField
                label="عدد المنتجات"
                value={form.productCount}
                onChange={set("productCount")}
                dir="ltr"
                placeholder="0"
              />
            </div>
          </Card>

          <Card padding="md">
            <h2 className="mb-4 text-sm font-bold text-foreground">الصور</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="رابط صورة التصنيف" value={form.image} onChange={set("image")} dir="ltr" />
              <TextField label="رابط صورة الغلاف" value={form.coverImage} onChange={set("coverImage")} dir="ltr" />
            </div>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSubmit} loading={saving} disabled={saving}>
              <Save className="h-4 w-4" />
              حفظ التصنيف
            </Button>
            <Button variant="outline" onClick={reset} disabled={saving}>
              إعادة تعيين
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
