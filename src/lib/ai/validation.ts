import 'server-only'
import { z } from 'zod'
import type {
  StructuredAIResponse,
  AIProviderMetrics,
  AIConfidence,
  StructuredFact,
  StructuredInsight,
  StructuredRecommendation,
  DataSourceRef,
} from './types'

const confidenceSchema = z.enum(['high', 'medium', 'low'])

const factSchema = z.object({
  statement: z.string(),
  source: z.string(),
  value: z.unknown().nullable(),
})

const insightSchema = z.object({
  title: z.string(),
  description: z.string(),
})

const recommendationSchema = z.object({
  action: z.string(),
  rationale: z.string(),
})

const dataSourceSchema = z.object({
  name: z.string(),
  label: z.string(),
})

const structuredResponseSchema = z.object({
  answer: z.string(),
  summary: z.string(),
  facts: z.array(factSchema),
  insights: z.array(insightSchema),
  recommendations: z.array(recommendationSchema),
  confidence: confidenceSchema,
  dataSources: z.array(dataSourceSchema),
  contextRange: z.string(),
})

export interface ValidationResult {
  response: StructuredAIResponse | null
  error: { code: 'ai_invalid_response'; message: string } | null
}

interface EnrichParams {
  metrics: AIProviderMetrics
  promptVersion: string
  contextVersion: string
}

export function validateAIResponse(raw: string, enrich: EnrichParams): ValidationResult {
  if (!raw || typeof raw !== 'string') {
    return {
      response: null,
      error: { code: 'ai_invalid_response', message: 'Empty response from provider' },
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      response: null,
      error: { code: 'ai_invalid_response', message: 'Response is not valid JSON' },
    }
  }

  const result = structuredResponseSchema.safeParse(parsed)

  if (!result.success) {
    return {
      response: null,
      error: {
        code: 'ai_invalid_response',
        message: `Response schema validation failed: ${result.error.issues.map((i) => i.message).join('; ')}`,
      },
    }
  }

  const data = result.data
  const response: StructuredAIResponse = {
    answer: data.answer,
    summary: data.summary,
    facts: data.facts as StructuredFact[],
    insights: data.insights as StructuredInsight[],
    recommendations: data.recommendations as StructuredRecommendation[],
    confidence: data.confidence as AIConfidence,
    dataSources: data.dataSources as DataSourceRef[],
    contextRange: data.contextRange,
    contextVersion: enrich.contextVersion,
    generatedAt: new Date().toISOString(),
    promptVersion: enrich.promptVersion,
    model: enrich.metrics.model,
    metrics: enrich.metrics,
  }

  if (response.answer.trim().toLowerCase().includes('insufficient data')) {
    response.confidence = 'low'
  }

  return { response, error: null }
}
