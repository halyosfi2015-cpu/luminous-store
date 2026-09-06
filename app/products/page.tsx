import type { Metadata } from "next";
import { Suspense } from "react";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import { products } from "@/lib/products";
import { getServerProducts } from "@/src/lib/server-products";
import ProductGridSkeleton from "@/components/product/ProductGridSkeleton";

const CategoryContent = nextDynamic(() => import("@/components/product/CategoryContent"));

export const metadata: Metadata = {
  title: "كل المنتجات - Luminous Derma",
  description: "تصفحي تشكيلتنا الكاملة من العناية بالبشرة والشعر والمكياج والعطور ومنتجات الجسم",
  alternates: { canonical: "https://luminousderma.com/products" },
};

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const liveCatalog = await getServerProducts();
  const catalogProducts = liveCatalog.products.length > 0 ? liveCatalog.products : products;

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
          <p className="mt-1 text-xs text-muted/70">{catalogProducts.length} منتج</p>
        </div>

        <div className="mt-8 w-full">
          <Suspense fallback={<ProductGridSkeleton count={8} />}>
            <CategoryContent products={catalogProducts} />
          </Suspense>
        </div>
      </Container>
    </div>
  );
}
