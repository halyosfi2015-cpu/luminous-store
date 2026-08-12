import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/src/lib/admin-auth'
import { setSetting } from '@/src/lib/site-settings'
import { getAIEnabledSettings } from '@/src/lib/ai/service-settings'
import { getTrackingConfig, updateTrackingConfig } from '@/src/lib/analytics/event-tracker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_SETTINGS = {
  tracking: true,
  recommendations: true,
  personalization: true,
  purchaseIntent: true,
  aiInsights: true,
  confidenceThreshold: 0.7,
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin

  const [settings, tracking] = await Promise.all([
    getAIEnabledSettings(),
    getTrackingConfig(),
  ])

  return NextResponse.json({
    ...DEFAULT_SETTINGS,
    ...settings,
    tracking: tracking.enabled,
    confidenceThreshold: settings.confidenceThreshold ?? DEFAULT_SETTINGS.confidenceThreshold,
  })
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin

  let body: Partial<typeof DEFAULT_SETTINGS> = {}
  try {
    body = (await request.json()) as Partial<typeof DEFAULT_SETTINGS>
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (body.confidenceThreshold !== undefined) {
    const t = Number(body.confidenceThreshold)
    body.confidenceThreshold = Number.isFinite(t) ? Math.min(0.9, Math.max(0.1, t)) : 0.7
  }

  if (typeof body.tracking === 'boolean') {
    await updateTrackingConfig({ enabled: body.tracking })
  }

  const persisted = await updateAIEnabledSettings(body)

  if (!persisted) {
    return NextResponse.json({ error: 'failed_to_save' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

async function updateAIEnabledSettings(settings: Partial<typeof DEFAULT_SETTINGS>): Promise<boolean> {
  const keys: Array<[keyof typeof DEFAULT_SETTINGS, string]> = [
    ['recommendations', 'ai.recommendations.enabled'],
    ['personalization', 'ai.personalization.enabled'],
    ['purchaseIntent', 'ai.purchase_intent.enabled'],
    ['aiInsights', 'ai.insights.enabled'],
    ['confidenceThreshold', 'ai.confidence_threshold'],
  ]
  let ok = true
  for (const [field, key] of keys) {
    const value = settings[field]
    if (value === undefined) continue
    const factor = field === 'confidenceThreshold' ? Number(value) : Boolean(value)
    const saved = await setSetting(key, factor)
    if (!saved) ok = false
  }
  return ok
}

export async function POST(request: NextRequest) {
  return PUT(request)
}