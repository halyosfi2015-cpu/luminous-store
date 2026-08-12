import 'server-only';
import { createAdminClient } from '@/src/lib/supabase';
import { ANALYTICS_EVENT_TYPES } from './types';

export type CustomerProfileSummary = {
  customer_id: string;
  first_seen: string | null;
  last_active_at: string | null;
  total_sessions: number;
  total_page_views: number;
  total_product_views: number;
  total_cart_additions: number;
  total_orders: number;
  total_spent: number;
  average_order_value: number;
  last_purchase_at: string | null;
};

function safeNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getCustomerProfile(customerId: string): Promise<CustomerProfileSummary | null> {
  if (!customerId) return null;
  const supabase = createAdminClient();

  const [profileRes, eventsRes, ordersRes] = await Promise.all([
    supabase
      .from('customer_profiles')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle(),
    supabase
      .from('customer_events')
      .select('event_type, occurred_at, session_id')
      .eq('customer_id', customerId),
    supabase
      .from('orders')
      .select('id, total, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
  ]);

  const events = (eventsRes.data ?? []) as Array<{ event_type: string; occurred_at: string; session_id: string | null }>;
  const orders = (ordersRes.data ?? []) as Array<{ id: string; total: number | string; created_at: string }>;

  let firstSeen: string | null = null;
  let lastSeen: string | null = null;
  let totalPageViews = 0;
  let totalProductViews = 0;
  let totalCartAdditions = 0;
  const sessions = new Set<string>();

  for (const e of events) {
    const ts = e.occurred_at;
    if (!firstSeen || ts < firstSeen) firstSeen = ts;
    if (!lastSeen || ts > lastSeen) lastSeen = ts;
    if (e.session_id) sessions.add(e.session_id);
    if (e.event_type === ANALYTICS_EVENT_TYPES.PAGE_VIEW) totalPageViews++;
    if (e.event_type === ANALYTICS_EVENT_TYPES.PRODUCT_VIEW) totalProductViews++;
    if (e.event_type === ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_CART) totalCartAdditions++;
  }

  let totalSpent = 0;
  let lastPurchaseAt: string | null = null;
  for (const o of orders) {
    totalSpent += safeNumber(o.total);
    const ts = o.created_at;
    if (ts && (!lastPurchaseAt || ts > lastPurchaseAt)) lastPurchaseAt = ts;
  }

  const profileRow = profileRes.data as Record<string, unknown> | null;
  if (profileRow) {
    const prefs = (profileRow.preferences as Record<string, unknown> | null | undefined) ?? {};
    firstSeen = (prefs.first_seen as string | null | undefined) ?? firstSeen;
    lastSeen = (profileRow.last_active_at as string | null | undefined) ?? lastSeen;
    totalPageViews = safeNumber(prefs.total_page_views) || totalPageViews;
    totalProductViews = safeNumber(prefs.total_product_views) || totalProductViews;
    totalCartAdditions = safeNumber(prefs.total_cart_additions) || totalCartAdditions;
    totalSpent = safeNumber(profileRow.total_spent) || totalSpent;
  }

  const orderCount = orders.length;
  const aov = orderCount > 0 ? Math.round(totalSpent / orderCount) : 0;

  return {
    customer_id: customerId,
    first_seen: firstSeen,
    last_active_at: lastSeen,
    total_sessions: sessions.size,
    total_page_views: totalPageViews,
    total_product_views: totalProductViews,
    total_cart_additions: totalCartAdditions,
    total_orders: orderCount,
    total_spent: totalSpent,
    average_order_value: aov,
    last_purchase_at: lastPurchaseAt,
  };
}

export async function listCustomerProfiles(limit = 50): Promise<CustomerProfileSummary[]> {
  const supabase = createAdminClient();
  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!customers || customers.length === 0) return [];

  const profiles: CustomerProfileSummary[] = [];
  for (const c of customers) {
    const p = await getCustomerProfile((c as { id: string }).id);
    if (p) profiles.push(p);
  }
  return profiles;
}
