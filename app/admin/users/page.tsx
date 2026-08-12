import type { Metadata } from "next";
import UsersAdmin from "@/components/admin/UsersAdmin";

export const metadata: Metadata = {
  title: "لوحة التحكم — المستخدمون والأدوار | Luminous Derma",
  description: "إدارة أدوار المشرفين وصلاحياتهم",
};

export default function AdminUsersPage() {
  return <UsersAdmin />;
}
