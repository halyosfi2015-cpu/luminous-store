import type { Metadata } from "next";
import ProductForm from "@/components/admin/ProductForm";

export const metadata: Metadata = {
  title: "لوحة التحكم — إضافة منتج | Luminous Derma",
  description: "نموذج إنشاء منتج جديد وفق بنية المنتجات في المتجر",
};

export default function AdminNewProductPage() {
  return <ProductForm />;
}
