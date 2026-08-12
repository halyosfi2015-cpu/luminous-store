import { products } from "@/src/data/products";
import type { Product } from "@/src/types/product";

export const PRODUCTS_STORAGE_KEY = "luminous-products";

/**
 * Overlay locally-saved product overrides (created/edited via the admin) on top
 * of a base product list. Used client-side so that admin changes are visible
 * even when Supabase is unavailable.
 */
export function applyProductOverrides(base: Product[]): Product[] {
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) return base;
    const custom = JSON.parse(raw) as Product[];
    if (!Array.isArray(custom)) return base;
    const merged = [...base];
    for (const product of custom) {
      const index = merged.findIndex((item) => item.id === product.id);
      if (index >= 0) merged[index] = product;
      else merged.push(product);
    }
    return merged;
  } catch {
    return base;
  }
}

export function listProducts(): Product[] {
  return applyProductOverrides(products);
}

export function removeProductLocal(id: string) {
  if (typeof window === "undefined") return;
  try {
    const existing = JSON.parse(
      window.localStorage.getItem(PRODUCTS_STORAGE_KEY) || "[]",
    ) as Product[];
    window.localStorage.setItem(
      PRODUCTS_STORAGE_KEY,
      JSON.stringify(existing.filter((product) => product.id !== id)),
    );
  } catch {}
}
