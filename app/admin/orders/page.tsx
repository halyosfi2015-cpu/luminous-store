import type { Metadata } from "next";
import ResourcePage from "@/components/admin/ResourcePage";

export const metadata: Metadata = {
  title: "لوحة التحكم — الطلبات | Luminous Derma",
  description: "قائمة طلبات المتجر",
};

export default function AdminOrdersPage() {
  return <ResourcePage resource="orders" />;
}
