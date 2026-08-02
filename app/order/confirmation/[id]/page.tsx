"use client";

import { useParams } from "next/navigation";
import { CheckCircle, Package, Star } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import type { Order } from "@/types/cart";
import Link from "next/link";
import { useLoyalty } from "@/context/LoyaltyContext";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const stored = typeof window !== "undefined" ? localStorage.getItem("luminous-orders") : null;
  const orders: Order[] = stored ? JSON.parse(stored) : [];
  const order = orders.find((o) => o.id === id);
  const { points } = useLoyalty();

  if (!order) {
    return (
      <main dir="rtl" className="min-h-screen bg-background py-8">
        <Container>
          <div className="flex flex-col items-center gap-4 py-20">
            <p className="text-lg font-medium text-muted">الطلب غير موجود</p>
            <Link href="/"><Button variant="outline">العودة للرئيسية</Button></Link>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <div className="mx-auto max-w-lg text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-soft">
              <CheckCircle size={40} className="text-success" />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">تم تأكيد الطلب!</h1>
          <p className="mb-1 text-sm text-muted">رقم الطلب: {order.id}</p>
          <p className="mb-8 text-sm text-muted">
            تم إرسال تأكيد الطلب إلى بريدك الإلكتروني. سنقوم بإعلامك عند الشحن.
          </p>

          {points > 0 && (
            <div className="mb-8 flex items-center gap-3 rounded-card border border-secondary/20 bg-secondary/5 p-4 text-start">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/15">
                <Star size={18} className="text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">رصيدك من نقاط المكافآت</p>
                <p className="text-xs text-muted">كسبتِ نقاطاً من هذا الطلب — استبدليها في طلبك القادم.</p>
              </div>
              <span className="shrink-0 text-lg font-bold text-secondary">{points.toLocaleString("ar-YE")}</span>
            </div>
          )}

          <div className="mb-8 rounded-card border border-border bg-card p-5 text-right shadow-card">
            <div className="mb-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{item.nameAr} × {item.quantity}</span>
                  <span className="text-sm font-medium">{formatPrice(item.price * item.quantity)} ر.ي</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 space-y-1">
              <div className="flex justify-between text-sm text-muted">
                <span>المجموع الفرعي</span>
                <span>{formatPrice(order.subtotal)} ر.ي</span>
              </div>
              <div className="flex justify-between text-sm text-muted">
                <span>الشحن</span>
                <span>{order.shipping === 0 ? "مجاني" : `${formatPrice(order.shipping)} ر.ي`}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold text-foreground">
                <span>المجموع</span>
                <span>{formatPrice(order.total)} ر.ي</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/account/orders">
              <Button variant="outline" className="gap-2 w-full">
                <Package size={16} />
                تتبع الطلب
              </Button>
            </Link>
            <Link href="/">
              <Button className="w-full">متابعة التسوق</Button>
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
