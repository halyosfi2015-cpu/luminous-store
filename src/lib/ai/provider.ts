import 'server-only'
import type { AIProviderConfig, AIProviderMetrics, AIProviderError } from './types'

export interface RawAIResult {
  rawContent: string | null
  error: AIProviderError | null
  metrics: AIProviderMetrics | null
}

export interface AIProvider {
  generateInsight(
    systemPrompt: string,
    userMessage: string,
    config: AIProviderConfig,
  ): Promise<RawAIResult>
}

const PROVIDER_TIMEOUT_ERROR = 'Request timed out'
const PROVIDER_PARSE_ERROR = 'Failed to parse provider response'
const PROVIDER_NO_CONTENT_ERROR = 'Provider returned no content'

export class OpenAIProvider implements AIProvider {
  async generateInsight(
    systemPrompt: string,
    userMessage: string,
    config: AIProviderConfig,
  ): Promise<RawAIResult> {
    const startTime = Date.now()

    if (!config.apiKey) {
      return {
        rawContent: null,
        error: {
          code: 'ai_not_configured',
          message: 'AI provider API key is not configured',
        },
        metrics: null,
      }
    }

    const baseURL = config.baseURL ?? 'https://api.openai.com/v1'
    const url = `${baseURL}/chat/completions`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs)

    let rawResponse: Response
    try {
      rawResponse = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          max_tokens: config.maxTokens,
          temperature: config.temperature,
        }),
        signal: controller.signal,
      })
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError'
      return {
        rawContent: null,
        error: {
          code: aborted ? 'ai_timeout' : 'ai_provider_error',
          message: aborted ? PROVIDER_TIMEOUT_ERROR : 'Provider request failed',
          provider: 'openai',
          statusCode: aborted ? 504 : 502,
        },
        metrics: buildMetrics(startTime, config),
      }
    } finally {
      clearTimeout(timeoutId)
    }

    const latencyMs = Date.now() - startTime

    if (!rawResponse.ok) {
      const errBody = await safeParseError(rawResponse)
      return {
        rawContent: null,
        error: {
          code: 'ai_provider_error',
          message: errBody,
          provider: 'openai',
          statusCode: rawResponse.status,
        },
        metrics: buildMetrics(startTime, config, latencyMs),
      }
    }

    const payload = await rawResponse.json().catch(() => null)
    if (!payload || typeof payload !== 'object') {
      return {
        rawContent: null,
        error: {
          code: 'ai_invalid_response',
          message: PROVIDER_PARSE_ERROR,
          provider: 'openai',
          statusCode: 522,
        },
                 metrics: buildMetrics(startTime, config, latencyMs),
      }
    }

    const choices = (payload as { choices?: Array<{ message?: { content?: string } }> }).choices
    const rawContent = choices?.[0]?.message?.content
    if (!rawContent || typeof rawContent !== 'string') {
      return {
        rawContent: null,
        error: {
          code: 'ai_invalid_response',
          message: PROVIDER_NO_CONTENT_ERROR,
          provider: 'openai',
          statusCode: 522,
        },
        metrics: buildMetrics(startTime, config, latencyMs),
      }
    }

    const usage = payload as { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }

    return {
      rawContent,
      error: null,
      metrics: buildMetrics(startTime, config, latencyMs, usage.usage),
    }
  }
}

export class NullAIProvider implements AIProvider {
  async generateInsight(
    _systemPrompt: string,
    _userMessage: string,
    _config: AIProviderConfig,
  ): Promise<RawAIResult> {
    return {
      rawContent: null,
      error: {
        code: 'ai_not_configured',
        message: 'AI service is not configured',
      },
      metrics: null,
    }
  }
}

function buildMetrics(
  startTime: number,
  config: AIProviderConfig,
  latencyOverride?: number,
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number },
): AIProviderMetrics {
  return {
    inputTokens: usage?.prompt_tokens ?? null,
    outputTokens: usage?.completion_tokens ?? null,
    totalTokens: usage?.total_tokens ?? null,
    latencyMs: latencyOverride ?? Date.now() - startTime,
    model: config.model,
  }
}

async function safeParseError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    const err = (body as { error?: { message?: string } })?.error
    return err?.message ?? `Provider error ${res.status}`
  } catch {
    return `Provider error ${res.status}`
  }
}

export function createAIProvider(): AIProvider {
  return new OpenAIProvider()
}
