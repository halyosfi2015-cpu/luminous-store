import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "الشروط والأحكام - Luminous Derma",
  description: "اقرأ شروط وآليات استخدام موقع وخدمات لومينوس ديرما",
};

export default function TermsPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <nav aria-label="breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link>
            </li>
            <ChevronLeft size={14} className="text-muted" />
            <li className="font-medium text-foreground">الشروط والأحكام</li>
          </ol>
        </nav>

        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
              <FileText size={20} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">الشروط والأحكام</h1>
          </div>

          <p className="mb-6 text-sm text-muted">
            آخر تحديث: {new Date().toLocaleDateString("ar-YE")}
          </p>

          <div className="prose max-w-none text-sm text-muted">
            <p>
              باستخدامك لموقع لومينوس ديرما (luminousderma.com) أو تطبيقنا، فإنك تقبل هذه الشروط بشكل كامل. يرجى قراءتها بعناية قبل المتابعة.
            </p>
            <h3 className="mt-4 text-base font-semibold text-foreground">1. التسجيل وإنشاء الحساب</h3>
            <p>
              يجب أن تكون بصاحب السن القانوني (18 عامًا على الأقل) لإنشاء حساب. أنت مسؤول عن الحفاظ على سرية كلمة المرور وحسابك بشكل كامل.
            </p>
            <h3 className="mt-4 text-base font-semibold text-foreground">2. الأسعار والطلبات</h3>
            <ul>
              <li>جميع الأسعار مذكورة بالريال اليمني وتشمل ضريبة القيمة المضافة حسب التطبيق.</li>
              <li>نحتفظ بالحق في تعديل الأسعر في أي وقت، لكن ذلك لن يؤثر على الطلبيات التي تم تأكيدها بالفعل.</li>
              <li>نحتفظ بالحق في رفض أو إلغاء أي طلب بسبب خطأ في السعر أو أي سبب آخر.</li>
            </ul>
            <h3 className="mt-4 text-base font-semibold text-foreground">3. الشحن والتوصيل</h3>
            <p>
              توصيلنا يغطي جميع محافظات اليمن. تقديرات الأيام تعتمد على شركة الشحن وتوصيل المنتج.
            </p>
            <h3 className="mt-4 text-base font-semibold text-foreground">4. الملكية الفكرية</h3>
            <p>
              جميع العلامات التجارية، الشعارات، الصور، والمحتويات على الموقع ملك لـ لومينوس ديرما أو لأصحاب الحقوق الأصليين. يُمنع نسخ أو استخدامها دون إذن خطي.
            </p>
            <h3 className="mt-4 text-base font-semibold text-foreground">5. التغيير والإلغاء</h3>
            <p>
              نظرًا لطبيعة المنتجات، قد لا يتم قبول الإرجاع إذا كان المنتج مفتوحًا أو مستخدمًا. يرجى مراجعة سياسة الإرجاع للتفاصيل.
            </p>
            <h3 className="mt-4 text-base font-semibold text-foreground">6. التواصل بنا</h3>
            <p>
              إذا كان لديك أي سؤال حول هذه الشروط، يرجى التواصل معنا على info@luminousderma.com.
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}
