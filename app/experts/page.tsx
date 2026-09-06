import type { Metadata } from "next";
import { Stethoscope } from "lucide-react";
import Container from "@/components/ui/Container";
import ExpertsGrid from "@/components/experts/ExpertsGrid";

export const metadata: Metadata = {
  title: "خبراء الجلدية - Luminous Derma",
  description: "تعرفي على فريقنا من أطباء الجلدية المتخصصين في Luminous Derma — استشاري خبراء العناية بالبشرة",
  alternates: { canonical: "https://luminousderma.com/experts" },
};

export default function ExpertsPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-foreground">
          <Stethoscope size={24} className="text-primary" />
          خبراء الجلدية
        </h1>
        <p className="mb-8 text-sm text-muted">تعرفي على فريقنا من أطباء الجلدية المتخصصين</p>
        <ExpertsGrid />
      </Container>
    </main>
  );
}
