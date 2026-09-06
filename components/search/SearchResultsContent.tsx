"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SearchX } from "lucide-react";
import Container from "@/components/ui/Container";
import ProductGrid from "@/components/product/ProductGrid";
import Button from "@/components/ui/Button";
import type { ProductSummary } from "@/src/types/product";

function normalizeAr(value: string): string {
  return value
    .replace(/[\u064B-\u0652\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default function SearchResultsContent({ products }: { products: ProductSummary[] }) {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const results = useMemo(() => {
    const term = q.trim();
    if (!term) return [];
    const nq = normalizeAr(term);
        return products

      .map((p) => {
        let score = -1;
        const nameAr = normalizeAr(p.name.ar);
        const nameEn = p.name.en.toLowerCase();
        const brandAr = normalizeAr(p.brandAr ?? p.brand);
        const brandEn = p.brand.toLowerCase();
        const catAr = normalizeAr(p.categoryAr ?? p.category);
        const catEn = p.category.toLowerCase();
        if (nameAr === nq || nameEn === term) score = 1000;
        else if (nameAr.startsWith(nq) || nameEn.startsWith(term)) score = 900;
        else if (nameAr.includes(nq) || nameEn.includes(term)) score = 700;
        if (brandAr.includes(nq) || brandEn.includes(term)) score = Math.max(score, 450);
        if (catAr.includes(nq) || catEn.includes(term)) score = Math.max(score, 350);
        if (p.tags?.some((t) => normalizeAr(t).includes(nq))) score = Math.max(score, 300);
        return { p, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p);
  }, [q, products]);

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
