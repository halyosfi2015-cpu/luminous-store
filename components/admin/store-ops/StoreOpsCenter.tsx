"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminGuard } from "@/src/admin/useAdminGuard";
import {
  STOCK_STATUS_LABELS,
  SEVERITY_LABELS,
  ALERT_CATEGORY_LABELS,
  OPPORTUNITY_KIND_LABELS,
  HEALTH_LABELS,
} from "./store-ops-types";

import type {
  StoreOpsSettings,
  ProductStockRow,
  ExecutiveDashboard,
  BusinessAlert,
  Opportunity,
   AnalystResponse,
  FinanceSummary,
  OrderIntelligence,
  CustomerStats,
  SalesSummary,
  CategoryRow,
   BrandRow,
   BrandSalesRow,
   ProductSalesRow,
  CategorySalesRow,
  DaySalesRow,
  AIProviderStatus,
  AttentionSummary,
  BusinessAuditEntry,
} from "./store-ops-types";

type TabKey =
  | "overview"
  | "inventory"
  | "alerts"
  | "opportunities"
  | "sales"
  | "finance"
  | "products"
  | "customers"
  | "orders"
  | "analyst"
  | "reports"
  | "settings";

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: "overview", label: "نظرة عامة", icon: "📊" },
  { key: "inventory", label: "المخزون", icon: "📦" },
  { key: "alerts", label: "التنبيهات", icon: "⚠️" },
  { key: "opportunities", label: "الفرص", icon: "💡" },
  { key: "sales", label: "المبيعات", icon: "💰" },
  { key: "finance", label: "الأرباح", icon: "💸" },
  { key: "products", label: "المنتجات", icon: "🏷️" },
  { key: "customers", label: "العملاء", icon: "👥" },
  { key: "orders", label: "الطلبات", icon: "📋" },
  { key: "analyst", label: "محلل المتجر", icon: "🤖" },
  { key: "reports", label: "التقارير", icon: "📈" },
  { key: "settings", label: "الإعدادات", icon: "⚙️" },
];

export default function StoreOpsCenter() {
  const { allowed } = useAdminGuard("store_ops");
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(
    initialTab && TABS.some((t) => t.key === initialTab) ? initialTab : "overview",
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [apiStatus, setApiStatus] = useState<AIProviderStatus | null>(null);
  const [dashboard, setDashboard] = useState<ExecutiveDashboard | null>(null);
  const [inventory, setInventory] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<{ alerts: BusinessAlert[]; attention: AttentionSummary[] } | null>(null);
  const [opportunities, setOpportunities] = useState<{ opportunities: Opportunity[] } | null>(null);
  const [sales, setSales] = useState<{ summary: SalesSummary; byProduct: ProductSalesRow[]; byCategory: CategorySalesRow[]; byBrand: BrandSalesRow[]; byDay: DaySalesRow[] } | null>(null);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [productsData, setProductsData] = useState<{ products: ProductStockRow[]; categories: CategoryRow[]; brands: BrandRow[] } | null>(null);
  const [customers, setCustomers] = useState<CustomerStats | null>(null);
  const [orders, setOrders] = useState<OrderIntelligence | null>(null);
  const [analyst, setAnalyst] = useState<{ success: boolean; response: AnalystResponse | null; error: { code: string; message: string } | null } | null>(null);
  const [audit, setAudit] = useState<{ audit: BusinessAuditEntry[] } | null>(null);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [settings, setSettings] = useState<StoreOpsSettings | null>(null);
  const [reorderQty, setReorderQty] = useState<Record<string, string>>({});
  const [reorderLoading, setReorderLoading] = useState<Record<string, boolean>>({});

  const fetchApi = useCallback(async (action: string, method: "GET" | "POST" = "GET", body?: Record<string, unknown>) => {
    const url = `/api/admin/store-ops?action=${action}`;
    const init: RequestInit = method === "POST" ? {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    } : {};
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, []);

  const loadTab = useCallback(async (tab: TabKey) => {
    setActiveTab(tab);
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      switch (tab) {
        case "overview": {
          const [dashRes, statusRes] = await Promise.allSettled([
            fetchApi("dashboard"),
            fetchApi("ai-status"),
          ]);
          if (dashRes.status === "fulfilled") setDashboard((dashRes.value as Record<string, unknown>)?.dashboard as ExecutiveDashboard);
          if (statusRes.status === "fulfilled") setApiStatus(statusRes.value as AIProviderStatus);
          break;
        }
        case "inventory": {
           const invRes = await fetchApi("inventory");
           setInventory((invRes as Record<string, unknown>)?.inventory ?? invRes);
          break;
        }
        case "alerts": {
          const alertsRes = await fetchApi("alerts");
          setAlerts(alertsRes);
          break;
        }
        case "opportunities": {
          const oppRes = await fetchApi("opportunities");
          setOpportunities(oppRes);
          break;
        }
        case "sales": {
          const salesRes = await fetchApi("sales");
          setSales(salesRes);
          break;
        }
        case "finance": {
           const finRes = await fetchApi("finance");
           setFinance((finRes as Record<string, unknown>)?.finance ?? finRes);
          break;
        }
        case "products": {
          const [prodRes, catRes, brandRes] = await Promise.allSettled([
            fetchApi("products"),
            fetchApi("categories"),
            fetchApi("brands"),
          ]);
          setProductsData({
            products: prodRes.status === "fulfilled" ? prodRes.value.products : [],
            categories: catRes.status === "fulfilled" ? catRes.value.categories ?? [] : [],
            brands: brandRes.status === "fulfilled" ? brandRes.value.brands ?? [] : [],
          });
          break;
        }
        case "customers": {
           const custRes = await fetchApi("customers");
           setCustomers((custRes as Record<string, unknown>)?.customers ?? custRes);
          break;
        }
        case "orders": {
          const ordRes = await fetchApi("orders");
          setOrders((ordRes as Record<string, unknown>)?.orders as OrderIntelligence ?? ordRes);
          break;
        }
        case "analyst": {
          const analystRes = await fetchApi("analyst");
           setAnalyst((analystRes as Record<string, unknown>)?.analysis ?? analystRes);
          break;
        }
        case "reports": {
          const [repRes, auditRes] = await Promise.allSettled([
            fetchApi("reports"),
            fetchApi("audit"),
          ]);
          setReport(repRes.status === "fulfilled" ? repRes.value : null);
          setAudit(auditRes.status === "fulfilled" ? auditRes.value : null);
          break;
        }
        case "settings": {
          const [settingsRes, auditRes] = await Promise.allSettled([
            fetchApi("settings"),
            fetchApi("audit"),
          ]);
           setSettings(settingsRes.status === "fulfilled" ? (settingsRes.value as Record<string, unknown>)?.settings ?? settingsRes.value : null);
          setAudit(auditRes.status === "fulfilled" ? auditRes.value : null);
          break;
        }
      }
      setNotice("تم التحميل بنجاح");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fetchApi]);

  useEffect(() => {
    const load = async () => {
      await loadTab("overview");
    };
    if (allowed) load();
  }, [allowed, loadTab]);

  const handlePost = async (action: string, body?: Record<string, unknown>) => {
    try {
      setLoading(true);
      await fetchApi(action, "POST", body);
      setNotice(`تم ${action} بنجاح`);
      await loadTab(activeTab);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!allowed) return null;

const renderOverviewTab = () => {
    if (!dashboard) return renderLoading();
    const { today, attention, dataNotes, quickActions, healthLabelAr } = dashboard;
    const todayHasData = today.orderCount > 0 || today.netSalesYER > 0;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-600">حالة المتجر</h3>
            <p className={`text-xl font-bold ${healthColor(dashboard.health)}`}>{HEALTH_LABELS[dashboard.health]}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-600">طلبات اليوم</h3>
            <p className="text-2xl font-bold text-blue-600">
              {today.orderCount > 0 ? today.orderCount : <span className="text-red-500">لا توجد طلبات مسجلة</span>}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-600">مبيعات اليوم (د.ي)</h3>
            <p className="text-2xl font-bold text-green-600">
              {today.netSalesYER !== null && typeof today.netSalesYER !== "string"
                ? today.netSalesYER.toLocaleString()
                : today.netSalesYER === "insufficient_data"
                  ? "لا يمكن حساب المبيعات — لا توجد طلبات"
                  : "—"
            }
          </p>
          </div>
        </div>

        {dataNotes.length > 0 && (
          <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 mb-4">
            <strong>ملاحظات:</strong>
            <ul className="list-disc list-inside mt-1">
              {dataNotes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        {dashboard.attention.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">نقاط انتباه</h3>
            <div className="space-y-2">
              {dashboard.attention.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                  <span>{item.labelAr}</span>
                  <span className="text-sm text-gray-500">({item.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">أبرز منتجات اليوم</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right border-b">
                  <th className="pb-2">المنتج</th>
                  <th className="pb-2">الوحدات</th>
                  <th className="pb-2">الإيراد (د.ي)</th>
                </tr>
              </thead>
              <tbody>
                {today.topProducts.length > 0 ? (
                  today.topProducts.map((p, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-1">{p.productId}</td>
                      <td className="py-1">{p.units}</td>
                      <td className="py-1">{p.revenueYER.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-1 text-center text-gray-500" colSpan={3}>
                      لا توجد منتجات ذات مبيعات اليوم
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {quickActions.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">إجراءات سريعة</h3>
            <div className="space-y-1">
              {quickActions.map((action, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{action.labelAr}</span>
                  <a
                    href={action.route}
                    className="text-blue-600 hover underline text-xs"
                  >
                    تنفيذ
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderInventoryTabNew = () => {
    if (!inventory) return renderLoading();
    const inv = inventory as Record<string, unknown>;
    const totalProducts = typeof inv.totalProducts === "number" ? inv.totalProducts : 0;
    const outOfStockArr = (inv.outOfStock as unknown[] | undefined) ?? [];
    const lowStockArr = (inv.lowStock as unknown[] | undefined) ?? [];
    const overstock = (inv.overstock as unknown[] | undefined) ?? [];
    const deadStock = (inv.deadStock as unknown[] | undefined) ?? [];
    const normalArr = (inv.normal as unknown[] | undefined) ?? [];
    const reorders = (inv.reorders as Array<Record<string, unknown>> | undefined) ?? [];
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard label="إجمالي المنتجات" value={totalProducts} />
          <StatCard label="متوفر" value={normalArr.length} color="green" />
          <StatCard label="منخفض المخزون" value={lowStockArr.length} color="yellow" />
          <StatCard label="نفد المخزون" value={outOfStockArr.length} color="red" />
          <StatCard label="مخزون زائد" value={overstock.length} color="orange" />
          <StatCard label="مخزون راكد" value={deadStock.length} color="gray" />
        </div>

        {reorders.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">توصيات إعادة الطلب</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right border-b">
                    <th className="pb-2">المنتج</th>
                    <th className="pb-2">المخزون الحالي</th>
                    <th className="pb-2">الحد الأدنى</th>
                    <th className="pb-2">مقترح الطلب</th>
                    <th className="pb-2">الكمية المستلمة</th>
                    <th className="pb-2">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {reorders.map((r, i) => {
                    const pid = r.productId as string;
                    const qty = reorderQty[pid] ?? "";
                    const isLoading = reorderLoading[pid] ?? false;
                    const parsed = Number(qty);
                    const isValid = Number.isFinite(parsed) && parsed > 0 && Number.isInteger(parsed);
                    return (
                      <tr key={i} className="border-b">
                        <td className="py-1">{pid}</td>
                        <td className="py-1">{r.currentStock as number}</td>
                        <td className="py-1">{r.reorderPoint as number}</td>
                        <td className="py-1">{r.suggestedQuantity as number}</td>
                        <td className="py-1">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={qty}
                            onChange={(e) => setReorderQty((prev) => ({ ...prev, [pid]: e.target.value }))}
                            placeholder="أدخل الكمية"
                            className="w-24 border rounded px-2 py-1 text-xs"
                            disabled={isLoading}
                          />
                        </td>
                        <td className="py-1">
                          <button
                            onClick={async () => {
                              if (!isValid) return;
                              setReorderLoading((prev) => ({ ...prev, [pid]: true }));
                              try {
                                await handlePost("reorder-action", {
                                  productId: pid,
                                  actionType: "execute",
                                  receivedQuantity: parsed,
                                });
                                setReorderQty((prev) => { const n = { ...prev }; delete n[pid]; return n; });
                              } finally {
                                setReorderLoading((prev) => ({ ...prev, [pid]: false }));
                              }
                            }}
                            disabled={!isValid || isLoading}
                            className={`text-xs px-2 py-1 border rounded ${isValid && !isLoading ? "text-blue-600 hover:text-blue-800 border-blue-200" : "text-gray-400 border-gray-200 cursor-not-allowed"}`}
                          >
                            {isLoading ? "جاري التنفيذ..." : "تنفيذ"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAlertsTab = () => {
    if (!alerts) return renderLoading();
    const openAlerts = alerts.alerts.filter((a) => a.status === "open");
    return (
      <div className="space-y-4">
        {openAlerts.length === 0 ? (
          <p className="text-gray-500">لا توجد تنبيهات مفتوحة حالياً</p>
        ) : (
          openAlerts.map((alert) => (
            <div key={alert.id} className={`p-3 rounded-lg border ${severityBorder(alert.severity)}`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${severityBadge(alert.severity)}`}>
                    {SEVERITY_LABELS[alert.severity]}
                  </span>
                  <span className="text-xs text-gray-500 mr-2">{ALERT_CATEGORY_LABELS[alert.category]}</span>
                </div>
                <span className="text-xs text-gray-400">{alert.createdAt}</span>
              </div>
              <p className="mt-1 text-sm">{alert.messageAr}</p>
              {alert.actionable && (
                <button
                  onClick={() => handlePost("alert-action", { id: alert.id, actionType: "acknowledge" })}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  {alert.actionable.labelAr}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  const renderOpportunitiesTab = () => {
    if (!opportunities) return renderLoading();
    const opps = opportunities.opportunities;
    return (
      <div className="space-y-4">
        {opps.length === 0 ? (
          <p className="text-gray-500">لا توجد فرص حالياً</p>
        ) : (
          opps.map((opp) => (
            <div key={opp.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-sm text-gray-500">{OPPORTUNITY_KIND_LABELS[opp.kind]}</span>
                  <h4 className="font-semibold">{opp.titleAr}</h4>
                  <p className="text-sm text-gray-600 mt-1">{opp.descriptionAr}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">ثقة {Math.round(opp.confidence * 100)}%</span>
                  {opp.commercialValueYER !== null && (
                    <p className="text-sm text-gray-500">القيمة: {opp.commercialValueYER.toLocaleString()} د.ي</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderSalesTab = () => {
    if (!sales) return renderLoading();
    return (
      <div className="space-y-6">
        {!sales.summary.hasOrders && (
          <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800">بيانات غير كافية — لا توجد طلبات مسجلة بعد</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="إجمالي الطلبات" value={sales.summary.orderCount} />
          <StatCard label="إجمالي المبيعات (د.ي)" value={sales.summary.grossSalesYER.toLocaleString()} />
          <StatCard label="صافي المبيعات (د.ي)" value={sales.summary.netSalesYER.toLocaleString()} />
          <StatCard label="العائد على الطلب" value={typeof sales.summary.averageOrderValueYER === "number" ? sales.summary.averageOrderValueYER.toLocaleString() : sales.summary.averageOrderValueYER} />
        </div>

        {sales.byDay && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">مبيعات حسب اليوم</h3>
            {sales.byDay.length === 0 ? (
              <p className="text-gray-500">بيانات غير كافية — لا توجد مبيعات لهذه الفترة</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-right border-b">
                      <th className="pb-2">التاريخ</th>
                      <th className="pb-2">الطلبات</th>
                      <th className="pb-2">المبيعات (د.ي)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.byDay.map((d, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-1">{d.date}</td>
                        <td className="py-1">{d.orders}</td>
                        <td className="py-1">{d.revenueYER.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderFinanceTab = () => {
    if (!finance) return renderLoading();
    const fin = finance;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="الإيراد (د.ي)" value={fin.revenueYER !== null ? fin.revenueYER.toLocaleString() : "—"} />
          <StatCard label="التكلفة (د.ي)" value={fin.costYER !== null ? fin.costYER.toLocaleString() : "—"} />
          <StatCard label="الربح الإجمالي (د.ي)" value={fin.grossProfitYER !== null ? fin.grossProfitYER.toLocaleString() : "—"} />
        </div>

        {!fin.available && (
          <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800">
            {fin.noteAr}
          </div>
        )}

        {fin.grossMarginPercent !== null && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold">هامش الربح الإجمالي</h3>
            <p className="text-2xl font-bold text-green-600">{fin.grossMarginPercent.toFixed(2)}%</p>
            {fin.estimated && <span className="text-xs text-gray-500">(مقدر)</span>}
          </div>
        )}
      </div>
    );
  };

  const renderProductsTab = () => {
    if (!productsData) return renderLoading();
    const { products: prodRows } = productsData;
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right border-b">
                <th className="pb-2">المنتج</th>
                <th className="pb-2">المخزون</th>
                <th className="pb-2">الحالة</th>
                <th className="pb-2">السعر (د.ي)</th>
                <th className="pb-2">التغطية (أيام)</th>
              </tr>
            </thead>
            <tbody>
              {prodRows.map((p) => (
                <tr key={p.productId} className="border-b">
                  <td className="py-1">{p.nameAr}</td>
                  <td className="py-1">{p.currentStock}</td>
                  <td className="py-1">{STOCK_STATUS_LABELS[p.status]}</td>
                  <td className="py-1">{p.price !== null ? p.price.toLocaleString() : "—"}</td>
                  <td className="py-1">{typeof p.coverageDays === "number" ? p.coverageDays.toFixed(1) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCustomersTab = () => {
    if (!customers) return renderLoading();
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="إجمالي العملاء" value={customers.totalCustomers} />
          <StatCard label="عملاء جدد" value={customers.newCustomers} />
          <StatCard label="معدل الشراء المتكرر" value={typeof customers.repeatPurchaseRate === "number" ? `${customers.repeatPurchaseRate.toFixed(1)}%` : customers.repeatPurchaseRate} />
        </div>
        {customers.topCustomers.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">أفضل العملاء</h3>
            <div className="space-y-2">
              {customers.topCustomers.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span>{c.name}</span>
                  <span className="text-sm text-gray-500">{c.totalSpentYER.toLocaleString()} د.ي ({c.orderCount} طلبات)</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {!customers.hasData && (
          <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800">بيانات غير كافية — لا توجد طلبات مسجلة بعد</div>
        )}
      </div>
    );
  };

  const renderOrdersTab = () => {
    if (!orders) return renderLoading();
    return (
      <div className="space-y-6">
        {!orders.hasOrders && (
          <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800">بيانات غير كافية — لا توجد طلبات مسجلة بعد</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="مكتملة" value={orders.byStatus["completed"] ?? 0} color="green" />
          <StatCard label="قيد التقدم" value={orders.byStatus["processing"] ?? 0} color="blue" />
          <StatCard label="ملغاة" value={orders.byStatus["cancelled"] ?? 0} color="red" />
          <StatCard label="معلقة" value={orders.delayedOrders?.length ?? 0} color="yellow" />
        </div>
        {orders.delayedOrders && orders.delayedOrders.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">طلبات متأخرة</h3>
            <div className="space-y-2">
              {orders.delayedOrders.map((d: { orderId: string; daysPending: number; status: string }, i) => (
                <div key={i} className="text-sm">
                  {d.orderId} — {d.daysPending} يوم ({d.status})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAnalystTab = () => {
    if (!analyst) return renderLoading();
    if (analyst.error) {
      return <div className="bg-red-50 p-4 rounded-lg text-red-800">{analyst.error.message}</div>;
    }
    const resp = analyst.response;
    if (!resp) return renderLoading();
    return (
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">إجابة المحلل</h3>
          <p className="text-sm mb-2">{resp.answer}</p>
          <p className="text-xs text-gray-500">المصداقية: {resp.confidence}</p>
        </div>
        {resp.recommendations.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">توصيات</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              {resp.recommendations.map((r) => (
                <li key={r.action}>{r.action}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderReportsTab = () => {
    if (!audit && !report) return renderLoading();
    return (
      <div className="space-y-6">
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold text-gray-600 text-sm mb-1">الفترة</h3>
              <p className="text-xl font-bold text-blue-600">{report.period as string}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold text-gray-600 text-sm mb-1">المبيعات الصافية</h3>
              <p className="text-xl font-bold text-green-600">
                {typeof (report.sales as Record<string, unknown> | undefined)?.netSalesYER === "number"
                  ? ((report.sales as Record<string, unknown>).netSalesYER as number).toLocaleString()
                  : "لا توجد طلبات"}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold text-gray-600 text-sm mb-1">نفد المخزون</h3>
              <p className="text-xl font-bold text-red-600">
                {((report.inventory as Record<string, unknown> | undefined)?.outOfStock as unknown[] | undefined)?.length ?? 0}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {!audit || audit.audit.length === 0 ? (
            <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800">
              بيانات غير كافية — لا توجد سجلات تدقيق مسجلة بعد
            </div>
          ) : (
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-2">سجل التدقيق</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-right border-b">
                      <th className="pb-2">التاريخ</th>
                      <th className="pb-2">المُنفذ</th>
                      <th className="pb-2">الإجراء</th>
                      <th className="pb-2">الكيان</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.audit.map((entry: BusinessAuditEntry) => (
                      <tr key={entry.id} className="border-b">
                        <td className="py-1">{entry.at}</td>
                        <td className="py-1">{entry.actor}</td>
                        <td className="py-1">{entry.action}</td>
                        <td className="py-1">{entry.entityType}:{entry.entityId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSettingsTab = () => {
    if (!settings) return renderLoading();
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingRow label="المنطقة الزمنية" value={settings.timezone} />
          <SettingRow label="العملة" value={settings.currency} />
          <SettingRow label="حد إعادة الطلب" value={settings.lowStockThreshold} />
          <SettingRow label="مدة سريان أمر إعادة الطلب" value={`${settings.reorderLeadTimeDays} أيام`} />
          <SettingRow label="مصدر التكلفة" value={settings.costSource} />
          {(settings.costSource === "percentage" || settings.defaultCostRatio > 0) && (
            <SettingRow label="نسبة التكلفة الافتراضية" value={`${(settings.defaultCostRatio * 100).toFixed(0)}%`} />
          )}
          <SettingRow label="اكتشاف التنبيهات تلقائياً" value={settings.alertAutoGeneration ? "مفعل" : "معطل"} />
          <SettingRow label="تحليل ذكي مفعل" value={settings.aiAnalysisEnabled ? "مفعل" : "معطل"} />
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview": return renderOverviewTab();
      case "inventory": return renderInventoryTabNew();
      case "alerts": return renderAlertsTab();
      case "opportunities": return renderOpportunitiesTab();
      case "sales": return renderSalesTab();
      case "finance": return renderFinanceTab();
      case "products": return renderProductsTab();
      case "customers": return renderCustomersTab();
      case "orders": return renderOrdersTab();
      case "analyst": return renderAnalystTab();
      case "reports": return renderReportsTab();
      case "settings": return renderSettingsTab();
      default: return renderOverviewTab();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">مركز تشغيل المتجر</h1>
        {apiStatus && (
          <p className="text-xs text-gray-500 mt-1">
            محلل ذكي: {apiStatus.provider} | OpenAI: {apiStatus.openaiConfigured ? "متاح" : "غير متاح"} | Self: {apiStatus.selfAvailable ? "متاح" : "غير متاح"}
          </p>
        )}
      </header>

      <nav className="bg-white shadow-sm border-b px-6 py-2 overflow-x-auto">
        <div className="flex space-x-1 space-x-reverse">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => loadTab(tab.key)}
              className={`px-4 py-2 text-sm rounded-t-lg whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="ml-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="p-6 max-w-7xl mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        {notice && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg mb-4">
            {notice}
          </div>
        )}
        {loading && <div className="text-center py-8 text-gray-500">جار التحميل...</div>}
        {!loading && renderTabContent()}
      </main>
    </div>
  );
}

function renderLoading() {
  return <div className="text-center py-8 text-gray-500">جار التحميل...</div>;
}

function StatCard({ label, value, color = "blue" }: { label: string; value: string | number; color?: string }) {
  const colorClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    yellow: "text-yellow-600",
    red: "text-red-600",
    gray: "text-gray-600",
    orange: "text-orange-600",
  };
  return (
    <div className="bg-white p-4 rounded-lg shadow text-center">
      <h3 className="font-semibold text-gray-600 text-sm mb-1">{label}</h3>
      <p className={`text-2xl font-bold ${colorClasses[color as keyof typeof colorClasses]}`}>{value}</p>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string | number | boolean }) {
  return (
    <div className="bg-white p-3 rounded-lg shadow">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="font-semibold text-right">{value}</div>
    </div>
  );
}

function healthColor(health: string) {
  switch (health) {
    case "good": return "text-green-600";
    case "attention": return "text-yellow-600";
    case "critical": return "text-red-600";
    default: return "text-gray-600";
  }
}

function severityBorder(severity: string) {
  switch (severity) {
    case "critical": return "border-red-500 bg-red-50";
    case "high": return "border-orange-500 bg-orange-50";
    case "medium": return "border-yellow-500 bg-yellow-50";
    case "info": return "border-blue-500 bg-blue-50";
    default: return "border-gray-300 bg-gray-50";
  }
}

function severityBadge(severity: string) {
  switch (severity) {
    case "critical": return "bg-red-100 text-red-800";
    case "high": return "bg-orange-100 text-orange-800";
    case "medium": return "bg-yellow-100 text-yellow-800";
    case "info": return "bg-blue-100 text-blue-800";
    default: return "bg-gray-100 text-gray-800";
  }
}
