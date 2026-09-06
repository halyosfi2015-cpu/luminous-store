import type { Metadata } from "next";
import ContentIdeas from "@/components/admin/content/ContentIdeas";

export const metadata: Metadata = {
  title: "مركز المحتوى — الأفكار",
  description: "أفكار المحتوى المقترحة من مخطط المحتوى",
};

export default function AdminContentIdeasPage() {
  return <ContentIdeas />;
}