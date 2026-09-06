/**
 * PRODUCT DATA ACCESS LAYER
 * =========================
 * Tries Supabase first, falls back to static files.
 * In-memory cache with 60s TTL prevents per-request Supabase hits.
 *
 * Usage:
 *   import { getAllProducts } from '@/src/lib/product-dal';
 *   const products = await getAllProducts(); // Supabase or static fallback
 */
import type { Product, ProductSummary } from "@/src/types/product";

// â”€â”€ In-memory cache (survives across requests in same process) â”€â”€â”€â”€

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 60 seconds

const g = globalThis as unknown as { __productCache?: Map<string, CacheEntry<unknown>> };
if (!g.__productCache) g.__productCache = new Map();
const productCache = g.__productCache;

function getCached<T>(key: string): T | null {
  const entry = productCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    productCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
  productCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// â”€â”€ Supabase fetchers (server-only, graceful fallback) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function fetchProductsFromSupabase(): Promise<Product[] | null> {
  try {
    const { createAdminClient } = await import("@/src/lib/supabase");
    const supabase = createAdminClient();
    // Paginate â€” PostgREST caps a single request at 1000 rows.
    const PAGE = 1000;
    let from = 0;
    const all: Product[] = [];
    for (;;) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("id")
        .range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      all.push(...(data as Product[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return all.length > 0 ? all : null;
  } catch {
    return null;
  }
}

async function fetchSummariesFromSupabase(): Promise<ProductSummary[] | null> {
  try {
    const { createAdminClient } = await import("@/src/lib/supabase");
    const supabase = createAdminClient();
    const PAGE = 1000;
    let from = 0;
    const all: ProductSummary[] = [];
    for (;;) {
      const { data, error } = await supabase
        .from("product_summaries")
        .select("*")
        .order("id")
        .range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      all.push(...(data as ProductSummary[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return all.length > 0 ? all : null;
  } catch {
    return null;
  }
}

// â”€â”€ Static fallback importers (lazy) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let _staticProducts: Product[] | null = null;
let _staticSummaries: ProductSummary[] | null = null;

async function getStaticProducts(): Promise<Product[]> {
  if (!_staticProducts) {
    const mod = await import("@/src/data/products");
    _staticProducts = mod.products;
  }
  return _staticProducts;
}

async function getStaticSummaries(): Promise<ProductSummary[]> {
  if (!_staticSummaries) {
    const mod = await import("@/src/data/product-summaries");
    _staticSummaries = mod.productSummaries;
  }
  return _staticSummaries;
}

// â”€â”€ Public DAL API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getAllProducts(): Promise<Product[]> {
  const cached = getCached<Product[]>("allProducts");
  if (cached) return cached;

  const supabaseData = await fetchProductsFromSupabase();
  const result = supabaseData ?? (await getStaticProducts());
  setCache("allProducts", result);
  return result;
}

export async function getAllProductSummaries(): Promise<ProductSummary[]> {
  const cached = getCached<ProductSummary[]>("allSummaries");
  if (cached) return cached;

  const supabaseData = await fetchSummariesFromSupabase();
  const result = supabaseData ?? (await getStaticSummaries());
  setCache("allSummaries", result);
  return result;
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const products = await getAllProducts();
  const { onlyPublished } = await import("@/src/lib/publication");
  return onlyPublished(products).find((p) => p.slug === slug);
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const products = await getAllProducts();
  const { onlyPublished } = await import("@/src/lib/publication");
  return onlyPublished(products).find((p) => p.id === id);
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  const products = await getAllProducts();
  const { onlyPublished } = await import("@/src/lib/publication");
  return onlyPublished(products).filter((p) => p.categorySlug === categorySlug);
}

export async function searchProducts(query: string): Promise<Product[]> {
  const products = await getAllProducts();
  const { onlyPublished } = await import("@/src/lib/publication");
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return onlyPublished(products).filter(
    (p) =>
      p.name.ar.includes(q) ||
      p.name.en.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.brandAr && p.brandAr.includes(q)) ||
      (p.description && p.description.ar.includes(q)) ||
      (p.description && p.description.en.toLowerCase().includes(q)) ||
      (p.searchAliases && p.searchAliases.some((a) => a.toLowerCase().includes(q)))
  );
}

// --- Scoped canonical readers (fast paths) ----------------------------------

/** All canonical slugs - lightweight column-only paginated query. */
export async function getAllProductSlugs(): Promise<string[]> {
  try {
    const { createAdminClient } = await import("@/src/lib/supabase");
    const supabase = createAdminClient();
    const PAGE = 1000;
    let from = 0;
    const all: string[] = [];
    for (;;) {
      const { data, error } = await supabase
        .from("products")
        .select("slug")
        .order("slug")
        .range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      all.push(...(data as Array<{ slug: string }>).map((r) => r.slug));
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return all;
  } catch {
    return [];
  }
}

/**
 * Single canonical product by slug - one scoped row from Supabase.
 * HYBRID STRATEGY: static catalog provides identity/description fields;
 * dynamic commerce fields (pricing/discount/stock/active) come from the DB.
 * Returns null when Supabase is unreachable AND the slug is absent statically.
 */
export async function getCanonicalProductBySlug(slug: string): Promise<Product | null> {
  let base: Product | undefined;
  try {
    const mod = await import("@/src/data/products");
    base = mod.getProductBySlug(slug);
  } catch {
    /* static unavailable - continue */
  }

  try {
    const { createAdminClient } = await import("@/src/lib/supabase");
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("slug, pricing, discount, stock, stock_quantity, in_stock, is_active, gallery, hero_image")
      .eq("slug", slug)
      .limit(1);
    if (error) {
      // DB error → static identity fallback is safer than a false 404.
      return base ?? null;
    }
    if (!data || data.length === 0) {
      // Supabase answered but the slug is absent canonically.
      return null;
    }
    const row = data[0] as {
      pricing?: Product["pricing"];
      discount?: number;
      stock?: number;
      stock_quantity?: number;
      in_stock?: boolean;
      is_active?: boolean;
      gallery?: unknown;
      hero_image?: string | null;
    };
    const dbStock = row.stock_quantity ?? row.stock;
    const dbGallery = Array.isArray(row.gallery) ? (row.gallery as string[]).filter(Boolean) : [];
    const merged: Product = {
      ...(base ?? ({ slug, gallery: [], tags: [], howToUse: [], skinTypes: [], suitableFor: [], skinConcerns: [], rating: 0, reviewCount: 0 } as unknown as Product)),
      // DB gallery wins when present — otherwise admin image updates never
      // reach the storefront product page (it renders product.gallery).
      gallery: dbGallery.length > 0 ? dbGallery : (base?.gallery ?? []),
      heroImage: row.hero_image ?? base?.heroImage,
      pricing: row.pricing ?? base?.pricing ?? ({ price: 0, currency: 'YER' }),
      discount: row.discount ?? base?.discount,
      stock: Number.isFinite(Number(dbStock)) ? Number(dbStock) : (base?.stock ?? 0),
      // Tri-state Availability Display — preserve null (hidden) as-is.
      inStock: row.in_stock === undefined || row.in_stock === null ? null : Boolean(row.in_stock),
      status: row.is_active === false ? ('hidden' as const) : base?.status,
    };
    return merged;
  } catch {
    /* Supabase unavailable - fall back to static identity */
    return base ?? null;
  }
}
// â”€â”€ Cache invalidation (call after admin writes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function invalidateProductCache(): void {
  productCache.delete("allProducts");
  productCache.delete("allSummaries");
}
