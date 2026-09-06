"use client";

import { useState, useRef } from "react";
import { Upload, Link as LinkIcon, X, Loader2, Check } from "lucide-react";
import { useAdminToast } from "@/components/admin/ui/AdminToast";

type Props = {
  open: boolean;
  productId: string;
  productName: string;
  currentImage?: string;
  onClose: () => void;
  onSaved: (newPath: string) => void;
};

export default function ImageReplaceModal({
  open,
  productId,
  productName,
  currentImage,
  onClose,
  onSaved,
}: Props) {
  const { toast } = useAdminToast();
  const [mode, setMode] = useState<"url" | "file">("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setUrl("");
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleUrlChange = (val: string) => {
    setUrl(val);
    setFile(null);
    setPreview(val || null);
  };

  const handleSave = async () => {
    if (!url && !file) {
      toast("اختر صورة أو أدخل رابط", "error");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("productId", productId);
      if (file) {
        fd.append("file", file);
      } else {
        fd.append("imageUrl", url);
      }

      const res = await fetch("/api/admin/products/image", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "خطأ غير معروف");
      }

      toast("تم تحديث صورة المنتج بنجاح", "success");
      onSaved(data.path);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "خطأ غير معروف", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" dir="rtl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">استبدال صورة المنتج</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted truncate">{productName}</p>

        {/* Current image */}
        {currentImage && (
          <div className="mb-4">
            <p className="mb-2 text-xs text-muted">الصورة الحالية:</p>
            <img
              src={currentImage}
              alt={productName}
              className="h-32 w-32 rounded-lg border border-border object-contain bg-muted-bg"
            />
          </div>
        )}

        {/* Mode tabs */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode("url")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "url"
                ? "bg-primary text-primary-fg"
                : "bg-muted text-muted hover:bg-muted/80"
            }`}
          >
            <LinkIcon className="h-4 w-4" />
            رابط صورة
          </button>
          <button
            onClick={() => setMode("file")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "file"
                ? "bg-primary text-primary-fg"
                : "bg-muted text-muted hover:bg-muted/80"
            }`}
          >
            <Upload className="h-4 w-4" />
            رفع من الجهاز
          </button>
        </div>

        {/* URL input */}
        {mode === "url" && (
          <div className="mb-4">
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              dir="ltr"
            />
          </div>
        )}

        {/* File upload */}
        {mode === "file" && (
          <div className="mb-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted-bg/50 px-4 py-8 text-sm text-muted transition hover:border-primary hover:bg-muted-bg"
            >
              <Upload className="h-5 w-5" />
              {file ? file.name : "اضغط لاختيار صورة"}
            </button>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="mb-4">
            <p className="mb-2 text-xs text-muted">معاينة:</p>
            <img
              src={preview}
              alt="معاينة"
              className="h-40 w-40 rounded-lg border border-border object-contain bg-muted-bg"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition hover:bg-muted"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!url && !file)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}
