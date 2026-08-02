import type { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import { products } from "@/lib/products";

const CategoryContent = dynamic(() => import("@/components/product/CategoryContent"));

export const metadata: Metadata = {
  title: "كل المنتجات - Luminous Derma",
  description: "تصفحي تشكيلتنا الكاملة من العناية بالبشرة والشعر والمكياج والعطور ومنتجات الجسم",
};

export default function ProductsPage() {
  return (
    <div dir="rtl" className="w-full pb-16">
      <Container>
        <nav aria-label="breadcrumb" className="pt-4">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link>
            </li>
            <ChevronLeft size={14} className="text-muted" />
            <li className="font-medium text-foreground">كل المنتجات</li>
          </ol>
        </nav>

        <div className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">كل المنتجات</h1>
          <p className="mt-1 text-sm text-muted">تصفحي تشكيلتنا الكاملة من العناية بالبشرة والجمال</p>
          <p className="mt-1 text-xs text-muted/70">{products.length} منتج</p>
        </div>

        <div className="mt-8 w-full">
          <Suspense fallback={null}>
            <CategoryContent products={products} />
          </Suspense>
        </div>
      </Container>
    </div>
  );
}
