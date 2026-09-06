import type { Metadata } from "next";
import TaxonomyAdmin from "@/components/admin/TaxonomyAdmin";

export const metadata: Metadata = {
  title: "تصنيف المنتجات",
  description: "لوحة تحكم متجر Luminous Derma — التصنيف الرئيسي للكتالوج",
};

export default function TaxonomyAdminPage() {
  return <TaxonomyAdmin />;
}