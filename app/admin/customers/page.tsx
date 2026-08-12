import type { Metadata } from "next";
import ResourcePage from "@/components/admin/ResourcePage";

export const metadata: Metadata = {
  title: "لوحة التحكم — العملاء | Luminous Derma",
  description: "قائمة عملاء المتجر",
};

export default function AdminCustomersPage() {
  return <ResourcePage resource="customers" />;
}
