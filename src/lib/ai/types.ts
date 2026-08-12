import type { AnalyticsRange } from '@/src/lib/analytics/types'

export type AIScope = 'commerce' | 'customer' | 'product'

export type AIProviderName = 'openai' | 'openai-compatible'

export type AIErrorCode =
  | 'unauthorized'
  | 'invalid_request'
  | 'ai_not_configured'
  | 'insufficient_data'
  | 'ai_timeout'
  | 'ai_provider_error'
  | 'ai_invalid_response'
  | 'internal_error'

export interface AIProviderConfig {
  provider: AIProviderName
  apiKey: string | null
  model: string
  baseURL: string | null
  timeoutMs: number
  maxTokens: number
  temperature: number
  systemPromptVersion: string
  contextVersion: string
}

export interface AIProviderMetrics {
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  latencyMs: number
  model: string
}

export interface AIProviderError {
  code: AIErrorCode
  message: string
  provider?: string
  statusCode?: number
}

export interface StructuredFact {
  statement: string
  source: string
  value: number | string | null
}

export interface StructuredInsight {
  title: string
  description: string
}

export interface StructuredRecommendation {
  action: string
  rationale: string
}

export interface DataSourceRef {
  name: string
  label: string
}

export type AIConfidence = 'high' | 'medium' | 'low'

export interface StructuredAIResponse {
  answer: string
  summary: string
  facts: StructuredFact[]
  insights: StructuredInsight[]
  recommendations: StructuredRecommendation[]
  confidence: AIConfidence
  dataSources: DataSourceRef[]
  contextRange: string
  contextVersion: string
  generatedAt: string
  promptVersion: string
  model: string
  metrics: AIProviderMetrics
}

export interface AIRequestInput {
  question: string
  scope: AIScope
  range: AnalyticsRange
  customerId?: string | null
  productId?: string | null
}

export interface AIAskResult {
  success: boolean
  response: StructuredAIResponse | null
  error: { code: AIErrorCode; message: string } | null
}
