"use client";

import { useRef, useCallback } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import ProductImage from "@/components/product/ProductImage";
import { getNewArrivals } from "@/src/data/product-summaries";
import { useLang } from "@/lib/use-lang";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

export default function NewArrivals() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const newArrivals = getNewArrivals().slice(0, 10);
  const marqueeRef = useRef<HTMLDivElement | null>(null);

  const pauseMarquee = useCallback(() => {
    if (marqueeRef.current) marqueeRef.current.style.animationPlayState = "paused";
  }, []);

  const resumeMarquee = useCallback(() => {
    if (marqueeRef.current) marqueeRef.current.style.animationPlayState = "running";
  }, []);

  if (newArrivals.length === 0) return null;

  const items = [...newArrivals, ...newArrivals, ...newArrivals];

  return (
    <section id="new-arrivals" className="w-full scroll-mt-28 bg-gradient-to-b from-white via-gray-50/50 to-white py-8 sm:py-10 lg:py-12">
      <Container>
        <SectionTitle
          eyebrow={<>
            <span className="h-0.5 w-6 rounded-pill bg-primary" />
            <span className="text-sm font-bold text-primary">{isAr ? "وصل حديثاً" : "New Arrivals"}</span>
          </>}
          title={isAr ? "أحدث المنتجات" : "Latest Products"}
          subtitle={isAr ? "اكتشفي أحدث الإضافات لمجموعتنا من العناية الفاخرة" : "Discover the latest additions to our luxury skincare collection"}
          action={
            <Link
              href="/new-arrivals"
              className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
            >
              {isAr ? "عرض الكل" : "View All"}
            </Link>
          }
        />

        <div className="relative group/carousel" onMouseEnter={pauseMarquee} onMouseLeave={resumeMarquee}>
          <div className="relative overflow-hidden py-2" dir="ltr">
            <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-16 bg-gradient-to-r from-white to-transparent sm:w-24" />
            <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-16 bg-gradient-to-l from-white to-transparent sm:w-24" />

            <div
              ref={marqueeRef}
              className="flex w-max gap-4 animate-marquee group-hover/carousel:[animation-play-state:paused]"
              style={{ animationDuration: "70s" }}
            >
              {items.map((product, i) => {
                const productName = isAr ? product.name.ar : product.name.en;
                return (
                  <Link
                    key={`${product.id}-${i}`}
                    href={`/products/${product.slug}`}
                    className="group flex w-56 shrink-0 flex-col gap-2.5 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-50">
                      {product.gallery[0] ? (
                        <ProductImage
                          src={product.gallery[0]}
                          alt={productName}
                          productId={product.id}
                          className="h-full w-full"
                          sizes="224px"
                          pedestal
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
                          <span className="text-2xl">🧴</span>
                        </div>
                      )}
                      <span className="absolute start-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-bold text-white">
                        <Sparkles size={8} />
                        {isAr ? "جديد" : "New"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="line-clamp-2 text-xs font-semibold text-gray-700 transition-colors group-hover:text-gray-900">
                        {productName}
                      </p>
                      <span className="text-sm font-extrabold text-gray-900">
                        {formatPrice(product.pricing.price)}
                        <span className="ms-0.5 text-[10px] font-normal text-gray-400">{isAr ? "ريال" : "YER"}</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
