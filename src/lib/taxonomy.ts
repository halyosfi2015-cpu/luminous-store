import {
  taxonomy,
  CUSTOM_NODE_SLUGS,
  getTaxonomyNodeById,
  getTaxonomyNodeBySlug,
  getTaxonomyChildren,
  getTaxonomyDescendants,
  getTaxonomyParent,
  getTaxonomyPath,
} from "@/src/data/taxonomy";
import { productMappings, reviewRequiredItems } from "@/src/lib/taxonomy/product-mappings";
import { onlyPublished } from "@/src/lib/publication";
import { products } from "@/src/data/products";
import type { TaxonomyNode } from "@/src/types/taxonomy";
import type { Product, ProductSummary, CategoryInfo } from "@/src/types/product";
import type { NavCategory } from "@/components/layout/navConfig";

/* ================================================================================================ */
/* MASTER TAXONOMY — runtime helpers                                                                 */
/* Single access layer over the Master Taxonomy + generated product mappings.                        */
/* ================================================================================================ */

/** Resolve any slug (taxonomy slug OR legacy slug) to a taxonomy node. */
export function resolveTaxonomyNode(slug: string): TaxonomyNode | undefined {
  return getTaxonomyNodeBySlug(slug);
}

/** Map a legacy categorySlug → its new canonical node slug (for 301 redirects / UI). */
export function legacyToNodeSlug(legacySlug: string): string | undefined {
  return getTaxonomyNodeBySlug(legacySlug)?.slug;
}

/** All descendants of a node (including itself) that can host products. */
function getMappedTargets(node: TaxonomyNode): Set<string> {
  const targets = new Set<string>([node.slug]);
  for (const d of getTaxonomyDescendants(node.id)) targets.add(d.slug);
  return targets;
}

/** Products whose taxonomy mapping resolves to this node or any descendant. */
export function getProductsByTaxonomyNode(nodeSlug: string): Product[] {
  const node = resolveTaxonomyNode(nodeSlug);
  if (!node) return [];
  const targets = getMappedTargets(node);
  const published = onlyPublished(products);
  return published.filter((p) => {
    const m = productMappings[p.id];
    if (!m) return false;
    return targets.has(m.categorySlug) || targets.has(m.subcategorySlug) || targets.has(m.productTypeSlug);
  });
}

/** Number of (published) products mapped to a node or its descendants. */
export function getTaxonomyProductCount(nodeSlug: string): number {
  return getProductsByTaxonomyNode(nodeSlug).length;
}

/** Breadcrumb path: root → category → subcategory → product-type (ancestors + node). */
export function getTaxonomyBreadcrumbs(nodeSlug: string): TaxonomyNode[] {
  const node = resolveTaxonomyNode(nodeSlug);
  if (!node) return [];
  return getTaxonomyPath(node).filter((n) => n.type !== "ROOT");
}

/** Direct ACTIVE children of a node that contain at least one product. */
export function getPopulatedChildren(nodeSlug: string): TaxonomyNode[] {
  const node = resolveTaxonomyNode(nodeSlug);
  if (!node) return [];
  return getTaxonomyChildren(node.id)
    .filter((c) => c.status === "ACTIVE" || getTaxonomyProductCount(c.slug) > 0)
    .sort((a, b) => a.order - b.order);
}

/* ─────────────────────────────── Navigation tree ─────────────────────────────── */

const categoryColorPalette = [
  "from-primary to-secondary",
  "from-secondary to-primary",
  "from-accent to-accent/80",
  "from-primary/80 to-secondary/80",
  "from-accent/80 to-primary/60",
  "from-amber-500 to-orange-600",
  "from-secondary/80 to-primary/80",
  "from-emerald-500 to-teal-600",
  "from-neutral-400 to-slate-400",
];

/**
 * Slugs that must ALWAYS appear in navigation/cards even when they contain no
 * products yet — they render a "coming soon" empty state instead of being hidden.
 */
const ALWAYS_SHOW_SLUGS = new Set([
  "accessories",
  "beauty-accessories",
  "hair-accessories",
  "personal-accessories",
  "misc-accessories",
  "mother-care",
  ...CUSTOM_NODE_SLUGS,
]);

const subColor = "from-primary/20 to-secondary/20";
const leafColor = "from-primary/30 to-secondary/30";

function nodeToNav(node: TaxonomyNode, color: string): NavCategory {
  return {
    id: node.slug,
    slug: node.slug,
    labelAr: node.nameAr,
    labelEn: node.nameEn,
    iconName: node.icon ?? "sparkles",
    color,
    descriptionAr: node.descriptionAr,
    descriptionEn: node.descriptionEn,
  };
}

/**
 * Build the navigation tree straight from the Master Taxonomy.
 * - CATEGORY (level 1) → SUBCATEGORY (level 2) → PRODUCT_TYPE (level 3).
 * - Only nodes that contain products are emitted (empty FUTURE nodes hidden;
 *   FUTURE nodes WITH products are shown, satisfying "no empty future categories").
 */
export function getTaxonomyNavTree(): NavCategory[] {
  const categories = taxonomy.filter((n) => n.type === "CATEGORY").sort((a, b) => a.order - b.order);
  const tree: NavCategory[] = [];

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    if (getTaxonomyProductCount(cat.slug) === 0 && !ALWAYS_SHOW_SLUGS.has(cat.slug)) continue;

    const navCat = nodeToNav(cat, categoryColorPalette[i % categoryColorPalette.length]);
    const subcats = getTaxonomyChildren(cat.id)
      .filter((s) => s.type === "SUBCATEGORY")
      .sort((a, b) => a.order - b.order);

    const children: NavCategory[] = [];
    for (const sub of subcats) {
      const subProducts = getTaxonomyProductCount(sub.slug);
      if (subProducts === 0 && !ALWAYS_SHOW_SLUGS.has(sub.slug) && !ALWAYS_SHOW_SLUGS.has(cat.slug)) continue;

      const navSub = nodeToNav(sub, subColor);
      const pts = getTaxonomyChildren(sub.id)
        .filter((pt) => pt.type === "PRODUCT_TYPE")
        .sort((a, b) => a.order - b.order);

      const ptChildren: NavCategory[] = [];
      for (const pt of pts) {
        if (getTaxonomyProductCount(pt.slug) === 0) continue;
        ptChildren.push(nodeToNav(pt, leafColor));
      }

      if (ptChildren.length > 0) {
        navSub.children = ptChildren;
      }
      children.push(navSub);
    }

    if (children.length > 0) {
      navCat.children = children;
    }
    tree.push(navCat);
  }

  return tree;
}

/* ─────────────────────────────── Storefront category cards ─────────────────────────────── */

export interface TaxonomyCategoryCard {
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  productCount: number;
  children: { slug: string; name: string; nameAr: string; productCount: number }[];
}

/**
 * Top-level CATEGORY nodes with at least one mapped product, shaped for the
 * storefront category cards (home "Shop by Category", footer, category sidebar).
 * Descendant counts (subcategories) are included for drill-down UI.
 */
export function getTaxonomyCategoryCards(): TaxonomyCategoryCard[] {
  const categories = taxonomy
    .filter((n) => n.type === "CATEGORY")
    .sort((a, b) => a.order - b.order);

  return categories
    .map((cat) => {
      const count = getTaxonomyProductCount(cat.slug);
      const subcats = getTaxonomyChildren(cat.id)
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

/**
 * Taxonomy-aware category info used by legacy consumers that expected
 * `sectionCategories` / `categories` from product-summaries.
 */
export function getTaxonomyCategoryInfos(): CategoryInfo[] {
  return getTaxonomyCategoryCards().map((c) => ({
    slug: c.slug,
    name: c.name,
    nameAr: c.nameAr,
    description: c.description,
    descriptionAr: c.descriptionAr,
    icon: c.icon,
    productCount: c.productCount,
  }));
}

/** Published product summaries belonging to a taxonomy node (node + descendants). */
export function getTaxonomySummariesForNode(
  summaries: ProductSummary[],
  nodeSlug: string,
): ProductSummary[] {
  const node = resolveTaxonomyNode(nodeSlug);
  if (!node) return [];
  const targets = getMappedTargets(node);
  return summaries.filter((p) => {
    const m = productMappings[p.id];
    if (!m) return false;
    return targets.has(m.categorySlug) || targets.has(m.subcategorySlug) || targets.has(m.productTypeSlug);
  });
}

/* ─────────────────────────────── Coverage & review ─────────────────────────────── */

export interface TaxonomyCoverage {
  total: number;
  mapped: number;
  reviewRequired: number;
  unclassified: number;
  coveragePercent: number;
}

/** Product Coverage Report (real numbers, computed from the mapping file). */
export function getTaxonomyCoverage(): TaxonomyCoverage {
  const total = products.length;
  let mapped = 0;
  let reviewRequired = 0;
  for (const p of products) {
    const m = productMappings[p.id];
    if (m && m.status === "MAPPED") mapped++;
    else reviewRequired++;
  }
  const coveragePercent = total === 0 ? 0 : (mapped / total) * 100;
  return { total, mapped, reviewRequired, unclassified: reviewRequired, coveragePercent };
}

/** Full list of products flagged for Admin review (from the generated mapping). */
export function getReviewRequiredItems() {
  return reviewRequiredItems;
}

/* ─────────────────────────────── Legacy → new redirects ─────────────────────────────── */

export interface RedirectRule {
  from: string;
  to: string;
  code: 301;
}

/**
 * Build 301 redirect rules: every legacy categorySlug that existed in the old
 * classification → its canonical Master Taxonomy node slug.
 */
export function buildLegacyRedirects(): RedirectRule[] {
  const canonicalSlugs = new Set(taxonomy.map((n) => n.slug));
  const seen = new Set<string>();
  const rules: RedirectRule[] = [];
  for (const n of taxonomy) {
    for (const legacy of n.legacySlugs ?? []) {
      if (seen.has(legacy) || legacy === n.slug) continue;
      if (canonicalSlugs.has(legacy)) continue; // canonical slug wins over a legacy alias
      seen.add(legacy);
      rules.push({ from: `/categories/${legacy}`, to: `/categories/${n.slug}`, code: 301 });
    }
  }
  return rules;
}

export { getTaxonomyNodeBySlug, getTaxonomyNodeById, getTaxonomyParent, getTaxonomyChildren };