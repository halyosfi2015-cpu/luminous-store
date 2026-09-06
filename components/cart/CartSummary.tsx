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

  const handleCheckout = () => {
    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.CHECKOUT_STARTED,
      properties: { item_count: totalItems, subtotal },
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
        <div className="flex items-center justify-between gap-3 text-muted">
          <span className="shrink-0">الشحن</span>
          <span className="text-end text-xs">يُحدَّد عند إتمام الطلب (صنعاء 700 / بقية المحافظات 1500)</span>
        </div>
        <div className="border-t border-border pt-2">
          <div className="flex justify-between font-semibold text-foreground">
            <span>المجموع</span>
            <span>{formatPrice(subtotal)} ر.ي</span>
          </div>
          <p className="mt-1 text-xs text-muted">المجموع لا يشمل التوصيل</p>
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
