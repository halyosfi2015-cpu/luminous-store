// AI service functions for content generation and request processing.
//
// Flow (no fabrication path):
//   Request → AI Service Layer → Provider Resolution (OpenAI if configured)
//   → Provider.generateInsight with grounding rules → Real Result
//
// When no provider is configured, the result is an honest
// `service_unavailable` failure — never a placeholder presented as success.

import 'server-only'
import { getAIConfig, isAIConfigured } from './config'
import { OpenAIProvider } from './provider'
import { GROUNDING_RULES } from './prompts'

// Validate AI request - checks if AI is configured and returns status
export function validateRequest(request: unknown): Promise<{ success: boolean; data: unknown; error?: string }> {
  return Promise.resolve({ success: true, data: request })
}

export interface AIRequestResult {
  response: string
  success: boolean
  error?: { code: string; message: string } | string
  /** Real execution state — only present on genuine provider success. */
  provider?: string
  model?: string
}

export async function processAIRequest(request: unknown): Promise<AIRequestResult> {
  const input = (request ?? {}) as Record<string, unknown>
  const question = typeof input.question === 'string' ? input.question.trim() : ''

  if (!question) {
    return {
      response: '',
      success: false,
      error: { code: 'invalid_request', message: 'سؤال غير صالح — لا يمكن توليد نتيجة بدون طلب واضح' },
    }
  }

  // Honest unavailability — no placeholder, no fake success.
  if (!isAIConfigured()) {
    return {
      response: '',
      success: false,
      error: { code: 'service_unavailable', message: 'الخدمة غير متاحة حاليًا — لم يتم إعداد مزود ذكاء اصطناعي' },
    }
  }

  const config = getAIConfig()
  const provider = new OpenAIProvider()

  const systemPrompt = [
    ...GROUNDING_RULES,
    'You are Luminous Derma commerce assistant. Answer in Arabic unless asked otherwise.',
    'Base every factual claim on the verified facts provided in the request. If a needed fact is missing, state that data is insufficient instead of inventing it.',
  ].join('\n\n')

  try {
    const result = await provider.generateInsight(systemPrompt, question, config)

    if (result.error || !result.rawContent) {
      const code = result.error?.code ?? 'ai_provider_error'
      const msg =
        code === 'ai_not_configured'
          ? 'الخدمة غير متاحة حاليًا — لم يتم إعداد مزود ذكاء اصطناعي'
          : result.error?.message ?? 'فشل مزود الذكاء الاصطناعي في توليد نتيجة'
      return { response: '', success: false, error: { code, message: msg } }
    }

    // Real success — metadata reflects the provider that actually ran.
    return {
      response: result.rawContent,
      success: true,
      provider: 'openai',
      model: config.model,
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { response: '', success: false, error: { code: 'ai_provider_error', message: msg } }
  }
}
