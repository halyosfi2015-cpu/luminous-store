import type { Metadata } from "next";
import ServicesAdmin from "@/components/admin/ServicesAdmin";

export const metadata: Metadata = {
  title: "إدارة الخدمات التجميلية | Luminous Derma",
};

export default function AdminServicesPage() {
  return <ServicesAdmin />;
}
