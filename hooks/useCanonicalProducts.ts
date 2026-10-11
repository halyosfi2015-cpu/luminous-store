"use client";

import { useMemo } from "react";
import { useProducts } from "@/hooks/useProducts";
import type { ProductSummary } from "@/src/types/product";

/**
 * Canonical product resolver — guarantees that a product change made anywhere
 * (admin image update, price, name, brand) propagates to every surface.
 * Starts from the given static base, then overlays canonical API fields
 * (DB values win): gallery/images/heroImage/pricing/name/brand/stock/flags.
 */
export function useCanonicalProducts(base: ProductSummary[]): ProductSummary[] {
  const { products: canonical } = useProducts();

  return useMemo(() => {
    if (canonical.length === 0) return base;
    const byKey = new Map<string, ProductSummary>();
    for (const p of canonical) {
      byKey.set(p.id, p);
      if (p.slug) byKey.set(p.slug, p);
      const sku = (p as unknown as Record<string, unknown>).sku;
      if (typeof sku === "string" && sku) byKey.set(sku, p);
    }
    return base.map((b) => {
      const c = byKey.get(b.id) ?? byKey.get(b.slug);
      if (!c) return b;
      return {
        ...b,
        name: c.name ?? b.name,
        brand: c.brand ?? b.brand,
        brandAr: c.brandAr ?? b.brandAr,
        pricing: c.pricing ?? b.pricing,
        discount: c.discount ?? b.discount,
        gallery: c.gallery && c.gallery.length > 0 ? c.gallery : b.gallery,
        heroImage: c.heroImage ?? b.heroImage,
        stock: c.stock ?? b.stock,
        inStock: c.inStock ?? b.inStock,
        rating: c.rating ?? b.rating,
        reviewCount: c.reviewCount ?? b.reviewCount,
      };
    });
  }, [base, canonical]);
}
