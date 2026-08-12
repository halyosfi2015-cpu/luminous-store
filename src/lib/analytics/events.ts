import 'server-only';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { createAdminClient } from '@/src/lib/supabase';
import { ANALYTICS_EVENT_TYPES, type AnalyticsEventInput, type AnalyticsEventType } from './types';

const SESSION_COOKIE = 'luminous_sid';
const CONSENT_COOKIE = 'luminous_analytics_consent';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const VALID_EVENT_TYPES = new Set<string>(Object.values(ANALYTICS_EVENT_TYPES));

export type TrackResult =
  | { ok: true; id: string; session_id: string }
  | { ok: false; reason: string };

export async function getOrCreateSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE)?.value;
  if (existing && isUuid(existing)) return existing;
  const sid = randomUUID();
  store.set(SESSION_COOKIE, sid, {
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    sameSite: 'lax',
    httpOnly: false,
    secure: false,
  });
  return sid;
}

export async function readSessionId(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  return value && isUuid(value) ? value : null;
}

export async function readConsentCookie(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(CONSENT_COOKIE)?.value;
  return value === '1' || value === 'true';
}

export async function writeConsentCookie(granted: boolean): Promise<void> {
  const store = await cookies();
  store.set(CONSENT_COOKIE, granted ? '1' : '0', {
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    sameSite: 'lax',
    httpOnly: false,
    secure: false,
  });
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export type SafeUuid = string | null;

export function normalizeUuid(value: unknown): SafeUuid {
  return isUuid(value) ? value : null;
}

export function validateEventType(t: unknown): t is AnalyticsEventType {
  return typeof t === 'string' && VALID_EVENT_TYPES.has(t);
}

export type TrackOptions = {
  customer_id?: string | null;
  consent?: boolean | null;
};

export async function trackEvent(
  input: AnalyticsEventInput,
  options: TrackOptions = {},
): Promise<TrackResult> {
  try {
    const consent =
      typeof options.consent === 'boolean'
        ? options.consent
        : await readConsentCookie();

    if (!consent) {
      return { ok: false, reason: 'consent_denied' };
    }

    if (!validateEventType(input.event_type)) {
      return { ok: false, reason: 'invalid_event_type' };
    }

    const sessionId = normalizeUuid(input.session_id) ?? (await getOrCreateSessionId());

    let customerId = normalizeUuid(options.customer_id) ?? normalizeUuid(input.customer_id);
    if (customerId) {
      customerId = await resolveAuthenticatedCustomerId(customerId);
      if (!customerId) {
        return { ok: false, reason: 'invalid_customer' };
      }
    }

    const supabase = createAdminClient();
    const properties = input.properties && typeof input.properties === 'object'
      ? input.properties
      : {};

    const row = {
      customer_id: customerId,
      session_id: sessionId,
      event_type: input.event_type,
      event_name: input.event_name ?? null,
      entity_type: input.entity_type ?? null,
      entity_id: normalizeUuid(input.entity_id),
      properties,
      source: (input.source ?? 'web') as 'web',
      occurred_at: input.occurred_at ?? new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('customer_events')
      .insert([row] as unknown as never[])
      .select('id')
      .single();

    if (error || !data) {
      console.warn('[analytics] insert failed:', error?.message ?? 'unknown');
      return { ok: false, reason: 'persist_failed' };
    }

    const insertedId = (data as { id: string }).id;

    if (customerId) {
      await refreshCustomerProfile(customerId).catch(() => undefined);
    }

    return { ok: true, id: insertedId, session_id: sessionId };
  } catch (err) {
    console.warn('[analytics] unexpected error:', (err as Error).message);
    return { ok: false, reason: 'unexpected_error' };
  }
}

async function resolveAuthenticatedCustomerId(candidate: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('id', candidate)
      .maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}

export async function refreshCustomerProfile(customerId: string): Promise<void> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString();

  const [eventsRes, ordersRes] = await Promise.all([
    supabase
      .from('customer_events')
      .select('event_type, occurred_at')
      .eq('customer_id', customerId)
      .gte('occurred_at', since),
    supabase
      .from('orders')
      .select('id, total, created_at')
      .eq('customer_id', customerId),
  ]);

  const events = (eventsRes.data ?? []) as Array<{ event_type: string; occurred_at: string }>;
  const orders = (ordersRes.data ?? []) as Array<{ id: string; total: number | string; created_at: string }>;

  let firstSeen: string | null = null;
  let lastSeen: string | null = null;
  let totalPageViews = 0;
  let totalProductViews = 0;
  let totalCartAdditions = 0;
  const totalPurchases = orders.length;
  let totalOrderValue = 0;

  for (const o of orders) {
    totalOrderValue += Number(o.total);
  }

  for (const e of events) {
    const ts = e.occurred_at;
    if (!firstSeen || ts < firstSeen) firstSeen = ts;
    if (!lastSeen || ts > lastSeen) lastSeen = ts;
    if (e.event_type === ANALYTICS_EVENT_TYPES.PAGE_VIEW) totalPageViews++;
    if (e.event_type === ANALYTICS_EVENT_TYPES.PRODUCT_VIEW) totalProductViews++;
    if (e.event_type === ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_CART) totalCartAdditions++;
  }

  const sessions = new Set<string>();
  const sessionsRes = await supabase
    .from('customer_events')
    .select('session_id')
    .eq('customer_id', customerId)
    .not('session_id', 'is', null)
    .gte('occurred_at', since);
  for (const row of (sessionsRes.data ?? []) as Array<{ session_id: string | null }>) {
    if (row.session_id) sessions.add(row.session_id);
  }

  const existingRes = await supabase
    .from('customer_profiles')
    .select('preferences')
    .eq('customer_id', customerId)
    .maybeSingle();
  const existingPrefs =
    (existingRes.data as { preferences?: Record<string, unknown> } | null)?.preferences ?? {};

  const payload = {
    customer_id: customerId,
    last_active_at: lastSeen,
    total_orders: totalPurchases,
    total_spent: totalOrderValue,
    lifetime_value: totalOrderValue,
    preferences: {
      ...existingPrefs,
      first_seen: firstSeen,
      total_sessions: sessions.size,
      total_page_views: totalPageViews,
      total_product_views: totalProductViews,
      total_cart_additions: totalCartAdditions,
    },
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from('customer_profiles')
    .upsert([payload] as unknown as never[], { onConflict: 'customer_id' });
}
