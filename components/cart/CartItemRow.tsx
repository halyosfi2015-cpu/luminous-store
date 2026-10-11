"use client";

import { Trash2, Minus, Plus } from "lucide-react";
import Link from "next/link";
import type { CartItem } from "@/types/cart";
import { useCart } from "@/context/CartContext";
import ProductImage from "@/components/product/ProductImage";

type CartItemRowProps = { item: CartItem };

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

export default function CartItemRow({ item }: CartItemRowProps) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="flex gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0 sm:gap-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-card bg-muted-bg sm:h-20 sm:w-20">
        {item.image ? (
          <ProductImage
            src={item.image}
            alt={item.nameAr}
            productId={item.productId}
            variant="clean"
            hoverZoom={false}
            pedestal={false}
            sizes="80px"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          {item.kind === "product" ? (
            <Link href={`/products/${item.slug}`}>
              <p className="text-[13px] font-medium text-foreground line-clamp-2 break-words transition-colors hover:text-primary sm:text-sm">
                {item.nameAr}
              </p>
            </Link>
          ) : (
            <p className="text-[13px] font-medium text-foreground line-clamp-2 break-words sm:text-sm">
              {item.nameAr}
            </p>
          )}
          <button
            type="button"
            aria-label="إزالة"
            onClick={() => removeItem(item.productId)}
            className="shrink-0 rounded-full p-3 -m-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted transition-colors hover:text-error focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center rounded-lg border border-border">
            <button
              type="button"
              aria-label="إنقاص الكمية"
              onClick={() => item.quantity > 1 && updateQuantity(item.productId, item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center text-muted transition-colors hover:bg-muted-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Minus size={12} />
            </button>
            <span className="flex h-11 w-10 items-center justify-center text-xs font-medium text-foreground tabular-nums">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label="زيادة الكمية"
              onClick={() => updateQuantity(item.productId, Math.min(99, item.quantity + 1))}
              disabled={item.quantity >= 99}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center text-muted transition-colors hover:bg-muted-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus size={12} />
            </button>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            {formatPrice(item.price * item.quantity)} ر.ي
          </p>
        </div>
      </div>
    </div>
  );
}
