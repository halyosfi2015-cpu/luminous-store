import type { Metadata } from "next";
import BundlePricingAdmin from "@/components/admin/BundlePricingAdmin";

export const metadata: Metadata = {
  title: "لوحة التحكم — خصومات الباقات | Luminous Derma",
  description: "إدارة خصومات وتسعير الباقات",
};

export default function AdminBundlePricingPage() {
  return <BundlePricingAdmin />;
}