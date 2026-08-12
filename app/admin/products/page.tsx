import type { Metadata } from "next";
import ResourcePage from "@/components/admin/ResourcePage";

export const metadata: Metadata = {
  title: "لوحة التحكم — المنتجات | Luminous Derma",
  description: "قائمة جميع منتجات المتجر",
};

export default function AdminProductsPage() {
  return <ResourcePage resource="products" />;
}
