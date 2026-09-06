"use client";

import { useParams } from "next/navigation";
import { CheckCircle, Package, Star, MessageSquare } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import type { Order, CartItem, ShippingAddress } from "@/types/cart";
import Link from "next/link";
import { useLoyalty } from "@/context/LoyaltyContext";
import { useEffect, useRef, useState } from "react";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";
import { WHATSAPP_NUMBER } from "@/src/data/siteConfig";
import { createBrowserSupabaseClient } from "@/src/lib/supabase";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

type OrderRow = { id: string; order_number: string; status: string; subtotal: number; shipping_fee: number; total: number; shipping_address: Record<string, string>; source: string | null; created_at: string };
type OrderItemRow = { product_id: string | null; product_name_ar: string; quantity: number; unit_price: number; total_price: number };

function buildWhatsAppMessage(order: Order): string {
  const lines: string[] = [];
  lines.push("🛍️ طلب جديد — Luminous Derma");
  lines.push("");
  lines.push("👤 العميل:");
  lines.push(`الاسم: ${order.address.fullName}`);
  lines.push(`الهاتف: ${order.address.phone}`);
  lines.push(`المحافظة: ${order.address.city}`);
  lines.push(`العنوان: ${[order.address.district, order.address.street, order.address.building].filter(Boolean).join("، ") || "—"}`);
  if (order.address.notes) lines.push(`ملاحظات العنوان: ${order.address.notes}`);
  if (order.source) lines.push(`المصدر: ${order.source}`);
  lines.push("");
  lines.push("📦 المنتجات:");
  order.items.forEach((item, index) => {
    if (item.kind === "bundle" && item.bundle) {
      const b = item.bundle;
      lines.push(`${index + 1}. 🎁 ${item.nameAr} × ${item.quantity}`);
      lines.push(`   المنتجات داخل الباقة:`);
      b.items.forEach((bi, i) => {
        lines.push(`   ${i + 1}. ${bi.nameAr} × ${bi.quantity} — ${formatPrice(bi.price * bi.quantity)} ريال`);
      });
      lines.push(`   عدد المنتجات: ${b.items.length}`);
      if (b.discount > 0) {
        lines.push(`   السعر الأساسي: ${formatPrice(b.originalSubtotal)} ريال`);
        lines.push(`   خصم الباقة: ${b.discountPercent}% (-${formatPrice(b.discount)} ريال)`);
      }
      if (b.addons && b.addons.length > 0) {
        b.addons.forEach((a) => lines.push(`   الإضافات: ${a.labelAr} (+${formatPrice(a.price)} ريال)`));
      }
      if (b.giftMessage) {
        lines.push(`   رسالة الهدية: "${b.giftMessage}"`);
      }
      lines.push(`   سعر الباقة: ${formatPrice(item.price)} ريال`);
    } else if (item.kind === "routine" && item.bundle) {
      const b = item.bundle;
      const timeLabel = (t?: string) => (t === "morning" ? "صباحاً" : t === "evening" ? "مساءً" : "صباحاً ومساءً");
      lines.push(`${index + 1}. 💆‍♀️ ${item.nameAr} × ${item.quantity} (روتين)`);
      lines.push(`   المنتجات في الروتين:`);
      b.items.forEach((bi, i) => {
        lines.push(`   ${i + 1}. ${bi.nameAr} × ${bi.quantity} — ${formatPrice(bi.price * bi.quantity)} ريال`);
      });
      if (b.steps && b.steps.length > 0) {
        lines.push(`   خطوات الروتين:`);
        b.steps.forEach((s, i) => {
          const name = b.items.find((bi) => bi.productId === s.productId)?.nameAr;
          if (name) lines.push(`   ${i + 1}. ${name} — ${timeLabel(s.time)}`);
        });
      }
      if (b.discount > 0) {
        lines.push(`   السعر الأساسي: ${formatPrice(b.originalSubtotal)} ريال`);
        lines.push(`   خصم الروتين: ${b.discountPercent}% (-${formatPrice(b.discount)} ريال)`);
      }
      if (b.giftMessage) {
        lines.push(`   رسالة الهدية: "${b.giftMessage}"`);
      }
      lines.push(`   سعر الروتين: ${formatPrice(item.price)} ريال`);
    } else {
      lines.push(`${index + 1}. ${item.nameAr} × ${item.quantity} — ${formatPrice(item.price)} ريال / ${formatPrice(item.price * item.quantity)} ريال`);
    }
  });
  lines.push("");
  lines.push("🚚 التوصيل:");
  lines.push(`${order.address.city} — ${order.shipping === 0 ? "مجاني" : `${formatPrice(order.shipping)} ريال`}`);
  lines.push("");
  lines.push("💰 الإجمالي:");
  lines.push(`سعر المنتجات: ${formatPrice(order.subtotal)} ريال`);
  lines.push(`التوصيل: ${order.shipping === 0 ? "مجاني" : `${formatPrice(order.shipping)} ريال`}`);
  lines.push(`الإجمالي النهائي: ${formatPrice(order.total)} ريال`);
  if (order.address.notes) {
    lines.push("");
    lines.push("📝 ملاحظات العميل:");
    lines.push(order.address.notes);
  }
  lines.push("");
  lines.push(`📅 التاريخ: ${new Date(order.createdAt).toLocaleDateString("ar-YE")}`);
  lines.push(`رقم الطلب: ${order.id}`);
  lines.push("");
  lines.push("يرجى التواصل مع العميل لتأكيد الطلب وإرسال طريقة الدفع.");
  return encodeURIComponent(lines.join("\n"));
}

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const { points } = useLoyalty();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const trackedOrderRef = useRef<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      const supabase = createBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { data: customer } = await supabase
        .from("customers" as never)
        .select("id")
        .eq("auth_id", session.user.id)
        .single();
      if (!customer) { setLoading(false); return; }

      const customerId = (customer as { id: string }).id;

      const { data: orderRow } = await supabase
        .from("orders" as never)
        .select("id, order_number, status, subtotal, shipping_fee, total, shipping_address, source, created_at")
        .eq("order_number", id)
        .eq("customer_id", customerId)
        .single();
      if (!orderRow) { setLoading(false); return; }

      const row = orderRow as unknown as OrderRow;
      const { data: itemRows } = await supabase
        .from("order_items" as never)
        .select("product_id, product_name_ar, quantity, unit_price, total_price")
        .eq("order_id", row.id);

      const items: CartItem[] = (itemRows ?? []).map((ir: unknown) => {
        const item = ir as OrderItemRow;
        return {
          productId: item.product_id ?? "",
          slug: "",
          name: item.product_name_ar,
          nameAr: item.product_name_ar,
          price: item.unit_price,
          image: "",
          quantity: item.quantity,
          inStock: true,
        };
      });

      const addr = row.shipping_address ?? {};
      const shippingAddress: ShippingAddress = {
        fullName: addr.fullName ?? addr.full_name ?? "",
        phone: addr.phone ?? "",
        city: addr.city ?? "",
        district: addr.district ?? "",
        street: addr.street ?? "",
        building: addr.building ?? "",
        notes: addr.notes ?? "",
      };

      setOrder({
        id: row.order_number,
        items,
        subtotal: row.subtotal,
        shipping: row.shipping_fee,
        total: row.total,
        address: shippingAddress,
        status: row.status as Order["status"],
        createdAt: row.created_at,
        source: row.source ?? undefined,
      });
      setLoading(false);
    }
    fetchOrder().catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (order && trackedOrderRef.current !== order.id) {
      trackedOrderRef.current = order.id;
      trackClient({
        event_type: ANALYTICS_EVENT_TYPES.PURCHASE_COMPLETED,
        entity_type: "order",
        entity_id: order.id,
        properties: {
          order_id: order.id,
          total: order.total,
          subtotal: order.subtotal,
          shipping: order.shipping,
          item_count: order.items.length,
          items: order.items.map((item) => ({
            product_id: item.productId,
            name: item.nameAr,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      });
    }
  }, [order]);

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-background py-8">
        <Container>
          <div role="status" className="flex flex-col items-center gap-4 py-20">
            <Package size={48} className="text-border-strong" />
            <p className="text-muted">جاري التحميل...</p>
          </div>
        </Container>
      </main>
    );
  }

  if (!order) {
    return (
      <main dir="rtl" className="min-h-screen bg-background py-8">
        <Container>
          <div role="alert" className="flex flex-col items-center gap-4 py-20">
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
          {order.source && (
            <p className="mb-1 text-xs text-muted">المصدر: <span className="font-semibold text-primary">{order.source}</span></p>
          )}
          <p className="mb-8 text-sm text-muted">
            تم تسجيل طلبك بنجاح. سنقوم بالتواصل معك لتأكيده ومتابعة حالته.
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
                <div key={item.productId}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{item.kind === "bundle" ? "🎁 " : item.kind === "routine" ? "💆‍♀️ " : ""}{item.nameAr} × {item.quantity}</span>
                    <span className="text-sm font-medium">{formatPrice(item.price * item.quantity)} ر.ي</span>
                  </div>
                  {item.kind !== "product" && item.bundle && (
                    <div className="mt-1.5 rounded-xl bg-muted-bg/40 p-2.5 text-xs text-muted">
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {item.bundle.items.map((b) => (
                          <span key={b.productId}>• {b.nameAr} × {b.quantity}</span>
                        ))}
                      </div>
                      {item.kind === "routine" && item.bundle.steps && item.bundle.steps.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 opacity-80">
                          {item.bundle.steps.map((s) => (
                            <span key={s.productId}>
                              {s.time === "morning" ? "🌅" : s.time === "evening" ? "🌙" : "🕐"}
                              {item.bundle?.items.find((b) => b.productId === s.productId)?.nameAr || ""}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.bundle.discount > 0 && (
                        <div className="mt-1 flex justify-between font-semibold text-success">
                          <span>خصم ({item.bundle.discountPercent}%)</span>
                          <span>-{formatPrice(item.bundle.discount)} ر.ي</span>
                        </div>
                      )}
                      {item.bundle.deliveryFee !== undefined && (
                        <div className="mt-0.5 flex justify-between">
                          <span>التوصيل ({item.bundle.deliveryLabel})</span>
                          <span>{formatPrice(item.bundle.deliveryFee)} ر.ي</span>
                        </div>
                      )}
                      {item.bundle.giftMessage && (
                        <div className="mt-1 border-t border-border/60 pt-1">
                          <span className="font-semibold">💌 رسالة الإهداء:</span> {item.bundle.giftMessage}
                        </div>
                      )}
                    </div>
                  )}
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
             <a
               href={`https://wa.me/${WHATSAPP_NUMBER}?text=${buildWhatsAppMessage(order)}`}
               target="_blank"
               rel="noopener noreferrer"
               className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white shadow-lg shadow-[#25D366]/30 transition-all hover:bg-[#1ebe5b] active:scale-[0.98]"
             >
               <MessageSquare size={18} />
               إكمال الطلب عبر واتساب
             </a>
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
