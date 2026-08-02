"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, MapPin, Truck } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useLoyalty } from "@/context/LoyaltyContext";
import type { ShippingAddress } from "@/types/cart";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { isLoggedIn } = useAuth();
  const { addOrderPoints } = useLoyalty();
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: "", phone: "", city: "", district: "", street: "", building: "", notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shipping = subtotal >= 50000 ? 0 : 5000;
  const total = subtotal + shipping;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setIsSubmitting(true);
    const order = {
      id: `ORD-${Date.now()}`,
      items, subtotal, shipping, total,
      address,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };
    const stored = JSON.parse(localStorage.getItem("luminous-orders") || "[]");
    stored.unshift(order);
    localStorage.setItem("luminous-orders", JSON.stringify(stored));
    clearCart();
    addOrderPoints(total);
    router.push(`/order/confirmation/${order.id}`);
  };

  const handleChange = (field: keyof ShippingAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  if (items.length === 0) {
    return (
      <main dir="rtl" className="min-h-screen bg-background py-8">
        <Container>
          <div className="flex flex-col items-center gap-4 py-20">
            <p className="text-lg font-medium text-muted">السلة فارغة</p>
            <Link href="/"><Button variant="outline">تسوق الآن</Button></Link>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-foreground">
          <CreditCard size={24} className="text-primary" />
          إتمام الطلب
        </h1>

        {!isLoggedIn && (
          <div className="mb-6 rounded-card border border-warning-border bg-warning-soft p-4 text-sm text-warning-fg">
            لديك حساب؟{" "}
            <Link href="/login" className="font-semibold underline">تسجيل الدخول</Link>
            {" "}لإتمام الطلب بشكل أسرع.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <div className="rounded-card border border-border bg-card p-5 shadow-card">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                  <MapPin size={18} className="text-primary" />
                  عنوان الشحن
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Input
                      label="الاسم الكامل"
                      required
                      value={address.fullName}
                      onChange={(e) => handleChange("fullName", e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Input
                      label="رقم الجوال"
                      required
                      value={address.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Input
                      label="المدينة"
                      required
                      value={address.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Input
                      label="المنطقة / الحي"
                      required
                      value={address.district}
                      onChange={(e) => handleChange("district", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Input
                      label="الشارع"
                      required
                      value={address.street}
                      onChange={(e) => handleChange("street", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Input
                      label="رقم المبنى"
                      value={address.building}
                      onChange={(e) => handleChange("building", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Textarea
                      label="ملاحظات (اختياري)"
                      value={address.notes}
                      onChange={(e) => handleChange("notes", e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-card border border-border bg-card p-5 shadow-card">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                  <Truck size={18} className="text-primary" />
                  طريقة الشحن
                </h2>
                <label className="flex cursor-pointer items-center gap-3 rounded-input border border-primary/20 bg-primary/5 p-4">
                  <input type="radio" name="shipping" defaultChecked className="accent-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">شحن عادي</p>
                    <p className="text-xs text-muted">3-5 أيام عمل</p>
                  </div>
                  <span className="me-auto text-sm font-medium text-foreground">
                    {shipping === 0 ? "مجاني" : `${formatPrice(shipping)} ر.ي`}
                  </span>
                </label>
              </div>
            </div>

            <div className="lg:sticky lg:top-6 lg:self-start">
              <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card">
                <h3 className="text-base font-semibold text-foreground">ملخص الطلب</h3>
                <div className="space-y-2 text-sm">
                  {items.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between text-muted">
                      <span className="truncate ps-2">{item.nameAr} × {item.quantity}</span>
                      <span className="shrink-0">{formatPrice(item.price * item.quantity)} ر.ي</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-muted">
                    <span>المجموع الفرعي</span>
                    <span>{formatPrice(subtotal)} ر.ي</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>الشحن</span>
                    <span>{shipping === 0 ? "مجاني" : `${formatPrice(shipping)} ر.ي`}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
                    <span>المجموع النهائي</span>
                    <span>{formatPrice(total)} ر.ي</span>
                  </div>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                  <CreditCard size={16} />
                  {isSubmitting ? "جاري المعالجة..." : "تأكيد الطلب"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Container>
    </main>
  );
}
