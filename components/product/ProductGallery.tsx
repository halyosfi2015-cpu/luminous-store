"use client";

import { useState, useRef } from "react";
import { ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import ProductImage from "@/components/product/ProductImage";

type ProductGalleryProps = {
  images: string[];
  name: string;
};

export default function ProductGallery({ images, name }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !isZoomed) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  const prevImage = () => setSelected((p) => (p > 0 ? p - 1 : images.length - 1));
  const nextImage = () => setSelected((p) => (p < images.length - 1 ? p + 1 : 0));

  if (images.length === 0) {
    return (
      <div className="aspect-square w-full rounded-card bg-muted-bg flex items-center justify-center text-muted text-sm">
        No image available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={imageRef}
        className="relative aspect-square w-full overflow-hidden rounded-card bg-muted-bg/50 border border-border group cursor-crosshair"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        <div
          className="absolute inset-0 transition-transform duration-300 will-change-transform"
          style={{
            transform: isZoomed ? "scale(1.5)" : "scale(1)",
            transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
          }}
        >
          <ProductImage
            src={images[selected]}
            alt={`${name} - ${selected + 1}`}
            productId={name}
            variant="clean"
            hoverZoom={false}
            pedestal
            className="absolute inset-0 h-full w-full"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-3 end-3 flex h-8 w-8 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm shadow-card opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn size={15} className="text-foreground" />
        </div>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              aria-label="السابق"
              className="absolute start-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm shadow-card opacity-0 group-hover:opacity-100 transition-all hover:bg-card"
            >
              <ChevronRight size={18} className="text-foreground rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={nextImage}
              aria-label="التالي"
              className="absolute end-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm shadow-card opacity-0 group-hover:opacity-100 transition-all hover:bg-card"
            >
              <ChevronLeft size={18} className="text-foreground rtl:rotate-180" />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar" role="tablist" aria-label="Product images">
          {images.map((src, i) => (
            <button
              key={src}
              role="tab"
              aria-selected={i === selected}
              aria-label={`View image ${i + 1}`}
              onClick={() => setSelected(i)}
              className={`shrink-0 rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                i === selected
                  ? "border-primary ring-1 ring-primary/30 shadow-card"
                  : "border-border hover:border-border-strong opacity-70 hover:opacity-100"
              }`}
            >
                <div className="relative h-16 w-16 sm:h-20 sm:w-20">
<ProductImage
                      src={src}
                      alt=""
                      productId={`thumb-${i}`}
                      variant="clean"
                      hoverZoom={false}
                      pedestal={false}
                      className="absolute inset-0 h-full w-full"
                    />
                </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
