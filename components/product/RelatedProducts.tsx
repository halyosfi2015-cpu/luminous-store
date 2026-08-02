import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Star } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SectionTitle from "@/components/ui/SectionTitle";
import type { Product } from "@/types/product";

type RelatedProductsProps = {
  products: Product[];
};

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}

export default function RelatedProducts({ products }: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="mt-12">
      <SectionTitle
        title="قد يعجبك أيضاً"
        subtitle="You May Also Like"
        align="center"
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <Card key={product.id} hover padding="sm" className="flex flex-col gap-3 group">
            <Link href={`/products/${product.slug}`} className="relative aspect-square w-full rounded-xl bg-muted-bg overflow-hidden">
              {product.discount && (
                <span className="absolute start-2 top-2 rounded-full bg-error px-2.5 py-0.5 text-[11px] font-semibold text-white z-10 shadow-card">
                  -{product.discount}%
                </span>
              )}
              {product.gallery[0] && (
                <Image
                  src={product.gallery[0]}
                  alt={product.name.ar}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              )}
            </Link>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-medium text-primary">{product.brand}</p>
              <Link href={`/products/${product.slug}`}>
                <p className="text-sm font-medium text-foreground line-clamp-2 transition-colors hover:text-primary">
                  {product.name.ar}
                </p>
              </Link>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={11}
                    className={i < Math.floor(product.rating) ? "fill-accent text-accent" : "text-border-strong"}
                  />
                ))}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-foreground">
                  {formatPrice(product.pricing.price)} ر.ي
                </span>
                {product.pricing.originalPrice && (
                  <span className="text-xs text-muted line-through">
                    {formatPrice(product.pricing.originalPrice)} ر.ي
                  </span>
                )}
              </div>
            </div>
            <Button variant="outline" className="w-full gap-1.5 text-xs mt-auto">
              <ShoppingCart size={13} />
              أضف إلى السلة
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}
