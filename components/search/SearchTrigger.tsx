"use client";

import { Search } from "lucide-react";
import { useSearch } from "@/context/SearchContext";
import { useLang } from "@/lib/use-lang";

type SearchTriggerProps = {
  variant?: "pill" | "icon";
  className?: string;
};

export default function SearchTrigger({ variant = "pill", className = "" }: SearchTriggerProps) {
  const { openSearch } = useSearch();
  const { lang } = useLang();
  const isAr = lang === "ar";

  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-label={isAr ? "بحث" : "Search"}
        onClick={openSearch}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-card transition-all duration-200 ease-out-smooth hover:bg-primary-light hover:shadow-card-hover active:scale-95 ${className}`}
      >
        <Search size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={isAr ? "بحث" : "Search"}
      onClick={openSearch}
      className={`group flex h-11 w-full items-center gap-3 rounded-full border border-border bg-muted-bg px-5 text-start text-sm text-muted transition-all duration-200 ease-out-smooth hover:border-primary/30 hover:bg-card hover:shadow-card focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/10 ${className}`}
    >
      <span className="flex-1 truncate">
        {isAr
          ? "ابحثي عن منتجاتك، ماركتك، أو تصنيفك المفضل..."
          : "Search for products, brands or categories..."}
      </span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-card transition-all duration-200 ease-out-smooth group-hover:bg-primary-light">
        <Search size={15} />
      </span>
    </button>
  );
}
