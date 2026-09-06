/**
 * Master Taxonomy — data model (single source of truth for product classification).
 * See src/data/taxonomy.ts for the actual tree.
 */

export type TaxonomyNodeType = "ROOT" | "CATEGORY" | "SUBCATEGORY" | "PRODUCT_TYPE";

export type TaxonomyStatus = "ACTIVE" | "FUTURE" | "HIDDEN";

export interface TaxonomyNode {
  id: string;
  parentId: string | null;
  slug: string;
  nameAr: string;
  nameEn: string;
  type: TaxonomyNodeType;
  order: number;
  status: TaxonomyStatus;
  icon?: string;
  image?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  /** Legacy slugs (previous classification) that map onto this node. */
  legacySlugs?: string[];
}

/** Classification confidence levels. */
export type MappingConfidence = "high" | "medium" | "low";

export type MappingStatus = "MAPPED" | "REVIEW_REQUIRED";

export interface ProductTaxonomyMapping {
  productId: string;
  categorySlug: string;
  subcategorySlug: string;
  productTypeSlug: string;
  confidence: MappingConfidence;
  status: MappingStatus;
  /** Explanation of the mapping decision (used by Admin review). */
  reason?: string;
  /** Original legacy categorySlug before the Master Taxonomy mapping. */
  legacyCategorySlug?: string;
}

/** A product flagged for Admin review (uncertain classification). */
export interface ReviewRequiredItem {
  productId: string;
  proposedCategory: string;
  proposedSubcategory: string;
  proposedProductType: string;
  confidence: MappingConfidence;
  reason: string;
}