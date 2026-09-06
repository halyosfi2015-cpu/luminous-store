import { NextRequest, NextResponse } from 'next/server'
import { getAIConfig, isAIConfigured } from '@/src/lib/ai/config'
import { OpenAIProvider } from '@/src/lib/ai/provider'
import { buildAssistantContext, serializeContextForPrompt, getSystemPrompt, GROUNDING_INSTRUCTIONS, extractGroundedFacts } from '@/src/lib/assistant/context-builder'
import { classifyIntent, ClassifiedIntent } from '@/src/lib/assistant/intent-classifier'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RATE_LIMIT_MAX = 15
const RATE_LIMIT_WINDOW_MS = 60_000
const inMemoryRateLimit = new Map<string, { count: number; resetAt: number }>()

function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  const ua = request.headers.get('user-agent') ?? 'unknown'
  return `${ip}:${ua.slice(0, 50)}`
}

function checkRateLimit(clientId: string): { allowed: boolean; resetInMs: number } {
  const now = Date.now()
  const existing = inMemoryRateLimit.get(clientId)
  if (existing && existing.resetAt > now) {
    if (existing.count >= RATE_LIMIT_MAX) {
      return { allowed: false, resetInMs: existing.resetAt - now }
    }
    existing.count++
    return { allowed: true, resetInMs: existing.resetAt - now }
  }
  inMemoryRateLimit.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
  return { allowed: true, resetInMs: RATE_LIMIT_WINDOW_MS }
}

export async function POST(request: NextRequest) {
  const clientId = getClientId(request)
  const rateCheck = checkRateLimit(clientId)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { 
        error: { code: 'rate_limited', message: 'تم تجاوز حد الطلبات. يرجى الانتظار قبل المحاولة مرة أخرى.' },
        resetInMs: rateCheck.resetInMs
      },
      { status: 429 }
    )
  }

  let body: { message: string; conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>; options?: { pathname?: string; cartItemCount?: number; cartValue?: number; userAgent?: string; customerId?: string } } = { message: '' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_request', message: 'طلب غير صالح - JSON غير صحيح' } },
      { status: 400 }
    )
  }

  const { message, conversationHistory = [], options = {} } = body
  const userMessage = typeof message === 'string' ? message.trim() : ''

  if (!userMessage) {
    return NextResponse.json(
      { error: { code: 'invalid_request', message: 'رسالة فارغة - يرجى إدخال سؤالك' } },
      { status: 400 }
    )
  }

  if (userMessage.length > 2000) {
    return NextResponse.json(
      { error: { code: 'invalid_request', message: 'الرسالة طويلة جداً - الحد الأقصى 2000 حرف' } },
      { status: 400 }
    )
  }

  const intent = classifyIntent(userMessage)
  
  if (intent.needsClarification && intent.clarificationQuestion) {
    return NextResponse.json({
      response: intent.clarificationQuestion,
      intent: intent.intent,
      needsClarification: true,
      confidence: intent.confidence,
      language: intent.intent === 'unclear' ? 'ar' : (userMessage.match(/[\u0600-\u06FF]/) ? 'ar' : 'en')
    })
  }

  const context = await buildAssistantContext(userMessage, {
    pathname: options.pathname,
    cartItemCount: options.cartItemCount,
    cartValue: options.cartValue,
    userAgent: options.userAgent,
    customerId: options.customerId
  })

  const groundedFacts = extractGroundedFacts(context)
  const hasGroundedData = groundedFacts.length > 0

  if (!isAIConfigured()) {
    return handleNoAIConfigured(context, intent, groundedFacts)
  }

  try {
    const config = getAIConfig()
    const provider = new OpenAIProvider()
    
    const systemPrompt = getSystemPrompt(context.language)
    const groundedPrompt = GROUNDING_INSTRUCTIONS
      .replace('{context}', serializeContextForPrompt(context))
      .replace('{language}', context.language === 'ar' ? 'العربية' : 'English')

    const fullSystemPrompt = `${systemPrompt}\n\n${groundedPrompt}`

    const conversationMessages = [
      { role: 'system' as const, content: fullSystemPrompt },
      ...conversationHistory.slice(-6).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: userMessage }
    ]

    const result = await provider.generateInsight(fullSystemPrompt, userMessage, config)

    if (result.error || !result.rawContent) {
      const errorCode = result.error?.code ?? 'ai_provider_error'
      const errorMessage = errorCode === 'ai_not_configured'
        ? 'خدمة الذكاء الاصطناعي غير متاحة حالياً'
        : result.error?.message ?? 'فشل في توليد الرد'
      
      return handleAIFailure(context, intent, groundedFacts, errorCode, errorMessage)
    }

    return NextResponse.json({
      response: result.rawContent,
      intent: intent.intent,
      confidence: intent.confidence,
      language: context.language,
      groundedFactsCount: groundedFacts.length,
      provider: 'openai',
      model: config.model,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Assistant API] Unexpected error:', error)
    return handleAIFailure(context, intent, groundedFacts, 'internal_error', 'خطأ داخلي في الخادم')
  }
}

function handleNoAIConfigured(context: Awaited<ReturnType<typeof buildAssistantContext>>, intent: ClassifiedIntent, facts: ReturnType<typeof extractGroundedFacts>) {
  const lang = context.language
  const fallbackResponse = lang === 'ar'
    ? 'خدمة المساعد الذكي غير متاحة حالياً. إليك ما يمكنني مساعدتك به بناءً على بيانات المتجر الحالية:'
    : 'AI assistant service is currently unavailable. Here\'s what I can help with based on current store data:'

  const dataSummary = buildFallbackSummary(context, intent, facts, lang)
  
  return NextResponse.json({
    response: `${fallbackResponse}\n\n${dataSummary}`,
    intent: intent.intent,
    confidence: intent.confidence,
    language: context.language,
    groundedFactsCount: facts.length,
    provider: 'fallback',
    fallback: true,
    timestamp: new Date().toISOString()
  })
}

function handleAIFailure(context: Awaited<ReturnType<typeof buildAssistantContext>>, intent: ClassifiedIntent, facts: ReturnType<typeof extractGroundedFacts>, errorCode: string, errorMessage: string) {
  const lang = context.language
  const fallbackResponse = lang === 'ar'
    ? 'عذراً، حدث خطأ في خدمة الذكاء الاصطناعي. إليك معلومات مفيدة من بيانات المتجر:'
    : 'Sorry, AI service encountered an error. Here\'s helpful information from store data:'

  const dataSummary = buildFallbackSummary(context, intent, facts, lang)
  
  return NextResponse.json({
    response: `${fallbackResponse}\n\n${dataSummary}`,
    intent: intent.intent,
    confidence: intent.confidence,
    language: context.language,
    groundedFactsCount: facts.length,
    provider: 'fallback',
    fallback: true,
    error: { code: errorCode, message: errorMessage },
    timestamp: new Date().toISOString()
  })
}

function buildFallbackSummary(
  context: Awaited<ReturnType<typeof buildAssistantContext>>,
  intent: ClassifiedIntent,
  facts: ReturnType<typeof extractGroundedFacts>,
  lang: 'ar' | 'en'
): string {
  const lines: string[] = []
  
  if (context.products.length > 0) {
    lines.push(lang === 'ar' ? '📦 **المنتجات ذات الصلة:**' : '📦 **Related Products:**')
    for (const p of context.products.slice(0, 5)) {
      const name = lang === 'ar' ? p.nameAr : p.nameEn
      lines.push(`• ${name} - ${p.price} ${p.currency} ${p.inStock ? '✅ متوفر' : '❌ غير متوفر'}`)
    }
    lines.push('')
  }

  if (context.routines.length > 0) {
    lines.push(lang === 'ar' ? '📋 **الروتينات المتاحة:**' : '📋 **Available Routines:**')
    for (const r of context.routines.slice(0, 3)) {
      const name = lang === 'ar' ? r.nameAr : r.nameEn
      lines.push(`• ${name} (${r.typeAr ?? r.type}) - ${r.savingsPercent}% توفير`)
    }
    lines.push('')
  }

  if (context.bundles.length > 0) {
    lines.push(lang === 'ar' ? '🎁 **الباقات المتاحة:**' : '🎁 **Available Bundles:**')
    for (const b of context.bundles.slice(0, 3)) {
      const name = lang === 'ar' ? b.nameAr : b.nameEn
      lines.push(`• ${name} - ${b.bundlePrice} ${context.products[0]?.currency ?? 'YER'} (خصم ${b.discountPercent}%)`)
    }
    lines.push('')
  }

  if (context.shipping.governorates.length > 0 && intent.intent === 'shipping_info') {
    lines.push(lang === 'ar' ? '🚚 **معلومات الشحن:**' : '🚚 **Shipping Info:**')
    for (const g of context.shipping.governorates.slice(0, 5)) {
      if (g.enabled) {
        const name = lang === 'ar' ? g.name : g.nameEn
        lines.push(`• ${name}: ${g.fee} YER`)
      }
    }
    lines.push('')
  }

  if (context.campaigns.length > 0) {
    lines.push(lang === 'ar' ? '🎯 **العروض الحالية:**' : '🎯 **Current Campaigns:**')
    for (const c of context.campaigns.slice(0, 3)) {
      const name = lang === 'ar' ? c.nameAr : c.nameEn
      lines.push(`• ${name}`)
    }
    lines.push('')
  }

  if (context.recommendations.length > 0) {
    lines.push(lang === 'ar' ? '✨ **منتجات رائجة:**' : '✨ **Trending Products:**')
    for (const r of context.recommendations.slice(0, 3)) {
      const name = lang === 'ar' ? r.nameAr : r.nameEn
      lines.push(`• ${name} - ${r.price} ${r.currency}`)
    }
    lines.push('')
  }

  if (lines.length === 0) {
    return lang === 'ar'
      ? 'لا تتوفر بيانات محددة لطلبك حالياً. يمكنك تصفح المتجر مباشرة أو طرح سؤال آخر.'
      : 'No specific data available for your request. You can browse the store directly or ask another question.'
  }

  return lines.join('\n')
}

export async function GET(request: NextRequest) {
  const config = getAIConfig()
  return NextResponse.json({
    configured: isAIConfigured(),
    provider: config.provider,
    model: config.model,
    baseURL: config.baseURL,
    features: {
      productSearch: true,
      productDetails: true,
      productComparison: true,
      routineGuidance: true,
      bundleDiscovery: true,
      shippingInfo: true,
      campaignInfo: true,
      recommendations: true,
      storeHelp: true,
      arabicSupport: true,
      rtlSupport: true
    }
  })
}