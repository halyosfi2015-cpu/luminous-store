/**
 * THINK-BEFORE-GENERATE ORCHESTRATOR (11.4 + 11.5)
 * =================================================
 *
 * The core intelligence pipeline. Instead of:
 *   Prompt → Generate
 *
 * It does:
 *   Question → Understand Goal → Gather Context → Analyze Situation
 *   → Identify Candidates → Evaluate Alternatives → Select Best
 *   → Explain Why → Generate Output → Quality Check
 *
 * This is what makes Luminous an INTELLIGENCE AGENT, not a text generator.
 */

import type {
  UserIntent,
  IntentClassification,
  AssembledContext,
  ThinkPipeline,
  AnalysisPhase,
  AnalysisStep,
  RankedRecommendation,
  IntelligenceResult,
  ExplainableResult,
  ContextSource,
  AIConfidenceLevel,
  ResultStatus,
  ActionRequest,
} from './types';

import { classifyIntent, needsAIInterpretation, intentLabelAr } from './intent-classifier';
import { resolveContextRoute, assembleContext, contextCompletenessReport } from './context-router';
import { checkGuardrails, requiresApproval } from './guardrails';
import {
  startObservabilityTrace,
  completeObservabilityTrace,
  recordToolCall,
} from './observability';
import { getTopicContext, isFollowUp, resolveFollowUpReferences, buildConversationHistory } from './conversation';

/* ------------------------------------------------------------------------ */
/* PIPELINE ENGINE                                                            */
/* ------------------------------------------------------------------------ */

export interface OrchestratorInput {
  question: string;
  sessionId?: string;
  /** Pre-loaded data keyed by context source */
  contextData?: Partial<Record<ContextSource, unknown>>;
  /** Override intent classification */
  overrideIntent?: UserIntent;
  /** Provider for AI calls */
  provider?: 'self' | 'openai';
  /** Regeneration context */
  previousOutput?: IntelligenceResult;
  regenerationReason?: string;
}

/**
 * Main orchestration entry point.
 * Runs the full think-before-generate pipeline.
 */
export async function orchestrate(input: OrchestratorInput): Promise<IntelligenceResult> {
  const startTime = Date.now();
  const executionId = `exec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  // Initialize observability
  const { record: obsRecord, startedAt } = startObservabilityTrace({
    requestType: input.previousOutput ? 'regeneration' : 'initial',
    intent: 'unknown', // Will be updated after classification
    contextSources: [],
    provider: input.provider ?? 'self',
    model: input.provider === 'openai' ? 'gpt-4o-mini' : 'self-deterministic',
  });

  // Declare classification at function scope so it's accessible in error handling
  let classification: IntentClassification = { intent: 'unknown', confidence: 0, reasoning: '' };
  let resolvedQuestion = input.question;
  const contextUsed: string[] = [];

  const pipeline: ThinkPipeline = {
    id: executionId,
    steps: [],
    startedAt,
  };

  try {
    // ── PHASE 1: Understand Goal ──────────────────────────────────────
    const step1 = addStep(pipeline, 'understand_goal');

    if (input.overrideIntent) {
      classification = {
        intent: input.overrideIntent,
        confidence: 1.0,
        reasoning: 'Intent overridden by caller.',
      };
    } else {
      classification = classifyIntent(input.question);
    }

    // Handle follow-up context
    if (input.sessionId && isFollowUp(input.sessionId)) {
      const { resolved, contextUsed: used } = resolveFollowUpReferences(
        input.sessionId,
        input.question,
      );
      resolvedQuestion = resolved;
      contextUsed.push(...used);
    }

    // If intent is unknown or low confidence, use AI interpretation
    if (needsAIInterpretation(classification)) {
      // For now, keep the deterministic classification
      // AI interpretation would go here when OpenAI is available
    }

    completeStep(step1, {
      classification,
      resolvedQuestion,
      contextUsed,
    });
    obsRecord.intent = classification.intent;

    // ── PHASE 2: Gather Context ───────────────────────────────────────
    const step2 = addStep(pipeline, 'gather_context');
    const route = resolveContextRoute(classification.intent);
    const loadedData = input.contextData ?? {};
    const context = assembleContext(classification.intent, loadedData);
    const completeness = contextCompletenessReport(context, classification.intent);

    obsRecord.contextSources = context.sources;
    recordToolCall(obsRecord, 'context_assembly', 'success', 0);

    completeStep(step2, {
      route: route.description,
      sourcesLoaded: completeness.loaded,
      sourcesMissing: completeness.missing,
      completenessRatio: completeness.completenessRatio,
    });

    // ── PHASE 3: Analyze Situation ────────────────────────────────────
    const step3 = addStep(pipeline, 'analyze_situation');
    const analysis = analyzeSituation(classification.intent, context);
    completeStep(step3, analysis);

    // ── PHASE 4: Identify Candidates ──────────────────────────────────
    const step4 = addStep(pipeline, 'identify_candidates');
    const candidates = identifyCandidates(classification.intent, context, analysis);
    completeStep(step4, { candidatesCount: candidates.length });

    // ── PHASE 5: Evaluate Alternatives ────────────────────────────────
    const step5 = addStep(pipeline, 'evaluate_alternatives');
    const evaluated = evaluateAlternatives(candidates, context, classification.intent);
    completeStep(step5, { evaluatedCount: evaluated.length });

    // ── PHASE 6: Select Recommendation ────────────────────────────────
    const step6 = addStep(pipeline, 'select_recommendation');
    const ranked = rankRecommendations(evaluated, classification.intent);
    completeStep(step6, { rankedCount: ranked.length });

    // ── PHASE 7: Explain Reasoning ────────────────────────────────────
    const step7 = addStep(pipeline, 'explain_reasoning');
    const explanation = buildExplanation(ranked, context, classification.intent);
    completeStep(step7, explanation);

    // ── PHASE 8: Generate Output ──────────────────────────────────────
    const step8 = addStep(pipeline, 'generate_output');
    const result = buildIntelligenceResult({
      classification,
      context,
      ranked,
      explanation,
      analysis,
      pipeline,
      executionId,
      observability: obsRecord,
    });

    // Check guardrails for any actions
    for (const action of result.actions) {
      const guardrailResult = checkGuardrails(action);
      if (guardrailResult.level === 'require_approval') {
        result.requiresApproval = true;
        result.status = 'requires_approval';
      }
      if (guardrailResult.level === 'deny') {
        result.status = 'error';
        result.answer = `Action blocked: ${guardrailResult.message}`;
      }
    }

    completeStep(step8, { resultStatus: result.status });
    pipeline.completedAt = new Date().toISOString();
    pipeline.totalDurationMs = Date.now() - startTime;

    // Complete observability
    completeObservabilityTrace(obsRecord, {
      resultStatus: result.status,
      approvalRequired: result.requiresApproval,
      actionType: result.actions[0]?.type,
      latencyMs: pipeline.totalDurationMs,
    });

    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    pipeline.completedAt = new Date().toISOString();
    pipeline.totalDurationMs = Date.now() - startTime;

    completeObservabilityTrace(obsRecord, {
      resultStatus: 'error',
      approvalRequired: false,
      latencyMs: pipeline.totalDurationMs,
      errorMessage: msg,
    });

    return {
      status: 'error',
      intent: classification?.intent ?? 'unknown',
      answer: `خطأ في المعالجة: ${msg}`,
      summary: '',
      rankedRecommendations: [],
      facts: [],
      insights: [],
      confidence: 'insufficient_data',
      dataSources: [],
      contextRange: '',
      actions: [],
      requiresApproval: false,
      executionId,
      pipeline,
      observability: obsRecord,
    };
  }
}

/* ------------------------------------------------------------------------ */
/* PHASE IMPLEMENTATIONS                                                     */
/* ------------------------------------------------------------------------ */

function addStep(pipeline: ThinkPipeline, phase: AnalysisPhase): AnalysisStep {
  const step: AnalysisStep = { phase, status: 'in_progress' };
  pipeline.steps.push(step);
  return step;
}

function completeStep(step: AnalysisStep, result: unknown): void {
  step.status = 'completed';
  step.result = result;
}

function analyzeSituation(intent: UserIntent, context: AssembledContext): Record<string, unknown> {
  // Deterministic analysis based on available data
  const data = context.data;
  const insights: string[] = [];

  // Check what data is available
  if (data.orders) {
    const orders = data.orders as Array<Record<string, unknown>>;
    insights.push(`${orders.length} طلبات متاحة للتحليل`);
  }
  if (data.products) {
    const products = data.products as Array<Record<string, unknown>>;
    insights.push(`${products.length} منتج في الكتالوج`);
  }
  if (data.inventory) {
    insights.push('بيانات المخزون متاحة');
  }
  if (data.customers) {
    insights.push('بيانات العملاء متاحة');
  }

  return {
    intent,
    availableData: Object.keys(data),
    insights,
    dataRichness: Object.keys(data).length / context.sources.length,
  };
}

interface CandidateCandidate {
  id: string;
  title: string;
  type: string;
  score: number;
  evidence: string[];
}

function identifyCandidates(
  intent: UserIntent,
  context: AssembledContext,
  analysis: Record<string, unknown>,
): CandidateCandidate[] {
  const candidates: CandidateCandidate[] = [];
  const data = context.data;

  switch (intent) {
    case 'opportunity_discovery': {
      // Generate opportunity candidates from available data
      if (data.analytics) {
        candidates.push({
          id: 'opp_analytics',
          title: 'فرص مبنية على تحليلات المتجر',
          type: 'analytics_based',
          score: 0.8,
          evidence: ['بيانات التحليلات متاحة'],
        });
      }
      if (data.customers) {
        candidates.push({
          id: 'opp_customers',
          title: 'فرص إعادة تنشيط العملاء غير النشطين',
          type: 'reactivation',
          score: 0.7,
          evidence: ['بيانات العملاء متاحة'],
        });
      }
      if (data.inventory) {
        candidates.push({
          id: 'opp_inventory',
          title: 'فرص تحسين المخزون',
          type: 'inventory_optimization',
          score: 0.6,
          evidence: ['بيانات المخزون متاحة'],
        });
      }
      break;
    }
    case 'campaign_planning': {
      candidates.push({
        id: 'camp_conversion',
        title: 'حملة تحويل (Conversion)',
        type: 'conversion',
        score: 0.8,
        evidence: ['التحويل هو الهدف التجاري الأساسي'],
      });
      candidates.push({
        id: 'camp_engagement',
        title: 'حملة تفاعل (Engagement)',
        type: 'engagement',
        score: 0.6,
        evidence: ['التفاعل يبني الولاء على المدى الطويل'],
      });
      candidates.push({
        id: 'camp_retention',
        title: 'حملة احتفاظ (Retention)',
        type: 'retention',
        score: 0.7,
        evidence: ['احتفاظ بالعملاء أرخص من اكتساب جدد'],
      });
      break;
    }
    case 'content_generation': {
      if (data.products) {
        candidates.push({
          id: 'content_spotlight',
          title: 'إضاءة منتج (Product Spotlight)',
          type: 'PRODUCT_SPOTLIGHT',
          score: 0.8,
          evidence: ['محتوى المنتجات مباشرة ومؤثرة'],
        });
      }
      candidates.push({
        id: 'content_educational',
        title: 'محتوى تعليمي (Educational)',
        type: 'EDUCATIONAL',
        score: 0.7,
        evidence: ['المحتوى التعليمي يبني الثقة'],
      });
      break;
    }
    default: {
      // Generic analysis candidate
      candidates.push({
        id: 'analysis_generic',
        title: 'تحليل الوضع الحالي',
        type: 'analysis',
        score: 0.5,
        evidence: ['تحليل عام من البيانات المتاحة'],
      });
    }
  }

  return candidates;
}

function evaluateAlternatives(
  candidates: CandidateCandidate[],
  context: AssembledContext,
  intent: UserIntent,
): CandidateCandidate[] {
  // Score adjustment based on data availability
  const completeness = contextCompletenessReport(context, intent);

  return candidates.map((c) => {
    let adjustedScore = c.score;

    // Boost score if we have rich data
    if (completeness.completenessRatio > 0.8) adjustedScore += 0.1;
    if (completeness.completenessRatio < 0.5) adjustedScore -= 0.1;

    // Ensure score stays in [0, 1]
    adjustedScore = Math.max(0, Math.min(1, adjustedScore));

    return { ...c, score: adjustedScore };
  });
}

function rankRecommendations(
  candidates: CandidateCandidate[],
  intent: UserIntent,
): RankedRecommendation[] {
  // Sort by score descending
  const sorted = [...candidates].sort((a, b) => b.score - a.score);

  return sorted.map((c, i) => {
    const rank = i + 1;
    let rankLabel: 'best' | 'good' | 'alternative';
    if (rank === 1) rankLabel = 'best';
    else if (rank === 2) rankLabel = 'good';
    else rankLabel = 'alternative';

    const confidence: AIConfidenceLevel = c.score > 0.7 ? 'high' : c.score > 0.4 ? 'medium' : 'low';

    return {
      rank,
      rankLabel,
      title: c.title,
      what: c.title,
      why: c.evidence.join(' | '),
      evidence: c.evidence,
      confidence,
      expectedImpact: getExpectedImpact(c.type, intent),
      tradeOff: getTradeOff(c.type),
      recommendedAction: getRecommendedAction(c.type),
      requiresApproval: false,
      actionType: getActionType(c.type),
    };
  });
}

function getExpectedImpact(candidateType: string, intent: UserIntent): string {
  if (intent === 'campaign_planning') {
    switch (candidateType) {
      case 'conversion': return 'زيادة مباشرة في المبيعات على المدى القصير';
      case 'engagement': return 'بناء علاقة أعمق مع الجمهور وزيادة الوعي';
      case 'retention': return 'تقليل معدل التخلي وزيادة قيمة العميل مدى الحياة';
      default: return 'تحسين عام للأداء';
    }
  }
  if (intent === 'opportunity_discovery') {
    return 'فرصة نمو مبنية على بيانات حقيقية';
  }
  return 'تحسين الأداء بناءً على التحليل';
}

function getTradeOff(candidateType: string): string | undefined {
  if (candidateType === 'conversion') return 'قد يتطلب خصمًا يقلل هامش الربح';
  if (candidateType === 'engagement') return 'التحويل قد لا يكون مباشرًا';
  if (candidateType === 'retention') return 'يتطلب بيانات عملاء كافية';
  return undefined;
}

function getRecommendedAction(candidateType: string): string {
  if (candidateType === 'conversion') return 'إنشاء حملة تحويل مع عرض محدد';
  if (candidateType === 'engagement') return 'إنشاء محتوى تفاعلي يstrukens';
  if (candidateType === 'retention') return 'تفعيل حملة إعادة تنشيط للعملاء غير النشطين';
  if (candidateType === 'reactivation') return 'إرسال رسالة إعادة تنشيط مخصصة';
  return 'تحليل أعمق للبيانات المتاحة';
}

function getActionType(candidateType: string): ActionRequest['type'] {
  if (candidateType === 'conversion' || candidateType === 'engagement' || candidateType === 'retention') {
    return 'campaign_create';
  }
  if (candidateType === 'reactivation') return 'customer_reactivate';
  if (candidateType === 'content_educational' || candidateType === 'content_spotlight') {
    return 'content_create';
  }
  return 'analysis_only';
}

function buildExplanation(
  ranked: RankedRecommendation[],
  context: AssembledContext,
  intent: UserIntent,
): ExplainableResult {
  const best = ranked[0];
  const completeness = contextCompletenessReport(context, intent);

  return {
    what: best?.title ?? 'تحليل الوضع',
    why: best?.why ?? 'بيانات كافية للتحليل',
    evidence: best?.evidence ?? [],
    confidence: best?.confidence ?? 'low',
    expectedImpact: best?.expectedImpact ?? 'تحSouthern محدود بسبب نقص البيانات',
    tradeOff: best?.tradeOff,
    recommendedAction: best?.recommendedAction ?? 'جمع المزيد من البيانات',
    dataSourcesUsed: context.sources,
    contextCompleteness: completeness.completenessRatio,
  };
}

function buildIntelligenceResult(params: {
  classification: IntentClassification;
  context: AssembledContext;
  ranked: RankedRecommendation[];
  explanation: ExplainableResult;
  analysis: Record<string, unknown>;
  pipeline: ThinkPipeline;
  executionId: string;
  observability: import('./types').ObservabilityRecord;
}): IntelligenceResult {
  const { classification, context, ranked, explanation, pipeline, executionId, observability } = params;

  // Determine status
  let status: ResultStatus = 'success';
  if (context.data && Object.keys(context.data).length === 0) {
    status = 'insufficient_data';
  } else if (explanation.confidence === 'low') {
    status = 'partial';
  }

  // Build answer in Arabic
  const answer = buildAnswerArabic(classification.intent, ranked, explanation);

  // Build actions from top recommendations
  const actions: ActionRequest[] = ranked
    .filter((r) => r.actionType && r.actionType !== 'analysis_only')
    .slice(0, 3)
    .map((r) => ({
      type: r.actionType!,
      description: r.recommendedAction,
      payload: { recommendation: r.title },
      requiresApproval: r.requiresApproval,
    }));

  // Facts from context
  const facts = extractFacts(context);

  return {
    status,
    intent: classification.intent,
    answer,
    summary: explanation.why,
    rankedRecommendations: ranked,
    facts,
    insights: [
      {
        title: 'تحليل السياق',
        description: `تم تحليل ${context.sources.length} مصدر بيانات. اكتمال السياق: ${Math.round(explanation.contextCompleteness * 100)}%`,
      },
    ],
    confidence: explanation.confidence,
    dataSources: context.sources.map((s) => ({ name: s, label: s })),
    contextRange: `آخر بيانات متاحة — ${context.sources.length} مصدر`,
    actions,
    requiresApproval: actions.some((a) => a.requiresApproval),
    executionId,
    pipeline,
    observability,
  };
}

function buildAnswerArabic(
  intent: UserIntent,
  ranked: RankedRecommendation[],
  explanation: ExplainableResult,
): string {
  if (ranked.length === 0) {
    return 'بيانات غير كافية لتقديم توصية موثوقة في هذا المجال.';
  }

  const best = ranked[0];
  const secondBest = ranked[1];

  let answer = `بناءً على التحليل: ${best.title}.\n`;
  answer += `${best.why}\n`;
  answer += `الإجراء الموصى به: ${best.recommendedAction}.`;

  if (secondBest) {
    answer += `\n\nبديل: ${secondBest.title} — ${secondBest.recommendedAction}.`;
  }

  if (explanation.confidence === 'low') {
    answer += '\n\n⚠️ مستوى الثقة منخفض — يُنصح بجمع المزيد من البيانات قبل اتخاذ قرار.';
  }

  return answer;
}

function extractFacts(context: AssembledContext): Array<{ statement: string; source: string; value: number | string | null }> {
  const facts: Array<{ statement: string; source: string; value: number | string | null }> = [];

  for (const [source, data] of Object.entries(context.data)) {
    if (data && typeof data === 'object') {
      if (Array.isArray(data)) {
        facts.push({
          statement: `${source}: ${data.length} سجل متاح`,
          source,
          value: data.length,
        });
      } else {
        const keys = Object.keys(data as Record<string, unknown>);
        facts.push({
          statement: `${source}: ${keys.length} حقل متاح`,
          source,
          value: keys.length,
        });
      }
    }
  }

  return facts;
}
