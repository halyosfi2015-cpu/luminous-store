import type { Metadata } from "next";
import ContentItems from "@/components/admin/content/ContentItems";

export const metadata: Metadata = {
  title: "مركز المحتوى — المحتوى",
  description: "إدارة دورة حياة المحتوى: مراجعة، اعتماد، جدولة، نشر",
};

export default function AdminContentItemsPage() {
  return <ContentItems />;
}