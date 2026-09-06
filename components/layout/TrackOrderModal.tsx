"use client";

import { useState } from "react";
import { Package, X, Search, CheckCircle, Truck, Clock, XCircle } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useLang } from "@/lib/use-lang";
import { createBrowserSupabaseClient } from "@/src/lib/supabase";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

const statusLabels: Record<string, string> = {
  pending: "قيد المراجعة",
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

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock size={18} />,
  confirmed: <CheckCircle size={18} />,
  shipped: <Truck size={18} className="text-primary" />,
  delivered: <CheckCircle size={18} />,
  cancelled: <XCircle size={18} />,
};

const statusDescriptions: Record<string, string> = {
  pending: "طلبك قيد المراجعة وسيتم تأكيده قريباً.",
  confirmed: "تم تأكيد طلبك وسيتم تجهيزه.",
  shipped: "تم شحن طلبك وسيصلك قريباً.",
  delivered: "تم توصيل طلبك بنجاح.",
  cancelled: "تم إلغاء طلبك.",
};

type OrderRow = { id: string; order_number: string; status: string; total: number; created_at: string };
type OrderItemRow = { product_name_ar: string; quantity: number; unit_price: number; total_price: number };

export default function TrackOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [orderId, setOrderId] = useState("");
  const [result, setResult] = useState<{ order: OrderRow; items: OrderItemRow[] } | null>(null);
  const [searched, setSearched] = useState(false);

  if (!open) return null;

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
      const { data: orderData } = await supabase
        .from("orders" as never)
        .select("id, order_number, status, total, created_at")
        .eq("order_number", id)
        .eq("customer_id", customerId)
        .single();
      if (!orderData) { setResult(null); setSearched(true); return; }
      const orderRow = orderData as OrderRow;
      const { data: itemRows } = await supabase
        .from("order_items" as never)
        .select("product_name_ar, quantity, unit_price, total_price")
        .eq("order_id", orderRow.id);
      setResult({ order: orderRow, items: (itemRows ?? []) as OrderItemRow[] });
      setSearched(true);
    } catch {
      setResult(null);
      setSearched(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Package size={18} className="text-primary" />
            {isAr ? "تتبع الطلب" : "Track Order"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
            aria-label={isAr ? "إغلاق" : "Close"}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {!result ? (
            <>
              <p className="mb-3 text-sm leading-relaxed text-muted">
                {isAr
                  ? "أدخل رقم هاتفك ورقم الطلب لتتبّع حالة طلبك."
                  : "Enter your phone number and order number to track its status."}
              </p>
              <form onSubmit={handleSearch} className="flex flex-col gap-3">
                <Input
                  label={isAr ? "رقم الطلب" : "Order number"}
                  dir="ltr"
                  required
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder={isAr ? "مثال: ORD-1234567890" : "e.g. ORD-1234567890"}
                />
                <Button type="submit" className="gap-2">
                  <Search size={16} />
                  {isAr ? "تتبع الآن" : "Track now"}
                </Button>
              </form>

              {searched && !result && (
                <div className="mt-3 flex items-start gap-2 rounded-input border border-error/20 bg-error/5 p-3 text-sm text-error-fg">
                  <X size={16} className="mt-0.5 shrink-0" />
                  <span>
                    {isAr
                      ? "لم نعثر على طلب مطابق. تحقق من رقم الطلب وحاول مجدداً."
                      : "No matching order found. Please check your order number and try again."}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-card border border-border bg-background p-4">
              {/* Status */}
              <div className="mb-4 flex flex-col items-center gap-2 border-b border-border pb-4 text-center">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${statusColors[result.order.status] || statusColors.pending}`}>
                  {statusIcons[result.order.status] || statusIcons.pending}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColors[result.order.status] || statusColors.pending}`}>
                  {statusLabels[result.order.status] || result.order.status}
                </span>
                <p className="text-xs leading-relaxed text-muted">
                  {statusDescriptions[result.order.status] || statusDescriptions.pending}
                </p>
                <span className="text-[11px] font-semibold text-muted/80">
                  {result.order.order_number}
                </span>
              </div>

              {/* Items */}
              <div className="mb-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">{isAr ? "المنتجات" : "Items"}</p>
                {result.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="truncate ps-1 text-foreground">{item.product_name_ar} × {item.quantity}</span>
                    <span className="shrink-0 font-medium text-foreground">{formatPrice(item.total_price)} {isAr ? "ر.ي" : "YER"}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t border-border pt-3 text-sm">
                <div className="flex justify-between font-semibold text-foreground">
                  <span>{isAr ? "الإجمالي" : "Total"}</span>
                  <span>{formatPrice(result.order.total)} {isAr ? "ر.ي" : "YER"}</span>
                </div>
                <p className="mt-2 text-xs text-muted/70">
                  {new Date(result.order.created_at).toLocaleDateString("ar-YE")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setSearched(false);
                  setOrderId("");
                }}
                className="mt-4 w-full rounded-input border border-border py-2.5 text-sm font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                {isAr ? "تتبع طلب آخر" : "Track another order"}
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out both; }
        .animate-scale-in { animation: scale-in 0.25s ease-out both; }
      `}</style>
    </div>
  );
}
