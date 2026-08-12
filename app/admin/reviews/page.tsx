import type { Metadata } from "next";
import ReviewsAdmin from "@/components/admin/ReviewsAdmin";

export const metadata: Metadata = {
  title: "لوحة التحكم — التقييمات والمراجعات | Luminous Derma",
  description: "إدارة ومراجعة تقييمات العملاء على المنتجات",
};

export default function AdminReviewsPage() {
  return <ReviewsAdmin />;
}
