/**
 * PART 3 — HYBRID PROVIDER REGISTRY
 * =================================
 * The single place that maps the persisted provider setting to a concrete
 * `AIProvider` instance and exposes the canonical status. Both engines expose
 * the identical `AIProvider.generateInsight` contract; the rest of the content
 * pipeline is provider-agnostic by construction.
 */

import type { AIProvider } from "../../ai/provider";
import type { ContentOpsSettings, HybridAIProviderName } from "../../content-ops/types";
import { buildHybridProviderStatus, resolveEffectiveProvider, isOpenAIConfigured } from "./config";
import type { HybridProviderStatus } from "./types";
import { createSelfAIProvider } from "./self-provider";
import { createOpenAIContentAdapter } from "./openai-provider";

export interface HybridProvider {
  readonly name: HybridAIProviderName;
  isConfigured: () => boolean;
  createInsightAdapter: () => AIProvider;
}

export const selfHybridProvider: HybridProvider = {
  name: "self",
  isConfigured: () => true,
  createInsightAdapter: () => createSelfAIProvider(),
};

export const openaiHybridProvider: HybridProvider = {
  name: "openai",
  isConfigured: () => {
    // Real status — never fabricates a connection when no key is configured.
    return isOpenAIConfigured();
  },
  createInsightAdapter: () => createOpenAIContentAdapter(),
};

export function getHybridProvider(name: HybridAIProviderName): HybridProvider {
  return name === "openai" ? openaiHybridProvider : selfHybridProvider;
}

export function getProviderStatus(settings: Pick<ContentOpsSettings, "aiProvider" | "aiFallbackEnabled">): HybridProviderStatus {
  return buildHybridProviderStatus(settings);
}

/**
 * Resolve the effective provider name for a settings snapshot (fallback-aware).
 * Returns the provider whose insight adapter should be passed into the Part 1/2
 * generation pipeline right now.
 */
export function getEffectiveProvider(settings: Pick<ContentOpsSettings, "aiProvider" | "aiFallbackEnabled">): {
  name: HybridAIProviderName;
  fallbackUsed: boolean;
} {
  const { effective, fallbackUsed } = resolveEffectiveProvider(settings);
  return { name: effective, fallbackUsed };
}

/**
 * Build the AIProvider the Part 1/2 pipeline should call. When the effective
 * provider is not ready (OpenAI selected, no key, no fallback), the returned
 * adapter fails honestly with ai_not_configured.
 */
export function createActiveInsightAdapter(settings: Pick<ContentOpsSettings, "aiProvider" | "aiFallbackEnabled">): AIProvider {
  const { name } = getEffectiveProvider(settings);
  return getHybridProvider(name).createInsightAdapter();
}