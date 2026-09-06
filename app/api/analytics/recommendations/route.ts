import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

type EventRow = { entity_id: string | null };
type ProductRow = {
  id: string;
  slug: string;
  name: { ar?: string; en?: string } | null;
  pricing: { price?: number; originalPrice?: number } | null;
  hero_image: string | null;
  gallery: string[] | null;
  is_featured: boolean | null;
  is_best_seller: boolean | null;
  rating: number | null;
  review_count: number | null;
  brands: { name?: string; name_ar?: string; slug?: string } | null;
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 8, 20);
    const excludeIds = url.searchParams.get("excludeIds")?.split(",").filter(Boolean) || [];

    const supabase = createAdminClient();

    // Get trending products from recent events (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: eventsRaw } = await supabase
      .from("customer_events")
      .select("entity_id")
      .gte("occurred_at", sevenDaysAgo)
      .eq("event_type", "product_view")
      .not("entity_id", "is", null);

    const events = (eventsRaw ?? []) as EventRow[];

    if (events.length === 0) {
      // Fallback: return featured products
      const { data: featured } = await supabase
        .from("products")
        .select("id, slug, name, pricing, hero_image, gallery, is_featured, is_best_seller, rating, review_count")
        .eq("is_active", true)
        .eq("status", "active")
        .eq("is_featured", true)
        .order("display_order", { ascending: true })
        .limit(limit);

      return NextResponse.json(
        { recommendations: mapProducts((featured ?? []) as ProductRow[], "trending") },
        { headers: { "Cache-Control": "public, max-age=300" } }
      );
    }

    // Score products by view frequency
    const viewCounts = new Map<string, number>();
    for (const evt of events) {
      const pid = evt.entity_id;
      if (!pid || excludeIds.includes(pid)) continue;
      viewCounts.set(pid, (viewCounts.get(pid) || 0) + 1);
    }

    const sorted = [...viewCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit + excludeIds.length)
      .map(([pid, count]) => ({ product_id: pid, view_count: count, score: count }));

    const productIds = sorted.map((s) => s.product_id);

    // Fetch product details
    const { data: productsRaw } = await supabase
      .from("products")
      .select("id, slug, name, pricing, hero_image, gallery, is_featured, is_best_seller, rating, review_count, brands(name, name_ar, slug)")
      .in("id", productIds)
      .eq("is_active", true);

    const products = (productsRaw ?? []) as ProductRow[];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const recommendations = sorted
      .filter((s) => productMap.has(s.product_id))
      .slice(0, limit)
      .map((s) => {
        const p = productMap.get(s.product_id)!;
        return {
          product_id: s.product_id,
          slug: p.slug,
          name: p.name?.ar ?? p.name?.en ?? "",
          brand: p.brands?.name_ar ?? p.brands?.name ?? "",
          brandSlug: p.brands?.slug ?? "",
          image: p.hero_image ?? (p.gallery?.[0]) ?? "",
          price: p.pricing?.price ?? 0,
          originalPrice: p.pricing?.originalPrice ?? undefined,
          rating: p.rating ?? 0,
          reviewCount: p.review_count ?? 0,
          score: s.score,
          reason: "trending",
          reasonAr: "رائج هذا الأسبوع",
          type: "trending",
        };
      });

    return NextResponse.json(
      { recommendations },
      { headers: { "Cache-Control": "public, max-age=300" } }
    );
  } catch (err) {
    console.error("recommendations error:", err);
    return NextResponse.json(
      { recommendations: [] },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  }
}

function mapProducts(products: ProductRow[], type: string) {
  return products.map((p) => ({
    product_id: p.id,
    slug: p.slug,
    name: p.name?.ar ?? p.name?.en ?? "",
    brand: "",
    brandSlug: "",
    image: p.hero_image ?? (p.gallery?.[0]) ?? "",
    price: p.pricing?.price ?? 0,
    originalPrice: p.pricing?.originalPrice ?? undefined,
    rating: p.rating ?? 0,
    reviewCount: p.review_count ?? 0,
    score: p.is_best_seller ? 10 : p.is_featured ? 8 : 5,
    reason: type,
    reasonAr: type === "trending" ? "رائج" : "مميز",
    type,
  }));
}
