/**
 * PART 4 — CATEGORY DIRECTORY
 * ===========================
 * Catalog-level category information (never the source of truth for sales —
 * sales rows come from `sales.ts`). Used for the categories tab and dashboard.
 */

import type { Product } from "@/src/types/product";
import { onlyPublished } from "@/src/lib/publication";
import type { StoreOpsState } from "./types";
import { getProductStockInfo } from "./inventory";
import type { Order } from "@/types/cart";

export interface CategoryDirectoryRow {
  slug: string;
  nameAr: string;
  productCount: number;
  publishedCount: number;
  draftCount: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  priceMin: number | null;
  priceMax: number | null;
  priceAverage: number | null;
  hasImage: boolean;
}

export function buildCategoryDirectory(state: StoreOpsState, products: Product[], orders: Order[], now: string): CategoryDirectoryRow[] {
  const published = onlyPublished(products);
  const bySlug = new Map<string, Product[]>();
  for (const p of published) {
    const slug = p.categorySlug ?? "uncategorized";
    const list = bySlug.get(slug) ?? [];
    list.push(p);
    bySlug.set(slug, list);
  }
  const rows: CategoryDirectoryRow[] = [];
  for (const [slug, list] of bySlug) {
    let low = 0;
    let out = 0;
    let inStock = 0;
    let priceMin: number | null = null;
    let priceMax: number | null = null;
    let sum = 0;
    let hasImage = false;
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
      if ((p.gallery?.length ?? 0) > 0 || (p.images?.length ?? 0) > 0) hasImage = true;
    }
    rows.push({
      slug,
      nameAr: list[0]?.categoryAr ?? list[0]?.category ?? slug,
      productCount: list.length,
      publishedCount: list.length,
      draftCount: 0,
      inStockCount: inStock,
      lowStockCount: low,
      outOfStockCount: out,
      priceMin,
      priceMax,
      priceAverage: list.length > 0 ? Math.round(sum / list.length) : null,
      hasImage,
    });
  }
  return rows.sort((a, b) => b.productCount - a.productCount);
}