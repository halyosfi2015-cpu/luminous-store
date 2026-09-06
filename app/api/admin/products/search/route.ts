import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { searchProducts } from "@/src/lib/product-dal";

/**
 * Scoped product search for admin pickers.
 * Reuses the canonical DAL searchProducts — returns at most 10 lightweight
 * summaries so the client never receives the full catalog.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }
  const matches = await searchProducts(q);
  const results = matches.slice(0, 10).map((p) => ({
    slug: p.slug,
    nameAr: p.name.ar,
    nameEn: p.name.en,
    brand: p.brand,
    image: p.images?.[0] ?? null,
  }));
  return NextResponse.json({ results });
}