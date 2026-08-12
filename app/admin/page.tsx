import type { Metadata } from "next";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "لوحة التحكم",
  description: "لوحة تحكم متجر Luminous Derma — نظرة عامة على بيانات المتجر",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
