/**
 * INTENT CLASSIFIER (11.2)
 * ========================
 *
 * Classifies user intent from natural language input.
 * Uses deterministic pattern matching first, then falls back to AI
 * interpretation when patterns are insufficient.
 *
 * Intent drives which context sources are gathered and which pipeline runs.
 */

import type { UserIntent, IntentClassification } from './types';

/* ------------------------------------------------------------------------ */
/* PATTERN RULES — Arabic + English keyword matching                         */
/* ------------------------------------------------------------------------ */

interface IntentPattern {
  intent: UserIntent;
  /** Arabic keywords/phrases */
  arPatterns: RegExp[];
  /** English keywords/phrases */
  enPatterns: RegExp[];
  /** Weight: higher = more confident match */
  weight: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: 'executive_prioritization',
    arPatterns: [
      /ماذا يحتاج انتباه/i,
      /أش أحتاج أهتم/i,
      / priority/i,
      /أولويات/i,
      /شنو أعمل أول/i,
      /ヤنبغ علي أول/i,
      /ما الوضع العام/i,
      /نظرة عامة/i,
    ],
    enPatterns: [
      /what.*attention/i,
      /priorit/i,
      /what.*focus/i,
      /executive summary/i,
      /overview/i,
    ],
    weight: 10,
  },
  {
    intent: 'opportunity_discovery',
    arPatterns: [
      /فرص/i,
      /فرصة/i,
      /أعطني فكرة/i,
      /شنو أقدر أسوي/i,
      /كيف أزيد/i,
      /growth/i,
      /ideas?/i,
      /اقتراح/i,
      /_increment/i,
      /تطوير/i,
    ],
    enPatterns: [
      /opportunit/i,
      /idea/i,
      /suggest/i,
      /growth/i,
      /improve/i,
      /increase/i,
      /new/i,
    ],
    weight: 9,
  },
  {
    intent: 'campaign_planning',
    arPatterns: [
      /حملة/i,
      /campaign/i,
      /إعلان/i,
      /تسويق/i,
      /曝光/i,
      /أعلن/i,
      /攀促销/i,
      /عرض خاص/i,
      / promotion/i,
    ],
    enPatterns: [
      /campaign/i,
      /promot/i,
      /adverti/i,
      /marketing/i,
      /launch/i,
      /offer/i,
    ],
    weight: 9,
  },
  {
    intent: 'diagnostic_analysis',
    arPatterns: [
      /ليش/i,
      /لماذا/i,
      /شنو السبب/i,
      /سبب/i,
      /_trend/i,
      /انخفض/i,
      /ازداد/i,
      /تحسن/i,
      /数据分析/i,
      /ت https/i,
      /gelten/i,
      /tahlil/i,
      /خلال/i,
      /分析/i,
      /inquir/i,
      /wallah/i,
      /diagnos/i,
    ],
    enPatterns: [
      /why/i,
      /reason/i,
      /cause/i,
      /trend/i,
      /decreased?/i,
      /increased?/i,
      /diagnos/i,
      /analyz/i,
      /drop/i,
      /spike/i,
    ],
    weight: 8,
  },
  {
    intent: 'commercial_decision',
    arPatterns: [
      /أفضل منتج/i,
      /أشtrieber منتج/i,
      /أدفع/i,
      /شراء/i,
      /购置/i,
      /أختار/i,
      /recommend.*product/i,
      /best.*product/i,
      /_week/i,
      /هذا الأسبوع/i,
      /today/i,
    ],
    enPatterns: [
      /best.*product/i,
      /recommend.*buy/i,
      /which.*product/i,
      /purchase/i,
      /buy/i,
      /best.*week/i,
    ],
    weight: 8,
  },
  {
    intent: 'content_generation',
    arPatterns: [
      /أنشئ محتوى/i,
      /اكتب/i,
      /محتوى/i,
      /content/i,
      /caption/i,
      /وصف/i,
      /title/i,
      /منشور/i,
      /post/i,
      /blog/i,
      /مقالات/i,
      / فيسبوك/i,
      /إنستغرام/i,
      /tiktok/i,
      /social/i,
    ],
    enPatterns: [
      /create.*content/i,
      /write/i,
      /content/i,
      /caption/i,
      /post/i,
      /blog/i,
      /article/i,
      /description/i,
      /social/i,
    ],
    weight: 7,
  },
  {
    intent: 'sales_query',
    arPatterns: [
      /مبيعات/i,
      /sales/i,
      /revenue/i,
      /أرباح/i,
      /دخل/i,
      /turnover/i,
      /profit/i,
      /fp/i,
      /order/i,
      /طلب/i,
    ],
    enPatterns: [
      /sales/i,
      /revenue/i,
      /profit/i,
      /order/i,
      /income/i,
      /turnover/i,
    ],
    weight: 7,
  },
  {
    intent: 'customer_query',
    arPatterns: [
      /عملاء/i,
      /customer/i,
      /client/i,
      /شريحة/i,
      /segment/i,
      /retention/i,
      /عملاء جدد/i,
      /active/i,
      /inactive/i,
      /re-?activ/i,
    ],
    enPatterns: [
      /customer/i,
      /client/i,
      /segment/i,
      /retention/i,
      /churn/i,
      /reactiv/i,
      /lifetime/i,
    ],
    weight: 7,
  },
  {
    intent: 'inventory_query',
    arPatterns: [
      /مخزون/i,
      /inventory/i,
      /stock/i,
      /نفد/i,
      /out.*stock/i,
      /توفر/i,
      /available/i,
      /reorder/i,
      /إعادة طلب/i,
    ],
    enPatterns: [
      /inventory/i,
      /stock/i,
      /available/i,
      /out.*stock/i,
      /reorder/i,
      /supply/i,
    ],
    weight: 7,
  },
];

/* ------------------------------------------------------------------------ */
/* CLASSIFIER                                                                */
/* ------------------------------------------------------------------------ */

/**
 * Classify user intent from a natural language question.
 * Deterministic first — no AI call needed for clear patterns.
 */
export function classifyIntent(question: string): IntentClassification {
  const q = question.trim();
  if (!q) {
    return {
      intent: 'unknown',
      confidence: 0,
      reasoning: 'Empty question — cannot classify intent.',
    };
  }

  const scores = new Map<UserIntent, { score: number; matches: string[] }>();

  for (const pattern of INTENT_PATTERNS) {
    const matches: string[] = [];

    for (const re of pattern.arPatterns) {
      if (re.test(q)) matches.push(`ar:${re.source}`);
    }
    for (const re of pattern.enPatterns) {
      if (re.test(q)) matches.push(`en:${re.source}`);
    }

    if (matches.length > 0) {
      const existing = scores.get(pattern.intent) ?? { score: 0, matches: [] };
      existing.score += pattern.weight * matches.length;
      existing.matches.push(...matches);
      scores.set(pattern.intent, existing);
    }
  }

  if (scores.size === 0) {
    return {
      intent: 'unknown',
      confidence: 0.1,
      reasoning: 'No pattern match found — intent unclear. Falling back to AI interpretation.',
    };
  }

  // Sort by score descending
  const ranked = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
  const [bestIntent, bestResult] = ranked[0];

  // Confidence: normalize based on how much better the best is vs runner-up
  const bestScore = bestResult.score;
  const runnerUpScore = ranked.length > 1 ? ranked[1][1].score : 0;
  const separation = bestScore - runnerUpScore;
  const totalScore = bestScore + runnerUpScore || 1;

  let confidence = Math.min(0.95, 0.5 + (bestScore / (bestScore + 10)) * 0.4 + (separation / totalScore) * 0.1);

  // Boost confidence for very strong matches
  if (bestResult.matches.length >= 3) confidence = Math.min(0.98, confidence + 0.1);
  if (bestResult.matches.length === 1) confidence = Math.max(0.3, confidence - 0.1);

  return {
    intent: bestIntent,
    confidence: Math.round(confidence * 100) / 100,
    reasoning: `Matched ${bestResult.matches.length} pattern(s) for "${bestIntent}" (score: ${bestScore}). ${runnerUpScore > 0 ? `Runner-up: ${ranked[1][0]} (score: ${runnerUpScore}).` : 'No close alternative.'}`,
  };
}

/**
 * Check if intent needs AI interpretation (low confidence or unknown).
 */
export function needsAIInterpretation(classification: IntentClassification): boolean {
  return classification.confidence < 0.5 || classification.intent === 'unknown';
}

/**
 * Get a human-readable Arabic label for an intent.
 */
export function intentLabelAr(intent: UserIntent): string {
  const labels: Record<UserIntent, string> = {
    commercial_decision: 'قرار تجاري',
    content_generation: 'توليد محتوى',
    diagnostic_analysis: 'تحليل تشخيصي',
    campaign_planning: 'تخطيط حملة',
    executive_prioritization: 'تحديد الأولويات',
    opportunity_discovery: 'اكتشاف فرص',
    product_query: 'استفسار عن منتج',
    customer_query: 'استفسار عن عملاء',
    inventory_query: 'استفسار عن مخزون',
    sales_query: 'استفسار عن مبيعات',
    unknown: 'غير محدد',
  };
  return labels[intent];
}
