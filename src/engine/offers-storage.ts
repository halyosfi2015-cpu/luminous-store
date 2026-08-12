import type { EngineConfig, EngineStats, MonthCampaign, WeeklyCampaign } from "./types";

/**
 * Offers Storage Adapter
 *
 * Single persistence layer for the Offers Engine.
 * Phase 6.5 Wave 3B — Step 2: engine ↔ storage adapter integration.
 *
 * The engine (`src/engine/engine.ts`) delegates ALL persistence here:
 *   - Config & stats → localStorage (same keys as before, seamless upgrade).
 *   - Campaigns → localStorage fast-path/fallback + write-through to Supabase
 *     via the authenticated Admin API (`/api/admin/offers`).
 *   - Reset → clears engine localStorage keys + Supabase `offers` rows (via
 *     the same authenticated API), without touching unrelated tables/keys.
 *
 * Authorization stays at the API layer (requireAdmin + RLS); this module only
 * performs signed-in requests from the browser.
 */

export const CONFIG_KEY = "luminous-offers-engine";
export const STATS_KEY = "luminous-offers-stats";
export const campaignKey = (year: number, month: number) => `luminous-month-${year}-${month}`;

export const OFFERS_API = "/api/admin/offers";

// ─── Config ───────────────────────────────────────────────────────────────────

function defaultConfig(): EngineConfig {
  return {
    enabled: true,
    highDemandDiscount: 10,
    lowDemandDiscount: 15,
    productsPerWeek: 12,
    maxDiscount: 30,
    minDiscount: 5,
    excludedProductIds: [],
    pinnedProductIds: [],
    seasonalOverrides: [],
    lastUpdated: new Date().toISOString(),
  };
}

export function getConfig(): EngineConfig {
  if (typeof window === "undefined") return defaultConfig();
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return defaultConfig();
    return { ...defaultConfig(), ...JSON.parse(raw) };
  } catch {
    return defaultConfig();
  }
}

export function saveConfig(config: EngineConfig): void {
  if (typeof window === "undefined") return;
  config.lastUpdated = new Date().toISOString();
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // localStorage unavailable — best effort
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function defaultStats(): EngineStats {
  return {
    totalOffersGenerated: 0,
    uniqueProductsOffered: 0,
    categoryCoverage: {},
    lastGeneratedWeek: null,
  };
}

export function getStats(): EngineStats {
  if (typeof window === "undefined") return defaultStats();
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : defaultStats();
  } catch {
    return defaultStats();
  }
}

export function saveStats(stats: EngineStats): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // localStorage unavailable — best effort
  }
}

// ─── Deterministic UUID v5 (pure JS — isomorphic, no node:crypto) ───────────

// SHA-1 over bytes → 20-byte digest. Operates on Uint8Array, safe in both
// browser and Node. Used only to derive deterministic v5 UUIDs for rows.
function sha1Bytes(input: Uint8Array): Uint8Array {
  const ml = input.length * 8;
  const paddedLen = Math.ceil((input.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(input);
  padded[input.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(ml / 0x100000000));
  view.setUint32(paddedLen - 4, ml >>> 0);

  const w = new Uint32Array(80);
  const rotl = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0;
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;

  for (let block = 0; block < paddedLen; block += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(block + i * 4);
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);

    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const temp = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d; d = c; c = rotl(b, 30); b = a; a = temp;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }

  const out = new Uint8Array(20);
  [h0, h1, h2, h3, h4].forEach((h, i) => {
    out[i * 4] = (h >>> 24) & 0xff;
    out[i * 4 + 1] = (h >>> 16) & 0xff;
    out[i * 4 + 2] = (h >>> 8) & 0xff;
    out[i * 4 + 3] = h & 0xff;
  });
  return out;
}

// RFC 4122 DNS namespace (standard constant) — kept as bytes.
const DNS_NAMESPACE = new Uint8Array([
  0x6b, 0xa7, 0xb8, 0x10, 0x9d, 0xad, 0x11, 0xd1,
  0x80, 0xb4, 0x00, 0xc0, 0x4f, 0xd4, 0x30, 0xc8,
]);

function uuidv5(name: string): string {
  const nameBytes = new TextEncoder().encode(name);
  const combined = new Uint8Array(DNS_NAMESPACE.length + nameBytes.length);
  combined.set(DNS_NAMESPACE, 0);
  combined.set(nameBytes, DNS_NAMESPACE.length);
  const digest = sha1Bytes(combined);
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Deterministic row id derived from (year, month, week).
 * Same triple always yields the same UUID → upsert(onConflict:'id')
 * overwrites instead of duplicating.
 */
export function deterministicOfferRowId(year: number, month: number, week: number): string {
  return uuidv5(`luminous-offers:${year}:${month}:${week}`);
}

// ─── Campaigns — row mapping ─────────────────────────────────────────────────

export type OfferRow = {
  id?: string;
  title?: { ar?: string; en?: string } | null;
  month: number;
  year: number;
  week: number;
  products: WeeklyCampaign["products"];
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
};

// Map a campaign's weeks into `offers` table rows (one row per week).
export function campaignToRows(year: number, month: number, campaign: MonthCampaign): OfferRow[] {
  const weeks = campaign.weeks ?? [];
  return weeks.map((week) => ({
    id: deterministicOfferRowId(year, month, week.week),
    month,
    year,
    week: week.week,
    products: (week.products ?? []) as WeeklyCampaign["products"],
    start_date: week.startDate || null,
    end_date: week.endDate || null,
    is_active: week.isActive,
  }));
}

export function rowToWeeklyCampaign(row: OfferRow): WeeklyCampaign {
  return {
    id: `wc-${row.year}-${row.month}-${row.week}`,
    month: row.month,
    year: row.year,
    week: row.week as WeeklyCampaign["week"],
    products: row.products ?? [],
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    isActive: row.is_active !== false,
  };
}

export function rowsToMonthCampaign(rows: OfferRow[]): MonthCampaign | null {
  if (!rows || rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => a.week - b.week);
  const first = sorted[0];
  return {
    id: `mc-${first.year}-${first.month}`,
    month: first.month,
    year: first.year,
    weeks: sorted.map(rowToWeeklyCampaign),
    topSellersProductIds: [],
  };
}

// ─── Campaigns — local fast-path (sync) ──────────────────────────────────────

export function getLocalCampaign(year: number, month: number): MonthCampaign | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(campaignKey(year, month));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalCampaign(campaign: MonthCampaign): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(campaignKey(campaign.year, campaign.month), JSON.stringify(campaign));
  } catch {
    // localStorage unavailable — Supabase (via API) is the durable source
  }
}

// ─── Campaigns — Supabase via Admin API (async, localStorage fallback) ───────

// Serializes Supabase writes so that a reset (DELETE) followed by a campaign
// save (POST) — e.g. engine.forceRegenerate() — never races: the DELETE is
// guaranteed to complete before the POST lands, preventing a fresh campaign
// from being wiped by a trailing reset.
let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite(fn: () => Promise<void>): Promise<void> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => {});
  return run;
}

export async function getCampaign(year: number, month: number): Promise<MonthCampaign | null> {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`${OFFERS_API}?year=${year}&month=${month}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const rows: OfferRow[] | undefined = json?.rows;
        if (rows && rows.length > 0) return rowsToMonthCampaign(rows);
      }
    } catch {
      // fall through to localStorage
    }
  }
  return getLocalCampaign(year, month);
}

export async function saveCampaign(
  year: number,
  month: number,
  campaign: MonthCampaign,
): Promise<void> {
  saveLocalCampaign(campaign);
  if (typeof window === "undefined") return;
  return enqueueWrite(async () => {
    try {
      await fetch(OFFERS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, campaign }),
      });
    } catch {
      // API unavailable — localStorage fallback already written
    }
  });
}

// ─── Reset / Clear (localStorage + Supabase via Admin API) ───────────────────

/**
 * Clears engine-owned state only: the engine config/stats localStorage keys,
 * all `luminous-month-*` campaign keys, and all rows in the Supabase `offers`
 * table (via DELETE /api/admin/offers). Other tables/keys are untouched.
 */
export async function reset(): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const keys = Object.keys(localStorage).filter(
        (k) => k === CONFIG_KEY || k === STATS_KEY || k.startsWith("luminous-month-"),
      );
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore localStorage failures
    }
  }
  if (typeof window === "undefined") return;
  return enqueueWrite(async () => {
    try {
      await fetch(OFFERS_API, { method: "DELETE" });
    } catch {
      // API unavailable — local state already cleared
    }
  });
}
