import type { Metadata } from "next";
import BrandForm from "@/components/admin/BrandForm";

export const metadata: Metadata = {
  title: "لوحة التحكم — إضافة علامة تجارية | Luminous Derma",
  description: "نموذج إنشاء علامة تجارية جديدة",
};

export default function AdminNewBrandPage() {
  return <BrandForm />;
}
