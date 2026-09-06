import type { Routine, ProductSummary } from "@/src/types/product";

export type RoutineDraft = Omit<Routine, "steps"> & {
  steps: Routine["steps"];
};

let cachedAPIRoutines: Routine[] | null = null;

export async function fetchRoutinesFromAPI(): Promise<Routine[]> {
  try {
    const res = await fetch("/api/content/routines", { cache: "no-store" });
    if (!res.ok) return cachedAPIRoutines ?? [];
    const data = await res.json();
    const apiRoutines = (data.routines ?? []) as Routine[];
    if (apiRoutines.length > 0) {
      cachedAPIRoutines = apiRoutines;
      return apiRoutines;
    }
  } catch {}
  return cachedAPIRoutines ?? [];
}

export function getRoutinesFromCache(): Routine[] {
  if (cachedAPIRoutines && cachedAPIRoutines.length > 0) return cachedAPIRoutines;
  return [];
}

export function getRoutines(): Routine[] {
  return cachedAPIRoutines ?? [];
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

/**
 * Unified product resolution for routine products.
 * Resolves routine product IDs against the full product catalog,
 * supporting both Supabase UUID and legacy_id (yq-*) formats.
 * The /api/content/products endpoint maps id = p.legacy_id ?? p.id,
 * so the product.id field already contains the legacy ID when available.
 * 
 * @param routine - the routine containing product IDs (legacy IDs or UUIDs)
 * @param apiProducts - the full product catalog from /api/content/products
 * @returns array of resolved product summaries
 */
export function resolveRoutineProducts(routine: Routine, apiProducts: ProductSummary[]) {
  const productMap = new Map<string, ProductSummary>();
  // Build map using product.id (which is legacy_id ?? id from the API)
  for (const p of apiProducts) {
    if (p.id) productMap.set(p.id, p);
  }

  return routine.products
    .map((id) => productMap.get(id))
    .filter((p): p is ProductSummary => Boolean(p));
}

type ImageSource = {
  gallery?: string[];
  image?: string;
};

export function getPrimaryImage(product: ImageSource | null | undefined): string {
  if (!product) return "";
  return (product.gallery && product.gallery[0]) || product.image || "";
}
