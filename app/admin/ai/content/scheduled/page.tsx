import type { Metadata } from "next";
import ContentItems from "@/components/admin/content/ContentItems";

export const metadata: Metadata = {
  title: "المجدول — مركز المحتوى",
  description: "المحتوى المجدول للنشر",
};

export default function ScheduledPage() {
  return <ContentItems initialStatus="SCHEDULED" />;
}
