import type { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Container from "@/components/ui/Container";

const SearchResultsContent = dynamic(() => import("@/components/search/SearchResultsContent"));

export const metadata: Metadata = {
  title: "نتائج البحث - Luminous Derma",
  description: "ابحثي عن منتجات العناية بالبشرة والشعر والمكياج والعطور",
  alternates: { canonical: "https://luminousderma.com/search" },
};

export default function SearchPage() {
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
      <Suspense fallback={null}>
        <SearchResultsContent />
      </Suspense>
    </div>
  );
}
