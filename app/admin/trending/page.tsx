import type { Metadata } from "next";
import TrendingProductsAdmin from "@/components/admin/TrendingProductsAdmin";

export const metadata: Metadata = {
  title: "إدارة تصفحي حسب القسم",
  description: "لوحة تحكم متجر Luminous Derma — التحكم بمنتجات كل قسم في الصفحة الرئيسية",
};

export default function TrendingProductsAdminPage() {
  return <TrendingProductsAdmin />;
}
