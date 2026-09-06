import type { Metadata } from "next";
import ProblemSolutionsAdmin from "@/components/admin/ProblemSolutionsAdmin";

export const metadata: Metadata = {
  title: "إدارة حلول المشاكل | Luminous Derma",
};

export default function AdminProblemSolutionsPage() {
  return <ProblemSolutionsAdmin />;
}