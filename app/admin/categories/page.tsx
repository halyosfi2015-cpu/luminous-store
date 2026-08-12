import type { Metadata } from "next";
import ResourcePage from "@/components/admin/ResourcePage";

export const metadata: Metadata = {
  title: "لوحة التحكم — التصنيفات | Luminous Derma",
  description: "قائمة تصنيفات المنتجات",
};

export default function AdminCategoriesPage() {
  return <ResourcePage resource="categories" />;
}
