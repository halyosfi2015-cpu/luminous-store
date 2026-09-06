/**
 * TrustBadge — "أصلي 100%"
 *
 * Premium trust indicator for verified original products
 * sold by Luminous Derma.
 */

import { BadgeCheck } from "lucide-react";

type TrustBadgeProps = {
  /** Compact mode for product cards; default for detail page */
  compact?: boolean;
  className?: string;
};

export default function TrustBadge({ compact, className = "" }: TrustBadgeProps) {
  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground ${className}`}
        role="status"
        aria-label="منتج أصلي 100%"
      >
        <BadgeCheck size={12} className="shrink-0 text-blue-500" />
        أصلي 100%
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border border-border bg-muted-bg/50 px-3 py-2 ${className}`}
      role="status"
      aria-label="منتج أصلي 100%"
    >
      <BadgeCheck size={18} className="shrink-0 text-blue-500" />
      <span className="text-sm font-bold text-muted-foreground">أصلي 100%</span>
    </div>
  );
}
