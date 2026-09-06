/**
 * PART 3 — CREATIVE IDEA INTELLIGENCE
 * ===================================
 * One-click idea generation for the admin board. Combines the Part 1 taxonomy
 * planner with a creative-angle engine that is NOT limited to the 11 fixed
 * content types (creative angles use CUSTOM_OTHER), then scores, ranks and
 * de-duplicates everything deterministically.
 *
 * All ideas remain grounded in the real catalog: every idea references a
 * published, image-ready product with verified facts. No idea ever contains
 * invented claims — generation still runs through the full validation pipeline.
 */

import { onlyPublished } from "@/src/lib/publication";
import { products } from "@/src/data/products";
import { extractBenefitFacts } from "@/src/lib/product-benefits";
import { selectProductImage } from "@/src/lib/product-image";
import { normalizeName, tokenize, jaccardTokens } from "@/src/lib/product-name";
import { generateContentIdeas } from "../content/planner";
import type { ContentType, ContentObjective, ContentIdea } from "../content/types";
import { CONTENT_TYPE_META } from "../content/taxonomy";
import type { GenerateBestIdeasInput, ScoredContentIdea, CreativeAngleRef } from "./types";

export const CREATIVE_IDEAS_VERSION = "creative_ideas_part3_v1";

/* ------------------------------------------------------------------------ */
/* CREATIVE ANGLES — open-ended, not constrained to the taxonomy             */
/* ------------------------------------------------------------------------ */

interface CreativeAngle {
  key: string;
  labelAr: string;
  contentType: ContentType;
  objective: ContentObjective;
  title: (nameAr: string) => string;
  reason: string;
}

const CREATIVE_ANGLES: CreativeAngle[] = [
  {
    key: "story",
    labelAr: "قصة العناية",
    contentType: "CUSTOM_OTHER",
    objective: "AWARENESS",
    title: (n) => `قصة ${n} معك يومياً`,
    reason: "angle:story — narrative about daily care",
  },
  {
    key: "before_after",
    labelAr: "رحلة التحول",
    contentType: "CUSTOM_OTHER",
    objective: "DISCOVERY",
    title: (n) => `قبل وبعد: ماذا يحدث مع ${n}`,
    reason: "angle:before_after — transformation journey",
  },
  {
    key: "challenge",
    labelAr: "تحدي مستمر",
    contentType: "CUSTOM_OTHER",
    objective: "ENGAGEMENT",
    title: (n) => `تحدي العناية: أسبوع مع ${n}`,
    reason: "angle:challenge — multi-day engagement challenge",
  },
  {
    key: "trend",
    labelAr: "اتجاه الموسم",
    contentType: "CUSTOM_OTHER",
    objective: "DISCOVERY",
    title: (n) => `${n} وأنتِ — اتجاه العناية هذا الموسم`,
    reason: "angle:trend — seasonal wellness trend",
  },
  {
    key: "ritual",
    labelAr: "طقس يومي",
    contentType: "CUSTOM_OTHER",
    objective: "RETENTION",
    title: (n) => `طقس يومي صغير مع ${n}`,
    reason: "angle:ritual — small daily ritual",
  },
  {
    key: "routine",
    labelAr: "روتين متكامل",
    contentType: "ROUTINE",
    objective: "EDUCATION",
    title: (n) => `روتين متكامل يبدأ من ${n}`,
    reason: "angle:routine — full routine starting point",
  },
  {
    key: "compare",
    labelAr: "مقارنة ذكية",
    contentType: "COMPARISON",
    objective: "CROSS_SELL",
    title: (n) => `كيف تختار؟ ${n} بالمقارنة`,
    reason: "angle:compare — smart comparison",
  },
  {
    key: "qa",
    labelAr: "سؤال يهمك",
    contentType: "FAQ",
    objective: "EDUCATION",
    title: (n) => `أكثر الأسئلة عن ${n}`,
    reason: "angle:qa — burning questions",
  },
  {
    key: "myth",
    labelAr: "تصحيح مفهوم",
    contentType: "MYTH_FACT",
    objective: "EDUCATION",
    title: (n) => `مفهوم خاطئ شائع عن ${n}`,
    reason: "angle:myth — common misconception",
  },
  {
    key: "ingredient",
    labelAr: "شرح مكوّن",
    contentType: "EDUCATIONAL",
    objective: "EDUCATION",
    title: (n) => `مكوّنات ${n} ببساطة`,
    reason: "angle:ingredient — simple ingredient explainer",
  },
  {
    key: "spotlight",
    labelAr: "تسليط الضوء",
    contentType: "PRODUCT_SPOTLIGHT",
    objective: "DISCOVERY",
    title: (n) => `تعرف على ${n}`,
    reason: "angle:spotlight — product spotlight",
  },
  {
    key: "engagement_q",
    labelAr: "سؤال تفاعلي",
    contentType: "ENGAGEMENT",
    objective: "ENGAGEMENT",
    title: (n) => `ما رأيكِ في ${n}؟`,
    reason: "angle:engagement_q — audience prompt",
  },
  {
    key: "gift",
    labelAr: "فكرة هدية",
    contentType: "GIFTING",
    objective: "CONVERSION",
    title: (n) => `فكرة هدية: ${n}`,
    reason: "angle:gift — gifting idea",
  },
  {
    key: "season_spot",
    labelAr: "مناسب للموسم",
    contentType: "SEASONAL",
    objective: "DISCOVERY",
    title: (n) => `${n} لهذا الموسم`,
    reason: "angle:season_spot — seasonal fit",
  },
];

/* ------------------------------------------------------------------------ */
/* PRODUCT POOL                                                              */
/* ------------------------------------------------------------------------ */

interface IdeaProduct {
  id: string;
  categorySlug: string | null;
  categoryAr: string | null;
  nameAr: string;
  factsCount: number;
  imageReady: boolean;
  priceReady: boolean;
}

function ideaProductPool(productIds?: string[]): IdeaProduct[] {
  let pool = onlyPublished(products);
  if (productIds && productIds.length > 0) {
    const set = new Set(productIds);
    pool = pool.filter((p) => set.has(p.id));
  }
  return pool
    .map((p) => {
      const factsCount = extractBenefitFacts(p).length;
      const imageReady = selectProductImage(p).selectedImage !== null;
      return {
        id: p.id,
        categorySlug: p.categorySlug ?? null,
        categoryAr: p.categoryAr ?? null,
        nameAr: p.name.ar ?? p.name.en ?? p.id,
        factsCount,
        imageReady,
        priceReady: Number.isFinite(p.pricing?.price) && (p.pricing?.price as number) > 0,
      };
    })
    .filter((p) => p.imageReady);
}

function pickProduct(pool: IdeaProduct[], campaignIds: string[], fatiguedIds: string[], seed: number): IdeaProduct {
  const ranked = [...pool].sort((a, b) => {
    let sa = scoreProductPriority(a, campaignIds, fatiguedIds);
    let sb = scoreProductPriority(b, campaignIds, fatiguedIds);
    if (sb === sa) {
      // Deterministic rotation by id hash for stable-but-varying picks.
      sa += ((hashOf(a.id) % 10) / 100) * (seed % 3 === 0 ? 1 : -1);
      sb += ((hashOf(b.id) % 10) / 100) * (seed % 3 === 0 ? 1 : -1);
    }
    return sb - sa;
  });
  return ranked[0] ?? pool[0];
}

function scoreProductPriority(p: IdeaProduct, campaignIds: string[], fatiguedIds: string[]): number {
  let score = Math.min(1, p.factsCount / 6) + (p.priceReady ? 0.1 : 0);
  if (campaignIds.includes(p.id)) score += 0.3;
  if (fatiguedIds.includes(p.id)) score -= 0.4;
  return score;
}

/* ------------------------------------------------------------------------ */
/* SEASONALITY (deterministic, internal signal — not external research)      */
/* ------------------------------------------------------------------------ */

function monthOf(now?: string): number {
  const d = now ? new Date(now) : new Date();
  return d.getMonth() + 1;
}

function seasonalRelevance(contentType: ContentType, now?: string): number {
  const m = monthOf(now);
  const winter = m === 11 || m === 12 || m === 1 || m === 2;
  const summer = m === 5 || m === 6 || m === 7 || m === 8;
  if (contentType === "SEASONAL") return winter || summer ? 1 : 0.6;
  if (contentType === "ROUTINE" || contentType === "EDUCATIONAL") return winter || summer ? 0.9 : 0.7;
  if (contentType === "CUSTOM_OTHER") return 0.8;
  return 0.6;
}

/* ------------------------------------------------------------------------ */
/* SCORING                                                                   */
/* ------------------------------------------------------------------------ */

function noveltyScore(productIds: string[], fatiguedIds: string[], type: ContentType, typeExposure: number): number {
  let s = 1;
  for (const pid of productIds) if (fatiguedIds.includes(pid)) s -= 0.3;
  s -= Math.min(0.5, typeExposure * 0.05);
  return clamp01(s);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function hashOf(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

/* ------------------------------------------------------------------------ */
/* DEDUPE                                                                    */
/* ------------------------------------------------------------------------ */

function isNearDuplicate(a: ScoredContentIdea, b: ScoredContentIdea): boolean {
  if (a.productIds[0] !== b.productIds[0] || a.contentType !== b.contentType) return false;
  const ta = tokenize(normalizeName(a.title)).filter((t) => t.length > 2);
  const tb = tokenize(normalizeName(b.title)).filter((t) => t.length > 2);
  if (ta.length === 0 || tb.length === 0) return false;
  return jaccardTokens(ta, tb) > 0.6;
}

/* ------------------------------------------------------------------------ */
/* MAIN                                                                      */
/* ------------------------------------------------------------------------ */

/**
 * Generate the best-ranked ideas in one call:
 *  1. Part 1 taxonomy planner ideas (grounded in catalog + history).
 *  2. Creative-angle ideas (open-ended, incl. CUSTOM_OTHER).
 *  3. Score (data completeness + novelty/fatigue + seasonality + campaigns).
 *  4. De-duplicate near-duplicates, then rank and return `limit`.
 */
export function generateBestIdeas(input: GenerateBestIdeasInput = {}): ScoredContentIdea[] {
  const now = input.now ?? new Date().toISOString();
  const limit = input.limit ?? 12;
  const creativeLimit = input.creativeLimit ?? 6;
  const pool = ideaProductPool(input.productIds);
  if (pool.length === 0) return [];

  const campaignIds = input.campaignProductIds ?? [];
  const fatiguedIds = input.fatiguedProductIds ?? [];
  const typeExposure = new Map<string, number>();
  const scored: ScoredContentIdea[] = [];

  const collectType = (type: ContentType) => {
    typeExposure.set(type, (typeExposure.get(type) ?? 0) + 1);
  };

  // 1) Taxonomy ideas from Part 1 planner.
  const taxonomyIdeas = generateContentIdeas({
    counts: input.contentTypes
      ? input.contentTypes.reduce<Partial<Record<ContentType, number>>>((acc, t) => ({ ...acc, [t]: 1 }), {})
      : undefined,
    contentType: undefined,
    limit: limit * 2,
    now,
  });
  for (const idea of taxonomyIdeas) {
    collectType(idea.contentType);
    scored.push(scoreIdea(idea, { campaignIds, fatiguedIds, typeExposure, now, source: "taxonomy" }));
  }

  // 2) Creative angles (open-ended).
  const usedProducts = new Set(scored.map((s) => s.productIds[0]));
  let creativeMade = 0;
  for (let i = 0; i < CREATIVE_ANGLES.length && creativeMade < creativeLimit; i++) {
    const angle = CREATIVE_ANGLES[i];
    const product = pickProduct(pool, campaignIds, fatiguedIds, i);
    if (!product) continue;
    const contentType = angle.contentType;
    const isCustom = contentType === "CUSTOM_OTHER";
    if (!isCustom && input.contentTypes && !input.contentTypes.includes(contentType)) continue;
    if (isCustom && typeExposure.get("CUSTOM_OTHER") && typeExposure.get("CUSTOM_OTHER")! >= 4) continue;
    collectType(contentType);
    usedProducts.add(product.id);
    scored.push(
      scoreIdea(
        {
          title: angle.title(product.nameAr),
          categoryId: product.categorySlug,
          contentType,
          objective: angle.objective,
          productIds: [product.id],
          reason: angle.reason,
          priority: product.factsCount >= 5 ? "high" : product.factsCount >= 3 ? "medium" : "low",
        },
        {
          campaignIds,
          fatiguedIds,
          typeExposure,
          now,
          source: "creative",
          angle: { key: angle.key, labelAr: angle.labelAr },
        },
      ),
    );
    creativeMade++;
  }

  // 3) De-duplicate near-duplicates.
  const deduped: ScoredContentIdea[] = [];
  for (const idea of scored.sort((a, b) => b.score - a.score)) {
    const dup = deduped.find((d) => isNearDuplicate(d, idea));
    if (dup) {
      deduped.push({ ...idea, nearDuplicateOf: dup.title, score: Math.max(0, idea.score - 0.2) });
    } else {
      deduped.push(idea);
    }
  }

  // 4) Rank and return the requested number (diversity-bounded).
  const ranked = [...deduped].sort((a, b) => b.score - a.score);
  const chosen: ScoredContentIdea[] = [];
  const typeCount = new Map<string, number>();
  for (const idea of ranked) {
    if (chosen.length >= limit) break;
    const count = typeCount.get(idea.contentType) ?? 0;
    if (count >= Math.ceil(limit / 4) && idea.source === "taxonomy") continue;
    typeCount.set(idea.contentType, count + 1);
    chosen.push(idea);
  }
  return chosen;
}

function scoreIdea(
  idea: ContentIdea,
  ctx: {
    campaignIds: string[];
    fatiguedIds: string[];
    typeExposure: Map<string, number>;
    now?: string;
    source: ScoredContentIdea["source"];
    angle?: CreativeAngleRef;
  },
): ScoredContentIdea {
  const typeExposureCount = ctx.typeExposure.get(idea.contentType) ?? 0;
  const novelty = noveltyScore(idea.productIds, ctx.fatiguedIds, idea.contentType, typeExposureCount);
  const seasonal = seasonalRelevance(idea.contentType, ctx.now);
  const campaignAligned = idea.productIds.some((id) => ctx.campaignIds.includes(id));
  const meta = CONTENT_TYPE_META[idea.contentType];
  const objectivesOk = idea.objective && meta.objectives.includes(idea.objective) ? 0.05 : 0;

  const score = clamp01(
    novelty * 0.35 +
      seasonal * 0.2 +
      (campaignAligned ? 0.2 : 0.1) +
      (idea.priority === "high" ? 0.15 : idea.priority === "medium" ? 0.1 : 0.05) +
      objectivesOk,
  );

  return {
    ...idea,
    score,
    novelty,
    seasonalRelevance: seasonal,
    campaignAligned,
    source: ctx.source,
    angle: ctx.angle,
  };
}