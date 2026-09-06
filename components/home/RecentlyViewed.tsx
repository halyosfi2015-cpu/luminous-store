"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, ArrowLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import ProductImage from "@/components/product/ProductImage";
import { useProducts } from "@/hooks/useProducts";
import { useLang } from "@/lib/use-lang";
import type { ProductSummary } from "@/src/types/product";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

function trackView(productId: string) {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem("recentlyViewed");
    const ids: string[] = stored ? JSON.parse(stored) : [];
    const filtered = ids.filter((id) => id !== productId);
    filtered.unshift(productId);
    localStorage.setItem("recentlyViewed", JSON.stringify(filtered.slice(0, 20)));
  } catch {}
}

export default function RecentlyViewed() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { products: allProducts, loading, error } = useProducts();

  function getRecentlyViewed(): ProductSummary[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("recentlyViewed");
      if (!stored) return [];
      const ids: string[] = JSON.parse(stored);
      return ids
        .map((id) => allProducts.find((p) => p.id === id))
        .filter(Boolean)
        .slice(0, 10) as ProductSummary[];
    } catch {
      return [];
    }
  }

  const [recentProducts, setRecentProducts] = useState<ProductSummary[]>([]);

  useEffect(() => {
    setRecentProducts(getRecentlyViewed());
  }, [allProducts]);

  // Listen for storage changes
  useEffect(() => {
    const handler = () => setRecentProducts(getRecentlyViewed());
    window.addEventListener("storage", handler);
    const interval = setInterval(handler, 2000);
    return () => {
      window.removeEventListener("storage", handler);
      clearInterval(interval);
    };
  }, []);

  if (loading) return null;
  if (error) {
    return (
      <section className="w-full py-8" style={{ background: "var(--background)" }}>
        <Container>
          <div className="text-center py-12 text-[var(--muted)]">
            <p>{isAr ? "فشل تحميل المنتجات المضافة مؤخراً" : "Failed to load recently viewed"}</p>
            <button onClick={() => window.location.reload()} className="mt-4 text-[var(--primary)] underline">
              {isAr ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        </Container>
      </section>
    );
  }

  if (recentProducts.length === 0) return null;

  return (
    <section className="w-full bg-gradient-to-b from-white via-gray-50/50 to-white py-10 sm:py-12">
      <Container>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              <Clock size={18} className="text-gray-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isAr ? "شووف مؤخراً" : "Recently Viewed"}
              </h3>
              <p className="text-xs text-gray-400">
                {isAr ? "المنتجات اللي شفتها قريب" : "Products you recently viewed"}
              </p>
            </div>
          </div>
          <Link
            href="/products"
            className="group inline-flex items-center gap-1.5 rounded-full text-xs font-bold text-gray-500 transition-colors hover:text-gray-900"
          >
            {isAr ? "عرض الكل" : "View All"}
            <ArrowLeft size={12} className={`transition-transform group-hover:-translate-x-0.5 ${isAr ? "" : "rotate-180"}`} />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {recentProducts.map((product) => {
            const productName = isAr ? product.name.ar : product.name.en;
            return (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group flex w-36 shrink-0 flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-2.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:w-40"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-50">
                  <ProductImage
                    src={product.gallery[0]}
                    alt={productName}
                    productId={product.id}
                    className="h-full w-full"
                    sizes="160px"
                    pedestal
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="line-clamp-2 text-[11px] font-semibold text-gray-700 transition-colors group-hover:text-gray-900">
                    {productName}
                  </p>
                  <span className="text-[12px] font-extrabold text-gray-900">
                    {formatPrice(product.pricing.price)}
                    <span className="ms-0.5 text-[9px] font-normal text-gray-400">ريال</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

export { trackView };

