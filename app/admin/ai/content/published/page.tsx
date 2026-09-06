import type { Metadata } from "next";
import ContentPublished from "@/components/admin/content/ContentPublished";

export const metadata: Metadata = {
  title: "المنشور — مركز المحتوى",
  description: "المحتوى المنشور على الموقع مع الأداء",
};

export default function PublishedPage() {
  return <ContentPublished />;
}
