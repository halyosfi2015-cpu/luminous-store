"use client";

import Image from "next/image";
import { normalizeImageURL } from "@/src/lib/image-url-normalizer";

/**
 * ProductImage — غلاف موحّد أنيق لصور المنتجات.
 * يضيف خلفية متدرجة راقية تتناسق مع الهوية البصرية، توهجاً ناعماً،
 * وظلاً إهليلجياً يجعل المنتج يبدو واقفاً على سطح — فتظهر الصور الحالية
 * بشكل احترافي وفيها روح دون تغيير ملفات الصور نفسها.
 */

export type ProductImageVariant = "auto" | "soft" | "glow" | "glass" | "clean";

const GRADIENTS: string[] = [
  "from-primary-50 via-white to-secondary-50",
  "from-secondary-50 via-white to-primary-50",
  "from-accent-50 via-white to-secondary-50",
  "from-[#fdf2f8] via-white to-primary-50",
  "from-[#f0f9ff] via-white to-secondary-50",
  "from-[#f5f3ff] via-white to-accent-50",
  "from-[#fefce8] via-white to-primary-50",
  "from-[#ecfdf5] via-white to-secondary-50",
];

const GLOW_COLORS: string[] = [
  "bg-primary-200/40",
  "bg-secondary-200/40",
  "bg-accent-200/50",
  "bg-rose-200/40",
  "bg-sky-200/40",
  "bg-violet-200/40",
  "bg-amber-200/50",
  "bg-emerald-200/40",
];

const SHADOW_COLORS: string[] = [
  "shadow-primary/30",
  "shadow-secondary/30",
  "shadow-accent/30",
  "shadow-rose-400/30",
  "shadow-sky-400/30",
  "shadow-violet-400/30",
  "shadow-amber-400/30",
  "shadow-emerald-400/30",
];

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

type ProductImageProps = {
  src: string;
  alt: string;
  productId?: string;
  variant?: ProductImageVariant;
  sizes?: string;
  priority?: boolean;
  unoptimized?: boolean;
  hoverZoom?: boolean;
  className?: string;
  objectPosition?: string;
  fill?: boolean;
  /** إظهار المنتج مرفوعاً عن القاع بظل إهليلجي (تبدو الصورة كتعبئة ملونة) */
  pedestal?: boolean;
  /** إزالة الطبقات التزيينية (التوهج + التدرج العلوي) */
  noOverlay?: boolean;
};

export default function ProductImage({
  src,
  alt,
  productId = "",
  variant = "auto",
  sizes = "100vw",
  priority = false,
  unoptimized = false,
  hoverZoom = true,
  className = "",
  objectPosition = "center",
  pedestal = true,
  noOverlay = false,
}: ProductImageProps) {
  const seed = hashSeed(productId || src);
  const gradient = pick(GRADIENTS, seed);
  const glow = pick(GLOW_COLORS, seed);
  const shadow = pick(SHADOW_COLORS, seed);

  // Single shared normalization point for every image that flows through this
  // component. Absolute http(s) URLs are repaired (https: // and https:/// →
  // https://); local assets (/images/...) are passed through untouched.
  const safeSrc =
    typeof src === "string" && /^[a-z][a-z0-9+.-]*:\/\//i.test(src)
      ? normalizeImageURL(src) ?? src
      : src;

  if (variant === "soft") {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} ${className}`}>
        <Image
          src={safeSrc}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={unoptimized}
          className={`object-cover ${hoverZoom ? "transition-transform duration-500 ease-out-smooth group-hover:scale-110" : ""}`}
          style={{ objectPosition }}
        />
      </div>
    );
  }

  if (variant === "clean") {
    return (
      <Image
        src={safeSrc}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        className={`object-cover ${hoverZoom ? "transition-transform duration-500 ease-out-smooth group-hover:scale-110" : ""}`}
        style={{ objectPosition }}
      />
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${gradient} ${className} ${
        hoverZoom ? "transition-shadow duration-300 ease-out-smooth group-hover:shadow-2xl " + shadow : ""
      }`}
    >
      {!noOverlay && (
        <>
          {/* توهج ناعم خلف المنتج */}
          <div className={`pointer-events-none absolute start-1/2 top-1/2 h-3/5 w-3/5 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl ${glow} opacity-70 transition-opacity duration-500 group-hover:opacity-100`} />

          {/* لمعان علوي خفيف */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.95),transparent_55%)]" />
        </>
      )}

      {/* ظل إهليلجي يرسخ المنتج */}
      {pedestal && (
        <div className="pointer-events-none absolute bottom-[8%] left-1/2 h-[10%] w-[52%] -translate-x-1/2 rounded-[100%] bg-black/12 blur-md transition-all duration-500 ease-out-smooth group-hover:bottom-[6%] group-hover:bg-black/18 group-hover:blur-lg" />
      )}

      <Image
        src={safeSrc}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        className={`object-contain p-[6%] drop-shadow-[0_10px_14px_rgba(28,23,38,0.18)] ${
          hoverZoom ? "transition-transform duration-500 ease-out-smooth group-hover:scale-105" : ""
        }`}
        style={{ objectPosition }}
      />
    </div>
  );
}
