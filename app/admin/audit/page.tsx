import type { Metadata } from "next";
import AuditAdmin from "@/components/admin/AuditAdmin";

export const metadata: Metadata = {
  title: "سجل التدقيق | Luminous Derma",
};

export default function AdminAuditPage() {
  return <AuditAdmin />;
}
