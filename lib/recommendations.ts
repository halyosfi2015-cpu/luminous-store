import type { SkinType, SkinConcern } from "@/types/product";
import { publishedProductSummaries as productSummaries } from "@/src/data/product-summaries";
import type { ProductSummary } from "@/src/types/product";

export type SkinProfile = {
  skinTypes: SkinType[];
  skinConcerns: SkinConcern[];
  completedAt: string;
};

const CONCERN_PRIORITY: Record<SkinConcern, number> = {
  acne: 5,
  dryness: 4,
  pigmentation: 4,
  aging: 4,
  redness: 3,
  large_pores: 3,
  uneven_texture: 2,
  dark_circles: 2,
  oiliness: 3,
  sensitivity: 3,
};

export function getPersonalizedProducts(profile: SkinProfile, count: number = 8): ProductSummary[] {
  const targetTypes = new Set(profile.skinTypes);
  const targetConcerns = new Set(profile.skinConcerns);

  return productSummaries
    .map((p) => {
      let score = 0;

      const pTypes = (p.skinTypes || []) as SkinType[];
      if (pTypes.some((t) => targetTypes.has(t))) score += 3;

      const pConcerns = (p.skinConcerns || []) as SkinConcern[];
      for (const concern of pConcerns) {
        if (targetConcerns.has(concern)) {
          score += CONCERN_PRIORITY[concern] || 2;
        }
      }

      if (p.isDoctorRecommended) score += 2;
      if (p.isFeatured) score += 1;

      return { product: p, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ product }) => product);
}

export function getRoutineFromProfile(profile: SkinProfile): string[] {
  const concerns = profile.skinConcerns;
  const selected: string[] = [];

  if (concerns.includes("acne") || concerns.includes("oiliness")) {
    selected.push("rt3");
  }
  if (concerns.includes("aging")) {
    selected.push("rt4");
  }
  if (concerns.includes("dryness")) {
    selected.push("rt5");
  }
  if (concerns.includes("acne") || concerns.includes("oiliness")) {
    selected.push("rt2");
  }

  return selected;
}
