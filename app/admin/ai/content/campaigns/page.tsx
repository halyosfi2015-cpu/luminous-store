import type { Metadata } from "next";
import ContentCampaigns from "@/components/admin/content/ContentCampaigns";

export const metadata: Metadata = {
  title: "مركز المحتوى — الحملات",
  description: "حملات المحتوى التسويقية",
};

export default function AdminContentCampaignsPage() {
  return <ContentCampaigns />;
}