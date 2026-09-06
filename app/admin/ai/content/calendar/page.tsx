import type { Metadata } from "next";
import ContentCalendar from "@/components/admin/content/ContentCalendar";

export const metadata: Metadata = {
  title: "مركز المحتوى — التقويم",
  description: "تقويم جدولة المحتوى عبر القنوات",
};

export default function AdminContentCalendarPage() {
  return <ContentCalendar />;
}