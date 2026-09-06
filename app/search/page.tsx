import type { Metadata } from "next";
import { Suspense } from "react";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import { productSummaries } from "@/src/data/product-summaries";
import { getServerProducts } from "@/src/lib/server-products";
import ProductGridSkeleton from "@/components/product/ProductGridSkeleton";

const SearchResultsContent = nextDynamic(() => import("@/components/search/SearchResultsContent"));

export const metadata: Metadata = {
  title: "نتائج البحث - Luminous Derma",
  description: "ابحثي عن منتجات العناية بالبشرة والشعر والمكياج والعطور",
  alternates: { canonical: "https://luminousderma.com/search" },
};

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const liveCatalog = await getServerProducts();
  const catalogProducts = liveCatalog.products.length > 0 ? liveCatalog.products : productSummaries;

  return (
    <div dir="rtl" className="w-full pb-16">
      <Container>
        <nav aria-label="breadcrumb" className="pt-4">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link>
            </li>
            <ChevronLeft size={14} className="text-muted" />
            <li className="font-medium text-foreground">البحث</li>
          </ol>
        </nav>
      </Container>
      <Suspense fallback={<ProductGridSkeleton count={8} />}>
        <SearchResultsContent products={catalogProducts} />
      </Suspense>
    </div>
  );
}
