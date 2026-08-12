"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import CartItemRow from "@/components/cart/CartItemRow";
import CartSummary from "@/components/cart/CartSummary";
import { useCart } from "@/context/CartContext";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";

export default function CartPage() {
  const { items, totalItems } = useCart();

  useEffect(() => {
    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.CART_VIEW,
      properties: { item_count: totalItems },
    });
  }, [totalItems]);

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ShoppingCart size={24} className="text-primary" />
            سلة التسوق
            {totalItems > 0 && <span className="text-base font-normal text-muted">({totalItems})</span>}
          </h1>
          <Link href="/" className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-primary">
            <ArrowLeft size={16} />
            متابعة التسوق
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <ShoppingCart size={64} className="text-muted/30" />
            <p className="text-lg font-medium text-muted">سلة التسوق فارغة</p>
            <Link href="/"><Button variant="outline">تسوق الآن</Button></Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-3 lg:col-span-2">
              <div className="rounded-card border border-border bg-card p-5 shadow-card">
                <div className="space-y-4">
                  {items.map((item) => <CartItemRow key={item.productId} item={item} />)}
                </div>
              </div>
            </div>
            <div className="lg:sticky lg:top-6 lg:self-start">
              <CartSummary />
            </div>
          </div>
        )}
      </Container>
    </main>
  );
}
