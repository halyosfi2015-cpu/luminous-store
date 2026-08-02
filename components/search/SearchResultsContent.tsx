"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SearchX } from "lucide-react";
import Container from "@/components/ui/Container";
import ProductGrid from "@/components/product/ProductGrid";
import Button from "@/components/ui/Button";
import { products } from "@/lib/products";

export default function SearchResultsContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return products.filter(
      (p) =>
        p.name.ar.includes(term) ||
        p.name.en.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        (p.categoryAr && p.categoryAr.includes(term))
    );
  }, [q]);

  return (
    <div dir="rtl" className="w-full pb-16">
      <Container>
        <div className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            نتائج البحث{q && ` عن "${q}"`}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {results.length === 0
              ? "لم نجد منتجات مطابقة لبحثك"
              : results.length === 1
                ? "منتج واحد مطابق"
                : `${results.length} منتج مطابق`}
          </p>
        </div>

        <div className="mt-8 w-full">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted-bg mb-4">
                <SearchX size={40} className="text-border-strong" />
              </div>
              <p className="text-lg font-medium text-foreground">لم نجد منتجات تطابق بحثك</p>
              <p className="mt-1 text-sm text-muted">تحققي من الإملاء أو جربي كلمة بحث مختلفة</p>
              <Link href="/products" className="mt-6">
                <Button variant="outline">تصفحي كل المنتجات</Button>
              </Link>
            </div>
          ) : (
            <ProductGrid products={results} />
          )}
        </div>
      </Container>
    </div>
  );
}
