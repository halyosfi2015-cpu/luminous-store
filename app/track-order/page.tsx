"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, ChevronLeft, Search } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { createBrowserSupabaseClient } from "@/src/lib/supabase";

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

type OrderRow = { id: string; order_number: string; status: string; total: number; created_at: string };

export default function TrackOrderPage() {
  const { isLoggedIn, user } = useAuth();
  const [orderId, setOrderId] = useState("");
  const [result, setResult] = useState<OrderRow | null>(null);
  const [searched, setSearched] = useState(false);
  const [myOrders, setMyOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!isLoggedIn || !user) return;
    async function fetchMyOrders() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const { data: customer } = await supabase.from("customers" as never).select("id").eq("auth_id", session.user.id).single();
        if (!customer) return;
        const customerId = (customer as { id: string }).id;
        const { data } = await supabase
          .from("orders" as never)
          .select("id, order_number, status, total, created_at")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false });
        setMyOrders(data ?? []);
      } catch {
        setMyOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    }
    fetchMyOrders();
  }, [isLoggedIn, user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(false);
    const id = orderId.trim().toUpperCase();
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setResult(null); setSearched(true); return; }
      const { data: customer } = await supabase.from("customers" as never).select("id").eq("auth_id", session.user.id).single();
      if (!customer) { setResult(null); setSearched(true); return; }
      const customerId = (customer as { id: string }).id;
      const { data } = await supabase
        .from("orders" as never)
        .select("id, order_number, status, total, created_at")
        .eq("order_number", id)
        .eq("customer_id", customerId)
        .single();
      setResult(data as OrderRow | null);
      setSearched(true);
    } catch {
      setResult(null);
      setSearched(true);
    }
  };

  const renderOrderCard = (order: OrderRow) => (
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

          {/* Authenticated lookup */}
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
              <Button type="submit" className="gap-2">
                <Search size={16} />
                تتبع
              </Button>
            </form>

            {searched && !result && (
              <p role="alert" className="mt-3 rounded-input border border-error/20 bg-error/5 p-3 text-center text-sm text-error-fg">
                لم يتم العثور على الطلب. تأكد من رقم الطلب.
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
              {loadingOrders ? (
                <div role="status" className="flex flex-col items-center gap-4 py-10">
                  <Package size={48} className="text-border-strong" />
                  <p className="text-muted">جاري التحميل...</p>
                </div>
              ) : myOrders.length === 0 ? (
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

