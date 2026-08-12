'use server'

import { createAdminClient } from '@/src/lib/supabase'
import { evaluatePurchaseIntent } from './intent'
import { evaluateCustomerSegments } from './segments'
import { getSetting, setSetting } from '@/src/lib/site-settings'

export type PersonalizationActionType =
  | 'reorder_products'
  | 'filter_products'
  | 'show_banner'
  | 'hide_section'
  | 'show_campaign'
  | 'reorder_recommendations'
  | 'adjust_pricing_display'

export type PersonalizationConditionType =
  | 'segment'
  | 'intent_level'
  | 'customer_value'
  | 'category_interest'
  | 'cart_status'
  | 'recent_activity'
  | 'purchase_history'
  | 'session_property'
  | 'geo_location'
  | 'device_type'

export type PersonalizationConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'

export interface PersonalizationCondition {
  id?: string
  type: PersonalizationConditionType
  operator: PersonalizationConditionOperator
  value: string | number | boolean | string[] | number[]
  field?: string
}

export interface PersonalizationAction {
  type: PersonalizationActionType
  priority: number
  config: Record<string, unknown>
}

export type PersonalizationContextKey =
  | 'homepage'
  | 'product_page'
  | 'category_page'
  | 'cart'
  | 'checkout'
  | 'search'
  | 'recommendation'

export interface PersonalizationRule {
  id: string
  name: string
  nameAr: string
  description?: string
  descriptionAr?: string
  conditions: PersonalizationCondition[]
  actions: PersonalizationAction[]
  priority: number
  enabled: boolean
  startDate?: string
  endDate?: string
  targetSegments?: string[]
  context?: PersonalizationContextKey
  createdAt: string
  updatedAt: string
}

export interface PersonalizationContext {
  customerId?: string
  sessionId?: string
  pathname?: string
  cartItemCount?: number
  cartValue?: number
  deviceType?: 'mobile' | 'desktop' | 'tablet'
  geoCountry?: string
  geoCity?: string
  referrer?: string
}

export interface PersonalizationResult {
  matchedRules: PersonalizationRule[]
  actions: PersonalizationAction[]
  context: PersonalizationContext
}

export interface PersonalizationService {
  getRules: () => Promise<PersonalizationRule[]>
  getRule: (id: string) => Promise<PersonalizationRule | null>
  createRule: (rule: Omit<PersonalizationRule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PersonalizationRule>
  updateRule: (id: string, updates: Partial<PersonalizationRule>) => Promise<PersonalizationRule | null>
  deleteRule: (id: string) => Promise<boolean>
  evaluate: (context: PersonalizationContext) => Promise<PersonalizationResult>
  isEnabled: () => Promise<boolean>
  setEnabled: (enabled: boolean) => Promise<void>
}

const DAY_MS = 24 * 60 * 60 * 1000

const SETTINGS_KEY = 'ai.personalization.enabled'

function slugify(value: string): string {
  const latin = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const arabic = value.trim()
  if (latin) return latin
  if (arabic) return `rule-${Math.random().toString(36).slice(2, 8)}`
  return `rule-${Math.random().toString(36).slice(2, 8)}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function pickString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value
  return undefined
}

function isSegmentInCondition(condition: PersonalizationCondition): boolean {
  return (
    condition.type === 'segment' &&
    condition.operator === 'in' &&
    Array.isArray(condition.value) &&
    condition.value.length > 0
  )
}

/**
 * personalization_rules has no dedicated target_segments column, so segments
 * are persisted inside the `conditions` JSONB as a `segment / in` condition.
 */
function conditionsFromRule(rule: {
  conditions: PersonalizationCondition[]
  targetSegments?: string[]
}): PersonalizationCondition[] {
  const segments = rule.targetSegments?.map(String).filter(Boolean) ?? []
  if (segments.length === 0) return rule.conditions ?? []
  const existing = (rule.conditions ?? []).find((c) =>
    isSegmentInCondition(c) &&
    (c.value as string[]).join('|') === segments.join('|')
  )
  if (existing) return rule.conditions ?? []
  return [
    { type: 'segment', operator: 'in', value: segments },
    ...(rule.conditions ?? []),
  ]
}

function targetSegmentsFromConditions(conditions: PersonalizationCondition[]): string[] | undefined {
  const all = new Set<string>()
  for (const c of conditions) {
    if (isSegmentInCondition(c)) {
      for (const v of c.value as string[]) all.add(v)
    }
  }
  return all.size > 0 ? Array.from(all) : undefined
}

function rowToRule(row: Record<string, unknown>): PersonalizationRule {
  const name = (row.name as { ar?: string; en?: string } | undefined) ?? {}
  const description = (row.description as { ar?: string; en?: string } | undefined) ?? {}
  const conditions = Array.isArray(row.conditions) ? (row.conditions as PersonalizationCondition[]) : []
  const actions = Array.isArray(row.actions) ? (row.actions as PersonalizationAction[]) : []
  return {
    id: String(row.id ?? ''),
    name: pickString(name.en) ?? '',
    nameAr: pickString(name.ar) ?? '',
    description: pickString(description.en),
    descriptionAr: pickString(description.ar),
    conditions,
    actions,
    priority: Number(row.priority ?? 0),
    enabled: Boolean(row.is_active ?? true),
    startDate: row.starts_at ? new Date(String(row.starts_at)).toISOString() : undefined,
    endDate: row.ends_at ? new Date(String(row.ends_at)).toISOString() : undefined,
    targetSegments: targetSegmentsFromConditions(conditions),
    context: (row.context as PersonalizationContextKey | undefined) ?? undefined,
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : nowIso(),
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : nowIso(),
  }
}

function ruleToRow(
  rule: Omit<PersonalizationRule, 'id' | 'createdAt' | 'updatedAt'> | Partial<PersonalizationRule>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  const nameEn = pickString(rule.name) ?? ''
  const nameAr = pickString(rule.nameAr) ?? ''
  if (nameEn || nameAr) row.name = { ar: nameAr, en: nameEn }
  const descEn = pickString(rule.description)
  const descAr = pickString(rule.descriptionAr)
  if (descEn || descAr) row.description = { ar: descAr ?? '', en: descEn ?? '' }
  if (rule.conditions !== undefined || rule.targetSegments !== undefined) {
    row.conditions = conditionsFromRule({
      conditions: rule.conditions ?? [],
      targetSegments: rule.targetSegments,
    })
  }
  if (rule.actions !== undefined) row.actions = rule.actions
  if (rule.priority !== undefined) row.priority = Number(rule.priority)
  if (rule.enabled !== undefined) row.is_active = Boolean(rule.enabled)
  if (rule.startDate !== undefined) row.starts_at = rule.startDate || null
  if (rule.endDate !== undefined) row.ends_at = rule.endDate || null
  if (rule.context !== undefined) row.context = rule.context
  return row
}

function evaluateCondition(
  condition: PersonalizationCondition,
  profile: Record<string, unknown> | null,
  segments: string[],
  intent: { level: string; score: number },
  context: PersonalizationContext
): boolean {
  switch (condition.type) {
    case 'segment':
      return condition.operator === 'in'
        ? (condition.value as string[]).some(v => segments.includes(v))
        : segments.includes(condition.value as string)

    case 'intent_level':
      const intentLevel = intent.level
      if (condition.operator === 'equals') return intentLevel === condition.value
      if (condition.operator === 'in') return (condition.value as string[]).includes(intentLevel)
      if (condition.operator === 'greater_than') {
        const levels = ['low', 'medium', 'high', 'very_high']
        return levels.indexOf(intentLevel) > levels.indexOf(condition.value as string)
      }
      if (condition.operator === 'less_than') {
        const levels = ['low', 'medium', 'high', 'very_high']
        return levels.indexOf(intentLevel) < levels.indexOf(condition.value as string)
      }
      return false

    case 'customer_value':
      const totalSpent = Number(profile?.total_spent ?? 0)
      if (condition.operator === 'greater_than') return totalSpent > (condition.value as number)
      if (condition.operator === 'less_than') return totalSpent < (condition.value as number)
      if (condition.operator === 'equals') return totalSpent === (condition.value as number)
      return false

    case 'category_interest':
      return condition.operator === 'in'
        ? (condition.value as string[]).some(v => String(profile?.category_interest ?? '').includes(v))
        : String(profile?.category_interest ?? '').includes(condition.value as string)

    case 'cart_status':
      const cartCount = context.cartItemCount ?? 0
      const cartValue = context.cartValue ?? 0
      if (condition.field === 'count') {
        if (condition.operator === 'equals') return cartCount === (condition.value as number)
        if (condition.operator === 'greater_than') return cartCount > (condition.value as number)
        if (condition.operator === 'less_than') return cartCount < (condition.value as number)
      }
      if (condition.field === 'value') {
        if (condition.operator === 'greater_than') return cartValue > (condition.value as number)
        if (condition.operator === 'less_than') return cartValue < (condition.value as number)
      }
      return false

    case 'recent_activity':
      const lastActive = profile?.last_active_at as string | null
      if (!lastActive) return false
      const daysSince = Math.floor((Date.now() - new Date(lastActive).getTime()) / DAY_MS)
      if (condition.operator === 'less_than') return daysSince < (condition.value as number)
      if (condition.operator === 'greater_than') return daysSince > (condition.value as number)
      return false

    case 'purchase_history':
      const totalOrders = Number(profile?.total_orders ?? 0)
      if (condition.operator === 'equals') return totalOrders === (condition.value as number)
      if (condition.operator === 'greater_than') return totalOrders > (condition.value as number)
      if (condition.operator === 'less_than') return totalOrders < (condition.value as number)
      return false

    case 'session_property':
      return false

    case 'geo_location':
      return false

    case 'device_type':
      if (condition.operator === 'equals') return context.deviceType === condition.value
      if (condition.operator === 'in') return (condition.value as string[]).includes(context.deviceType ?? '')
      return false

    default:
      return false
  }
}

function allConditionsMatch(
  conditions: PersonalizationCondition[],
  profile: Record<string, unknown> | null,
  segments: string[],
  intent: { level: string; score: number },
  context: PersonalizationContext
): boolean {
  return conditions.every(c => evaluateCondition(c, profile, segments, intent, context))
}

function isRuleActive(rule: PersonalizationRule): boolean {
  if (!rule.enabled) return false
  const now = new Date().toISOString()
  if (rule.startDate && rule.startDate > now) return false
  if (rule.endDate && rule.endDate < now) return false
  return true
}

let rulesCache: PersonalizationRule[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60000

async function fetchRules(supabase: ReturnType<typeof createAdminClient>): Promise<PersonalizationRule[]> {
  const now = Date.now()
  if (rulesCache && now - cacheTimestamp < CACHE_TTL) {
    return rulesCache
  }

  const { data } = await supabase
    .from('personalization_rules')
    .select('*')
    .order('priority', { ascending: false })

  const rules = ((data ?? []) as Record<string, unknown>[]).map(rowToRule)
  rulesCache = rules
  cacheTimestamp = now
  return rules
}

export async function getPersonalizationRules(): Promise<PersonalizationRule[]> {
  const supabase = createAdminClient()
  return fetchRules(supabase)
}

export async function getPersonalizationRule(id: string): Promise<PersonalizationRule | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('personalization_rules')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return data ? rowToRule(data as Record<string, unknown>) : null
}

export async function createPersonalizationRule(
  rule: Omit<PersonalizationRule, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PersonalizationRule> {
  const supabase = createAdminClient()
  const nameEn = pickString(rule.name) ?? ''
  const nameAr = pickString(rule.nameAr) ?? ''
  const baseSlug = slugify(nameEn || nameAr || 'rule')

  const insertRow = {
    ...ruleToRow(rule),
    slug: `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`,
    context: (rule.context ?? 'homepage') as PersonalizationContextKey,
    name: { ar: nameAr, en: nameEn },
  }

  const { data, error } = await supabase
    .from('personalization_rules')
    .insert([insertRow] as unknown as never[])
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create rule')
  }

  rulesCache = null
  return rowToRule(data as Record<string, unknown>)
}

export async function updatePersonalizationRule(
  id: string,
  updates: Partial<PersonalizationRule>
): Promise<PersonalizationRule | null> {
  const supabase = createAdminClient()
  const updateRow = ruleToRow(updates)
  // @ts-expect-error - Supabase types not generated for personalization_rules table
  const { data, error } = await (supabase
    .from('personalization_rules') as unknown)
    .update(updateRow as never)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error || !data) return null
  rulesCache = null
  return rowToRule(data as Record<string, unknown>)
}

export async function deletePersonalizationRule(id: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('personalization_rules')
    .delete()
    .eq('id', id)

  if (error) return false
  rulesCache = null
  return true
}

async function getCustomerProfileForPersonalization(customerId: string): Promise<Record<string, unknown> | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle()
  return (data as Record<string, unknown> | null) ?? null
}

export async function evaluatePersonalization(
  context: PersonalizationContext
): Promise<PersonalizationResult> {
  if (!(await isPersonalizationEnabled())) {
    return { matchedRules: [], actions: [], context }
  }

  const supabase = createAdminClient()
  const rules = await fetchRules(supabase)
  const activeRules = rules.filter(isRuleActive)

  let profile: Record<string, unknown> | null = null
  let segments: string[] = []
  let intent: { level: string; score: number } = { level: 'low', score: 0 }

  if (context.customerId) {
    profile = await getCustomerProfileForPersonalization(context.customerId)
    const segEval = await evaluateCustomerSegments(context.customerId)
    segments = segEval.segments
    const intentEval = await evaluatePurchaseIntent(context.customerId, null)
    intent = { level: intentEval.level, score: intentEval.score }
  }

  const matchedRules: PersonalizationRule[] = []
  const allActions: PersonalizationAction[] = []

  for (const rule of activeRules) {
    if (rule.targetSegments && rule.targetSegments.length > 0) {
      const hasTargetSegment = rule.targetSegments.some(s => segments.includes(s))
      if (!hasTargetSegment && segments.length > 0) continue
    }

    if (allConditionsMatch(rule.conditions, profile, segments, intent, context)) {
      matchedRules.push(rule)
      allActions.push(...rule.actions)
    }
  }

  allActions.sort((a, b) => b.priority - a.priority)

  return {
    matchedRules,
    actions: allActions,
    context,
  }
}

export async function isPersonalizationEnabled(): Promise<boolean> {
  return getSetting<boolean>(SETTINGS_KEY, true)
}

export async function setPersonalizationEnabled(enabled: boolean): Promise<void> {
  await setSetting<boolean>(SETTINGS_KEY, Boolean(enabled))
}