/**
 * INTELLIGENCE AGENT — BARREL EXPORTS
 * ====================================
 *
 * Single entry point for the Contextual Commerce Agent.
 * Import from '@/src/lib/ai/intelligence' to access all intelligence features.
 */

// Core types
export type {
  UserIntent,
  IntentClassification,
  ContextSource,
  ContextRoute,
  AssembledContext,
  AnalysisPhase,
  AnalysisStep,
  ThinkPipeline,
  RankedRecommendation,
  RecommendationRank,
  IntelligenceResult,
  ExplainableResult,
  ActionType,
  ActionRequest,
  ApprovalRecord,
  ConversationTurn,
  ConversationSession,
  ObservabilityRecord,
  GuardrailRule,
  GuardrailCheckResult,
  GuardrailLevel,
  QualityDimension,
  QualityScore,
  ContentQualityEvaluation,
  BrandBrainConfig,
  CreativeOption,
  RepetitionContext,
  StoreAwareContext,
  CustomerAwareContext,
  ResultStatus,
  AIConfidenceLevel,
} from './types';

// Intent Classifier
export { classifyIntent, needsAIInterpretation, intentLabelAr } from './intent-classifier';

// Context Router
export {
  resolveContextRoute,
  getRequiredSources,
  getAllSources,
  assembleContext,
  isContextComplete,
  contextCompletenessReport,
} from './context-router';

// Brand Brain
export { LUMINOUS_BRAND_BRAIN, buildBrandBrainPrompt, buildCompactVoicePrompt } from './brand-brain';

// Orchestrator
export { orchestrate } from './orchestrator';
export type { OrchestratorInput } from './orchestrator';

// Guardrails
export {
  checkGuardrails,
  requiresApproval,
  isDenied,
  getActiveRules,
  addGuardrailRule,
  removeGuardrailRule,
  resetGuardrails,
} from './guardrails';

// Observability
export {
  startObservabilityTrace,
  completeObservabilityTrace,
  recordToolCall,
  getRecentRecords,
  getRecordsByIntent,
  getRecordsByStatus,
  getObservabilityMetrics,
  clearObservabilityRecords,
} from './observability';

// Conversational Continuity
export {
  getSession,
  addUserTurn,
  addAssistantTurn,
  getTopicContext,
  getRecentTurns,
  buildConversationHistory,
  isFollowUp,
  resolveFollowUpReferences,
  clearSession,
} from './conversation';
