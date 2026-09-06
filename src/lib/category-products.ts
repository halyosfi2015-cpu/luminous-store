"use client";

import { useEffect, useState } from "react";
import type { CategoryProductOverride } from "@/src/lib/content-store";

/**
 * Per-category product overrides for the storefront.
 * Module-level cache → exactly ONE request per browser session, shared by all
 * sections/components that need it. Empty object while loading or on failure
 * (failure = default behavior, never blocks rendering).
 */
let cache: Record<string, CategoryProductOverride> | null = null;

function fetchOverrides(): Promise<Record<string, CategoryProductOverride>> {
  const empty: Record<string, CategoryProductOverride> = {};
  if (cache) return Promise.resolve(cache);
  return fetch("/api/content/taxonomy")
    .then((r) => (r.ok ? r.json() : { categoryProducts: empty }))
    .then((d) => {
      const result: Record<string, CategoryProductOverride> = d?.categoryProducts ?? empty;
      cache = result;
      return result;
    })
    .catch(() => empty);
}

export function useCategoryProductOverrides(): Record<string, CategoryProductOverride> {
  const [overrides, setOverrides] = useState<Record<string, CategoryProductOverride>>(cache ?? {});

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    fetchOverrides().then((o) => {
      if (!cancelled) setOverrides(o);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return overrides;
}

/** Apply a category override to a scored list: drop excluded, hoist pinned to front. */
export function applyCategoryOverride<T extends { slug: string }>(
  list: T[],
  override?: CategoryProductOverride,
): T[] {
  if (!override || (!override.pinned?.length && !override.excluded?.length)) return list;
  const excluded = new Set(override.excluded ?? []);
  const filtered = list.filter((p) => !excluded.has(p.slug));
  const pinnedSlugs = override.pinned ?? [];
  const pinnedSet = new Set(pinnedSlugs);
  const pinned = pinnedSlugs
    .map((slug) => filtered.find((p) => p.slug === slug))
    .filter((p): p is T => Boolean(p));
  const rest = filtered.filter((p) => !pinnedSet.has(p.slug));
  return [...pinned, ...rest];
}
