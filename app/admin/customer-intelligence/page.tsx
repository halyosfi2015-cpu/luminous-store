import type { Metadata } from "next";
import CustomerIntelligenceAdmin from "@/components/admin/CustomerIntelligenceAdmin";

export const metadata: Metadata = {
  title: "ذكاء العملاء",
  description: "ملخص ذكاء العملاء لمتجر Luminous Derma",
};

export default function CustomerIntelligencePage() {
  return <CustomerIntelligenceAdmin />;
}
