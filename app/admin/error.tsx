"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <div dir="rtl" className="flex min-h-[60vh] items-center justify-center bg-background p-8">
      <div className="max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg">
        <AlertTriangle size={48} className="mx-auto text-red-500" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">خطأ في لوحة التحكم</h1>
        <p className="mt-2 text-sm text-gray-500">
          حدث خطأ أثناء تحميل لوحة التحكم. يرجى المحاولة مرة أخرى.
        </p>
        {error?.message && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-red-50 p-4 text-right text-xs text-red-700">
            {error.message}
          </pre>
        )}
        {error?.digest && (
          <p className="mt-2 text-xs text-gray-400">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
