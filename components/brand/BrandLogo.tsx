"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Brand logo renderer with graceful fallback chain:
 *   1. Official logo image (when available and loads successfully)
 *   2. Premium typographic wordmark of the brand's ENGLISH name
 *
 * NOTE: this is a "Premium Brand Name Fallback", NOT an official logo.
 * It never invents symbols or claims to be the brand's real mark.
 */
export default function BrandLogo({
  src,
  nameEn,
  nameAr,
  sizes = "160px",
}: {
  src?: string | null;
  nameEn: string;
  nameAr?: string;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  const en = (nameEn || nameAr || "").trim();

  // Adaptive type scale — keeps long names inside the tile without clipping
  const wordSize =
    en.length <= 6
      ? "text-lg"
      : en.length <= 10
        ? "text-base"
        : en.length <= 16
          ? "text-sm"
          : en.length <= 24
            ? "text-xs"
            : "text-[10px]";

  if (showImage) {
    return (
      <Image
        src={src as string}
        alt={nameAr || nameEn}
        fill
        sizes={sizes}
        className="object-contain p-6 transition-transform duration-300 ease-spring group-hover:scale-110"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={nameAr || nameEn}
      data-brand-fallback="true"
      title={`${en} — brand name fallback`}
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-gray-50 p-4 text-center"
    >
      <span
        className={`max-w-full break-words font-bold uppercase leading-tight tracking-[0.12em] text-gray-400 transition-colors group-hover:text-primary/70 ${wordSize}`}
      >
        {en}
      </span>
    </div>
  );
}
