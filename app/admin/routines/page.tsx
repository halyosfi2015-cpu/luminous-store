import type { Metadata } from "next";
import RoutinesAdmin from "@/components/admin/RoutinesAdmin";

export const metadata: Metadata = {
  title: "إدارة الروتينات | Luminous Derma",
  description: "إدارة الروتينات اليومية المتكاملة لمتجر Luminous Derma",
};

export default function AdminRoutinesPage() {
  return <RoutinesAdmin />;
}
