import type { Metadata } from "next";
import CampaignsCenter from "@/components/admin/ai/CampaignsCenter";

export const metadata: Metadata = {
  title: "الحملات — الذكاء التجاري",
  description: "إدارة ومراقبة الحملات التسويقية",
};

export default function AdminAICampaignsPage() {
  return <CampaignsCenter />;
}
