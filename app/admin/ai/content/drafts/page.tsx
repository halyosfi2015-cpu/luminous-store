import type { Metadata } from "next";
import ContentItems from "@/components/admin/content/ContentItems";

export const metadata: Metadata = {
  title: "المسودات — مركز المحتوى",
  description: "المسودات بانتظار المراجعة",
};

export default function DraftsPage() {
  return <ContentItems initialStatus="REVIEW_REQUIRED" />;
}
