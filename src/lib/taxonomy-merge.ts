import type { TaxonomyNode } from "@/src/types/taxonomy";

export interface TaxonomyOverridesInput {
  nodes: TaxonomyNode[];
  hiddenSlugs: string[];
}

/** Apply taxonomy overrides (upsert by id + hide by slug) over a base tree. */
export function mergeTaxonomyOverrides(
  base: TaxonomyNode[],
  overrides: TaxonomyOverridesInput,
): TaxonomyNode[] {
  const hidden = new Set(overrides.hiddenSlugs ?? []);
  const merged = base.filter((n) => !hidden.has(n.slug));
  for (const node of overrides.nodes ?? []) {
    const idx = merged.findIndex((n) => n.id === node.id);
    if (idx >= 0) merged[idx] = { ...merged[idx], ...node };
    else merged.push(node);
  }
  return merged;
}

/** Slugs contributed by admin-added/overridden nodes (so empty ones can still show). */
export function customNodeSlugs(overrides: TaxonomyOverridesInput): string[] {
  return (overrides.nodes ?? []).map((n) => n.slug);
}