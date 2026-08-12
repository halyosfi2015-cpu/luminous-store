import 'server-only'
import type {
  AIRequestInput,
  StructuredAIResponse,
  AIProviderError,
  AIProviderMetrics,
} from './types'
import { getAIConfig, isAIConfigured } from './config'
import { createAIProvider } from './provider'
import { validateAIResponse } from './validation'
import {
  getCommerceAnalystPrompt,
  getCustomerIntelligencePrompt,
  getProductIntelligencePrompt,
} from './prompts'
import {
  buildCommerceContext,
  buildCustomerContext,
  buildProductContext,
  serializeContextForPrompt,
} from './context-builder'
import type { AnalyticsRange } from '@/src/lib/analytics/types'

export interface AIServiceResult {
  success: boolean
  response: StructuredAIResponse | null
  error: { code: string; message: string } | null
  metrics: AIProviderMetrics | null
}

export async function processAIRequest(input: AIRequestInput): Promise<AIServiceResult> {
  const { question, scope, range, customerId, productId } = input

  if (!isAIConfigured()) {
    return {
      success: false,
      response: null,
      error: { code: 'ai_not_configured', message: 'AI service is not configured' },
      metrics: null,
    }
  }

  const config = getAIConfig()
  const provider = createAIProvider()
  const startTime = Date.now()

  let contextPromise
  let promptBundle

  if (scope === 'commerce') {
    contextPromise = buildCommerceContext(range)
    promptBundle = getCommerceAnalystPrompt(config)
  } else if (scope === 'customer') {
    if (!customerId) {
      return {
        success: false,
        response: null,
        error: { code: 'invalid_request', message: 'customerId is required for customer scope' },
        metrics: null,
      }
    }
    contextPromise = buildCustomerContext(customerId)
    promptBundle = getCustomerIntelligencePrompt(config)
  } else {
    if (!productId) {
      return {
        success: false,
        response: null,
        error: { code: 'invalid_request', message: 'productId is required for product scope' },
        metrics: null,
      }
    }
    contextPromise = buildProductContext(productId)
    promptBundle = getProductIntelligencePrompt(config)
  }

  let context: Awaited<ReturnType<typeof buildCommerceContext | typeof buildCustomerContext | typeof buildProductContext>> | null
  try {
    context = await contextPromise
  } catch (err) {
    const msg = (err as Error).message
    if (msg.includes('consent')) {
      return {
        success: false,
        response: null,
        error: { code: 'insufficient_data', message: `${scope} context could not be built` },
        metrics: null,
      }
    }
    return {
      success: false,
      response: null,
      error: { code: 'internal_error', message: 'Context builder failed' },
      metrics: null,
    }
  }

  if (scope === 'customer' && context === null) {
    return {
      success: false,
      response: null,
      error: { code: 'not_found', message: 'Customer not found' },
      metrics: null,
    }
  }

  if (scope === 'product' && context === null) {
    return {
      success: false,
      response: null,
      error: { code: 'not_found', message: 'Product not found' },
      metrics: null,
    }
  }

  const contextJson = context ? serializeContextForPrompt(context) : '{}'

  const userMessage = `CONTEXT (do not use any data outside this context):\n\n\`\`\`json\n${contextJson}\n\`\`\`\n\nQUESTION:\n${question}\n\nRESPONSE FORMAT: Strict JSON matching the schema in the system prompt. If the context does not contain sufficient data to answer the question, output the insufficient-data response.`

  const systemPrompt = promptBundle.system

  let rawResult
  try {
    rawResult = await provider.generateInsight(systemPrompt, userMessage, config)
  } catch (err) {
    return {
      success: false,
      response: null,
      error: providerErrorToApiError(err as AIProviderError),
      metrics: null,
    }
  }

  const latencyMs = Date.now() - startTime

  if (rawResult.error) {
    return {
      success: false,
      response: null,
      error: { code: rawResult.error.code, message: rawResult.error.message },
      metrics: rawResult.metrics ?? {
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        latencyMs,
        model: config.model,
      },
    }
  }

  if (!rawResult.rawContent) {
    return {
      success: false,
      response: null,
      error: { code: 'ai_invalid_response', message: 'No content returned from provider' },
      metrics: rawResult.metrics ?? {
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        latencyMs,
        model: config.model,
      },
    }
  }

  const metrics = rawResult.metrics ?? {
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    latencyMs,
    model: config.model,
  }

  const { response, error: validationError } = validateAIResponse(rawResult.rawContent, {
    metrics,
    promptVersion: promptBundle.promptVersion,
    contextVersion: promptBundle.contextVersion,
  })

  if (validationError) {
    return {
      success: false,
      response: null,
      error: { code: validationError.code, message: validationError.message },
      metrics,
    }
  }

  if (!response) {
    return {
      success: false,
      response: null,
      error: { code: 'ai_invalid_response', message: 'Failed to produce structured response' },
      metrics,
    }
  }

  return {
    success: true,
    response,
    error: null,
    metrics,
  }
}

function providerErrorToApiError(err: AIProviderError): { code: string; message: string } {
  return { code: err.code, message: err.message }
}

export function validateRequest(input: unknown): { valid: true; data: AIRequestInput } | { valid: false; error: { code: string; message: string } } {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: { code: 'invalid_request', message: 'Request body must be an object' } }
  }

  const obj = input as Record<string, unknown>

  const question = typeof obj.question === 'string' ? obj.question.trim() : ''
  if (question.length === 0) {
    return { valid: false, error: { code: 'invalid_request', message: 'Question is required' } }
  }
  if (question.length > 2000) {
    return { valid: false, error: { code: 'invalid_request', message: 'Question exceeds maximum length (2000 chars)' } }
  }

  const scope = obj.scope as string
  if (scope !== 'commerce' && scope !== 'customer' && scope !== 'product') {
    return { valid: false, error: { code: 'invalid_request', message: 'Invalid scope' } }
  }

  const range = obj.range as string
  const validRanges: AnalyticsRange[] = ['today', '7d', '30d', '90d']
  const normalizedRange: AnalyticsRange = validRanges.includes(range as AnalyticsRange) ? (range as AnalyticsRange) : '7d'

  const customerId = scope === 'customer' ? (typeof obj.customerId === 'string' ? obj.customerId.trim() : null) : null
  if (scope === 'customer' && !customerId) {
    return { valid: false, error: { code: 'invalid_request', message: 'customerId is required for customer scope' } }
  }

  const productId = scope === 'product' ? (typeof obj.productId === 'string' ? obj.productId.trim() : null) : null
  if (scope === 'product' && !productId) {
    return { valid: false, error: { code: 'invalid_request', message: 'productId is required for product scope' } }
  }

  return {
    valid: true,
    data: {
      question,
      scope,
      range: normalizedRange,
      customerId,
      productId,
    },
  }
}


