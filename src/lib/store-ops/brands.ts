/**
 * PART 4 — BRAND DIRECTORY
 * ========================
 * Catalog-level brand information (sales rows come from `sales.ts`).
 */

import type { Product } from "@/src/types/product";
import { onlyPublished } from "@/src/lib/publication";
import type { StoreOpsState } from "./types";
import { getProductStockInfo } from "./inventory";
import type { Order } from "@/types/cart";

export interface BrandDirectoryRow {
  brand: string;
  brandAr: string;
  productCount: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  priceMin: number | null;
  priceMax: number | null;
  priceAverage: number | null;
  topCategorySlug: string | null;
}

export function buildBrandDirectory(state: StoreOpsState, products: Product[], orders: Order[], now: string): BrandDirectoryRow[] {
  const published = onlyPublished(products);
  const byBrand = new Map<string, Product[]>();
  for (const p of published) {
    const brand = p.brand ?? "غير معروف";
    const list = byBrand.get(brand) ?? [];
    list.push(p);
    byBrand.set(brand, list);
  }
  const rows: BrandDirectoryRow[] = [];
  for (const [brand, list] of byBrand) {
    let low = 0;
    let out = 0;
    let inStock = 0;
    let priceMin: number | null = null;
    let priceMax: number | null = null;
    let sum = 0;
    const cats = new Map<string, number>();
    for (const p of list) {
      const info = getProductStockInfo(state, p, orders, now);
      if (info.status === "LOW_STOCK") low += 1;
      else if (info.status === "OUT_OF_STOCK") out += 1;
      else inStock += 1;
      const price = p.pricing?.price;
      if (Number.isFinite(price) && price > 0) {
        priceMin = priceMin === null ? price : Math.min(priceMin, price);
        priceMax = priceMax === null ? price : Math.max(priceMax, price);
        sum += price;
      }
      const slug = p.categorySlug ?? "uncategorized";
      cats.set(slug, (cats.get(slug) ?? 0) + 1);
    }
    let topCategorySlug: string | null = null;
    let topCount = 0;
    for (const [slug, count] of cats) {
      if (count > topCount) {
        topCount = count;
        topCategorySlug = slug;
      }
    }
    rows.push({
      brand,
      brandAr: list[0]?.brandAr ?? brand,
      productCount: list.length,
      inStockCount: inStock,
      lowStockCount: low,
      outOfStockCount: out,
      priceMin,
      priceMax,
      priceAverage: list.length > 0 ? Math.round(sum / list.length) : null,
      topCategorySlug,
    });
  }
  return rows.sort((a, b) => b.productCount - a.productCount);
}