import type { Metadata } from "next";
import ContentSettings from "@/components/admin/content/ContentSettings";

export const metadata: Metadata = {
  title: "مركز المحتوى — الإعدادات",
  description: "إعدادات التشغيل الآلي والجدولة والتحقق",
};

export default function AdminContentSettingsPage() {
  return <ContentSettings />;
}