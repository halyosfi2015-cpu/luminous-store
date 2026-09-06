/**
 * UNIFIED INTELLIGENCE ORCHESTRATOR
 * =================================
 * Single reusable facade over the existing canonical intelligence services.
 * It performs NO calculations of its own: every function delegates to the
 * Customer / Commercial / Operations engines and composes verified results.
 *
 *   Supabase → canonical services → verified facts → this facade → UI / AI
 */

import 'server-only';
import { createAdminClient } from '@/src/lib/supabase';

import {
  buildExecutiveDashboard,
  buildInventoryOverview,
  generateAlerts,
  syncAlerts,
  openAlerts,
  detectOpportunities,
  computeSalesSummary,
  detectAnomalies,
  computeOrderIntelligence,
  buildPriceIntelligence,
  computeCustomerStats,
  computeReorderRecommendations,
} from '@/src/lib/store-ops';
import type { StoreOpsState, BusinessAlert, Opportunity, ProductStockInfo, SalesSummary, ExecutiveDashboard } from '@/src/lib/store-ops';
import type { Product } from '@/src/types/product';
import type { Order } from '@/types/cart';

import { getIntelligenceOverview, getCustomerIntelligence } from '@/src/lib/analytics/customer-intelligence';
import type { IntelligenceOverview, CustomerIntelligenceResult } from '@/src/lib/analytics/customer-intelligence';
import { evaluateCustomerSegmentsBatch } from '@/src/lib/analytics/segments';

const MAX_CUSTOMER_SAMPLE = 200;
const MAX_CUSTOMER_DEEP = 25;

/* ------------------------------------------------------------------------ */
/* TYPES                                                                     */
/* ------------------------------------------------------------------------ */

export type UnifiedStatus = 'ready' | 'partial' | 'insufficient_data' | 'service_unavailable' | 'error';

export interface CustomerSignal {
  id: string;
  severityAr: string;
  title: string;
  evidence: string;
  confidence: 'high' | 'medium' | 'low';
  confidenceNoteAr: string;
}

export interface CustomerIntelligenceSignals {
  status: UnifiedStatus;
  noteAr: string;
  totalCustomers: number;
  analyzedCustomers: number;
  overview?: IntelligenceOverview;
  signals: CustomerSignal[];
}

export interface OperationalHealth {
  status: UnifiedStatus;
  health: ExecutiveDashboard['health'];
  healthLabelAr: string;
  attention: ExecutiveDashboard['attention'];
  dataNotes: string[];
  hasOrders: boolean;
}

export interface InventoryRisks {
  status: UnifiedStatus;
  outOfStock: ProductStockInfo[];
  atRisk: ProductStockInfo[];
  lowStock: ProductStockInfo[];
  deadStock: ProductStockInfo[];
  totalProducts: number;
}

export interface CriticalAlerts {
  status: UnifiedStatus;
  critical: BusinessAlert[];
  high: BusinessAlert[];
  totalOpen: number;
}

export type OpportunitiesResult =
  | { status: Extract<UnifiedStatus, 'ready'>; opportunities: Opportunity[] }
  | { status: Extract<UnifiedStatus, 'insufficient_data'>; opportunities: Opportunity[]; noteAr: string };

export interface CommercialIntelligence {
  status: UnifiedStatus;
  summary: SalesSummary;
  dashboard: ExecutiveDashboard;
}

/* ------------------------------------------------------------------------ */
/* FACADE                                                                    */
/* ------------------------------------------------------------------------ */

/** Customer Intelligence signals — delegates to analytics/customer-intelligence. */
export async function getCustomerSignals(): Promise<CustomerIntelligenceSignals> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('customers').select('id').order('created_at', { ascending: false }).limit(MAX_CUSTOMER_SAMPLE);
  const ids = ((data ?? []) as Array<{ id: string }>).map((c) => c.id);

  if (ids.length === 0) {
    return {
      status: 'insufficient_data',
      noteAr: 'بيانات غير كافية — لا يوجد عملاء بعد في قاعدة البيانات لإنتاج إشارات ذكاء عملاء موثوقة.',
      totalCustomers: 0,
      analyzedCustomers: 0,
      signals: [],
    };
  }

  const overview = await getIntelligenceOverview();
  const withOrders = await customersWithOrders(ids);
  const deepIds = withOrders.slice(0, MAX_CUSTOMER_DEEP);
  const deepResults = new Map<string, CustomerIntelligenceResult>();
  for (const cid of deepIds) {
    const intel = await getCustomerIntelligence(cid);
    if (intel) deepResults.set(cid, intel);
  }

  const segments = await evaluateCustomerSegmentsBatch(ids);
  const signals: CustomerSignal[] = [];

  for (const [cid, intel] of deepResults) {
    if (intel.value.orderCount === 0) continue;
    const name = `عميل ${cid.slice(0, 8)}…`;
    if ((intel.value.valueTier === 'vip' || intel.value.valueTier === 'high') && intel.retention.some((a) => a.type === 'high_value_at_risk')) {
      const ev = intel.retention.find((a) => a.type === 'high_value_at_risk');
      signals.push({
        id: `cust_hvar_${cid}`,
        severityAr: '🟠',
        title: `عميل عالي القيمة معرّض للانقطاع (${name})`,
        evidence: ev?.evidence ?? `${intel.value.orderCount} طلبات، ${intel.value.totalSpend} ر.ي، آخر شراء منذ ${intel.value.recencyDays} يوم`,
        confidence: 'high',
        confidenceNoteAr: 'مبني على سجل طلبات فعلي',
      });
    }
    for (const alert of intel.retention) {
      if (alert.type === 'new_no_repeat') {
        signals.push({
          id: `cust_newnr_${cid}`,
          severityAr: '🟡',
          title: `عميل جديد لم يعد (${name})`,
          evidence: alert.evidence,
          confidence: 'medium',
          confidenceNoteAr: 'طلب واحد فقط — نمط أولي',
        });
      }
    }
  }

  let inactiveCount = 0;
  let atRiskCount = 0;
  for (const ev of segments.values()) {
    if (ev.segments.includes('inactive')) inactiveCount++;
    else if (ev.segments.includes('at_risk')) atRiskCount++;
  }
  if (atRiskCount > 0) {
    signals.push({
      id: 'cust_segm_at_risk',
      severityAr: '🟡',
      title: `${atRiskCount} عميل في شريحة «معرّض للخطر» (نشاط متوقف 30–90 يوم)`,
      evidence: `قاعدة الشرائح ${'phase_6_2_v1'} على أحداث آخر 30 يومًا لعدد ${ids.length} عميل`,
      confidence: 'medium',
      confidenceNoteAr: `عينة محدودة بـ ${MAX_CUSTOMER_SAMPLE} عميل`,
    });
  }
  if (inactiveCount > 0) {
    signals.push({
      id: 'cust_segm_inactive',
      severityAr: '⚪',
      title: `${inactiveCount} عميل غير نشط (+90 يوم)`,
      evidence: 'قاعدة الشرائح phase_6_2_v1',
      confidence: 'medium',
      confidenceNoteAr: `عينة محدودة بـ ${MAX_CUSTOMER_SAMPLE} عميل`,
    });
  }

  return {
    status: 'ready',
    noteAr: `تم تحليل ${ids.length} عميل، منها ${deepIds.length} بتحليل معمّق مبني على الطلبات.`,
    totalCustomers: overview.totalCustomers ?? ids.length,
    analyzedCustomers: ids.length,
    overview,
    signals,
  };
}

async function customersWithOrders(candidateIds: string[]): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('orders').select('customer_id').in('customer_id', candidateIds);
  const set = new Set<string>(((data ?? []) as Array<{ customer_id: string }>).map((r) => r.customer_id));
  return candidateIds.filter((id) => set.has(id));
}

/** Operational health — delegates to the executive dashboard engine. */
export function getOperationalHealth(state: StoreOpsState, products: Product[], orders: Order[], now: string): OperationalHealth {
  const dashboard = buildExecutiveDashboard({ state, products, orders, now });
  const hasOrders = orders.filter((o) => o.status !== 'cancelled').length > 0;
  return {
    status: hasOrders ? 'ready' : 'partial',
    health: dashboard.health,
    healthLabelAr: dashboard.healthLabelAr,
    attention: dashboard.attention,
    dataNotes: dashboard.dataNotes,
    hasOrders,
  };
}

/** Inventory risks — delegates to the inventory engine. */
export function getInventoryRisks(state: StoreOpsState, products: Product[], orders: Order[], now: string): InventoryRisks {
  const overview = buildInventoryOverview(state, { products, orders, now });
  return {
    status: overview.totalProducts === 0 ? 'insufficient_data' : 'ready',
    outOfStock: overview.outOfStock,
    atRisk: overview.atRisk,
    lowStock: overview.lowStock,
    deadStock: overview.deadStock,
    totalProducts: overview.totalProducts,
  };
}

/** Critical alerts — delegates to the alerts engine (detect → sync → classify). */
export async function getCriticalAlerts(
  state: StoreOpsState,
  products: Product[],
  orders: Order[],
  now: string,
): Promise<CriticalAlerts> {
  const inventory = buildInventoryOverview(state, { products, orders, now });
  const fresh = generateAlerts({
    products,
    orders,
    now,
    inventory,
    price: buildPriceIntelligence(products),
    ordersInfo: computeOrderIntelligence(orders, now),
    customers: computeCustomerStats(orders, now),
    anomalies: detectAnomalies({ orders, now, sensitivity: state.settings.anomalySensitivity }),
  });
  await syncAlerts(state, fresh, now);
  const open = openAlerts(state);
  return {
    status: 'ready',
    critical: open.filter((a) => a.severity === 'critical'),
    high: open.filter((a) => a.severity === 'high'),
    totalOpen: open.length,
  };
}

/** Opportunities — delegates to the opportunities engine. */
export function getUnifiedOpportunities(
  state: StoreOpsState,
  products: Product[],
  orders: Order[],
  now: string,
  contentData: Record<string, unknown>,
): OpportunitiesResult {
  if (!orders.some((o) => o.status !== 'cancelled')) {
    return { status: 'insufficient_data', opportunities: [], noteAr: 'بيانات غير كافية — لا توجد طلبات فعلية لاكتشاف فرص موثوقة.' };
  }
  return { status: 'ready', opportunities: detectOpportunities(state, { products, orders, now, ...contentData }) };
}

/** Recommendations — delegates to the reorder recommendation engine. */
export function getRecommendations(state: StoreOpsState, products: Product[], orders: Order[], now: string) {
  return computeReorderRecommendations(state, { products, orders, now });
}

/** Commercial intelligence — delegates to the sales/dashboard engines. */
export function getCommercialIntelligence(state: StoreOpsState, products: Product[], orders: Order[], now: string): CommercialIntelligence {
  return {
    status: orders.length === 0 ? 'insufficient_data' : 'ready',
    summary: computeSalesSummary(orders),
    dashboard: buildExecutiveDashboard({ state, products, orders, now }),
  };
}
