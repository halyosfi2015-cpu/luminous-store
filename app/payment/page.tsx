import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, CreditCard, ShieldCheck, Truck, PiggyBank } from "lucide-react";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "طرق الدفع - Luminous Derma",
  description: "تعرفي على طرق الدفع المتاحة في لومينوس ديرما بما في ذلك الدفع عند الاستلام، بطاقات الائتمان، وتطبيقات الدفع",
};

const paymentMethods = [
  {
    icon: PiggyBank,
    name: "الدفع عند الاستلام",
    desc: "ادفعي نقدًا عند استلام طلبيك وتوقيعه.",
  },
  {
    icon: CreditCard,
    name: "بطاقات الائتمان",
    desc: "نقبل Visa و Mastercard وجميع بطاقات الائتمان.",
  },
  {
    icon: ShieldCheck,
    name: "مدى",
    desc: "ادفعي مباشرة من حسابك المصرفي عبر تطبيق مدى.",
  },
  {
    icon: Truck,
    name: "Tabby",
    desc: "اختاري الدفع الأجر إنسباً وقسّمي الدفع على عدة دفعات.",
  },
  {
    icon: Truck,
    name: "Tamara",
    desc: "دفع آمن وسهل عبر تطبيق تمارا.",
  },
];

export default function PaymentPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <nav aria-label="breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link>
            </li>
            <ChevronLeft size={14} className="text-muted" />
            <li className="font-medium text-foreground">طرق الدفع</li>
          </ol>
        </nav>

        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">طرق الدفع المتاحة</h1>
          <p className="mb-8 text-sm text-muted">
            نقدم لكِ عدة خيارات دفع آمنة ومريحة لإنهاء طلبيك.
          </p>

          <div className="space-y-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <div
                  key={method.name}
                  className="flex items-center gap-4 rounded-card border border-border bg-card p-4 shadow-card"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
                    <Icon size={18} />
                  </span>
                  <div>
                    <h3 className="font-medium text-foreground">{method.name}</h3>
                    <p className="text-sm text-muted">{method.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </main>
  );
}
