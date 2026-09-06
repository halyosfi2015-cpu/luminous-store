/**
 * INTELLIGENT REGENERATION (11.22)
 * =================================
 *
 * When "Generate Again" is triggered, the system doesn't just replay
 * the same prompt. It considers:
 *   - Previous output
 *   - Reason for regeneration
 *   - Avoid repetition
 *   - Apply new angle/direction
 */

import type { IntelligenceResult, UserIntent } from './types';
import type { OrchestratorInput } from '@/src/lib/ai/intelligence/orchestrator';

/* ------------------------------------------------------------------------ */
/* REGENERATION CONTEXT                                                       */
/* ------------------------------------------------------------------------ */

export interface RegenerationContext {
  /** The previous result being regenerated */
  previousResult: IntelligenceResult;
  /** User's reason for regeneration */
  reason?: string;
  /** New direction/angle requested */
  newAngle?: string;
  /** Products to avoid (anti-repetition) */
  avoidProducts?: string[];
  /** Specific adjustments */
  adjustments?: {
    moreEmotional?: boolean;
    lessFormal?: boolean;
    differentProduct?: boolean;
    differentChannel?: boolean;
    removeDiscount?: boolean;
    forNewCustomers?: boolean;
  };
}

/**
 * Build an OrchestratorInput for intelligent regeneration.
 * Transforms the user's regeneration request into specific orchestrator parameters.
 */
export function buildRegenerationInput(
  originalQuestion: string,
  context: RegenerationContext,
  sessionId: string,
): OrchestratorInput {
  const { previousResult, reason, newAngle, adjustments } = context;

  // Build an enhanced question that incorporates the regeneration direction
  let enhancedQuestion = originalQuestion;

  if (reason) {
    enhancedQuestion = `${originalQuestion} — ${reason}`;
  }

  if (newAngle) {
    enhancedQuestion += ` بزاوية جديدة: ${newAngle}`;
  }

  if (adjustments) {
    const mods: string[] = [];
    if (adjustments.moreEmotional) mods.push('اجعلها أكثر عاطفية');
    if (adjustments.lessFormal) mods.push('اجعلها أقل رسمية');
    if (adjustments.differentProduct) mods.push('لا تستخدم نفس المنتج');
    if (adjustments.differentChannel) mods.push('غيّر القناة');
    if (adjustments.removeDiscount) mods.push('بدون خصم');
    if (adjustments.forNewCustomers) mods.push('لعملاء جدد');

    if (mods.length > 0) {
      enhancedQuestion += ` — ${mods.join(', ')}`;
    }
  }

  // Build context data, excluding previously used products if anti-repetition is needed
  const contextData: Record<string, unknown> = {};
  if (previousResult.facts) {
    // Extract product IDs from previous facts to potentially avoid
    const previousProducts = previousResult.rankedRecommendations
      .flatMap((r) => r.relatedEntities ?? [])
      .filter((e) => e.type === 'product')
      .map((e) => e.id);

    if (context.avoidProducts || adjustments?.differentProduct) {
      contextData.avoidProducts = context.avoidProducts ?? previousProducts;
    }
  }

  return {
    question: enhancedQuestion,
    sessionId,
    contextData,
    previousOutput: previousResult,
    regenerationReason: reason ?? newAngle ?? 'User requested regeneration',
  };
}

/**
 * Parse a natural language regeneration request into structured adjustments.
 */
export function parseRegenerationRequest(request: string): RegenerationContext['adjustments'] {
  const adjustments: NonNullable<RegenerationContext['adjustments']> = {};

  // Arabic patterns
  if (/更多 عاطف|عاطف|emotional/i.test(request)) adjustments.moreEmotional = true;
  if (/ less formal| less formal|غير رسم|casual/i.test(request)) adjustments.lessFormal = true;
  if (/product|نفس المنتج|product|different/i.test(request)) adjustments.differentProduct = true;
  if (/channel|قناة|tiktok|instagram|فيسبوك/i.test(request)) adjustments.differentChannel = true;
  if (/discount|خصم|عرض|sale/i.test(request)) adjustments.removeDiscount = true;
  if (/new.*customer|عملاء.*جديد|new.*audience/i.test(request)) adjustments.forNewCustomers = true;

  return Object.keys(adjustments).length > 0 ? adjustments : undefined;
}

/**
 * Build a new angle suggestion based on the original intent and previous output.
 */
export function suggestNewAngle(
  intent: UserIntent,
  previousResult: IntelligenceResult,
): string[] {
  const suggestions: string[] = [];

  switch (intent) {
    case 'opportunity_discovery':
      suggestions.push(
        'أعد تحليل الفرص من زاوية عملاء غير النشطين',
        'ركز على المنتجات ذات هامش الربح الأعلى',
        'اكتشف فرص حزم المنتجات',
      );
      break;
    case 'campaign_planning':
      suggestions.push(
        'جرّب حملة تفاعل بدلاً من تحويل',
        'استهدف شريحة جديدة من العملاء',
        'ركّز على منتج واحد بدل حملة شاملة',
      );
      break;
    case 'content_generation':
      suggestions.push(
        'غيّر نمط المحتوى (تعليمي ↔ تجاري)',
        'استخدم منتجاً مختلفاً',
        'اجعل المحتوى أقصر وأكثر تأثيراً',
      );
      break;
    case 'diagnostic_analysis':
      suggestions.push(
        'حلل من زاوية الفئات بدلاً من المنتجات',
        'قارن بين فترتين مختلفتين',
        'ركز على إشارات العملاء',
      );
      break;
    default:
      suggestions.push(
        'أعد الصياغة بزاوية مختلفة',
        'ركز على جانب آخر من البيانات',
      );
  }

  // Filter out suggestions that match what was already done
  const previousAnswer = previousResult.answer.toLowerCase();
  return suggestions.filter((s) => !previousAnswer.includes(s.toLowerCase().slice(0, 20)));
}
