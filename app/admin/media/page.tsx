import type { Metadata } from "next";
import MediaAdmin from "@/components/admin/MediaAdmin";

export const metadata: Metadata = {
  title: "الوسائط | Luminous Derma",
};

export default function AdminMediaPage() {
  return <MediaAdmin />;
}
