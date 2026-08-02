import { Star, ShieldCheck, Award } from "lucide-react";
import type { Product } from "@/types/product";

type ProductInfoProps = {
  product: Product;
};

export default function ProductInfo({ product }: ProductInfoProps) {
  const fullStars = Math.floor(product.rating);
  const hasHalf = product.rating - fullStars >= 0.5;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-primary bg-primary/5 px-3 py-1 rounded-full">
          {product.brand}
        </span>
        {product.isNew && (
          <span className="text-xs font-semibold text-success-fg bg-success-soft px-2.5 py-0.5 rounded-full">
            جديد
          </span>
        )}
        {product.isBestSeller && (
          <span className="text-xs font-semibold text-warning-fg bg-warning-soft px-2.5 py-0.5 rounded-full">
            الأكثر مبيعاً
          </span>
        )}
        {product.seoMetadata.keywords.includes("vitamin c") && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/5 px-2.5 py-0.5 rounded-full">
            <ShieldCheck size={12} />
            يوصي به الأطباء
          </span>
        )}
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl leading-tight">
        {product.name.ar}
      </h1>
      <p className="text-sm text-muted">{product.name.en}</p>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5" aria-label={`تقييم ${product.rating} من 5`}>
          {Array.from({ length: 5 }, (_, i) => {
            let fill: "full" | "half" | "empty" = "empty";
            if (i < fullStars) fill = "full";
            else if (i === fullStars && hasHalf) fill = "half";
            return (
              <Star
                key={i}
                size={18}
                className={
                  fill === "full"
                    ? "fill-accent text-accent"
                    : fill === "half"
                      ? "fill-accent/50 text-accent"
                      : "text-border-strong"
                }
              />
            );
          })}
        </div>
        <span className="text-sm font-medium text-foreground">
          {product.rating}
        </span>
        <span className="text-sm text-muted">
          (50 {product.rating === 1 ? "تقييم" : "تقييمات"})
        </span>
      </div>
      <div className="border-t border-border pt-4">
        <p className="text-sm leading-relaxed text-muted">
          {product.description.ar}
        </p>
      </div>
      {product.seoMetadata.keywords.includes("vitamin c") && (
        <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/10 p-4">
          <Award size={20} className="shrink-0 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">موصى به من قبل أطباء الجلدية</p>
            <p className="text-xs text-muted mt-0.5">هذا المنتج موصى به من قبل أطباء الجلدية المتخصصين</p>
          </div>
        </div>
      )}
    </div>
  );
}
