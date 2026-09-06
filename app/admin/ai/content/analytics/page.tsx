import type { Metadata } from "next";
import ContentAnalytics from "@/components/admin/content/ContentAnalytics";

export const metadata: Metadata = {
  title: "مركز المحتوى — الأداء",
  description: "أداء المحتوى المنشور والتحويلات",
};

export default function AdminContentAnalyticsPage() {
  return <ContentAnalytics />;
}