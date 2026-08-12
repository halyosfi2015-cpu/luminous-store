import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, HelpCircle, Truck, CreditCard, RotateCcw } from "lucide-react";
import Container from "@/components/ui/Container";
import { faqs } from "@/lib/faq";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة - Luminous Derma",
  description: "تعرفي على إجابات الأسئلة الشائعة حول الطلبات، الشحن، الإرجاع، والدفع في لومينوس ديرما",
  alternates: { canonical: "https://luminousderma.com/faq" },
};

const iconMap = {
  truck: Truck,
  credit: CreditCard,
  rotate: RotateCcw,
};

export default function FaqPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <nav aria-label="breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link>
            </li>
            <ChevronLeft size={14} className="text-muted" />
            <li className="font-medium text-foreground">الأسئلة الشائعة</li>
          </ol>
        </nav>

        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <HelpCircle size={14} />
              المساعدة
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">الأسئلة الشائعة</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              إجابات على أكثر الأسئلة المطروحة حول خدماتنا
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const Icon = faq.icon ? iconMap[faq.icon] : HelpCircle;
              return (
                <details
                  key={index}
                  className="group rounded-card border border-border bg-card p-4 shadow-card transition-all duration-200 ease-out-smooth open:border-primary/50 open:bg-primary/[3%]"
                >
                  <summary className="flex items-center gap-3 cursor-pointer list-none">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
                      <Icon size={16} />
                    </span>
                    <span className="font-medium text-foreground">{faq.question}</span>
                    <ChevronLeft
                      size={16}
                      className="mr-auto text-muted transition-transform duration-200 group-open:rotate-90"
                    />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {faq.answer}
                  </p>
                </details>
              );
            })}
          </div>
        </div>
      </Container>
    </main>
  );
}
