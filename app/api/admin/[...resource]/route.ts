import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/src/lib/admin-auth'
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
} from '@/src/lib/admin-supabase'
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
    console.error('Admin API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
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
  bundles: () => wrap(supabaseGetBundles),
  banners: () => wrap(supabaseGetBanners),
  coupons: () => wrap(supabaseGetCoupons),
  reviews: () => wrap(supabaseGetReviews),
  homepage: () => wrap(supabaseGetHomepageSettings),
  hero: () => wrap(supabaseGetHero),
  shipping: () => wrap(supabaseGetGovernorates),
  stats: () => wrap(supabaseGetStats),
  'gift-options': () => wrap(supabaseGetGiftOptions),
}

const postHandlers: Record<string, HandlerFn> = {
  banners: async (request) => {
    const body = await readBody(request)
    const existing = await supabaseGetBanners()
    return wrapVoid(() => supabaseSaveBanners([...existing, body as AdminBanner]))
  },
  coupons: async (request) => {
    const body = await readBody(request)
    const existing = await supabaseGetCoupons()
    return wrapVoid(() => supabaseSaveCoupons([...existing, body as AdminCoupon]))
  },
  products: async (request) => {
    const body = await readBody(request)
    return wrapVoid(() => supabaseSaveProduct(body as unknown as Product))
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
}

const putHandlers: Record<string, HandlerFn> = {
  orders: async (request, _resource, rest) => {
    const [id, action] = rest
    if (action === 'status' && id) {
      const body = await readBody(request)
      return wrapVoid(() => supabaseUpdateOrderStatus(id, body.status as OrderStatus))
    }
    return notFound()
  },
  banners: async (request, _resource, rest) => {
    const [id] = rest
    if (!id) return notFound()
    const body = await readBody(request)
    const existing = await supabaseGetBanners()
    const updated = existing.map((b) => (b.id === id ? { ...b, ...body } : b))
    return wrapVoid(() => supabaseSaveBanners(updated))
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
    return wrapVoid(() => supabaseSaveHero(body))
  },
  shipping: async (request) => {
    const body = await readBody(request)
    return wrapVoid(() => supabaseSaveGovernorates(body as unknown as Governorate[]))
  },
  'gift-options': async (request) => {
    const body = await readBody(request)
    return wrapVoid(() => supabaseSaveGiftOptions(body as unknown as GiftOption[]))
  },
  bundles: async (request) => {
    const body = await readBody(request)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return wrapVoid(() => supabaseSaveBundles(body as unknown as any[]))
  },
  experts: async (request) => {
    const body = await readBody(request)
    return wrapVoid(() => supabaseSaveExpert(body as unknown as Expert))
  },
  routines: async (request) => {
    const body = await readBody(request)
    return wrapVoid(() => supabaseSaveRoutine(body as unknown as Routine))
  },
  products: async (request) => {
    const body = await readBody(request)
    return wrapVoid(() => supabaseSaveProduct(body as unknown as Product))
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
    return wrapVoid(() => supabaseDeleteProduct(id))
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
    return wrapVoid(() => supabaseDeleteRoutine(id))
  },
  bundles: async (_request, _resource, rest) => {
    const [slug] = rest
    if (!slug) return notFound()
    return wrapVoid(() => supabaseDeleteBundle(slug))
  },
  banners: async (_request, _resource, rest) => {
    const [id] = rest
    if (!id) return notFound()
    const existing = await supabaseGetBanners()
    return wrapVoid(() => supabaseSaveBanners(existing.filter((b) => b.id !== id)))
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
) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin
  const { resource } = await params
  const [resourceName, ...rest] = resource
  const handler = map[resourceName]
  if (!handler) return notFound()
  return handler(request, resource, rest)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string[] }> },
) {
  return dispatch(request, params, getHandlers)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string[] }> },
) {
  return dispatch(request, params, postHandlers)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string[] }> },
) {
  return dispatch(request, params, putHandlers)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string[] }> },
) {
  return dispatch(request, params, deleteHandlers)
}
