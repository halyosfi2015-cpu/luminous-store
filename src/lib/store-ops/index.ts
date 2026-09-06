/**
 * PART 4 — STORE OPERATIONS BARREL
 * ================================
 * Deterministic Commerce Operating System for Luminous. All engines are pure
 * over canonical data; side-effectful actions go through the audited store.
 */

export * from "./types";

export {
  makeBusinessAudit,
  appendBusinessAudit,
  businessAuditFor,
} from "./audit";
export {
  createMemoryStore,
  serializeStore,
  hydrateStore,
  getStoreOpsSync,
  getStoreOps,
  persistStoreOps,
  resetStoreOps,
  STORE_OPS_STATE_SETTINGS_KEY,
} from "./store";
export {
  normalizeStatus,
  isRevenueOrder,
  isCancelledOrder,
  aggregateProductSales,
  toProductSalesRows,
  ordersBetween,
  salesByDay,
  sumRevenue,
  sumShipping,
  sumItemCount,
} from "./aggregate";
export {
  recordMovement,
  netMovement,
  reservedQuantity,
  canonicalStock,
  unitsSoldWindow,
  averageDailySales,
  coverageDays,
  stockStatusLabelAr,
  classifyStock,
  getProductStockInfo,
  buildInventoryOverview,
  computeReorderRecommendation,
  computeReorderRecommendations,
  storeReorderRecommendation,
  applyReorderAction,
  adjustStock,
  productAggregates,
} from "./inventory";
export {
  computeSalesSummary,
  salesByProduct,
  salesByCategory,
  salesByBrand,
  classifyProduct,
  productClassificationLabelAr,
  computeProductPerformance,
  computeCategoryPerformance,
  computeBrandPerformance,
} from "./sales";
export {
  computeFinanceSummary,
  computeContribution,
  productContribution,
  campaignContribution,
} from "./finance";
export { buildPriceIntelligence } from "./price";
export { computeOrderIntelligence } from "./orders";
export { computeCustomerStats, groupCustomers, anonymizeCustomers } from "./customers";
export { buildCategoryDirectory } from "./categories";
export { buildBrandDirectory } from "./brands";
export {
  generateAlerts,
  syncAlerts,
  applyAlertAction,
  openAlerts,
  attentionSummary,
  alertCategoryLabel,
  SEVERITY_LABELS,
  ALERT_LABELS,
} from "./alerts";
export { detectAnomalies, anomaliesForDashboard } from "./anomalies";
export {
  detectOpportunities,
  detectCrossSell,
  buildBundleCandidates,
  scoreOpportunity,
  applyOpportunityAction,
} from "./opportunities";
export {
  collectContentStats,
  buildMarketingCommerceInsights,
  detectContentInventoryConflicts,
  conflictsForDashboard,
} from "./marketing";
export {
  buildVerifiedBusinessContext,
  buildBusinessAnalystPrompt,
  SelfBusinessAnalyst,
  createSelfBusinessAnalyst,
  resolveAnalystProvider,
  analyzeBusiness,
  buildDailyBriefing,
  BUSINESS_ANALYST_MODEL,
  BUSINESS_ANALYST_PROMPT_VERSION,
} from "./analyst";
export { buildExecutiveDashboard } from "./dashboard";