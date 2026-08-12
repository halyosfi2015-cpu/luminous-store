"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, ChevronLeft, Search } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import type { Order } from "@/types/cart";

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

export default function TrackOrderPage() {
  const { isLoggedIn } = useAuth();
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<Order | null>(null);
  const [searched, setSearched] = useState(false);
  const [myOrders] = useState<Order[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("luminous-orders");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(false);
    const id = orderId.trim().toUpperCase();
    const ph = phone.trim();
    try {
      const stored = localStorage.getItem("luminous-orders");
      const orders: Order[] = stored ? JSON.parse(stored) : [];
      // Match by order id (phone optional confirmation).
      const found = orders.find(
        (o) => o.id.toUpperCase() === id && (!ph || (o.address && o.address.phone && o.address.phone.trim() === ph))
      );
      setResult(found || null);
      setSearched(true);
    } catch {
      setResult(null);
      setSearched(true);
    }
  };

  const renderOrderCard = (order: Order) => (
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
  );

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center gap-3">
            <Link href="/" className="text-muted transition-colors hover:text-foreground">
              <ChevronLeft size={20} />
            </Link>
            <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Package size={20} className="text-primary" />
              تتبع الطلب
            </h1>
          </div>

          {/* Guest lookup — works for anyone, logged-in or not */}
          <div className="mb-6 rounded-card border border-border bg-card p-5 shadow-card">
            <h2 className="mb-3 text-sm font-semibold text-foreground">تتبع طلبك</h2>
            <form onSubmit={handleSearch} className="flex flex-col gap-3">
              <Input
                label="رقم الطلب"
                required
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="مثال: ORD-1234567890"
              />
              <Input
                label="رقم الجوال (اختياري للتأكيد)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                inputMode="tel"
              />
              <Button type="submit" className="gap-2">
                <Search size={16} />
                تتبع
              </Button>
            </form>

            {searched && !result && (
              <p className="mt-3 rounded-input border border-error/20 bg-error/5 p-3 text-center text-sm text-error-fg">
                لم يتم العثور على الطلب. تأكد من رقم الطلب ورقم الجوال.
              </p>
            )}
            {result && (
              <div className="mt-4">{renderOrderCard(result)}</div>
            )}
          </div>

          {/* Registered user — list my orders */}
          {isLoggedIn && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-foreground">طلباتي الأخيرة</h2>
              {myOrders.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-10">
                  <Package size={48} className="text-border-strong" />
                  <p className="text-muted">لا توجد طلبات بعد</p>
                  <Link href="/"><Button variant="outline">تسوق الآن</Button></Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {myOrders.map((order) => renderOrderCard(order))}
                </div>
              )}
            </div>
          )}

          {!isLoggedIn && (
            <p className="text-center text-xs text-muted">
              لديك حساب؟{" "}
              <Link href="/login" className="font-semibold text-primary underline">تسجيل الدخول</Link>
              {" "}لمشاهدة كل طلباتك.
            </p>
          )}
        </div>
      </Container>
    </main>
  );
}

