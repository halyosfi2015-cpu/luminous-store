/**
 * PART 3 — OPENAI CONTENT PROVIDER
 * ================================
 * Real server-side OpenAI adapter for content generation. Implements the same
 * `AIProvider` contract as the self engine and emits the same strict JSON the
 * Part 1 generator parses — so OpenAI output passes through the exact same
 * validation / originality / safety / eligibility pipeline. The API key stays
 * server-side (existing getAIConfig). Never exposes secrets and never bypasses
 * approval: this adapter only produces the raw insight.
 */

import type { AIProvider } from "../../ai/provider";
import { OpenAIProvider, NullAIProvider } from "../../ai/provider";
import { isAIConfigured } from "../../ai/config";

export const OPENAI_PROVIDER_LABEL = "openai";

/**
 * Build the OpenAI insight adapter. When no key is configured it returns the
 * canonical NullAIProvider (ai_not_configured) so callers fail honestly —
 * the switch to OpenAI never fabricates a connection.
 */
export function createOpenAIContentAdapter(): AIProvider {
  if (!isAIConfigured()) return new NullAIProvider();
  return new OpenAIProvider();
}

/** Test-only seam: build an OpenAI-style adapter backed by any AIProvider. */
export function createOpenAIContentAdapterWith(adapter: AIProvider): AIProvider {
  return adapter;
}