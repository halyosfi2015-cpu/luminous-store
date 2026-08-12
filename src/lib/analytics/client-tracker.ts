'use client'

import { useRef, useEffect } from 'react'
import { ANALYTICS_EVENT_TYPES, type AnalyticsEventType } from './types'

const ALLOWED_EVENT_TYPES: ReadonlySet<AnalyticsEventType> = new Set(
  Object.values(ANALYTICS_EVENT_TYPES),
)

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function getOrCreateSessionId(): string {
  if (!isBrowser()) return ''
  try {
    let sid = window.sessionStorage.getItem('luminous_sid')
    if (!sid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sid)) {
      sid = crypto.randomUUID()
      window.sessionStorage.setItem('luminous_sid', sid)
    }
    return sid
  } catch {
    return crypto.randomUUID()
  }
}

function getConsent(): boolean {
  if (!isBrowser()) return false
  try {
    const v = window.localStorage.getItem('luminous-analytics-consent')
    return v === '1' || v === 'true'
  } catch {
    return false
  }
}

export interface ClientTrackEventRequest {
  eventType: AnalyticsEventType
  eventName?: string
  entityType?: string
  entityId?: string
  properties?: Record<string, unknown>
  customerId?: string
}

export interface ClientTrackEventResult {
  success: boolean
  reason?: string
}

export async function trackClientEvent(request: ClientTrackEventRequest): Promise<ClientTrackEventResult> {
  if (!isBrowser()) {
    return { success: false, reason: 'not_in_browser' }
  }

  if (!getConsent()) {
    return { success: false, reason: 'consent_denied' }
  }

  if (!ALLOWED_EVENT_TYPES.has(request.eventType)) {
    return { success: false, reason: 'invalid_event_type' }
  }

  try {
    const sessionId = getOrCreateSessionId()
    const payload = {
      event_type: request.eventType,
      event_name: request.eventName ?? null,
      entity_type: request.entityType ?? null,
      entity_id: request.entityId ?? null,
      properties: request.properties ?? {},
      customer_id: request.customerId ?? null,
      session_id: sessionId,
      source: 'web',
    }

    const body = JSON.stringify(payload)

    if ('fetch' in window && 'keepalive' in window.fetch.prototype) {
      void fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => undefined)
      return { success: true }
    }

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon('/api/analytics/track', blob)
      return { success: true }
    }

    return { success: false, reason: 'no_transport' }
  } catch {
    return { success: false, reason: 'unexpected_error' }
  }
}

export function trackClientEventSync(request: ClientTrackEventRequest): void {
  void trackClientEvent(request)
}

export function useTrackEvent(
  eventType: AnalyticsEventType,
  payload?: Record<string, unknown>,
  deps: unknown[] = [],
): void {
  const ref = useRef(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (ref.current) return
    ref.current = true
    void trackClientEvent({ eventType, properties: payload })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller-controlled deps; ref guard ensures the event is tracked only once
  }, deps)
}