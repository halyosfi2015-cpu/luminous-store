/**
 * PART 4 — STORE OPERATIONS / COMMERCE INTELLIGENCE
 * =================================================
 * Deterministic business types for the Luminous Commerce Operating System.
 *
 * Everything here is plain data. Business facts are computed by pure engines
 * from CANONICAL sources (catalog + orders + recorded inventory movements).
 * AI never becomes the source of truth for financial, inventory, order or
 * product facts — canonical data always wins.
 */

export const STORE_OPS_ENGINE_VERSION = "store_ops_part4_v1";

/* ------------------------------------------------------------------------ */
/* SETTINGS (persisted, never hardcoded business rules)                      */
/* ------------------------------------------------------------------------ */

export type CostSource = "none" | "percentage";

export type AnomalySensitivity = "low" | "medium" | "high";

export interface StoreOpsSettings {
  version: string;
  timezone: string;
  currency: string;
  // Inventory thresholds
  lowStockThreshold: number;
  reorderLeadTimeDays: number;
  stockCoverageTargetDays: number;
  overstockCoverageMultiple: number;
  deadStockDays: number;
  allowNegativeStock: boolean;
  // Sales / velocity windows
  velocityWindowDays: number;
  trendWindowDays: number;
  // Alerts / automation (defaults OFF for consequential actions)
  alertAutoGeneration: boolean;
  dailyBriefingEnabled: boolean;
  weeklyReportEnabled: boolean;
  autoAnomalyDetection: boolean;
  autoOpportunityDetection: boolean;
  anomalySensitivity: AnomalySensitivity;
  reportingFrequency: string;
  alertFrequency: string;
  // Financial settings
  costSource: CostSource;
  /** Only used when costSource === "percentage" (clearly labelled estimate). */
  defaultCostRatio: number;
  // AI business analysis
  aiAnalysisEnabled: boolean;
  aiBriefingEnabled: boolean;
  reorderSuggestionEnabled: boolean;
}

export const DEFAULT_STORE_OPS_SETTINGS: StoreOpsSettings = {
  version: STORE_OPS_ENGINE_VERSION,
  timezone: "Asia/Aden",
  currency: "YER",
  lowStockThreshold: 10,
  reorderLeadTimeDays: 7,
  stockCoverageTargetDays: 21,
  overstockCoverageMultiple: 3,
  deadStockDays: 60,
  allowNegativeStock: false,
  velocityWindowDays: 14,
  trendWindowDays: 7,
  alertAutoGeneration: true,
  dailyBriefingEnabled: true,
  weeklyReportEnabled: true,
  autoAnomalyDetection: false,
  autoOpportunityDetection: false,
  anomalySensitivity: "medium",
  reportingFrequency: "daily",
  alertFrequency: "daily",
  costSource: "none",
  defaultCostRatio: 0.35,
  aiAnalysisEnabled: true,
  aiBriefingEnabled: true,
  reorderSuggestionEnabled: true,
};

/* ------------------------------------------------------------------------ */
/* INVENTORY MOVEMENT LEDGER                                                 */
/* ------------------------------------------------------------------------ */

export type MovementDirection = "in" | "out";

export type MovementReason =
  | "purchase"
  | "sale"
  | "reservation"
  | "cancellation"
  | "return"
  | "manual_adjustment"
  | "damaged"
  | "correction";

export interface StockMovement {
  id: string;
  productId: string;
  /** Always positive. Direction carries the sign. */
  quantity: number;
  direction: MovementDirection;
  reason: MovementReason;
  timestamp: string;
  source: string;
  actor: string;
  reference: string | null;
  note: string | null;
}

/* ------------------------------------------------------------------------ */
/* INVENTORY STATUS                                                          */
/* ------------------------------------------------------------------------ */

export type StockStatus =
  | "OUT_OF_STOCK"
  | "LOW_STOCK"
  | "AT_RISK"
  | "OVERSTOCK"
  | "DEAD_STOCK"
  | "NORMAL";

export interface ProductStockInfo {
  productId: string;
  canonicalStock: number;
  reserved: number;
  movementNet: number;
  currentStock: number;
  availableStock: number;
  status: StockStatus;
  statusLabelAr: string;
  coverageDays: number | null;
  averageDailySales: number;
  unitsSoldWindow: number;
}

/* ------------------------------------------------------------------------ */
/* REORDER RECOMMENDATION                                                    */
/* ------------------------------------------------------------------------ */

export type RecommendationStatus = "open" | "acknowledged" | "executed" | "dismissed";

export interface ReorderRecommendation {
  id: string;
  productId: string;
  currentStock: number;
  averageDailySales: number;
  coverageDays: number | null;
  reorderLeadTimeDays: number;
  suggestedQuantity: number;
  reasonAr: string;
  createdAt: string;
  status: RecommendationStatus;
}

/* ------------------------------------------------------------------------ */
/* SALES / FINANCE                                                           */
/* ------------------------------------------------------------------------ */

export interface SalesSummary {
  orderCount: number;
  completedOrderCount: number;
  cancelledOrderCount: number;
  itemCount: number;
  grossSalesYER: number;
  cancelledSalesYER: number;
  netSalesYER: number;
  shippingYER: number;
  averageOrderValueYER: number | "insufficient_data";
  averageItemsPerOrder: number | "insufficient_data";
  discountImpact: { available: boolean; noteAr: string; amountYER: number | null };
  returnImpact: { available: boolean; noteAr: string; amountYER: number | null };
  hasOrders: boolean;
}

export interface ProductSalesRow {
  productId: string;
  units: number;
  revenueYER: number;
  orderCount: number;
}

export interface CategorySalesRow {
  categorySlug: string;
  categoryAr: string;
  units: number;
  revenueYER: number;
}

export interface BrandSalesRow {
  brand: string;
  units: number;
  revenueYER: number;
}

export interface DaySalesRow {
  date: string;
  orders: number;
  revenueYER: number;
}

export interface FinanceSummary {
  available: boolean;
  noteAr: string;
  revenueYER: number | null;
  costYER: number | null;
  grossProfitYER: number | null;
  grossMarginPercent: number | null;
  estimated: boolean;
}

/* ------------------------------------------------------------------------ */
/* PRICE INTELLIGENCE                                                        */
/* ------------------------------------------------------------------------ */

export type PriceStatus = "OK" | "REVIEW_REQUIRED" | "REJECTED";

export interface PriceIntelligenceRow {
  productId: string;
  price: number;
  currency: string;
  status: PriceStatus;
  issues: string[];
}

/* ------------------------------------------------------------------------ */
/* PRODUCT / CATEGORY / BRAND PERFORMANCE                                    */
/* ------------------------------------------------------------------------ */

export type ProductClass =
  | "STAR"
  | "GROWING"
  | "STABLE"
  | "WEAK"
  | "AT_RISK"
  | "DEAD_STOCK"
  | "INSUFFICIENT";

export interface ProductPerformance {
  productId: string;
  nameAr: string;
  brand: string;
  categorySlug: string;
  unitsSold: number;
  revenueYER: number;
  orderCount: number;
  averageDailySales: number;
  trend: number | null;
  stockStatus: StockStatus;
  currentStock: number;
  classification: ProductClass;
  classificationLabelAr: string;
}

export interface CategoryPerformance {
  categorySlug: string;
  categoryAr: string;
  productCount: number;
  unitsSold: number;
  revenueYER: number;
  averageOrderContributionYER: number | "insufficient_data";
  trend: number | null;
  lowStockCount: number;
  outOfStockCount: number;
  topProducts: ProductSalesRow[];
}

export interface BrandPerformance {
  brand: string;
  brandAr: string;
  productCount: number;
  unitsSold: number;
  revenueYER: number;
  trend: number | null;
  lowStockCount: number;
  outOfStockCount: number;
  topProducts: ProductSalesRow[];
}

/* ------------------------------------------------------------------------ */
/* ORDERS / CUSTOMERS                                                        */
/* ------------------------------------------------------------------------ */

export interface OrderIntelligence {
  byStatus: Record<string, number>;
  completionRate: number | "insufficient_data";
  cancellationRate: number | "insufficient_data";
  returnRate: number | "insufficient_data";
  averageOrderValueYER: number | "insufficient_data";
  delayedOrders: Array<{ orderId: string; createdAt: string; status: string; daysPending: number }>;
  hasOrders: boolean;
}

export interface CustomerStats {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  repeatPurchaseRate: number | "insufficient_data";
  averageOrderValueYER: number | "insufficient_data";
  lifetimeValueYER: number | "insufficient_data";
  topCustomers: Array<{ key: string; name: string; orderCount: number; totalSpentYER: number }>;
  inactiveCustomers: number;
  hasData: boolean;
}

/* ------------------------------------------------------------------------ */
/* ALERTS                                                                    */
/* ------------------------------------------------------------------------ */

export type AlertSeverity = "critical" | "high" | "medium" | "info";

export type AlertCategory =
  | "inventory"
  | "sales"
  | "orders"
  | "price"
  | "products"
  | "customers"
  | "marketing"
  | "campaigns"
  | "system";

export type AlertStatus = "open" | "acknowledged" | "snoozed" | "dismissed";

export interface BusinessAlertAction {
  labelAr: string;
  action: string;
  route?: string;
}

export interface BusinessAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  code: string;
  messageAr: string;
  entityType: "product" | "category" | "order" | "system" | "campaign" | "customer";
  entityId: string | null;
  createdAt: string;
  status: AlertStatus;
  reason: string;
  evidence: string | null;
  actionable: BusinessAlertAction | null;
}

/* ------------------------------------------------------------------------ */
/* OPPORTUNITIES                                                             */
/* ------------------------------------------------------------------------ */

export type OpportunityKind =
  | "high_demand_low_stock"
  | "high_stock_low_demand"
  | "rising_product"
  | "rising_category"
  | "content_opportunity"
  | "campaign_opportunity"
  | "seasonal_opportunity"
  | "cross_sell"
  | "bundle"
  | "product_relationship";

export interface Opportunity {
  id: string;
  kind: OpportunityKind;
  titleAr: string;
  descriptionAr: string;
  impact: number;
  confidence: number;
  urgency: number;
  evidence: string[];
  commercialValueYER: number | null;
  score: number;
  productIds: string[];
  categorySlug: string | null;
  actionLabelAr: string | null;
  actionRoute: string | null;
}

export interface CrossSellSet {
  productIds: string[];
  productNamesAr: string[];
  frequency: number;
  support: number | "insufficient_data";
}

export interface BundleCandidate {
  id: string;
  productIds: string[];
  productNamesAr: string[];
  frequency: number;
  rationaleAr: string;
}

/* ------------------------------------------------------------------------ */
/* ANOMALIES                                                                 */
/* ------------------------------------------------------------------------ */

export interface BusinessAnomaly {
  id: string;
  kind: string;
  messageAr: string;
  entityType: string;
  entityId: string | null;
  severity: AlertSeverity;
  evidence: string;
  at: string;
}

/* ------------------------------------------------------------------------ */
/* MARKETING ↔ COMMERCE                                                      */
/* ------------------------------------------------------------------------ */

export interface MarketingCommerceInsight {
  productId: string;
  nameAr: string;
  stockStatus: StockStatus;
  currentStock: number;
  unitsSoldWindow: number;
  hasPublishedContent: boolean;
  contentCount: number;
  campaignCount: number;
  recommendationAr: string;
}

/* ------------------------------------------------------------------------ */
/* AUDIT                                                                     */
/* ------------------------------------------------------------------------ */

export type BusinessAuditAction =
  | "INVENTORY_ADJUSTED"
  | "MOVEMENT_RECORDED"
  | "ALERT_ACKNOWLEDGED"
  | "ALERT_SNOOZED"
  | "ALERT_DISMISSED"
  | "REORDER_ACKNOWLEDGED"
  | "REORDER_EXECUTED"
  | "REORDER_DISMISSED"
  | "OPPORTUNITY_ACKNOWLEDGED"
  | "SETTINGS_UPDATED"
  | "BUSINESS_ANALYSIS_REQUESTED"
  | "DAILY_BRIEFING_REQUESTED"
  | "AUTOMATION_RUN"
  | "REPORT_GENERATED"
  | "ANALYST_ACCEPTED"
  | "ANALYST_REJECTED";

export interface BusinessAuditEntry {
  id: string;
  actor: string;
  action: BusinessAuditAction;
  entityType: string;
  entityId: string | null;
  previous: unknown | null;
  new: unknown | null;
  at: string;
  reason: string | null;
}

/* ------------------------------------------------------------------------ */
/* EXECUTIVE DASHBOARD                                                       */
/* ------------------------------------------------------------------------ */

export type StoreHealth = "good" | "attention" | "critical";

export interface ExecutiveDashboard {
  health: StoreHealth;
  healthLabelAr: string;
  today: {
    orderCount: number;
    netSalesYER: number;
    itemsSold: number;
    averageOrderValueYER: number | "insufficient_data";
    topProducts: ProductSalesRow[];
    attentionProducts: ProductSalesRow[];
    criticalAlerts: BusinessAlert[];
  };
  week: {
    salesYER: number;
    previousSalesYER: number | null;
    salesDeltaPercent: number | "insufficient_data";
    orderCount: number;
    previousOrderCount: number | null;
    ordersDeltaPercent: number | "insufficient_data";
    topProducts: ProductSalesRow[];
    worstProducts: ProductSalesRow[];
    topCategories: CategorySalesRow[];
    unitsMoved: number;
    deadStockCount: number;
  };
  month: {
    netSalesYER: number;
    orderCount: number;
    averageOrderValueYER: number | "insufficient_data";
    grossProfitYER: number | null;
    grossMarginPercent: number | null;
    growthPercent: number | "insufficient_data";
    topProducts: ProductSalesRow[];
    topCategories: CategorySalesRow[];
    topCampaigns: Array<{ campaignId: string; name: string; revenueYER: number | null }>;
  };
  attention: Array<{ code: string; labelAr: string; count: number; severity: AlertSeverity }>;
  quickActions: Array<{ labelAr: string; action: string; route?: string }>;
  generatedAt: string;
  dataNotes: string[];
}

/* ------------------------------------------------------------------------ */
/* DAILY BRIEFING                                                            */
/* ------------------------------------------------------------------------ */

export interface DailyBriefingFacts {
  orderCountToday: number;
  netSalesYER: number;
  salesDeltaPercent: number | "insufficient_data";
  nearOutOfStock: string[];
  outOfStockCount: number;
  deadStockCount: number;
  overPerformingCampaigns: string[];
  opportunityCount: number;
  attentionProducts: string[];
  generatedAt: string;
}

export interface DailyBriefing {
  facts: DailyBriefingFacts;
  aiCommentary: string | null;
  aiStatus: "ok" | "unavailable";
  aiNoteAr: string;
}

/* ------------------------------------------------------------------------ */
/* BUSINESS STORE                                                            */
/* ------------------------------------------------------------------------ */

export interface StoreOpsState {
  settings: StoreOpsSettings;
  movements: StockMovement[];
  alerts: Record<string, BusinessAlert>;
  reorder: Record<string, ReorderRecommendation>;
  audit: BusinessAuditEntry[];
  version: number;
}