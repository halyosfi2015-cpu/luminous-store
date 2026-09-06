import 'server-only';
import { createAdminClient } from '@/src/lib/supabase';
import type { CustomerProfileSummary } from './profile';

/* ───────────────────────── Types ───────────────────────── */

export type RFMScore = {
  recency: number;
  frequency: number;
  monetary: number;
  segment: string;
  segmentAr: string;
  explanation: string;
};

export type CustomerValue = {
  totalSpend: number;
  orderCount: number;
  averageOrderValue: number;
  purchaseFrequency: number;
  recencyDays: number;
  valueTier: 'vip' | 'high' | 'medium' | 'low';
  valueTierAr: string;
  explanation: string;
};

export type RetentionAlert = {
  type: 'high_value_at_risk' | 'new_no_repeat' | 'frequency_drop' | 'inactive';
  priority: 'high' | 'medium' | 'low';
  reason: string;
  reasonAr: string;
  evidence: string;
  recommendedAction: string;
  recommendedActionAr: string;
};

export type ProductAffinity = {
  topProducts: Array<{ productId: string; name: string; nameAr: string; units: number; spend: number }>;
  topCategories: Array<{ category: string; views: number; purchases: number }>;
  crossSellOpportunities: Array<{ fromCategory: string; toCategory: string; confidence: string; explanationAr: string }>;
  purchasePattern: string;
  purchasePatternAr: string;
};

export type RepeatPurchaseOpportunity = {
  productId: string;
  productName: string;
  productNameAr: string;
  lastPurchasedDaysAgo: number;
  expectedRepurchaseDays: number | null;
  confidence: 'high' | 'medium' | 'low';
  explanationAr: string;
};

export type CustomerOpportunity = {
  type: 'retention' | 'cross_sell' | 'repeat_purchase' | 'upsell' | 'loyalty';
  priority: 'high' | 'medium' | 'low';
  explanationAr: string;
  evidence: string;
  recommendedActionAr: string;
};

export type CustomerIntelligenceResult = {
  rfm: RFMScore;
  value: CustomerValue;
  retention: RetentionAlert[];
  affinity: ProductAffinity;
  repeatPurchase: RepeatPurchaseOpportunity[];
  opportunities: CustomerOpportunity[];
  summary: {
    segmentAr: string;
    valueAr: string;
    riskLevel: 'low' | 'medium' | 'high';
    riskLevelAr: string;
    nextActionAr: string;
  };
};

/* ───────────────────────── Constants ───────────────────────── */

const DAY_MS = 24 * 60 * 60 * 1000;

const VALID_ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'paid'];

/* ───────────────────────── RFM Scoring ───────────────────────── */

function computeRecencyScore(daysSinceLastOrder: number): number {
  if (daysSinceLastOrder <= 7) return 5;
  if (daysSinceLastOrder <= 30) return 4;
  if (daysSinceLastOrder <= 60) return 3;
  if (daysSinceLastOrder <= 120) return 2;
  return 1;
}

function computeFrequencyScore(orderCount: number): number {
  if (orderCount >= 10) return 5;
  if (orderCount >= 5) return 4;
  if (orderCount >= 3) return 3;
  if (orderCount >= 2) return 2;
  return 1;
}

function computeMonetaryScore(totalSpend: number): number {
  if (totalSpend >= 500000) return 5;
  if (totalSpend >= 200000) return 4;
  if (totalSpend >= 100000) return 3;
  if (totalSpend >= 50000) return 2;
  return 1;
}

function rfmSegment(r: number, f: number, m: number): { key: string; ar: string } {
  const avg = (r + f + m) / 3;
  if (r >= 4 && f >= 4 && m >= 4) return { key: 'champion', ar: 'عميل مميز' };
  if (r >= 4 && f >= 3) return { key: 'loyal', ar: 'عميل وفيّ' };
  if (r >= 4 && f <= 2) return { key: 'potential', ar: 'عميل واعد' };
  if (r >= 3 && f >= 3 && m >= 3) return { key: 'loyal', ar: 'عميل وفيّ' };
  if (r <= 2 && f >= 3 && m >= 3) return { key: 'at_risk', ar: 'معرّض للخطر' };
  if (r <= 2 && f >= 4) return { key: 'cant_lose', ar: 'لا يمكن فقدانه' };
  if (r <= 2 && f <= 2) return { key: 'hibernating', ar: 'غير نشط' };
  if (avg >= 3) return { key: 'potential', ar: 'عميل واعد' };
  if (avg >= 2) return { key: 'needs_attention', ar: 'يحتاج اهتمام' };
  return { key: 'hibernating', ar: 'غير نشط' };
}

function buildRFM(profile: CustomerProfileSummary): RFMScore {
  const now = Date.now();
  const lastOrder = profile.last_purchase_at ? new Date(profile.last_purchase_at).getTime() : 0;
  const recencyDays = lastOrder > 0 ? Math.floor((now - lastOrder) / DAY_MS) : 9999;
  const r = computeRecencyScore(recencyDays);
  const f = computeFrequencyScore(profile.total_orders);
  const m = computeMonetaryScore(profile.total_spent);
  const seg = rfmSegment(r, f, m);
  return {
    recency: r,
    frequency: f,
    monetary: m,
    segment: seg.key,
    segmentAr: seg.ar,
    explanation: `R:${r} F:${f} M:${m} — ${seg.ar} (آخر شراء منذ ${recencyDays} يوم، ${profile.total_orders} طلبات، ${profile.total_spent} ر.ي)`,
  };
}

/* ───────────────────────── Customer Value ───────────────────────── */

function buildValue(profile: CustomerProfileSummary): CustomerValue {
  const now = Date.now();
  const firstSeen = profile.first_seen ? new Date(profile.first_seen).getTime() : now;
  const daysActive = Math.max(1, Math.floor((now - firstSeen) / DAY_MS));
  const frequency = profile.total_orders > 1
    ? Math.round(daysActive / profile.total_orders)
    : daysActive;
  const lastOrder = profile.last_purchase_at ? new Date(profile.last_purchase_at).getTime() : 0;
  const recencyDays = lastOrder > 0 ? Math.floor((now - lastOrder) / DAY_MS) : 9999;

  let valueTier: CustomerValue['valueTier'] = 'low';
  let valueTierAr = 'منخفضة';
  if (profile.total_orders >= 10 && profile.total_spent >= 300000) {
    valueTier = 'vip';
    valueTierAr = 'VIP';
  } else if (profile.total_orders >= 5 || profile.total_spent >= 150000) {
    valueTier = 'high';
    valueTierAr = 'عالية';
  } else if (profile.total_orders >= 2 || profile.total_spent >= 50000) {
    valueTier = 'medium';
    valueTierAr = 'متوسطة';
  }

  const explanation = profile.total_orders === 0
    ? 'بيانات غير كافية — لا توجد طلبات بعد'
    : `${valueTierAr}: ${profile.total_orders} طلبات، ${profile.total_spent} ر.ي إجمالي، متوسط ${profile.average_order_value} ر.ي`;

  return {
    totalSpend: profile.total_spent,
    orderCount: profile.total_orders,
    averageOrderValue: profile.average_order_value,
    purchaseFrequency: frequency,
    recencyDays,
    valueTier,
    valueTierAr,
    explanation,
  };
}

/* ───────────────────────── Retention Intelligence ───────────────────────── */

function buildRetention(profile: CustomerProfileSummary, value: CustomerValue): RetentionAlert[] {
  const alerts: RetentionAlert[] = [];

  if (profile.total_orders === 0) return alerts;

  // High-value at risk
  if ((value.valueTier === 'vip' || value.valueTier === 'high') && value.recencyDays > 60) {
    alerts.push({
      type: 'high_value_at_risk',
      priority: 'high',
      reason: 'High-value customer with extended inactivity',
      reasonAr: 'عميل قيمة عالية غير نشط لفترة طويلة',
      evidence: `${profile.total_orders} طلبات، ${profile.total_spent} ر.ي، آخر شراء منذ ${value.recencyDays} يوم`,
      recommendedAction: 'Review for retention campaign',
      recommendedActionAr: 'مراجعة لحملة احتفاظ',
    });
  }

  // New customer without repeat
  if (profile.total_orders === 1 && value.recencyDays > 30) {
    alerts.push({
      type: 'new_no_repeat',
      priority: 'medium',
      reason: 'New customer did not return after first order',
      reasonAr: 'عميل جديد لم يعد بعد الطلب الأول',
      evidence: `طلب واحد منذ ${value.recencyDays} يوم`,
      recommendedAction: 'Send follow-up offer',
      recommendedActionAr: 'إرسال عرض متابعة',
    });
  }

  // Frequency drop
  if (profile.total_orders >= 3 && value.purchaseFrequency > 0) {
    const expectedDays = value.purchaseFrequency;
    if (value.recencyDays > expectedDays * 2) {
      alerts.push({
        type: 'frequency_drop',
        priority: 'medium',
        reason: 'Customer purchase frequency has dropped',
        reasonAr: 'انخفاض تكرار شراء العميل',
        evidence: `التكرار المتوقع كل ${expectedDays} يوم، آخر شراء منذ ${value.recencyDays} يوم`,
        recommendedAction: 'Send re-engagement campaign',
        recommendedActionAr: 'إرسال حملة إعادة تنشيط',
      });
    }
  }

  // Inactive
  if (value.recencyDays > 90) {
    alerts.push({
      type: 'inactive',
      priority: 'low',
      reason: 'Customer inactive for over 90 days',
      reasonAr: 'عميل غير نشط لأكثر من 90 يوم',
      evidence: `آخر شراء منذ ${value.recencyDays} يوم`,
      recommendedAction: 'Win-back campaign',
      recommendedActionAr: 'حملة استعادة',
    });
  }

  return alerts;
}

/* ───────────────────────── Product Affinity ───────────────────────── */

function buildAffinity(
  profile: CustomerProfileSummary,
  orders: Array<{ id: string }>,
  orderItems: Array<{ order_id?: string; product_id: string | null; category_id: string | null; quantity: number; total: number | string }>,
): ProductAffinity {
  const productUnits = new Map<string, number>();
  const productSpend = new Map<string, number>();
  const categoryPurchases = new Map<string, number>();
  const categoryOrderCount = new Map<string, Set<string>>();

  for (const item of orderItems) {
    if (item.product_id) {
      productUnits.set(item.product_id, (productUnits.get(item.product_id) ?? 0) + item.quantity);
      productSpend.set(item.product_id, (productSpend.get(item.product_id) ?? 0) + Number(item.total));
    }
    if (item.category_id) {
      categoryPurchases.set(item.category_id, (categoryPurchases.get(item.category_id) ?? 0) + item.quantity);
      const orderSet = categoryOrderCount.get(item.category_id) ?? new Set<string>();
      if (item.order_id) orderSet.add(item.order_id);
      categoryOrderCount.set(item.category_id, orderSet);
    }
  }

  const topProducts = Array.from(productUnits.entries())
    .map(([id, units]) => ({ productId: id, name: id, nameAr: id, units, spend: productSpend.get(id) ?? 0 }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  const topCategories = Array.from(categoryPurchases.entries())
    .map(([cat, purchases]) => ({ category: cat, views: 0, purchases }))
    .sort((a, b) => b.purchases - a.purchases)
    .slice(0, 5);

  const crossSellOpportunities: ProductAffinity['crossSellOpportunities'] = [];
  if (topCategories.length >= 2) {
    const fromOrders = categoryOrderCount.get(topCategories[0].category)?.size ?? 0;
    const toOrders = categoryOrderCount.get(topCategories[1].category)?.size ?? 0;
    const minEvidence = Math.min(fromOrders, toOrders);
    crossSellOpportunities.push({
      fromCategory: topCategories[0].category,
      toCategory: topCategories[1].category,
      confidence: minEvidence >= 3 ? 'high' : minEvidence >= 2 ? 'medium' : 'low',
      explanationAr:
        minEvidence < 2
          ? `بيانات غير كافية للتأكيد — العميل اشترى من "${topCategories[0].category}" و"${topCategories[1].category}" مرة واحدة فقط، فرصة بيع مشترك محتملة`
          : `العميل اشترى من "${topCategories[0].category}" (${fromOrders} طلبات) و"${topCategories[1].category}" (${toOrders} طلبات) — فرصة بيع مشترك`,
    });
  }

  const totalOrders = orders.length;
  const purchasePattern = totalOrders >= 5 ? 'frequent' : totalOrders >= 2 ? 'moderate' : 'single';
  const purchasePatternAr = totalOrders >= 5 ? 'مشتري متكرر' : totalOrders >= 2 ? 'مشتري معتدل' : 'مشتري لمرة واحدة';

  return { topProducts, topCategories, crossSellOpportunities, purchasePattern, purchasePatternAr };
}

/* ───────────────────────── Repeat Purchase ───────────────────────── */

function buildRepeatPurchase(
  orderItems: Array<{ order_id?: string; product_id: string | null; quantity: number }>,
  orders: Array<{ id: string; created_at: string }>,
): RepeatPurchaseOpportunity[] {
  const productCounts = new Map<string, number>();
  const productLastOrder = new Map<string, string>();
  const orderIdDate = new Map<string, string>();
  for (const o of orders) orderIdDate.set(o.id, o.created_at);

  for (const item of orderItems) {
    if (!item.product_id) continue;
    productCounts.set(item.product_id, (productCounts.get(item.product_id) ?? 0) + item.quantity);
    const itemDate = item.order_id ? orderIdDate.get(item.order_id) : undefined;
    if (itemDate) {
      const existing = productLastOrder.get(item.product_id);
      if (!existing || itemDate > existing) productLastOrder.set(item.product_id, itemDate);
    }
  }

  const opportunities: RepeatPurchaseOpportunity[] = [];
  const sortedOrders = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  for (const [pid, count] of productCounts) {
    if (count < 2) continue;
    const lastOrderDate = productLastOrder.get(pid) ?? sortedOrders[0]?.created_at;
    if (!lastOrderDate) continue;
    const daysAgo = Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / DAY_MS);
    const avgInterval = sortedOrders.length >= 2
      ? Math.floor((new Date(sortedOrders[0].created_at).getTime() - new Date(sortedOrders[sortedOrders.length - 1].created_at).getTime()) / DAY_MS / sortedOrders.length)
      : null;

    opportunities.push({
      productId: pid,
      productName: pid,
      productNameAr: pid,
      lastPurchasedDaysAgo: daysAgo,
      expectedRepurchaseDays: avgInterval,
      confidence: count >= 4 ? 'high' : count >= 2 ? 'medium' : 'low',
      explanationAr: `تم شراء هذا المنتج ${count} مرات${avgInterval ? `، متوقع إعادة الشراء كل ${avgInterval} يوم` : ''}`,
    });
  }

  return opportunities.slice(0, 5);
}

/* ───────────────────────── Opportunities ───────────────────────── */

function buildOpportunities(
  profile: CustomerProfileSummary,
  value: CustomerValue,
  retention: RetentionAlert[],
  affinity: ProductAffinity,
): CustomerOpportunity[] {
  const opps: CustomerOpportunity[] = [];

  // Retention opportunity
  for (const alert of retention) {
    if (alert.priority === 'high') {
      opps.push({
        type: 'retention',
        priority: 'high',
        explanationAr: alert.reasonAr,
        evidence: alert.evidence,
        recommendedActionAr: alert.recommendedActionAr,
      });
    }
  }

  // Cross-sell opportunity
  for (const cs of affinity.crossSellOpportunities) {
    opps.push({
      type: 'cross_sell',
      priority: 'medium',
      explanationAr: cs.explanationAr,
      evidence: `الفئات: ${cs.fromCategory}, ${cs.toCategory}`,
      recommendedActionAr: 'عرض منتجات من الفئة المكملة',
    });
  }

  // VIP loyalty opportunity
  if (value.valueTier === 'vip') {
    opps.push({
      type: 'loyalty',
      priority: 'medium',
      explanationAr: 'عميل VIP — فرصة لتعزيز الولاء',
      evidence: `${profile.total_orders} طلبات، ${profile.total_spent} ر.ي`,
      recommendedActionAr: 'عرض حصري أو نقاط إضافية',
    });
  }

  // Upsell opportunity
  if (value.valueTier === 'medium' && profile.total_orders >= 3) {
    opps.push({
      type: 'upsell',
      priority: 'low',
      explanationAr: 'عميل بمستوى متوسط — فرصة لزيادة القيمة',
      evidence: `${profile.total_orders} طلبات، متوسط ${profile.average_order_value} ر.ي`,
      recommendedActionAr: 'عرض منتجات بقيمة أعلى',
    });
  }

  return opps;
}

/* ───────────────────────── Summary ───────────────────────── */

function buildSummary(
  rfm: RFMScore,
  value: CustomerValue,
  retention: RetentionAlert[],
): CustomerIntelligenceResult['summary'] {
  const riskLevel = retention.some((a) => a.priority === 'high')
    ? 'high'
    : retention.some((a) => a.priority === 'medium')
    ? 'medium'
    : 'low';

  const riskLevelAr = riskLevel === 'high' ? 'مرتفع' : riskLevel === 'medium' ? 'متوسط' : 'منخفض';

  let nextActionAr = 'لا إجراء مطلوب';
  if (retention.some((a) => a.priority === 'high')) {
    nextActionAr = 'إجراء احتفاظ عاجل';
  } else if (retention.some((a) => a.priority === 'medium')) {
    nextActionAr = 'متابعة قريبة';
  } else if (value.valueTier === 'vip') {
    nextActionAr = 'تعزيز الولاء';
  }

  return {
    segmentAr: rfm.segmentAr,
    valueAr: value.valueTierAr,
    riskLevel,
    riskLevelAr,
    nextActionAr,
  };
}

/* ───────────────────────── Main Function ───────────────────────── */

export async function getCustomerIntelligence(customerId: string): Promise<CustomerIntelligenceResult | null> {
  if (!customerId) return null;
  const supabase = createAdminClient();

  // Fetch all required data
  const ordersRes = await supabase
    .from('orders')
    .select('id, total, created_at, status')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  const allOrders = (ordersRes.data ?? []) as Array<{ id: string; total: number | string; created_at: string; status: string }>;
  const validOrders = allOrders.filter((o) => VALID_ORDER_STATUSES.includes(o.status));
  const orderIds = validOrders.map((o) => o.id);

  const itemsRes = orderIds.length > 0
    ? await supabase.from('order_items').select('order_id, product_id, category_id, quantity, total').in('order_id', orderIds)
    : { data: [] as unknown[] };
  const orderItems = (itemsRes.data ?? []) as Array<{ order_id: string; product_id: string | null; category_id: string | null; quantity: number; total: number | string }>;

  // Build profile from real data
  const totalSpent = validOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const orderCount = validOrders.length;
  const lastPurchaseAt = validOrders[0]?.created_at ?? null;
  const firstSeen = validOrders.length > 0 ? validOrders[validOrders.length - 1].created_at : null;

  const profile: CustomerProfileSummary = {
    customer_id: customerId,
    first_seen: firstSeen,
    last_active_at: lastPurchaseAt,
    total_sessions: 0,
    total_page_views: 0,
    total_product_views: 0,
    total_cart_additions: 0,
    total_orders: orderCount,
    total_spent: totalSpent,
    average_order_value: orderCount > 0 ? Math.round(totalSpent / orderCount) : 0,
    last_purchase_at: lastPurchaseAt,
    lifecycle_state: 'active',
    top_products: [],
    top_categories: [],
    repeat_purchase_rate: orderCount > 0 ? Math.round(((orderCount - 1) / orderCount) * 100) : 0,
  };

  // Compute intelligence
  const rfm = buildRFM(profile);
  const value = buildValue(profile);
  const retention = buildRetention(profile, value);
  const affinity = buildAffinity(profile, validOrders, orderItems);
  const repeatPurchase = buildRepeatPurchase(orderItems, validOrders);
  const opportunities = buildOpportunities(profile, value, retention, affinity);
  const summary = buildSummary(rfm, value, retention);

  return { rfm, value, retention, affinity, repeatPurchase, opportunities, summary };
}

/* ───────────────────────── Batch Intelligence ───────────────────────── */

export async function getBatchCustomerIntelligence(
  customerIds: string[],
): Promise<Map<string, CustomerIntelligenceResult>> {
  const results = new Map<string, CustomerIntelligenceResult>();
  for (const cid of customerIds) {
    const intel = await getCustomerIntelligence(cid);
    if (intel) results.set(cid, intel);
  }
  return results;
}

/* ───────────────────────── Overview ───────────────────────── */

export type IntelligenceOverview = {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  vipCustomers: number;
  atRiskCustomers: number;
  inactiveCustomers: number;
  totalRevenue: number;
  averageOrderValue: number;
  segmentDistribution: Array<{ segment: string; segmentAr: string; count: number; percentage: number }>;
};

export async function getIntelligenceOverview(): Promise<IntelligenceOverview> {
  const supabase = createAdminClient();

  const { data: customers } = await supabase.from('customers').select('id');
  const customerIds = ((customers ?? []) as Array<{ id: string }>).map((c) => c.id);

  const { data: ordersData } = await supabase.from('orders').select('customer_id, total, status');
  const orders = (ordersData ?? []) as Array<{ customer_id: string; total: number | string; status: string }>;
  const validOrders = orders.filter((o) => VALID_ORDER_STATUSES.includes(o.status));

  const customerOrderMap = new Map<string, { count: number; total: number; lastOrder: string }>();
  for (const o of validOrders) {
    const existing = customerOrderMap.get(o.customer_id) ?? { count: 0, total: 0, lastOrder: '' };
    existing.count++;
    existing.total += Number(o.total);
    customerOrderMap.set(o.customer_id, existing);
  }

  let active = 0, newC = 0, returning = 0, vip = 0, atRisk = 0, inactive = 0;
  const segments = new Map<string, number>();

  for (const cid of customerIds) {
    const data = customerOrderMap.get(cid);
    if (!data) { inactive++; continue; }

    const now = Date.now();
    const lastOrderTs = data.lastOrder ? new Date(data.lastOrder).getTime() : 0;
    const daysSince = lastOrderTs > 0 ? Math.floor((now - lastOrderTs) / DAY_MS) : 9999;

    if (data.count >= 10 && data.total >= 300000) { vip++; segments.set('vip', (segments.get('vip') ?? 0) + 1); }
    else if (data.count >= 5) { active++; segments.set('loyal', (segments.get('loyal') ?? 0) + 1); }
    else if (data.count === 1) { newC++; segments.set('new', (segments.get('new') ?? 0) + 1); }
    else { returning++; segments.set('returning', (segments.get('returning') ?? 0) + 1); }

    if (daysSince > 90) { atRisk++; segments.set('at_risk', (segments.get('at_risk') ?? 0) + 1); }
    else if (daysSince > 60) { inactive++; }
  }

  const totalRevenue = validOrders.reduce((s, o) => s + Number(o.total), 0);
  const totalOrderCount = validOrders.length;

  const segmentDist = Array.from(segments.entries()).map(([seg, count]) => ({
    segment: seg,
    segmentAr: seg === 'vip' ? 'VIP' : seg === 'loyal' ? 'وفيّ' : seg === 'new' ? 'جديد' : seg === 'returning' ? 'عائد' : seg === 'at_risk' ? 'معرّض للخطر' : seg,
    count,
    percentage: customerIds.length > 0 ? Math.round((count / customerIds.length) * 100) : 0,
  }));

  return {
    totalCustomers: customerIds.length,
    activeCustomers: active,
    newCustomers: newC,
    returningCustomers: returning,
    vipCustomers: vip,
    atRiskCustomers: atRisk,
    inactiveCustomers: inactive,
    totalRevenue,
    averageOrderValue: totalOrderCount > 0 ? Math.round(totalRevenue / totalOrderCount) : 0,
    segmentDistribution: segmentDist,
  };
}
