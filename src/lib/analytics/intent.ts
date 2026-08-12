import 'server-only';
import { createAdminClient } from '@/src/lib/supabase';
import {
  ANALYTICS_EVENT_TYPES,
  INTENT_RULES_VERSION,
  type IntentLevel,
} from './types';

export const INTENT_WEIGHTS = {
  product_view: 1,
  repeat_product_view: 3,
  wishlist_add: 5,
  cart_add: 10,
  cart_remove: -2,
  checkout_started: 20,
  checkout_failed: -5,
  purchase: -50,
  session_recent: 2,
  browse_depth: 4,
} as const;

export type IntentSignals = {
  product_views: number;
  repeat_product_views: number;
  wishlist_adds: number;
  cart_adds: number;
  cart_removes: number;
  checkout_started: number;
  checkout_failed: number;
  purchases: number;
  recent_sessions: number;
  browse_depth: number;
};

export type IntentEvaluation = {
  customer_id: string | null;
  session_id: string | null;
  score: number;
  level: IntentLevel;
  signals: IntentSignals;
  contributors: { signal: string; weight: number; count: number; contribution: number }[];
  rules_version: string;
  evaluated_at: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function levelFor(score: number): IntentLevel {
  if (score >= 50) return 'very_high';
  if (score >= 25) return 'high';
  if (score >= 10) return 'medium';
  return 'low';
}

export async function evaluatePurchaseIntent(
  customerId: string | null,
  sessionId: string | null,
): Promise<IntentEvaluation> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 30 * DAY_MS).toISOString();

  let query = supabase
    .from('customer_events')
    .select('event_type, entity_id, session_id, occurred_at')
    .gte('occurred_at', since);

  if (customerId) {
    query = query.eq('customer_id', customerId);
  } else if (sessionId) {
    query = query.eq('session_id', sessionId);
  } else {
    return {
      customer_id: customerId,
      session_id: sessionId,
      score: 0,
      level: 'low',
      signals: emptySignals(),
      contributors: [],
      rules_version: INTENT_RULES_VERSION,
      evaluated_at: new Date().toISOString(),
    };
  }

  const { data: eventsRaw } = await query;
  const list = (eventsRaw ?? []) as Array<{ event_type: string; entity_id: string | null; session_id: string | null; occurred_at: string }>;

  const signals: IntentSignals = emptySignals();
  const productViewCounts = new Map<string, number>();
  const sessionIds = new Set<string>();

  for (const e of list) {
    if (e.session_id) sessionIds.add(e.session_id);
    const key = e.entity_id ?? '';
    switch (e.event_type) {
      case ANALYTICS_EVENT_TYPES.PRODUCT_VIEW:
        signals.product_views++;
        if (key) productViewCounts.set(key, (productViewCounts.get(key) ?? 0) + 1);
        break;
      case ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_WISHLIST:
        signals.wishlist_adds++;
        break;
      case ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_CART:
        signals.cart_adds++;
        break;
      case ANALYTICS_EVENT_TYPES.PRODUCT_REMOVED_FROM_CART:
        signals.cart_removes++;
        break;
      case ANALYTICS_EVENT_TYPES.CHECKOUT_STARTED:
        signals.checkout_started++;
        break;
      case ANALYTICS_EVENT_TYPES.CHECKOUT_FAILED:
        signals.checkout_failed++;
        break;
      case ANALYTICS_EVENT_TYPES.PURCHASE_COMPLETED:
        signals.purchases++;
        break;
      case ANALYTICS_EVENT_TYPES.PAGE_VIEW:
        signals.browse_depth++;
        break;
    }
  }

  for (const count of productViewCounts.values()) {
    if (count >= 2) signals.repeat_product_views += count;
  }
  signals.recent_sessions = sessionIds.size;

  const contributors: IntentEvaluation['contributors'] = [
    { signal: 'product_view', weight: INTENT_WEIGHTS.product_view, count: signals.product_views, contribution: signals.product_views * INTENT_WEIGHTS.product_view },
    { signal: 'repeat_product_view', weight: INTENT_WEIGHTS.repeat_product_view, count: signals.repeat_product_views, contribution: signals.repeat_product_views * INTENT_WEIGHTS.repeat_product_view },
    { signal: 'wishlist_add', weight: INTENT_WEIGHTS.wishlist_add, count: signals.wishlist_adds, contribution: signals.wishlist_adds * INTENT_WEIGHTS.wishlist_add },
    { signal: 'cart_add', weight: INTENT_WEIGHTS.cart_add, count: signals.cart_adds, contribution: signals.cart_adds * INTENT_WEIGHTS.cart_add },
    { signal: 'cart_remove', weight: INTENT_WEIGHTS.cart_remove, count: signals.cart_removes, contribution: signals.cart_removes * INTENT_WEIGHTS.cart_remove },
    { signal: 'checkout_started', weight: INTENT_WEIGHTS.checkout_started, count: signals.checkout_started, contribution: signals.checkout_started * INTENT_WEIGHTS.checkout_started },
    { signal: 'checkout_failed', weight: INTENT_WEIGHTS.checkout_failed, count: signals.checkout_failed, contribution: signals.checkout_failed * INTENT_WEIGHTS.checkout_failed },
    { signal: 'purchase', weight: INTENT_WEIGHTS.purchase, count: signals.purchases, contribution: signals.purchases * INTENT_WEIGHTS.purchase },
    { signal: 'session_recent', weight: INTENT_WEIGHTS.session_recent, count: signals.recent_sessions, contribution: signals.recent_sessions * INTENT_WEIGHTS.session_recent },
    { signal: 'browse_depth', weight: INTENT_WEIGHTS.browse_depth, count: signals.browse_depth, contribution: signals.browse_depth * INTENT_WEIGHTS.browse_depth },
  ];

  const score = Math.max(0, Math.round(contributors.reduce((sum, c) => sum + c.contribution, 0)));

  return {
    customer_id: customerId,
    session_id: sessionId,
    score,
    level: levelFor(score),
    signals,
    contributors,
    rules_version: INTENT_RULES_VERSION,
    evaluated_at: new Date().toISOString(),
  };
}

function emptySignals(): IntentSignals {
  return {
    product_views: 0,
    repeat_product_views: 0,
    wishlist_adds: 0,
    cart_adds: 0,
    cart_removes: 0,
    checkout_started: 0,
    checkout_failed: 0,
    purchases: 0,
    recent_sessions: 0,
    browse_depth: 0,
  };
}

export async function getIntentDistribution(
  customerIds: string[],
): Promise<Record<IntentLevel, number>> {
  const result: Record<IntentLevel, number> = { low: 0, medium: 0, high: 0, very_high: 0 };
  for (const id of customerIds) {
    const ev = await evaluatePurchaseIntent(id, null);
    result[ev.level]++;
  }
  return result;
}
