import { NextResponse } from 'next/server'
import { requireAdmin } from '@/src/lib/admin-auth'
import { createAdminClient } from '@/src/lib/supabase'
import { ANALYTICS_EVENT_TYPES } from '@/src/lib/analytics/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000
const RANGE_DAYS: Record<string, number> = {
  today: 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin

  const url = new URL(request.url)
  const range = (url.searchParams.get('range') ?? '30d') as string
  const days = RANGE_DAYS[range] ?? 30
  const since = new Date(Date.now() - days * DAY_MS).toISOString()

  const supabase = createAdminClient()

  const { data: events } = await supabase
    .from('customer_events')
    .select('event_type, entity_id, occurred_at')
    .in('event_type', [
      ANALYTICS_EVENT_TYPES.RECOMMENDATION_IMPRESSION,
      ANALYTICS_EVENT_TYPES.RECOMMENDATION_CLICK,
    ])
    .gte('occurred_at', since)

  const rows = (events ?? []) as Array<{
    event_type: string
    entity_id: string | null
    occurred_at: string
  }>

  const recMap = new Map<string, { impressions: number; clicks: number }>()
  const clickedIds = new Set<string>()
  for (const e of rows) {
    const id = e.entity_id
    if (!id) continue
    const cur = recMap.get(id) ?? { impressions: 0, clicks: 0 }
    if (e.event_type === ANALYTICS_EVENT_TYPES.RECOMMENDATION_IMPRESSION) cur.impressions++
    if (e.event_type === ANALYTICS_EVENT_TYPES.RECOMMENDATION_CLICK) {
      cur.clicks++
      clickedIds.add(id)
    }
    recMap.set(id, cur)
  }

  // Real conversion: how many clicked recommendation products were later purchased.
  let purchases = 0
  if (clickedIds.size > 0) {
    const { data: purchaseEvents } = await supabase
      .from('customer_events')
      .select('entity_id')
      .eq('event_type', ANALYTICS_EVENT_TYPES.PURCHASE_COMPLETED)
      .in('entity_id', Array.from(clickedIds))
      .gte('occurred_at', since)
    purchases = (purchaseEvents ?? []).length
  }

  const summary = {
    total_impressions: Array.from(recMap.values()).reduce((s, r) => s + r.impressions, 0),
    total_clicks: Array.from(recMap.values()).reduce((s, r) => s + r.clicks, 0),
    ctr: 0,
    conversion: 0,
  }
  summary.ctr = summary.total_impressions > 0 ? summary.total_clicks / summary.total_impressions : 0
  summary.conversion = summary.total_clicks > 0 ? purchases / summary.total_clicks : 0

  const types = {
    similar: { impressions: 0, clicks: 0 },
    complementary: { impressions: 0, clicks: 0 },
    personalized: { impressions: 0, clicks: 0 },
    trending: { impressions: 0, clicks: 0 },
    category_based: { impressions: 0, clicks: 0 },
    routine_based: { impressions: 0, clicks: 0 },
    bundle_based: { impressions: 0, clicks: 0 },
  }

  for (const [id, r] of recMap) {
    const type = id.split(':')[0] as keyof typeof types
    if (type && types[type]) {
      types[type].impressions += r.impressions
      types[type].clicks += r.clicks
    }
  }

  return NextResponse.json({
    range,
    summary,
    byType: Object.entries(types).map(([type, r]) => ({
      type,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.impressions > 0 ? r.clicks / r.impressions : 0,
    })),
  })
}
