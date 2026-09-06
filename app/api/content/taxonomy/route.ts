import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/src/lib/site-settings";
import { BASE_TAXONOMY } from "@/src/data/taxonomy";
import { getTaxonomyProductCount } from "@/src/lib/taxonomy";
import { mergeTaxonomyOverrides } from "@/src/lib/taxonomy-merge";
import type { TaxonomyNode } from "@/src/types/taxonomy";
import type { TaxonomyOverrides } from "@/src/lib/content-store";

export const dynamic = "force-dynamic";

interface TaxonomyCategoryCard {
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  productCount: number;
  children: { slug: string; name: string; nameAr: string; productCount: number }[];
}

const ALWAYS_SHOW_SLUGS = new Set([
  "accessories", "home-fragrance", "oral-care", "contact-lenses", "mother-baby",
  "health-wellness", "appliances-tools", "personal-care",
]);

function buildCategoryCards(mergedTaxonomy: TaxonomyNode[]): TaxonomyCategoryCard[] {
  const categories = mergedTaxonomy
    .filter((n) => n.type === "CATEGORY")
    .sort((a, b) => a.order - b.order);

  const childrenOf = (parentId: string) =>
    mergedTaxonomy.filter((n) => n.parentId === parentId);

  return categories
    .map((cat) => {
      const count = getTaxonomyProductCount(cat.slug);
      const subcats = childrenOf(cat.id)
        .filter((s) => s.type === "SUBCATEGORY")
        .sort((a, b) => a.order - b.order);
      const children = subcats
        .filter(
          (s) =>
            getTaxonomyProductCount(s.slug) > 0 ||
            ALWAYS_SHOW_SLUGS.has(s.slug) ||
            ALWAYS_SHOW_SLUGS.has(cat.slug)
        )
        .map((s) => ({
          slug: s.slug,
          name: s.nameEn,
          nameAr: s.nameAr,
          productCount: getTaxonomyProductCount(s.slug),
        }));
      return {
        slug: cat.slug,
        name: cat.nameEn,
        nameAr: cat.nameAr,
        description: cat.descriptionEn ?? "",
        descriptionAr: cat.descriptionAr ?? "",
        icon: cat.icon ?? "sparkles",
        productCount: count,
        children,
      };
    })
    .filter((c) => c.productCount > 0 || ALWAYS_SHOW_SLUGS.has(c.slug));
}

export async function GET(_request: NextRequest) {
  try {
    const overrides = await getSetting<TaxonomyOverrides>("taxonomy_overrides", { nodes: [], hiddenSlugs: [] });
    const merged = mergeTaxonomyOverrides(BASE_TAXONOMY, overrides);
    const customSlugs = (overrides.nodes ?? []).map((n: TaxonomyNode) => n.slug);
    const categoryCards = buildCategoryCards(merged);
    return NextResponse.json(
      { taxonomy: merged, categoryProducts: overrides.categoryProducts ?? {}, customSlugs, categoryCards },
      { headers: { "Cache-Control": "no-store, must-revalidate" } }
    );
  } catch {
    const categoryCards = buildCategoryCards(BASE_TAXONOMY);
    return NextResponse.json(
      { taxonomy: BASE_TAXONOMY, categoryProducts: {}, customSlugs: [], categoryCards },
      { headers: { "Cache-Control": "no-store, must-revalidate" } }
    );
  }
}
