"use client";

import { useState, useEffect } from "react";
import { useProductsContext } from "@/components/home/ProductsContext";
import type { ProductSummary } from "@/src/types/product";

const CACHE_KEY = "luminous_products_cache";
const CACHE_TTL = 5 * 60 * 1000;
const VERSION_KEY = "luminous_products_cache_version";

function getCacheVersion(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(sessionStorage.getItem(VERSION_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function bumpCacheVersion() {
  if (typeof window === "undefined") return;
  try {
    const v = getCacheVersion() + 1;
    sessionStorage.setItem(VERSION_KEY, String(v));
    window.dispatchEvent(new StorageEvent("storage", { key: VERSION_KEY, newValue: String(v) }));
  } catch {}
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === VERSION_KEY) {
      // Version changed in another tab — current tab will see it on next getCached()
    }
  });
}

interface ProductsCache {
  products: ProductSummary[];
  brands: { slug: string; name: string; nameAr: string }[];
  timestamp: number;
  version: number;
}

let sharedPromise: Promise<{ products: ProductSummary[]; brands: { slug: string; name: string; nameAr: string }[] }> | null = null;

function getCached(): ProductsCache | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: ProductsCache = JSON.parse(raw);
    if (Date.now() - cache.timestamp > CACHE_TTL) return null;
    if (cache.version !== getCacheVersion()) return null;
    return cache;
  } catch {
    return null;
  }
}

function setCached(products: ProductSummary[], brands: { slug: string; name: string; nameAr: string }[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ products, brands, timestamp: Date.now(), version: getCacheVersion() }));
  } catch {}
}

async function fetchProducts(): Promise<{ products: ProductSummary[]; brands: { slug: string; name: string; nameAr: string }[] }> {
  if (sharedPromise) {
    return sharedPromise;
  }
  sharedPromise = (async () => {
    try {
      const PAGE_SIZE = 500;
      let allProducts: ProductSummary[] = [];
      let allBrands: { slug: string; name: string; nameAr: string }[] = [];
      let offset = 0;
      let hasMore = true;
      const brandMap = new Map<string, { slug: string; name: string; nameAr: string }>();

      while (hasMore) {
        const res = await fetch(`/api/content/products?limit=${PAGE_SIZE}&offset=${offset}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const products: ProductSummary[] = data.products ?? [];
        const brands: { slug: string; name: string; nameAr: string }[] = data.brands ?? [];
        allProducts = allProducts.concat(products);
        for (const b of brands) {
          if (!brandMap.has(b.slug)) brandMap.set(b.slug, b);
        }
        hasMore = products.length === PAGE_SIZE;
        offset += PAGE_SIZE;
      }

      allBrands = Array.from(brandMap.values());
      setCached(allProducts, allBrands);
      return { products: allProducts, brands: allBrands };
    } catch {
      return { products: [], brands: [] };
    } finally {
      sharedPromise = null;
    }
  })();
  return sharedPromise;
}

/**
 * Hook to get all products. Prefers server-side ProductsContext (homepage),
 * falls back to client-side fetch (other pages).
 */
export function useProducts() {
  const ctx = useProductsContext();
  const [products, setProducts] = useState<ProductSummary[]>(ctx.products);
  const [loading, setLoading] = useState(ctx.products.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If server context already has products, use them directly
    if (ctx.products.length > 0) {
      setProducts(ctx.products);
      setLoading(false);
      setCached(ctx.products, ctx.brands);
      return;
    }

    // Otherwise fall back to client-side fetch
    let mounted = true;

    // Try cache first
    const cached = getCached();
    if (cached && cached.products.length > 0) {
      if (mounted) {
        setProducts(cached.products);
        setLoading(false);
      }
      return;
    }

    // Client-side fetch
    fetchProducts().then((data) => {
      if (mounted) {
        setProducts(data.products);
        setLoading(false);
        if (data.products.length === 0) {
          setError("No products loaded");
        }
      }
    });

    return () => { mounted = false; };
  }, [ctx.products.length]);

  return { products, loading, error };
}

export function useBrands() {
  const ctx = useProductsContext();
  const [brands, setBrands] = useState<{ slug: string; name: string; nameAr: string }[]>(ctx.brands);
  const [loading, setLoading] = useState(ctx.brands.length === 0);

  useEffect(() => {
    if (ctx.brands.length > 0) {
      setBrands(ctx.brands);
      setLoading(false);
      return;
    }

    const cached = getCached();
    if (cached && cached.brands.length > 0) {
      setBrands(cached.brands);
      setLoading(false);
      return;
    }

    fetchProducts().then((data) => {
      setBrands(data.brands);
      setLoading(false);
    });
  }, [ctx.brands.length]);

  return { brands, loading };
}

export { fetchProducts };