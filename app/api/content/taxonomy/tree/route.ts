import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/src/lib/site-settings";
import { BASE_TAXONOMY } from "@/src/data/taxonomy";
import { mergeTaxonomyOverrides } from "@/src/lib/taxonomy-merge";
import type { TaxonomyNode } from "@/src/types/taxonomy";
import type { TaxonomyOverrides } from "@/src/lib/content-store";

export const dynamic = "force-dynamic";

interface NavCategory {
  id: string;
  slug: string;
  labelAr: string;
  labelEn: string;
  iconName: string;
  color: string;
  descriptionAr?: string;
  descriptionEn?: string;
  children?: NavCategory[];
}

const categoryColorPalette = [
  "from-pink-500 to-rose-500",
  "from-violet-500 to-purple-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-red-500 to-pink-500",
  "from-indigo-500 to-blue-500",
  "from-teal-500 to-emerald-500",
];

function nodeToNav(node: TaxonomyNode, color: string): NavCategory {
  return {
    id: node.id,
    slug: node.slug,
    labelAr: node.nameAr,
    labelEn: node.nameEn,
    iconName: node.icon ?? "package",
    color,
    descriptionAr: node.descriptionAr,
    descriptionEn: node.descriptionEn,
  };
}

function buildNavTree(mergedTaxonomy: TaxonomyNode[]): NavCategory[] {
  const categories = mergedTaxonomy.filter((n) => n.type === "CATEGORY").sort((a, b) => a.order - b.order);
  const tree: NavCategory[] = [];
  const childrenOf = (parentId: string) =>
    mergedTaxonomy.filter((n) => n.parentId === parentId);

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const navCat = nodeToNav(cat, categoryColorPalette[i % categoryColorPalette.length]);
    const subcats = childrenOf(cat.id)
      .filter((s) => s.type === "SUBCATEGORY")
      .sort((a, b) => a.order - b.order);

    const children: NavCategory[] = [];
    for (const sub of subcats) {
      const navSub = nodeToNav(sub, "from-gray-400 to-gray-500");
      const pts = childrenOf(sub.id)
        .filter((pt) => pt.type === "PRODUCT_TYPE")
        .sort((a, b) => a.order - b.order);

      const ptChildren: NavCategory[] = [];
      for (const pt of pts) {
        ptChildren.push(nodeToNav(pt, "from-gray-300 to-gray-400"));
      }
      if (ptChildren.length > 0) navSub.children = ptChildren;
      children.push(navSub);
    }
    if (children.length > 0) navCat.children = children;
    tree.push(navCat);
  }
  return tree;
}

export async function GET(_request: NextRequest) {
  try {
    const overrides = await getSetting<TaxonomyOverrides>("taxonomy_overrides", { nodes: [], hiddenSlugs: [] });
    const merged = mergeTaxonomyOverrides(BASE_TAXONOMY, overrides);
    const categoryTree = buildNavTree(merged);
    return NextResponse.json(
      { categoryTree },
      { headers: { "Cache-Control": "no-store, must-revalidate" } }
    );
  } catch {
    const categoryTree = buildNavTree(BASE_TAXONOMY);
    return NextResponse.json(
      { categoryTree },
      { headers: { "Cache-Control": "no-store, must-revalidate" } }
    );
  }
}
