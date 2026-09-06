// Client-safe mirrors of the Part 2 domain model. Server-side truth lives in
// src/lib/content-ops/types.ts — these types describe only what the admin UI
// renders/edits via /api/admin/content.

export type ContentOpsStatus =
  | "GENERATED"
  | "VALIDATING"
  | "REVIEW_REQUIRED"
  | "APPROVED"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "ARCHIVED"
  | "VALIDATION_FAILED"
  | "PUBLISH_FAILED"
  | "CANCELLED";

export type ContentType =
  | "EDUCATIONAL"
  | "PRODUCT_SPOTLIGHT"
  | "NEW_PRODUCT"
  | "COMPARISON"
  | "ROUTINE"
  | "FAQ"
  | "MYTH_FACT"
  | "ENGAGEMENT"
  | "SEASONAL"
  | "GIFTING"
  | "COMMERCIAL"
  | "CUSTOM_OTHER";

export type ContentObjective =
  | "AWARENESS"
  | "EDUCATION"
  | "DISCOVERY"
  | "ENGAGEMENT"
  | "CONVERSION"
  | "RETENTION"
  | "CROSS_SELL"
  | "UPSELL"
  | "REACTIVATION";

export type ContentLanguage = "ar" | "en";

export type ChannelKey = "website" | "instagram" | "facebook" | "tiktok" | "whatsapp";

export type HybridAIProviderName = "self" | "openai";

export interface HybridProviderStatus {
  version: string;
  selected: HybridAIProviderName;
  effective: HybridAIProviderName;
  fallbackUsed: boolean;
  openaiConfigured: boolean;
  selfAvailable: boolean;
  ready: boolean;
  messageAr: string;
  messageEn: string;
}

export interface ChannelConnectionStatus {
  channel: ChannelKey;
  labelAr: string;
  enabled: boolean;
  connected: boolean;
  website: boolean;
  noteAr: string;
}

export interface MultiChannelPublishResult {
  itemId: string;
  results: Array<{
    channel: ChannelKey;
    ok: boolean;
    code: string;
    message: string;
    publicationId?: string;
  }>;
  anySucceeded: boolean;
}

export type ContentCampaignStatus = "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled";

export type RejectionReason =
  | "BAD_COPY"
  | "WRONG_PRODUCT"
  | "WRONG_PRICE"
  | "WRONG_IMAGE"
  | "UNSUPPORTED_CLAIM"
  | "TOO_REPETITIVE"
  | "OFF_BRAND"
  | "SEASONAL_MISMATCH"
  | "OTHER";

export interface ContentVersion {
  id: string;
  versionNumber: number;
  content: {
    title: string | null;
    body: string;
    callToAction: string | null;
    language: ContentLanguage;
    productIds: string[];
    mediaReference: { type: string; url?: string; alt?: string; productImage?: boolean };
  };
  validation: {
    passed: boolean;
    issues: string[];
    checks: Array<{ check: string; passed: boolean; detail?: string }>;
  };
  originality: {
    score: number;
    passed: boolean;
    notes?: string[];
  };
  editor: string;
  createdAt: string;
  status: string;
}

export interface ContentOpsItem {
  id: string;
  item: {
    id: string;
    title: string | null;
    body: string;
    callToAction: string | null;
    contentType: ContentType;
    objective: ContentObjective;
    language: ContentLanguage;
    categoryId: string | null;
    productIds: string[];
    campaignId?: string | null;
    promptVersion: string;
  };
  status: ContentOpsStatus;
  versions: ContentVersion[];
  campaignId: string | null;
  ideaId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentSchedule {
  id: string;
  itemId: string;
  versionId: string;
  channel: ChannelKey;
  scheduledFor: string;
  timezone: string;
  campaignId: string | null;
  status: "scheduled" | "publishing" | "published" | "failed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface ContentCampaign {
  id: string;
  name: string;
  nameEn?: string;
  objective: ContentObjective;
  startAt: string;
  endAt: string;
  priority: number;
  categoryIds: string[];
  productIds: string[];
  contentTypes: ContentType[];
  channels: ChannelKey[];
  status: ContentCampaignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContentIdeaRecord {
  ideaId: string;
  title: string;
  categoryId: string | null;
  contentType: ContentType;
  objective: ContentObjective;
  productIds: string[];
  reason?: string;
  priority?: "high" | "medium" | "low";
  status: "IDEA" | "SELECTED" | "GENERATED" | "DISMISSED";
  createdAt: string;
  itemId?: string;
}

export interface ContentPlanItem {
  categoryId: string | null;
  contentType: ContentType;
  objective: ContentObjective;
  productIds: string[];
  suggestedFor: string;
  reason: string;
  status: string;
}

export interface ContentPlan {
  id: string;
  kind: "daily" | "weekly" | "monthly";
  label: string;
  generatedAt: string;
  items: ContentPlanItem[];
}

export interface DashboardStats {
  drafts: number;
  review: number;
  approved: number;
  scheduledToday: number;
  scheduledWeek: number;
  publishedToday: number;
  publishFailures: number;
  activeCampaigns: number;
  totalItems: number;
  totalScheduled: number;
  totalPublished: number;
  categoryCoverage: Array<{ categoryId: string | null; count: number }>;
  contentTypeBalance: Array<{ contentType: string; count: number }>;
}

export interface ContentOpsSettings {
  mode: "auto" | "admin_approval" | "hybrid";
  generationEnabled: boolean;
  dailyPlanEnabled: boolean;
  weeklyPlanEnabled: boolean;
  schedulingEnabled: boolean;
  defaultTimes: string[];
  autoGenerate: boolean;
  autoSchedule: boolean;
  autoPublish: boolean;
  autoPublishCategories: string[];
  autoPublishContentTypes: ContentType[];
  autoPublishDailyLimit: number;
  maxProductAppearances: number;
  maxCategoryConcentration: number;
  maxDailyItems: number;
  defaultLanguage: ContentLanguage;
  brandVoiceProfile: string;
  enabledChannels: ChannelKey[];
  aiProvider: HybridAIProviderName;
  aiFallbackEnabled: boolean;
  externalResearchEnabled: boolean;
  connectedChannels: ChannelKey[];
  originalityThreshold: number;
  sourceConfidenceThreshold: number;
  priceFreshnessDays: number;
  timezone: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
}

export interface PerformanceSummary {
  contentId: string;
  counts: Record<string, number>;
  sampleSize: number;
  impressions: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  productViews: number;
  addToCarts: number;
  wishlists: number;
  checkouts: number;
  purchases: number;
  repeatPurchases: number;
  revenueYER: number;
  engagementRate: number | "insufficient_data";
  clickThroughRate: number | "insufficient_data";
  conversionRate: number | "insufficient_data";
}

export interface PerformanceDashboard {
  totalEvents: number;
  uniqueContent: number;
  totals: PerformanceSummary;
  topByEngagement: Array<{ contentId: string; engagementRate: number | "insufficient_data"; engagements: number }>;
  topProducts: Array<{ productId: string; purchases: number; revenueYER: number }>;
  byContentType: Array<{ categoryId: string | null; impressions: number; engagements: number }>;
}

export interface ContentFatigueReport {
  contentId: string;
  impressions: number;
  engagements: number;
  engagementRate: number | "insufficient_data";
  lastEventAt: string | null;
  ageDays: number | null;
  fatigueScore: number;
  recommendation: "healthy" | "watch" | "refresh" | "rest";
}

export const STATUS_LABELS: Record<ContentOpsStatus, string> = {
  GENERATED: "تم الإنشاء",
  VALIDATING: "جارٍ التحقق",
  REVIEW_REQUIRED: "بانتظار المراجعة",
  APPROVED: "معتمد",
  SCHEDULED: "مجدول",
  PUBLISHING: "جارٍ النشر",
  PUBLISHED: "منشور",
  ARCHIVED: "مؤرشف",
  VALIDATION_FAILED: "فشل التحقق",
  PUBLISH_FAILED: "فشل النشر",
  CANCELLED: "ملغى",
};

export const STATUS_TONES: Record<ContentOpsStatus, string> = {
  GENERATED: "neutral",
  VALIDATING: "accent",
  REVIEW_REQUIRED: "warning",
  APPROVED: "success",
  SCHEDULED: "accent",
  PUBLISHING: "accent",
  PUBLISHED: "success",
  ARCHIVED: "secondary",
  VALIDATION_FAILED: "error",
  PUBLISH_FAILED: "error",
  CANCELLED: "error",
};

export const TYPE_LABELS: Record<ContentType, string> = {
  EDUCATIONAL: "تعليمي",
  PRODUCT_SPOTLIGHT: "تسليط الضوء",
  NEW_PRODUCT: "منتج جديد",
  COMPARISON: "مقارنة",
  ROUTINE: "روتين",
  FAQ: "سؤال شائع",
  MYTH_FACT: "خرافة وحقيقة",
  ENGAGEMENT: "تفاعل",
  SEASONAL: "موسمي",
  GIFTING: "هدايا",
  COMMERCIAL: "تسويقي",
  CUSTOM_OTHER: "مخصص / أخرى",
};

export const OBJECTIVE_LABELS: Record<ContentObjective, string> = {
  AWARENESS: "الوعي",
  EDUCATION: "التعليم",
  DISCOVERY: "الاكتشاف",
  ENGAGEMENT: "التفاعل",
  CONVERSION: "التحويل",
  RETENTION: "الاحتفاظ",
  CROSS_SELL: "بيع متقاطع",
  UPSELL: "بيع تصاعدي",
  REACTIVATION: "إعادة تنشيط",
};

export const CHANNEL_LABELS: Record<ChannelKey, string> = {
  website: "الموقع",
  instagram: "إنستغرام",
  facebook: "فيسبوك",
  tiktok: "تيك توك",
  whatsapp: "واتساب",
};

export const CAMPAIGN_STATUS_LABELS: Record<ContentCampaignStatus, string> = {
  draft: "مسودة",
  scheduled: "مجدول",
  running: "نشط",
  paused: "متوقف",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  BAD_COPY: "نص ضعيف",
  WRONG_PRODUCT: "منتج خاطئ",
  WRONG_PRICE: "سعر خاطئ",
  WRONG_IMAGE: "صورة خاطئة",
  UNSUPPORTED_CLAIM: "ادعاء غير مدعوم",
  TOO_REPETITIVE: "مكرر جداً",
  OFF_BRAND: "خارج الهوية",
  SEASONAL_MISMATCH: "لا يلائم الموسم",
  OTHER: "أخرى",
};

export const ALL_CONTENT_TYPES: ContentType[] = [
  "EDUCATIONAL",
  "PRODUCT_SPOTLIGHT",
  "NEW_PRODUCT",
  "COMPARISON",
  "ROUTINE",
  "FAQ",
  "MYTH_FACT",
  "ENGAGEMENT",
  "SEASONAL",
  "GIFTING",
  "COMMERCIAL",
];

export const ALL_OBJECTIVES: ContentObjective[] = [
  "AWARENESS",
  "EDUCATION",
  "DISCOVERY",
  "ENGAGEMENT",
  "CONVERSION",
  "RETENTION",
  "CROSS_SELL",
  "UPSELL",
  "REACTIVATION",
];

export const ALL_CHANNELS: ChannelKey[] = ["website", "instagram", "facebook", "tiktok", "whatsapp"];

export const ALL_REJECTION_REASONS: RejectionReason[] = [
  "BAD_COPY",
  "WRONG_PRODUCT",
  "WRONG_PRICE",
  "WRONG_IMAGE",
  "UNSUPPORTED_CLAIM",
  "TOO_REPETITIVE",
  "OFF_BRAND",
  "SEASONAL_MISMATCH",
  "OTHER",
];

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ar-YE", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ar-YE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatInt(n: number | undefined | null): string {
  return Number.isFinite(n) ? (n as number).toLocaleString("ar-YE") : "0";
}

export function formatYER(n: number | undefined | null): string {
  return `${formatInt(n)} ر.ي`;
}

export function percent(v: number | "insufficient_data"): string {
  if (v === "insufficient_data") return "غير كافٍ";
  return `${(v * 100).toFixed(1)}%`;
}