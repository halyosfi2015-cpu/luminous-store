import type { SkinType, SkinConcern, ProductSummary } from "@/src/types/product";
import { publishedProductSummaries as productSummaries } from "@/src/data/product-summaries";
import { getRoutines } from "@/src/data/routines-store";
import { experts } from "@/src/data/experts";
import type { Expert } from "@/src/types/expert";
import type { Routine } from "@/src/types/product";

export type SkinAnalysisProfile = {
  skinTypes: SkinType[];
  skinConcerns: SkinConcern[];
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

const CONCERN_TO_ROUTINE_TYPES: Record<SkinConcern, string[]> = {
  acne: ["acne"],
  dryness: ["dryness"],
  pigmentation: ["brightening"],
  aging: ["firming"],
  redness: ["sensitivity"],
  large_pores: ["oiliness"],
  uneven_texture: ["brightening"],
  dark_circles: ["eye"],
  oiliness: ["oiliness"],
  sensitivity: ["sensitivity"],
};

const ROUTINE_LEVEL_ORDER = ["basic", "standard", "premium"] as const;

export function getAnalyzedProducts(profile: SkinAnalysisProfile, count: number = 8): ProductSummary[] {
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

export function getAnalyzedRoutines(profile: SkinAnalysisProfile): Routine[] {
  const allRoutines = getRoutines().filter((r) => r.active);
  const matchedTypes = new Set<string>();

  for (const concern of profile.skinConcerns) {
    const types = CONCERN_TO_ROUTINE_TYPES[concern] || [];
    for (const t of types) matchedTypes.add(t);
  }

  if (matchedTypes.size === 0) {
    return allRoutines
      .filter((r) => r.type === "daily")
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .slice(0, 2);
  }

  const matched: Routine[] = [];
  for (const routineType of matchedTypes) {
    const candidates = allRoutines
      .filter((r) => r.type === routineType)
      .sort((a, b) => {
        const aIdx = ROUTINE_LEVEL_ORDER.indexOf(a.level as typeof ROUTINE_LEVEL_ORDER[number]);
        const bIdx = ROUTINE_LEVEL_ORDER.indexOf(b.level as typeof ROUTINE_LEVEL_ORDER[number]);
        return (aIdx === -1 ? 1 : aIdx) - (bIdx === -1 ? 1 : bIdx);
      });
    if (candidates.length > 0) matched.push(candidates[0]);
  }

  const dailyRoutines = allRoutines
    .filter((r) => r.type === "daily")
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, 1);

  return [...dailyRoutines, ...matched].slice(0, 4);
}

export function getRecommendedExpert(profile: SkinAnalysisProfile): Expert | null {
  const skinAnalysisExperts = experts.filter(
    (e) =>
      e.availableForConsultation &&
      e.services.includes("skin-analysis") &&
      e.isVerified,
  );

  if (skinAnalysisExperts.length === 0) return null;

  const primaryConcern = profile.skinConcerns[0];

  const specialtyMap: Record<SkinConcern, string[]> = {
    acne: ["acne-treatment", "skin-analysis"],
    dryness: ["skin-analysis", "product-recommendations"],
    pigmentation: ["skin-analysis", "hyperpigmentation"],
    aging: ["skin-analysis", "anti-aging"],
    redness: ["skin-analysis", "sensitive-skin"],
    large_pores: ["skin-analysis", "product-recommendations"],
    uneven_texture: ["skin-analysis", "product-recommendations"],
    dark_circles: ["skin-analysis", "product-recommendations"],
    oiliness: ["skin-analysis", "acne-treatment"],
    sensitivity: ["skin-analysis", "baby-skin-care"],
  };

  const desiredServices = specialtyMap[primaryConcern] || ["skin-analysis"];

  let bestExpert: Expert | null = null;
  let bestScore = -1;

  for (const expert of skinAnalysisExperts) {
    let score = 0;
    for (const service of desiredServices) {
      if (expert.services.includes(service)) score += 3;
    }
    if (expert.isFeatured) score += 2;
    score += expert.rating;
    if (expert.reviewCount > 50) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestExpert = expert;
    }
  }

  return bestExpert;
}

export function getAnalyzedCategories(profile: SkinAnalysisProfile): string[] {
  const categories = new Set<string>();
  for (const concern of profile.skinConcerns) {
    switch (concern) {
      case "acne":
      case "oiliness":
        categories.add("skincare");
        break;
      case "dryness":
      case "sensitivity":
      case "redness":
        categories.add("skincare");
        break;
      case "pigmentation":
      case "aging":
      case "uneven_texture":
        categories.add("skincare");
        break;
      case "dark_circles":
        categories.add("skincare");
        break;
      case "large_pores":
        categories.add("skincare");
        break;
    }
  }
  return Array.from(categories);
}
