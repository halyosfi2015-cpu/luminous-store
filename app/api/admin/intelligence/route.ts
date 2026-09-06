import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import type { AdminUser } from "@/src/lib/admin-auth";
import { can } from "@/src/admin/permissions";
import { getStoreOps, persistStoreOps, storeReorderRecommendation } from "@/src/lib/store-ops";
import {
  buildInventoryOverview,
  buildPriceIntelligence,
  computeSalesSummary,
  computeOrderIntelligence,
  computeCustomerStats,
  generateAlerts,
  syncAlerts,
  attentionSummary,
  detectAnomalies,
  collectContentStats,
  detectOpportunities,
  buildDailyBriefing,
  analyzeBusiness,
  computeReorderRecommendations,
  salesByProduct,
  salesByCategory,
  salesByBrand,
  salesByDay,
} from "@/src/lib/store-ops";
import { supabaseGetOrders, supabaseGetProducts } from "@/src/lib/admin-supabase";
import { invalidateProductCache } from "@/src/lib/product-dal";
import {
  getCustomerSignals,
  getOperationalHealth,
  getCriticalAlerts,
  getInventoryRisks,
  getUnifiedOpportunities,
} from "@/src/lib/unified/orchestrator";
import type { AdminResource } from "@/src/admin/types";
import { getContentStoreSync } from "@/src/lib/content-ops/store";
import {
  generateItem,
  createCampaign,
  switchContentProvider,
} from "@/src/lib/content-ops/operations";
import { getChannelConnectionStatuses } from "@/src/lib/content-ops/channels";
import { generateContentIdeas } from "@/src/lib/ai/content";
import { createActiveInsightAdapter, getProviderStatus, getOpenAIEnvState } from "@/src/lib/ai/hybrid";
import type { HybridAIProviderName } from "@/src/lib/content-ops/types";
import type { Order } from "@/types/cart";
import type { Product } from "@/src/types/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getStateAndData(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return { admin: null as AdminUser | null, state: null as null, error: admin };
  const state = await getStoreOps();
  return { admin, state, error: null };
}

/** Canonical product list — Supabase is the source of truth. */
async function loadProducts(): Promise<Product[]> {
  try {
    const rows = await supabaseGetProducts();
    if (rows && rows.length > 0) return rows as Product[];
  } catch {
    /* fall back to static catalog */
  }
  return (await import("@/src/data/products")).products as Product[];
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const contentStore = getContentStoreSync();
  // Real, computed health — derived from canonical data & service state,
  // never hardcoded "operational".
  const state = await getStoreOps();
  const products = await loadProducts();
  const orders = await supabaseGetOrders();
  const now = new Date().toISOString();

  const health = getOperationalHealth(state, products, orders, now);
  const providerStatus = getProviderStatus(contentStore.settings);
  const openaiEnv = getOpenAIEnvState();
  const channels = getChannelConnectionStatuses(contentStore.settings);
  const catalogReady = products.length > 0;
  const aiProviderState = providerStatus.ready ? "ready" : openaiEnv.configured ? "partial" : "service_unavailable";

  return NextResponse.json({
    success: true,
    provider: providerStatus,
    openaiEnv,
    channels,
    parts: {
      customer_intelligence: {
        status: health.hasOrders ? "ready" : "insufficient_data",
        noteAr: health.hasOrders ? "الطلبات متوفرة" : "بيانات غير كافية — لا توجد طلبات",
      },
      commercial_intelligence: { status: health.hasOrders ? "ready" : "insufficient_data", noteAr: health.hasOrders ? "المبيعات متوفرة" : "بيانات غير كافية — لا توجد طلبات" },
      store_operations: { status: catalogReady ? "ready" : "error", noteAr: catalogReady ? `${products.length} منتج في الكتالوج` : "لا توجد منتجات في الكتالوج" },
      unified_orchestrator: { status: "ready", noteAr: "الطبقة الموحدة تعمل فوق الخدمات القانونية" },
    },
    status:
      catalogReady && providerStatus.ready
        ? health.hasOrders
          ? "operational"
          : "partial"
        : "degraded",
  });
}

/* ------------------------------------------------------------------------ */
/* UNIFIED RESULT ENVELOPE                                                   */
/* ------------------------------------------------------------------------ */

type ResultActionTone = "primary" | "success" | "danger" | "neutral";

interface ResultAction {
  id: string;
  label: string;
  kind: "navigate" | "command";
  href?: string;
  command?: string;
  tone?: ResultActionTone;
}

function execId(): string {
  return `exec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function okResult(
  title: string,
  extra: Record<string, unknown>,
  options: { actions?: ResultAction[]; warnings?: string[]; hasData?: boolean; noteAr?: string; auditReference?: string | null; affectedEntities?: unknown[] } = {},
): Record<string, unknown> {
  return {
    executionId: execId(),
    status: "ok",
    title,
    actions: options.actions ?? [],
    warnings: options.warnings ?? [],
    affectedEntities: options.affectedEntities ?? [],
    dataAvailability: {
      hasData: options.hasData ?? true,
      noteAr: options.noteAr ?? "تم التنفيذ على البيانات الحقيقية للمتجر",
    },
    auditReference: options.auditReference ?? null,
    ...extra,
  };
}

const NAV_ACTIONS = {
  opportunities: { id: "open-opportunities", label: "فتح فرص المتجر", kind: "navigate" as const, href: "/admin/store-ops/opportunities", tone: "primary" as const },
  alerts: { id: "open-alerts", label: "فتح التنبيهات", kind: "navigate" as const, href: "/admin/store-ops/alerts", tone: "primary" as const },
  inventory: { id: "open-inventory", label: "فتح المخزون في تشغيل المتجر", kind: "navigate" as const, href: "/admin/store-ops/inventory", tone: "primary" as const },
  sales: { id: "open-sales", label: "فتح تقرير المبيعات", kind: "navigate" as const, href: "/admin/store-ops/sales", tone: "primary" as const },
  orders: { id: "open-orders", label: "فتح سجل الطلبات", kind: "navigate" as const, href: "/admin/orders", tone: "primary" as const },
  overview: { id: "open-overview", label: "فتح نظرة عامة المتجر", kind: "navigate" as const, href: "/admin/store-ops", tone: "primary" as const },
  products: { id: "open-products", label: "فتح المنتجات", kind: "navigate" as const, href: "/admin/store-ops/products", tone: "primary" as const },
  contentCenter: { id: "open-content-center", label: "فتح مركز المحتوى", kind: "navigate" as const, href: "/admin/ai/content/items", tone: "primary" as const },
  campaignsCenter: { id: "open-campaigns", label: "فتح إدارة الحملات", kind: "navigate" as const, href: "/admin/ai/content/campaigns", tone: "primary" as const },
  createContent: { id: "create-content", label: "إنشاء محتوى الآن", kind: "command" as const, command: "generate_content", tone: "success" as const },
  createCampaign: { id: "create-campaign", label: "إنشاء حملة الآن", kind: "command" as const, command: "create_campaign", tone: "success" as const },
  runRecommendations: { id: "run-reorder", label: "تشغيل توصيات إعادة الطلب", kind: "command" as const, command: "run_recommendations", tone: "success" as const },
};

const attentionRouteFor = (code: string): string => {
  if (code.startsWith("stock:")) return "/admin/store-ops/inventory";
  if (code.startsWith("price:")) return "/admin/store-ops/products";
  if (code.startsWith("orders:")) return "/admin/orders";
  return "/admin/store-ops/alerts";
};

const attentionCodeLabel = (code: string): string => {
  if (code.startsWith("stock:OUT_OF_STOCK")) return "منتجات نفدت";
  if (code.startsWith("stock:LOW_STOCK")) return "مخزون منخفض";
  if (code.startsWith("stock:AT_RISK")) return "مخزون معرض للخطر";
  if (code.startsWith("stock:DEAD_STOCK")) return "مخزون راكد";
  if (code.startsWith("stock:OVERSTOCK")) return "مخزون زائد";
  if (code.startsWith("price:rejected")) return "أسعار تحتاج مراجعة";
  if (code.startsWith("price:")) return "مشكلات أسعار";
  if (code.startsWith("orders:delayed")) return "طلبات متأخرة";
  if (code.startsWith("orders:")) return "مشكلات طلبات";
  if (code.startsWith("anomaly:")) return "شذوذ مبيعات";
  return code;
};

export async function POST(request: NextRequest) {
  const { admin, state, error } = await getStateAndData(request);
  if (error) return error;
  if (!state) {
    return NextResponse.json({ error: { code: "store_unavailable", message: "Intelligence not initialized" } }, { status: 503 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: { code: "invalid_request", message: "Invalid JSON body" } }, { status: 400 });
  }

  const command = (body.command as string) ?? "";
  const actor = admin.name ?? "admin";
  const products = await loadProducts();
  const serverOrders = await supabaseGetOrders();
  const orders: Order[] = serverOrders;
  const now = new Date().toISOString();
  const contentData = collectContentStats();
  const byId = new Map(products.map((p) => [p.id, p]));
  const nameOf = (id: string): string => byId.get(id)?.name?.ar ?? id;

  // Per-command RBAC — uses the existing permission matrix (no parallel system).
  // Analysis/read commands need view; generation needs ai/content edit;
  // execution & provider switching need store_ops edit.
  const COMMAND_PERMISSION: Record<string, { resource: AdminResource; permission: "view" | "edit" }> = {
    inventory_check: { resource: "store_ops", permission: "view" },
    attention: { resource: "store_ops", permission: "view" },
    sales_analysis: { resource: "store_ops", permission: "view" },
    find_opportunities: { resource: "store_ops", permission: "view" },
    daily_report: { resource: "store_ops", permission: "view" },
    generate_ideas: { resource: "ai", permission: "edit" },
    generate_content: { resource: "ai", permission: "edit" },
    create_campaign: { resource: "content", permission: "edit" },
    run_recommendations: { resource: "store_ops", permission: "edit" },
    set_provider: { resource: "store_ops", permission: "edit" },
  };
  const perm = COMMAND_PERMISSION[command];
  if (perm && !can(admin.role, perm.resource, perm.permission)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Permission denied" } }, { status: 403 });
  }
  if (!perm) {
    // Unknown commands fall through to the switch default (400).
  }

  try {
    switch (command) {
      case "generate_ideas": {
        const result = await analyzeBusiness({
          state,
          products,
          orders,
          now,
          question: "أعطني أفضل الأفكار وأولويات العمل الحالية للمتجر",
          scope: "overview",
          ...contentData,
        });
        if (!result.success) {
          return NextResponse.json(
            { error: result.error, disabled: result.disabled },
            { status: result.disabled ? 409 : 500 }
          );
        }
        await persistStoreOps(state);
        return NextResponse.json(okResult("توليد أفضل الأفكار", { analysis: result.response }, {
          actions: [
            NAV_ACTIONS.opportunities,
            NAV_ACTIONS.alerts,
            NAV_ACTIONS.createContent,
            NAV_ACTIONS.createCampaign,
          ],
          auditReference: "store-ops:analyst",
        }));
      }

      case "generate_content": {
        const contentStore = getContentStoreSync();
        const provider = createActiveInsightAdapter(contentStore.settings);
        const res = await generateItem(
          contentStore,
          { contentType: "PRODUCT_SPOTLIGHT", objective: "AWARENESS", language: "ar" },
          actor,
          { provider, autoSchedule: false, now }
        );
        if (!res.ok || !res.data) {
          return NextResponse.json({ error: res.error }, { status: 409 });
        }
        return NextResponse.json(okResult("إنشاء محتوى", {
          contentId: res.data.id,
          itemStatus: res.data.status,
          content: res.data,
        }, {
          actions: [NAV_ACTIONS.contentCenter],
          auditReference: `content:${res.data.id}`,
        }));
      }

      case "create_campaign": {
        const ideas = generateContentIdeas({
          contentType: "COMMERCIAL",
          counts: { COMMERCIAL: 3 },
          objective: "CONVERSION",
          limit: 3,
        });
        if (ideas.length === 0) {
          return NextResponse.json(
            { error: { code: "no_candidates", message: "لا توجد منتجات مؤهلة لإنشاء حملة الآن" } },
            { status: 409 }
          );
        }
        const idea = ideas[0];
        const endAt = new Date(Date.parse(now) + 7 * 86400000).toISOString();
        const contentStore = getContentStoreSync();
        const res = await createCampaign(
          contentStore,
          {
            name: idea.title,
            objective: "CONVERSION",
            startAt: now,
            endAt,
            priority: 80,
            categoryIds: idea.categoryId ? [idea.categoryId] : [],
            productIds: idea.productIds,
            contentTypes: ["COMMERCIAL"],
            channels: ["website", "instagram"],
            status: "draft",
          },
          actor,
          now
        );
        if (!res.ok || !res.data) {
          return NextResponse.json({ error: res.error }, { status: 409 });
        }
        return NextResponse.json(okResult("إنشاء حملة", {
          campaign: res.data,
          campaignId: res.data.id,
          ideas,
        }, {
          actions: [
            NAV_ACTIONS.campaignsCenter,
            NAV_ACTIONS.createContent,
          ],
          auditReference: `campaign:${res.data.id}`,
        }));
      }

      case "inventory_check": {
        const overview = buildInventoryOverview(state, { products, orders, now });
        const enrich = (rows: Array<{ productId: string }>) =>
          rows.map((r) => ({ ...r, nameAr: nameOf(r.productId) }));
        return NextResponse.json(okResult("فحص المخزون", {
          inventory: {
            totalProducts: overview.totalProducts,
            movementCount: overview.movementCount,
            hasOrderData: overview.hasOrderData,
            outOfStock: enrich(overview.outOfStock),
            lowStock: enrich(overview.lowStock),
            atRisk: enrich(overview.atRisk),
            overstock: enrich(overview.overstock),
            deadStock: enrich(overview.deadStock),
            normal: enrich(overview.normal),
          },
        }, {
          actions: [NAV_ACTIONS.inventory, NAV_ACTIONS.runRecommendations, NAV_ACTIONS.products],
          affectedEntities: [...overview.outOfStock, ...overview.lowStock, ...overview.atRisk].map((r) => r.productId),
          noteAr: `تم مسح ${overview.totalProducts} منتج من المخزون الحقيقي`,
        }));
      }

      case "attention": {
        // Unified orchestration: Operations + Commercial + Customer signals,
        // each delegated to its canonical engine — no recomputation here.
        const inventoryRisks = getInventoryRisks(state, products, orders, now);
        const critical = await getCriticalAlerts(state, products, orders, now);
        const customerSignals = await getCustomerSignals();
        const attention = attentionSummary(state);
        const findings = [
          ...critical.critical.map((a) => ({ title: a.messageAr, description: a.evidence ?? a.reason, severity: "critical" as const })),
          ...critical.high.slice(0, 5).map((a) => ({ title: a.messageAr, description: a.evidence ?? a.reason, severity: "high" as const })),
          ...inventoryRisks.atRisk.slice(0, 3).map((p) => ({
            title: `خطر نفاد: ${nameOf(p.productId)}`,
            description: `المخزون الحالي ${p.currentStock} — معدل البيع ${p.averageDailySales}/يوم، التغطية ${p.coverageDays ?? "—"} يوم`,
            severity: "medium" as const,
          })),
          ...customerSignals.signals.map((s) => ({
            title: s.title,
            description: `${s.evidence} — الثقة: ${s.confidence} (${s.confidenceNoteAr})`,
            severity: s.severityAr === '🟠' ? 'high' : 'low',
          })),
        ];
        const hasData = findings.length > 0 || critical.totalOpen > 0;
        return NextResponse.json(okResult("ماذا يحتاج انتباهي؟", {
          attention,
          anomalies: [],
          criticalAlerts: { count: critical.critical.length + critical.high.length, totalOpen: critical.totalOpen },
          customerSignals: {
            status: customerSignals.status,
            noteAr: customerSignals.noteAr,
            signals: customerSignals.signals,
          },
          findings,
        }, {
          actions: [
            ...attention.map((a) => ({
              id: `open-${a.code}`,
              label: `فتح: ${attentionCodeLabel(a.code)}`,
              kind: "navigate" as const,
              href: attentionRouteFor(a.code),
              tone: "primary" as const,
            })),
            NAV_ACTIONS.alerts,
            NAV_ACTIONS.inventory,
          ],
          hasData,
          noteAr: !hasData
            ? "لا توجد تنبيهات حرجة حاليًا."
            : customerSignals.status === 'insufficient_data'
              ? `تم تجميع الإشارات التشغيلية والتجارية. ${customerSignals.noteAr}`
              : `تم تجميع إشارات المخزون والمبيعات والعملاء — ${customerSignals.noteAr}`,
          auditReference: "store-ops:audit",
        }));
      }

      case "sales_analysis": {
        const summary = computeSalesSummary(orders);
        const byProduct = salesByProduct(orders);
        const byCategory = salesByCategory(orders, products);
        const byBrand = salesByBrand(orders, products);
        const byDay = salesByDay(orders);
        const hasOrders = summary.hasOrders === true;
        return NextResponse.json(okResult("تحليل المبيعات", { summary, byProduct, byCategory, byBrand, byDay }, {
          actions: [NAV_ACTIONS.sales, NAV_ACTIONS.orders],
          hasData: hasOrders,
          noteAr: hasOrders ? undefined : "لا توجد طلبات مسجلة لتحليل المبيعات",
        }));
      }

      case "find_opportunities": {
        const oppsResult = getUnifiedOpportunities(state, products, orders, now, contentData as unknown as Record<string, unknown>);
        if (oppsResult.status === 'insufficient_data') {
          return NextResponse.json(okResult("اكتشاف الفرص", { opportunities: [] }, {
            actions: [NAV_ACTIONS.opportunities],
            hasData: false,
            noteAr: oppsResult.noteAr,
          }));
        }
        const opportunities = oppsResult.opportunities;
        return NextResponse.json(okResult("اكتشاف الفرص", { opportunities }, {
          actions: [
            NAV_ACTIONS.opportunities,
            NAV_ACTIONS.createContent,
            NAV_ACTIONS.createCampaign,
          ],
          hasData: opportunities.length > 0,
          noteAr: opportunities.length > 0 ? `تم اكتشاف ${opportunities.length} فرصة` : "لا توجد فرص مكتشفة حالياً",
          affectedEntities: opportunities.map((o) => o.titleAr),
        }));
      }

      case "daily_report": {
        const briefing = await buildDailyBriefing({ state, products, orders, now, ...contentData });
        await persistStoreOps(state);
        return NextResponse.json(okResult("تقرير اليوم", { briefing }, {
          actions: [NAV_ACTIONS.overview, NAV_ACTIONS.alerts, NAV_ACTIONS.opportunities],
          hasData: Boolean(briefing?.facts),
          noteAr: briefing?.facts ? "تم إصدار تقرير اليوم من بيانات حقيقية" : "بيانات اليوم غير كافية لإصدار تقرير كامل",
          auditReference: "store-ops:briefing",
        }));
      }

      case "run_recommendations": {
        // Delegate to the canonical recommendation engine — no inline re-implementation.
        const computed = computeReorderRecommendations(state, { products, orders, now });
        for (const rec of computed) {
          await storeReorderRecommendation(state, rec, actor);
        }
        const recs = computed;
        await persistStoreOps(state);
        const inventory = buildInventoryOverview(state, { products, orders, now });
        const anomalies = detectAnomalies({ orders, now, sensitivity: state.settings.anomalySensitivity });
        const fresh = generateAlerts({
          products,
          orders,
          now,
          inventory,
          price: buildPriceIntelligence(products),
          ordersInfo: computeOrderIntelligence(orders, now),
          customers: computeCustomerStats(orders, now),
          anomalies,
        });
        await syncAlerts(state, fresh, now);
        await persistStoreOps(state);
        return NextResponse.json(okResult("تشغيل التوصيات", {
          recommendations: recs.map((r) => ({ ...r, status: state.reorder[r.productId]?.status ?? r.status, nameAr: nameOf(r.productId) })),
          anomalies,
          alertsGenerated: fresh.length,
        }, {
          actions: [NAV_ACTIONS.inventory],
          affectedEntities: recs.map((r) => r.productId),
          noteAr: `تم توليد ${recs.length} توصية إعادة طلب و${fresh.length} تنبيه`,
          auditReference: "store-ops:audit",
        }));
      }

      case "set_provider": {
        const provider = body.provider as HybridAIProviderName;
        const contentStore = getContentStoreSync();
        const res = await switchContentProvider(contentStore, provider, actor, now);
        if (!res.ok || !res.data) {
          return NextResponse.json({ error: res.error }, { status: 400 });
        }
        return NextResponse.json(okResult("تبديل مزود التوليد", {
          provider: res.data.status,
          openaiEnv: getOpenAIEnvState(),
        }, {
          noteAr: res.data.status.messageAr,
          auditReference: "content:audit",
        }));
      }

      default:
        return NextResponse.json(
          { error: { code: "invalid_request", message: "Unknown command" } },
          { status: 400 }
        );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Intelligence API]", msg);
    return NextResponse.json({ error: { code: "internal_error", message: "Internal server error" } }, { status: 500 });
  }
}