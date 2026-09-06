import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/src/lib/admin-auth'
import { can } from '@/src/admin/permissions'
import { createAdminClient } from '@/src/lib/supabase'
import type { AdminResource } from '@/src/admin/types'
import { invalidateProductCache } from '@/src/lib/product-dal'
import { invalidateServerProductsCache } from '@/src/lib/server-products'
import { revalidatePath } from 'next/cache'
import {
  supabaseGetProducts,
  supabaseSaveProduct,
  supabaseDeleteProduct,
  supabaseGetCategories,
  supabaseSaveCategory,
  supabaseDeleteCategory,
  supabaseGetBrands,
  supabaseSaveBrand,
  supabaseDeleteBrand,
  supabaseGetOrders,
  supabaseUpdateOrderStatus,
  supabaseGetCustomers,
  supabaseGetExperts,
  supabaseSaveExpert,
  supabaseDeleteExpert,
  supabaseGetArticles,
  supabaseGetRoutines,
  supabaseSaveRoutine,
  supabaseDeleteRoutine,
  supabaseGetBundles,
  supabaseSaveBundles,
  supabaseDeleteBundle,
  supabaseGetBanners,
  supabaseSaveBanners,
  supabaseGetCoupons,
  supabaseSaveCoupons,
  supabaseGetReviews,
  supabaseUpdateReviewStatus,
  supabaseGetHomepageSettings,
  supabaseSaveHomepageSettings,
  supabaseGetHero,
  supabaseSaveHero,
  supabaseGetGovernorates,
  supabaseSaveGovernorates,
  supabaseGetStats,
  supabaseGetGiftOptions,
  supabaseSaveGiftOptions,
  supabaseDeleteGiftOption,
  supabaseGetAuditLog,
  supabaseAppendAudit,
} from '@/src/lib/admin-supabase'
import {
  mergeProductOverrides,
  publishedWithOverrides,
  normalizePricing,
  getAuditLog,
  appendAudit,
  setProductStatus,
  analyzeCatalogHealth,
} from '@/src/admin/operations';
import type { AuditEntry, HealthIssue } from '@/src/admin/types';
import type { AdminBanner, AdminCoupon, AdminReviewStatus, HomepageSettings } from '@/src/admin/types'
import type { GiftOption } from '@/src/data/bundles-admin'
import type { Governorate } from '@/src/data/shipping'
import type { OrderStatus } from '@/types/cart'
import type { Product, CategoryInfo, Routine } from '@/src/types/product'
import type { Brand } from '@/src/data/brands'
import type { Expert } from '@/src/types/expert'

async function readBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    return await request.json()
  } catch {
    return {}
  }
}

async function wrap(fn: () => Promise<unknown>) {
  try {
    const data = await fn()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Admin API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

async function wrapVoid(fn: () => Promise<void>) {
  try {
    await fn()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Admin API] PUT/POST/DELETE error:', (error as Error).message, (error as Error).stack)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 },
    )
  }
}

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

/** Map API resource segment → AdminResource for RBAC. */
const RESOURCE_PERMISSION_MAP: Record<string, AdminResource> = {
  products: 'products',
  categories: 'categories',
  brands: 'brands',
  orders: 'orders',
  customers: 'customers',
  experts: 'experts',
  articles: 'articles',
  routines: 'routines',
  bundles: 'bundles',
  banners: 'banners',
  coupons: 'coupons',
  reviews: 'reviews',
  homepage: 'content',
  hero: 'hero',
  shipping: 'shipping',
  stats: 'reports',
  'gift-options': 'bundles',
  audit: 'audit',
  sources: 'sources',
  media: 'media',
  merchandising: 'merchandising',
  'catalog-health': 'catalog_health',
  'import-export': 'import_export',
}

async function authorize(
  request: NextRequest,
  resourceName: string,
  permission: 'view' | 'edit',
): Promise<NextResponse | null> {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin as NextResponse
  const resource = RESOURCE_PERMISSION_MAP[resourceName]
  if (!resource) return null
  if (!can(admin.role, resource, permission)) {
    return NextResponse.json(
      { error: { code: 'forbidden', message: 'Permission denied' } },
      { status: 403 },
    )
  }
  return null
}

function serviceUnavailable(whatAr: string) {
  return NextResponse.json(
    { error: { code: 'service_unavailable', message: `الخدمة غير متاحة — ${whatAr}` } },
    { status: 503 },
  )
}

/** Canonical order lifecycle transitions (matches schema CHECK statuses). */
const ORDER_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

type HandlerFn = (request: NextRequest, resource: string[], rest: string[]) => Promise<NextResponse>

const getHandlers: Record<string, HandlerFn> = {
products: () => wrap(supabaseGetProducts),
  categories: () => wrap(supabaseGetCategories),
  brands: () => wrap(supabaseGetBrands),
  orders: () => wrap(supabaseGetOrders),
  customers: () => wrap(supabaseGetCustomers),
  experts: () => wrap(supabaseGetExperts),
  articles: () => wrap(supabaseGetArticles),
  routines: () => wrap(supabaseGetRoutines),
  bundles: () => wrap(() => supabaseGetBundles(false)),
  banners: () => wrap(supabaseGetBanners),
  coupons: () => wrap(supabaseGetCoupons),
  reviews: () => wrap(supabaseGetReviews),
  homepage: () => wrap(supabaseGetHomepageSettings),
  hero: () => wrap(supabaseGetHero),
  shipping: () => wrap(supabaseGetGovernorates),
  stats: () => wrap(supabaseGetStats),
  'gift-options': () => wrap(supabaseGetGiftOptions),
  audit: () => wrap(supabaseGetAuditLog),
  media: async () => {
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return NextResponse.json(data ?? [])
    } catch {
      return NextResponse.json([])
    }
  },
}

const postHandlers: Record<string, HandlerFn> = {
  banners: async (request) => {
    const body = await readBody(request)
    const existing = await supabaseGetBanners()
    return wrapVoid(async () => {
      await supabaseSaveBanners([...existing, body as AdminBanner])
      revalidatePath('/', 'layout')
    })
  },
  coupons: async (request) => {
    const body = await readBody(request)
    const existing = await supabaseGetCoupons()
    return wrapVoid(() => supabaseSaveCoupons([...existing, body as AdminCoupon]))
  },
  products: async (request) => {
    const body = await readBody(request)
    return wrapVoid(async () => {
      await supabaseSaveProduct(body as unknown as Product)
      invalidateProductCache()
      invalidateServerProductsCache()
      // Push ISR pages to refetch canonical data immediately after admin writes.
      revalidatePath('/', 'layout')
    })
  },
  categories: async (request) => {
    const body = await readBody(request)
    return wrapVoid(() => supabaseSaveCategory(body as unknown as CategoryInfo))
  },
  brands: async (request) => {
    const body = await readBody(request)
    return wrapVoid(() => supabaseSaveBrand(body as unknown as Brand))
  },
  experts: async (request) => {
    const body = await readBody(request)
    return wrapVoid(() => supabaseSaveExpert(body as unknown as Expert))
  },
  routines: async (request) => {
    const body = await readBody(request)
    return wrapVoid(() => supabaseSaveRoutine(body as unknown as Routine))
  },
  audit: async (request) => {
    const body = await readBody(request)
    return wrapVoid(() => supabaseAppendAudit(body as unknown as import('@/src/admin/types').AuditEntry))
  },
  sources: async () => serviceUnavailable('لم يتم بعد توفير تخزين دائم للمصادر'),
  media: async (request) => {
    const body = await readBody(request)
    return wrapVoid(async () => {
      const supabase = createAdminClient()
      const assets = Array.isArray(body) ? body : []
      for (const asset of assets) {
        const row = {
          id: asset.id,
          url: asset.url,
          type: asset.type || 'image',
          label: asset.label || null,
          tags: asset.tags || [],
          created_at: asset.createdAt || new Date().toISOString(),
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('media_assets') as any).upsert(row, { onConflict: 'id' })
        if (error) throw error
      }
    })
  },
  merchandising: async () => serviceUnavailable('لم يتم بعد توفير تخزين دائم لقواعد الترتيب والعرض'),
  'catalog-health': async () => {
    const products = await supabaseGetProducts();
    const report = await analyzeCatalogHealth(mergeProductOverrides(products));
    return wrap(() => Promise.resolve(report));
  },
  'import-export': async (request) => {
    const body = await readBody(request);
    const action = body?.action;
    if (action === 'export') {
      const data = getAuditLog();
      return NextResponse.json(data);
    }
    if (action === 'import') {
      return serviceUnavailable('الاستيراد الجماعي يتطلب تنفيذًا فعليًا لم يُنفَّذ بعد — استخدم الاستيراد عبر /api/admin/products/bulk');
    }
    return notFound();
  },
}

const putHandlers: Record<string, HandlerFn> = {
  orders: async (request, _resource, rest) => {
    const [id, action] = rest
    if (action === 'status' && id) {
      const body = await readBody(request)
      const nextStatus = body.status as OrderStatus
      const orders = await supabaseGetOrders()
      const current = orders.find((o) => o.id === id)
      if (!current) return NextResponse.json({ error: { code: 'not_found', message: 'الطلب غير موجود' } }, { status: 404 })
      const allowed = ORDER_STATUS_TRANSITIONS[current.status] ?? []
      if (!allowed.includes(nextStatus)) {
        return NextResponse.json(
          { error: { code: 'invalid_transition', message: `انتقال حالة غير صالح: "${current.status}" → "${nextStatus}". الانتقالات المسموحة: ${allowed.length > 0 ? allowed.join(', ') : 'لا يوجد (حالة نهائية)'}` } },
          { status: 409 },
        )
      }
      return wrapVoid(() => supabaseUpdateOrderStatus(id, nextStatus))
    }
    return notFound()
  },
  banners: async (request, _resource, rest) => {
    const [id] = rest
    if (!id) return notFound()
    const body = await readBody(request)
    const existing = await supabaseGetBanners()
    const updated = existing.map((b) => (b.id === id ? { ...b, ...body } : b))
    return wrapVoid(async () => {
      await supabaseSaveBanners(updated)
      revalidatePath('/', 'layout')
    })
  },
  coupons: async (request, _resource, rest) => {
    const [id] = rest
    if (!id) return notFound()
    const body = await readBody(request)
    const existing = await supabaseGetCoupons()
    const updated = existing.map((c) => (c.id === id ? { ...c, ...body } : c))
    return wrapVoid(() => supabaseSaveCoupons(updated))
  },
  reviews: async (request, _resource, rest) => {
    const [id, action] = rest
    if (action === 'status' && id) {
      const body = await readBody(request)
      return wrapVoid(() => supabaseUpdateReviewStatus(id, body.status as AdminReviewStatus))
    }
    return notFound()
  },
  homepage: async (request) => {
    const body = await readBody(request)
    return wrapVoid(() => supabaseSaveHomepageSettings(body as HomepageSettings))
  },
  hero: async (request) => {
    const body = await readBody(request)
    return wrapVoid(async () => {
      await supabaseSaveHero(body)
      revalidatePath('/', 'layout')
    })
  },
  shipping: async (request) => {
    const body = await readBody(request)
    return wrapVoid(async () => {
      await supabaseSaveGovernorates(body as unknown as Governorate[])
      revalidatePath('/', 'layout')
    })
  },
  'gift-options': async (request) => {
    const body = await readBody(request)
    return wrapVoid(() => supabaseSaveGiftOptions(body as unknown as GiftOption[]))
  },
  bundles: async (request) => {
    const body = await readBody(request)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return wrapVoid(async () => {
      await supabaseSaveBundles(body as unknown as any[])
      revalidatePath('/', 'layout')
    })
  },
  experts: async (request) => {
    const body = await readBody(request)
    return wrapVoid(() => supabaseSaveExpert(body as unknown as Expert))
  },
  routines: async (request) => {
    const body = await readBody(request)
    return wrapVoid(async () => {
      await supabaseSaveRoutine(body as unknown as Routine)
      revalidatePath('/', 'layout')
    })
  },
  products: async (request) => {
    const body = await readBody(request)
    return wrapVoid(async () => {
      // Partial inline update (stock quantity / availability tri-state) from
      // the products list — same endpoint, same requireAdmin + RBAC guard.
      if (body?.partial === true && typeof body.id === 'string' && body.id) {
        const patch: Record<string, unknown> = {}
        if ('inStock' in body) {
          patch.in_stock = body.inStock === null ? null : Boolean(body.inStock)
        }
        for (const [bodyKey, col] of [
          ['isFeatured', 'is_featured'],
          ['isNew', 'is_new'],
          ['isBestSeller', 'is_best_seller'],
        ] as const) {
          if (bodyKey in body) patch[col] = Boolean(body[bodyKey])
        }
        if ('status' in body && typeof body.status === 'string') {
          const allowed = new Set(['active', 'published', 'draft', 'hidden', 'archived', 'rejected', 'retired'])
          if (!allowed.has(body.status)) throw new Error('حالة منتج غير معروفة')
          patch.status = body.status
        }
        if (body.stockQuantity !== undefined || body.stock !== undefined) {
          const q = Number(body.stockQuantity ?? body.stock)
          if (!Number.isInteger(q) || q < 0) {
            throw new Error('كمية المخزون يجب أن تكون رقمًا صحيحًا ≥ 0')
          }
          patch.stock = q
          patch.stock_quantity = q
        }
        if (Object.keys(patch).length === 0) throw new Error('لا يوجد شيء لتحديثه')
        const supabase = createAdminClient()
        const { error } = await (supabase.from('products') as unknown as { update: (p: unknown) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } }).update(patch).eq('id', body.id)
        if (error) throw new Error(error.message)
      } else {
        await supabaseSaveProduct(body as unknown as Product)
      }
      invalidateProductCache()
      invalidateServerProductsCache()
      // Push ISR pages to refetch canonical data immediately after admin writes.
      revalidatePath('/', 'layout')
    })
  },
  categories: async (request) => {
    const body = await readBody(request)
    return wrapVoid(() => supabaseSaveCategory(body as unknown as CategoryInfo))
  },
  brands: async (request) => {
    const body = await readBody(request)
    return wrapVoid(() => supabaseSaveBrand(body as unknown as Brand))
  },
}

const deleteHandlers: Record<string, HandlerFn> = {
  products: async (_request, _resource, rest) => {
    const [id] = rest
    if (!id) return notFound()
    return wrapVoid(async () => {
      await supabaseDeleteProduct(id)
      invalidateProductCache()
      invalidateServerProductsCache()
      // Push ISR pages to refetch canonical data immediately after admin writes.
      revalidatePath('/', 'layout')
    })
  },
  categories: async (_request, _resource, rest) => {
    const [slug] = rest
    if (!slug) return notFound()
    return wrapVoid(() => supabaseDeleteCategory(slug))
  },
  brands: async (_request, _resource, rest) => {
    const [slug] = rest
    if (!slug) return notFound()
    return wrapVoid(() => supabaseDeleteBrand(slug))
  },
  experts: async (_request, _resource, rest) => {
    const [slug] = rest
    if (!slug) return notFound()
    return wrapVoid(() => supabaseDeleteExpert(slug))
  },
  routines: async (_request, _resource, rest) => {
    const [id] = rest
    if (!id) return notFound()
    return wrapVoid(async () => {
      await supabaseDeleteRoutine(id)
      revalidatePath('/', 'layout')
    })
  },
  bundles: async (_request, _resource, rest) => {
    const [slug] = rest
    if (!slug) return notFound()
    return wrapVoid(async () => {
      await supabaseDeleteBundle(slug)
      revalidatePath('/', 'layout')
    })
  },
  banners: async (_request, _resource, rest) => {
    const [id] = rest
    if (!id) return notFound()
    const existing = await supabaseGetBanners()
    return wrapVoid(async () => {
      await supabaseSaveBanners(existing.filter((b) => b.id !== id))
      revalidatePath('/', 'layout')
    })
  },
  coupons: async (_request, _resource, rest) => {
    const [id] = rest
    if (!id) return notFound()
    const existing = await supabaseGetCoupons()
    return wrapVoid(() => supabaseSaveCoupons(existing.filter((c) => c.id !== id)))
  },
  'gift-options': async (_request, _resource, rest) => {
    const [id] = rest
    if (!id) return notFound()
    return wrapVoid(() => supabaseDeleteGiftOption(id))
  },
}

async function dispatch(
  request: NextRequest,
  params: Promise<{ resource: string[] }>,
  map: Record<string, HandlerFn>,
  permission: 'view' | 'edit',
) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin
  const { resource } = await params
  const [resourceName, ...rest] = resource
  const denied = await authorize(request, resourceName, permission)
  if (denied) return denied
  const handler = map[resourceName]
  if (!handler) return notFound()
  return handler(request, resource, rest)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string[] }> },
) {
  return dispatch(request, params, getHandlers, 'view')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string[] }> },
) {
  return dispatch(request, params, postHandlers, 'edit')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string[] }> },
) {
  return dispatch(request, params, putHandlers, 'edit')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string[] }> },
) {
  return dispatch(request, params, deleteHandlers, 'edit')
}
