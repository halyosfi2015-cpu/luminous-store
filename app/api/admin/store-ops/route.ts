import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import type { AdminUser } from "@/src/lib/admin-auth";
import { can } from "@/src/admin/permissions";
import { getStoreOps, persistStoreOps } from "@/src/lib/store-ops/store";
import {
  buildExecutiveDashboard,
  buildInventoryOverview,
  buildCategoryDirectory,
  buildBrandDirectory,
  buildPriceIntelligence,
  computeSalesSummary,
  computeFinanceSummary,
  computeOrderIntelligence,
  computeCustomerStats,
  generateAlerts,
  syncAlerts,
  applyAlertAction,
  openAlerts,
  attentionSummary,
  detectAnomalies,
  collectContentStats,
  detectOpportunities,
  buildDailyBriefing,
  analyzeBusiness,
  resolveAnalystProvider,
} from "@/src/lib/store-ops";
import { supabaseGetOrders, supabaseGetProducts, supabaseSaveProduct } from "@/src/lib/admin-supabase";
import { invalidateProductCache } from "@/src/lib/product-dal";
import { invalidateServerProductsCache } from "@/src/lib/server-products";
import { revalidatePath } from "next/cache";
import type { Order } from "@/types/cart";
import type { Product } from "@/src/types/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Canonical product list — Supabase is the source of truth for stock. */
async function loadProducts(): Promise<Product[]> {
  try {
    const rows = await supabaseGetProducts();
    if (rows && rows.length > 0) return rows as Product[];
  } catch {
    /* fall through to static catalog */
  }
  return (await import("@/src/data/products")).products as Product[];
}

async function getStateAndData(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return { admin: null as AdminUser | null, state: null as null, error: admin };
  const state = await getStoreOps();
  return { admin, state, error: null };
}

async function checkEditPermission(admin: AdminUser): Promise<boolean> {
  return can(admin.role, "store_ops", "edit");
}

export async function GET(request: NextRequest) {
  const { admin: _admin, state, error } = await getStateAndData(request);
  if (error) return error;
  if (!state) return NextResponse.json({ error: { code: "store_unavailable", message: "Store ops not initialized" } }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "dashboard";

  // Lazy-load canonical data only when the action needs it
  let _products: Product[] | null = null;
  let _orders: Order[] | null = null;
  const now = new Date().toISOString();

  const getProducts = async (): Promise<Product[]> => {
    if (!_products) _products = await loadProducts();
    return _products;
  };
  const getOrders = async (): Promise<Order[]> => {
    if (!_orders) _orders = await supabaseGetOrders();
    return _orders;
  };

  try {
    switch (action) {
      case "dashboard": {
        const [products, orders] = await Promise.all([getProducts(), getOrders()]);
        const dashboard = buildExecutiveDashboard({ state, products, orders, now });
        return NextResponse.json({ dashboard });
      }
      case "inventory": {
        const [products, orders] = await Promise.all([getProducts(), getOrders()]);
        const overview = buildInventoryOverview(state, { products, orders, now });
        return NextResponse.json({ inventory: overview });
      }
      case "products": {
        const [products, orders] = await Promise.all([getProducts(), getOrders()]);
        const overview = buildInventoryOverview(state, { products, orders, now });
        const price = buildPriceIntelligence(products);
        const published = (await import("@/src/lib/publication")).onlyPublished(products);
        const rows = published.map((p) => {
          const info = overview.normal.find((i) => i.productId === p.id)
            ?? overview.outOfStock.find((i) => i.productId === p.id)
            ?? overview.lowStock.find((i) => i.productId === p.id)
            ?? overview.atRisk.find((i) => i.productId === p.id)
            ?? overview.overstock.find((i) => i.productId === p.id)
            ?? overview.deadStock.find((i) => i.productId === p.id);
          const priceRow = price.reviewRequired.find((r) => r.productId === p.id)
            ?? price.rejected.find((r) => r.productId === p.id)
            ?? { productId: p.id, price: p.pricing?.price, currency: p.pricing?.currency ?? "YER", status: "OK" as const, issues: [] };
          return {
            productId: p.id,
            nameAr: p.name?.ar ?? p.id,
            brand: p.brand,
            categorySlug: p.categorySlug,
            currentStock: info?.currentStock ?? 0,
            status: info?.status ?? "NORMAL",
            statusLabelAr: info?.statusLabelAr ?? "طبيعي",
            price: priceRow.price,
            priceStatus: priceRow.status,
            coverageDays: info?.coverageDays,
            averageDailySales: info?.averageDailySales,
          };
        });
        return NextResponse.json({ products: rows, summary: { total: rows.length, outOfStock: overview.outOfStock.length, lowStock: overview.lowStock.length } });
      }
      case "product": {
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: { code: "invalid_request", message: "id is required" } }, { status: 400 });
        const [products, orders] = await Promise.all([getProducts(), getOrders()]);
        const p = products.find((x) => x.id === id);
        if (!p) return NextResponse.json({ error: { code: "not_found", message: "Product not found" } }, { status: 404 });
        const overview = buildInventoryOverview(state, { products, orders, now });
        const info = overview.normal.find((i) => i.productId === id)
          ?? overview.outOfStock.find((i) => i.productId === id)
          ?? overview.lowStock.find((i) => i.productId === id)
          ?? overview.atRisk.find((i) => i.productId === id)
          ?? overview.overstock.find((i) => i.productId === id)
          ?? overview.deadStock.find((i) => i.productId === id);
        const sales = (await import("@/src/lib/store-ops/sales")).salesByProduct(orders);
        const sale = sales.find((s) => s.productId === id);
        const movements = state.movements.filter((m) => m.productId === id).slice(-20);
        return NextResponse.json({
          product: { ...p, stockInfo: info, sales: sale ? { units: sale.units, revenueYER: sale.revenueYER, orderCount: sale.orderCount } : null, movements },
        });
      }
      case "categories": {
        const [products, orders] = await Promise.all([getProducts(), getOrders()]);
        const dir = buildCategoryDirectory(state, products, orders, now);
        return NextResponse.json({ categories: dir });
      }
      case "brands": {
        const [products, orders] = await Promise.all([getProducts(), getOrders()]);
        const dir = buildBrandDirectory(state, products, orders, now);
        return NextResponse.json({ brands: dir });
      }
      case "sales": {
        const [products, orders] = await Promise.all([getProducts(), getOrders()]);
        const summary = computeSalesSummary(orders);
        const byProduct = (await import("@/src/lib/store-ops/sales")).salesByProduct(orders);
        const byCategory = (await import("@/src/lib/store-ops/sales")).salesByCategory(orders, products);
        const byBrand = (await import("@/src/lib/store-ops/sales")).salesByBrand(orders, products);
        const byDay = (await import("@/src/lib/store-ops/sales")).salesByDay(orders);
        return NextResponse.json({ summary, byProduct, byCategory, byBrand, byDay });
      }
      case "finance": {
        const orders = await getOrders();
        const summary = computeFinanceSummary({ netSalesYER: computeSalesSummary(orders).netSalesYER, settings: state.settings });
        return NextResponse.json({ finance: summary });
      }
      case "orders": {
        const orders = await getOrders();
        const intel = computeOrderIntelligence(orders, now);
        return NextResponse.json({ orders: intel });
      }
      case "customers": {
        const orders = await getOrders();
        const stats = computeCustomerStats(orders, now);
        return NextResponse.json({ customers: stats });
      }
      case "alerts": {
        const [products, orders] = await Promise.all([getProducts(), getOrders()]);
        const fresh = generateAlerts({
          products,
          orders,
          now,
          inventory: buildInventoryOverview(state, { products, orders, now }),
          price: buildPriceIntelligence(products),
          ordersInfo: computeOrderIntelligence(orders, now),
          customers: computeCustomerStats(orders, now),
          anomalies: detectAnomalies({ orders, now, sensitivity: state.settings.anomalySensitivity }),
        });
        await syncAlerts(state, fresh, now);
        return NextResponse.json({ alerts: openAlerts(state), attention: attentionSummary(state) });
      }
      case "opportunities": {
        const [products, orders] = await Promise.all([getProducts(), getOrders()]);
        const opps = detectOpportunities(state, { products, orders, now, ...collectContentStats() });
        return NextResponse.json({ opportunities: opps });
      }
      case "reports": {
        const [products, orders] = await Promise.all([getProducts(), getOrders()]);
        const period = searchParams.get("period") ?? "week";
        const dashboard = buildExecutiveDashboard({ state, products, orders, now });
        const sales = computeSalesSummary(orders);
        const finance = computeFinanceSummary({ netSalesYER: sales.netSalesYER, settings: state.settings });
        const inventory = buildInventoryOverview(state, { products, orders, now });
        const alerts = attentionSummary(state);
        return NextResponse.json({ period, dashboard, sales, finance, inventory, alerts });
      }
      case "briefing": {
        const [products, orders] = await Promise.all([getProducts(), getOrders()]);
        const briefing = await buildDailyBriefing({ state, products, orders, now, ...collectContentStats() });
        return NextResponse.json({ briefing });
      }
      case "analyst": {
        const [products, orders] = await Promise.all([getProducts(), getOrders()]);
        const question = searchParams.get("question") ?? "أعطني ملخص الحالة الحالية وأولويات العمل";
        const scope = (searchParams.get("scope") as "overview" | "sales" | "inventory" | "finance" | "products" | "customers" | "marketing") ?? "overview";
        const result = await analyzeBusiness({ state, products, orders, now, question, scope });
        return NextResponse.json({ analysis: result });
      }
      case "settings": {
        return NextResponse.json({ settings: state.settings });
      }
      case "movements": {
        const limit = parseInt(searchParams.get("limit") ?? "100", 10);
        return NextResponse.json({ movements: state.movements.slice(-limit).reverse() });
      }
      case "audit": {
        const limit = parseInt(searchParams.get("limit") ?? "200", 10);
        return NextResponse.json({ audit: state.audit.slice(-limit).reverse() });
      }
      case "anomalies": {
        const orders = await getOrders();
        const anomalies = detectAnomalies({ orders, now, sensitivity: state.settings.anomalySensitivity });
        return NextResponse.json({ anomalies });
      }
      case "ai-status": {
        const provider = resolveAnalystProvider();
        const openaiConfigured = (await import("@/src/lib/ai/config")).isAIConfigured();
        return NextResponse.json({
          provider: provider.constructor.name,
          openaiConfigured,
          selfAvailable: true,
        });
      }
      default:
        return NextResponse.json({ error: { code: "invalid_request", message: "Unknown action" } }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Store Ops API]", msg);
    return NextResponse.json({ error: { code: "internal_error", message: "Internal server error" } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { admin, state, error } = await getStateAndData(request);
  if (error) return error;
  if (!state) return NextResponse.json({ error: { code: "store_unavailable", message: "Store ops not initialized" } }, { status: 503 });

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: { code: "invalid_request", message: "Invalid JSON body" } }, { status: 400 });
  }

  const action = (body.action as string) ?? "";
  const actor = admin.name ?? "admin";
  const now = new Date().toISOString();
  const contentData = collectContentStats();

  // Lazy-load canonical data only when the action needs it
  let _products: Product[] | null = null;
  let _orders: Order[] | null = null;

  const getProducts = async (): Promise<Product[]> => {
    if (!_products) _products = await loadProducts();
    return _products;
  };
  const getOrders = async (): Promise<Order[]> => {
    if (!_orders) _orders = await supabaseGetOrders();
    return _orders;
  };

  try {
    switch (action) {
      case "analyze": {
        if (!(await checkEditPermission(admin))) {
          return NextResponse.json({ error: { code: "forbidden", message: "Permission denied" } }, { status: 403 });
        }
        const [products, orders] = await Promise.all([getProducts(), getOrders()]);
        const question = (body.question as string) ?? "أعطني ملخص الحالة الحالية وأولويات العمل";
        const scope = (body.scope as "overview" | "sales" | "inventory" | "finance" | "products" | "customers" | "marketing") ?? "overview";
        const result = await analyzeBusiness({ state, products, orders, now, question, scope });
        if (!result.success) {
          return NextResponse.json({ error: result.error, disabled: result.disabled }, { status: result.disabled ? 409 : 500 });
        }
        return NextResponse.json({ analysis: result.response });
      }
      case "briefing": {
        const [products, orders] = await Promise.all([getProducts(), getOrders()]);
        const briefing = await buildDailyBriefing({ state, products, orders, now, ...contentData });
        return NextResponse.json({ briefing });
      }
      case "adjust-stock": {
        if (!(await checkEditPermission(admin))) {
          return NextResponse.json({ error: { code: "forbidden", message: "Permission denied" } }, { status: 403 });
        }
        const productId = body.productId as string;
        const delta = Number(body.delta);
        const note = body.note as string | undefined;
        if (!productId || !Number.isFinite(delta) || delta === 0) {
          return NextResponse.json({ error: { code: "invalid_request", message: "productId and a non-zero delta are required" } }, { status: 400 });
        }
        // Canonical mutation: update the Supabase product row itself.
        const products = await getProducts();
        const product = products.find((p) => p.id === productId);
        if (!product) {
          return NextResponse.json({ error: { code: "not_found", message: "المنتج غير موجود في قاعدة البيانات" } }, { status: 404 });
        }
        const previousStock = Math.max(0, product.stockQuantity ?? product.stock ?? 0);
        let newStock = previousStock + delta;
        if (newStock < 0 && !state.settings.allowNegativeStock) {
          return NextResponse.json({ error: { code: "negative_stock_blocked", message: `لا يمكن خصم ${Math.abs(delta)} — المخزون سيصبح سالباً (السماح بالمخزون السالب معطل)` } }, { status: 400 });
        }
        newStock = Math.max(0, newStock);
        await supabaseSaveProduct({ ...product, stockQuantity: newStock, stock: newStock } as unknown as Product);
        invalidateProductCache();
        invalidateServerProductsCache();
          revalidatePath("/", "layout");
        // Durable audit entry with before/after.
        const { makeBusinessAudit, appendBusinessAudit } = await import("@/src/lib/store-ops/audit");
        appendBusinessAudit(state, makeBusinessAudit({
          actor,
          action: "INVENTORY_ADJUSTED",
          entityType: "product",
          entityId: productId,
          previous: previousStock,
          new: newStock,
          reason: note ?? `delta=${delta}`,
        }));
        if (!(await persistStoreOps(state))) {
          return NextResponse.json({ error: { code: "persist_failed", message: "تم تحديث المخزون في قاعدة البيانات لكن تعذر حفظ سجل التدقيق" } }, { status: 503 });
        }
        return NextResponse.json({
          movement: {
            id: `adj-${now}-${productId}`,
            productId,
            quantity: Math.abs(delta),
            direction: delta > 0 ? "in" : "out",
            reason: "manual_adjustment",
            timestamp: now,
            source: "admin",
            actor,
            reference: null,
            note: note ?? null,
          },
          currentStock: newStock,
          persistedToCanonical: true,
        });
      }
      case "alert-action": {
        if (!(await checkEditPermission(admin))) {
          return NextResponse.json({ error: { code: "forbidden", message: "Permission denied" } }, { status: 403 });
        }
        const id = body.id as string;
        const actionType = body.actionType as "acknowledge" | "snooze" | "dismiss";
        if (!id || !actionType) {
          return NextResponse.json({ error: { code: "invalid_request", message: "id and actionType are required" } }, { status: 400 });
        }
        const res = await applyAlertAction(state, id, actionType, actor, now);
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        if (!(await persistStoreOps(state))) {
          return NextResponse.json({ error: { code: "persist_failed", message: "تعذر حفظ العملية في قاعدة البيانات — لم يتم تنفيذ التغيير نهائيًا" } }, { status: 503 });
        }
        return NextResponse.json({ ok: true });
      }
      case "reorder-action": {
        if (!(await checkEditPermission(admin))) {
          return NextResponse.json({ error: { code: "forbidden", message: "Permission denied" } }, { status: 403 });
        }
        const productId = body.productId as string;
        const actionType = body.actionType as "acknowledge" | "execute" | "dismiss";
        if (!productId || !actionType) {
          return NextResponse.json({ error: { code: "invalid_request", message: "productId and actionType are required" } }, { status: 400 });
        }
        // "execute" must perform a REAL canonical mutation: receiving the
        // suggested quantity into Supabase product stock. A bare status flip
        // is not execution.
        if (actionType === "execute") {
          const received = Number(body.receivedQuantity);
          if (!Number.isFinite(received) || received <= 0) {
            return NextResponse.json(
              { error: { code: "execution_unavailable", message: "لا يمكن تنفيذ هذه التوصية بدون استلام كمية فعلية — أرسل receivedQuantity لتنفيذ إضافة مخزون حقيقية" } },
              { status: 422 },
            );
          }
          const products = await getProducts();
          const product = products.find((p) => p.id === productId);
          if (!product) {
            return NextResponse.json({ error: { code: "not_found", message: "المنتج غير موجود في قاعدة البيانات" } }, { status: 404 });
          }
          const previousStock = Math.max(0, product.stockQuantity ?? product.stock ?? 0);
          const newStock = previousStock + Math.floor(received);
          await supabaseSaveProduct({ ...product, stockQuantity: newStock, stock: newStock } as unknown as Product);
          invalidateProductCache();
          invalidateServerProductsCache();
          revalidatePath("/", "layout");
          const { makeBusinessAudit, appendBusinessAudit } = await import("@/src/lib/store-ops/audit");
          appendBusinessAudit(state, makeBusinessAudit({
            actor,
            action: "INVENTORY_ADJUSTED",
            entityType: "reorder_recommendation",
            entityId: productId,
            previous: previousStock,
            new: newStock,
            reason: `تنفيذ توصية إعادة طلب — استلام ${received} وحدة`,
          }));
          const res2 = await (await import("@/src/lib/store-ops/inventory")).applyReorderAction(state, productId, "execute", actor, now);
          if (!res2.ok) return NextResponse.json({ error: res2.error }, { status: 400 });
          if (!(await persistStoreOps(state))) {
            return NextResponse.json({ error: { code: "persist_failed", message: "تم تحديث المخزون لكن تعذر حفظ سجل التدقيق" } }, { status: 503 });
          }
          return NextResponse.json({ ok: true, executed: true, previousStock, newStock, persistedToCanonical: true });
        }

        const res = await (await import("@/src/lib/store-ops/inventory")).applyReorderAction(state, productId, actionType, actor, now);
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        if (!(await persistStoreOps(state))) {
          return NextResponse.json({ error: { code: "persist_failed", message: "تعذر حفظ العملية في قاعدة البيانات — لم يتم تنفيذ التغيير نهائيًا" } }, { status: 503 });
        }
        return NextResponse.json({ ok: true });
      }
      case "opportunity-action": {
        if (!(await checkEditPermission(admin))) {
          return NextResponse.json({ error: { code: "forbidden", message: "Permission denied" } }, { status: 403 });
        }
        const opportunityId = body.opportunityId as string;
        const actionType = body.actionType as "acknowledge" | "dismiss";
        if (!opportunityId || !actionType) {
          return NextResponse.json({ error: { code: "invalid_request", message: "opportunityId and actionType are required" } }, { status: 400 });
        }
        const res = await (await import("@/src/lib/store-ops/opportunities")).applyOpportunityAction(state, opportunityId, actionType, actor);
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
        if (!(await persistStoreOps(state))) {
          return NextResponse.json({ error: { code: "persist_failed", message: "تعذر حفظ العملية في قاعدة البيانات — لم يتم تنفيذ التغيير نهائيًا" } }, { status: 503 });
        }
        return NextResponse.json({ ok: true });
      }
      case "update-settings": {
        if (!(await checkEditPermission(admin))) {
          return NextResponse.json({ error: { code: "forbidden", message: "Permission denied" } }, { status: 403 });
        }
        const patch = body.settings as Record<string, unknown>;
        const allowed = [
          "timezone", "currency", "lowStockThreshold", "reorderLeadTimeDays",
          "stockCoverageTargetDays", "overstockCoverageMultiple", "deadStockDays",
          "allowNegativeStock", "velocityWindowDays", "trendWindowDays",
          "alertAutoGeneration", "dailyBriefingEnabled", "weeklyReportEnabled",
          "autoAnomalyDetection", "autoOpportunityDetection", "anomalySensitivity",
          "reportingFrequency", "alertFrequency", "costSource", "defaultCostRatio",
          "aiAnalysisEnabled", "aiBriefingEnabled", "reorderSuggestionEnabled",
        ];
        const patchObj = patch as Record<string, unknown>;
        for (const key of Object.keys(patchObj)) {
          if (!allowed.includes(key)) delete patchObj[key];
        }
        const previousSettings = { ...state.settings };
        state.settings = { ...state.settings, ...patch };
        const { makeBusinessAudit, appendBusinessAudit } = await import("@/src/lib/store-ops/audit");
        appendBusinessAudit(state, makeBusinessAudit({
          actor,
          action: "SETTINGS_UPDATED",
          entityType: "settings",
          entityId: "store_settings",
          previous: previousSettings,
          new: state.settings,
          reason: `Updated keys: ${Object.keys(patch).join(", ")}`,
        }));
        if (!(await persistStoreOps(state))) {
          return NextResponse.json({ error: { code: "persist_failed", message: "تعذر حفظ العملية في قاعدة البيانات — لم يتم تنفيذ التغيير نهائيًا" } }, { status: 503 });
        }
        return NextResponse.json({ settings: state.settings });
      }
      case "run-automation": {
        if (!(await checkEditPermission(admin))) {
          return NextResponse.json({ error: { code: "forbidden", message: "Permission denied" } }, { status: 403 });
        }
        const [products, orders] = await Promise.all([getProducts(), getOrders()]);
        const kind = body.kind as "anomaly" | "opportunity" | "reorder";
        const results: Record<string, unknown> = {};
        if (kind === "anomaly" || kind === undefined) {
          const anomalies = detectAnomalies({ orders, now, sensitivity: state.settings.anomalySensitivity });
          const fresh = generateAlerts({
            products,
            orders,
            now,
            inventory: buildInventoryOverview(state, { products, orders, now }),
            price: buildPriceIntelligence(products),
            ordersInfo: computeOrderIntelligence(orders, now),
            customers: computeCustomerStats(orders, now),
            anomalies,
          });
          await syncAlerts(state, fresh, now);
          results.anomalies = anomalies;
          results.alertsGenerated = fresh.length;
        }
        if (kind === "opportunity" || kind === undefined) {
          const opps = detectOpportunities(state, { products, orders, now, ...contentData });
          results.opportunities = opps;
        }
        if (kind === "reorder" || kind === undefined) {
          const recs = (await import("@/src/lib/store-ops/inventory")).computeReorderRecommendations(state, { products, orders, now });
          for (const rec of recs) {
            const existing = state.reorder[rec.productId];
            state.reorder[rec.productId] = existing ? { ...rec, status: existing.status } : rec;
          }
          results.reorders = recs.map((r) => ({ ...r, status: state.reorder[r.productId]?.status ?? r.status }));
        }
        if (!(await persistStoreOps(state))) {
          return NextResponse.json({ error: { code: "persist_failed", message: "تعذر حفظ العملية في قاعدة البيانات — لم يتم تنفيذ التغيير نهائيًا" } }, { status: 503 });
        }
        return NextResponse.json({ results });
      }
      default:
        return NextResponse.json({ error: { code: "invalid_request", message: "Unknown action" } }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Store Ops API]", msg);
    return NextResponse.json({ error: { code: "internal_error", message: "Internal server error" } }, { status: 500 });
  }
}