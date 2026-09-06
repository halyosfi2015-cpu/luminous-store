"use client";

import { AlertTriangle } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main dir="rtl" className="flex min-h-[60vh] items-center justify-center bg-neutral-50">
      <Container>
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertTriangle size={48} className="text-amber-500" />
          <h1 className="text-xl font-bold text-neutral-900">حدث خطأ</h1>
          <p className="text-sm text-neutral-500">عذراً، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.</p>
          {error?.digest && (
            <p className="text-xs text-muted">Digest: {error.digest}</p>
          )}
          <Button onClick={reset}>إعادة المحاولة</Button>
        </div>
      </Container>
    </main>
  );
}
