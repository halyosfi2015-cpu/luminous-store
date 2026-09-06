/**
 * PART 4 — AI BUSINESS ANALYST + DAILY BRIEFING
 * =============================================
 * The analyst is a HYBRID provider like Part 3 content: an always-available
 * deterministic SELF analyst plus the real OpenAI adapter. It emits the same
 * `StructuredAIResponse` contract the rest of the platform uses. It only ever
 * talks about VERIFIED DATA it was handed — never the raw catalog, never PII.
 */

import type { AIProvider, RawAIResult } from "../ai/provider";
import { OpenAIProvider, NullAIProvider } from "../ai/provider";
import type { AIProviderConfig, StructuredAIResponse } from "../ai/types";
import { getAIConfig, isAIConfigured } from "../ai/config";
import { getContentStoreSync } from "@/src/lib/content-ops/store";
import { getEffectiveProvider } from "../ai/hybrid/provider";

import type { Product } from "@/src/types/product";
import { onlyPublished } from "@/src/lib/publication";
import type { Order } from "@/types/cart";
import type { StoreOpsState } from "./types";
import { computeSalesSummary, salesByProduct, salesByCategory, salesByBrand } from "./sales";
import { computeFinanceSummary } from "./finance";
import { buildInventoryOverview } from "./inventory";
import { computeOrderIntelligence } from "./orders";
import { computeCustomerStats } from "./customers";
import { detectAnomalies } from "./anomalies";
import { detectContentInventoryConflicts } from "./marketing";
import { detectOpportunities } from "./opportunities";
import { appendBusinessAudit, makeBusinessAudit } from "./audit";

export const BUSINESS_ANALYST_MODEL = "self-business-analyst-v1";
export const BUSINESS_ANALYST_PROMPT_VERSION = "BUSINESS_ANALYST_V1";
export const BUSINESS_ANALYST_CONTEXT_VERSION = "store_ops_part4_v1";

const BRIEF_MARKER = "BUSINESS ANALYST BRIEF (JSON):";
const DATA_MARKER = "VERIFIED DATA (the ONLY allowed factual source):";
const INSTRUCTIONS_MARKER = "INSTRUCTIONS:";

export interface BusinessAnalystBrief {
  question: string;
  scope: "overview" | "sales" | "inventory" | "finance" | "products" | "customers" | "marketing";
  language: "ar" | "en";
}

export interface VerifiedBusinessData {
  version: string;
  asOf: string;
  timezone: string;
  currency: string;
  hasOrders: boolean;
  orderCount: number;
  grossSalesYER: number;
  netSalesYER: number;
  shippingYER: number;
  averageOrderValueYER: number | "insufficient_data";
  completionRate: number | "insufficient_data";
  cancellationRate: number | "insufficient_data";
  totalCustomers: number;
  repeatPurchaseRate: number | "insufficient_data";
  inactiveCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  atRiskCount: number;
  overstockCount: number;
  deadStockCount: number;
  averageDailySales: number;
  finance: { available: boolean; grossProfitYER: number | null; grossMarginPercent: number | null; noteAr: string };
  topProducts: Array<{ productId: string; nameAr: string; units: number; revenueYER: number }>;
  topCategories: Array<{ categorySlug: string; categoryAr: string; revenueYER: number; units: number }>;
  topBrands: Array<{ brand: string; revenueYER: number; units: number }>;
  alertCount: number;
  criticalAlertCount: number;
  anomalyCount: number;
  marketingConflicts: number;
}

/* ------------------------------------------------------------------------ */
/* VERIFIED CONTEXT BUILDER                                                  */
/* ------------------------------------------------------------------------ */

export function buildVerifiedBusinessContext(
  state: StoreOpsState,
  products: Product[],
  orders: Order[],
  now: string,
  contentCountByProduct?: Record<string, number>,
  campaignCountByProduct?: Record<string, number>,
): VerifiedBusinessData {
  const published = onlyPublished(products);
  const sales = computeSalesSummary(orders);
  const finance = computeFinanceSummary({ netSalesYER: sales.netSalesYER, settings: state.settings });
  const inventory = buildInventoryOverview(state, { products, orders, now });
  const orderInfo = computeOrderIntelligence(orders, now);
  const customers = computeCustomerStats(orders, now);
  const anomalies = detectAnomalies({ orders, now, sensitivity: state.settings.anomalySensitivity });
  const conflicts = detectContentInventoryConflicts(
    state,
    products,
    orders,
    now,
    { contentCountByProduct, campaignCountByProduct },
  );

  const topProducts = salesByProduct(orders)
    .slice(0, 10)
    .map((s) => {
      const p = published.find((x) => x.id === s.productId);
      return { productId: s.productId, nameAr: p?.name?.ar ?? s.productId, units: s.units, revenueYER: s.revenueYER };
    });
  const topCategories = salesByCategory(orders, published)
    .slice(0, 5)
    .map((c) => ({ categorySlug: c.categorySlug, categoryAr: c.categoryAr, revenueYER: c.revenueYER, units: c.units }));
  const topBrands = salesByBrand(orders, published)
    .slice(0, 5)
    .map((b) => ({ brand: b.brand, revenueYER: b.revenueYER, units: b.units }));

  return {
    version: BUSINESS_ANALYST_CONTEXT_VERSION,
    asOf: now,
    timezone: state.settings.timezone,
    currency: state.settings.currency,
    hasOrders: sales.hasOrders,
    orderCount: sales.orderCount,
    grossSalesYER: sales.grossSalesYER,
    netSalesYER: sales.netSalesYER,
    shippingYER: sales.shippingYER,
    averageOrderValueYER: sales.averageOrderValueYER,
    completionRate: orderInfo.completionRate,
    cancellationRate: orderInfo.cancellationRate,
    totalCustomers: customers.totalCustomers,
    repeatPurchaseRate: customers.repeatPurchaseRate,
    inactiveCustomers: customers.inactiveCustomers,
    totalProducts: inventory.totalProducts,
    lowStockCount: inventory.lowStock.length,
    outOfStockCount: inventory.outOfStock.length,
    atRiskCount: inventory.atRisk.length,
    overstockCount: inventory.overstock.length,
    deadStockCount: inventory.deadStock.length,
    averageDailySales: Math.round((sales.itemCount / Math.max(1, state.settings.velocityWindowDays)) * 100) / 100,
    finance: {
      available: finance.available,
      grossProfitYER: finance.grossProfitYER,
      grossMarginPercent: finance.grossMarginPercent,
      noteAr: finance.noteAr,
    },
    topProducts,
    topCategories,
    topBrands,
    alertCount: Object.keys(state.alerts).length,
    criticalAlertCount: Object.values(state.alerts).filter((a) => a.severity === "critical" || a.severity === "high").length,
    anomalyCount: anomalies.length,
    marketingConflicts: conflicts.length,
  };
}

/* ------------------------------------------------------------------------ */
/* PROMPT ENVELOPE (fixed markers — same style as Part 3 content)            */
/* ------------------------------------------------------------------------ */

export function buildBusinessAnalystPrompt(
  brief: BusinessAnalystBrief,
  data: VerifiedBusinessData,
): { system: string; user: string } {
  const system =
    "أنت محلل أعمال لصالح متجر لومينوس. ردك يجب أن يكون JSON صارم (StructuredAIResponse). " +
    "لا تذكر أي رقم أو منتج أو عميل إلا إذا كان موجوداً في VERIFIED DATA. " +
    "لا تخترع تكاليف أو أرباح أو بيانات غائبة؛ إذا كان حقل ما غير متوفر فقل 'بيانات غير كافية'. " +
    "المصدر الوحيد المسموح به هو VERIFIED DATA. القيم كلها موثقة؛ استخدمها بدقة دون تزيين.";

  const user =
    `${BRIEF_MARKER}\n${JSON.stringify(brief)}\n\n` +
    `${DATA_MARKER}\n${JSON.stringify(data)}\n\n` +
    `${INSTRUCTIONS_MARKER}\n` +
    "- answer: إجابة عربية مباشرة عن السؤال بناءً على البيانات الموثقة فقط.\n" +
    "- facts: حقائق مأخوذة حرفياً من البيانات (statement + source + value).\n" +
    "- insights: قراءات مستندة إلى البيانات (لا أرقام مخترعة).\n" +
    "- recommendations: خطوات عملية قابلة للتنفيذ في النظام.\n" +
    "- confidence: high عندما تكون البيانات كافية، medium عند نقصها، low عند غياب البيانات.\n" +
    "- dataSources: اسماء مصادر البيانات الفعلية المستخدمة.\n" +
    "- summary: ملخص قصير من جملة إلى جملتين.\n" +
    "- contextRange: 'daily' | 'weekly' | 'monthly' وفق السؤال.\n" +
    `- contextVersion: ${BUSINESS_ANALYST_CONTEXT_VERSION}\n` +
    `- promptVersion: ${BUSINESS_ANALYST_PROMPT_VERSION}\n` +
    `- generatedAt: ${data.asOf}`;

  return { system, user };
}

/* ------------------------------------------------------------------------ */
/* SELF BUSINESS ANALYST (deterministic)                                     */
/* ------------------------------------------------------------------------ */

function extractSection(text: string, start: string, end: string | null): string | null {
  const startIdx = text.indexOf(start);
  if (startIdx === -1) return null;
  const from = startIdx + start.length;
  const endIdx = end ? text.indexOf(end, from) : text.length;
  if (endIdx === -1) return null;
  return text.slice(from, endIdx).trim();
}

function parseBrief(user: string): BusinessAnalystBrief | null {
  const raw = extractSection(user, BRIEF_MARKER, DATA_MARKER);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    return {
      question: typeof o.question === "string" ? o.question : "أعطني ملخص الحالة",
      scope: (["overview", "sales", "inventory", "finance", "products", "customers", "marketing"] as const).includes(o.scope as never)
        ? (o.scope as BusinessAnalystBrief["scope"])
        : "overview",
      language: o.language === "en" ? "en" : "ar",
    };
  } catch {
    return null;
  }
}

function parseData(user: string): VerifiedBusinessData | null {
  const raw = extractSection(user, DATA_MARKER, INSTRUCTIONS_MARKER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VerifiedBusinessData;
  } catch {
    return null;
  }
}

/** One deterministic fact per verified value (safe Arabic render). */
function fmtYER(n: number | null | undefined, currency = "YER"): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "بيانات غير كافية";
  return `${n.toLocaleString("en-US")} ${currency}`;
}

function fact(statement: string, source: string, value: number | string | null) {
  return { statement, source, value: value === undefined ? null : value };
}

export function buildSelfBusinessAnalysis(
  brief: BusinessAnalystBrief,
  data: VerifiedBusinessData,
  asOf: string,
): StructuredAIResponse {
  const d = data;
  const answer: string[] = [];
  answer.push(`بناءً على البيانات الموثقة، ${d.hasOrders ? `سجل ${d.orderCount} طلباً بإجمالي مبيعات صافية ${fmtYER(d.netSalesYER)}` : "لا توجد طلبات مسجلة بعد في هذه الفترة"}.`);
  if (d.hasOrders) {
    answer.push(`متوسط قيمة الطلب ${d.averageOrderValueYER === "insufficient_data" ? "غير كافٍ" : fmtYER(d.averageOrderValueYER)}، ومعدل الإنجاز ${d.completionRate === "insufficient_data" ? "غير متاح" : `${d.completionRate}%`}.`);
  }
  answer.push(`المخزون: ${d.outOfStockCount} منتج خارج المخزون، ${d.lowStockCount} منخفض، ${d.atRiskCount} معرض لخطر النفاد، ${d.deadStockCount} راكد.`);
  if (!d.finance.available) answer.push(d.finance.noteAr);

  const insights = [
    { title: "وضع المبيعات", description: d.hasOrders ? `إجمالي المبيعات الصافية ${fmtYER(d.netSalesYER)} عبر ${d.orderCount} طلب.` : "لا توجد بيانات مبيعات كافية." },
    { title: "وضع المخزون", description: `${d.outOfStockCount} خارج المخزون و${d.lowStockCount} منخفض و${d.atRiskCount} معرض للخطر — ${d.outOfStockCount + d.lowStockCount > 0 ? "أولوية إعادة الطلب" : "لا يحتاج تدخلاً فورياً"}.` },
    { title: "قنوات الطلب", description: d.topCategories.length > 0 ? `أعلى فئة: ${d.topCategories[0].categoryAr} بمبيعات ${fmtYER(d.topCategories[0].revenueYER)}.` : "بيانات غير كافية." },
  ];

  const recommendations: Array<{ action: string; rationale: string }> = [];
  if (d.outOfStockCount + d.lowStockCount > 0) {
    recommendations.push({ action: "إنشاء أوامر إعادة طلب للمنتجات خارج/منخفضة المخزون", rationale: `${d.outOfStockCount} خارج المخزون و${d.lowStockCount} منخفض.` });
  }
  if (d.deadStockCount > 0) {
    recommendations.push({ action: "مراجعة المخزون الراكد وإنشاء عروض ترويجية", rationale: `${d.deadStockCount} منتج راكد دون حركة.` });
  }
  if (!d.finance.available) {
    recommendations.push({ action: "تكوين مصدر التكلفة في إعدادات المتجر", rationale: "بدون بيانات تكلفة لا يمكن حساب الربح بدقة." });
  }
  if (d.marketingConflicts > 0) {
    recommendations.push({ action: "مراجعة المحتوى المرتبط بمنتجات غير متوفرة", rationale: `${d.marketingConflicts} تعارض محتوى/مخزون.` });
  }
  if (recommendations.length === 0) {
    recommendations.push({ action: "لا توجد توصيات عاجلة حالياً", rationale: "المؤشرات ضمن المستوى الطبيعي." });
  }

  const facts: Array<{ statement: string; source: string; value: number | string | null }> = [
    fact(`إجمالي المبيعات الصافية ${fmtYER(d.netSalesYER)}`, "luminous_orders", d.netSalesYER),
    fact(`عدد الطلبات ${d.orderCount}`, "luminous_orders", d.orderCount),
    fact(`متوسط قيمة الطلب ${d.averageOrderValueYER === "insufficient_data" ? "غير كافٍ" : fmtYER(d.averageOrderValueYER)}`, "luminous_orders", d.averageOrderValueYER),
    fact(`منتجات خارج المخزون ${d.outOfStockCount}`, "luminous_inventory", d.outOfStockCount),
    fact(`منتجات منخفضة المخزون ${d.lowStockCount}`, "luminous_inventory", d.lowStockCount),
    fact(`منتجات راكدة ${d.deadStockCount}`, "luminous_inventory", d.deadStockCount),
    fact(`إجمالي العملاء ${d.totalCustomers}`, "luminous_customers", d.totalCustomers),
    fact(`معدل إعادة الشراء ${d.repeatPurchaseRate === "insufficient_data" ? "غير متاح" : `${d.repeatPurchaseRate}%`}`, "luminous_customers", d.repeatPurchaseRate),
  ];
  if (d.finance.available) {
    facts.push(fact(`الربح الإجمالي التقديري ${fmtYER(d.finance.grossProfitYER)}`, "luminous_finance", d.finance.grossProfitYER));
  }

  const confidence: StructuredAIResponse["confidence"] = !d.hasOrders && d.orderCount === 0 ? "low" : d.finance.available ? "high" : "medium";

  return {
    answer: answer.join(" "),
    summary: `ملخص ${d.hasOrders ? `${d.orderCount} طلب / ${fmtYER(d.netSalesYER)}` : "لا توجد طلبات"}، مخزون منخفض ${d.lowStockCount} وخارج ${d.outOfStockCount}.`,
    facts,
    insights,
    recommendations,
    confidence,
    dataSources: [
      { name: "luminous_orders", label: "طلبات المتجر" },
      { name: "luminous_inventory", label: "مخزون المتجر" },
      { name: "luminous_customers", label: "عملاء المتجر" },
    ],
    contextRange: "daily",
    contextVersion: BUSINESS_ANALYST_CONTEXT_VERSION,
    generatedAt: asOf,
    promptVersion: BUSINESS_ANALYST_PROMPT_VERSION,
    model: BUSINESS_ANALYST_MODEL,
    metrics: { inputTokens: null, outputTokens: null, totalTokens: null, latencyMs: 0, model: BUSINESS_ANALYST_MODEL },
  };
}

export class SelfBusinessAnalyst implements AIProvider {
  async generateInsight(
    _systemPrompt: string,
    userMessage: string,
    _config: AIProviderConfig,
  ): Promise<RawAIResult> {
    const brief = parseBrief(userMessage);
    const data = parseData(userMessage);
    if (!brief || !data) {
      return {
        rawContent: null,
        error: { code: "ai_invalid_response", message: "self analyst could not parse the prompt envelope" },
        metrics: null,
      };
    }
    const response = buildSelfBusinessAnalysis(brief, data, data.asOf);
    return { rawContent: JSON.stringify(response), error: null, metrics: response.metrics };
  }
}

export function createSelfBusinessAnalyst(): AIProvider {
  return new SelfBusinessAnalyst();
}

/* ------------------------------------------------------------------------ */
/* PROVIDER RESOLUTION (reuses Part 3 hybrid selection)                      */
/* ------------------------------------------------------------------------ */

/** Resolve the analyst provider from the persisted content-ops AI settings. */
export function resolveAnalystProvider(): AIProvider {
  const store = getContentStoreSync();
  const { name } = getEffectiveProvider(store.settings);
  if (name === "openai") {
    return isAIConfigured() ? new OpenAIProvider() : new NullAIProvider();
  }
  return createSelfBusinessAnalyst();
}

/* ------------------------------------------------------------------------ */
/* ANALYZE + DAILY BRIEFING                                                  */
/* ------------------------------------------------------------------------ */

export interface AnalyzeBusinessInput {
  state: StoreOpsState;
  products: Product[];
  orders: Order[];
  now: string;
  question?: string;
  scope?: BusinessAnalystBrief["scope"];
  provider?: AIProvider;
  contentCountByProduct?: Record<string, number>;
  campaignCountByProduct?: Record<string, number>;
}

export interface AnalystResult {
  success: boolean;
  response: StructuredAIResponse | null;
  error: { code: string; message: string } | null;
  disabled?: boolean;
}

export async function analyzeBusiness(input: AnalyzeBusinessInput): Promise<AnalystResult> {
  if (!input.state.settings.aiAnalysisEnabled) {
    return {
      success: false,
      response: null,
      error: { code: "invalid_request", message: "التحليل الذكي معطل في إعدادات المتجر" },
      disabled: true,
    };
  }

  const now = input.now;
  const provider = input.provider ?? resolveAnalystProvider();
  const brief: BusinessAnalystBrief = {
    question: input.question ?? "أعطني ملخص الحالة الحالية وأولويات العمل",
    scope: input.scope ?? "overview",
    language: "ar",
  };
  const data = buildVerifiedBusinessContext(
    input.state,
    input.products,
    input.orders,
    now,
    input.contentCountByProduct,
    input.campaignCountByProduct,
  );
  const { system, user } = buildBusinessAnalystPrompt(brief, data);
  const config = getAIConfig();

  const result = await provider.generateInsight(system, user, config);
  if (result.error) {
    return { success: false, response: null, error: result.error };
  }
  if (!result.rawContent) {
    return { success: false, response: null, error: { code: "ai_invalid_response", message: "المحلل لم يرجع أي محتوى" } };
  }

  let response: StructuredAIResponse;
  try {
    const parsed = JSON.parse(result.rawContent) as Partial<StructuredAIResponse>;
    response = {
      answer: typeof parsed.answer === "string" ? parsed.answer : "",
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      confidence: parsed.confidence ?? "medium",
      dataSources: Array.isArray(parsed.dataSources) ? parsed.dataSources : [],
      contextRange: typeof parsed.contextRange === "string" ? parsed.contextRange : "daily",
      contextVersion: typeof parsed.contextVersion === "string" ? parsed.contextVersion : BUSINESS_ANALYST_CONTEXT_VERSION,
      generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : now,
      promptVersion: typeof parsed.promptVersion === "string" ? parsed.promptVersion : BUSINESS_ANALYST_PROMPT_VERSION,
      model: typeof parsed.model === "string" ? parsed.model : BUSINESS_ANALYST_MODEL,
      metrics: result.metrics ?? { inputTokens: null, outputTokens: null, totalTokens: null, latencyMs: 0, model: "unknown" },
    };
  } catch {
    return { success: false, response: null, error: { code: "ai_invalid_response", message: "استجابة المحلل غير صالحة" } };
  }

  appendBusinessAudit(
    input.state,
    makeBusinessAudit({
      actor: "system",
      action: "BUSINESS_ANALYSIS_REQUESTED",
      entityType: "analysis",
      entityId: null,
      previous: null,
      new: { question: brief.question, scope: brief.scope, confidence: response.confidence },
      at: now,
      reason: "تحليل الأعمال عبر المحلل الذكي",
    }),
  );

  return { success: true, response, error: null };
}

export interface BriefingInput {
  state: StoreOpsState;
  products: Product[];
  orders: Order[];
  now: string;
  provider?: AIProvider;
  contentCountByProduct?: Record<string, number>;
  campaignCountByProduct?: Record<string, number>;
}

export async function buildDailyBriefing(input: BriefingInput): Promise<import("./types").DailyBriefing> {
  const now = input.now;
  const today = now.slice(0, 10);
  const todayOrders = input.orders.filter((o) => o.createdAt.slice(0, 10) === today);
  const yesterday = new Date(Date.parse(now) - 86400000).toISOString().slice(0, 10);
  const yesterdayOrders = input.orders.filter((o) => o.createdAt.slice(0, 10) === yesterday);

  const salesToday = todayOrders.reduce((n, o) => n + (o.subtotal ?? 0), 0);
  const salesYesterday = yesterdayOrders.reduce((n, o) => n + (o.subtotal ?? 0), 0);
  const salesDelta = salesYesterday > 0 ? Math.round(((salesToday - salesYesterday) / salesYesterday) * 10000) / 100 : "insufficient_data";

  const inventory = buildInventoryOverview(input.state, { products: input.products, orders: input.orders, now });
  const byId = new Map(onlyPublished(input.products).map((p) => [p.id, p]));

  const campaigns = [...getContentStoreSync().campaigns.values()].filter((c) => c.status === "running" || c.status === "scheduled");
  const overPerforming: string[] = [];
  const topSellers = new Set(salesByProduct(input.orders).slice(0, 10).map((s) => s.productId));
  for (const c of campaigns) {
    if (c.productIds.some((pid) => topSellers.has(pid))) overPerforming.push(c.name);
  }

  const opportunities = detectOpportunities(input.state, {
    products: input.products,
    orders: input.orders,
    now,
    contentCountByProduct: input.contentCountByProduct,
    campaignCountByProduct: input.campaignCountByProduct,
  });

  const facts: import("./types").DailyBriefingFacts = {
    orderCountToday: todayOrders.length,
    netSalesYER: salesToday,
    salesDeltaPercent: salesDelta,
    nearOutOfStock: inventory.lowStock.slice(0, 5).map((i) => byId.get(i.productId)?.name?.ar ?? i.productId),
    outOfStockCount: inventory.outOfStock.length,
    deadStockCount: inventory.deadStock.length,
    overPerformingCampaigns: overPerforming.slice(0, 5),
    opportunityCount: opportunities.length,
    attentionProducts: [...inventory.outOfStock, ...inventory.lowStock].slice(0, 5).map((i) => byId.get(i.productId)?.name?.ar ?? i.productId),
    generatedAt: now,
  };

  let aiCommentary: string | null = null;
  let aiStatus: "ok" | "unavailable" = "unavailable";
  let aiNoteAr = "التعليق الذكي غير مفعّل";

  if (input.state.settings.aiBriefingEnabled && input.state.settings.aiAnalysisEnabled) {
    const analysis = await analyzeBusiness({
      state: input.state,
      products: input.products,
      orders: input.orders,
      now,
      question: "أعطني ملخص اليوم وأولويات العمل لهذا اليوم",
      scope: "overview",
      provider: input.provider,
      contentCountByProduct: input.contentCountByProduct,
      campaignCountByProduct: input.campaignCountByProduct,
    });
    if (analysis.success && analysis.response) {
      aiCommentary = analysis.response.answer;
      aiStatus = "ok";
      aiNoteAr = "تم توليد التعليق الذكي من البيانات الموثقة.";
    } else {
      aiStatus = "unavailable";
      aiNoteAr = analysis.error?.message ?? "المحلل الذكي غير متاح الآن.";
    }
  }

  appendBusinessAudit(
    input.state,
    makeBusinessAudit({
      actor: "system",
      action: "DAILY_BRIEFING_REQUESTED",
      entityType: "briefing",
      entityId: null,
      previous: null,
      new: { orderCountToday: facts.orderCountToday, aiStatus },
      at: now,
      reason: "الملخص اليومي",
    }),
  );

  return { facts, aiCommentary, aiStatus, aiNoteAr };
}