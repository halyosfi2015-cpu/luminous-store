/**
 * Daily content intelligence — PURE decision logic (testable, no DB).
 * Chooses template-when-appropriate vs freeform-when-appropriate from
 * history + catalog signals. Never mechanical rotation: offer-first, then
 * new arrivals, then least-used template, with a freeform escape hatch.
 * The route supplies real history + real catalog; this only decides.
 */
import type { VisualSourceType } from "./templates";

export interface BriefCandidate {
  id: string;
  hasOffer: boolean;
  isNew: boolean;
}

export interface BriefTemplate {
  id: string;
  objective: string;
  sourceTypes: VisualSourceType[];
}

export interface BriefHistory {
  templateIds14d: string[];
  productIds7d: string[];
  hooks: string[];
  ctas: string[];
}

export interface NextSuggestion {
  sourceType: VisualSourceType;
  sourceId: string;
  objective: string;
  templateId: string;
  reasonAr: string;
}

export interface NextBrief {
  suggestion: NextSuggestion | null;
  freeformAdvised: boolean;
  freeformReasonAr: string | null;
}

/**
 * Decide the next content move.
 * Priority: live offer on a fresh product → genuinely new product →
 * least-recently-used template on the freshest product.
 * Freeform is advised once ≥8 distinct templates were used in 14 days
 * (rotation exhausted → a new angle beats another template).
 */
export function decideNextBrief(
  candidates: BriefCandidate[],
  history: BriefHistory,
  templates: BriefTemplate[],
): NextBrief {
  const usedProducts = new Set(history.productIds7d);
  const usedTemplates = new Set(history.templateIds14d);
  const fresh = candidates.filter((c) => c.id && !usedProducts.has(c.id));

  const withOffer = fresh.find((c) => c.hasOffer);
  if (withOffer) {
    return {
      suggestion: {
        sourceType: "product",
        sourceId: withOffer.id,
        objective: "sales",
        templateId: "T21",
        reasonAr: `المنتج ${withOffer.id} عليه عرض حقيقي ولم يُستخدم منذ 7 أيام`,
      },
      freeformAdvised: false,
      freeformReasonAr: null,
    };
  }

  const freshNew = fresh.find((c) => c.isNew);
  if (freshNew) {
    return {
      suggestion: {
        sourceType: "product",
        sourceId: freshNew.id,
        objective: "launch",
        templateId: "T05",
        reasonAr: `منتج جديد فعلاً (${freshNew.id}) لم يُغطَّ بعد`,
      },
      freeformAdvised: false,
      freeformReasonAr: null,
    };
  }

  const productPool = fresh.length > 0 ? fresh : candidates;
  const target = productPool[0];
  const leastUsed = templates.find((t) => !usedTemplates.has(t.id) && t.sourceTypes.includes("product"))
    ?? templates[0];
  const freeformAdvised = usedTemplates.size >= 8;
  return {
    suggestion: target && leastUsed
      ? {
        sourceType: "product",
        sourceId: target.id,
        objective: leastUsed.objective,
        templateId: leastUsed.id,
        reasonAr: `القالب ${leastUsed.id} هو الأقل استخداماً خلال 14 يوماً — تنويع مقصود للأسلوب البصري`,
      }
      : null,
    freeformAdvised,
    freeformReasonAr: freeformAdvised
      ? "استُخدمت 8 قوالب مختلفة مؤخراً — يُقترح مفهوم حر بزاوية جديدة بدل التدوير الميكانيكي"
      : null,
  };
}
