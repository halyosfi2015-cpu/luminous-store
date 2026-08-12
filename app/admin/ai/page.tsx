import type { Metadata } from "next";
import AIControlCenter from "@/components/admin/AIControlCenter";

export const metadata: Metadata = {
  title: "نظرة عامة — الذكاء التجاري",
  description: "مركز تحكم ذكاء اصطناعي للتجارة — نظرة عامة على أداء المتجر",
};

export default function AdminAIOverviewPage() {
  return <AIControlCenter />;
}
