import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Container from "@/components/ui/Container";

const CompareContent = dynamic(() => import("@/components/product/CompareContent"));

export const metadata: Metadata = {
  title: "مقارنة المنتجات - Luminous Derma",
  description: "قارني بين المنتجات واختاري الأنسب لبشرتك — مقارنة حتى 4 منتجات جنباً إلى جنب",
  alternates: { canonical: "https://luminousderma.com/compare" },
};

export default function ComparePage() {
  return (
    <div dir="rtl" className="w-full py-10">
      <Container>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">مقارنة المنتجات</h1>
        <p className="mt-1 text-sm text-muted">قارني حتى 4 منتجات جنباً إلى جنب</p>
        <div className="mt-8">
          <CompareContent />
        </div>
      </Container>
    </div>
  );
}
