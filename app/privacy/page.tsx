import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Shield } from "lucide-react";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "سياسة الخصوصية - Luminous Derma",
  description: "سياسة الخصوصية وحماية البيانات الخاصة بزوار وعملاء لومينوس ديرما",
};

export default function PrivacyPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <nav aria-label="breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link>
            </li>
            <ChevronLeft size={14} className="text-muted" />
            <li className="font-medium text-foreground">سياسة الخصوصية</li>
          </ol>
        </nav>

        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
              <Shield size={20} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">سياسة الخصوصية</h1>
          </div>

          <p className="mb-6 text-sm text-muted">
            آخر تحديث: {new Date().toLocaleDateString("ar-YE")}
          </p>

          <div className="prose max-w-none text-sm text-muted">
            <p>
              تلتزم لومينوس ديرما بحماية خصوصيتك. توضح هذه السياسة كيف نجمع، نستخدم، ونحمي المعلومات التي تقدمها أثناء استخدامك لموقعنا وخدماتنا.
            </p>
            <p>
              نحن نحترم خصوصيتك ونتخذ إجراءات أمنية مناسبة لحماية بياناتك الشخصية من التعديات غير المصرح بها أو الوصول غير المصرح به.
            </p>
            <h3 className="mt-4 text-base font-semibold text-foreground">المعلومات التي نجمعها</h3>
            <ul>
              <li>المعلومات الشخصية التي تقدمها عند التسجيل أو إتمام الطلب (الاسم، العنوان، رقم الهاتف، البريد الإلكتروني).</li>
              <li>بيانات الاستخدام (عن طريق ملفات تعريف الارتساء وتحليلات الاستخدام).</li>
            </ul>
            <h3 className="mt-4 text-base font-semibold text-foreground">استخدام المعلومات</h3>
            <ul>
              <li>لإكمال طلبك ومعالجته.</li>
              <li>للتواصل معك بشأن الطلب أو الدعم.</li>
              <li>لتحسين تجربة الموقع وتخصيص المحتوى.</li>
            </ul>
            <h3 className="mt-4 text-base font-semibold text-foreground">مشاركة المعلومات</h3>
            <p>
              لا نبيع أو نشارك بياناتك مع أي طرف ثالث باستثناء شركاء الشحن والخدمات اللازمة لإنجاز طلبك، وهم ملتزمون بسرية البيانات.
            </p>
            <h3 className="mt-4 text-base font-semibold text-foreground">حقوقك</h3>
            <p>
              لديك الحق في الوصول إلى بياناتك، تحديثها، أو حذفها. يمكنك التواصل معنا في أي وقت عبر info@luminousderma.com.
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}
