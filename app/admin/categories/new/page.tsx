import type { Metadata } from "next";
import CategoryForm from "@/components/admin/CategoryForm";

export const metadata: Metadata = {
  title: "لوحة التحكم — إضافة تصنيف | Luminous Derma",
  description: "نموذج إنشاء تصنيف جديد",
};

export default function AdminNewCategoryPage() {
  return <CategoryForm />;
}
