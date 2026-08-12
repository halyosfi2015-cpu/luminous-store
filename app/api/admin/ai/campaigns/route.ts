import { NextResponse } from 'next/server'
import { requireAdmin } from '@/src/lib/admin-auth'
import { createAdminClient } from '@/src/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled'

interface CampaignRow {
  id: string
  slug: string
  name: Record<string, string>
  description?: Record<string, string>
  type: string
  status: CampaignStatus
  starts_at: string | null
  ends_at: string | null
  budget: number
  spent: number
  created_at: string
  updated_at: string
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin

  const url = new URL(request.url)
  const statusFilter = url.searchParams.get('status') as string | null
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '50')))

  let campaigns: CampaignRow[] = []
  let isSupabase = false

  try {
    const supabase = createAdminClient()
    let query = supabase
      .from('campaigns')
      .select('id, slug, name, description, type, status, starts_at, ends_at, budget, spent, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query

    if (!error && data) {
      campaigns = data as CampaignRow[]
      isSupabase = true
    }
  } catch {
    // Supabase not configured — return empty
  }

  const ids = campaigns.map((c) => c.id)

  // Compute real delivery stats from campaign_messages (when campaigns exist).
  const statsByCampaign = new Map<string, { reach: number; engagement: number; conversions: number }>()
  if (isSupabase && ids.length > 0) {
    try {
      const supabase = createAdminClient()
      const { data: messages, error } = await supabase
        .from('campaign_messages')
        .select('campaign_id, customer_id, status')
        .in('campaign_id', ids)

      if (!error && messages) {
        for (const m of messages as Array<{ campaign_id: string; customer_id: string | null; status: string }>) {
          const cur = statsByCampaign.get(m.campaign_id) ?? { reach: 0, engagement: 0, conversions: 0 }
          if (m.status !== 'failed' && m.status !== 'bounced' && m.status !== 'pending') {
            cur.reach++
          }
          if (['delivered', 'opened', 'clicked'].includes(m.status)) cur.engagement++
          if (['opened', 'clicked'].includes(m.status)) cur.conversions++
          statsByCampaign.set(m.campaign_id, cur)
        }
      }
    } catch {
      // stats are best-effort
    }
  }

  const result = campaigns.map((c) => {
    const stats = statsByCampaign.get(c.id)
    return {
      id: c.id,
      slug: c.slug,
      name: c.name?.ar ?? c.name?.en ?? c.slug,
      nameAr: c.name?.ar ?? c.name?.en ?? c.slug,
      description: c.description?.en ?? c.description?.ar,
      type: c.type,
      status: c.status as CampaignStatus,
      startAt: c.starts_at,
      endAt: c.ends_at,
      budget: Number(c.budget ?? 0),
      spent: Number(c.spent ?? 0),
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      stats: {
        reach: stats?.reach ?? 0,
        engagement: stats?.engagement ?? 0,
        conversions: stats?.conversions ?? 0,
        revenue: 0,
      },
    }
  })

  return NextResponse.json({
    campaigns: result,
    total: result.length,
    isSupabase,
  })
}
