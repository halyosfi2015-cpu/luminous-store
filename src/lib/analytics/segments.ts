import 'server-only';
import { createAdminClient } from '@/src/lib/supabase';
import { ANALYTICS_EVENT_TYPES, type SegmentKey } from './types';
import type { CustomerProfileSummary } from './profile';

export const SEGMENT_RULES_VERSION = 'phase_6_2_v1';

export const SEGMENT_LABELS: Record<SegmentKey, { ar: string; en: string }> = {
  new_customer: { ar: 'عميل جديد', en: 'New Customer' },
  returning_customer: { ar: 'عميل عائد', en: 'Returning Customer' },
  cart_abandoner: { ar: 'متروك السلة', en: 'Cart Abandoner' },
  category_interest: { ar: 'مهتم بفئة', en: 'Category Interest' },
  high_intent: { ar: 'نيّة شراء عالية', en: 'High Intent' },
  high_value: { ar: 'قيمة عالية', en: 'High Value' },
  at_risk: { ar: 'معرّض للخطر', en: 'At Risk' },
  inactive: { ar: 'غير نشط', en: 'Inactive' },
};

export type SegmentEvaluation = {
  customer_id: string;
  segments: SegmentKey[];
  reasons: Record<SegmentKey, string>;
  rules_version: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
}

export async function evaluateCustomerSegments(
  customerId: string,
): Promise<SegmentEvaluation> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 30 * DAY_MS).toISOString();

  const [eventsRes, profileRes] = await Promise.all([
    supabase
      .from('customer_events')
      .select('event_type, occurred_at, entity_id')
      .eq('customer_id', customerId)
      .gte('occurred_at', since),
    supabase
      .from('customer_profiles')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle(),
  ]);

  const events = (eventsRes.data ?? []) as Array<{ event_type: string; occurred_at: string; entity_id: string | null }>;
  const profile = profileRes.data as Partial<CustomerProfileSummary> | null;

  const lastSeenIso = (profile?.last_active_at ?? null) as string | null;
  const profileRow = (profile ?? {}) as Record<string, unknown>;
  const prefs = (profileRow.preferences as Record<string, unknown> | null | undefined) ?? {};
  const firstSeenIso = (prefs.first_seen as string | null | undefined) ?? null;
  const daysSinceLastSeen = daysSince(lastSeenIso);
  const daysSinceFirstSeen = Number.isFinite(daysSince(firstSeenIso)) ? daysSince(firstSeenIso) : 0;

  let addToCartCount = 0;
  let checkoutStartedCount = 0;
  let productViewCount = 0;
  let wishlistAddCount = 0;
  let lastCartEventAt: string | null = null;
  let lastCheckoutEventAt: string | null = null;

  for (const e of events) {
    const ts = e.occurred_at;
    if (e.event_type === ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_CART) {
      addToCartCount++;
      if (!lastCartEventAt || ts > lastCartEventAt) lastCartEventAt = ts;
    }
    if (e.event_type === ANALYTICS_EVENT_TYPES.CHECKOUT_STARTED) {
      checkoutStartedCount++;
      if (!lastCheckoutEventAt || ts > lastCheckoutEventAt) lastCheckoutEventAt = ts;
    }
    if (e.event_type === ANALYTICS_EVENT_TYPES.PRODUCT_VIEW) productViewCount++;
    if (e.event_type === ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_WISHLIST) wishlistAddCount++;
  }

  const totalOrders = Number(profile?.total_orders ?? 0);
  const totalSpent = Number(profile?.total_spent ?? 0);

  const segments: SegmentKey[] = [];
  const reasons: Record<SegmentKey, string> = {
    new_customer: '',
    returning_customer: '',
    cart_abandoner: '',
    category_interest: '',
    high_intent: '',
    high_value: '',
    at_risk: '',
    inactive: '',
  };

  if (totalOrders <= 0 && daysSinceFirstSeen <= 7) {
    segments.push('new_customer');
    reasons.new_customer = `first_seen ≤ 7 days, 0 orders`;
  } else if (totalOrders >= 1 && events.length > 0) {
    segments.push('returning_customer');
    reasons.returning_customer = `${totalOrders} orders, recent events`;
  }

  if (addToCartCount > 0 && totalOrders === 0) {
    segments.push('cart_abandoner');
    reasons.cart_abandoner = `${addToCartCount} add_to_cart(s) without purchase`;
  }

  if (productViewCount >= 3) {
    segments.push('category_interest');
    reasons.category_interest = `${productViewCount} product views in 30d`;
  }

  if (
    checkoutStartedCount > 0 ||
    addToCartCount >= 2 ||
    (wishlistAddCount >= 1 && productViewCount >= 2)
  ) {
    segments.push('high_intent');
    reasons.high_intent = `checkout_started=${checkoutStartedCount}, add_to_cart=${addToCartCount}, wishlist=${wishlistAddCount}`;
  }

  if (totalOrders >= 3 || totalSpent >= 100000) {
    segments.push('high_value');
    reasons.high_value = `orders=${totalOrders}, spent=${totalSpent}`;
  }

  if (
    totalOrders >= 1 &&
    Number.isFinite(daysSinceLastSeen) &&
    daysSinceLastSeen >= 30 &&
    daysSinceLastSeen < 90
  ) {
    segments.push('at_risk');
    reasons.at_risk = `no activity for ${daysSinceLastSeen} days`;
  }

  if (
    Number.isFinite(daysSinceLastSeen) &&
    daysSinceLastSeen >= 90
  ) {
    segments.push('inactive');
    reasons.inactive = `no activity for ${daysSinceLastSeen} days`;
  }

  return {
    customer_id: customerId,
    segments,
    reasons,
    rules_version: SEGMENT_RULES_VERSION,
  };
}

export async function getSegmentDistribution(
  customerIds: string[],
): Promise<Record<SegmentKey, number>> {
  const result: Record<SegmentKey, number> = {
    new_customer: 0,
    returning_customer: 0,
    cart_abandoner: 0,
    category_interest: 0,
    high_intent: 0,
    high_value: 0,
    at_risk: 0,
    inactive: 0,
  };
  for (const id of customerIds) {
    const ev = await evaluateCustomerSegments(id);
    for (const s of ev.segments) result[s]++;
  }
  return result;
}
