"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import Button from "@/components/ui/Button";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

export default function CartSummary() {
  const { subtotal, totalItems } = useCart();
  const shipping = subtotal >= 50000 ? 0 : 5000;

  const handleCheckout = () => {
    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.CHECKOUT_STARTED,
      properties: { item_count: totalItems, subtotal, shipping },
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card">
      <h3 className="text-base font-semibold text-foreground">ملخص الطلب</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-muted">
          <span>المنتجات ({totalItems})</span>
          <span>{formatPrice(subtotal)} ر.ي</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>الشحن</span>
          <span>{shipping === 0 ? "مجاني" : `${formatPrice(shipping)} ر.ي`}</span>
        </div>
        <div className="border-t border-border pt-2">
          <div className="flex justify-between font-semibold text-foreground">
            <span>المجموع</span>
            <span>{formatPrice(subtotal + shipping)} ر.ي</span>
          </div>
          {shipping === 0 && (
            <p className="mt-1 text-xs text-success">تهانينا! الشحن مجاني</p>
          )}
        </div>
      </div>
      <Link href="/checkout" onClick={handleCheckout}>
        <Button className="w-full gap-2">
          <ShoppingBag size={16} />
          إتمام الطلب
        </Button>
      </Link>
    </div>
  );
}
