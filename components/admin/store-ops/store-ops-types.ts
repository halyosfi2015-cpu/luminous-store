// Client-safe mirrors of the Part 4 store-ops domain model.
// Server-side truth lives in src/lib/store-ops/types.ts — these describe only
// what the admin UI renders/edits via /api/admin/store-ops.

export type StockStatus =
  | "OUT_OF_STOCK"
  | "LOW_STOCK"
  | "AT_RISK"
  | "OVERSTOCK"
  | "DEAD_STOCK"
  | "NORMAL";

export type ProductClass =
  | "STAR"
  | "GROWING"
  | "STABLE"
  | "WEAK"
  | "AT_RISK"
  | "DEAD_STOCK"
  | "INSUFFICIENT";

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

export type StoreHealth = "good" | "attention" | "critical";

export interface StoreOpsSettings {
  version: string;
  timezone: string;
  currency: string;
  lowStockThreshold: number;
  reorderLeadTimeDays: number;
  stockCoverageTargetDays: number;
  overstockCoverageMultiple: number;
  deadStockDays: number;
  allowNegativeStock: boolean;
  velocityWindowDays: number;
  trendWindowDays: number;
  alertAutoGeneration: boolean;
  dailyBriefingEnabled: boolean;
  weeklyReportEnabled: boolean;
  autoAnomalyDetection: boolean;
  autoOpportunityDetection: boolean;
  anomalySensitivity: "low" | "medium" | "high";
  reportingFrequency: string;
  alertFrequency: string;
  costSource: "none" | "percentage";
  defaultCostRatio: number;
  aiAnalysisEnabled: boolean;
  aiBriefingEnabled: boolean;
  reorderSuggestionEnabled: boolean;
}

export interface ProductStockRow {
  productId: string;
  nameAr: string;
  brand: string;
  categorySlug: string;
  currentStock: number;
  status: StockStatus;
  statusLabelAr: string;
  price: number | null;
  priceStatus: "OK" | "REVIEW_REQUIRED" | "REJECTED";
  coverageDays: number | null;
  averageDailySales: number;
}

export interface CategoryRow {
  slug: string;
  nameAr: string;
  productCount: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  priceMin: number | null;
  priceMax: number | null;
  priceAverage: number | null;
  hasImage: boolean;
}

export interface BrandRow {
  brand: string;
  brandAr: string;
  productCount: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  priceMin: number | null;
  priceMax: number | null;
  priceAverage: number | null;
  topCategorySlug: string | null;
}

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
  actionable: { labelAr: string; action: string; route?: string } | null;
}

export interface AttentionSummary {
  code: string;
  labelAr: string;
  count: number;
  severity: AlertSeverity;
}

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

export interface AnalystResponse {
  answer: string;
  summary: string;
  facts: Array<{ statement: string; source: string; value: number | string | null }>;
  insights: Array<{ title: string; description: string }>;
  recommendations: Array<{ action: string; rationale: string }>;
  confidence: "high" | "medium" | "low";
  dataSources: Array<{ name: string; label: string }>;
  contextRange: string;
  contextVersion: string;
  generatedAt: string;
  promptVersion: string;
  model: string;
  metrics: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null; latencyMs: number; model: string };
}

export interface AnalystResult {
  success: boolean;
  response: AnalystResponse | null;
  error: { code: string; message: string } | null;
  disabled?: boolean;
}

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
  attention: AttentionSummary[];
  quickActions: Array<{ labelAr: string; action: string; route?: string }>;
  generatedAt: string;
  dataNotes: string[];
}

export interface AIProviderStatus {
  provider: string;
  openaiConfigured: boolean;
  selfAvailable: boolean;
}

export interface Movement {
  id: string;
  productId: string;
  quantity: number;
  direction: "in" | "out";
  reason: string;
  timestamp: string;
  source: string;
  actor: string;
  reference: string | null;
  note: string | null;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string | null;
  previous: unknown | null;
  new: unknown | null;
  at: string;
  reason: string | null;
}

export interface BusinessAuditEntry {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string | null;
  previous: unknown | null;
  new: unknown | null;
  at: string;
  reason: string | null;
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  OUT_OF_STOCK: "نفد المخزون",
  LOW_STOCK: "مخزون منخفض",
  AT_RISK: "خطر النفاد",
  OVERSTOCK: "مخزون زائد",
  DEAD_STOCK: "مخزون راكد",
  NORMAL: "طبيعي",
};

export const PRODUCT_CLASS_LABELS: Record<ProductClass, string> = {
  STAR: "نجم",
  GROWING: "نمو",
  STABLE: "مستقر",
  WEAK: "ضعيف",
  AT_RISK: "خطر",
  DEAD_STOCK: "مخزون راكد",
  INSUFFICIENT: "بيانات غير كافية",
};

export const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: "حرج",
  high: "عالية",
  medium: "متوسطة",
  info: "معلومات",
};

export const ALERT_CATEGORY_LABELS: Record<AlertCategory, string> = {
  inventory: "مخزون",
  sales: "مبيعات",
  orders: "طلبات",
  price: "أسعار",
  products: "منتجات",
  customers: "عملاء",
  marketing: "تسويق",
  campaigns: "حملات",
  system: "نظام",
};

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  open: "مفتوح",
  acknowledged: "تم الإقرار",
  snoozed: "مؤجل",
  dismissed: "مخفي",
};

export const OPPORTUNITY_KIND_LABELS: Record<OpportunityKind, string> = {
  high_demand_low_stock: "طلب عالي / مخزون منخفض",
  high_stock_low_demand: "مخزون عالي / طلب منخفض",
  rising_product: "منتج صاعد",
  rising_category: "فئة صاعدة",
  content_opportunity: "فرصة محتوى",
  campaign_opportunity: "فرصة حملة",
  seasonal_opportunity: "فرصة موسمية",
  cross_sell: "بيع متبادل",
  bundle: "باقة",
  product_relationship: "علاقة منتج",
};

export const HEALTH_LABELS: Record<StoreHealth, string> = {
  good: "أداء جيد",
  attention: "يحتاج متابعة",
  critical: "يحتاج تدخلاً عاجلاً",
};