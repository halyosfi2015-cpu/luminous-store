import 'server-only'
import { createAdminClient } from '@/src/lib/supabase'
import {
  getOverview,
  getFunnel,
  getTopProducts,
  getTopCategories,
} from '@/src/lib/analytics/aggregations'
import { getCustomerProfile } from '@/src/lib/analytics/profile'
import { evaluateCustomerSegments, evaluateCustomerSegmentsBatch } from '@/src/lib/analytics/segments'
import { evaluatePurchaseIntent, evaluatePurchaseIntentBatch } from '@/src/lib/analytics/intent'
import { RANGE_DAYS, type AnalyticsRange, type SegmentKey, type IntentLevel } from '@/src/lib/analytics/types'
import { SEGMENT_LABELS } from '@/src/lib/analytics/segments'
import { createHash } from 'crypto'

export const CONTEXT_VERSION = 'commerce_context_v1'
export const CONTEXT_MAX_PRODUCTS = 8
export const CONTEXT_MAX_CATEGORIES = 8
export const CONTEXT_MAX_CUSTOMERS_IN_DIST = 200
export const MERCHANDISING_CONTEXT_VERSION = 'merchandising_context_v1'

export interface CommerceContext {
  version: string
  range: AnalyticsRange
  overview: {
    visitors: number
    sessions: number
    product_views: number
    add_to_cart: number
    checkout_started: number
    purchases: number
    revenue: number
    conversion_rate: number
    cart_abandonment_rate: number
    checkout_abandonment_rate: number
  }
  funnel: Array<{ stage: string; label_en: string; label_ar: string; count: number; drop_from_prev?: number | null }>
  topProducts: Array<{
    product_id: string
    name?: string
    views: number
    add_to_cart: number
    purchases: number
    revenue: number
  }>
  topCategories: Array<{
    category_id: string
    name?: string
    views: number
    add_to_cart: number
    purchases: number
    revenue: number
  }>
  segmentDistribution: Record<SegmentKey, number>
  intentDistribution: Record<IntentLevel, number>
  totalCustomers: number
}

export interface CustomerContext {
  version: string
  customer_id: string
  profile: {
    first_seen: string | null
    last_active_at: string | null
    total_sessions: number
    total_page_views: number
    total_product_views: number
    total_cart_additions: number
    total_orders: number
    total_spent: number
    average_order_value: number
    last_purchase_at: string | null
  }
  segments: Array<{ key: SegmentKey; label_ar: string; label_en: string; reason: string }>
  intent: {
    score: number
    level: IntentLevel
    signals: Record<string, number>
  }
  recentActivity: Array<{ event_type: string; occurred_at: string }>
}

export interface ProductContext {
  version: string
  product_id: string
  name: string
  category: string
  price: number
  currency: string
  views: number
  add_to_cart: number
  purchases: number
  revenue: number
  rating: number
  review_count: number
  in_stock: boolean
  is_featured: boolean
  is_new: boolean
  is_best_seller: boolean
  stock_quantity: number
}

export async function buildCommerceContext(range: AnalyticsRange): Promise<CommerceContext> {
  const [overview, funnel, topProducts, topCategories] = await Promise.all([
    getOverview(range),
    getFunnel(range),
    getTopProducts(range, CONTEXT_MAX_PRODUCTS),
    getTopCategories(range, CONTEXT_MAX_CATEGORIES),
  ])

  const supabase = createAdminClient()

  const productIds = Array.from(new Set(topProducts.map((p) => p.product_id)))
  const categoryIds = Array.from(new Set(topCategories.map((c) => c.category_id)))

  const productNames: Record<string, string> = {}
  const categoryNames: Record<string, string> = {}

  if (productIds.length > 0) {
    const { data: prods } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds)
    for (const p of (prods ?? []) as Array<{ id: string; name: { ar: string; en: string } }>) {
      productNames[p.id] = p.name?.ar ?? p.name?.en ?? p.id.slice(0, 8)
    }
  }

  if (categoryIds.length > 0) {
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name')
      .in('id', categoryIds)
    for (const c of (cats ?? []) as Array<{ id: string; name: { ar?: string; en?: string } }>) {
      categoryNames[c.id] = c.name?.ar ?? c.name?.en ?? c.id.slice(0, 8)
    }
  }

  const { data: customersRes } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
  const totalCustomers = customersRes?.length ? customersRes.length : 0

  const { data: allCustomers } = await supabase
    .from('customers')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(CONTEXT_MAX_CUSTOMERS_IN_DIST)
  const customerIds = (allCustomers ?? []).map((c) => (c as { id: string }).id)

  const segmentDistribution: Record<SegmentKey, number> = {
    new_customer: 0,
    returning_customer: 0,
    cart_abandoner: 0,
    category_interest: 0,
    high_intent: 0,
    high_value: 0,
    at_risk: 0,
    inactive: 0,
  }
  const intentDistribution: Record<IntentLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
    very_high: 0,
  }

  // Use batch APIs to avoid N+1 queries
  const [segBatch, intentBatch] = await Promise.all([
    evaluateCustomerSegmentsBatch(customerIds),
    evaluatePurchaseIntentBatch(customerIds),
  ])

  for (const cid of customerIds) {
    const segEval = segBatch.get(cid)
    if (segEval) {
      for (const s of segEval.segments) {
        segmentDistribution[s] = (segmentDistribution[s] ?? 0) + 1
      }
    }
    const intentEval = intentBatch.get(cid)
    if (intentEval) {
      intentDistribution[intentEval.level] = (intentDistribution[intentEval.level] ?? 0) + 1
    }
  }

  return {
    version: CONTEXT_VERSION,
    range,
    overview,
    funnel: funnel.stages.map((s) => ({
      stage: s.key,
      label_en: s.label_en,
      label_ar: s.label_ar,
      count: s.count,
      drop_from_prev: null,
    })),
    topProducts: topProducts.map((p) => ({
      product_id: p.product_id,
      name: productNames[p.product_id] ?? undefined,
      views: p.views,
      add_to_cart: p.add_to_cart,
      purchases: p.purchases,
      revenue: p.revenue,
    })),
    topCategories: topCategories.map((c) => ({
      category_id: c.category_id,
      name: categoryNames[c.category_id] ?? undefined,
      views: c.views,
      add_to_cart: c.add_to_cart,
      purchases: c.purchases,
      revenue: c.revenue,
    })),
    segmentDistribution,
    intentDistribution,
    totalCustomers,
  }
}

export async function buildCustomerContext(customerId: string): Promise<CustomerContext | null> {
  const profile = await getCustomerProfile(customerId)
  if (!profile) return null

  const [segments, intent] = await Promise.all([
    evaluateCustomerSegments(customerId),
    evaluatePurchaseIntent(customerId, null),
  ])

  const supabase = createAdminClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentEvents } = await supabase
    .from('customer_events')
    .select('event_type, occurred_at')
    .eq('customer_id', customerId)
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false })
    .limit(20)

  const recentActivity = (recentEvents ?? []).map((e: { event_type: string; occurred_at: string }) => ({
    event_type: e.event_type,
    occurred_at: e.occurred_at,
  }))

  return {
    version: CONTEXT_VERSION,
    customer_id: customerId,
    profile: {
      first_seen: profile.first_seen,
      last_active_at: profile.last_active_at,
      total_sessions: profile.total_sessions,
      total_page_views: profile.total_page_views,
      total_product_views: profile.total_product_views,
      total_cart_additions: profile.total_cart_additions,
      total_orders: profile.total_orders,
      total_spent: profile.total_spent,
      average_order_value: profile.average_order_value,
      last_purchase_at: profile.last_purchase_at,
    },
    segments: segments.segments.map((s) => ({
      key: s,
      label_ar: SEGMENT_LABELS[s]?.ar ?? s,
      label_en: SEGMENT_LABELS[s]?.en ?? s,
      reason: segments.reasons[s] ?? '',
    })),
    intent: {
      score: intent.score,
      level: intent.level,
      signals: intent.signals,
    },
    recentActivity,
  }
}

export async function buildProductContext(productId: string): Promise<ProductContext | null> {
  const supabase = createAdminClient()
  const { data: product } = await supabase
    .from('products')
    .select('id, name, pricing, stock, stock_quantity, in_stock, rating, review_count, is_featured, is_new, is_best_seller, category_id, categories(name)')
    .eq('id', productId)
    .maybeSingle()

  if (!product) return null

  const row = product as Record<string, unknown>
  const name = (row.name as { ar?: string; en?: string })?.ar ?? (row.name as { ar?: string; en?: string })?.en ?? productId
  const pricing = row.pricing as { price?: number; currency?: string } | null
  const catName = (row.categories as { name?: { ar?: string; en?: string } })?.name?.ar
    ?? (row.categories as { name?: { ar?: string; en?: string } })?.name?.en
    ?? ''

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: events } = await supabase
    .from('customer_events')
    .select('event_type')
    .eq('entity_id', productId)
    .gte('occurred_at', since30d)

  let views = 0, addToCart = 0, purchases = 0
  for (const e of (events ?? []) as Array<{ event_type: string }>) {
    if (e.event_type === 'product_view') views++
    else if (e.event_type === 'product_added_to_cart') addToCart++
    else if (e.event_type === 'purchase_completed') purchases++
  }

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('quantity, total_price')
    .eq('product_id', productId)

  let revenue = 0
  for (const oi of (orderItems ?? []) as Array<{ quantity?: number; total_price?: number }>) {
    revenue += (oi.total_price ?? 0)
  }

  return {
    version: CONTEXT_VERSION,
    product_id: productId,
    name,
    category: catName,
    price: pricing?.price ?? 0,
    currency: pricing?.currency ?? 'YER',
    views,
    add_to_cart: addToCart,
    purchases,
    revenue,
    rating: Number(row.rating ?? 0),
    review_count: Number(row.review_count ?? 0),
    in_stock: row.in_stock !== false && Number(row.stock ?? row.stock_quantity ?? 0) > 0,
    is_featured: row.is_featured === true,
    is_new: row.is_new === true,
    is_best_seller: row.is_best_seller === true,
    stock_quantity: Number(row.stock ?? row.stock_quantity ?? 0),
  }
}

export async function buildMerchandisingContext(productId: string): Promise<{
  version: string
  product_id: string
  name: string
  category: string
  price: number
  currency: string
  original_price: number
  discount_percent: number | null
  in_stock: boolean
  is_featured: boolean
  is_new: boolean
  is_best_seller: boolean
  views: number
  add_to_cart: number
  purchases: number
  revenue: number
  status: string
} | null> {
  const supabase = createAdminClient()

  const { data: product } = await supabase
    .from('products')
    .select('id, name, category_id, pricing, stock, in_stock, is_featured, is_new, is_best_seller, rating, review_count, stock_quantity, base_price, has_real_discount, status')
    .eq('id', productId)
    .maybeSingle()

  if (!product) return null

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: events } = await supabase
    .from('customer_events')
    .select('event_type, properties')
    .eq('entity_id', productId)
    .in('event_type', ['product_view', 'product_added_to_cart', 'purchase_completed'])
    .gte('occurred_at', since30d)

  const evts = (events ?? []) as Array<{ event_type: string; properties: Record<string, unknown> | null }>
  let views = 0
  let add_to_cart = 0
  let purchases = 0
  const orderIds = new Set<string>()

  for (const e of evts) {
    if (e.event_type === 'product_view') views++
    if (e.event_type === 'product_added_to_cart') add_to_cart++
    if (e.event_type === 'purchase_completed') {
      purchases++
      const props = e.properties ?? {}
      const oid = props.order_id as string | undefined
      if (oid) orderIds.add(oid)
    }
  }

  const productRow = product as unknown as {
    id: string
    name: { ar: string; en: string }
    category_id: string
    pricing: { price: number; currency: string; originalPrice?: number }
    stock: number
    in_stock: boolean
    is_featured: boolean
    is_new: boolean
    is_best_seller: boolean
    rating: number | string
    review_count: number
    stock_quantity: number
    base_price: number
    has_real_discount: boolean
    status: string
  }

  const revenue = purchases * Number(productRow.pricing?.price ?? 0)

  let categoryName = productRow.category_id
  if (productRow.category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('name')
      .eq('id', productRow.category_id)
      .maybeSingle()
    if (cat) {
      const catRow = cat as { name: { ar?: string; en?: string } }
      categoryName = catRow.name?.ar ?? catRow.name?.en ?? productRow.category_id
    }
  }

  const productName = productRow.name?.ar ?? productRow.name?.en ?? productId.slice(0, 8)

  const discountPercent = productRow.has_real_discount
    ? Math.round((1 - Number(productRow.pricing?.price ?? productRow.base_price) / productRow.base_price * 100))
    : null

  return {
    version: MERCHANDISING_CONTEXT_VERSION,
    product_id: productId,
    name: productName,
    category: categoryName,
    price: Number(productRow.pricing?.price ?? 0),
    currency: productRow.pricing?.currency ?? 'YER',
    original_price: productRow.base_price,
    discount_percent: discountPercent,
    in_stock: productRow.in_stock ?? productRow.stock > 0,
    is_featured: productRow.is_featured ?? false,
    is_new: productRow.is_new ?? false,
    is_best_seller: productRow.is_best_seller ?? false,
    views,
    add_to_cart,
    purchases,
    revenue,
    status: productRow.status ?? 'draft',
  }
}

export function serializeContextForPrompt(context: CommerceContext | CustomerContext | ProductContext | ({
  version: string
  product_id: string
  name: string
  category: string
  price: number
  currency: string
  original_price: number
  discount_percent: number | null
  in_stock: boolean
  is_featured: boolean
  is_new: boolean
  is_best_seller: boolean
  views: number
  add_to_cart: number
  purchases: number
  revenue: number
  status: string
})): string {
  return JSON.stringify(context, null, 2)
}

export function hashContext(context: unknown): string {
  const serialized = serializeContextForPrompt(
    context as CommerceContext | CustomerContext | ProductContext | {
      version: string
      product_id: string
      name: string
      category: string
      price: number
      currency: string
      original_price: number
      discount_percent: number | null
      in_stock: boolean
      is_featured: boolean
      is_new: boolean
      is_best_seller: boolean
      views: number
      add_to_cart: number
      purchases: number
      revenue: number
      status: string
    }
  )
  return createHash('sha256').update(serialized).digest('hex').slice(0, 16)
}

export function contextSummary(context: CommerceContext | CustomerContext | ProductContext | {
  version: string
  product_id: string
  name: string
  category: string
  price: number
  currency: string
  original_price: number
  discount_percent: number | null
  in_stock: boolean
  is_featured: boolean
  is_new: boolean
  is_best_seller: boolean
  views: number
  add_to_cart: number
  purchases: number
  revenue: number
  status: string
}): string {
  if ('overview' in context) {
    return `Commerce overview for range="${context.range}": visitors=${context.overview.visitors}, purchases=${context.overview.purchases}, revenue=${context.overview.revenue}, conversion=${Math.round(context.overview.conversion_rate * 100)}%`
  }
  if ('profile' in context) {
    return `Customer ${context.customer_id.slice(0, 8)}: orders=${context.profile.total_orders}, spent=${context.profile.total_spent}, intent=${context.intent.level}`
  }
  // Simplified: just return generic summary without property access that may fail
  return 'unknown context'
}

export { RANGE_DAYS }
