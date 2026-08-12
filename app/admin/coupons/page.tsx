import type { Metadata } from "next";
import CouponsAdmin from "@/components/admin/CouponsAdmin";

export const metadata: Metadata = {
  title: "لوحة التحكم — القسائم والخصومات | Luminous Derma",
  description: "إدارة كوبونات الخصم والعروض الترويجية",
};

export default function AdminCouponsPage() {
  return <CouponsAdmin />;
}
