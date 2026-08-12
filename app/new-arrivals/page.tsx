"use client";

import { Sparkles } from "lucide-react";
import Container from "@/components/ui/Container";
import ProductCard from "@/components/product/ProductCard";
import { getNewArrivals } from "@/src/data/product-summaries";
import { useLang } from "@/lib/use-lang";

export default function NewArrivalsPage() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const newArrivals = getNewArrivals().slice(0, 10);

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2">
          <Sparkles size={14} className="text-amber-400" />
          <span className="text-xs font-bold text-white">
            {isAr ? "وصل حديثاً" : "New Arrivals"}
          </span>
        </div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          {isAr ? "وصل حديثاً" : "New Arrivals"}
        </h1>
        <p className="text-gray-500">
          {isAr
            ? "أحدث المنتجات المضافة حديثاً لمجموعتنا"
            : "The latest products recently added to our collection"}
        </p>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {newArrivals.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Empty State */}
      {newArrivals.length === 0 && (
        <div className="py-20 text-center">
          <Sparkles size={48} className="mx-auto mb-4 text-gray-200" />
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {isAr ? "لا توجد منتجات جديدة حالياً" : "No new products yet"}
          </h2>
          <p className="text-gray-500">
            {isAr
              ? "سيتم إضافة منتجات جديدة قريباً"
              : "New products will be added soon"}
          </p>
        </div>
      )}
    </Container>
  );
}

