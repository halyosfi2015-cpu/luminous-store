import type { Metadata } from "next";
import GiftOptionsAdmin from "@/components/admin/GiftOptionsAdmin";

export const metadata: Metadata = {
  title: "لوحة التحكم — خيارات الهدايا | Luminous Derma",
  description: "إدارة الإضافات الاختيارية للهدايا والباقات",
};

export default function AdminGiftOptionsPage() {
  return <GiftOptionsAdmin />;
}
