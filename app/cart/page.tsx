"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import CartItemRow from "@/components/cart/CartItemRow";
import CartSummary from "@/components/cart/CartSummary";
import FreeShippingBar from "@/components/home/FreeShippingBar";
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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex min-w-0 items-center gap-2 text-[24px] break-words font-bold text-foreground sm:text-2xl">
            <ShoppingCart size={24} className="shrink-0 text-primary" />
            سلة التسوق
            {totalItems > 0 && <span className="text-base font-normal text-muted">({totalItems})</span>}
          </h1>
          <Link href="/" className="shrink-0 flex items-center gap-1 py-2 min-h-[44px] text-sm text-muted transition-colors hover:text-primary">
            <ArrowLeft size={16} />
            متابعة التسوق
          </Link>
        </div>

        {items.length > 0 && (
          <div className="mb-4 overflow-hidden rounded-2xl sm:hidden">
            <FreeShippingBar />
          </div>
        )}

        {items.length === 0 ? (
          <div role="status" className="flex flex-col items-center gap-4 py-20">
            <ShoppingCart size={64} className="text-muted/30" />
            <p className="text-lg font-medium text-muted">سلة التسوق فارغة</p>
            <Link href="/"><Button variant="outline">تسوق الآن</Button></Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-3 lg:col-span-2">
              <div className="rounded-card border border-border bg-card p-3 shadow-card sm:p-5">
                <div className="space-y-4">
                  {items.map((item) => <CartItemRow key={item.productId} item={item} />)}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 z-20 bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:top-6 lg:bottom-auto lg:self-start lg:bg-transparent lg:backdrop-blur-none lg:pb-0">
              <CartSummary />
            </div>
          </div>
        )}
      </Container>
    </main>
  );
}
