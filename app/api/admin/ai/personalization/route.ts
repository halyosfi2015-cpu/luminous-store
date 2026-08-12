import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/src/lib/admin-auth'
import {
  getPersonalizationRules,
  getPersonalizationRule,
  createPersonalizationRule,
  updatePersonalizationRule,
  deletePersonalizationRule,
  type PersonalizationRule,
} from '@/src/lib/analytics/personalization'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin

  const url = new URL(request.url)
  const id = url.searchParams.get('id')

  if (id) {
    const rule = await getPersonalizationRule(id)
    if (!rule) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json(rule)
  }

  const rules = await getPersonalizationRules()
  return NextResponse.json(rules)
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin

  try {
    const body = await request.json()
    const rule = await createPersonalizationRule(body as Omit<PersonalizationRule, 'id' | 'createdAt' | 'updatedAt'>)
    revalidatePath('/admin/ai/personalization')
    return NextResponse.json(rule, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id parameter required' }, { status: 400 })

  try {
    const body = await request.json()
    const rule = await updatePersonalizationRule(id, body as Partial<PersonalizationRule>)
    if (!rule) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    revalidatePath('/admin/ai/personalization')
    return NextResponse.json(rule)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id parameter required' }, { status: 400 })

  const ok = await deletePersonalizationRule(id)
  if (!ok) return NextResponse.json({ error: 'failed_to_delete' }, { status: 500 })

  revalidatePath('/admin/ai/personalization')
  return NextResponse.json({ success: true })
}
