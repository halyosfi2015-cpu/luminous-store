import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, RotateCcw, Calendar, Package } from "lucide-react";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "الإرجاع والاستبدال - Luminous Derma",
  description: "تعرفي على سياسة الإرجاع والاستبدال في لومينوس ديرما. يمكنكِ إرجاع المنتجات خلال 14 يومًا من تاريخ الاستلام",
};

const steps = [
  {
    icon: Calendar,
    title: "تاريخ الإرجاع",
    desc: "لديك 14 يومًا من تاريخ الاستلام لإرجاع المنتج غير المستخدم.",
  },
  {
    icon: Package,
    title: "حالة المنتج",
    desc: "يجب أن يكون المنتج في حالة أصلية، غير مستخدم، ومع العبوة الأصلية.",
  },
  {
    icon: RotateCcw,
    title: "إجراء الإرجاع",
    desc: "اتصلي بفريق الدعم أو اتركي طلب إرجاع عبر حسابك.",
  },
];

export default function ReturnsPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <nav aria-label="breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link>
            </li>
            <ChevronLeft size={14} className="text-muted" />
            <li className="font-medium text-foreground">الإرجاع والاستبدال</li>
          </ol>
        </nav>

        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"> سياسة الإرجاع والاستبدال</h1>
          <p className="mb-8 text-sm text-muted">
            نحن نؤمن بأنكِ تستحقين منتجات تلبي طلباتكِ. يمكنكِ إرجاع أو استبدال المنتجات خلال 14 يومًا من تاريخ الاستلام.
          </p>

          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-5 text-center shadow-card"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon size={20} />
                  </span>
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="text-center text-xs text-muted">{step.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-4 text-sm text-muted">
            <p>• يجب أن يكون المنتج في حالته الأصلية غير المستخدمة، مع جميع العبوات والهدايا الأصلية.</p>
            <p>• لا يتم قبول الإرجاعات على المنتجات المفتوحة أو المستخدمة أو المهربة من العبوة الأصلية.</p>
            <p>• تكاليف الشحن للإرجاع تعاد سعرها من قيمة الإرجاع إذا كانت الإرجاع ناتجًا عن خطأ منا.</p>
            <p>• بعد استلام طلب الإرجاع، سيتم معالجة الاستبدال أو استرداد الأموال خلال 5 أيام عمل.</p>
          </div>
        </div>
      </Container>
    </main>
  );
}
