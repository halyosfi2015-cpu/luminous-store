"use client";

import Link from "next/link";
import { useLang } from "@/lib/use-lang";

export default function Logo({
  variant = "header",
  compact = false,
}: {
  variant?: "header" | "icon" | "footer" | "login";
  compact?: boolean;
}) {
  const { lang } = useLang();
  const isAr = lang === "ar";

  const getSrc = () => {
    if (compact) return "/images/logo/luminous-derma-icon-transparent.png";
    switch (variant) {
      case "header":
        return "/images/logo/luminous-derma-header-transparent.png";
      case "icon":
        return "/images/logo/luminous-derma-icon-transparent.png";
      case "footer":
        return "/images/logo/luminous-derma-footer-logo-transparent.png";
      case "login":
        return "/images/logo/luminous-derma-header-transparent.png";
      default:
        return "/images/logo/luminous-derma-header-transparent.png";
    }
  };

  const getSizes = () => {
    if (compact) return { h: "h-12 w-12", w: 48, h2: 48 };
    switch (variant) {
      case "footer":
        return { h: "h-20 w-auto", w: 300, h2: 80 };
      case "login":
        return { h: "h-20 w-auto", w: 280, h2: 80 };
      default:
        return { h: "h-20 w-auto", w: 280, h2: 80 };
    }
  };

  const src = getSrc();
  const sizes = getSizes();

  return (
    <Link
      href="/"
      aria-label={isAr ? "لومينوس ديرما" : "Luminous Derma"}
      className="flex items-center"
    >
      <img
        src={src}
        alt="Luminous Derma"
        className={sizes.h}
        width={sizes.w}
        height={sizes.h2}
      />
    </Link>
  );
}