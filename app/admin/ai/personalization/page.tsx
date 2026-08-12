import type { Metadata } from "next";
import PersonalizationRules from "@/components/admin/ai/PersonalizationRules";

export const metadata: Metadata = {
  title: "التخصيص — الذكاء التجاري",
  description: "قواعد التخصيص وتخصيص التجربة حسب الشريحة",
};

export default function AdminAIPersonalizationPage() {
  return <PersonalizationRules />;
}
