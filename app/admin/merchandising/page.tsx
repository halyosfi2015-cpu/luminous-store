import type { Metadata } from "next";
import MerchandisingAdmin from "@/components/admin/MerchandisingAdmin";

export const metadata: Metadata = {
  title: "التسويق والترتيب | Luminous Derma",
};

export default function AdminMerchandisingPage() {
  return <MerchandisingAdmin />;
}
