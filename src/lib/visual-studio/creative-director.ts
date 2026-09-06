import { CONTENT_PILLARS, type ContentPillar } from "@/src/lib/content-ops/monthly-simulation";
import { TEMPLATE_CATALOG, type VisualTemplateDef } from "./templates";

export type CreativeMode = "product-story" | "education-carousel" | "comparison" | "routine-builder" | "discovery" | "offer";

export interface CreativePlan {
  pillar: ContentPillar;
  mode: CreativeMode;
  templateIds: string[];
  contentBlocks: string[];
  visualRules: string[];
  categoryHints: string[];
  requiresPrice: boolean;
  requiresProducts: number;
}

const modeByPillar: Record<string, CreativeMode> = {
  "skin-basics": "education-carousel", cleansing: "education-carousel", hydration: "education-carousel", "sun-protection": "education-carousel", "skin-barrier": "education-carousel", "sensitive-skin": "education-carousel", "dry-skin": "education-carousel", "oily-skin": "education-carousel", "combination-skin": "education-carousel", "acne-prone": "education-carousel", "uneven-tone": "education-carousel", texture: "education-carousel", pores: "education-carousel", redness: "education-carousel", "eye-care": "education-carousel", "lip-care": "education-carousel", ingredients: "education-carousel", "ingredient-pairing": "education-carousel", faq: "education-carousel", "myth-fact": "education-carousel", "routine-mistakes": "education-carousel",
  "routine-building": "routine-builder", "morning-routine": "routine-builder", "evening-routine": "routine-builder", "weekly-care": "routine-builder", "care-habits": "routine-builder",
  "product-comparison": "comparison", "customer-needs": "comparison", "shopping-guide": "comparison",
  "seasonal-care": "product-story", "brand-trust": "product-story", "product-education": "product-story", "how-to-use": "product-story", "routine-order": "product-story", discovery: "discovery",
};

const categoryHintsByPillar: Record<string, string[]> = {
  cleansing: ["cleansers"], hydration: ["moisturizers", "serums"], "sun-protection": ["sunscreen"], "eye-care": ["eye-care"], "lip-care": ["lip-care"],
  "morning-routine": ["cleansers", "serums", "moisturizers", "sunscreen"], "evening-routine": ["cleansers", "serums", "moisturizers"],
  "hair-care": ["hair-care", "shampoo", "conditioner"], "product-comparison": [], "shopping-guide": [], discovery: [],
};

const templatesByMode: Record<CreativeMode, string[]> = {
  "product-story": ["T08", "T11", "T24"],
  "education-carousel": ["T22", "T23", "T28"],
  comparison: ["T25", "T26", "T29"],
  "routine-builder": ["T14", "T15", "T16"],
  discovery: ["T04", "T30", "T35"],
  offer: ["T18", "T19", "T20"],
};

const blocksByMode: Record<CreativeMode, string[]> = {
  "product-story": ["hook", "context", "verified product detail", "how to use", "soft CTA"],
  "education-carousel": ["problem/question", "3–6 evidence-based points", "save/share CTA", "source note when needed"],
  comparison: ["selection question", "criteria", "side-by-side differences", "who each option suits", "choice CTA"],
  "routine-builder": ["goal", "ordered steps", "product role per step", "frequency note", "routine CTA"],
  discovery: ["curiosity hook", "new angle", "useful takeaway", "conversation CTA"],
  offer: ["offer label", "verified product set", "valid price/discount", "deadline only when real", "shop CTA"],
};

const visualsByMode: Record<CreativeMode, string[]> = {
  "product-story": ["real product image", "logo", "one focal message", "editorial whitespace"],
  "education-carousel": ["slide sequence", "large readable headline", "numbered points", "consistent footer/logo"],
  comparison: ["two-column or split layout", "equal visual weight", "no invented superiority", "decision labels"],
  "routine-builder": ["numbered pathway", "multiple verified products", "clear order", "goal-led header"],
  discovery: ["curiosity gap", "controlled reveal", "one visual metaphor", "no fake product packaging"],
  offer: ["offer hierarchy", "verified price only", "product grouping", "clear validity"],
};

export function getCreativePlan(pillarId: string, recentTemplateIds: string[] = []): CreativePlan {
  const pillar = CONTENT_PILLARS.find((p) => p.id === pillarId) ?? CONTENT_PILLARS.find((p) => p.id === "discovery")!;
  const mode = modeByPillar[pillar.id] ?? "product-story";
  const candidates = templatesByMode[mode];
  const fresh = candidates.filter((id) => !recentTemplateIds.includes(id));
  const templateIds = [...fresh, ...candidates.filter((id) => !fresh.includes(id))];
  return {
    pillar,
    mode,
    templateIds,
    contentBlocks: blocksByMode[mode],
    visualRules: visualsByMode[mode],
    categoryHints: categoryHintsByPillar[pillar.id] ?? [],
    requiresPrice: mode === "offer",
    requiresProducts: mode === "routine-builder" ? 3 : mode === "comparison" ? 2 : 1,
  };
}

export function getTemplateForPillar(pillarId: string, recentTemplateIds: string[] = []): VisualTemplateDef | null {
  const plan = getCreativePlan(pillarId, recentTemplateIds);
  return plan.templateIds.map((id) => TEMPLATE_CATALOG.find((t) => t.id === id)).find(Boolean) ?? null;
}

export function listCreativeModes(): Array<{ mode: CreativeMode; templates: string[] }> {
  return Object.entries(templatesByMode).map(([mode, templates]) => ({ mode: mode as CreativeMode, templates }));
}
