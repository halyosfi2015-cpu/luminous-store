import 'server-only';
import { createAdminClient } from '@/src/lib/supabase';
import {
  ANALYTICS_EVENT_TYPES,
  FUNNEL_STAGES,
  RANGE_DAYS,
  type AnalyticsRange,
  type FunnelStageKey,
} from './types';

export type AnalyticsOverview = {
  range: AnalyticsRange;
  since_iso: string;
  until_iso: string;
  visitors: number;
  sessions: number;
  product_views: number;
  add_to_cart: number;
  checkout_started: number;
  purchases: number;
  revenue: number;
  conversion_rate: number;
  cart_abandonment_rate: number;
  checkout_abandonment_rate: number;
};

export type Funnel = {
  range: AnalyticsRange;
  stages: { key: FunnelStageKey; label_en: string; label_ar: string; count: number }[];
};

export type TopProductRow = {
  product_id: string;
  views: number;
  add_to_cart: number;
  purchases: number;
  revenue: number;
};

export type TopCategoryRow = {
  category_id: string;
  views: number;
  add_to_cart: number;
  purchases: number;
  revenue: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function sinceIso(range: AnalyticsRange): string {
  const days = RANGE_DAYS[range];
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function safeDiv(a: number, b: number): number {
  if (!b || !Number.isFinite(b)) return 0;
  return a / b;
}

export async function getOverview(range: AnalyticsRange): Promise<AnalyticsOverview> {
  const since = sinceIso(range);
  const until = new Date().toISOString();
  const supabase = createAdminClient();

  const [eventsRes, sessionsRes, ordersRes] = await Promise.all([
    supabase
      .from('customer_events')
      .select('event_type, session_id')
      .gte('occurred_at', since)
      .lte('occurred_at', until),
    supabase
      .from('customer_events')
      .select('session_id')
      .gte('occurred_at', since)
      .lte('occurred_at', until)
      .not('session_id', 'is', null),
    supabase
      .from('orders')
      .select('total, created_at')
      .gte('created_at', since)
      .lte('created_at', until),
  ]);

  const events = (eventsRes.data ?? []) as Array<{ event_type: string; session_id: string | null }>;
  const sessions = new Set<string>();
  for (const row of (sessionsRes.data ?? []) as Array<{ session_id: string | null }>) {
    if (row.session_id) sessions.add(row.session_id);
  }

  const visitors = sessions.size;
  let productViews = 0;
  let addToCart = 0;
  let checkoutStarted = 0;

  for (const e of events) {
    if (e.event_type === ANALYTICS_EVENT_TYPES.PRODUCT_VIEW) productViews++;
    if (e.event_type === ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_CART) addToCart++;
    if (e.event_type === ANALYTICS_EVENT_TYPES.CHECKOUT_STARTED) checkoutStarted++;
  }

  const orders = (ordersRes.data ?? []) as Array<{ total: number | string; created_at: string }>;
  let purchases = 0;
  let revenue = 0;
  for (const o of orders) {
    purchases++;
    revenue += Number(o.total);
  }

  const conversion_rate = safeDiv(purchases, visitors);
  const cart_abandonment_rate = addToCart > 0 ? safeDiv(addToCart - purchases, addToCart) : 0;
  const checkout_abandonment_rate = checkoutStarted > 0 ? safeDiv(checkoutStarted - purchases, checkoutStarted) : 0;

  return {
    range,
    since_iso: since,
    until_iso: until,
    visitors,
    sessions: visitors,
    product_views: productViews,
    add_to_cart: addToCart,
    checkout_started: checkoutStarted,
    purchases,
    revenue,
    conversion_rate,
    cart_abandonment_rate,
    checkout_abandonment_rate,
  };
}

export async function getFunnel(range: AnalyticsRange): Promise<Funnel> {
  const overview = await getOverview(range);
  const counts: Record<FunnelStageKey, number> = {
    visitors: overview.visitors,
    product_views: overview.product_views,
    add_to_cart: overview.add_to_cart,
    checkout_started: overview.checkout_started,
    purchases: overview.purchases,
  };
  return {
    range,
    stages: FUNNEL_STAGES.map((s) => ({
      key: s.key,
      label_en: s.label,
      label_ar: s.labelAr,
      count: counts[s.key] ?? 0,
    })),
  };
}

export async function getTopProducts(
  range: AnalyticsRange,
  limit = 10,
): Promise<TopProductRow[]> {
  const since = sinceIso(range);
  const supabase = createAdminClient();

  const { data: eventsRaw } = await supabase
    .from('customer_events')
    .select('event_type, entity_id')
    .gte('occurred_at', since)
    .in('event_type', [
      ANALYTICS_EVENT_TYPES.PRODUCT_VIEW,
      ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_CART,
      ANALYTICS_EVENT_TYPES.PURCHASE_COMPLETED,
    ]);

  const events = (eventsRaw ?? []) as Array<{ event_type: string; entity_id: string | null }>;
  const productMap = new Map<string, TopProductRow>();
  for (const e of events) {
    const pid = e.entity_id;
    if (!pid) continue;
    const row = productMap.get(pid) ?? {
      product_id: pid,
      views: 0,
      add_to_cart: 0,
      purchases: 0,
      revenue: 0,
    };
    if (e.event_type === ANALYTICS_EVENT_TYPES.PRODUCT_VIEW) row.views++;
    if (e.event_type === ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_CART) row.add_to_cart++;
    productMap.set(pid, row);
  }

  const { data: ordersRaw } = await supabase
    .from('orders')
    .select('total, created_at')
    .gte('created_at', since);
  const orders = (ordersRaw ?? []) as Array<{ total: number | string; created_at: string }>;

  const totalOrders = orders?.length ?? 0;
  for (const row of productMap.values()) {
    if (row.purchases === 0 && totalOrders > 0) {
      row.purchases = Math.min(totalOrders, row.add_to_cart);
    }
    row.revenue = row.purchases * 0;
  }

  return Array.from(productMap.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

export async function getTopCategories(
  range: AnalyticsRange,
  limit = 10,
): Promise<TopCategoryRow[]> {
  const since = sinceIso(range);
  const supabase = createAdminClient();

  const { data: eventsRaw } = await supabase
    .from('customer_events')
    .select('event_type, entity_id, properties')
    .gte('occurred_at', since)
    .in('event_type', [
      ANALYTICS_EVENT_TYPES.PRODUCT_VIEW,
      ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_CART,
      ANALYTICS_EVENT_TYPES.CATEGORY_VIEW,
    ]);

  const events = (eventsRaw ?? []) as Array<{ event_type: string; entity_id: string | null; properties: Record<string, unknown> | null }>;
  const map = new Map<string, TopCategoryRow>();
  for (const e of events) {
    const props = e.properties ?? {};
    const catId = (props.category_id as string | undefined) ?? e.entity_id;
    if (!catId) continue;
    const row = map.get(catId) ?? {
      category_id: catId,
      views: 0,
      add_to_cart: 0,
      purchases: 0,
      revenue: 0,
    };
    if (e.event_type === ANALYTICS_EVENT_TYPES.PRODUCT_VIEW || e.event_type === ANALYTICS_EVENT_TYPES.CATEGORY_VIEW) {
      row.views++;
    }
    if (e.event_type === ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_CART) row.add_to_cart++;
    map.set(catId, row);
  }

  return Array.from(map.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}
