import type { Metadata } from "next";
import { AdminDataProvider } from "@/src/admin/AdminDataProvider";
import { AdminToastProvider } from "@/components/admin/ui/AdminToast";
import AdminShell from "@/components/admin/shell/AdminShell";

export const metadata: Metadata = {
  title: "لوحة التحكم",
  description: "لوحة تحكم متجر Luminous Derma",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminDataProvider>
      <AdminToastProvider>
        <AdminShell>{children}</AdminShell>
      </AdminToastProvider>
    </AdminDataProvider>
  );
}
