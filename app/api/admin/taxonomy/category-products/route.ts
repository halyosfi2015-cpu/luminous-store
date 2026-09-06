import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { getTaxonomySummariesForNode } from "@/src/lib/taxonomy";
import { publishedProductSummaries } from "@/src/data/product-summaries";

function isGlobalBrand(brand: string): boolean {
  return /[a-zA-Z]/.test(brand || "");
}

/** Top products for a category, ranked exactly like the storefront TrendingNow engine. */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const ranked = getTaxonomySummariesForNode(publishedProductSummaries, slug)
    .map((p) => {
      let score = 0;
      if (p.isBestSeller) score += 1000;
      if (p.isFeatured) score += 800;
      if (p.isNew) score += 400;
      score += (p.rating || 0) * 50;
      score += Math.min(p.reviewCount || 0, 200);
      if (isGlobalBrand(p.brand)) score += 300;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ p }) => ({
      slug: p.slug,
      nameAr: p.name.ar,
      nameEn: p.name.en,
      brand: p.brand,
      image: p.gallery[0] ?? null,
    }));

  return NextResponse.json({ slug, results: ranked });
}
