import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase-server";

/**
 * Public canonical read of APPROVED customer reviews.
 * Storefront shows only admin-approved reviews — never fabricated data.
 * If there are none, the payload is empty and the UI hides itself gracefully.
 */

export const runtime = "nodejs";

type DbReview = {
  id: string;
  product_id: string;
  customer_name: string;
  customer_name_ar: string | null;
  avatar: string | null;
  rating: number;
  comment: string;
  comment_ar: string | null;
  review_date: string | null;
  is_verified: boolean;
  helpful_count: number | null;
};

type DbProduct = {
  id: string;
  slug: string;
  name_ar: string | null;
  name_en: string | null;
};

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: reviewRows, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(24);

    if (error) {
      return NextResponse.json(
        { reviews: [], error: "service_unavailable" },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    const rows = (reviewRows ?? []) as unknown as DbReview[];

    // Resolve product slugs/names for review → product linking
    const productIds = [...new Set(rows.map((r) => r.product_id))];
    const productsById = new Map<string, DbProduct>();
    if (productIds.length > 0) {
      const { data: prodRows } = await supabase
        .from("products")
        .select("id, slug, name_ar, name_en")
        .in("id", productIds);
      for (const p of (prodRows ?? []) as unknown as DbProduct[]) {
        productsById.set(p.id, p);
      }
    }

    const reviews = rows.map((r) => {
      const prod = productsById.get(r.product_id);
      return {
        id: r.id,
        customerName: r.customer_name_ar?.trim() || r.customer_name,
        avatar: r.avatar || undefined,
        rating: r.rating,
        comment: r.comment_ar?.trim() || r.comment,
        date: r.review_date || undefined,
        verifiedPurchase: r.is_verified === true,
        helpfulCount: r.helpful_count ?? 0,
        product: prod
          ? { slug: prod.slug, nameAr: prod.name_ar || prod.name_en || "" }
          : null,
      };
    });

    return NextResponse.json(
      { reviews },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { reviews: [], error: "service_unavailable" },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
