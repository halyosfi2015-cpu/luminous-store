import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import ProductImage from "@/components/product/ProductImage";
import ProductBadges from "@/components/product/ProductBadges";
import { getNewArrivals } from "@/lib/products";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

export default function RecentlyAdded() {
  const newArrivals = getNewArrivals();

  return (
    <section className="w-full bg-background py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionTitle
          eyebrow="وصل حديثاً"
          title="أحدث الإضافات"
          subtitle="منتجات جديدة انضمت لتشكيلتنا - كوني الأولى في تجربتها"
          action={
            <Link
              href="/products"
              className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
            >
              عرض الكل
              <ArrowLeft size={15} className="transition-transform duration-200 ease-out-smooth group-hover:-translate-x-0.5" />
            </Link>
          }
        />

        <div
          dir="rtl"
          className="hide-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          {newArrivals.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group w-[9.5rem] shrink-0 overflow-hidden rounded-card border border-border bg-card shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:border-secondary/30 hover:shadow-card-hover sm:w-40"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-muted-bg">
                {product.gallery[0] ? (
                  <ProductImage
                    src={product.gallery[0]}
                    alt={product.name.ar}
                    productId={product.id}
                    className="h-full w-full"
                    sizes="160px"
                    pedestal
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
                    <span className="text-2xl">🧴</span>
                  </div>
                )}
                <ProductBadges product={product} position="start-2 top-2" />
              </div>
              <div className="p-3">
                <p className="truncate text-[11px] font-medium text-primary">{product.brandAr || product.brand}</p>
                <p className="mt-1 line-clamp-2 text-xs font-medium text-foreground">{product.name.ar}</p>
                <p className="mt-2 font-sans text-sm font-bold text-primary">
                  {formatPrice(product.pricing.price)} ر.ي
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
