'use client';

import { ANALYTICS_EVENT_TYPES, type AnalyticsEventType } from './types';

export const CONSENT_STORAGE_KEY = 'luminous-analytics-consent';
const CONSENT_EVENT = 'luminous:analytics-consent';

const ALLOWED_EVENT_TYPES: ReadonlySet<AnalyticsEventType> = new Set(
  Object.values(ANALYTICS_EVENT_TYPES),
);

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readStoredConsent(): boolean | null {
  if (!isBrowser()) return null;
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (v === '1' || v === 'true') return true;
    if (v === '0' || v === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

function writeStoredConsent(value: boolean): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value ? '1' : '0');
    document.cookie = `luminous_analytics_consent=${value ? '1' : '0'}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { value } }));
  } catch {
    // ignore quota / private mode
  }
}

export function getConsent(): boolean {
  const stored = readStoredConsent();
  return stored === true;
}

export function grantConsent(): void {
  writeStoredConsent(true);
}

export function revokeConsent(): void {
  writeStoredConsent(false);
}

export function onConsentChange(listener: (granted: boolean) => void): () => void {
  if (!isBrowser()) return () => undefined;
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ value: boolean }>).detail;
    listener(Boolean(detail?.value));
  };
  window.addEventListener(CONSENT_EVENT, handler);
  const storageHandler = (e: StorageEvent) => {
    if (e.key === CONSENT_STORAGE_KEY) listener(e.newValue === '1' || e.newValue === 'true');
  };
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(CONSENT_EVENT, handler);
    window.removeEventListener('storage', storageHandler);
  };
}

type TrackPayload = {
  event_type: AnalyticsEventType;
  event_name?: string;
  entity_type?: string;
  entity_id?: string;
  properties?: Record<string, unknown>;
  customer_id?: string | null;
};

export function trackClient(payload: TrackPayload): void {
  if (!isBrowser()) return;
  if (!ALLOWED_EVENT_TYPES.has(payload.event_type)) return;
  if (!getConsent()) return;

  try {
    const body = JSON.stringify({
      event_type: payload.event_type,
      event_name: payload.event_name ?? null,
      entity_type: payload.entity_type ?? null,
      entity_id: payload.entity_id ?? null,
      properties: payload.properties ?? {},
      customer_id: payload.customer_id ?? null,
    });

    if ('fetch' in window && 'keepalive' in window.fetch.prototype) {
      void fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => undefined);
      return;
    }

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/track', blob);
    }
  } catch {
    // never throw — analytics must not break commerce
  }
}
