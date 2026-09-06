import type { Metadata } from "next";
import LuminousStageAdmin from "@/components/admin/LuminousStageAdmin";

export const metadata: Metadata = {
  title: "لوحة التحكم — سلايدات الرئيسية | Luminous Derma",
  description: "إدارة سلايدات Luminous Stage: المنتجات، النصوص، الألوان، وإضافة سلايدات جديدة",
};

export default function AdminLuminousStagePage() {
  return <LuminousStageAdmin />;
}
