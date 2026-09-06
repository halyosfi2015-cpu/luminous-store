import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase";

/**
 * COMMERCE OVERLAY API
 * Canonical, dynamic commercial fields for storefront cards.
 * Identity/description stay static; price/discount/stock/active come from DB.
 * Scoped query only — never returns the full catalog.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type Availability = "hidden" | "available" | "out_of_stock";

type CommerceEntry = {
  slug: string;
  price: number | null;
  originalPrice: number | null;
  discount: number | null;
  stockQuantity: number;
  active: boolean;
  /** Admin-controlled tri-state from in_stock: null=hidden, true=available, false=out_of_stock. */
  availability: Availability;
};

const cache = new Map<string, { data: CommerceEntry; expiresAt: number }>();
const TTL_MS = 30_000;

export async function GET(request: NextRequest) {
  const slugsParam = request.nextUrl.searchParams.get("slugs") ?? "";
  const slugs = [...new Set(slugsParam.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 200);
  if (slugs.length === 0) {
    return NextResponse.json({ error: "slugs required" }, { status: 400 });
  }

  const now = Date.now();
  const result: Record<string, CommerceEntry> = {};
  const missing: string[] = [];

  for (const slug of slugs) {
    const hit = cache.get(slug);
    if (hit && hit.expiresAt > now) result[slug] = hit.data;
    else missing.push(slug);
  }

  if (missing.length > 0) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("products")
        .select("slug, pricing, discount, stock_quantity, is_active, in_stock")
        .in("slug", missing);
      if (!error && Array.isArray(data)) {
        const found = new Set<string>();
        for (const row of data as Array<{ slug: string; pricing: { price?: number; originalPrice?: number } | null; discount: number | null; stock_quantity: number | null; is_active: boolean | null; in_stock: boolean | null }>) {
          found.add(row.slug);
          const entry: CommerceEntry = {
            slug: row.slug,
            price: Number.isFinite(Number(row.pricing?.price)) ? Number(row.pricing!.price) : null,
            originalPrice: Number.isFinite(Number(row.pricing?.originalPrice)) ? Number(row.pricing!.originalPrice) : null,
            discount: Number.isFinite(Number(row.discount)) ? Number(row.discount) : null,
            stockQuantity: Math.max(0, Number(row.stock_quantity ?? 0)),
            active: row.is_active !== false,
            availability: row.in_stock === true ? "available" : row.in_stock === false ? "out_of_stock" : "hidden",
          };
          result[row.slug] = entry;
          cache.set(row.slug, { data: entry, expiresAt: now + TTL_MS });
        }
        for (const slug of missing) {
          if (!found.has(slug)) {
            // Not in canonical catalog — signal absence so UI can hide/disable.
            result[slug] = { slug, price: null, originalPrice: null, discount: null, stockQuantity: 0, active: false, availability: "hidden" };
            cache.set(slug, { data: result[slug], expiresAt: now + TTL_MS });
          }
        }
      }
    } catch {
      // Supabase unavailable → return only cached entries; UI keeps static values.
    }
  }

  return NextResponse.json(
    { commerce: result },
    { headers: { "Cache-Control": "no-store" } }
  );
}
