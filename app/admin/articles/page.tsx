import type { Metadata } from "next";
import ResourcePage from "@/components/admin/ResourcePage";

export const metadata: Metadata = {
  title: "لوحة التحكم — المقالات | Luminous Derma",
  description: "قائمة مقالات المدونة والمحتوى التعليمي",
};

export default function AdminArticlesPage() {
  return <ResourcePage resource="articles" />;
}
