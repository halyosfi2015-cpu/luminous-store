"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { products } from "@/lib/products";
import ProductCard from "@/components/product/ProductCard";
import { useLang } from "@/lib/use-lang";
import type { Product } from "@/types/product";

function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.isFeatured);
}

function getBestSellers(): Product[] {
  return products.filter((p) => p.isBestSeller);
}

function getNewArrivals(): Product[] {
  return products.filter((p) => p.isNew);
}

export default function Products() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  const featured = getFeaturedProducts();
  const bestSellers = getBestSellers();
  const newArrivals = getNewArrivals();

  return (
    <>
      <section className="w-full bg-gradient-to-b from-card via-secondary-50/40 to-card py-8 sm:py-10 lg:py-12">
        <Container>
          <SectionTitle
            eyebrow={isAr ? "تشكيلة مختارة" : "Curated Selection"}
            title={isAr ? "منتجات مميزة" : "Featured Products"}
            subtitle={
              isAr
                ? "اختاري من مجموعتنا المختارة بعناية لعناية متكاملة ببشرتك"
                : "Choose from our carefully curated collection for complete skincare"
            }
            action={
              <Link
                href="/products"
                className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
              >
                {isAr ? "عرض الكل" : "View All"}
                <ArrowLeft size={15} className={`transition-transform duration-200 ease-out-smooth group-hover:-translate-x-0.5 ${isAr ? "" : "rotate-180"}`} />
              </Link>
            }
          />
          <HorizontalCarousel ariaLabel={isAr ? "المنتجات المميزة" : "Featured products"}>
            {featured.map((product) => (
              <div key={product.id} className="w-56 shrink-0 sm:w-60">
                <ProductCard product={product} />
              </div>
            ))}
          </HorizontalCarousel>
        </Container>
      </section>

      <section className="w-full bg-gradient-to-b from-card via-primary-50/30 to-card py-8 sm:py-10 lg:py-12">
        <Container>
          <SectionTitle
            eyebrow={isAr ? "الأكثر طلباً" : "Best Rated"}
            title={isAr ? "الأكثر مبيعاً" : "Best Sellers"}
            subtitle={
              isAr
                ? "المنتجات الأكثر شعبية بين عملائنا في كل فئة"
                : "The most popular products across all categories"
            }
            action={
              <Link
                href="/products"
                className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
              >
                {isAr ? "عرض الكل" : "View All"}
                <ArrowLeft size={15} className={`transition-transform duration-200 ease-out-smooth group-hover:-translate-x-0.5 ${isAr ? "" : "rotate-180"}`} />
              </Link>
            }
          />
          <HorizontalCarousel ariaLabel={isAr ? "الأكثر مبيعاً" : "Best sellers"}>
            {bestSellers.map((product) => (
              <div key={product.id} className="w-56 shrink-0 sm:w-60">
                <ProductCard product={product} />
              </div>
            ))}
          </HorizontalCarousel>
        </Container>
      </section>

      <section className="w-full bg-gradient-to-b from-card via-accent-50/30 to-card py-8 sm:py-10 lg:py-12">
        <Container>
          <SectionTitle
            eyebrow={isAr ? "وافدة حديثة" : "New Arrivals"}
            title={isAr ? "الوافدة الجديدة" : "New Arrivals"}
            subtitle={
              isAr
                ? "أحدث المنتجات المضافة حديثاً لمجموعتنا"
                : "The latest products recently added to our collection"
            }
            action={
              <Link
                href="/products"
                className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
              >
                {isAr ? "عرض الكل" : "View All"}
                <ArrowLeft size={15} className={`transition-transform duration-200 ease-out-smooth group-hover:-translate-x-0.5 ${isAr ? "" : "rotate-180"}`} />
              </Link>
            }
          />
          <HorizontalCarousel ariaLabel={isAr ? "الوافدة الجديدة" : "New arrivals"}>
            {newArrivals.map((product) => (
              <div key={product.id} className="w-56 shrink-0 sm:w-60">
                <ProductCard product={product} />
              </div>
            ))}
          </HorizontalCarousel>
        </Container>
      </section>
    </>
  );
}
