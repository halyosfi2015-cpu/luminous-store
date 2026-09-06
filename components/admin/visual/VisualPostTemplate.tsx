"use client";
import { useRef } from "react";
import Image from "next/image";

type VisualPostTemplateProps = {
  product: {
    nameAr: string;
    brand: string;
    image: string;
    price: number;
  };
};

export default function VisualPostTemplate({ product }: VisualPostTemplateProps) {
  const ref = useRef<HTMLDivElement>(null);

  const download = async () => {
    if (!ref.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: false,
        logging: false,
        foreignObjectRendering: false,
      });
      const link = document.createElement("a");
      link.download = `luminous-${product.nameAr.slice(0,20).replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      alert("تعذر تحميل الصورة — جربي لقطة شاشة مؤقتاً (قد تكون صورة المنتج خارجية بدون CORS)");
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={ref} className="relative w-[600px] overflow-hidden rounded-3xl bg-gradient-to-b from-[#fff8f9] via-white to-[#fdf2f4] p-6 shadow-2xl" dir="rtl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white font-bold text-lg">L</span>
            <div>
              <p className="text-xs font-bold text-primary">LUMINOUS DERMA</p>
              <p className="text-[9px] text-muted">لومينوس ديرما</p>
            </div>
          </div>
          <h1 className="text-2xl font-black text-primary">لهب</h1>
        </div>

        {/* Main */}
        <div className="mt-4 grid grid-cols-[1.2fr_1fr] gap-4 items-center">
          <div className="relative flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.image} alt={product.nameAr} className="h-[280px] w-auto object-contain drop-shadow-xl" crossOrigin="anonymous" />
            <span className="absolute bottom-1 start-2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-white">100 ML</span>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-primary">عطر شرقي فاخر</p>
            <h2 className="text-sm font-bold text-foreground leading-relaxed">{product.nameAr}</h2>
            <p className="text-[10px] text-muted">تركيبة فاخرة تمنحك حضوراً لا ينسى</p>
            <div className="flex gap-1.5">
              {["مميز", "فاخر", "يدوم"].map((t) => (
                <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl bg-white border border-border p-3">
          <span className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white">50 ريال سعودي</span>
          <span className="text-sm font-bold">7000 ريال يمني</span>
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[9px] text-muted">
          <span>lwryn.store</span>
          <span>781673496</span>
          <span>اطلبي الآن</span>
        </div>
      </div>

      <button onClick={download} className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-primary-700">
        حمّلي الصورة PNG
      </button>
      <p className="text-xs text-muted">القالب بصيغة HTML — حمّليه كـ PNG بدقة عالية</p>
    </div>
  );
}
