import 'server-only'
import type { AIProviderConfig, AIProviderName } from './types'

export const AI_CONFIG_VERSION = 'phase_6_3_v1'
export const AI_CONTEXT_VERSION = 'commerce_context_v1'
export const COMMERCE_ANALYST_PROMPT_VERSION = 'COMMERCE_ANALYST_PROMPT_V1'
export const CUSTOMER_INTELLIGENCE_PROMPT_VERSION = 'CUSTOMER_INTELLIGENCE_PROMPT_V1'
export const PRODUCT_INTELLIGENCE_PROMPT_VERSION = 'PRODUCT_INTELLIGENCE_PROMPT_V1'

const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_TIMEOUT_MS = 25_000
const DEFAULT_MAX_TOKENS = 1500
const DEFAULT_TEMPERATURE = 0.7

export function getAIConfig(): AIProviderConfig {
  const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? null
  const rawProvider = process.env.AI_PROVIDER ?? 'openai'
  const provider = rawProvider === 'openai-compatible' ? 'openai-compatible' : 'openai'
  const baseURL = process.env.AI_BASE_URL ?? DEFAULT_BASE_URL
  const model = process.env.AI_MODEL ?? DEFAULT_MODEL
  const timeoutMs = parseNumber(process.env.AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS)
  const maxTokens = parseNumber(process.env.AI_MAX_TOKENS, DEFAULT_MAX_TOKENS)
  const temperature = parseNumber(process.env.AI_TEMPERATURE, DEFAULT_TEMPERATURE)

  const apiKeyTrimmed = apiKey ? apiKey.trim() : null
  const hasKey = Boolean(apiKeyTrimmed && apiKeyTrimmed.length > 0)

  return {
    provider,
    apiKey: hasKey ? apiKeyTrimmed : null,
    model,
    baseURL: baseURL || null,
    timeoutMs: Math.max(1_000, Math.min(timeoutMs, 60_000)),
    maxTokens: Math.max(100, Math.min(maxTokens, 4000)),
    temperature: Math.max(0, Math.min(temperature, 1)),
    systemPromptVersion: AI_CONFIG_VERSION,
    contextVersion: AI_CONTEXT_VERSION,
  }
}

export function isAIConfigured(): boolean {
  const config = getAIConfig()
  return config.apiKey !== null
}

export function getProviderName(config: AIProviderConfig): AIProviderName {
  return config.provider
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}
