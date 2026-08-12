import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Truck, Clock, MapPin } from "lucide-react";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "الشحن والتوصيل - Luminous Derma",
  description: "تعرفي على سياسات الشحن والتوصيل في لومينوس ديرما. نحن نشحن إلى جميع أنحاء اليمن",
};

const shippingOptions = [
  {
    name: "توصيل عادي",
    time: "الأحد السبت - الخميس",
    cost: "مجاناً على الطلبات فوق 200 ر.ي",
    desc: "يتم توصيل الطلب خلال 3-5 أيام عمل",
  },
  {
    name: "توصيل سريع",
    time: "الأحد السبت - الخميس",
    cost: "50 ر.ي للطلبات تحت 200 ر.ي",
    desc: "يتم توصيل الطلب خلال 1-2 يوم عمل",
  },
];

export default function ShippingPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <nav aria-label="breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link>
            </li>
            <ChevronLeft size={14} className="text-muted" />
            <li className="font-medium text-foreground">الشحن والتوصيل</li>
          </ol>
        </nav>

        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"> سياسة الشحن والتوصيل</h1>
          <p className="mb-8 text-sm text-muted">
            نحن نشحن إلى جميع أنحاء اليمن باستخدام شركات شحن موثوقة.
          </p>

          <div className="mb-10 space-y-4">
            {shippingOptions.map((opt) => (
              <div
                key={opt.name}
                className="rounded-card border border-border bg-card p-5 shadow-card"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">{opt.name}</h3>
                  <span className="rounded-pill bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {opt.cost}
                  </span>
                </div>
                <p className="text-sm text-muted">{opt.desc}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                  <Clock size={12} />
                  <span>{opt.time}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <h3 className="font-medium text-foreground">الخدمة</h3>
                <p className="text-sm text-muted">نغطية شحن تشمل جميع محافظات اليمن بما في ذلك صنعاء، عدن، تعز، المكلا، والحديدة.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Truck size={20} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <h3 className="font-medium text-foreground">التغليف</h3>
                <p className="text-sm text-muted">جميع الطلشات تُغلف بعناية وتُرسل برمز تتبع لتتبع شحنتك.</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
