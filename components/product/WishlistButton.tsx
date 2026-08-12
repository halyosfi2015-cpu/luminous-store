"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";

type WishlistButtonProps = {
  productId: string;
  className?: string;
  size?: number;
  iconOnly?: boolean;
};

export default function WishlistButton({
  productId,
  className = "",
  size = 16,
  iconOnly,
}: WishlistButtonProps) {
  const { toggle, isWishlisted } = useWishlist();
  const active = isWishlisted(productId);

  if (iconOnly) {
    return (
      <button
        type="button"
        aria-label={active ? "إزالة من المفضلة" : "أضف إلى المفضلة"}
        onClick={() => toggle(productId)}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${className} ${
          active
            ? "bg-secondary-50 text-secondary-500 shadow-card"
            : "bg-card/80 text-muted backdrop-blur-sm hover:bg-secondary-50 hover:text-secondary-500 shadow-card"
        }`}
      >
        <Heart size={size} fill={active ? "currentColor" : "none"} />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={active ? "إزالة من المفضلة" : "أضف إلى المفضلة"}
      onClick={() => toggle(productId)}
      className={`inline-flex items-center gap-1.5 rounded-button px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${className} ${
        active
          ? "bg-secondary-50 text-secondary-500 border border-secondary-200"
          : "bg-muted-bg/60 text-muted border border-border hover:bg-secondary-50 hover:text-secondary-500 hover:border-secondary-200"
      }`}
    >
      <Heart size={size} fill={active ? "currentColor" : "none"} />
      {active ? "في المفضلة" : "أضف للمفضلة"}
    </button>
  );
}
