"use client";

/**
 * COMMERCE OVERLAY (client)
 * =========================
 * Static identity (name/image/description) comes from the bundled summaries;
 * dynamic commercial fields (price/discount/stock/active) are overlaid from
 * the canonical DB via /api/products/commerce with request batching + TTL.
 * If the API is unavailable, static values keep rendering (UX-only fallback).
 */

import { useEffect, useState } from "react";

export type Availability = "hidden" | "available" | "out_of_stock";

export type CommerceData = {
  slug: string;
  price: number | null;
  originalPrice: number | null;
  discount: number | null;
  stockQuantity: number;
  active: boolean;
  /** Admin-controlled tri-state (in_stock): hidden/available/out_of_stock — never derived from stockQuantity. */
  availability: Availability;
};

/** Map a legacy boolean|null inStock value to the tri-state availability. */
export function toAvailability(inStock?: boolean | null): Availability {
  if (inStock === true) return "available";
  if (inStock === false) return "out_of_stock";
  return "hidden";
}

type Listener = () => void;

const TTL_MS = 30_000;
const BATCH_DELAY_MS = 60;

const g = globalThis as unknown as {
  __commerceStore?: {
    data: Map<string, { value: CommerceData; expiresAt: number }>;
    listeners: Map<string, Set<Listener>>;
    pending: Set<string>;
    timer: ReturnType<typeof setTimeout> | null;
  };
};

function store() {
  if (!g.__commerceStore) {
    g.__commerceStore = { data: new Map(), listeners: new Map(), pending: new Set(), timer: null };
  }
  return g.__commerceStore;
}

function emit(slug: string) {
  store().listeners.get(slug)?.forEach((l) => l());
}

async function flushBatch() {
  const s = store();
  s.timer = null;
  const slugs = [...s.pending];
  s.pending.clear();
  if (slugs.length === 0) return;

  try {
    const res = await fetch(`/api/products/commerce?slugs=${encodeURIComponent(slugs.join(","))}`);
    if (!res.ok) return;
    const json = (await res.json()) as { commerce?: Record<string, CommerceData> };
    const now = Date.now();
    for (const [slug, value] of Object.entries(json.commerce ?? {})) {
      s.data.set(slug, { value, expiresAt: now + TTL_MS });
      emit(slug);
    }
  } catch {
    /* network unavailable → static values remain */
  }
}

function requestCommerce(slug: string): void {
  const s = store();
  if (s.data.has(slug) || s.pending.has(slug)) return;
  const cached = s.data.get(slug);
  if (cached && cached.expiresAt > Date.now()) return;
  s.pending.add(slug);
  if (!s.timer) s.timer = setTimeout(flushBatch, BATCH_DELAY_MS);
}

function subscribe(slug: string, listener: Listener): () => void {
  const s = store();
  let set = s.listeners.get(slug);
  if (!set) {
    set = new Set();
    s.listeners.set(slug, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
  };
}

function getSnapshot(slug: string): CommerceData | null {
  const entry = store().data.get(slug);
  return entry && entry.expiresAt > Date.now() ? entry.value : null;
}

/**
 * Returns canonical commerce fields for a product slug, or null while
 * loading/unavailable. Never triggers per-card requests — batches globally.
 */
export function useCommerceOverlay(slug: string): CommerceData | null {
  const [data, setData] = useState<CommerceData | null>(() => getSnapshot(slug));

  useEffect(() => {
    setData(getSnapshot(slug));
    requestCommerce(slug);
    return subscribe(slug, () => setData(getSnapshot(slug)));
  }, [slug]);

  return data;
}
