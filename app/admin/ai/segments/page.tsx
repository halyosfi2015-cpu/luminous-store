import type { Metadata } from "next";
import CustomerSegments from "@/components/admin/ai/CustomerSegments";

export const metadata: Metadata = {
  title: "شرائح العملاء — الذكاء التجاري",
  description: "شرائح العملاء الديناميكية وتوزيعهم",
};

export default function AdminAISegmentsPage() {
  return <CustomerSegments />;
}
