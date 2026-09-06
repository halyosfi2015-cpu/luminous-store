"use client";

import { useState } from "react";
import { Cookie, X } from "lucide-react";
import { useConsent } from "@/src/lib/analytics/ConsentProvider";

export default function ConsentBanner() {
  const { ready, granted, grant, revoke } = useConsent();
  const [dismissed, setDismissed] = useState(false);
  const [prevGranted, setPrevGranted] = useState(granted);

  // Adjust state during render when consent changes (avoids cascading effect renders).
  if (prevGranted !== granted) {
    setPrevGranted(granted);
    if (granted === true) setDismissed(false);
  }

  if (!ready || granted !== null || dismissed) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-3 z-40 mx-auto w-[min(96%,720px)] rounded-card border border-border bg-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-card sm:p-4 sm:pb-4"
      dir="rtl"
      role="dialog"
      aria-live="polite"
      aria-label="إشعار خصوصية التحليلات"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-input bg-primary/10 text-primary">
          <Cookie size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-foreground">نحترم خصوصيتك</div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            نستخدم بيانات سلوكية مجهولة الهوية لتحسين تجربة التسوق وتخصيص المنتجات. لن يتم مشاركة بياناتك مع أطراف خارجية. يمكنك تغيير رأيك في أي وقت من إعدادات الخصوصية.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={grant}
              className="rounded-input bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              أوافق على التحليلات
            </button>
            <button
              type="button"
              onClick={() => {
                revoke();
                setDismissed(true);
              }}
              className="rounded-input border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted hover:bg-muted-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              رفض
            </button>
          </div>
        </div>
        <button
          type="button"
          aria-label="إغلاق"
          onClick={() => setDismissed(true)}
          className="rounded-full p-1 text-muted hover:bg-muted-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
