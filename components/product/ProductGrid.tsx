import { PackageOpen } from "lucide-react";
import type { ProductSummary } from "@/src/types/product";
import ProductCard from "@/components/product/ProductCard";

type ProductGridProps = {
  products: ProductSummary[];
};

export default function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted-bg mb-4">
          <PackageOpen size={40} className="text-border-strong" />
        </div>
        <p className="text-lg font-medium text-foreground">لا توجد منتجات في هذا القسم حالياً</p>
        <p className="mt-1 text-sm text-muted">قريباً سنضيف تشكيلة جديدة لهذه الفئة، تابعونا</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <div key={product.id}>
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
