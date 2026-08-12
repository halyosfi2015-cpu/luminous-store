import type { Metadata } from "next";
import RecommendationsCenter from "@/components/admin/ai/RecommendationsCenter";

export const metadata: Metadata = {
  title: "التوصيات — الذكاء التجاري",
  description: "أداء نظام التوصيات ومراقبة فعاليتها",
};

export default function AdminAIRecommendationsPage() {
  return <RecommendationsCenter />;
}
