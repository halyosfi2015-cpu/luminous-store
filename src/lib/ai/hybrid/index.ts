/**
 * PART 3 — HYBRID AI ENGINE (public surface)
 * ==========================================
 * One import for the whole hybrid layer.
 */

export { HYBRID_AI_ENGINE_VERSION } from "./types";
export type { HybridProviderStatus, ScoredContentIdea, GenerateBestIdeasInput, CreativeAngleRef } from "./types";

export {
  isOpenAIConfigured,
  getOpenAIEnvState,
  resolveEffectiveProvider,
  buildHybridProviderStatus,
} from "./config";

export {
  SelfAIProvider,
  createSelfAIProvider,
  buildSelfContentBody,
  buildSelfContentPayload,
  SELF_MODEL,
} from "./self-provider";
export type { ParsedBriefMeta, ParsedProduct, ParsedContext } from "./self-provider";

export { createOpenAIContentAdapter, createOpenAIContentAdapterWith } from "./openai-provider";

export {
  getHybridProvider,
  getProviderStatus,
  getEffectiveProvider,
  createActiveInsightAdapter,
  selfHybridProvider,
  openaiHybridProvider,
} from "./provider";
export type { HybridProvider } from "./provider";

export { generateBestIdeas, CREATIVE_IDEAS_VERSION } from "./ideas";

export {
  buildExternalContext,
  mergeExternalFacts,
  assertInternalFactsOverride,
  EXTERNAL_CONTEXT_VERSION,
} from "./external-context";
export type {
  ExternalContextEntry,
  ExternalResearchInput,
  ExternalContextResult,
  ExternalContextKind,
} from "./external-context";