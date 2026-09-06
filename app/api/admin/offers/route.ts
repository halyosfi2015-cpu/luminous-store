import { NextRequest, NextResponse } from 'next/server'
import {
  supabaseGetOffers,
  supabaseSaveOffers,
  supabaseDeleteOffers,
} from '@/src/lib/admin-supabase'
import { requireAdmin } from '@/src/lib/admin-auth'
import { campaignToRows } from '@/src/engine/offers-storage'
import { setSetting, getSetting } from '@/src/lib/site-settings'
import { revalidatePath } from 'next/cache'
import type { MonthCampaign, EngineConfig } from '@/src/engine/types'

/**
 * Admin Offers API — persistence ONLY.
 * No generation / scoring / business logic lives here.
 * Anon & unauthorized users are BLOCKED via requireAdmin (RLS + auth).
 */

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return unauthorized()

  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year')
  const month = searchParams.get('month')

  try {
    const rows = await supabaseGetOffers(
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    )
    return NextResponse.json({ rows })
  } catch (error) {
    console.error('Offers API GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return unauthorized()

  let body: { type?: string; config?: EngineConfig; year?: number; month?: number; campaign?: MonthCampaign }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Handle engine config save
  if (body.type === 'config' && body.config) {
    try {
      await setSetting('offers_engine_config', body.config)
      revalidatePath('/', 'layout')
      return NextResponse.json({ ok: true })
    } catch (error) {
      console.error('Offers config save error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  // Handle campaign save
  const { year, month, campaign } = body ?? {}
  if (year === undefined || month === undefined || !campaign) {
    return NextResponse.json({ error: 'year, month and campaign are required' }, { status: 400 })
  }

  try {
    const rows = campaignToRows(year, month, campaign)
    await supabaseSaveOffers(rows)
    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true, saved: rows.length })
  } catch (error) {
    console.error('Offers API POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return unauthorized()

  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year')
  const month = searchParams.get('month')

  try {
    await supabaseDeleteOffers(
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    )
    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Offers API DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
