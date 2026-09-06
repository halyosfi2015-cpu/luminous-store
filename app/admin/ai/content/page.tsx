import type { Metadata } from "next";
import ContentCenter from "@/components/admin/content/ContentCenter";

export const metadata: Metadata = {
  title: "مركز المحتوى — نظرة عامة",
  description: "نظرة عامة على دورة حياة المحتوى وجدولة النشر",
};

export default function AdminContentCenterPage() {
  return <ContentCenter />;
}