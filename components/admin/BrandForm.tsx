"use client";

import { useState } from "react";
import Link from "next/link";
import { Save, Database, Check, Undo2, AlertTriangle, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { saveBrandLocal } from "@/src/admin/adapters/local/brands";
import type { Brand } from "@/src/data/brands";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const emptyForm = {
  name: "",
  nameAr: "",
  slug: "",
  logo: "",
  coverImage: "",
  description: "",
  descriptionAr: "",
  origin: "",
  originAr: "",
  productCount: "",
};

type FormState = typeof emptyForm;

function formFromBrand(b: Brand): FormState {
  return {
    name: b.name,
    nameAr: b.nameAr,
    slug: b.slug,
    logo: b.logo || "",
    coverImage: b.coverImage || "",
    description: b.description || "",
    descriptionAr: b.descriptionAr || "",
    origin: b.origin || "",
    originAr: b.originAr || "",
    productCount: b.productCount == null ? "" : String(b.productCount),
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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border border-border bg-white px-4 py-3 text-start transition-colors hover:border-primary/30"
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted-bg"}`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "start-6" : "start-1"}`}
        />
      </span>
    </button>
  );
}

export default function BrandForm({ initialBrand }: { initialBrand?: Brand }) {
  const isEdit = !!initialBrand;
  const [form, setForm] = useState<FormState>(() =>
    initialBrand ? formFromBrand(initialBrand) : emptyForm,
  );
  const [isVerified, setIsVerified] = useState<boolean>(() => Boolean(initialBrand?.isVerified));
  const [featured, setFeatured] = useState<boolean>(() => Boolean(initialBrand?.featured));
  const [errors, setErrors] = useState<string[]>([]);
  const [built, setBuilt] = useState<Brand | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setForm(emptyForm);
    setIsVerified(false);
    setFeatured(false);
    setErrors([]);
    setBuilt(null);
    setSaveError(null);
  };

  const handleSubmit = () => {
    if (saving) return;
    const validation: string[] = [];
    if (!isEdit && !form.name.trim()) validation.push("اسم العلامة بالإنجليزية مطلوب.");
    if (!form.nameAr.trim()) validation.push("اسم العلامة بالعربية مطلوب.");
    setErrors(validation);
    if (validation.length > 0) return;

    const brand: Brand = {
      ...initialBrand,
      id: initialBrand?.id || `new-${Date.now()}`,
      slug: isEdit ? initialBrand!.slug : slugify(form.slug || form.name || form.nameAr),
      name: form.name.trim(),
      nameAr: form.nameAr.trim() || form.name.trim(),
      logo: form.logo.trim() || initialBrand?.logo || "",
      coverImage: form.coverImage.trim() || initialBrand?.coverImage || "",
      description: form.description.trim(),
      descriptionAr: form.descriptionAr.trim(),
      origin: form.origin.trim(),
      originAr: form.originAr.trim() || form.origin.trim(),
      isVerified,
      featured,
      productCount: Number(form.productCount) || initialBrand?.productCount || 0,
      seoMetadata:
        initialBrand?.seoMetadata ?? { title: { ar: "", en: "" }, description: { ar: "", en: "" }, keywords: [] },
    };

    setSaving(true);
    setSaveError(null);

    fetch("/api/admin/brands", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brand),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        saveBrandLocal(brand);
        setBuilt(brand);
        setSaveError(null);
      })
      .catch((err) => {
        console.error("فشل حفظ العلامة:", err);
        setSaveError("حدث خطأ أثناء حفظ العلامة. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.");
        setBuilt(null);
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">
            {isEdit ? "تعديل العلامة التجارية" : "إضافة علامة تجارية جديدة"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            نموذج وفق بنية <span dir="ltr">Brand</span> المستخدمة في المتجر
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
          <span className="text-sm text-muted">جارٍ حفظ العلامة في قاعدة البيانات...</span>
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
              <h2 className="font-bold text-foreground">تم حفظ العلامة بنجاح</h2>
              <p className="text-sm text-muted">
                تم حفظ كائن <span dir="ltr">Brand</span> محلياً وعبر واجهة API.
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
              href="/admin/brands"
              className="inline-flex items-center gap-2 rounded-button border-2 border-primary px-6 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white"
            >
              العودة إلى قائمة العلامات
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <Card padding="md">
            <h2 className="mb-4 text-sm font-bold text-foreground">المعلومات الأساسية</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="اسم العلامة (إنجليزي)"
                value={form.name}
                onChange={set("name")}
                dir="ltr"
                required={!isEdit}
                disabled={isEdit}
                hint={
                  isEdit
                    ? "لا يمكن إعادة تسمية العلامة لأن منتجات المتجر ترتبط بها عبر الاسم. لإنشاء علامة جديدة استخدم «إضافة علامة»."
                    : "يُستخدم لمطابقة منتجات العلامة في المتجر."
                }
              />
              <TextField label="اسم العلامة (عربي)" value={form.nameAr} onChange={set("nameAr")} required />
              <TextField
                label="الرابط (slug)"
                value={form.slug}
                onChange={set("slug")}
                dir="ltr"
                disabled={isEdit}
                hint={isEdit ? "لا يمكن تغيير الرابط لأنه معرّف العلامة في الروابط." : "يُترك فارغاً ليُولّد تلقائياً من الاسم."}
              />
              <TextField label="المنشأ (عربي)" value={form.originAr} onChange={set("originAr")} placeholder="مثال: كوريا الجنوبية" />
              <TextField label="المنشأ (إنجليزي)" value={form.origin} onChange={set("origin")} dir="ltr" placeholder="Example: South Korea" />
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
            <h2 className="mb-4 text-sm font-bold text-foreground">الوصف</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="الوصف (عربي)" value={form.descriptionAr} onChange={set("descriptionAr")} />
              <TextField label="الوصف (إنجليزي)" value={form.description} onChange={set("description")} dir="ltr" />
            </div>
          </Card>

          <Card padding="md">
            <h2 className="mb-4 text-sm font-bold text-foreground">الصور</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="رابط الشعار" value={form.logo} onChange={set("logo")} dir="ltr" />
              <TextField label="رابط صورة الغلاف" value={form.coverImage} onChange={set("coverImage")} dir="ltr" />
            </div>
          </Card>

          <Card padding="md">
            <h2 className="mb-4 text-sm font-bold text-foreground">الحالة</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Toggle label="علامة موثّقة" checked={isVerified} onChange={setIsVerified} />
              <Toggle label="علامة مميزة" checked={featured} onChange={setFeatured} />
            </div>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSubmit} loading={saving} disabled={saving}>
              <Save className="h-4 w-4" />
              حفظ العلامة
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
