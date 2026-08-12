import { categories, sectionCategories } from "@/src/data/products";
import type { CategoryInfo } from "@/src/types/product";

export const CATEGORIES_STORAGE_KEY = "luminous-categories";
export const CATEGORIES_DELETED_KEY = "luminous-categories-deleted";

/**
 * Overlay locally-saved category overrides (created/edited via the admin) on top
 * of a base category list, and hide categories that were soft-deleted locally.
 * Used client-side so that admin changes are visible even when Supabase is
 * unavailable.
 */
export function applyCategoryOverrides(base: CategoryInfo[]): CategoryInfo[] {
  if (typeof window === "undefined") return base;
  try {
    const deleted = new Set(
      JSON.parse(window.localStorage.getItem(CATEGORIES_DELETED_KEY) || "[]") as string[],
    );
    const merged = [...base].filter((item) => !deleted.has(item.slug));
    const raw = window.localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (raw) {
      const custom = JSON.parse(raw) as CategoryInfo[];
      if (Array.isArray(custom)) {
        for (const category of custom) {
          const index = merged.findIndex((item) => item.slug === category.slug);
          if (index >= 0) merged[index] = category;
          else merged.push(category);
        }
      }
    }
    return merged;
  } catch {
    return base;
  }
}

export function listCategories(): CategoryInfo[] {
  return applyCategoryOverrides(categories);
}

export function listSectionCategories(): CategoryInfo[] {
  return applyCategoryOverrides(sectionCategories);
}

export function saveCategoryLocal(category: CategoryInfo) {
  if (typeof window === "undefined") return;
  try {
    const existing = JSON.parse(
      window.localStorage.getItem(CATEGORIES_STORAGE_KEY) || "[]",
    ) as CategoryInfo[];
    const index = existing.findIndex((item) => item.slug === category.slug);
    if (index >= 0) existing[index] = category;
    else existing.push(category);
    window.localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(existing));
    const deleted = new Set(
      JSON.parse(window.localStorage.getItem(CATEGORIES_DELETED_KEY) || "[]") as string[],
    );
    deleted.delete(category.slug);
    window.localStorage.setItem(CATEGORIES_DELETED_KEY, JSON.stringify([...deleted]));
  } catch {}
}

export function removeCategoryLocal(categoryOrSlug: CategoryInfo | string) {
  if (typeof window === "undefined") return;
  try {
    const slug = typeof categoryOrSlug === "string" ? categoryOrSlug : categoryOrSlug.slug;
    const existing = JSON.parse(
      window.localStorage.getItem(CATEGORIES_STORAGE_KEY) || "[]",
    ) as CategoryInfo[];
    window.localStorage.setItem(
      CATEGORIES_STORAGE_KEY,
      JSON.stringify(existing.filter((item) => item.slug !== slug)),
    );
    const deleted = new Set(
      JSON.parse(window.localStorage.getItem(CATEGORIES_DELETED_KEY) || "[]") as string[],
    );
    deleted.add(slug);
    window.localStorage.setItem(CATEGORIES_DELETED_KEY, JSON.stringify([...deleted]));
  } catch {}
}
