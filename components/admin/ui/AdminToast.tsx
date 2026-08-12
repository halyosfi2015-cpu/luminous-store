"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, Info, TriangleAlert } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
};

type AdminToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const AdminToastContext = createContext<AdminToastContextValue | null>(null);

const iconByType: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: TriangleAlert,
};

const styleByType: Record<ToastType, string> = {
  success: "bg-success-soft text-success-fg border border-success-border",
  error: "bg-error-soft text-error-fg border border-error-border",
  info: "bg-info-soft text-info-fg border border-info-border",
  warning: "bg-warning-soft text-warning-fg border border-warning-border",
};

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  return (
    <AdminToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex flex-col items-center gap-2 px-4">
        {toasts.map((item) => {
          const Icon = iconByType[item.type];
          return (
            <div
              key={item.id}
              role="status"
              className={`
                pointer-events-auto flex w-full max-w-md items-center gap-2.5
                rounded-card px-4 py-3 text-sm font-medium shadow-card
                ${styleByType[item.type]}
              `}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.message}</span>
            </div>
          );
        })}
      </div>
    </AdminToastContext.Provider>
  );
}

export function useAdminToast(): AdminToastContextValue {
  const ctx = useContext(AdminToastContext);
  if (!ctx) {
    throw new Error("useAdminToast must be used within AdminToastProvider");
  }
  return ctx;
}
