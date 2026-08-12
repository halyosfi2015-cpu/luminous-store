import type { Metadata } from "next";
import PurchaseIntentCenter from "@/components/admin/ai/PurchaseIntentCenter";

export const metadata: Metadata = {
  title: "نية الشراء — الذكاء التجاري",
  description: "توزيع نية الشراء وإشارات العملاء",
};

export default function AdminAIPurchaseIntentPage() {
  return <PurchaseIntentCenter />;
}
