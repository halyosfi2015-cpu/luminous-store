import type { Metadata } from "next";
import AISettings from "@/components/admin/ai/AISettings";

export const metadata: Metadata = {
  title: "إعدادات الذكاء — الذكاء التجاري",
  description: "إعدادات تشغيل وإيقاف أنظمة الذكاء الاصطناعي",
};

export default function AdminAISettingsPage() {
  return <AISettings />;
}
