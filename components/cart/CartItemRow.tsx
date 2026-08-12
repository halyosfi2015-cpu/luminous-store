"use client";

import { Trash2, Minus, Plus } from "lucide-react";
import Link from "next/link";
import type { CartItem } from "@/types/cart";
import { useCart } from "@/context/CartContext";

type CartItemRowProps = { item: CartItem };

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

export default function CartItemRow({ item }: CartItemRowProps) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="flex gap-4 border-b border-border pb-4 last:border-b-0 last:pb-0">
      <div className="h-20 w-20 shrink-0 rounded-card bg-muted-bg overflow-hidden" />
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/products/${item.slug}`}>
            <p className="text-sm font-medium text-foreground line-clamp-2 transition-colors hover:text-primary">
              {item.nameAr}
            </p>
          </Link>
          <button
            type="button"
            aria-label="إزالة"
            onClick={() => removeItem(item.productId)}
            className="shrink-0 text-muted transition-colors hover:text-error"
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center rounded-lg border border-border">
            <button
              type="button"
              aria-label="إنقاص الكمية"
              onClick={() => item.quantity > 1 && updateQuantity(item.productId, item.quantity - 1)}
              className="flex h-7 w-7 items-center justify-center text-muted transition-colors hover:bg-muted-bg"
            >
              <Minus size={12} />
            </button>
            <span className="flex h-7 w-8 items-center justify-center text-xs font-medium text-foreground tabular-nums">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label="زيادة الكمية"
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
              className="flex h-7 w-7 items-center justify-center text-muted transition-colors hover:bg-muted-bg"
            >
              <Plus size={12} />
            </button>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {formatPrice(item.price * item.quantity)} ر.ي
          </p>
        </div>
      </div>
    </div>
  );
}
