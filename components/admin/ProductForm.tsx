"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Save, Database, Check, Undo2, AlertTriangle, Loader2, Tag, Layers, X, Search } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useAdminData } from "@/src/admin/AdminDataProvider";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { bumpCacheVersion } from "@/hooks/useProducts";
import { productSummaries } from "@/src/data/product-summaries";
import type { Product } from "@/src/types/product";
import type { CategoryInfo } from "@/src/types/product";
import type { Brand } from "@/src/data/brands";

const SKIN_TYPES: { value: string; label: string }[] = [
  { value: "dry", label: "جافة" },
  { value: "oily", label: "دهنية" },
  { value: "combination", label: "مختلطة" },
  { value: "sensitive", label: "حساسة" },
  { value: "normal", label: "عادية" },
  { value: "all", label: "جميع الأنواع" },
];

const CURRENCY = "YER";
const CURRENCY_LABEL = "ر.ي";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const emptyForm = {
  nameAr: "",
  nameEn: "",
  sku: "",
  brand: "",
  category: "",
  price: "",
  originalPrice: "",
  stock: "",
  descriptionAr: "",
  descriptionEn: "",
  tags: "",
  gallery: "",
  seoTitleAr: "",
  seoTitleEn: "",
  seoDescAr: "",
  seoDescEn: "",
  seoKeywords: "",
};

type FormState = typeof emptyForm;

function formFromProduct(p: Product): FormState {
  return {
    nameAr: p.name.ar,
    nameEn: p.name.en,
    sku: p.sku,
    brand: p.brand,
    category: p.category,
    price: String(p.pricing.price),
    originalPrice: p.pricing.originalPrice ? String(p.pricing.originalPrice) : "",
    stock: String(p.stockQuantity ?? p.stock),
    descriptionAr: p.description.ar,
    descriptionEn: p.description.en,
    tags: p.tags?.join(", ") || "",
    gallery: (p.gallery || p.images || []).join("\n"),
    seoTitleAr: p.seoMetadata?.title?.ar || "",
    seoTitleEn: p.seoMetadata?.title?.en || "",
    seoDescAr: p.seoMetadata?.description?.ar || "",
    seoDescEn: p.seoMetadata?.description?.en || "",
    seoKeywords: p.seoMetadata?.keywords?.join(", ") || "",
  };
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  dir = "rtl",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  dir?: "rtl" | "ltr";
  required?: boolean;
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
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted">
        {label}
        {required && <span className="text-error"> *</span>}
      </span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
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

export default function ProductForm({ initialProduct }: { initialProduct?: Product }) {
  const { services } = useAdminData();
  const { toast } = useAdminToast();
  const [form, setForm] = useState<FormState>(() =>
    initialProduct ? formFromProduct(initialProduct) : emptyForm,
  );
  const [skinTypes, setSkinTypes] = useState<string[]>(() => initialProduct?.skinTypes || []);
  const [featured, setFeatured] = useState<boolean>(() =>
    Boolean(initialProduct?.isFeatured || initialProduct?.featured),
  );
  const [isNew, setIsNew] = useState<boolean>(() =>
    initialProduct ? Boolean(initialProduct.isNew) : true,
  );
  const [isBestSeller, setIsBestSeller] = useState<boolean>(() =>
    Boolean(initialProduct?.isBestSeller),
  );
  const [availability, setAvailability] = useState<"hidden" | "available" | "out_of_stock">(() => {
    if (!initialProduct) return "hidden";
    if (initialProduct.inStock === true) return "available";
    if (initialProduct.inStock === false) return "out_of_stock";
    return "hidden";
  });
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [built, setBuilt] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Alternatives state
  const [copyPrice, setCopyPrice] = useState<string>("");
  const [familyId, setFamilyId] = useState<string>("");
  const [altQuery, setAltQuery] = useState("");
  const [altSaved, setAltSaved] = useState(false);

  // Load existing alternatives
  useEffect(() => {
    if (!initialProduct) return;
    fetch(`/api/admin/product-alternatives?productId=${initialProduct.id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if (d.copy_price) setCopyPrice(String(d.copy_price));
        if (d.family_alternative_id) setFamilyId(d.family_alternative_id);
      })
      .catch(() => {});
  }, [initialProduct?.id]);

  const familyProduct = familyId ? productSummaries.find((p) => p.id === familyId) : null;

  const altResults = altQuery.trim()
    ? productSummaries
        .filter(
          (p) =>
            p.id !== initialProduct?.id &&
            (p.name.ar.includes(altQuery) ||
              p.name.en.toLowerCase().includes(altQuery.toLowerCase()) ||
              p.brand.toLowerCase().includes(altQuery.toLowerCase())),
        )
        .slice(0, 20)
    : [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catsRes, brandsRes] = await Promise.all([
          fetch("/api/admin/categories"),
          fetch("/api/admin/brands"),
        ]);
        const nextCategories = catsRes.ok ? await catsRes.json() : await services.getCategories();
        const nextBrands = brandsRes.ok ? await brandsRes.json() : await services.getBrands();
        if (!cancelled) {
          setCategories(nextCategories);
          setBrands(nextBrands);
        }
      } catch {
        if (!cancelled) {
          setErrors((prev) => [...prev, "تعذر تحميل قوائم التصنيفات والعلامات."]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [services]);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleSkinType = (value: string) =>
    setSkinTypes((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );

  const reset = useCallback(() => {
    setForm(emptyForm);
    setSkinTypes([]);
    setFeatured(false);
    setIsNew(true);
    setIsBestSeller(false);
    setAvailability("hidden");
    setErrors([]);
    setBuilt(null);
  }, []);

  const handleSubmit = () => {
    if (saving) return;
    const validation: string[] = [];
    if (!form.nameAr.trim()) validation.push("الاسم بالعربية مطلوب.");
    if (!form.sku.trim()) validation.push("رمز SKU مطلوب.");
    if (!form.brand) validation.push("اختر العلامة التجارية.");
    if (!form.category) validation.push("اختر التصنيف.");
    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) validation.push("السعر مطلوب وقيمته أكبر من صفر.");
    setErrors(validation);
    if (validation.length > 0) return;

    const originalPriceValue = form.originalPrice
      ? Number(form.originalPrice)
      : undefined;
    const discount =
      originalPriceValue && originalPriceValue > price
        ? Math.round((1 - price / originalPriceValue) * 100)
        : undefined;
    const stockValue = Number(form.stock) || 0;
    const slug = slugify(form.nameEn || form.nameAr);
    const gallery = form.gallery
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const product: Product = {
      ...initialProduct,
      // products.id is a UUID column — generate a proper UUID for new products.
      id: initialProduct?.id || crypto.randomUUID(),
      slug,
      sku: form.sku.trim(),
      name: { ar: form.nameAr.trim(), en: form.nameEn.trim() || form.nameAr.trim() },
      description: { ar: form.descriptionAr.trim(), en: form.descriptionEn.trim() },
      brand: form.brand,
      brandAr: form.brand,
      category: form.category,
      categoryAr: form.category,
      categorySlug: slugify(form.category),
      pricing: {
        price,
        currency: CURRENCY,
        ...(originalPriceValue ? { originalPrice: originalPriceValue } : {}),
      },
      ...(discount ? { discount } : {}),
      gallery,
      images: gallery,
      ingredients: initialProduct?.ingredients ?? { ar: [], en: [] },
      usageInstructions: initialProduct?.usageInstructions ?? { ar: "", en: "" },
      skinTypes,
      benefits: initialProduct?.benefits ?? { ar: [], en: [] },
      stock: stockValue,
      stockQuantity: stockValue,
      // Tri-state Availability Display — independent of stock quantity.
      inStock: availability === "available" ? true : availability === "out_of_stock" ? false : null,
      rating: initialProduct?.rating ?? 0,
      reviewCount: initialProduct?.reviewCount ?? 0,
      featured,
      isFeatured: featured,
      new: isNew,
      isNew,
      isBestSeller,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      seoMetadata: {
        title: {
          ar: form.seoTitleAr.trim() || form.nameAr.trim(),
          en: form.seoTitleEn.trim() || form.nameEn.trim(),
        },
        description: {
          ar: form.seoDescAr.trim() || form.descriptionAr.trim(),
          en: form.seoDescEn.trim() || form.descriptionEn.trim(),
        },
        keywords: form.seoKeywords
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean),
      },
    };
    setSaving(true);
    setSaveError(null);
    
    const isEdit = !!initialProduct;
    const url = "/api/admin/products";
    
    fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        setBuilt(product);
        setSaveError(null);
        bumpCacheVersion();
      })
      .catch((err) => {
        console.error("فشل حفظ المنتج:", err);
        setSaveError("حدث خطأ أثناء حفظ المنتج. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.");
        setBuilt(null);
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">
            {initialProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            نموذج إنشاء منتج وفق بنية <span dir="ltr">Product</span> في المتجر
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
          <span className="text-sm text-muted">جارٍ حفظ المنتج في قاعدة البيانات...</span>
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
              <h2 className="font-bold text-foreground">تم حفظ المنتج بنجاح في Supabase</h2>
              <p className="text-sm text-muted">
                تم بناء وحفظ كائن <span dir="ltr">Product</span> كاملاً في قاعدة البيانات.
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
              href="/admin/products"
              className="inline-flex items-center gap-2 rounded-button border-2 border-primary px-6 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white"
            >
              العودة إلى قائمة المنتجات
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <Card padding="md">
            <h2 className="mb-4 text-sm font-bold text-foreground">المعلومات الأساسية</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="الاسم (عربي)"
                value={form.nameAr}
                onChange={set("nameAr")}
                required
              />
              <TextField
                label="الاسم (إنجليزي) — يُستخدم لإنشاء الرابط تلقائياً"
                value={form.nameEn}
                onChange={set("nameEn")}
                dir="ltr"
              />
              <TextField
                label="رمز SKU"
                value={form.sku}
                onChange={set("sku")}
                dir="ltr"
                required
              />
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted">
                  العلامة التجارية<span className="text-error"> *</span>
                </span>
                <select
                  value={form.brand}
                  onChange={(event) => set("brand")(event.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— اختر العلامة —</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.name}>
                      {brand.nameAr}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted">
                  التصنيف<span className="text-error"> *</span>
                </span>
                <select
                  value={form.category}
                  onChange={(event) => set("category")(event.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— اختر التصنيف —</option>
                  {categories.map((category) => (
                    <option key={category.slug} value={category.name}>
                      {category.nameAr}
                    </option>
                  ))}
                </select>
              </label>
              <TextField label="الوصف (عربي)" value={form.descriptionAr} onChange={set("descriptionAr")} />
              <TextField label="الوصف (إنجليزي)" value={form.descriptionEn} onChange={set("descriptionEn")} dir="ltr" />
            </div>
          </Card>

          <Card padding="md">
            <h2 className="mb-4 text-sm font-bold text-foreground">التسعير والمخزون</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField label={`السعر (${CURRENCY_LABEL})`} value={form.price} onChange={set("price")} required />
              <NumberField label={`السعر قبل الخصم (اختياري)`} value={form.originalPrice} onChange={set("originalPrice")} />
              <NumberField label="الكمية في المخزون" value={form.stock} onChange={set("stock")} />
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-muted">العملة</span>
                <input
                  type="text"
                  value={`${CURRENCY} — ${CURRENCY_LABEL}`}
                  disabled
                  className="w-full rounded-xl border border-border bg-muted-bg px-3 py-2.5 text-sm text-muted"
                />
              </label>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="block text-xs font-bold text-muted">حالة التوفر (ما يظهر للعميل)</span>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as typeof availability)}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="hidden">إخفاء حالة التوفر</option>
                  <option value="available">متوفر</option>
                  <option value="out_of_stock">خلصت الكمية</option>
                </select>
              </label>
              <Toggle label="منتج جديد" checked={isNew} onChange={setIsNew} />
              <Toggle label="منتج مميز" checked={featured} onChange={setFeatured} />
              <Toggle label="الأكثر مبيعاً" checked={isBestSeller} onChange={setIsBestSeller} />
            </div>
          </Card>

          <Card padding="md">
            <h2 className="mb-4 text-sm font-bold text-foreground">أنواع البشرة</h2>
            <div className="flex flex-wrap gap-2">
              {SKIN_TYPES.map((skin) => (
                <button
                  key={skin.value}
                  type="button"
                  onClick={() => toggleSkinType(skin.value)}
                  className={`rounded-pill border px-4 py-2 text-sm font-medium transition-colors ${
                    skinTypes.includes(skin.value)
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-white text-muted hover:border-primary/40"
                  }`}
                >
                  {skin.label}
                </button>
              ))}
            </div>
          </Card>

          <Card padding="md">
            <h2 className="mb-4 text-sm font-bold text-foreground">الصور والوسوم</h2>
            <div className="grid grid-cols-1 gap-4">
              <TextAreaField
                label="روابط الصور (رابط واحد في كل سطر)"
                value={form.gallery}
                onChange={set("gallery")}
                rows={4}
              />
              <TextField label="الوسوم (افصل بينها بفاصلة)" value={form.tags} onChange={set("tags")} dir="ltr" />
            </div>
          </Card>

          <Card padding="md">
            <h2 className="mb-4 text-sm font-bold text-foreground">إعدادات SEO</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="عنوان SEO (عربي)" value={form.seoTitleAr} onChange={set("seoTitleAr")} />
              <TextField label="عنوان SEO (إنجليزي)" value={form.seoTitleEn} onChange={set("seoTitleEn")} dir="ltr" />
              <TextField label="وصف SEO (عربي)" value={form.seoDescAr} onChange={set("seoDescAr")} />
              <TextField label="وصف SEO (إنجليزي)" value={form.seoDescEn} onChange={set("seoDescEn")} dir="ltr" />
              <TextField label="الكلمات المفتاحية (افصل بينها بفاصلة)" value={form.seoKeywords} onChange={set("seoKeywords")} dir="ltr" />
            </div>
          </Card>

          <Card padding="md">
            <h2 className="mb-1 text-sm font-bold text-foreground">البدائل</h2>
            <p className="mb-4 text-xs text-muted">أضف بدائل أوفى للمنتج. يظهر الزبون خيارين: &quot;نسخة من المنتج&quot; و&quot;بديل من نفس العائلة&quot;.</p>

            {/* ─── نسخة من المنتج (سعر فقط) ─── */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-bold text-muted">نسخة من المنتج — سعر البديل</label>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                  <Tag size={14} className="text-green-600" />
                </div>
                <input
                  type="number"
                  value={copyPrice}
                  onChange={(e) => { setCopyPrice(e.target.value); setAltSaved(false); }}
                  placeholder="مثال: 12000"
                  min="0"
                  className="flex-1 rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100"
                />
                <span className="text-xs font-bold text-muted">ر.ي</span>
              </div>
            </div>

            {/* ─── بديل من نفس العائلة (اختيار منتج) ─── */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted">بديل من نفس العائلة — اختر منتجًا</label>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                  <Layers size={14} className="text-green-700" />
                </div>
                {familyProduct ? (
                  <div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-white px-3 py-2">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted-bg">
                      {familyProduct.heroImage || familyProduct.gallery?.[0] ? (
                        <Image src={familyProduct.heroImage || familyProduct.gallery[0]} alt={familyProduct.name.ar} fill sizes="40px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg">🧴</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{familyProduct.name.ar}</p>
                      <p className="text-[11px] text-muted">{familyProduct.brand} · {familyProduct.pricing.price?.toLocaleString("ar-YE")} ر.ي</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setFamilyId(""); setAltSaved(false); }}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-muted-bg hover:text-foreground"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400" />
                    <input
                      type="text"
                      value={altQuery}
                      onChange={(e) => setAltQuery(e.target.value)}
                      onFocus={() => setAltQuery("")}
                      placeholder="ابحث بالاسم أو العلامة..."
                      className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100"
                    />
                    {altResults.length > 0 && (
                      <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-border bg-card shadow-lg">
                        {altResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { setFamilyId(p.id); setAltQuery(""); setAltSaved(false); }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-start hover:bg-muted-bg/50 transition-colors"
                          >
                            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-muted-bg">
                              {p.heroImage || p.gallery?.[0] ? (
                                <Image src={p.heroImage || p.gallery[0]} alt={p.name.ar} fill sizes="32px" className="object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm">🧴</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-foreground line-clamp-1">{p.name.ar}</p>
                              <p className="text-[10px] text-muted">{p.brand}</p>
                            </div>
                            <span className="text-xs font-bold text-green-600">{p.pricing.price?.toLocaleString("ar-YE")}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {(copyPrice || familyId) && altSaved === false && (
              <p className="mt-3 text-[11px] text-warning-fg bg-warning-soft border border-warning-border rounded-lg px-3 py-2">
                اضغط &quot;حفظ البدائل&quot; لتطبيق التغييرات
              </p>
            )}
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSubmit} loading={saving} disabled={saving}>
              <Save className="h-4 w-4" />
              بناء المنتج والتحقق
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (!initialProduct) return;
                try {
                  const res = await fetch("/api/admin/product-alternatives", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      sourceProductId: initialProduct.id,
                      copyPrice: copyPrice ? Number(copyPrice) : null,
                      familyAlternativeId: familyId || null,
                    }),
                  });
                  if (res.ok) {
                    setAltSaved(true);
                    toast("تم حفظ البدائل بنجاح", "success");
                  } else {
                    const err = await res.json().catch(() => ({ error: "خطأ غير معروف" }));
                    toast(err.error || "تعذر حفظ البدائل", "error");
                  }
                } catch (e) {
                  toast(e instanceof Error ? e.message : "تعذر الاتصال بالخادم", "error");
                }
              }}
              disabled={!initialProduct}
            >
              حفظ البدائل
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
