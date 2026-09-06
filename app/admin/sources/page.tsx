import type { Metadata } from "next";
import SourcesAdmin from "@/components/admin/SourcesAdmin";

export const metadata: Metadata = {
  title: "المصادر | Luminous Derma",
};

export default function AdminSourcesPage() {
  return <SourcesAdmin />;
}
