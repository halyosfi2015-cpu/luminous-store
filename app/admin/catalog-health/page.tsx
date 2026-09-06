import type { Metadata } from "next";
import CatalogHealthAdmin from "@/components/admin/CatalogHealthAdmin";

export const metadata: Metadata = {
  title: "صحة الكتالوج | Luminous Derma",
};

export default function AdminCatalogHealthPage() {
  return <CatalogHealthAdmin />;
}
