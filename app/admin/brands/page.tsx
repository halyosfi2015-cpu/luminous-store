import type { Metadata } from "next";
import ResourcePage from "@/components/admin/ResourcePage";

export const metadata: Metadata = {
  title: "لوحة التحكم — العلامات التجارية | Luminous Derma",
  description: "قائمة العلامات التجارية المعتمدة",
};

export default function AdminBrandsPage() {
  return <ResourcePage resource="brands" />;
}
