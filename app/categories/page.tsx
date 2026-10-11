import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import CategoryDrilldown from "@/components/category/CategoryDrilldown";
import CategoryShowcase from "@/components/category/CategoryShowcase";
import { getTaxonomyNavTree } from "@/src/lib/taxonomy";

export const metadata: Metadata = {
  title: "جميع الأقسام - Luminous Derma",
  description: "تصفحي جميع أقسام لومينوس ديرما من العناية بالبشرة والشعر والجسم والمكياج والعطور",
  alternates: { canonical: "https://luminousderma.com/categories" },
};

export default function CategoriesPage() {
  const nav = getTaxonomyNavTree();

  return (
    <div dir="rtl" className="w-full pb-16">
      <Container>
        <nav aria-label="breadcrumb" className="pt-4">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link>
            </li>
            <ChevronLeft size={14} className="text-muted" />
            <li className="font-medium text-foreground">جميع الأقسام</li>
          </ol>
        </nav>

        <div className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">جميع الأقسام</h1>
          <p className="mt-1 text-sm text-muted">اكتشفي كل الأقسام والتشكيلات التي تقدمها لومينوس ديرما</p>
        </div>

        <div className="hidden sm:block">
          <CategoryDrilldown tree={nav} showCounts={false} />
        </div>
        <CategoryShowcase tree={nav} />
      </Container>
    </div>
  );
}