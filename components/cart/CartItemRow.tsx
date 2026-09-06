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
    <div className="flex gap-4 border-b border-border pb-4 last:border-b-0 last:pb-0">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-card bg-muted-bg">
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
              <p className="text-sm font-medium text-foreground line-clamp-2 transition-colors hover:text-primary">
                {item.nameAr}
              </p>
            </Link>
          ) : (
            <p className="text-sm font-medium text-foreground line-clamp-2">
              {item.nameAr}
            </p>
          )}
          <button
            type="button"
            aria-label="إزالة"
            onClick={() => removeItem(item.productId)}
            className="shrink-0 rounded-full p-2 text-muted transition-colors hover:text-error focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
              disabled={item.quantity <= 1}
              className="flex h-10 w-10 items-center justify-center text-muted transition-colors hover:bg-muted-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Minus size={12} />
            </button>
            <span className="flex h-10 w-10 items-center justify-center text-xs font-medium text-foreground tabular-nums">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label="زيادة الكمية"
              onClick={() => updateQuantity(item.productId, Math.min(99, item.quantity + 1))}
              disabled={item.quantity >= 99}
              className="flex h-10 w-10 items-center justify-center text-muted transition-colors hover:bg-muted-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-30"
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
