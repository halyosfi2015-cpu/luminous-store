import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/src/lib/admin-auth'
import { can } from '@/src/admin/permissions'
import { createAdminClient } from '@/src/lib/supabase'
import { invalidateProductCache } from '@/src/lib/product-dal'
import { invalidateServerProductsCache } from '@/src/lib/server-products'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* ------------------------------------------------------------------ */
/* Shared row schema (CSV-compatible, round-trippable)                 */
/* ------------------------------------------------------------------ */

const IMPORT_FIELDS = [
  'id',            // optional: legacy_id (e.g. yq-884) or UUID — used for conflict detection only
  'sku',           // PRIMARY matching key
  'slug',
  'nameAr',
  'nameEn',
  'descriptionAr',
  'descriptionEn',
  'brand',         // brand slug or name (EN or AR)
  'category',      // category slug or name (EN or AR)
  'price',
  'originalPrice',
  'discount',
  'stock',
  'status',
  'gallery',       // URLs separated by " | "
  'tags',          // comma separated
  'isFeatured',    // true/false
  'isNew',         // true/false
  'availability',  // hidden | available | out_of_stock (empty = no change on update / hidden on insert)
] as const

/** Map an availability CSV token to the in_stock tri-state. */
function parseAvailability(v: string | undefined): boolean | null | 'invalid' {
  const k = normKey(v)
  if (!k) return null
  if (['hidden', 'null', 'none'].includes(k)) return null
  if (['available', 'true', 'in_stock'].includes(k)) return true
  if (['out_of_stock', 'outofstock', 'false'].includes(k)) return false
  return 'invalid'
}

function availabilityToken(v: boolean | null | undefined): string {
  if (v === true) return 'available'
  if (v === false) return 'out_of_stock'
  return 'hidden'
}

const availabilityTokenOfDb = (v: unknown): string =>
  v === true ? 'available' : v === false ? 'out_of_stock' : 'hidden'

const KNOWN_STATUSES = new Set([
  'active', 'draft', 'hidden', 'published', 'archived', 'rejected', 'duplicate', 'retired',
])

type Row = Record<string, string>

type FieldError = { field: string; value?: string; reason: string }

type PlanRow =
  | { row: number; op: 'new' | 'update' | 'skip'; sku: string; productId?: string; changes?: { field: string; from: string; to: string }[] }
  | { row: number; op: 'error'; sku: string; errors: FieldError[] }

type ExecResult = {
  added: number
  updated: number
  skipped: number
  failed: number
  details: { row: number; sku: string; productId?: string; operation: string; error: string }[]
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const normKey = (v: string | undefined) => (v ?? '').trim().toLowerCase()
const isBlank = (v: string | undefined) => v === undefined || v.trim() === ''
const truthy = (v: string | undefined) => ['true', '1', 'yes', 'نعم'].includes(normKey(v))

// Central brand resolver — mirrors src/lib/brand-match.ts to prevent regression
// Arabic aliases must resolve to English canonical when duplicate exists (e.g. دوف→dove)
function brandNormalize(s: string): string {
  return s.toLowerCase().replace(/[أإآٱا]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').normalize('NFD').replace(/[\u0300-\u036f\u064B-\u065F\u0670]/g,'').replace(/^(ماركة|من|brand)\s+/,'').replace(/\s*-\s*\d+\s*(مل|ml).*$/i,'').replace(/[^a-z0-9\u0600-\u06FF]/g,'')
}

function parseGallery(v: string | undefined): string[] {
  return (v ?? '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseTags(v: string | undefined): string[] {
  return (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Fetch every active product (PostgREST caps at 1000/request → paginate). */
async function fetchAllProducts(supabase: ReturnType<typeof createAdminClient>) {
  const select = [
    'id', 'legacy_id', 'sku', 'slug', 'name', 'description', 'pricing', 'discount',
    'gallery', 'tags', 'stock_quantity', 'status', 'is_featured', 'is_new', 'in_stock',
    'category_id', 'brand_id',
  ].join(',')
  const all: Record<string, unknown>[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('products')
      .select(select)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`Failed to load products: ${error.message}`)
    all.push(...((data ?? []) as Record<string, unknown>[]))
    if (!data || data.length < pageSize) break
  }
  return all
}

function displayName(json: unknown, lang: 'ar' | 'en'): string {
  const obj = json as { ar?: string; en?: string } | null
  return obj?.[lang] ?? ''
}

/* ------------------------------------------------------------------ */
/* Validation + matching                                               */
/* ------------------------------------------------------------------ */

type Ctx = Awaited<ReturnType<typeof buildContext>>

async function buildContext(supabase: ReturnType<typeof createAdminClient>) {
  const [products, catsRes, brandsRes] = await Promise.all([
    fetchAllProducts(supabase),
    supabase.from('categories').select('id,slug,name').then((r) => r.data ?? []),
    supabase.from('brands').select('id,slug,name,name_ar').then((r) => r.data ?? []),
  ])

  const bySku = new Map<string, Record<string, unknown>[]>()
  const byId = new Map<string, Record<string, unknown>>()
  for (const p of products) {
    const k = normKey(p.sku as string)
    if (k) bySku.set(k, [...(bySku.get(k) ?? []), p])
    byId.set(String(p.id), p)
    byId.set(String(p.legacy_id), p)
  }
  const catIndex = new Map<string, { id: string; slug: string; name: { ar: string; en: string } }>()
  const catById = new Map<string, { id: string; slug: string; name: { ar: string; en: string } }>()
  for (const c of catsRes as { id: string; slug: string; name: { ar: string; en: string } }[]) {
    catIndex.set(normKey(c.slug), c)
    catIndex.set(normKey(c.name?.ar), c)
    catIndex.set(normKey(c.name?.en), c)
    catById.set(c.id, c)
  }
  const brandIndex = new Map<string, { id: string; slug: string; name: string; name_ar: string }>()
  const brandById = new Map<string, { id: string; slug: string; name: string; name_ar: string }>()
  // Build normalized -> list with English priority (Single Source of Truth)
  const normToBrands = new Map<string, { id: string; slug: string; name: string; name_ar: string }[]>()
  for (const b of brandsRes as { id: string; slug: string; name: string; name_ar: string }[]) {
    brandById.set(b.id, b)
    for(const v of [b.slug, b.name, b.name_ar]){
      if(!v) continue
      const n = brandNormalize(v)
      if(!n) continue
      if(!normToBrands.has(n)) normToBrands.set(n, [])
      normToBrands.get(n)!.push(b)
    }
  }
  for(const [norm, list] of normToBrands.entries()){
    const uniq = [...new Map(list.map(x=>[x.id,x])).values()]
    let chosen = uniq[0]
    const eng = uniq.filter(x=> /^[a-z0-9-]+$/.test(x.slug))
    if(eng.length>0) chosen = eng[0]
    brandIndex.set(norm, chosen)
    // keep also raw normKey for backward compat (lowercase only) as fallback
    brandIndex.set(normKey(list[0].slug), chosen)
  }
  // Curated Arabic→English canonical overrides (must not create Arabic duplicates)
  const brandBySlug = new Map(brandsRes.map((b:any)=>[b.slug,b]))
  const overrides: Record<string,string> = {
    'دوف': 'dove',
    'افين': 'avene', 'أفين': 'avene',
    'لوريال': 'loreal-paris', 'لوريال باريس': 'loreal-paris',
    'فلورمار': 'فلورمار', // no English flormar in DB → keep Arabic
    'غارنييه': 'garnier', 'غارنية': 'garnier',
    'اوبتيمال': 'optimal', 'أوبتيمال': 'optimal',
    'بيوديرما': 'bioderma', 'بايو ديرما': 'bioderma',
    'يوسيرين': 'eucerin', 'إيوسيرين': 'eucerin',
  }
  for(const [ar, engSlug] of Object.entries(overrides)){
    const target = brandBySlug.get(engSlug)
    if(target){
      const n = brandNormalize(ar)
      if(n) brandIndex.set(n, target)
    }
  }
  return { products, bySku, byId, catIndex, brandIndex, catById, brandById }
}

/**
 * Validate one CSV row against the DB context.
 * SKU is the primary matching key. Empty fields never overwrite DB values.
 */
function planRow(ctx: Ctx, row: Row, index: number): PlanRow {
  const rowNum = index + 2 // header offset
  const skuRaw = row.sku ?? ''
  const errors: FieldError[] = []

  /* ---- identity resolution ---- */
  let dbProduct: Record<string, unknown> | undefined
  let ambiguousSku = false

  if (!isBlank(row.id)) {
    const byIdHit = ctx.byId.get(row.id!.trim())
    if (!isBlank(skuRaw)) {
      const skuHits = ctx.bySku.get(normKey(skuRaw)) ?? []
      if (skuHits.length > 1) {
        return {
          row: rowNum, op: 'error', sku: skuRaw,
          errors: [{ field: 'SKU', value: skuRaw, reason: `SKU موجود لأكثر من منتج في قاعدة البيانات (${skuHits.length} منتجات) — تعارض غير محسوم` }],
        }
      }
      if (byIdHit && skuHits[0] && byIdHit.id !== skuHits[0].id) {
        return {
          row: rowNum, op: 'error', sku: skuRaw,
          errors: [{ field: 'id/SKU', value: `${row.id} / ${skuRaw}`, reason: `تعارض الهوية: ID يشير إلى منتج مختلف عن SKU — لن يتم تحديث أي منتج` }],
        }
      }
      dbProduct = byIdHit ?? skuHits[0]
    } else {
      dbProduct = byIdHit
      if (!dbProduct) {
        return {
          row: rowNum, op: 'error', sku: skuRaw,
          errors: [{ field: 'id', value: row.id!, reason: `معرّف المنتج غير موجود في قاعدة البيانات` }],
        }
      }
    }
  } else if (!isBlank(skuRaw)) {
    const hits = ctx.bySku.get(normKey(skuRaw)) ?? []
    if (hits.length > 1) {
      ambiguousSku = true
    } else if (hits.length === 1) {
      dbProduct = hits[0]
    }
  } else {
    return {
      row: rowNum, op: 'error', sku: skuRaw,
      errors: [{ field: 'SKU', reason: `حقل SKU مطلوب (فرّاغ أو مفقود)` }],
    }
  }

  if (ambiguousSku) {
    return {
      row: rowNum, op: 'error', sku: skuRaw,
      errors: [{ field: 'SKU', value: skuRaw, reason: `SKU موجود لأكثر من منتج في قاعدة البيانات — تعارض غير محسوم` }],
    }
  }

  /* ---- business validation ---- */
  const isNew = !dbProduct

  if (isNew || !isBlank(row.nameAr)) {
    if ((row.nameAr ?? '').trim().length === 0 && isNew) {
      errors.push({ field: 'nameAr', reason: 'الاسم العربي مطلوب لمنتج جديد' })
    }
  }
  if (isNew && (row.nameEn ?? '').trim().length === 0) {
    errors.push({ field: 'nameEn', reason: 'الاسم الإنجليزي مطلوب لمنتج جديد' })
  }
  if (isNew && isBlank(row.brand)) errors.push({ field: 'brand', reason: 'العلامة التجارية مطلوبة لمنتج جديد' })
  else if (!isBlank(row.brand) && !ctx.brandIndex.has(brandNormalize(row.brand))) {
    errors.push({ field: 'brand', value: row.brand!, reason: 'العلامة غير موجودة في قاعدة البيانات' })
  }
  if (isNew && isBlank(row.category)) errors.push({ field: 'category', reason: 'الفئة مطلوبة لمنتج جديد' })
  else if (!isBlank(row.category) && !ctx.catIndex.has(normKey(row.category))) {
    errors.push({ field: 'category', value: row.category!, reason: 'الفئة غير موجودة في قاعدة البيانات' })
  }

  if (isNew && isBlank(row.price)) errors.push({ field: 'price', reason: 'السعر مطلوب لمنتج جديد' })
  if (!isBlank(row.price)) {
    const n = Number(row.price)
    if (Number.isNaN(n) || n < 0) errors.push({ field: 'price', value: row.price!, reason: 'قيمة سعرية غير صالحة' })
  }
  if (!isBlank(row.originalPrice)) {
    const n = Number(row.originalPrice)
    if (Number.isNaN(n) || n < 0) errors.push({ field: 'originalPrice', value: row.originalPrice!, reason: 'قيمة سعر غير صالحة' })
  }
  if (!isBlank(row.discount)) {
    const n = Number(row.discount)
    if (Number.isNaN(n) || n < 0) errors.push({ field: 'discount', value: row.discount!, reason: 'قيمة خصم غير صالحة' })
  }
  if (!isBlank(row.stock)) {
    const n = Number(row.stock)
    if (!Number.isInteger(n) || n < 0) errors.push({ field: 'stock', value: row.stock!, reason: 'المخزون يجب أن يكون رقمًا صحيحًا ≥ 0' })
  }
  if (!isBlank(row.status) && !KNOWN_STATUSES.has(normKey(row.status))) {
    errors.push({ field: 'status', value: row.status!, reason: `حالة غير معروفة (المسموح: ${[...KNOWN_STATUSES].join(', ')})` })
  }
  for (const url of parseGallery(row.gallery)) {
    if (!/^https?:\/\//i.test(url)) {
      errors.push({ field: 'gallery', value: url, reason: 'رابط صورة غير صالح (يجب أن يبدأ بـ http/https)' })
    }
  }
  if (!dbProduct && !isBlank(row.slug)) {
    const taken = ctx.products.some((p) => normKey(p.slug as string) === normKey(row.slug))
    if (taken) errors.push({ field: 'slug', value: row.slug!, reason: 'الرابط (slug) مستخدم بالفعل من منتج آخر' })
  }
  if (parseAvailability(row.availability) === 'invalid') {
    errors.push({ field: 'availability', value: row.availability!, reason: 'قيمة غير صالحة (المسموح: hidden / available / out_of_stock)' })
  }

  if (errors.length > 0) return { row: rowNum, op: 'error', sku: skuRaw, errors }

  if (dbProduct) {
    /* ---- diff for preview (only provided, non-empty fields) ---- */
    const pricing = dbProduct.pricing as { price?: number; originalPrice?: number } | null
    const changes: { field: string; from: string; to: string }[] = []
    const pushDiff = (field: string, from: string, to: string) => {
      if (from !== to) changes.push({ field, from, to })
    }
    if (!isBlank(row.nameAr)) pushDiff('nameAr', displayName(dbProduct.name, 'ar'), row.nameAr!)
    if (!isBlank(row.nameEn)) pushDiff('nameEn', displayName(dbProduct.name, 'en'), row.nameEn!)
    if (!isBlank(row.descriptionAr)) pushDiff('descriptionAr', displayName(dbProduct.description, 'ar'), row.descriptionAr!)
    if (!isBlank(row.descriptionEn)) pushDiff('descriptionEn', displayName(dbProduct.description, 'en'), row.descriptionEn!)
    if (!isBlank(row.brand)) {
      const from = ctx.brandById.get(String((dbProduct.brand_id as string) ?? ''))
      pushDiff('brand', from?.slug ?? '', brandNormalize(row.brand))
    }
    if (!isBlank(row.category)) {
      const from = ctx.catById.get(String((dbProduct.category_id as string) ?? ''))
      pushDiff('category', from?.slug ?? '', normKey(row.category))
    }
    if (!isBlank(row.price)) pushDiff('price', String(pricing?.price ?? ''), row.price!)
    if (!isBlank(row.originalPrice)) pushDiff('originalPrice', String(pricing?.originalPrice ?? ''), row.originalPrice!)
    if (!isBlank(row.discount)) pushDiff('discount', String(dbProduct.discount ?? '0'), row.discount!)
    if (!isBlank(row.stock)) pushDiff('stock', String(dbProduct.stock_quantity ?? '0'), row.stock!)
    if (!isBlank(row.status)) pushDiff('status', String(dbProduct.status ?? ''), normKey(row.status))
    if (!isBlank(row.gallery)) {
      const current = ((dbProduct.gallery as string[] | null) ?? []).join(' | ')
      const incoming = parseGallery(row.gallery).join(' | ')
      if (current !== incoming) {
        changes.push({ field: 'gallery', from: current, to: incoming })
        // remove placeholder entry pushed above
        const idx = changes.findIndex((c) => c.field === 'gallery' && c.to === '')
        if (idx >= 0) changes.splice(idx, 1)
      }
    }
    if (!isBlank(row.tags)) {
      const current = ((dbProduct.tags as string[] | null) ?? []).join(',')
      const incoming = parseTags(row.tags).join(',')
      if (current !== incoming) changes.push({ field: 'tags', from: current, to: incoming })
    }
    if (!isBlank(row.isFeatured)) pushDiff('isFeatured', String(dbProduct.is_featured === true), String(truthy(row.isFeatured)))
    if (!isBlank(row.isNew)) pushDiff('isNew', String(dbProduct.is_new === true), String(truthy(row.isNew)))
    if (!isBlank(row.availability)) {
      const av = parseAvailability(row.availability)
      changes.push({ field: 'availability', from: availabilityTokenOfDb(dbProduct.in_stock), to: availabilityToken(av === 'invalid' ? null : av) })
    }

    if (changes.length === 0) {
      return { row: rowNum, op: 'skip', sku: skuRaw, productId: String(dbProduct.legacy_id ?? dbProduct.id) }
    }
    return {
      row: rowNum, op: 'update', sku: skuRaw,
      productId: String(dbProduct.legacy_id ?? dbProduct.id),
      changes,
    }
  }

  return { row: rowNum, op: 'new', sku: skuRaw }
}

/* ------------------------------------------------------------------ */
/* Duplicate detection inside the import file                          */
/* ------------------------------------------------------------------ */

function detectFileDuplicates(rows: Row[]): Map<number, FieldError[]> {
  const seen = new Map<string, number>()
  const extraErrors = new Map<number, FieldError[]>()
  rows.forEach((row, i) => {
    const k = normKey(row.sku)
    if (!k) return
    const first = seen.get(k)
    if (first !== undefined) {
      const msg: FieldError = { field: 'SKU', value: row.sku, reason: `SKU مكرر داخل ملف الاستيراد (أول ظهور في الصف ${first + 2})` }
      extraErrors.set(i, [...(extraErrors.get(i) ?? []), msg])
      extraErrors.set(first, [...(extraErrors.get(first) ?? []), { ...msg, reason: `SKU مكرر داخل ملف الاستيراد (مكرر أيضًا في الصف ${i + 2})` }])
    } else {
      seen.set(k, i)
    }
    const idk = (row.id ?? '').trim()
    if (idk) {
      const idFirst = seen.get(`id:${idk.toLowerCase()}`)
      if (idFirst !== undefined) {
        extraErrors.set(i, [...(extraErrors.get(i) ?? []), { field: 'id', value: idk, reason: 'معرّف منتج مكرر داخل الملف' }])
      } else {
        seen.set(`id:${idk.toLowerCase()}`, i)
      }
    }
  })
  return extraErrors
}

/* ------------------------------------------------------------------ */
/* Write payload builders                                              */
/* ------------------------------------------------------------------ */

function buildUpdatePatch(ctx: Ctx, row: Row): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (!isBlank(row.nameAr) || !isBlank(row.nameEn)) {
    patch.name = {}
    if (!isBlank(row.nameAr)) (patch.name as Record<string, string>).ar = row.nameAr!.trim()
    if (!isBlank(row.nameEn)) (patch.name as Record<string, string>).en = row.nameEn!.trim()
  }
  if (!isBlank(row.descriptionAr) || !isBlank(row.descriptionEn)) {
    patch.description = {}
    if (!isBlank(row.descriptionAr)) (patch.description as Record<string, string>).ar = row.descriptionAr!
    if (!isBlank(row.descriptionEn)) (patch.description as Record<string, string>).en = row.descriptionEn!
  }
  if (!isBlank(row.brand)) patch.brand_id = ctx.brandIndex.get(brandNormalize(row.brand))!.id
  if (!isBlank(row.category)) patch.category_id = ctx.catIndex.get(normKey(row.category))!.id
  if (!isBlank(row.price) || !isBlank(row.originalPrice)) {
    patch.pricing = {} as Record<string, unknown>
    // preserve existing currency when merging happens client of this fn passes base separately
    if (!isBlank(row.price)) (patch.pricing as Record<string, unknown>).price = Number(row.price)
    if (!isBlank(row.originalPrice)) (patch.pricing as Record<string, unknown>).originalPrice = Number(row.originalPrice)
  }
  if (!isBlank(row.discount)) patch.discount = Number(row.discount)
  if (!isBlank(row.stock)) {
    patch.stock = Number(row.stock)
    patch.stock_quantity = Number(row.stock)
  }
  if (!isBlank(row.status)) patch.status = normKey(row.status)
  if (!isBlank(row.gallery)) patch.gallery = parseGallery(row.gallery)
  if (!isBlank(row.tags)) patch.tags = parseTags(row.tags)
  if (!isBlank(row.isFeatured)) patch.is_featured = truthy(row.isFeatured)
  if (!isBlank(row.isNew)) patch.is_new = truthy(row.isNew)
  // Tri-state availability — empty cell never changes the stored value.
  if (!isBlank(row.availability)) {
    const av = parseAvailability(row.availability)
    patch.in_stock = av === 'invalid' ? null : av
  }
  return patch
}

function buildInsertRow(ctx: Ctx, row: Row): Record<string, unknown> {
  const sku = row.sku!.trim()
  const legacyId = !isBlank(row.id) ? row.id!.trim() : `imp-${randomUUID().slice(0, 8)}`
  const slug = !isBlank(row.slug) ? row.slug!.trim() : legacyId
  return {
    id: randomUUID(),
    legacy_id: legacyId,
    slug,
    sku,
    name: { ar: (row.nameAr ?? '').trim(), en: (row.nameEn ?? '').trim() },
    description: { ar: row.descriptionAr ?? '', en: row.descriptionEn ?? '' },
    brand_id: ctx.brandIndex.get(brandNormalize(row.brand))!.id,
    category_id: ctx.catIndex.get(normKey(row.category))!.id,
    pricing: {
      price: Number(row.price),
      currency: 'YER',
      ...(Number(row.originalPrice) > 0 ? { originalPrice: Number(row.originalPrice) } : {}),
    },
    discount: Number(row.discount) || 0,
    gallery: parseGallery(row.gallery),
    images: parseGallery(row.gallery),
    tags: parseTags(row.tags),
    stock: Number(row.stock) || 0,
    stock_quantity: Number(row.stock) || 0,
    // Tri-state availability — blank = hidden (default for new products)
    in_stock: parseAvailability(row.availability),
    status: isBlank(row.status) ? 'draft' : normKey(row.status),
    is_featured: truthy(row.isFeatured),
    is_new: truthy(row.isNew),
    rating: 0,
    review_count: 0,
    ingredients: { ar: [], en: [] },
    benefits: { ar: [], en: [] },
    seo_metadata: {},
    is_active: true,
  }
}

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin
  if (!can(admin.role, 'products', 'edit')) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'لا تملك صلاحية تعديل المنتجات' } },
      { status: 403 },
    )
  }

  const body = await request.json().catch(() => null)
  const mode = body?.mode
  const rows: Row[] = Array.isArray(body?.rows) ? body.rows : []

  if (!rows.length) {
    return NextResponse.json(
      { error: { code: 'invalid_request', message: 'rows array is required' } },
      { status: 400 },
    )
  }
  if (rows.length > 5000) {
    return NextResponse.json(
      { error: { code: 'invalid_request', message: 'الحد الأقصى 5000 صف لكل عملية استيراد' } },
      { status: 400 },
    )
  }

  const supabase = createAdminClient() as ReturnType<typeof createAdminClient>
  const ctx = await buildContext(supabase)

  /* ---------- VALIDATE (dry run — no writes) ---------- */
  if (mode === 'validate') {
    const dupErrors = detectFileDuplicates(rows)
    const plans: PlanRow[] = rows.map((row, i) => {
      const plan = planRow(ctx, row, i)
      const extras = dupErrors.get(i)
      if (extras && extras.length > 0) {
        if (plan.op === 'error') plan.errors = [...plan.errors, ...extras]
        else return { row: plan.row, op: 'error', sku: plan.sku, ...(plan.productId ? { productId: plan.productId } : {}), errors: extras }
      }
      return plan
    })

    // Critical-error gate: any error blocks execution entirely (spec §11).
    const summary = {
      total: plans.length,
      new: plans.filter((p) => p.op === 'new').length,
      update: plans.filter((p) => p.op === 'update').length,
      skip: plans.filter((p) => p.op === 'skip').length,
      errors: plans.filter((p) => p.op === 'error').length,
    }
    return NextResponse.json({
      success: true,
      mode: 'validate',
      summary,
      blocked: summary.errors > 0,
      plans,
      limits: {
        atomicity: 'per-row atomic — لا توجد transaction عبر الصفوف؛ الأخطاء الحرجة تمنع التنفيذ كليًا قبل البدء',
        exportScope: 'active products only (is_active = true)',
      },
    })
  }

  /* ---------- EXECUTE ---------- */
  if (mode === 'execute') {
    const dupErrors = detectFileDuplicates(rows)
    const hasBlocking = [...dupErrors.values()].some((v) => v.length > 0)
    if (hasBlocking) {
      return NextResponse.json(
        { error: { code: 'blocked', message: 'يوجد تعارضات داخل الملف — يجب تشغيل validate أولاً وحل الأخطاء' } },
        { status: 409 },
      )
    }

    const result: ExecResult = { added: 0, updated: 0, skipped: 0, failed: 0, details: [] }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const plan = planRow(ctx, row, i)
      try {
        if (plan.op === 'skip') { result.skipped++; continue }
        if (plan.op === 'error') {
          result.failed++
          result.details.push({ row: plan.row, sku: plan.sku, operation: 'blocked', error: plan.errors.map((e) => `${e.field}: ${e.reason}`).join(' | ') })
          continue
        }
        if (plan.op === 'new') {
          const insertRow = buildInsertRow(ctx, row)
          const { error } = await (supabase.from('products') as unknown as { insert: (r: unknown) => Promise<{ error: { message: string } | null }> }).insert(insertRow)
          if (error) throw new Error(error.message)
          result.added++
          ctx.bySku.set(normKey(row.sku), [{ id: insertRow.id, legacy_id: insertRow.legacy_id }])
          continue
        }
        // update — merge pricing with existing currency
        const existing = ctx.bySku.get(normKey(plan.sku))?.[0] ?? ctx.byId.get(String(plan.productId))
        const patch = buildUpdatePatch(ctx, row)
        if (existing && patch.pricing) {
          const cur = (existing.pricing as { currency?: string } | null)?.currency ?? 'YER'
          ;(patch.pricing as Record<string, unknown>).currency = cur
        }
        let targetId: string | null = null
        if (existing) targetId = String(existing.id)
        else {
          const { data: found } = await supabase.from('products').select('id').eq('legacy_id', plan.productId ?? '').maybeSingle()
          targetId = (found as { id: string } | null)?.id ?? null
        }
        if (!targetId) throw new Error('لم يتم العثور على المنتج الهدف للتحديث')
        const { error } = await (supabase.from('products') as unknown as { update: (p: unknown) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } }).update(patch).eq('id', targetId)
        if (error) throw new Error(error.message)
        result.updated++
      } catch (err) {
        result.failed++
        result.details.push({
          row: plan.op === 'error' ? plan.row : i + 2,
          sku: typeof plan.sku === 'string' ? plan.sku : '',
          productId: plan.op !== 'error' ? plan.productId : undefined,
          operation: plan.op === 'new' ? 'insert' : plan.op === 'update' ? 'update' : 'blocked',
          error: (err as Error).message,
        })
      }
    }

    if (result.added > 0 || result.updated > 0) {
      invalidateProductCache()
      invalidateServerProductsCache()
      revalidatePath('/', 'layout')
    }

    return NextResponse.json({
      success: result.failed === 0,
      mode: 'execute',
      added: result.added,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
      details: result.details,
      atomicityNote: 'كل صف يُكتب على حدة (atomic per-row)؛ الصفوف الفاشلة لا تؤثر على الصفوف الناجحة.',
    })
  }

  /* ---------- backward compat: legacy direct import ---------- */
  return NextResponse.json(
    { error: { code: 'invalid_request', message: "mode must be 'validate' or 'execute'" } },
    { status: 400 },
  )
}

/* ---------- EXPORT (full active catalog, paginated server-side) ---------- */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin
  if (!can(admin.role, 'import_export', 'view')) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'لا تملك صلاحية الاستيراد/التصدير' } },
      { status: 403 },
    )
  }

  const supabase = createAdminClient() as ReturnType<typeof createAdminClient>
  const products = await fetchAllProducts(supabase)
  const { data: cats } = await supabase.from('categories').select('id,slug')
  const { data: brands } = await supabase.from('brands').select('id,slug')
  const catSlugById = new Map(((cats ?? []) as { id: string; slug: string }[]).map((c) => [c.id, c.slug]))
  const brandSlugById = new Map(((brands ?? []) as { id: string; slug: string }[]).map((b) => [b.id, b.slug]))

  const rows = products.map((p) => ({
    id: String(p.legacy_id ?? ''),
    sku: String(p.sku ?? ''),
    slug: String(p.slug ?? ''),
    nameAr: displayName(p.name, 'ar'),
    nameEn: displayName(p.name, 'en'),
    descriptionAr: displayName(p.description, 'ar'),
    descriptionEn: displayName(p.description, 'en'),
    brand: brandSlugById.get(String(p.brand_id ?? '')) ?? '',
    category: catSlugById.get(String(p.category_id ?? '')) ?? '',
    price: String((p.pricing as { price?: number })?.price ?? ''),
    originalPrice: String((p.pricing as { originalPrice?: number })?.originalPrice ?? ''),
    discount: String(p.discount ?? '0'),
    stock: String(p.stock_quantity ?? '0'),
    status: String(p.status ?? ''),
    gallery: ((p.gallery as string[] | null) ?? []).join(' | '),
    tags: ((p.tags as string[] | null) ?? []).join(','),
    isFeatured: String(p.is_featured === true),
    isNew: String(p.is_new === true),
    availability: availabilityTokenOfDb(p.in_stock),
  }))

  return NextResponse.json(
    { scope: 'all-active-products', count: rows.length, rows },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
