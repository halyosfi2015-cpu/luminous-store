'use server'

import { createAdminClient } from '@/src/lib/supabase'
import { getSetting, setSetting } from '@/src/lib/site-settings'
import { ANALYTICS_EVENT_TYPES, type AnalyticsEventInput, type AnalyticsEventType } from './types'
import { trackEvent as serverTrackEvent } from './events'

const VALID_EVENT_TYPES = new Set<string>(Object.values(ANALYTICS_EVENT_TYPES))

export interface EventTrackingConfig {
  enabled: boolean
  trackAnonymous: boolean
  trackAuthenticated: boolean
  samplingRate: number
}

export interface TrackEventRequest {
  eventType: AnalyticsEventType
  eventName?: string
  entityType?: string
  entityId?: string
  properties?: Record<string, unknown>
  customerId?: string
  sessionId?: string
  source?: 'web' | 'mobile' | 'admin' | 'api' | 'system'
}

export interface TrackEventResult {
  success: boolean
  eventId?: string
  sessionId?: string
  reason?: string
}

export interface EventTrackingService {
  track: (request: TrackEventRequest) => Promise<TrackEventResult>
  trackBatch: (requests: TrackEventRequest[]) => Promise<TrackEventResult[]>
  isEnabled: () => Promise<boolean>
  setEnabled: (enabled: boolean) => Promise<void>
  getConfig: () => Promise<EventTrackingConfig>
  updateConfig: (config: Partial<EventTrackingConfig>) => Promise<void>
}

const SETTINGS_KEY = 'analytics.event_tracking.config'

const DEFAULT_CONFIG: EventTrackingConfig = {
  enabled: true,
  trackAnonymous: true,
  trackAuthenticated: true,
  samplingRate: 1.0,
}

let configCache: EventTrackingConfig | null = null

async function getConfigFromStore(): Promise<EventTrackingConfig> {
  if (configCache) return configCache
  const stored = await getSetting<Partial<EventTrackingConfig>>(SETTINGS_KEY, {})
  configCache = { ...DEFAULT_CONFIG, ...stored }
  return configCache
}

function isValidEventType(type: string): type is AnalyticsEventType {
  return VALID_EVENT_TYPES.has(type)
}

function shouldSample(rate: number): boolean {
  return Math.random() < rate
}

export async function trackEventService(request: TrackEventRequest): Promise<TrackEventResult> {
  const config = await getConfigFromStore()

  if (!config.enabled) {
    return { success: false, reason: 'tracking_disabled' }
  }

  if (!shouldSample(config.samplingRate)) {
    return { success: false, reason: 'sampled_out' }
  }

  if (!isValidEventType(request.eventType)) {
    return { success: false, reason: 'invalid_event_type' }
  }

  if (!config.trackAnonymous && !request.customerId) {
    return { success: false, reason: 'anonymous_tracking_disabled' }
  }

  if (!config.trackAuthenticated && request.customerId) {
    return { success: false, reason: 'authenticated_tracking_disabled' }
  }

  try {
    const input: AnalyticsEventInput = {
      event_type: request.eventType,
      event_name: request.eventName ?? null,
      entity_type: request.entityType ?? null,
      entity_id: request.entityId ?? null,
      properties: request.properties ?? {},
      source: request.source ?? 'web',
      customer_id: request.customerId ?? null,
      session_id: request.sessionId ?? null,
    }

    const result = await serverTrackEvent(input)

    return {
      success: result.ok,
      eventId: result.ok ? result.id : undefined,
      sessionId: result.ok ? result.session_id : undefined,
      reason: result.ok ? undefined : result.reason,
    }
  } catch (error) {
    console.warn('[event-tracker] trackEventService error:', (error as Error).message)
    return { success: false, reason: 'unexpected_error' }
  }
}

export async function trackBatchEvents(requests: TrackEventRequest[]): Promise<TrackEventResult[]> {
  const results: TrackEventResult[] = []

  for (const request of requests) {
    const result = await trackEventService(request)
    results.push(result)
  }

  return results
}

export async function isTrackingEnabled(): Promise<boolean> {
  const config = await getConfigFromStore()
  return config.enabled
}

export async function setTrackingEnabled(enabled: boolean): Promise<void> {
  const current = await getConfigFromStore()
  configCache = { ...current, enabled: Boolean(enabled) }
  await setSetting<EventTrackingConfig>(SETTINGS_KEY, configCache)
}

export async function getTrackingConfig(): Promise<EventTrackingConfig> {
  return { ...(await getConfigFromStore()) }
}

export async function updateTrackingConfig(partial: Partial<EventTrackingConfig>): Promise<void> {
  const current = await getConfigFromStore()
  configCache = { ...current, ...partial }
  await setSetting<EventTrackingConfig>(SETTINGS_KEY, configCache)
}

export async function getEventStats(rangeDays: number = 7): Promise<{
  totalEvents: number
  uniqueSessions: number
  uniqueCustomers: number
  eventsByType: Record<string, number>
}> {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: events } = await supabase
    .from('customer_events')
    .select('event_type, session_id, customer_id')
    .gte('occurred_at', since)

  const eventList = (events ?? []) as Array<{ event_type: string; session_id: string | null; customer_id: string | null }>

  const eventsByType: Record<string, number> = {}
  const sessions = new Set<string>()
  const customers = new Set<string>()

  for (const e of eventList) {
    eventsByType[e.event_type] = (eventsByType[e.event_type] ?? 0) + 1
    if (e.session_id) sessions.add(e.session_id)
    if (e.customer_id) customers.add(e.customer_id)
  }

  return {
    totalEvents: eventList.length,
    uniqueSessions: sessions.size,
    uniqueCustomers: customers.size,
    eventsByType,
  }
}