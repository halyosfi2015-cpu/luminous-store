import type { Metadata } from "next";
import ProductsPageWithImage from "@/components/admin/ProductsPageWithImage";

export const metadata: Metadata = {
  title: "لوحة التحكم — المنتجات | Luminous Derma",
  description: "قائمة جميع منتجات المتجر",
};

export default function AdminProductsPage() {
  return <ProductsPageWithImage />;
}
