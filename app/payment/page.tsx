import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, PiggyBank, Banknote, Wallet, Landmark, Store, Smartphone } from "lucide-react";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "طرق الدفع - Luminous Derma",
  description: "تعرفي على طرق الدفع المتاحة في لومينوس ديرما: الدفع عند الاستلام، تطبيقات الدفع الإلكتروني اليمنية مثل كريمي وفلوسك، والتحويل البنكي",
};

const paymentMethods = [
  {
    icon: PiggyBank,
    name: "الدفع عند الاستلام",
    desc: "ادفعي نقدًا عند استلام طلبك وتسليمه.",
  },
  {
    icon: Smartphone,
    name: "كريمي",
    desc: "ادفعي مباشرة عبر تطبيق كريمي (الكريمي) بسهولة وأمان.",
  },
  {
    icon: Wallet,
    name: "فلوسك",
    desc: "دفع فوري وآمن عبر محفظة فلوسك الإلكترونية.",
  },
  {
    icon: Landmark,
    name: "يمن والت",
    desc: "ادفعي عبر محفظة يمن والت للبريد اليمني من تطبيق جوالك.",
  },
  {
    icon: Store,
    name: "جيب",
    desc: "محفظة إلكترونية يمنية للدفع والتحويل بكل سهولة.",
  },
  {
    icon: Banknote,
    name: "التحويل البنكي",
    desc: "حوّلي قيمة طلبك إلى حسابنا البنكي مباشرة.",
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
