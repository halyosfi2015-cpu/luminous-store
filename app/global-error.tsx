"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar">
      <body className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <h1 className="text-xl font-bold text-neutral-900">حدث خطأ</h1>
          <p className="text-sm text-neutral-500">عذراً، حدث خطأ غير متوقع.</p>
          <button
            onClick={() => reset()}
            className="rounded-full bg-purple-800 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-900"
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
