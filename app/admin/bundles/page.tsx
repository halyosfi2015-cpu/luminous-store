import type { Metadata } from "next";
import BundlesAdmin from "@/components/admin/BundlesAdmin";

export const metadata: Metadata = {
  title: "لوحة التحكم — الباقات والهدايا | Luminous Derma",
  description: "إدارة الباقات وتغليف الهدايا ورسوم الخدمة",
};

export default function AdminBundlesPage() {
  return <BundlesAdmin />;
}
