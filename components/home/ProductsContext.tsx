"use client";

import { createContext, useContext } from "react";
import type { ProductSummary } from "@/src/types/product";

export interface ProductsContextValue {
  products: ProductSummary[];
  brands: { slug: string; name: string; nameAr: string }[];
}

const ProductsContext = createContext<ProductsContextValue>({
  products: [],
  brands: [],
});

export function ProductsProvider({
  value,
  children,
}: {
  value: ProductsContextValue;
  children: React.ReactNode;
}) {
  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProductsContext(): ProductsContextValue {
  return useContext(ProductsContext);
}
