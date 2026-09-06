"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Search, Loader2, Check, ExternalLink, Image as ImageIcon, Upload } from "lucide-react";
import { useAdminToast } from "@/components/admin/ui/AdminToast";

type ImageResult = {
  url: string;
  thumbnail?: string;
  source: string;
  title?: string;
};

type Props = {
  open: boolean;
  productId: string;
  productName: string;
  brand?: string;
  currentImage?: string;
  onClose: () => void;
  onSaved: (newPath: string) => void;
};

export default function ImageSearchModal({
  open,
  productId,
  productName,
  brand,
  currentImage,
  onClose,
  onSaved,
}: Props) {
  const { toast } = useAdminToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFilePick = (f: File | undefined | null) => {
    if (!f || !f.type.startsWith("image/")) {
      if (f) toast("اختر ملف صورة صالح", "error");
      return;
    }
    setSelectedFile(f);
    setSelectedUrl(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
    toast("تم اختيار الصورة من اللابتوب — جاهزة للاعتماد", "success");
  };

  // Auto-fill query from product name + brand when modal opens
  useEffect(() => {
    if (open) {
      const q = [productName, brand].filter(Boolean).join(" ").trim();
      setQuery(q);
      setResults([]);
      setSelectedUrl(null);
      setSelectedFile(null);
      setPreview(null);
      setHasSearched(false);
    }
  }, [open, productName, brand]);

  // Global paste handler when modal is open — so Ctrl+V works anywhere in modal.
  // Accepts a pasted IMAGE, or a pasted image URL (previously silently ignored).
  useEffect(() => {
    if (!open) return;
    const onWindowPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((it) => it.type.startsWith("image/"));
      if (item) {
        const file = item.getAsFile();
        if (!file) return;
        e.preventDefault();
        setSelectedFile(file);
        setSelectedUrl(null);
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
        toast("تم لصق الصورة — جاهزة للاعتماد", "success");
        return;
      }
      const text = e.clipboardData?.getData("text")?.trim() ?? "";
      if (/^https?:\/\/\S+\.(png|jpe?g|webp|gif|avif|svg)(\?\S*)?$/i.test(text)) {
        e.preventDefault();
        setSelectedUrl(text);
        setSelectedFile(null);
        setPreview(text);
        toast("تم لصق رابط الصورة — جاهز للاعتماد", "success");
      }
    };
    window.addEventListener("paste", onWindowPaste as unknown as EventListener);
    return () => window.removeEventListener("paste", onWindowPaste as unknown as EventListener);
  }, [open, toast]);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) {
      toast("أدخل اسم المنتج للبحث", "error");
      return;
    }
    // MODIFICATION ONLY: Open Google Images in browser, not inside site
    const googleUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
    window.open(googleUrl, "_blank", "noopener,noreferrer");
    setHasSearched(true);
    toast("تم فتح بحث Google للصور في المتصفح — اختر صورة وانسخ رابطها ثم الصقه هنا", "success");
  }, [query, toast]);

  const handleSelect = (url: string) => {
    setSelectedUrl(url);
    setPreview(url);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((it) => it.type.startsWith("image/"));
    if (item) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        setSelectedFile(file);
        setSelectedUrl(null);
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
        toast("تم لصق الصورة — جاهزة للاعتماد", "success");
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setSelectedUrl(null);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!selectedUrl && !selectedFile) {
      toast("اختر صورة أولاً — الصقها (Ctrl+V) أو الصق رابطها", "error");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("productId", productId);
      if (selectedFile) {
        fd.append("file", selectedFile);
      } else if (selectedUrl) {
        fd.append("imageUrl", selectedUrl);
      }
      const res = await fetch("/api/admin/products/image", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "خطأ غير معروف");
      toast("تم تحديث صورة المنتج بنجاح", "success");
      onSaved(data.path);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "خطأ غير معروف", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-foreground">البحث عن صورة المنتج</h3>
            <p className="mt-0.5 text-xs text-muted">ابحث عن صور حقيقية لهذا المنتج على الإنترنت — الصورة لا تُستبدل إلا بعد اختيارك</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-muted-bg hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Product info — auto-filled, read-only as per spec, but query is editable */}
          <div className="mb-4 rounded-xl border border-border bg-muted-bg/40 p-3">
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex gap-2">
                <span className="font-semibold text-muted">المنتج:</span>
                <span className="font-medium text-foreground">{productName}</span>
              </div>
              {brand && (
                <div className="flex gap-2">
                  <span className="font-semibold text-muted">الماركة:</span>
                  <span className="font-medium text-foreground">{brand}</span>
                </div>
              )}
              {currentImage && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted">الصورة الحالية:</span>
                  <img src={currentImage} alt={productName} className="h-12 w-12 rounded-md border border-border object-contain bg-white" />
                </div>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                placeholder="اسم المنتج + الماركة"
                className="w-full rounded-xl border border-border bg-white py-2.5 pe-4 ps-9 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              بحث
            </button>
          </div>

          {/* Google Images in browser — paste URL or paste image directly */}
          <div className="rounded-xl border border-border bg-muted-bg/20 p-4" onPaste={handlePaste} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
            <p className="text-sm font-medium text-foreground">بعد فتح Google للصور في المتصفح:</p>
            <ol className="mt-2 list-decimal space-y-1 ps-5 text-xs text-muted">
              <li>انسخ <strong>الصورة نفسها</strong> (كليك يمين → نسخ الصورة / Copy image) ثم <strong>الصقها هنا مباشرة (Ctrl+V)</strong> — أو اسحبها وأفلتها هنا</li>
              <li>أو انسخ <strong>عنوان الصورة</strong> (Copy image address) والصقه في الحقل أدناه</li>
            </ol>
            {/* Direct paste / drop / laptop zone */}
            <div className="mt-3 rounded-xl border-2 border-dashed border-primary/30 bg-white p-4 text-center transition hover:border-primary/50 hover:bg-primary/5">
              <p className="text-xs font-bold text-primary">الصق الصورة هنا (Ctrl+V) أو اسحبها</p>
              <p className="mt-1 text-[11px] text-muted">ادعم لصق الصورة مباشرة بدون نسخ الرابط</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleFilePick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted-bg px-3 py-2 text-xs font-bold text-foreground transition hover:border-primary/40 hover:text-primary"
              >
                <Upload className="h-3.5 w-3.5" />
                أو اختر صورة من اللابتوب
              </button>
              {selectedFile && <p className="mt-2 text-xs font-medium text-success">✓ {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</p>}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="url"
                value={selectedUrl ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setSelectedUrl(v || null);
                  if (v) {
                    setSelectedFile(null);
                    setPreview(v);
                  } else if (!selectedFile) {
                    setPreview(null);
                  }
                }}
                placeholder="أو الصق رابط الصورة هنا https://.../image.jpg"
                className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ltr"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => selectedUrl && setPreview(selectedUrl)}
                disabled={!selectedUrl}
                className="shrink-0 rounded-xl bg-muted px-3 py-2 text-xs font-bold text-foreground transition hover:bg-muted/80 disabled:opacity-40"
              >
                معاينة
              </button>
            </div>
            {hasSearched && !selectedUrl && !selectedFile && (
              <p className="mt-2 text-xs text-muted/70">الصق الصورة مباشرة (Ctrl+V) أو رابطها بعد نسخها من Google</p>
            )}
          </div>

          {/* Preview — appears after selection, before save */}
          {preview && (
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="mb-2 text-xs font-bold text-primary">معاينة الصورة المختارة:</p>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <img
                  src={preview}
                  alt="معاينة"
                  className="h-40 w-40 rounded-xl border border-border bg-white object-contain shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <div className="flex flex-col gap-2 text-xs text-muted">
                  <p>ستُستبدل صورة المنتج الحالية بهذه الصورة بعد الضغط على "اعتماد الصورة".</p>
                  <p className="font-medium text-foreground">لن تتغير أي بيانات أخرى (الاسم، الماركة، السعر، SKU).</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted-bg/30 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition hover:bg-white hover:text-foreground"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || (!selectedUrl && !selectedFile)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-40 disabled:shadow-none"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            اعتماد الصورة
          </button>
        </div>
      </div>
    </div>
  );
}
