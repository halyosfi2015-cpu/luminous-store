"use client";

import Link from "next/link";
import { Package, ChevronLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/src/lib/supabase";
import { redirect } from "next/navigation";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

const statusLabels: Record<string, string> = {
  pending: "جديد",
  awaiting_review: "بانتظار المراجعة",
  contacted: "تم التواصل",
  confirmed: "تم التأكيد",
  awaiting_payment: "بانتظار الدفع",
  paid: "مدفوع",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

const statusColors: Record<string, string> = {
  pending: "bg-warning-soft text-warning-fg",
  awaiting_review: "bg-warning-soft text-warning-fg",
  contacted: "bg-primary/5 text-primary",
  confirmed: "bg-primary/5 text-primary",
  awaiting_payment: "bg-warning-soft text-warning-fg",
  paid: "bg-accent/5 text-accent",
  processing: "bg-accent/5 text-accent",
  shipped: "bg-accent/5 text-accent",
  delivered: "bg-success-soft text-success-fg",
  cancelled: "bg-error-soft text-error-fg",
};

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  created_at: string;
}

export default function OrdersPage() {
  const { isLoggedIn, user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  if (!isLoggedIn) { redirect("/login"); }

  useEffect(() => {
    async function fetchOrders() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

      const authUserId = session.user.id;

      const { data: customer } = await supabase
        .from("customers" as never)
        .select("id")
        .eq("auth_id", authUserId)
        .single();
      if (!customer) { setLoading(false); return; }

      const customerId = (customer as { id: string }).id;

      const { data } = await supabase
        .from("orders" as never)
        .select("id, order_number, status, subtotal, shipping_fee, total, created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

        setOrders(data ?? []);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders().catch(() => setLoading(false));
  }, [user]);

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

          {loading ? (
            <div role="status" className="flex flex-col items-center gap-4 py-16">
              <Package size={48} className="text-border-strong" />
              <p className="text-muted">جاري التحميل...</p>
            </div>
          ) : orders.length === 0 ? (
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
                    <span className="text-xs text-muted">{order.order_number}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[order.status] || statusColors.pending}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                  <p className="mb-1 text-sm text-muted">
                    {formatPrice(order.total)} ر.ي
                  </p>
                  <p className="text-xs text-muted/70">
                    {new Date(order.created_at).toLocaleDateString("ar-YE")}
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
