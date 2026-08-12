import type { Metadata } from "next";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

export const metadata: Metadata = {
  title: "التحليلات",
  description: "تحليلات سلوك التجارة الإلكترونية لمتجر Luminous Derma",
};

export default function AdminAnalyticsPage() {
  return <AdminAnalytics />;
}
