import type { Metadata } from "next";
import BannersAdmin from "@/components/admin/BannersAdmin";

export const metadata: Metadata = {
  title: "لوحة التحكم — البانرات | Luminous Derma",
  description: "إدارة البانرات الإعلانية",
};

export default function AdminBannersPage() {
  return <BannersAdmin />;
}
