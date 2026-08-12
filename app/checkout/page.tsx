"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, MapPin, Truck, LocateFixed, ChevronDown } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import GovernoratePicker from "@/components/checkout/GovernoratePicker";
import LocationModal from "@/components/checkout/LocationModal";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useLoyalty } from "@/context/LoyaltyContext";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";
import type { ShippingAddress } from "@/types/cart";
import type { Governorate } from "@/src/data/shipping";

type CurrencyCode = "YER" | "SAR";

const CURRENCIES: Record<CurrencyCode, { symbol: string; rate: number }> = {
  YER: { symbol: "ر.ي", rate: 1 },
  SAR: { symbol: "ر.س", rate: 1 / 84 },
};

function formatPrice(amount: number, code: CurrencyCode): string {
  const { symbol, rate } = CURRENCIES[code];
  return `${Math.round(amount * rate).toLocaleString("ar-YE")} ${symbol}`;
}

const compactInput = "!h-8 !px-2.5 !text-xs";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { isLoggedIn } = useAuth();
  const { addOrderPoints } = useLoyalty();
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: "", phone: "", city: "", district: "", street: "", building: "", notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>("YER");
  const [governorate, setGovernorate] = useState<Governorate | null>(null);
  const [location, setLocation] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const currencyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) setCurrencyOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.CHECKOUT_STARTED,
      properties: {
        item_count: items.length,
        subtotal,
      },
    });
  }, [items.length, subtotal]);

  const shipping = governorate ? governorate.fee : 0;
  const total = subtotal + shipping;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!governorate) {
      setShowLocation(true);
      return;
    }
    setIsSubmitting(true);
    const order = {
      id: `ORD-${Date.now()}`,
      items, subtotal, shipping, total,
      address: {
        ...address,
        city: governorate.name,
        notes: location ? `${location}${address.notes ? ` — ${address.notes}` : ""}` : address.notes,
      },
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };
    const stored = JSON.parse(localStorage.getItem("luminous-orders") || "[]");
    stored.unshift(order);
    localStorage.setItem("luminous-orders", JSON.stringify(stored));
    clearCart();
    addOrderPoints(total);
    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.PURCHASE_COMPLETED,
      entity_type: "order",
      entity_id: order.id,
      properties: { total, items: items.length },
    });
    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.CHECKOUT_COMPLETED,
      entity_type: "order",
      entity_id: order.id,
    });
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
    <main dir="rtl" className="min-h-screen bg-background py-6">
      <Container>
        <h1 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
          <CreditCard size={20} className="text-primary" />
          إتمام الطلب
        </h1>

        {!isLoggedIn && (
          <div className="mb-4 rounded-card border border-warning-border bg-warning-soft p-3 text-xs text-warning-fg">
            لديك حساب؟{" "}
            <Link href="/login" className="font-semibold underline">تسجيل الدخول</Link>
            {" "}لإتمام الطلب بشكل أسرع.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              {/* ===== Governorate selection ===== */}
              <div className="rounded-card border border-border bg-card p-3.5 shadow-card sm:p-4">
                <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Truck size={14} className="text-primary" />
                  اختر محافظة التوصيل
                </h2>
                <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
                  <GovernoratePicker value={governorate} onChange={setGovernorate} />
                  <button
                    type="button"
                    onClick={() => setShowLocation(true)}
                    className="flex items-center justify-center gap-1.5 rounded-input border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs font-bold text-primary transition-all hover:bg-primary/10 active:scale-[0.98]"
                  >
                    <LocateFixed size={13} />
                    تحديد الموقع
                  </button>
                </div>

                {location && (
                  <div className="mt-2.5 flex items-start gap-2 rounded-input border border-primary/15 bg-primary/5 px-2.5 py-2 animate-fade-in">
                    <MapPin size={12} className="mt-0.5 shrink-0 text-primary" />
                    <p className="text-xs leading-relaxed text-foreground">
                      <span className="font-bold text-primary">الموقع:</span> {location}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowLocation(true)}
                      className="ms-auto shrink-0 text-[10px] font-bold text-primary hover:underline"
                    >
                      تعديل
                    </button>
                  </div>
                )}

                {governorate && (
                  <div className="mt-2.5 flex items-center justify-between rounded-input border border-border bg-muted-bg/40 px-2.5 py-2 animate-fade-in">
                    <span className="text-xs text-muted">رسوم التوصيل إلى {governorate.name}</span>
                    <span className="text-sm font-bold text-success">
                      {governorate.fee === 0 ? "مجاني" : formatPrice(governorate.fee, currency)}
                    </span>
                  </div>
                )}
              </div>

              {/* ===== Compact address form ===== */}
              <div className="rounded-card border border-border bg-card p-3.5 shadow-card sm:p-4">
                <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MapPin size={14} className="text-primary" />
                  عنوان الشحن
                </h2>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="col-span-2">
                    <Input
                      label="الاسم الكامل"
                      required
                      value={address.fullName}
                      onChange={(e) => handleChange("fullName", e.target.value)}
                      autoComplete="name"
                      className={compactInput}
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
                      className={compactInput}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Input
                      label="المحافظة"
                      required
                      readOnly
                      value={governorate ? governorate.name : ""}
                      placeholder="اختر المحافظة أعلاه"
                      className={`${compactInput} cursor-not-allowed`}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Input
                      label="المنطقة / الحي"
                      required
                      value={address.district}
                      onChange={(e) => handleChange("district", e.target.value)}
                      className={compactInput}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Input
                      label="الشارع"
                      required
                      value={address.street}
                      onChange={(e) => handleChange("street", e.target.value)}
                      className={compactInput}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="رقم المبنى / معلم قريب"
                      value={address.building}
                      onChange={(e) => handleChange("building", e.target.value)}
                      className={compactInput}
                    />
                  </div>
                  <div className="col-span-2">
                    <Textarea
                      label="ملاحظات (اختياري)"
                      value={address.notes}
                      onChange={(e) => handleChange("notes", e.target.value)}
                      rows={1}
                    />
                  </div>
                </div>
              </div>

              {/* ===== Shipping method ===== */}
              <div className="rounded-card border border-border bg-card p-3.5 shadow-card sm:p-4">
                <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Truck size={14} className="text-primary" />
                  طريقة الشحن
                </h2>
                <label className="flex cursor-pointer items-center gap-3 rounded-input border border-primary/20 bg-primary/5 p-3">
                  <input type="radio" name="shipping" defaultChecked className="accent-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">شحن عادي</p>
                    <p className="text-xs text-muted">3-7 أيام عمل</p>
                  </div>
                  <span className="me-auto text-sm font-bold text-foreground">
                    {governorate
                      ? governorate.fee === 0 ? "مجاني" : formatPrice(governorate.fee, currency)
                      : "اختر المحافظة"}
                  </span>
                </label>
              </div>
            </div>

            {/* ===== Summary ===== */}
            <div className="lg:sticky lg:top-6 lg:self-start">
              <div className="flex flex-col gap-3.5 rounded-card border border-border bg-card p-3.5 shadow-card sm:p-4">
                <h3 className="text-sm font-semibold text-foreground">ملخص الطلب</h3>
                <div className="space-y-1.5 text-sm">
                  {items.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between text-muted">
                      <span className="truncate ps-2">{item.nameAr} × {item.quantity}</span>
                      <span className="shrink-0">{formatPrice(item.price * item.quantity, currency)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 border-t border-border pt-2.5 text-sm">
                  <div className="flex items-center justify-between text-muted">
                    <span>سعر المنتجات</span>
                    <div className="flex items-center gap-1.5" ref={currencyRef}>
                      <span className="font-medium">{formatPrice(subtotal, currency)}</span>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setCurrencyOpen(!currencyOpen)}
                          aria-expanded={currencyOpen}
                          aria-haspopup="listbox"
                          className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs font-bold transition-all duration-200 hover:border-primary/40"
                        >
                          {currency === "YER" ? "🇾🇪" : "🇸🇦"}
                          <ChevronDown size={11} className={`text-muted transition-transform duration-200 ${currencyOpen ? "rotate-180" : ""}`} />
                        </button>
                        {currencyOpen && (
                          <div className="absolute top-full end-0 z-20 mt-1.5 min-w-[140px] overflow-hidden rounded-xl border border-gray-100 bg-white p-1 shadow-xl shadow-primary/10 animate-slide-down">
                            {(["YER", "SAR"] as CurrencyCode[]).map((code) => (
                              <button
                                key={code}
                                type="button"
                                onClick={() => { setCurrency(code); setCurrencyOpen(false); }}
                                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-150 ${
                                  currency === code ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <span className="text-base">{code === "YER" ? "🇾🇪" : "🇸🇦"}</span>
                                <span>{code === "YER" ? "ريال يمني" : "ريال سعودي"}</span>
                                <span className="ms-auto text-[9px] font-bold text-muted">{CURRENCIES[code].symbol}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div key={shipping} className="flex justify-between text-muted animate-fade-in">
                    <span>رسوم التوصيل</span>
                    <span>
                      {governorate
                        ? governorate.fee === 0 ? "مجاني" : formatPrice(shipping, currency)
                        : "—"}
                    </span>
                  </div>
                  <div key={`total-${shipping}`} className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground animate-fade-in">
                    <span>المجموع النهائي</span>
                    <span className="text-primary">{formatPrice(total, currency)}</span>
                  </div>
                </div>

                <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                  <CreditCard size={14} />
                  {isSubmitting ? "جاري المعالجة..." : "تأكيد الطلب"}
                </Button>
                <p className="text-center text-[9px] text-muted">
                  الدفع عند الاستلام • كريمي • فلوسك • يمن والت
                </p>
              </div>
            </div>
          </div>
        </form>
      </Container>

      <LocationModal
        open={showLocation}
        onClose={() => setShowLocation(false)}
        onSave={(loc) => {
          setLocation(loc);
          setShowLocation(false);
        }}
        defaultQuery={governorate?.name || "اليمن"}
      />
    </main>
  );
}