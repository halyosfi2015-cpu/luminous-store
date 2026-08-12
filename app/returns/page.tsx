import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, RotateCcw } from "lucide-react";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "الإرجاع والاستبدال - Luminous Derma",
  description: "تعرفي على سياسة الإرجاع والاستبدال في لومينوس ديرما. منتجات التجميل والعناية لا تُسترجع إلا عند وصولها تالفة، مع استرجاع منتجات الأجهزة في حالتها الأصلية.",
};

const sections = [
  {
    title: "لأن ثقتكم هي أساس ليومنيس ديرما",
    content: (
      <>
        <p>
          في <strong>ليومنيس ديرما</strong> نؤمن أن العناية بالبشرة مسؤولية قبل أن تكون عملية بيع، لذلك نحرص على أن تصل إليكم جميع المنتجات بحالة مثالية ومضمونة الجودة.
        </p>
        <p>
          ولحماية سلامتكم وسلامة جميع عملائنا، فإن منتجات العناية بالبشرة، ومستحضرات التجميل، والعطور، ومنتجات العناية الشخصية <strong>لا يمكن استرجاعها أو استبدالها بعد فتحها أو استخدامها</strong>، حتى وإن كانت بحالتها الجيدة.
        </p>
        <p className="font-semibold text-foreground">ويستثنى من ذلك المنتجات التي تصل إليكم:</p>
        <ul>
          <li>تالفة.</li>
          <li>بها عيب مصنعي.</li>
          <li>أو تم إرسال منتج مختلف عن طلبكم.</li>
        </ul>
        <p className="font-semibold text-foreground">أما الأجهزة والأدوات الكهربائية فيمكن استرجاعها أو استبدالها بشرط:</p>
        <ul>
          <li>أن تكون غير مستخدمة.</li>
          <li>بجميع ملحقاتها الأصلية.</li>
          <li>وفي عبوتها الأصلية.</li>
        </ul>
      </>
    ),
  },
  {
    title: "رسوم الاسترجاع",
    content: (
      <>
        <p className="font-semibold text-foreground">إذا كان سبب الاسترجاع يعود إلى:</p>
        <ul>
          <li>تغيير الرغبة بالشراء.</li>
          <li>أو اختيار منتج غير مناسب.</li>
        </ul>
        <p>فإن تكاليف الشحن يتحملها العميل، ويتم خصمها من قيمة الطلب المسترجع.</p>
        <p>أما إذا كان الخطأ من <strong>ليومنيس ديرما</strong> أو كان المنتج تالفًا أو مختلفًا عن الطلب، فإننا نتحمل كامل تكاليف الشحن والاستبدال.</p>
      </>
    ),
  },
  {
    title: "كيف أطلب الاستبدال أو الاسترجاع؟",
    content: (
      <>
        <p className="font-semibold text-foreground">يمكنكم التواصل مع فريق خدمة العملاء عبر:</p>
        <ul>
          <li>صفحة الطلبات داخل حسابكم.</li>
          <li>الواتساب.</li>
          <li>الهاتف.</li>
          <li>البريد الإلكتروني.</li>
        </ul>
        <p>وسيقوم فريقنا بمراجعة الحالة وإرشادكم إلى خطوات الاستبدال أو الاسترجاع بكل سرعة.</p>
      </>
    ),
  },
  {
    title: "مدة تقديم الطلب",
    content: (
      <>
        <p>يجب تقديم طلب الاستبدال أو الاسترجاع خلال <strong>7 أيام</strong> من تاريخ استلام الطلب.</p>
        <p>بعد هذه المدة يعتبر الطلب مستلمًا ومطابقًا للمواصفات.</p>
      </>
    ),
  },
  {
    title: "مدة معالجة الطلب",
    content: (
      <>
        <p>نعمل على إنهاء جميع طلبات الاستبدال أو الاسترجاع خلال <strong>3 إلى 7 أيام عمل</strong> بعد استلام المنتج والتحقق من حالته.</p>
        <p>وقد تختلف المدة قليلًا حسب شركة الشحن أو المنطقة.</p>
      </>
    ),
  },
  {
    title: "كيف يتم استرداد المبلغ؟",
    content: (
      <>
        <p>بعد استلام المنتج والتحقق من مطابقته لشروط الاسترجاع، يتم إعادة المبلغ بنفس وسيلة الدفع المستخدمة أو تحويله إلى رصيد العميل داخل المتجر، حسب طريقة الدفع الأصلية.</p>
      </>
    ),
  },
  {
    title: "في حالة الاستبدال",
    content: (
      <>
        <p>إذا كان سعر المنتج الجديد أعلى من المنتج السابق، يتم دفع فرق السعر فقط.</p>
        <p>أما إذا كان أقل، فيتم إعادة الفرق للعميل وفق وسيلة الدفع المناسبة.</p>
      </>
    ),
  },
  {
    title: "التزامنا لكم",
    content: (
      <>
        <p>في <strong>ليومنيس ديرما</strong> لا نبيع منتجًا فحسب، بل نبني علاقة طويلة مع عملائنا تقوم على الثقة والشفافية.</p>
        <p className="font-semibold text-foreground">ولهذا نلتزم دائمًا بـ:</p>
        <ul>
          <li>بيع منتجات أصلية 100%.</li>
          <li>تغليف احترافي وآمن.</li>
          <li>خدمة ما بعد البيع.</li>
          <li>دعم سريع لأي مشكلة تواجهكم.</li>
          <li>إيجاد الحل العادل الذي يحفظ حق العميل ويحافظ على جودة المنتجات.</li>
        </ul>
      </>
    ),
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
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">سياسة الاستبدال والاسترجاع</h1>
            <p className="text-sm font-semibold text-primary">لأن ثقتكم هي أساس ليومنيس ديرما</p>
          </div>

          {/* Policy sections */}
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.title} className="overflow-hidden rounded-card border border-border bg-card shadow-card">
                <div className="border-b border-border bg-primary/5 px-5 py-4">
                  <h3 className="text-sm font-bold text-foreground sm:text-base">{section.title}</h3>
                </div>
                <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-muted">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          {/* Closing */}
          <div className="mt-10 rounded-2xl bg-gradient-to-l from-primary to-secondary p-6 text-center text-white shadow-lg">
            <RotateCcw size={24} className="mx-auto mb-2 opacity-80" />
            <p className="text-base font-bold">في ليومنيس ديرما.. رضاؤكم هو هدفنا</p>
          </div>
        </div>
      </Container>
    </main>
  );
}
