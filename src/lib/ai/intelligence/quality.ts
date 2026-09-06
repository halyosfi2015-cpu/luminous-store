/**
 * CONTENT QUALITY EVALUATION (11.18)
 * ===================================
 *
 * Post-generation quality checks for AI content.
 * Evaluates content against multiple dimensions before considering it publishable.
 */

import type { ContentQualityEvaluation, QualityScore, QualityDimension } from './types';
import { LUMINOUS_BRAND_BRAIN } from './brand-brain';

/* ------------------------------------------------------------------------ */
/* QUALITY DIMENSIONS                                                         */
/* ------------------------------------------------------------------------ */

const ALL_DIMENSIONS: QualityDimension[] = [
  'goal_alignment',
  'audience_alignment',
  'brand_voice',
  'product_fact_accuracy',
  'no_unsupported_claims',
  'cta_relevance',
  'novelty',
  'readability',
  'platform_fit',
];

const WEIGHTS: Record<QualityDimension, number> = {
  goal_alignment: 0.15,
  audience_alignment: 0.10,
  brand_voice: 0.20,
  product_fact_accuracy: 0.20,
  no_unsupported_claims: 0.15,
  cta_relevance: 0.05,
  novelty: 0.05,
  readability: 0.05,
  platform_fit: 0.05,
};

/* ------------------------------------------------------------------------ */
/* EVALUATION ENGINE                                                          */
/* ------------------------------------------------------------------------ */

export interface ContentToEvaluate {
  title?: string | null;
  body: string;
  callToAction?: string | null;
  productIds?: string[];
  contentType?: string;
  objective?: string;
  channel?: string;
  verifiedFacts?: Array<{ statement: string; source: string }>;
}

/**
 * Evaluate content quality across all dimensions.
 */
export function evaluateContentQuality(content: ContentToEvaluate): ContentQualityEvaluation {
  const scores: QualityScore[] = [];

  scores.push(evaluateGoalAlignment(content));
  scores.push(evaluateAudienceAlignment(content));
  scores.push(evaluateBrandVoice(content));
  scores.push(evaluateProductFactAccuracy(content));
  scores.push(evaluateUnsupportedClaims(content));
  scores.push(evaluateCtaRelevance(content));
  scores.push(evaluateNovelty(content));
  scores.push(evaluateReadability(content));
  scores.push(evaluatePlatformFit(content));

  const failedDimensions = scores.filter((s) => !s.passed).map((s) => s.dimension);

  // Weighted overall score
  let overallScore = 0;
  for (const score of scores) {
    overallScore += score.score * (WEIGHTS[score.dimension] ?? 0.05);
  }
  overallScore = Math.round(overallScore * 100) / 100;

  // Decision logic
  let recommendation: 'publish' | 'revise' | 'reject';
  if (failedDimensions.includes('product_fact_accuracy') || failedDimensions.includes('no_unsupported_claims')) {
    recommendation = 'reject';
  } else if (failedDimensions.includes('brand_voice') || failedDimensions.length >= 2) {
    recommendation = 'revise';
  } else if (overallScore < 0.4) {
    recommendation = 'reject';
  } else if (overallScore < 0.7) {
    recommendation = 'revise';
  } else {
    recommendation = 'publish';
  }

  return {
    overallScore,
    passed: recommendation === 'publish',
    scores,
    failedDimensions,
    recommendation,
  };
}

/* ------------------------------------------------------------------------ */
/* DIMENSION EVALUATORS                                                       */
/* ------------------------------------------------------------------------ */

function evaluateGoalAlignment(content: ContentToEvaluate): QualityScore {
  const hasBody = Boolean(content.body && content.body.length > 0);
  const hasObjective = Boolean(content.objective);
  const hasContentType = Boolean(content.contentType);

  const score = (hasBody ? 0.4 : 0) + (hasObjective ? 0.3 : 0.1) + (hasContentType ? 0.3 : 0.1);

  return {
    dimension: 'goal_alignment',
    score,
    passed: score >= 0.5,
    note: !hasObjective ? 'Content objective not specified' : undefined,
  };
}

function evaluateAudienceAlignment(content: ContentToEvaluate): QualityScore {
  // Check if content targets a specific audience
  const bodyLower = (content.body || '').toLowerCase();
  const hasAudienceSignal = bodyLower.includes('لكل') || bodyLower.includes('للنساء') ||
    bodyLower.includes('للرجال') || bodyLower.includes('للبشرة') || bodyLower.includes('للfoot');

  const score = hasAudienceSignal ? 0.8 : 0.5;

  return {
    dimension: 'audience_alignment',
    score,
    passed: score >= 0.5,
    note: !hasAudienceSignal ? 'No explicit audience targeting detected' : undefined,
  };
}

function evaluateBrandVoice(content: ContentToEvaluate): QualityScore {
  const voice = LUMINOUS_BRAND_BRAIN.voice;
  const body = content.body || '';
  let violations = 0;
  const notes: string[] = [];

  // Check prohibitions
  const prohibitionChecks = [
    { pattern: /عرض لفترة محدودة|الكمية محدودة|ltr/gi, name: 'fake urgency' },
    { pattern: /الأكثر مبيعا|الكل يشتري|ال number 1/gi, name: 'fake popularity' },
    { pattern: /يعالج|يشفي|نتيجة مضمونة|ضمان/gi, name: 'medical claim' },
    { pattern: /في عالم اليوم|دعونا نكتشف|بكل بساطة/gi, name: 'AI filler' },
  ];

  for (const check of prohibitionChecks) {
    if (check.pattern.test(body)) {
      violations++;
      notes.push(`Contains ${check.name}`);
    }
  }

  // Check Arabic-first (no English sentences mixed in)
  const englishSentencePattern = /[a-zA-Z]{3,}\s+[a-zA-Z]{3,}/;
  if (englishSentencePattern.test(body)) {
    violations++;
    notes.push('Contains English sentences mixed with Arabic');
  }

  // Check excessive punctuation
  if ((body.match(/!/g) || []).length > 2) {
    violations++;
    notes.push('Excessive exclamation marks');
  }

  const score = Math.max(0, 1 - (violations * 0.25));

  return {
    dimension: 'brand_voice',
    score,
    passed: score >= 0.5 && violations === 0,
    note: notes.length > 0 ? notes.join('; ') : undefined,
  };
}

function evaluateProductFactAccuracy(content: ContentToEvaluate): QualityScore {
  const body = content.body || '';
  const facts = content.verifiedFacts ?? [];

  if (facts.length === 0) {
    return {
      dimension: 'product_fact_accuracy',
      score: 0.5,
      passed: true,
      note: 'No verified facts to validate against — claims assumed generic',
    };
  }

  // Simple check: does content reference any verified facts?
  const factKeywords = facts.flatMap((f) =>
    f.statement.split(/\s+/).filter((w) => w.length > 3).slice(0, 5)
  );

  const matchedFacts = factKeywords.filter((kw) => body.includes(kw));
  const matchRatio = factKeywords.length > 0 ? matchedFacts.length / Math.min(factKeywords.length, 10) : 0;

  const score = Math.min(1, 0.3 + matchRatio * 0.7);

  return {
    dimension: 'product_fact_accuracy',
    score,
    passed: score >= 0.3,
    note: matchRatio < 0.2 ? 'Low fact coverage — content may not be grounded in verified facts' : undefined,
  };
}

function evaluateUnsupportedClaims(content: ContentToEvaluate): QualityScore {
  const body = content.body || '';
  let unsupported = 0;

  // Check for absolute claims without evidence
  const absoluteClaims = [
    /100%|ضمان|نتيجة فورية|أفضل منتج|رقم 1|الأقوى/,
    /يعالج|يشفي|يمنع|يوحد|يؤخر/,
    / result|guarantee|best|number 1/,
  ];

  for (const pattern of absoluteClaims) {
    if (pattern.test(body)) unsupported++;
  }

  const score = Math.max(0, 1 - (unsupported * 0.3));

  return {
    dimension: 'no_unsupported_claims',
    score,
    passed: unsupported === 0,
    note: unsupported > 0 ? `${unsupported} potentially unsupported claim(s) detected` : undefined,
  };
}

function evaluateCtaRelevance(content: ContentToEvaluate): QualityScore {
  const cta = content.callToAction || '';
  const body = content.body || '';

  if (!cta) {
    return { dimension: 'cta_relevance', score: 0.5, passed: true, note: 'No CTA provided' };
  }

  // Check CTA is not aggressive
  const aggressivePatterns = [/اشتري الآن|لا تفوتي|عرض حصري|فقط اليوم|Alone!/i];
  const isAggressive = aggressivePatterns.some((p) => p.test(cta));

  const score = isAggressive ? 0.2 : 0.9;

  return {
    dimension: 'cta_relevance',
    score,
    passed: !isAggressive,
    note: isAggressive ? 'CTA is too aggressive — violates brand voice' : undefined,
  };
}

function evaluateNovelty(_content: ContentToEvaluate): QualityScore {
  // Basic novelty check — in production this would compare against recent content
  return {
    dimension: 'novelty',
    score: 0.7,
    passed: true,
    note: 'Novelty check requires historical content comparison',
  };
}

function evaluateReadability(content: ContentToEvaluate): QualityScore {
  const body = content.body || '';
  const sentences = body.split(/[.!؟]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0
    ? body.split(/\s+/).length / sentences.length
    : 0;

  // Good readability: 10-25 words per sentence
  const score = avgSentenceLength > 0 && avgSentenceLength <= 30 ? 0.8 :
    avgSentenceLength > 30 ? 0.4 : 0.6;

  return {
    dimension: 'readability',
    score,
    passed: score >= 0.4,
    note: avgSentenceLength > 30 ? 'Sentences may be too long for readability' : undefined,
  };
}

function evaluatePlatformFit(content: ContentToEvaluate): QualityScore {
  const channel = content.channel || 'website';
  const body = content.body || '';

  // Basic length checks per platform
  const limits: Record<string, { min: number; max: number }> = {
    instagram: { min: 50, max: 2200 },
    tiktok: { min: 20, max: 300 },
    whatsapp: { min: 20, max: 1000 },
    facebook: { min: 50, max: 5000 },
    website: { min: 100, max: 10000 },
  };

  const limit = limits[channel] ?? limits.website;
  const length = body.length;

  const score = length >= limit.min && length <= limit.max ? 0.9 :
    length < limit.min ? 0.3 : 0.5;

  return {
    dimension: 'platform_fit',
    score,
    passed: score >= 0.5,
    note: length < limit.min ? `Content too short for ${channel} (${length}/${limit.min})` :
      length > limit.max ? `Content too long for ${channel} (${length}/${limit.max})` : undefined,
  };
}
