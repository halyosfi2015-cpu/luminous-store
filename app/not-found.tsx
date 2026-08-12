import Link from "next/link";
import { FileSearch } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main dir="rtl" className="flex min-h-[60vh] items-center justify-center bg-neutral-50">
      <Container>
        <div className="flex flex-col items-center gap-4 text-center">
          <FileSearch size={48} className="text-neutral-300" />
          <h1 className="text-xl font-bold text-neutral-900">الصفحة غير موجودة</h1>
          <p className="text-sm text-neutral-500">عذراً، الصفحة التي تبحثين عنها غير متوفرة.</p>
          <Link href="/">
            <Button>العودة للرئيسية</Button>
          </Link>
        </div>
      </Container>
    </main>
  );
}
