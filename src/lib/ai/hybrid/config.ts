/**
 * PART 3 — HYBRID AI ENGINE — CONFIGURATION
 * ==========================================
 * Pure, deterministic resolution of which provider is effective and whether
 * generation can run. Reads the existing server-side AI config (OPENAI_API_KEY
 * / AI_API_KEY) — never exposes secrets to the browser.
 */

import { isAIConfigured, getAIConfig } from "../../ai/config";
import type { ContentOpsSettings, HybridAIProviderName } from "../../content-ops/types";
import { HYBRID_AI_ENGINE_VERSION, type HybridProviderStatus } from "./types";

export { isAIConfigured };

export const HYBRID_PROVIDER_CONFIG_VERSION = HYBRID_AI_ENGINE_VERSION;

export function isOpenAIConfigured(): boolean {
  return isAIConfigured();
}

/** Current server-side OpenAI configuration summary (no secrets). */
export function getOpenAIEnvState(): { configured: boolean; model: string } {
  const config = getAIConfig();
  return { configured: config.apiKey !== null, model: config.model };
}

/**
 * Resolve which provider will actually generate content given the persisted
 * settings. When OpenAI is selected but has no key, behavior depends on
 * `aiFallbackEnabled`: fallback to the self engine (recommended default) or
 * stay "openai" (generation will fail with ai_not_configured).
 */
export function resolveEffectiveProvider(
  settings: Pick<ContentOpsSettings, "aiProvider" | "aiFallbackEnabled">,
): { effective: HybridAIProviderName; fallbackUsed: boolean } {
  const selected = settings.aiProvider;
  if (selected === "self") return { effective: "self", fallbackUsed: false };
  if (isOpenAIConfigured()) return { effective: "openai", fallbackUsed: false };
  if (settings.aiFallbackEnabled) return { effective: "self", fallbackUsed: true };
  return { effective: "openai", fallbackUsed: false };
}

export function buildHybridProviderStatus(
  settings: Pick<ContentOpsSettings, "aiProvider" | "aiFallbackEnabled">,
): HybridProviderStatus {
  const { effective, fallbackUsed } = resolveEffectiveProvider(settings);
  const openaiConfigured = isOpenAIConfigured();
  const ready = effective === "self" || openaiConfigured;

  let messageAr = "";
  let messageEn = "";
  if (effective === "self" && settings.aiProvider === "openai" && fallbackUsed) {
    messageAr = "OpenAI غير مهيأ — سيتم استخدام المحرك الذاتي";
    messageEn = "OpenAI is not configured — using the self engine";
  } else if (settings.aiProvider === "openai" && !openaiConfigured) {
    messageAr = "OpenAI غير مهيأ — لن يتم توليد المحتوى عبر OpenAI";
    messageEn = "OpenAI is not configured — content generation via OpenAI will fail";
  } else if (effective === "self") {
    messageAr = "يعمل بالمحرك الذاتي";
    messageEn = "Running on the self engine";
  } else {
    messageAr = "يعمل عبر OpenAI";
    messageEn = "Running via OpenAI";
  }

  return {
    version: HYBRID_AI_ENGINE_VERSION,
    selected: settings.aiProvider,
    effective,
    fallbackUsed,
    openaiConfigured,
    selfAvailable: true,
    ready,
    messageAr,
    messageEn,
  };
}