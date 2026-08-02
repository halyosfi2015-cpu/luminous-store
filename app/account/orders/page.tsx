"use client";

import Link from "next/link";
import { Package, ChevronLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import type { Order } from "@/types/cart";
import { redirect } from "next/navigation";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

const statusColors: Record<string, string> = {
  pending: "bg-warning-soft text-warning-fg",
  confirmed: "bg-primary/5 text-primary",
  shipped: "bg-accent/5 text-accent",
  delivered: "bg-success-soft text-success-fg",
  cancelled: "bg-error-soft text-error-fg",
};

export default function OrdersPage() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) { redirect("/login"); }

  const stored = typeof window !== "undefined" ? localStorage.getItem("luminous-orders") : null;
  const orders: Order[] = stored ? JSON.parse(stored) : [];

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center gap-3">
            <Link href="/account" className="text-muted transition-colors hover:text-foreground">
              <ChevronLeft size={20} />
            </Link>
            <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Package size={20} className="text-primary" />
              طلباتي
            </h1>
          </div>

          {orders.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <Package size={48} className="text-border-strong" />
              <p className="text-muted">لا توجد طلبات بعد</p>
              <Link href="/"><Button variant="outline">تسوق الآن</Button></Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {orders.map((order) => (
                <div key={order.id} className="rounded-card border border-border bg-card p-4 shadow-card">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-muted">{order.id}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[order.status] || statusColors.pending}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                  <p className="mb-1 text-sm text-muted">
                    {order.items.length} منتج — {formatPrice(order.total)} ر.ي
                  </p>
                  <p className="text-xs text-muted/70">
                    {new Date(order.createdAt).toLocaleDateString("ar-YE")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}
