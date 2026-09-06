export interface NavCategory {
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

/*
 * Three-level category tree derived from the Master Taxonomy (src/data/taxonomy.ts).
 * Level 1 = CATEGORY, Level 2 = SUBCATEGORY, Level 3 = PRODUCT_TYPE.
 * Empty nodes (no mapped products) are omitted; FUTURE nodes WITH products appear.
 * The NavCategory shape is preserved so all existing consumers keep working.
 */
import { getTaxonomyNavTree } from "@/src/lib/taxonomy";

export let categoryTree: NavCategory[] = getTaxonomyNavTree();

export async function fetchCategoryTreeFromAPI(): Promise<NavCategory[]> {
  try {
    const res = await fetch("/api/content/taxonomy/tree", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.categoryTree) && data.categoryTree.length > 0) {
        categoryTree = data.categoryTree;
        return categoryTree;
      }
    }
  } catch {}
  return categoryTree;
}
