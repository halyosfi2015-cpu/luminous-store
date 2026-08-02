"use client";

import { Scale } from "lucide-react";
import { useCompare } from "@/context/CompareContext";

type CompareButtonProps = {
  productId: string;
  className?: string;
  size?: number;
  iconOnly?: boolean;
};

export default function CompareButton({
  productId,
  className = "",
  size = 16,
  iconOnly,
}: CompareButtonProps) {
  const { toggle, isCompared, isFull } = useCompare();
  const active = isCompared(productId);

  const handleClick = () => {
    if (!active && isFull) return;
    toggle(productId);
  };

  if (iconOnly) {
    return (
      <button
        type="button"
        aria-label={active ? "إزالة من المقارنة" : "أضف إلى المقارنة"}
        onClick={handleClick}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${className} ${
          active
            ? "bg-primary/10 text-primary shadow-card"
            : "bg-card/80 text-muted backdrop-blur-sm hover:bg-primary/5 hover:text-primary shadow-card"
        } ${!active && isFull ? "cursor-not-allowed opacity-40" : ""}`}
      >
        <Scale size={size} />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={active ? "إزالة من المقارنة" : "أضف إلى المقارنة"}
      onClick={handleClick}
      disabled={!active && isFull}
      className={`inline-flex items-center gap-1.5 rounded-button px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${className} ${
        active
          ? "bg-primary/10 text-primary border border-primary/20"
          : "bg-muted-bg/60 text-muted border border-border hover:bg-primary/5 hover:text-primary hover:border-primary/20"
      } ${!active && isFull ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <Scale size={size} />
      {active ? "في المقارنة" : "مقارنة"}
    </button>
  );
}
