import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/src/lib/admin-auth'
import { processAIRequest, validateRequest } from '@/src/lib/ai/service'
import { getAIConfig, isAIConfigured } from '@/src/lib/ai/config'
import { createAdminClient } from '@/src/lib/supabase'
import { isUuid } from '@/src/lib/analytics/events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 60_000
const inMemoryRateLimit = new Map<string, { count: number; resetAt: number }>()

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin

  const config = getAIConfig()
  return NextResponse.json({
    configured: isAIConfigured(),
    provider: config.provider,
    model: config.model,
    baseURL: config.baseURL,
  })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin

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
      { error: validation.error },
      { status: 400 },
    )
  }

  const input = validation.data as Record<string, unknown>

  if (input.scope === 'customer' && input.customerId) {
    const supabase = createAdminClient()
    const { data: exists } = await supabase
      .from('customers')
      .select('id')
      .eq('id', input.customerId)
      .maybeSingle()
    if (!exists) {
      return NextResponse.json(
        { error: { code: 'invalid_request', message: 'Customer not found' } },
        { status: 404 },
      )
    }
  }

  if (input.scope === 'product' && input.productId) {
    if (!isUuid(input.productId)) {
      return NextResponse.json(
        { error: { code: 'invalid_request', message: 'Invalid product ID' } },
        { status: 400 },
      )
    }
    const supabase = createAdminClient()
    const { data: exists } = await supabase
      .from('products')
      .select('id')
      .eq('id', input.productId)
      .maybeSingle()
    if (!exists) {
      return NextResponse.json(
        { error: { code: 'invalid_request', message: 'Product not found' } },
        { status: 404 },
      )
    }
  }

  try {
    const result = await processAIRequest(input)
    if (result.success && result.response) {
      return NextResponse.json({
        success: true,
        response: result.response,
        provider: result.provider,
        model: result.model,
      })
    }
    // Honest failure — real error code + message, mapped to a truthful status.
    const err = typeof result.error === 'string'
      ? { code: 'ai_provider_error', message: result.error }
      : result.error ?? { code: 'internal_error', message: 'Unknown error' }
    return NextResponse.json(
      { error: err },
      { status: errorCodeToHttpStatus(err.code) },
    )
  } catch (err) {
    const msg = (err as Error).message
    console.error('[AI API] Unexpected error:', msg)
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}

function checkRateLimit(adminId: string): { allowed: boolean; resetInMs: number } {
  const now = Date.now()
  const existing = inMemoryRateLimit.get(adminId)
  if (existing && existing.resetAt > now) {
    if (existing.count >= RATE_LIMIT_MAX) {
      return { allowed: false, resetInMs: existing.resetAt - now }
    }
    existing.count++
    return { allowed: true, resetInMs: existing.resetAt - now }
  }
  inMemoryRateLimit.set(adminId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
  return { allowed: true, resetInMs: RATE_LIMIT_WINDOW_MS }
}

function errorCodeToHttpStatus(code: string): number {
  switch (code) {
    case 'unauthorized':
      return 401
    case 'invalid_request':
      return 400
    case 'service_unavailable':
    case 'ai_not_configured':
      return 503
    case 'insufficient_data':
      return 422
    case 'ai_timeout':
      return 504
    case 'ai_provider_error':
      return 502
    case 'ai_invalid_response':
      return 522
    case 'not_found':
      return 404
    case 'rate_limited':
      return 429
    default:
      return 500
  }
}
