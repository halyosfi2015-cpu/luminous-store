import { routines as DEFAULT_ROUTINES, productSummaries } from "./product-summaries";
import type { Routine } from "@/types/product";

export const ROUTINES_STORAGE_KEY = "luminous-routines-custom";

export type RoutineDraft = Omit<Routine, "steps"> & {
  steps: Routine["steps"];
};

export function loadCustomRoutines(): Routine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ROUTINES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Routine[];
    }
  } catch {}
  return [];
}

export function saveCustomRoutines(list: Routine[]) {
  try {
    window.localStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function getRoutines(): Routine[] {
  const custom = loadCustomRoutines();
  const customIds = new Set(custom.map((r) => r.id));
  const merged = [...DEFAULT_ROUTINES.filter((r) => !customIds.has(r.id)), ...custom];
  return merged
    .filter((r) => r.active)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getRoutineById(id: string): Routine | undefined {
  return getRoutines().find((r) => r.id === id);
}

export function getRoutinesByType(type: string): Routine[] {
  return getRoutines().filter((r) => r.type === type);
}

export function getRoutineTypes(): { type: string; typeAr: string }[] {
  const seen = new Map<string, string>();
  for (const r of getRoutines()) {
    if (!seen.has(r.type)) seen.set(r.type, r.typeAr);
  }
  return Array.from(seen, ([type, typeAr]) => ({ type, typeAr }));
}

export function resolveRoutineProducts(routine: Routine) {
  return routine.products
    .map((id) => productSummaries.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
}

/**
 * getPrimaryImage
 * Central helper to resolve the primary image for a product without modifying product data.
 * Preference: product.gallery[0] -> product.image -> empty string
 */
type ImageSource = {
  gallery?: string[];
  image?: string;
};

export function getPrimaryImage(product: ImageSource | null | undefined): string {
  if (!product) return "";
  return (product.gallery && product.gallery[0]) || product.image || "";
}
