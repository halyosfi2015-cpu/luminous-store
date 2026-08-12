import type { Metadata } from "next";
import CustomerIntelligenceAdmin from "@/components/admin/CustomerIntelligenceAdmin";

export const metadata: Metadata = {
  title: "العملاء — الذكاء التجاري",
  description: "مراجعة عميقة لسلوك العملاء وتقييماتهم في Luminous Derma",
};

export default function AdminAICustomersPage() {
  return <CustomerIntelligenceAdmin />;
}
