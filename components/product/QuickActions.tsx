"use client";

import { Eye, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types/product";
import WishlistButton from "@/components/product/WishlistButton";
import CompareButton from "@/components/product/CompareButton";

type QuickActionsProps = {
  product: Product;
};

export default function QuickActions({ product }: QuickActionsProps) {
  const { addItem } = useCart();

  const handleQuickAdd = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name.en,
      nameAr: product.name.ar,
      price: product.pricing.price,
      image: product.gallery[0] ?? "",
      quantity: 1,
      inStock: product.stock > 0,
    });
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100 bg-gradient-to-t from-black/40 via-black/10 to-transparent">
      <div className="flex items-center gap-2 translate-y-4 transition-transform duration-300 group-hover:translate-y-0">
        <button
          type="button"
          aria-label="إضافة للسلة"
          onClick={handleQuickAdd}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground shadow-card transition-all duration-200 hover:bg-primary hover:text-white active:scale-90"
        >
          <ShoppingCart size={16} />
        </button>
        <Link
          href={`/products/${product.slug}`}
          aria-label="عرض سريع"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground shadow-card transition-all duration-200 hover:bg-primary hover:text-white active:scale-90"
        >
          <Eye size={16} />
        </Link>
        <WishlistButton productId={product.id} iconOnly size={15} />
        <CompareButton productId={product.id} iconOnly size={15} />
      </div>
    </div>
  );
}
