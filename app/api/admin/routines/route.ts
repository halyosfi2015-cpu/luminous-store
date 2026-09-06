import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/src/lib/admin-auth'
import { createAdminClient } from '@/src/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { Routine, RoutineLevel, RoutineStep, RoutineStepTime } from '@/types/product'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Row = Record<string, unknown>

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback
}
function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback
}
/** Schema columns are snake_case; PostgREST returns them verbatim. */
function col(r: Row, ...names: string[]): unknown {
  for (const n of names) {
    if (r[n] !== undefined && r[n] !== null) return r[n]
  }
  return undefined
}

type StepRow = Row & {
  product_id?: unknown
  step_number?: unknown
  title_ar?: unknown
  title_en?: unknown
  description_ar?: unknown
  description_en?: unknown
  time_of_day?: unknown
}

function mapStep(s: StepRow): RoutineStep | null {
  const productId = asString(s.product_id)
  if (!productId) return null
  return {
    productId,
    time: (asString(s.time_of_day, "both") || "both") as RoutineStepTime,
    titleAr: asString(s.title_ar),
    titleEn: asString(s.title_en),
    descriptionAr: asString(s.description_ar),
    descriptionEn: asString(s.description_en),
  }
}

function mapRow(
  r: Row,
  productLegacyIds: string[],
  steps: RoutineStep[]
): Routine | null {
  const id = asString(r.id)
  if (!id) return null
  return {
    id,
    slug: asString(r.slug) || undefined,
    name: asString(r.name),
    nameAr: asString(r.name_ar),
    description: asString(r.description),
    descriptionAr: asString(r.description_ar),
    // Editor + storefront resolve against productSummaries via legacy ids.
    products: productLegacyIds,
    image: asString(r.image) || undefined,
    type: asString(r.routine_type, "daily"),
    typeAr: asString(r.routine_type_ar, "روتين يومي"),
    level: (asString(r.routine_level, "standard")) as RoutineLevel,
    active: r.is_active !== false,
    displayOrder: asNumber(r.display_order, 0),
    savingsPercent: asNumber(r.savings_percent, 0),
    duration: asString(r.duration, ""),
    durationEn: asString(r.duration_en, ""),
    forWhom: Array.isArray(r.for_whom) ? (r.for_whom as string[]) : [],
    forWhomEn: Array.isArray(r.for_whom_en) ? (r.for_whom_en as string[]) : [],
    expectedResults: Array.isArray(r.expected_results) ? (r.expected_results as string[]) : [],
    expectedResultsEn: Array.isArray(r.expected_results_en) ? (r.expected_results_en as string[]) : [],
    rating: asNumber(r.rating, 0),
    reviewCount: asNumber(r.review_count, 0),
    buyersCount: asNumber(r.buyers_count, 0),
    heroImage: asString(r.hero_image) || undefined,
    steps,
    whyChoseIt: asString(r.why_chose_it),
  }
}

async function fetchRoutinesMapped(supabase: any): Promise<Routine[]> {
  const [routinesRes, rpRes, rsRes] = await Promise.all([
    supabase.from('routines').select('*').order('display_order', { ascending: true }),
    supabase.from('routine_products').select('routine_id, product_id, products(legacy_id)'),
    supabase.from('routine_steps').select('*').order('step_number', { ascending: true }),
  ])
  if (routinesRes.error) throw routinesRes.error

  // Map DB product UUID -> legacy id (editor/storefront use legacy ids like "yq-754")
  const uuidToLegacy = new Map<string, string>()
  for (const rp of ((rpRes.data ?? []) as Row[])) {
    const rid = asString(rp.routine_id)
    const legacy = asString((rp.products as Row | null)?.legacy_id)
    if (rid && legacy) uuidToLegacy.set(`${rid}:${asString(rp.product_id)}`, legacy)
  }

  const stepsByRoutine = new Map<string, RoutineStep[]>()
  for (const s of ((rsRes.data ?? []) as StepRow[])) {
    const rid = asString(s.routine_id)
    if (!rid) continue
    const mapped = mapStep({ ...s, product_id: s.product_id })
    if (!mapped) continue
    const arr = stepsByRoutine.get(rid) ?? []
    arr.push(mapped)
    stepsByRoutine.set(rid, arr)
  }

  return ((routinesRes.data ?? []) as Row[])
    .map((r) => {
      const rid = asString(r.id)
      const legacyIds: string[] = []
      for (const [key, legacy] of uuidToLegacy) {
        if (key.startsWith(`${rid}:`)) legacyIds.push(legacy)
      }
      // Steps: convert product UUID -> legacy id so the editor matches productSummaries.
      const steps = (stepsByRoutine.get(rid) ?? []).map((s) => ({
        ...s,
        productId: toLegacyOrRaw(s.productId, uuidToLegacy, rid),
      }))
      return mapRow(r, legacyIds, steps)
    })
    .filter((r): r is Routine => r !== null)
}

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/** Editor/storefront resolve products by legacy id ("yq-XXX") — never expose raw UUIDs. */
function toLegacyOrRaw(
  uuidProductId: string,
  uuidToLegacy: Map<string, string>,
  routineId: string
): string {
  return uuidToLegacy.get(`${routineId}:${uuidProductId}`) ?? uuidProductId
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin

  const supabase = createAdminClient() as any

  try {
    const routines = await fetchRoutinesMapped(supabase)
    return NextResponse.json({ routines }, {
      headers: { 'Cache-Control': 'no-store, must-revalidate' },
    })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  return POST(request)
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin

  const supabase = createAdminClient() as any

  try {
    const body = await request.json()

    const nameAr = body.nameAr
    if (!nameAr) {
      return NextResponse.json(
        { error: { code: 'invalid_request', message: 'اسم الروتين مطلوب' } },
        { status: 400 },
      )
    }

    const slugify = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

    const slug = asString(body.slug) || slugify(asString(body.name)) || `routine-${Date.now()}`

    // Payload matches db/schema.sql routines columns exactly.
    const payload: Row = {
      slug,
      name: asString(body.name) || asString(body.nameEn) || nameAr,
      name_ar: nameAr,
      description: asString(body.description) || asString(body.descriptionEn),
      description_ar: asString(body.descriptionAr),
      routine_type: asString(body.type, "daily"),
      routine_type_ar: asString(body.typeAr, "روتين يومي"),
      routine_level: asString(body.level, "standard") || null,
      duration: asString(body.duration),
      duration_en: asString(body.durationEn),
      for_whom: Array.isArray(body.forWhom) ? body.forWhom : [],
      for_whom_en: Array.isArray(body.forWhomEn) ? body.forWhomEn : [],
      expected_results: Array.isArray(body.expectedResults) ? body.expectedResults : [],
      expected_results_en: Array.isArray(body.expectedResultsEn) ? body.expectedResultsEn : [],
      savings_percent: body.savingsPercent ?? 15,
      display_order: body.displayOrder ?? 0,
      why_chose_it: asString(body.whyChoseIt),
      hero_image: asString(body.heroImage) || null,
      is_active: body.active !== false,
    }

    const existingId = asString(body.id)
    let routineId = existingId

    if (existingId && isUUID(existingId)) {
      const { error } = await supabase.from('routines').update(payload).eq('id', existingId)
      if (error) throw error
    } else if (existingId) {
      // Non-UUID id (e.g. static seed "rt1") — match by slug instead, else insert.
      const { data: found, error: findErr } = await supabase
        .from('routines')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (findErr) throw findErr
      if (found?.id) {
        routineId = asString(found.id)
        const { error } = await supabase.from('routines').update(payload).eq('id', routineId)
        if (error) throw error
      } else {
        const { data: inserted, error } = await supabase
          .from('routines')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        routineId = asString(inserted.id)
      }
    } else {
      const { data: inserted, error } = await supabase
        .from('routines')
        .insert(payload)
        .select('id')
        .single()
      if (error) throw error
      routineId = asString(inserted.id)
    }

    if (routineId) {
      // Sync products/steps ONLY when the editor actually sent them.
      // A partial request (e.g. toggleActive sends only the routine fields)
      // must never wipe existing links.
      const syncProducts = Array.isArray(body.products)
      const syncSteps = Array.isArray(body.steps)

      if (syncProducts || syncSteps) {
        const legacyIds: string[] = syncProducts
          ? body.products.filter((x: unknown): x is string => typeof x === "string")
          : []
        const uuidIds: string[] = []
        const legacyToUuid = new Map<string, string>()
        if (legacyIds.length > 0) {
          const chunkSize = 50
          for (let i = 0; i < legacyIds.length; i += chunkSize) {
            const chunk = legacyIds.slice(i, i + chunkSize)
            const { data: prods, error: pErr } = await supabase
              .from('products')
              .select('id, legacy_id')
              .in('legacy_id', chunk)
            if (pErr) throw pErr
            for (const p of (prods ?? []) as Row[]) {
              const lid = asString(p.legacy_id)
              const pid = asString(p.id)
              if (pid) uuidIds.push(pid)
              if (lid && pid) legacyToUuid.set(lid, pid)
            }
          }
        }

        if (syncProducts) {
          const { error: delPErr } = await supabase
            .from('routine_products')
            .delete()
            .eq('routine_id', routineId)
          if (delPErr) throw delPErr
          if (uuidIds.length > 0) {
            const rows = uuidIds.map((pid) => ({ routine_id: routineId, product_id: pid }))
            const { error: insErr } = await supabase.from('routine_products').insert(rows)
            if (insErr) throw insErr
          }
        }

        if (syncSteps) {
          const steps: RoutineStep[] = body.steps
          const { error: delSErr } = await supabase
            .from('routine_steps')
            .delete()
            .eq('routine_id', routineId)
          if (delSErr) throw delSErr
          if (steps.length > 0) {
            const stepRows = steps.map((s, i) => ({
              routine_id: routineId,
              product_id: legacyToUuid.get(s.productId) ?? null,
              step_number: i + 1,
              title_ar: s.titleAr || `الخطوة ${i + 1}`,
              title_en: s.titleEn || `Step ${i + 1}`,
              description_ar: s.descriptionAr ?? "",
              description_en: s.descriptionEn ?? "",
              time_of_day: s.time || "both",
            }))
            const { error: insSErr } = await supabase.from('routine_steps').insert(stepRows)
            if (insSErr) throw insSErr
          }
        }
      }
    }

    revalidatePath('/', 'layout')
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin

  const supabase = createAdminClient() as any

  try {
    const id = new URL(request.url).pathname.replace('/api/admin/routines/', '')

    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', id) as any

    if (error) {
      return NextResponse.json(
        { error: { code: 'internal_error', message: error.message } },
        { status: 500 },
      )
    }

    revalidatePath('/', 'layout')
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    )
  }
}
