import { brands } from "@/src/data/brands";
import type { Brand } from "@/src/data/brands";

export const BRANDS_STORAGE_KEY = "luminous-brands";
export const BRANDS_DELETED_KEY = "luminous-brands-deleted";

/**
 * Overlay locally-saved brand overrides (created/edited via the admin) on top of
 * a base brand list, and hide brands that were soft-deleted locally. Used
 * client-side so that admin changes are visible even when Supabase is
 * unavailable.
 */
export function applyBrandOverrides(base: Brand[]): Brand[] {
  if (typeof window === "undefined") return base;
  try {
    const deleted = new Set(
      JSON.parse(window.localStorage.getItem(BRANDS_DELETED_KEY) || "[]") as string[],
    );
    const merged = [...base].filter((item) => !deleted.has(item.slug));
    const raw = window.localStorage.getItem(BRANDS_STORAGE_KEY);
    if (raw) {
      const custom = JSON.parse(raw) as Brand[];
      if (Array.isArray(custom)) {
        for (const brand of custom) {
          const index = merged.findIndex((item) => item.id === brand.id);
          if (index >= 0) merged[index] = brand;
          else merged.push(brand);
        }
      }
    }
    return merged;
  } catch {
    return base;
  }
}

export function listBrands(): Brand[] {
  return applyBrandOverrides(brands);
}

export function saveBrandLocal(brand: Brand) {
  if (typeof window === "undefined") return;
  try {
    const existing = JSON.parse(
      window.localStorage.getItem(BRANDS_STORAGE_KEY) || "[]",
    ) as Brand[];
    const index = existing.findIndex((item) => item.id === brand.id);
    if (index >= 0) existing[index] = brand;
    else existing.push(brand);
    window.localStorage.setItem(BRANDS_STORAGE_KEY, JSON.stringify(existing));
    const deleted = new Set(
      JSON.parse(window.localStorage.getItem(BRANDS_DELETED_KEY) || "[]") as string[],
    );
    deleted.delete(brand.slug);
    window.localStorage.setItem(BRANDS_DELETED_KEY, JSON.stringify([...deleted]));
  } catch {}
}

export function removeBrandLocal(brand: Pick<Brand, "id" | "slug">) {
  if (typeof window === "undefined") return;
  try {
    const existing = JSON.parse(
      window.localStorage.getItem(BRANDS_STORAGE_KEY) || "[]",
    ) as Brand[];
    window.localStorage.setItem(
      BRANDS_STORAGE_KEY,
      JSON.stringify(existing.filter((item) => item.id !== brand.id)),
    );
    const deleted = new Set(
      JSON.parse(window.localStorage.getItem(BRANDS_DELETED_KEY) || "[]") as string[],
    );
    deleted.add(brand.slug);
    window.localStorage.setItem(BRANDS_DELETED_KEY, JSON.stringify([...deleted]));
  } catch {}
}
