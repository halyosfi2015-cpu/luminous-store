import type { Metadata } from "next";
import ReportsAdmin from "@/components/admin/ReportsAdmin";

export const metadata: Metadata = {
  title: "لوحة التحكم — التقارير | Luminous Derma",
  description: "مؤشرات المتجر الرئيسية وملخص البيانات",
};

export default function AdminReportsPage() {
  return <ReportsAdmin />;
}
