import type { Metadata } from "next";
import QuizResultsAdmin from "@/components/admin/QuizResultsAdmin";

export const metadata: Metadata = {
  title: "لوحة التحكم — تشخيص البشرة | Luminous Derma",
  description: "نتائج اختبار تشخيص البشرة وعملاء متوقعون",
};

export default function AdminQuizResultsPage() {
  return <QuizResultsAdmin />;
}
