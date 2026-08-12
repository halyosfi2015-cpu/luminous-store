'use server'

import { createAdminClient } from '@/src/lib/supabase'
import { ANALYTICS_EVENT_TYPES } from './types'

export type RecommendationType =
  | 'personalized'
  | 'similar'
  | 'complementary'
  | 'trending'
  | 'category_based'
  | 'routine_based'
  | 'bundle_based'

export type RecommendationSource =
  | 'behavioral'
  | 'rule'
  | 'ai'
  | 'manual'
  | 'fallback'

export interface RecommendationItem {
  product_id: string
  name?: string
  score: number
  reason: string
  type: RecommendationType
  source: RecommendationSource
  metadata?: Record<string, unknown>
}

type DbProduct = {
  id: string
  category_id: string
  brand_id: string | null
  tags: string[]
}

export interface RecommendationContext {
  customerId?: string
  sessionId?: string
  productId?: string
  categoryId?: string
  routineId?: string
  bundleId?: string
  limit?: number
  excludeIds?: string[]
}

export interface RecommendationService {
  getRecommendations: (context: RecommendationContext) => Promise<RecommendationItem[]>
  getPersonalized: (customerId: string, limit?: number, excludeIds?: string[]) => Promise<RecommendationItem[]>
  getSimilar: (productId: string, limit?: number, excludeIds?: string[]) => Promise<RecommendationItem[]>
  getComplementary: (productId: string, limit?: number, excludeIds?: string[]) => Promise<RecommendationItem[]>
  getTrending: (limit?: number, rangeDays?: number, excludeIds?: string[]) => Promise<RecommendationItem[]>
  getCategoryBased: (categoryId: string, limit?: number, excludeIds?: string[]) => Promise<RecommendationItem[]>
  getRoutineBased: (routineId: string, limit?: number, excludeIds?: string[]) => Promise<RecommendationItem[]>
  getBundleBased: (bundleId: string, limit?: number, excludeIds?: string[]) => Promise<RecommendationItem[]>
}

async function getProductBasicInfo(productIds: string[]): Promise<Map<string, { name?: string; category_id?: string; pricing?: { price: number; currency: string }; image?: string }>> {
  if (productIds.length === 0) return new Map()
  const supabase = createAdminClient()
  const { data: products } = await supabase
    .from('products')
    .select('id, name, category_id, pricing, image')
    .in('id', productIds)

  const map = new Map()
  for (const p of (products ?? []) as Array<{ id: string; name: { ar: string; en: string }; category_id: string; pricing: { price: number; currency: string }; image?: string }>) {
    map.set(p.id, {
      name: p.name?.ar ?? p.name?.en ?? p.id.slice(0, 8),
      category_id: p.category_id,
      pricing: p.pricing,
      image: p.image,
    })
  }
  return map
}

async function getRecommendationsCore(context: RecommendationContext): Promise<RecommendationItem[]> {
  const {
    customerId,
    sessionId: _sessionId,
    productId,
    categoryId,
    routineId,
    bundleId,
    limit = 10,
    excludeIds = [],
  } = context

  const recommendations: RecommendationItem[] = []

  if (customerId) {
    const personalized = await getPersonalizedRecommendations(customerId, limit, excludeIds)
    recommendations.push(...personalized)
  }

  if (productId) {
    const similar = await getSimilarProducts(productId, Math.ceil(limit / 2), excludeIds)
    recommendations.push(...similar)

    const complementary = await getComplementaryProducts(productId, Math.ceil(limit / 2), excludeIds)
    recommendations.push(...complementary)
  }

  if (categoryId) {
    const categoryBased = await getCategoryRecommendations(categoryId, Math.ceil(limit / 2), excludeIds)
    recommendations.push(...categoryBased)
  }

  if (routineId) {
    const routineBased = await getRoutineRecommendations(routineId, Math.ceil(limit / 2), excludeIds)
    recommendations.push(...routineBased)
  }

  if (bundleId) {
    const bundleBased = await getBundleRecommendations(bundleId, Math.ceil(limit / 2), excludeIds)
    recommendations.push(...bundleBased)
  }

  if (recommendations.length < limit) {
    const trending = await getTrendingProducts(limit - recommendations.length, 7, excludeIds)
    recommendations.push(...trending)
  }

  const seen = new Set<string>(excludeIds)
  const unique = recommendations.filter(r => {
    if (seen.has(r.product_id)) return false
    seen.add(r.product_id)
    return true
  })

  unique.sort((a, b) => b.score - a.score)

  const productIds = unique.slice(0, limit).map(r => r.product_id)
  const productInfo = await getProductBasicInfo(productIds)

  return unique.slice(0, limit).map(r => ({
    ...r,
    name: productInfo.get(r.product_id)?.name,
  }))
}

async function getPersonalizedRecommendations(
  customerId: string,
  limit: number,
  excludeIds: string[]
): Promise<RecommendationItem[]> {
  const supabase = createAdminClient()
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: events } = await supabase
    .from('customer_events')
    .select('event_type, entity_id, properties')
    .eq('customer_id', customerId)
    .gte('occurred_at', since30d)
    .in('event_type', [
      ANALYTICS_EVENT_TYPES.PRODUCT_VIEW,
      ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_CART,
      ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_WISHLIST,
      ANALYTICS_EVENT_TYPES.PURCHASE_COMPLETED,
    ])

  const eventList = (events ?? []) as Array<{ event_type: string; entity_id: string | null; properties: Record<string, unknown> | null }>

  const productScores = new Map<string, number>()
  const productReasons = new Map<string, string>()

  for (const e of eventList) {
    const pid = e.entity_id
    if (!pid || excludeIds.includes(pid)) continue

    const currentScore = productScores.get(pid) ?? 0

    switch (e.event_type) {
      case ANALYTICS_EVENT_TYPES.PURCHASE_COMPLETED:
        productScores.set(pid, currentScore + 50)
        productReasons.set(pid, 'purchased previously')
        break
      case ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_CART:
        productScores.set(pid, currentScore + 15)
        productReasons.set(pid, 'added to cart')
        break
      case ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_WISHLIST:
        productScores.set(pid, currentScore + 10)
        productReasons.set(pid, 'added to wishlist')
        break
      case ANALYTICS_EVENT_TYPES.PRODUCT_VIEW:
        productScores.set(pid, currentScore + 2)
        productReasons.set(pid, 'viewed recently')
        break
    }
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('id, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(5)

  const orderIds = (orders ?? []).map(o => (o as { id: string }).id)

  if (orderIds.length > 0) {
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id')
      .in('order_id', orderIds)

    for (const item of (orderItems ?? []) as Array<{ product_id: string }>) {
      const pid = item.product_id
      if (excludeIds.includes(pid)) continue
      const current = productScores.get(pid) ?? 0
      productScores.set(pid, current + 30)
      productReasons.set(pid, 'purchased in recent order')
    }
  }

  return Array.from(productScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([pid, score]) => ({
      product_id: pid,
      score: Math.min(score, 100),
      reason: productReasons.get(pid) ?? 'behavioral signal',
      type: 'personalized' as RecommendationType,
      source: 'behavioral' as RecommendationSource,
      metadata: { behavioral_score: score },
    }))
}

async function getSimilarProducts(
  productId: string,
  limit: number,
  excludeIds: string[]
): Promise<RecommendationItem[]> {
  const supabase = createAdminClient()

  const { data: product } = await supabase
    .from('products')
    .select('category_id, brand_id, tags')
    .eq('id', productId)
    .maybeSingle<DbProduct>()

  if (!product) return []

  const excludeSet = new Set([productId, ...excludeIds])

  const { data: similar } = await supabase
    .from('products')
    .select('id, name, category_id, brand_id, tags')
    .neq('id', productId)
    .or(`category_id.eq.${product.category_id},brand_id.eq.${product.brand_id}`)
    .limit(limit * 3)

  const results: RecommendationItem[] = []

  for (const p of (similar ?? []) as DbProduct[]) {
    if (excludeSet.has(p.id)) continue

    let score = 0
    const reasons: string[] = []

    if (p.category_id === product.category_id) {
      score += 30
      reasons.push('same category')
    }
    if (p.brand_id === product.brand_id) {
      score += 20
      reasons.push('same brand')
    }

    if (score > 0) {
      results.push({
        product_id: p.id,
        score: Math.min(score, 100),
        reason: reasons.join(', ') || 'similar product',
        type: 'similar' as RecommendationType,
        source: 'rule' as RecommendationSource,
        metadata: { similarity_score: score },
      })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}

async function getComplementaryProducts(
  productId: string,
  limit: number,
  excludeIds: string[]
): Promise<RecommendationItem[]> {
  const supabase = createAdminClient()
  const excludeSet = new Set([productId, ...excludeIds])

  const { data: bundles } = await supabase
    .from('bundle_products')
    .select('bundle_id, product_id')
    .eq('product_id', productId)

  const bundleIds = (bundles ?? []).map(b => (b as { bundle_id: string }).bundle_id)

  if (bundleIds.length === 0) {
    const { data: routines } = await supabase
      .from('routine_steps')
      .select('routine_id, product_id')
      .eq('product_id', productId)

    const routineIds = (routines ?? []).map(r => (r as { routine_id: string }).routine_id)

    if (routineIds.length > 0) {
      const { data: routineProducts } = await supabase
        .from('routine_steps')
        .select('product_id')
        .in('routine_id', routineIds)
        .neq('product_id', productId)

      const results: RecommendationItem[] = []
      for (const rp of (routineProducts ?? []) as Array<{ product_id: string }>) {
        if (excludeSet.has(rp.product_id)) continue
        results.push({
          product_id: rp.product_id,
          score: 40,
          reason: 'part of same routine',
          type: 'complementary' as RecommendationType,
          source: 'rule' as RecommendationSource,
          metadata: { routine_based: true },
        })
      }
      return results.slice(0, limit)
    }
    return []
  }

  const { data: bundleProducts } = await supabase
    .from('bundle_products')
    .select('product_id, bundle_id')
    .in('bundle_id', bundleIds)
    .neq('product_id', productId)

  const results: RecommendationItem[] = []
  for (const bp of (bundleProducts ?? []) as Array<{ product_id: string; bundle_id: string }>) {
    if (excludeSet.has(bp.product_id)) continue
    results.push({
      product_id: bp.product_id,
      score: 45,
      reason: 'frequently bought together in bundles',
      type: 'complementary' as RecommendationType,
      source: 'rule' as RecommendationSource,
      metadata: { bundle_id: bp.bundle_id },
    })
  }

  return results.slice(0, limit)
}

async function getCategoryRecommendations(
  categoryId: string,
  limit: number,
  excludeIds: string[]
): Promise<RecommendationItem[]> {
  const supabase = createAdminClient()
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: events } = await supabase
    .from('customer_events')
    .select('entity_id, event_type')
    .eq('entity_id', categoryId)
    .in('event_type', [ANALYTICS_EVENT_TYPES.CATEGORY_VIEW, ANALYTICS_EVENT_TYPES.PRODUCT_VIEW])
    .gte('occurred_at', since30d)

  const categoryViews = (events ?? []).length

  const { data: products } = await supabase
    .from('products')
    .select('id')
    .eq('category_id', categoryId)
    .limit(limit * 2)

  const excludeSet = new Set(excludeIds)
  const results: RecommendationItem[] = []

  for (const p of (products ?? []) as Array<{ id: string }>) {
    if (excludeSet.has(p.id)) continue
    results.push({
      product_id: p.id,
      score: 20 + Math.min(categoryViews, 30),
      reason: 'popular in this category',
      type: 'category_based' as RecommendationType,
      source: 'rule' as RecommendationSource,
      metadata: { category_id: categoryId, category_views: categoryViews },
    })
  }

  return results.slice(0, limit)
}

async function getRoutineRecommendations(
  routineId: string,
  limit: number,
  excludeIds: string[]
): Promise<RecommendationItem[]> {
  const supabase = createAdminClient()
  const excludeSet = new Set(excludeIds)

  const { data: steps } = await supabase
    .from('routine_steps')
    .select('product_id, step_order')
    .eq('routine_id', routineId)
    .order('step_order')

  const results: RecommendationItem[] = []
  for (const step of (steps ?? []) as Array<{ product_id: string; step_order: number }>) {
    if (excludeSet.has(step.product_id)) continue
    results.push({
      product_id: step.product_id,
      score: 50,
      reason: `step ${step.step_order} of this routine`,
      type: 'routine_based' as RecommendationType,
      source: 'rule' as RecommendationSource,
      metadata: { routine_id: routineId, step_order: step.step_order },
    })
  }

  return results.slice(0, limit)
}

async function getBundleRecommendations(
  bundleId: string,
  limit: number,
  excludeIds: string[]
): Promise<RecommendationItem[]> {
  const supabase = createAdminClient()
  const excludeSet = new Set(excludeIds)

  const { data: bundleProducts } = await supabase
    .from('bundle_products')
    .select('product_id')
    .eq('bundle_id', bundleId)

  const results: RecommendationItem[] = []
  for (const bp of (bundleProducts ?? []) as Array<{ product_id: string }>) {
    if (excludeSet.has(bp.product_id)) continue
    results.push({
      product_id: bp.product_id,
      score: 60,
      reason: 'included in this bundle',
      type: 'bundle_based' as RecommendationType,
      source: 'rule' as RecommendationSource,
      metadata: { bundle_id: bundleId },
    })
  }

  return results.slice(0, limit)
}

async function getTrendingProducts(
  limit: number,
  rangeDays: number,
  excludeIds: string[]
): Promise<RecommendationItem[]> {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString()
  const excludeSet = new Set(excludeIds)

  const { data: events } = await supabase
    .from('customer_events')
    .select('entity_id, event_type')
    .in('event_type', [
      ANALYTICS_EVENT_TYPES.PRODUCT_VIEW,
      ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_CART,
      ANALYTICS_EVENT_TYPES.PURCHASE_COMPLETED,
    ])
    .gte('occurred_at', since)

  const productScores = new Map<string, number>()
  for (const e of (events ?? []) as Array<{ entity_id: string | null; event_type: string }>) {
    if (!e.entity_id || excludeSet.has(e.entity_id)) continue
    const weight = e.event_type === 'purchase_completed' ? 10 : e.event_type === 'product_added_to_cart' ? 5 : 1
    productScores.set(e.entity_id, (productScores.get(e.entity_id) ?? 0) + weight)
  }

  return Array.from(productScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([pid, score]) => ({
      product_id: pid,
      score: Math.min(score * 2, 100),
      reason: 'trending now',
      type: 'trending' as RecommendationType,
      source: 'behavioral' as RecommendationSource,
      metadata: { trending_score: score, range_days: rangeDays },
    }))
  }
