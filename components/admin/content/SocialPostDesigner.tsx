"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, ImageOff, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import type { ContentOpsItem } from "./content-types";

const WIDTH = 1080;
const HEIGHT = 1350;
const LOGO_SRC = "/images/logo/luminous-derma-header-transparent.png";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("تعذر تحميل الصورة من المصدر"));
    image.src = src;
  });
}

function drawContain(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * ratio;
  const drawHeight = image.naturalHeight * ratio;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function wrapArabicText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 5);
}

export default function SocialPostDesigner({ item }: { item: ContentOpsItem }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [body, setBody] = useState(item.item.body);
  const [title, setTitle] = useState(item.item.title ?? "");
  const [imageReady, setImageReady] = useState<boolean | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const imageUrl = item.versions.slice().reverse().find((version) => version.content.mediaReference?.url)?.content.mediaReference.url ?? "";
  const productName = useMemo(() => title.trim() || "Luminous Derma", [title]);

  useEffect(() => {
    let cancelled = false;
    setImageReady(null);
    setDownloadError(null);
    if (!imageUrl) {
      setImageReady(false);
      return;
    }
    loadImage(imageUrl)
      .then(() => { if (!cancelled) setImageReady(true); })
      .catch(() => { if (!cancelled) setImageReady(false); });
    return () => { cancelled = true; };
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl || imageReady !== true) return;
    let cancelled = false;
    setDrawing(true);
    Promise.all([loadImage(imageUrl), loadImage(LOGO_SRC)])
      .then(([product, logo]) => {
        if (cancelled) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        ctx.fillStyle = "#f7f2ed";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        ctx.fillStyle = "#efe4dc";
        ctx.beginPath();
        ctx.arc(960, 170, 280, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.shadowColor = "rgba(73, 44, 42, 0.14)";
        ctx.shadowBlur = 32;
        ctx.shadowOffsetY = 14;
        drawContain(ctx, product, 105, 205, 870, 690);
        ctx.restore();

        ctx.fillStyle = "#4d3431";
        ctx.textAlign = "right";
        ctx.direction = "rtl";
        ctx.font = "700 56px Tajawal, Arial, sans-serif";
        ctx.fillText(productName.slice(0, 42), 975, 1010);

        ctx.font = "400 34px Tajawal, Arial, sans-serif";
        const lines = wrapArabicText(ctx, body, 870);
        lines.forEach((line, index) => ctx.fillText(line, 975, 1080 + index * 48));

        ctx.fillStyle = "#a96d63";
        ctx.roundRect(710, 1245, 265, 58, 29);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = "700 25px Tajawal, Arial, sans-serif";
        ctx.fillText("اكتشفي روتينك", 842, 1283);

        const logoHeight = 68;
        const logoWidth = (logo.naturalWidth / logo.naturalHeight) * logoHeight;
        ctx.drawImage(logo, 105, 55, logoWidth, logoHeight);
        ctx.fillStyle = "#a96d63";
        ctx.fillRect(105, 140, 130, 5);
      })
      .catch(() => setDownloadError("تعذر تجهيز الصورة؛ تأكد من أن رابط صورة المنتج يسمح بالتحميل."))
      .finally(() => { if (!cancelled) setDrawing(false); });
    return () => { cancelled = true; };
  }, [body, imageUrl, imageReady, productName]);

  function downloadCaption() {
    const blob = new Blob([`${title.trim()}\n\n${body.trim()}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `luminous-derma-${item.id}-caption.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function downloadDesign() {
    const canvas = canvasRef.current;
    if (!canvas || imageReady !== true || drawing) return;
    setDownloadError(null);
    canvas.toBlob((blob) => {
      if (!blob) {
        setDownloadError("تعذر إنشاء ملف التنزيل من صورة المنتج الحالية.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `luminous-derma-${item.id}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  return (
    <section className="space-y-4 rounded-card border border-border bg-muted-bg/30 p-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-foreground">استوديو المنشور</h3>
          <p className="text-[10px] text-muted">قالب عمودي 4:5 — الشعار يضاف تلقائيًا لكل تصميم</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadCaption}>
            <FileText className="h-3.5 w-3.5" /> تنزيل النص
          </Button>
          <Button variant="primary" size="sm" disabled={!imageUrl || imageReady !== true || drawing} onClick={() => void downloadDesign()}>
            <Download className="h-3.5 w-3.5" /> تنزيل PNG
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-start">
        <div className="flex justify-center rounded-card border border-border bg-white p-3">
          {imageUrl ? (
            <canvas ref={canvasRef} className="h-auto max-h-[620px] w-full max-w-[496px] rounded-xl object-contain" aria-label="معاينة تصميم المنشور" />
          ) : (
            <div className="flex min-h-64 w-full items-center justify-center gap-2 text-sm text-muted"><ImageOff size={18} /> لا توجد صورة منتج حقيقية لهذا المحتوى</div>
          )}
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">العنوان</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">نص المنشور</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={8} className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus:border-primary" />
          </label>
          <p className="text-[10px] leading-relaxed text-muted">التعديل هنا خاص بتصميم الصورة والتنزيل اليدوي، ولا يغير نص المحتوى المعتمد أو بيانات المنتج.</p>
          {drawing && <p className="flex items-center gap-1 text-[10px] text-muted"><RefreshCw className="h-3 w-3 animate-spin" /> جارٍ تجهيز المعاينة...</p>}
          {!drawing && imageUrl && imageReady === false && <p className="text-[10px] text-error">تعذر تحميل صورة المنتج؛ لن يتم استخدام صورة بديلة.</p>}
          {downloadError && <p className="text-[10px] text-error">{downloadError}</p>}
        </div>
      </div>
    </section>
  );
}
