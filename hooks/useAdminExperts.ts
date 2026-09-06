"use client";

import { useState, useEffect } from "react";
import type { Expert } from "@/src/types/expert";
import { experts as canonicalExperts } from "@/src/data/experts";

let cachedExperts: Expert[] | null = null;
let fetchPromise: Promise<Expert[]> | null = null;

async function fetchExpertsFromAPI(): Promise<Expert[]> {
  if (cachedExperts) return cachedExperts;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await fetch("/api/content/experts", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.experts) && data.experts.length > 0) {
          cachedExperts = data.experts as Expert[];
          return cachedExperts;
        }
      }
    } catch {}
    // Fallback to canonical static data if API unavailable
    return canonicalExperts;
  })();

  return fetchPromise;
}

/**
 * Client-side wrapper that loads experts from Supabase API.
 * Falls back to canonical static data if API unavailable.
 */
export function useAdminExperts(): Expert[] {
  const [experts, setExperts] = useState<Expert[]>(cachedExperts ?? canonicalExperts);

  useEffect(() => {
    let cancelled = false;
    fetchExpertsFromAPI().then((data) => {
      if (!cancelled) setExperts(data);
    });
    return () => { cancelled = true; };
  }, []);

  return experts;
}

/**
 * Get expert by slug.
 */
export function useAdminExpert(slug: string): Expert | undefined {
  const experts = useAdminExperts();
  return experts.find((e) => e.slug === slug);
}
