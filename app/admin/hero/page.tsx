import type { Metadata } from "next";
import HeroAdmin from "@/components/admin/HeroAdmin";

export const metadata: Metadata = {
  title: "لوحة التحكم — البانر الرئيسي | Luminous Derma",
  description: "إدارة محتوى البانر الرئيسي (Hero) في الصفحة الرئيسية",
};

export default function AdminHeroPage() {
  return <HeroAdmin />;
}

