import type { Metadata } from "next";
import WeeklyOffersAdmin from "@/components/admin/WeeklyOffersAdmin";

export const metadata: Metadata = {
  title: "لوحة التحكم — محرك العروض الأسبوعية | Luminous Derma",
  description: "إدارة محرك العروض الأسبوعية — تكوين الخصومات وتحديد المنتجات",
};

export default function AdminOffersPage() {
  return <WeeklyOffersAdmin />;
}

