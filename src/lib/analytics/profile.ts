import 'server-only';
import { createAdminClient } from '@/src/lib/supabase';
import { ANALYTICS_EVENT_TYPES } from './types';
import type { LifecycleState } from './types';

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
  lifecycle_state: LifecycleState;
  top_products: Array<{ product_id: string; units: number; spend: number }>;
  top_categories: Array<{ category_id: string; views: number }>;
  repeat_purchase_rate: number;
};

type LifecycleVariant = "neutral" | "primary" | "success" | "warning" | "error";

export type LifecycleInfo = {
  key: string;
  ar: string;
  variant: LifecycleVariant;
  state: LifecycleState;
};

function safeNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeLifecycle(
  firstSeen: string | null,
  lastActiveAt: string | null,
  lastPurchaseAt: string | null,
  totalOrders: number,
  totalSpent: number,
): LifecycleInfo {
  const now = Date.now();
  const lastActive = lastActiveAt ? new Date(lastActiveAt).getTime() : 0;
  const days = lastActive ? Math.floor((now - lastActive) / DAY_MS) : Number.POSITIVE_INFINITY;

  if (totalOrders === 0 && firstSeen && now - new Date(firstSeen).getTime() < 7 * DAY_MS) {
    return { key: "new", state: "new", ar: "جديد", variant: "primary" };
  }
  if (Number.isFinite(days) && days >= 90) {
    return { key: "inactive", state: "inactive", ar: "غير نشط", variant: "neutral" };
  }
  if (Number.isFinite(days) && days >= 30) {
    return { key: "at_risk", state: "at_risk", ar: "معرّض للخطر", variant: "warning" };
  }
  if (totalOrders >= 3 || totalSpent >= 100000) {
    return { key: "high_value", state: "high_value", ar: "قيمة عالية", variant: "success" };
  }
  if (totalOrders >= 1) {
    return { key: "returning", state: "returning", ar: "عائد", variant: "success" };
  }
  return { key: "active", state: "active", ar: "نشط", variant: "primary" };
}

type RawEvent = {
  event_type: string;
  occurred_at: string;
  session_id: string | null;
  entity_id: string | null;
  properties: Record<string, unknown> | null;
};

type RawOrder = { id: string; total: number | string; created_at: string; customer_id?: string };

const BATCH_SIZE = 50;

function indexOrderItems(
  items: Array<{ order_id: string; product_id: string | null; category_id: string | null; total: number | string; quantity: number }>,
): Map<string, Array<{ product_id: string | null; category_id: string | null; total: number | string; quantity: number }>> {
  const map = new Map<string, Array<{ product_id: string | null; category_id: string | null; total: number | string; quantity: number }>>();
  for (const item of items) {
    const arr = map.get(item.order_id) ?? [];
    arr.push(item);
    map.set(item.order_id, arr);
  }
  return map;
}

function buildProfileFromData(
  customerId: string,
  profileRow: Record<string, unknown> | null,
  events: RawEvent[],
  orders: RawOrder[],
  orderItemsByOrder: Map<string, Array<{ product_id: string | null; category_id: string | null; total: number | string; quantity: number }>>,
): CustomerProfileSummary {
  let firstSeen: string | null = null;
  let lastSeen: string | null = null;
  let totalPageViews = 0;
  let totalProductViews = 0;
  let totalCartAdditions = 0;
  const sessions = new Set<string>();
  const categoryViews = new Map<string, number>();

  for (const e of events) {
    const ts = e.occurred_at;
    if (!firstSeen || ts < firstSeen) firstSeen = ts;
    if (!lastSeen || ts > lastSeen) lastSeen = ts;
    if (e.session_id) sessions.add(e.session_id);
    if (e.event_type === ANALYTICS_EVENT_TYPES.PAGE_VIEW) totalPageViews++;
    if (e.event_type === ANALYTICS_EVENT_TYPES.PRODUCT_VIEW) {
      totalProductViews++;
      const catId = e.properties?.category_id as string | undefined;
      if (catId) categoryViews.set(catId, (categoryViews.get(catId) ?? 0) + 1);
    }
    if (e.event_type === ANALYTICS_EVENT_TYPES.PRODUCT_ADDED_TO_CART) totalCartAdditions++;
  }

  let totalSpent = 0;
  let lastPurchaseAt: string | null = null;
  const productUnits = new Map<string, number>();
  const productSpend = new Map<string, number>();

  for (const o of orders) {
    totalSpent += safeNumber(o.total);
    const ts = o.created_at;
    if (ts && (!lastPurchaseAt || ts > lastPurchaseAt)) lastPurchaseAt = ts;

    const items = orderItemsByOrder.get(o.id) ?? [];
    for (const item of items) {
      if (item.product_id) {
        productUnits.set(item.product_id, (productUnits.get(item.product_id) ?? 0) + (item.quantity ?? 0));
        productSpend.set(item.product_id, (productSpend.get(item.product_id) ?? 0) + safeNumber(item.total));
      }
    }
  }

  const profileRowData = profileRow as Record<string, unknown> | null;
  if (profileRowData) {
    const prefs = (profileRowData.preferences as Record<string, unknown> | null | undefined) ?? {};
    firstSeen = (prefs.first_seen as string | null | undefined) ?? firstSeen;
    lastSeen = (profileRowData.last_active_at as string | null | undefined) ?? lastSeen;
    totalPageViews = safeNumber(prefs.total_page_views) || totalPageViews;
    totalProductViews = safeNumber(prefs.total_product_views) || totalProductViews;
    totalCartAdditions = safeNumber(prefs.total_cart_additions) || totalCartAdditions;
    totalSpent = safeNumber(profileRowData.total_spent) || totalSpent;
  }

  const orderCount = orders.length;
  const aov = orderCount > 0 ? Math.round(totalSpent / orderCount) : 0;

  const topProducts: Array<{ product_id: string; units: number; spend: number }> = [];
  for (const [pid, units] of productUnits) {
    topProducts.push({ product_id: pid, units, spend: productSpend.get(pid) ?? 0 });
  }
  topProducts.sort((a, b) => b.units - a.units || b.spend - a.spend);

  const topCategories: Array<{ category_id: string; views: number }> = [];
  for (const [catId, views] of categoryViews) {
    topCategories.push({ category_id: catId, views });
  }
  topCategories.sort((a, b) => b.views - a.views);

  const repeatPurchaseRate = orderCount > 0
    ? Math.round((Math.max(0, orderCount - 1) / orderCount) * 100)
    : 0;

  const lifecycle = computeLifecycle(firstSeen, lastSeen, lastPurchaseAt, orderCount, totalSpent);

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
    lifecycle_state: lifecycle.state,
    top_products: topProducts.slice(0, 5),
    top_categories: topCategories.slice(0, 3),
    repeat_purchase_rate: repeatPurchaseRate,
  };
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
      .select('event_type, occurred_at, session_id, entity_id, properties')
      .eq('customer_id', customerId),
    supabase
      .from('orders')
      .select('id, total, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
  ]);

  const events = (eventsRes.data ?? []) as RawEvent[];
  const orders = (ordersRes.data ?? []) as RawOrder[];
  const orderIds = orders.map((o) => o.id);
  const orderItemsRes = orderIds.length > 0
    ? await supabase.from('order_items').select('order_id, product_id, category_id, total, quantity').in('order_id', orderIds)
    : { data: [] as unknown[] };
  const items = orderItemsRes.data as Array<{ order_id: string; product_id: string | null; category_id: string | null; total: number | string; quantity: number }> | null;
  const orderItems = items
    ? indexOrderItems(items)
    : new Map<string, Array<{ product_id: string | null; category_id: string | null; total: number | string; quantity: number }>>();

  return buildProfileFromData(
    customerId,
    profileRes.data ? (profileRes.data as unknown as Record<string, unknown>) : null,
    events,
    orders,
    orderItems,
  );
}

export async function listCustomerProfiles(limit = 50): Promise<CustomerProfileSummary[]> {
  const supabase = createAdminClient();
  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!customers || customers.length === 0) return [];

  const customerIds = (customers as Array<{ id: string }>).map((c) => c.id);
  const since = new Date(Date.now() - 90 * DAY_MS).toISOString();

  const allOrderItemsMap = new Map<string, Array<{ product_id: string | null; category_id: string | null; total: number | string; quantity: number }>>();
  const allProfiles: CustomerProfileSummary[] = [];

  for (let i = 0; i < customerIds.length; i += BATCH_SIZE) {
    const batch = customerIds.slice(i, i + BATCH_SIZE);
    const [profilesRes, eventsRes, ordersRes] = await Promise.all([
      supabase.from('customer_profiles').select('*').in('customer_id', batch),
      supabase
        .from('customer_events')
        .select('event_type, occurred_at, session_id, entity_id, properties')
        .in('customer_id', batch)
        .gte('occurred_at', since),
      supabase.from('orders').select('id, total, created_at, customer_id').in('customer_id', batch).order('created_at', { ascending: false }),
    ]);

    const batchOrderIds = (ordersRes.data ?? []) as Array<{ id: string }>;
    const orderIds = batchOrderIds.map((o) => o.id);
    const itemsRes = orderIds.length > 0
      ? await supabase.from('order_items').select('order_id, product_id, category_id, total, quantity').in('order_id', orderIds)
      : { data: [] as unknown[] };
    const newItems = (itemsRes.data ?? []) as Array<{ order_id: string; product_id: string | null; category_id: string | null; total: number | string; quantity: number }>;
    for (const item of newItems) {
      const arr = allOrderItemsMap.get(item.order_id) ?? [];
      arr.push(item);
      allOrderItemsMap.set(item.order_id, arr);
    }

    for (const cid of batch) {
      const profileRow = ((profilesRes.data ?? []).find((r: { customer_id: string }) => r.customer_id === cid) as unknown) as Record<string, unknown> ?? null;
      const events = (eventsRes.data ?? []).filter((e: { customer_id: string }) => (e as Record<string, unknown>).customer_id === cid) as RawEvent[];
      const orders = (ordersRes.data ?? []).filter((o: { customer_id: string }) => (o as Record<string, unknown>).customer_id === cid) as RawOrder[];

      const summary = buildProfileFromData(cid, profileRow, events, orders, allOrderItemsMap);
      allProfiles.push(summary);
    }
  }

  return allProfiles;
}

export async function listCustomerProfilesBatch(customerIds: string[]): Promise<CustomerProfileSummary[]> {
  if (customerIds.length === 0) return [];
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 90 * DAY_MS).toISOString();
  const allOrderItemsMap = new Map<string, Array<{ product_id: string | null; category_id: string | null; total: number | string; quantity: number }>>();
  const results: CustomerProfileSummary[] = [];

  for (let i = 0; i < customerIds.length; i += BATCH_SIZE) {
    const batch = customerIds.slice(i, i + BATCH_SIZE);
    const [profilesRes, eventsRes, ordersRes] = await Promise.all([
      supabase.from('customer_profiles').select('*').in('customer_id', batch),
      supabase.from('customer_events').select('event_type, occurred_at, session_id, entity_id, properties').in('customer_id', batch).gte('occurred_at', since),
      supabase.from('orders').select('id, total, created_at, customer_id').in('customer_id', batch).order('created_at', { ascending: false }),
    ]);

    const batchOrderIds = (ordersRes.data ?? []) as Array<{ id: string }>;
    const orderIds = batchOrderIds.map((o) => o.id);
    const itemsRes = orderIds.length > 0
      ? await supabase.from('order_items').select('order_id, product_id, category_id, total, quantity').in('order_id', orderIds)
      : { data: [] as unknown[] };
    const newItems = (itemsRes.data ?? []) as Array<{ order_id: string; product_id: string | null; category_id: string | null; total: number | string; quantity: number }>;
    for (const item of newItems) {
      const arr = allOrderItemsMap.get(item.order_id) ?? [];
      arr.push(item);
      allOrderItemsMap.set(item.order_id, arr);
    }

    for (const cid of batch) {
      const profileRow = ((profilesRes.data ?? []).find((r: { customer_id: string }) => r.customer_id === cid) as unknown) as Record<string, unknown> ?? null;
      const events = (eventsRes.data ?? []).filter((e: { customer_id: string }) => (e as Record<string, unknown>).customer_id === cid) as RawEvent[];
      const orders = (ordersRes.data ?? []).filter((o: { customer_id: string }) => (o as Record<string, unknown>).customer_id === cid) as RawOrder[];
      const summary = buildProfileFromData(cid, profileRow, events, orders, allOrderItemsMap);
      results.push(summary);
    }
  }

  return results;
}
