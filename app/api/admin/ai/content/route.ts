import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/src/lib/admin-auth'
import { createAdminClient } from '@/src/lib/supabase'
import { getAIConfig, isAIConfigured } from '@/src/lib/ai/config'
import { processAIRequest, validateRequest } from '@/src/lib/ai/service'
import { getContentGenerationPrompt } from '@/src/lib/ai/prompts'
import { isUuid } from '@/src/lib/analytics/events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin

  const config = getAIConfig()
  return NextResponse.json({
    configured: isAIConfigured(),
    provider: config.provider,
    model: config.model,
  })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin

  const config = getAIConfig()
  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: { code: 'ai_not_configured', message: 'AI service is not configured' } },
      { status: 503 },
    )
  }

  const rateCheck = checkRateLimit(admin.id)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: { code: 'rate_limited', message: 'Too many requests, please wait.' }, resetInMs: rateCheck.resetInMs },
      { status: 429 },
    )
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_request', message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  const validation = await validateRequest(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error ?? 'Invalid request' },
      { status: 400 },
    )
  }

  const input = validation.data as Record<string, unknown>

  // Handle content generation scope
  if (input.scope === 'content' && input.productId) {
    if (!isUuid(input.productId)) {
      return NextResponse.json(
        { error: { code: 'invalid_request', message: 'Invalid product ID' } },
        { status: 400 },
      )
    }
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('id, name_ar, name_en, slug')
      .eq('id', input.productId)
      .maybeSingle()
    if (error || !data) {
      return NextResponse.json(
        { error: { code: 'invalid_request', message: 'Product not found' } },
        { status: 404 },
      )
    }
    const exists = data as { id: string; name_ar?: string; name_en?: string; slug?: string }

    // Determine content type from input or default to description
    const contentType = (input.contentType ?? 'description') as
      | 'description'
      | 'title'
      | 'tag'
      | 'feature'

    // Build the prompt with the specific content type
    const promptConfig = getContentGenerationPrompt(
      config,
      contentType,
    )

    // Prepare the question based on content type and product data
    const productName = exists.name_ar || exists.name_en || exists.slug
    let question: string
    switch (contentType) {
      case 'description':
        question = `Generate a compelling product description in Arabic and English for "${productName}". Highlight key benefits, ingredients, and usage. Make it persuasive and commercially appealing. Use the product context data if available.`
        break
      case 'title':
        question = `Generate a catchy product title (max 60 characters) in Arabic and English for "${productName}". Make it descriptive and include key benefits.`
        break
      case 'tag':
        question = `Generate 3-5 product tags/keywords in Arabic and English for "${productName}". Capture the main benefits and category.`
        break
      case 'feature':
        question = `Generate 3-5 product features in Arabic and English for "${productName}". Highlight technical and user benefits.`
        break
      default:
        return NextResponse.json(
          { error: { code: 'invalid_request', message: `Unsupported contentType: ${String(contentType)}` } },
          { status: 400 },
        )
    }

    try {
      const result = await processAIRequest({
        ...input,
        question,
        scope: 'content' as never,
        productId: input.productId,
      })

      if (result.success && result.response) {
        return NextResponse.json({
          success: true,
          content: result.response,
          summary: '',
          confidence: null,
          facts: [],
          insights: [],
          recommendations: [],
          metadata: {
            contentType,
            productId: input.productId,
            generatedAt: new Date().toISOString(),
            provider: result.provider ?? 'openai',
            model: result.model ?? config.model,
          },
        })
      }

      // Honest failure — surface the real provider/service state.
      const err = typeof result.error === 'string'
        ? { code: 'ai_provider_error', message: result.error }
        : result.error ?? { code: 'internal_error', message: 'Unknown error' }
      const status = err.code === 'service_unavailable' || err.code === 'ai_not_configured' ? 503 : 500
      return NextResponse.json({ error: err }, { status })
    } catch (err) {
      const msg = (err as Error).message
      console.error('[AI Content API] Unexpected error:', msg)
      return NextResponse.json(
        { error: { code: 'internal_error', message: 'Internal server error' } },
        { status: 500 },
      )
    }
  }

  // Fallback for other scopes
  return NextResponse.json(
    { error: { code: 'invalid_request', message: 'Content scope required for content generation' } },
    { status: 400 },
  )
}

function checkRateLimit(adminId: string): { allowed: boolean; resetInMs: number } {
  const now = Date.now()
  const existing = inMemoryRateLimit.get(adminId)
  if (existing && existing.resetAt > now) {
    if (existing.count >= 20) {
      return { allowed: false, resetInMs: existing.resetAt - now }
    }
    existing.count++
    return { allowed: true, resetInMs: existing.resetAt - now }
  }
  inMemoryRateLimit.set(adminId, { count: 1, resetAt: now + 60_000 })
  return { allowed: true, resetInMs: 60_000 }
}

const inMemoryRateLimit = new Map<string, { count: number; resetAt: number }>()