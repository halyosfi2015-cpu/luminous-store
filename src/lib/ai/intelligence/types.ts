/**
 * LUMINOUS INTELLIGENCE AGENT — CORE TYPES
 * =========================================
 *
 * Types for the Contextual Commerce Agent (Sections 11.1–11.28).
 * This layer sits ABOVE the existing AI provider / content engine and adds:
 *   - Intent classification
 *   - Context routing
 *   - Think-before-generate orchestration
 *   - Ranked recommendations with explainability
 *   - Conversational continuity
 *   - Observability
 *   - Guardrails
 */

/* ------------------------------------------------------------------------ */
/* INTENT CLASSIFICATION (11.2)                                              */
/* ------------------------------------------------------------------------ */

export type UserIntent =
  | 'commercial_decision'      // "شو أحسن منتج أدفعه هذا الأسبوع؟"
  | 'content_generation'       // "أنشئ محتوى للبشرة الجافة"
  | 'diagnostic_analysis'      // "ليش المبيعات نزلت؟"
  | 'campaign_planning'        // "اعمل حملة"
  | 'executive_prioritization' // "ماذا يحتاج انتباهي؟"
  | 'opportunity_discovery'    // "أعطني فكرة"
  | 'product_query'            // "ما هذا المنتج؟"
  | 'customer_query'           // "كيف حال العملاء؟"
  | 'inventory_query'          // "شو وضع المخزون؟"
  | 'sales_query'              // "КАКالمبيعات؟"
  | 'unknown';

export interface IntentClassification {
  intent: UserIntent;
  confidence: number; // 0..1
  subIntent?: string;
  reasoning: string;
}

/* ------------------------------------------------------------------------ */
/* CONTEXT ROUTING (11.3)                                                    */
/* ------------------------------------------------------------------------ */

export type ContextSource =
  | 'products'
  | 'orders'
  | 'customers'
  | 'inventory'
  | 'content'
  | 'campaigns'
  | 'analytics'
  | 'offers'
  | 'segments'
  | 'intent_signals'
  | 'brand_voice';

export interface ContextRoute {
  intent: UserIntent;
  requiredSources: ContextSource[];
  optionalSources: ContextSource[];
  description: string;
}

export interface AssembledContext {
  sources: ContextSource[];
  data: Record<string, unknown>;
  assembledAt: string;
  hash: string;
}

/* ------------------------------------------------------------------------ */
/* THINK-BEFORE-GENERATE (11.4)                                              */
/* ------------------------------------------------------------------------ */

export type AnalysisPhase =
  | 'understand_goal'
  | 'gather_context'
  | 'analyze_situation'
  | 'identify_candidates'
  | 'evaluate_alternatives'
  | 'select_recommendation'
  | 'explain_reasoning'
  | 'generate_output';

export interface AnalysisStep {
  phase: AnalysisPhase;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  result?: unknown;
  duration_ms?: number;
}

export interface ThinkPipeline {
  id: string;
  steps: AnalysisStep[];
  startedAt: string;
  completedAt?: string;
  totalDurationMs?: number;
}

/* ------------------------------------------------------------------------ */
/* RANKED RECOMMENDATIONS (11.5)                                             */
/* ------------------------------------------------------------------------ */

export type RecommendationRank = 'best' | 'good' | 'alternative';

export interface RankedRecommendation {
  rank: number;
  rankLabel: RecommendationRank;
  title: string;
  what: string;
  why: string;
  evidence: string[];
  confidence: AIConfidenceLevel;
  expectedImpact: string;
  tradeOff?: string;
  recommendedAction: string;
  requiresApproval: boolean;
  actionType?: ActionType;
  relatedEntities?: Array<{ type: string; id: string; name: string }>;
}

export type AIConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient_data';

/* ------------------------------------------------------------------------ */
/* EXPLAINABILITY (11.10)                                                    */
/* ------------------------------------------------------------------------ */

export interface ExplainableResult {
  what: string;
  why: string;
  evidence: string[];
  confidence: AIConfidenceLevel;
  expectedImpact: string;
  tradeOff?: string;
  recommendedAction: string;
  dataSourcesUsed: string[];
  contextCompleteness: number; // 0..1
}

/* ------------------------------------------------------------------------ */
/* ACTIONS & APPROVAL (11.12)                                                */
/* ------------------------------------------------------------------------ */

export type ActionType =
  | 'content_create'
  | 'content_publish'
  | 'campaign_create'
  | 'campaign_activate'
  | 'offer_modify'
  | 'price_change'
  | 'inventory_adjust'
  | 'customer_reactivate'
  | 'recommendation_execute'
  | 'analysis_only';

export interface ActionRequest {
  type: ActionType;
  description: string;
  payload: Record<string, unknown>;
  requiresApproval: boolean;
  approvalReason?: string;
}

export interface ApprovalRecord {
  id: string;
  actionType: ActionType;
  description: string;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

/* ------------------------------------------------------------------------ */
/* CONVERSATIONAL CONTINUITY (11.23)                                         */
/* ------------------------------------------------------------------------ */

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: UserIntent;
  context?: AssembledContext;
  result?: IntelligenceResult;
  timestamp: string;
}

export interface ConversationSession {
  id: string;
  turns: ConversationTurn[];
  createdAt: string;
  lastActiveAt: string;
  topicContext?: {
    lastIntent?: UserIntent;
    lastProducts?: string[];
    lastCustomers?: string[];
    lastOpportunity?: string;
    pendingAction?: ActionRequest;
  };
}

/* ------------------------------------------------------------------------ */
/* INTELLIGENCE RESULT (unified output)                                      */
/* ------------------------------------------------------------------------ */

export type ResultStatus = 'success' | 'partial' | 'insufficient_data' | 'error' | 'requires_approval';

export interface IntelligenceResult {
  status: ResultStatus;
  intent: UserIntent;
  answer: string;
  summary: string;
  rankedRecommendations: RankedRecommendation[];
  facts: Array<{ statement: string; source: string; value: number | string | null }>;
  insights: Array<{ title: string; description: string }>;
  confidence: AIConfidenceLevel;
  dataSources: Array<{ name: string; label: string }>;
  contextRange: string;
  actions: ActionRequest[];
  requiresApproval: boolean;
  executionId: string;
  pipeline?: ThinkPipeline;
  observability?: ObservabilityRecord;
}

/* ------------------------------------------------------------------------ */
/* OBSERVABILITY (11.20)                                                     */
/* ------------------------------------------------------------------------ */

export interface ObservabilityRecord {
  executionId: string;
  requestType: string;
  intent: UserIntent;
  contextSources: ContextSource[];
  provider: string;
  model: string;
  toolCalls: Array<{ tool: string; status: string; durationMs: number }>;
  resultStatus: ResultStatus;
  approvalRequired: boolean;
  actionType?: ActionType;
  latencyMs: number;
  tokenUsage?: { input: number; output: number; total: number };
  errorMessage?: string;
  startedAt: string;
  completedAt: string;
}

/* ------------------------------------------------------------------------ */
/* GUARDRAILS (11.19)                                                        */
/* ------------------------------------------------------------------------ */

export type GuardrailLevel = 'allow' | 'warn' | 'require_approval' | 'deny';

export interface GuardrailRule {
  id: string;
  name: string;
  description: string;
  level: GuardrailLevel;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'in' | 'contains' | 'gt' | 'lt';
    value: unknown;
  }>;
}

export interface GuardrailCheckResult {
  passed: boolean;
  level: GuardrailLevel;
  ruleId: string;
  ruleName: string;
  message: string;
}

/* ------------------------------------------------------------------------ */
/* CONTENT QUALITY (11.18)                                                   */
/* ------------------------------------------------------------------------ */

export type QualityDimension =
  | 'goal_alignment'
  | 'audience_alignment'
  | 'brand_voice'
  | 'product_fact_accuracy'
  | 'no_unsupported_claims'
  | 'cta_relevance'
  | 'novelty'
  | 'readability'
  | 'platform_fit';

export interface QualityScore {
  dimension: QualityDimension;
  score: number; // 0..1
  passed: boolean;
  note?: string;
}

export interface ContentQualityEvaluation {
  overallScore: number; // 0..1
  passed: boolean;
  scores: QualityScore[];
  failedDimensions: QualityDimension[];
  recommendation: 'publish' | 'revise' | 'reject';
}

/* ------------------------------------------------------------------------ */
/* BRAND BRAIN (11.14)                                                       */
/* ------------------------------------------------------------------------ */

export interface BrandBrainConfig {
  identity: {
    name: string;
    nameAr: string;
    tagline: string;
    positioning: string;
  };
  voice: {
    traits: string[];
    tone: string[];
    prohibitions: string[];
    editorialRules: string[];
    ctaStyle: string;
  };
  audience: {
    primary: string;
    demographics: string;
    psychographics: string;
    language: string;
  };
  boundaries: {
    medicalClaims: string;
    safetyBoundaries: string[];
    pricingPolicy: string;
  };
  visualIdentity: {
    primaryColor: string;
    style: string;
  };
}

/* ------------------------------------------------------------------------ */
/* MULTI-OPTION CREATIVITY (11.9)                                            */
/* ------------------------------------------------------------------------ */

export interface CreativeOption {
  id: string;
  label: string;
  strategy: string;
  targetGoal: string;
  products: string[];
  audience: string;
  channel: string;
  angle: string;
  content?: string;
  cta?: string;
  expectedOutcome: string;
}

/* ------------------------------------------------------------------------ */
/* ANTI-REPETITION (11.8)                                                    */
/* ------------------------------------------------------------------------ */

export interface RepetitionContext {
  recentProducts: string[];
  recentAngles: string[];
  recentCTAs: string[];
  recentContentTypes: string[];
  recentCampaignThemes: string[];
}

/* ------------------------------------------------------------------------ */
/* STORE-AWARE CONTEXT (11.16)                                               */
/* ------------------------------------------------------------------------ */

export interface StoreAwareContext {
  currentStock: Record<string, number>;
  availability: Record<string, boolean>;
  activeOffers: Array<{ productId: string; discount: number; endsAt: string }>;
  slowMovingProducts: string[];
  fastMovingProducts: string[];
  recentSalesTrend: 'growing' | 'stable' | 'declining';
  operationalRisks: string[];
}

/* ------------------------------------------------------------------------ */
/* CUSTOMER-AWARE CONTEXT (11.15)                                            */
/* ------------------------------------------------------------------------ */

export interface CustomerAwareContext {
  profile?: {
    id: string;
    segments: string[];
    intentLevel: string;
    valueTier: string;
    lifecycle: string;
    preferences?: Record<string, unknown>;
  };
  recentBehavior?: {
    viewedProducts: string[];
    cartProducts: string[];
    searchQueries: string[];
    lastVisit: string;
  };
}
