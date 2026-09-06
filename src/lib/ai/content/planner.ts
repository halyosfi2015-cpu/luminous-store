/**
 * PART 1 — CONTENT IDEAS PLANNER
 * ==============================
 *
 * generateContentIdeas produces structured content ideas from the REAL catalog
 * facts + historical coverage. Deterministic; never hardcoded. Returns
 * {title, categoryId, contentType, objective, productIds, reason, priority}.
 */

import { onlyPublished } from "@/src/lib/publication";
import { products } from "@/src/data/products";
import { extractBenefitFacts } from "@/src/lib/product-benefits";
import { selectProductImage } from "@/src/lib/product-image";
import type { ContentIdea, ContentType, ContentObjective } from "./types";
import { CONTENT_TYPE_META } from "./taxonomy";
import type { ContentHistory } from "./types";
import { buildContentHistory } from "./diversity";

export interface IdeaRequest {
  categoryId?: string | null;
  contentType?: ContentType;
  objective?: ContentObjective;
  counts?: Partial<Record<ContentType, number>>;
  limit?: number;
  history?: ContentHistory["items"];
  now?: string;
}

interface EligibleProduct {
  id: string;
  categorySlug: string | null;
  nameAr: string;
  factsCount: number;
  imageReady: boolean;
}

function eligibleProducts(categoryId?: string | null): EligibleProduct[] {
  let pool = onlyPublished(products);
  if (categoryId) {
    pool = pool.filter((p) => p.categorySlug === categoryId);
  }
  return pool
    .map((p) => {
      const factsCount = extractBenefitFacts(p).length;
      const imageReady = selectProductImage(p).selectedImage !== null;
      return {
        id: p.id,
        categorySlug: p.categorySlug ?? null,
        nameAr: p.name.ar ?? p.name.en ?? p.id,
        factsCount,
        imageReady,
      };
    })
    .filter((p) => p.imageReady);
}

export function generateContentIdeas(request: IdeaRequest = {}): ContentIdea[] {
  const now = request.now ?? new Date().toISOString();
  const history = buildContentHistory(request.history ?? [], now);
  const ideas: ContentIdea[] = [];

  const typesToPlan: ContentType[] = request.contentType
    ? [request.contentType]
    : (Object.keys(request.counts ?? {}) as ContentType[]).length > 0
      ? (Object.keys(request.counts!) as ContentType[])
      : ["EDUCATIONAL", "PRODUCT_SPOTLIGHT", "COMPARISON", "FAQ"];

  for (const contentType of typesToPlan) {
    const requested = request.counts?.[contentType] ?? 1;
    const meta = CONTENT_TYPE_META[contentType];
    const objective = request.objective ?? meta.objectives[0];

    // Candidate products: image-ready, with enough verified facts.
    let candidates = eligibleProducts(request.categoryId);
    if (meta.minFacts > 0) candidates = candidates.filter((c) => c.factsCount >= meta.minFacts);

    // Rotate using exposure to avoid re-covering what was already covered.
    const usedCount = history.contentTypes.find((t) => t.contentType === contentType)?.exposureCount ?? 0;
    const category = request.categoryId ?? candidates[0]?.categorySlug ?? null;

    for (let i = 0; i < requested; i++) {
      const product = candidates[i % Math.max(1, candidates.length)];
      if (!product) break;
      const priority: ContentIdea["priority"] =
        product.factsCount >= 5 ? "high" : product.factsCount >= 3 ? "medium" : "low";

      ideas.push({
        title: ideaTitle(contentType, product.nameAr),
        categoryId: category,
        contentType,
        objective,
        productIds: [product.id],
        reason: `category ${product.categorySlug ?? "?"}; ${product.factsCount} verified facts; image ready; type already covered ${usedCount}x`,
        priority,
      });
    }
  }

  return ideas.slice(0, request.limit ?? ideas.length);
}

function ideaTitle(contentType: ContentType, productName: string): string {
  switch (contentType) {
    case "PRODUCT_SPOTLIGHT":
      return `تعرف على ${productName}`;
    case "NEW_PRODUCT":
      return `جديدنا: ${productName}`;
    case "COMPARISON":
      return `قارن مع ${productName}`;
    case "ROUTINE":
      return `روتين مع ${productName}`;
    case "FAQ":
      return `أسئلة شائعة عن ${productName}`;
    case "MYTH_FACT":
      return `خرافة وحقيقة: ${productName}`;
    case "GIFTING":
      return `فكرة هدية: ${productName}`;
    case "SEASONAL":
      return `${productName} لهذا الموسم`;
    case "ENGAGEMENT":
      return `شاركنا تجربتك مع ${productName}`;
    case "COMMERCIAL":
      return `عرض خاص على ${productName}`;
    default:
      return `دليلك إلى ${productName}`;
  }
}