import type { Metadata } from "next";
import ShippingAdmin from "@/components/admin/ShippingAdmin";

export const metadata: Metadata = {
  title: "لوحة التحكم — رسوم التوصيل | Luminous Derma",
  description: "إدارة رسوم التوصيل حسب المحافظة اليمنية",
};

export default function AdminShippingPage() {
  return <ShippingAdmin />;
}

