"use client";

import { Loader2, Inbox, TriangleAlert, RotateCcw, ShieldAlert } from "lucide-react";
import Button from "@/components/ui/Button";

export function LoadingState({ label = "جارٍ التحميل..." }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 py-16 text-center"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium text-muted">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted-bg text-muted">
        <Inbox className="h-7 w-7" />
      </span>
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
    </div>
  );
}

export function ErrorState({
  title = "حدث خطأ أثناء التحميل",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-error-soft text-error">
        <TriangleAlert className="h-7 w-7" />
      </span>
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

export function AccessDeniedState({
  resourceLabel,
  onRecover,
}: {
  resourceLabel?: string;
  onRecover?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warning-soft text-warning-fg">
        <ShieldAlert className="h-7 w-7" />
      </span>
      <h3 className="text-base font-bold text-foreground">ليس لديك صلاحية الوصول</h3>
      <p className="max-w-sm text-sm text-muted">
        {resourceLabel
          ? `دورك الحالي لا يملك صلاحية عرض «${resourceLabel}».`
          : "دورك الحالي لا يملك صلاحية عرض هذه الصفحة."}
      </p>
      {onRecover && (
        <Button variant="outline" size="sm" onClick={onRecover}>
          <RotateCcw className="h-4 w-4" />
          العودة إلى مشرف عام
        </Button>
      )}
    </div>
  );
}
