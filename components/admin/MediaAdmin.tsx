"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ImageIcon, Plus, Trash2, Save, Link2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import type { MediaAsset } from "@/src/admin/types";

export default function MediaAdmin() {
  const { toast } = useAdminToast();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/media", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data)) {
            setAssets(data);
          }
        }
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const add = () => {
    if (!url.trim()) return;
    setAssets((prev) => [
      ...prev,
      { id: `media-${Date.now()}`, url: url.trim(), type: "image", label: label.trim() || undefined },
    ]);
    setUrl("");
    setLabel("");
  };

  const remove = (id: string) => setAssets((prev) => prev.filter((a) => a.id !== id));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assets),
      });
      if (!res.ok) throw new Error(String(res.status));
      toast("تم حفظ مكتبة الوسائط", "success");
    } catch {
      toast("فشل حفظ الوسائط", "error");
    } finally {
      setSaving(false);
    }
  };

  const previewUrls = useMemo(() => assets.map((a) => a.url), [assets]);

  return (
    <main dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <ImageIcon className="text-primary" size={20} />
            مكتبة الوسائط
          </h1>
          <p className="mt-1 text-sm text-muted">
            {loading ? "جاري التحميل..." : `إدارة صور المنتجات والبانرات — ${assets.length} عنصراً`}
          </p>
        </div>
        <Button onClick={save} disabled={saving || loading}>
          <Save size={16} /> {saving ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </div>

      <Card padding="md">
        <h2 className="mb-3 text-sm font-bold text-foreground">إضافة صورة</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="رابط الصورة https://..."
              dir="ltr"
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 ps-9 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="وصف (اختياري)"
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
          <Button variant="outline" onClick={add} disabled={!url.trim()}>
            <Plus size={16} /> إضافة
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card padding="md">
          <p className="text-sm text-muted">جاري تحميل مكتبة الوسائط...</p>
        </Card>
      ) : previewUrls.length === 0 ? (
        <Card padding="md">
          <p className="text-sm text-muted">لا توجد صور بعد. أضف روابط صور للمنتجات.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((a) => (
            <div key={a.id} className="group overflow-hidden rounded-2xl border border-border bg-white">
              <div className="relative aspect-square bg-muted-bg">
                <Image src={a.url} alt={a.label ?? ""} fill unoptimized className="object-cover" />
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="truncate text-xs text-muted">{a.label ?? a.url}</span>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="text-red-500 opacity-0 transition-opacity hover:bg-red-50 group-hover:opacity-100"
                  aria-label="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
