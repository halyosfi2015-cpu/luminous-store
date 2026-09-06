"use client";

import type { Bundle } from "@/src/types/bundle";
import type { GiftOption } from "@/src/data/bundles-admin";

/**
 * Canonical bundle/gift-option reads for storefront display.
 * Fetches DB truth via /api/content/bundles; falls back to the bundled
 * static catalog (UX-only availability fallback, never admin-local edits).
 */

type CanonicalPayload = {
  bundles: Bundle[];
  giftOptions: GiftOption[];
};

let inflight: Promise<CanonicalPayload> | null = null;

export async function fetchCanonicalBundles(): Promise<CanonicalPayload> {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(`/api/content/bundles?_t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as CanonicalPayload;
    } catch {
      const [{ bundles }, giftMod] = await Promise.all([
        import("@/src/data/bundles").then((m) => ({ bundles: m.bundles as unknown as Bundle[] })),
        import("@/src/data/bundles-admin"),
      ]);
      return { bundles, giftOptions: giftMod.DEFAULT_GIFT_OPTIONS };
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
