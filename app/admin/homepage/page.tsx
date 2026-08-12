import type { Metadata } from "next";
import HomepageAdmin from "@/components/admin/HomepageAdmin";

export const metadata: Metadata = {
  title: "لوحة التحكم — أقسام الصفحة الرئيسية | Luminous Derma",
  description: "إدارة أقسام الصفحة الرئيسية ومحتواها التسويقي",
};

export default function AdminHomepagePage() {
  return <HomepageAdmin />;
}
