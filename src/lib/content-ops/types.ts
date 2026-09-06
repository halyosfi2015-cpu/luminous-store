/**
 * PART 2 — CONTENT OPERATIONS DOMAIN MODEL
 * ========================================
 * Lifecycle, versioning, approvals, schedules, publications, campaigns,
 * performance events, plans and settings for the Content Center.
 *
 * Reuses Part 1 as the single source for content payloads (ContentItem,
 * ContentBrief, validators, eligibility). This file adds the operational
 * state that Part 1 intentionally does not own (no scheduling/publishing).
 */

import type {
  ContentItem,
  ContentType,
  ContentObjective,
  ContentLanguage,
  MediaReference,
  SourceFactRef,
  ContentValidation,
  ContentOriginality,
  ContentIdea,
} from "../ai/content/types";

/* ------------------------------------------------------------------------ */
/* LIFECYCLE                                                                 */
/* ------------------------------------------------------------------------ */

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

export const CONTENT_OPS_STATUSES: readonly ContentOpsStatus[] = [
  "GENERATED",
  "VALIDATING",
  "REVIEW_REQUIRED",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "ARCHIVED",
  "VALIDATION_FAILED",
  "PUBLISH_FAILED",
  "CANCELLED",
];

export const CONTENT_OPS_STATUS_LABELS: Record<ContentOpsStatus, { ar: string; en: string }> = {
  GENERATED: { ar: "تم الإنشاء", en: "Generated" },
  VALIDATING: { ar: "جارٍ التحقق", en: "Validating" },
  REVIEW_REQUIRED: { ar: "بانتظار المراجعة", en: "Review required" },
  APPROVED: { ar: "معتمد", en: "Approved" },
  SCHEDULED: { ar: "مجدول", en: "Scheduled" },
  PUBLISHING: { ar: "جارٍ النشر", en: "Publishing" },
  PUBLISHED: { ar: "منشور", en: "Published" },
  ARCHIVED: { ar: "مؤرشف", en: "Archived" },
  VALIDATION_FAILED: { ar: "فشل التحقق", en: "Validation failed" },
  PUBLISH_FAILED: { ar: "فشل النشر", en: "Publish failed" },
  CANCELLED: { ar: "ملغى", en: "Cancelled" },
};

/** Valid lifecycle transitions (never skip AI generation → published). */
export const CONTENT_OPS_TRANSITIONS: Record<ContentOpsStatus, readonly ContentOpsStatus[]> = {
  GENERATED: ["VALIDATING", "REVIEW_REQUIRED", "VALIDATION_FAILED", "ARCHIVED", "CANCELLED"],
  VALIDATING: ["REVIEW_REQUIRED", "VALIDATION_FAILED", "APPROVED", "CANCELLED"],
  REVIEW_REQUIRED: ["APPROVED", "REVIEW_REQUIRED", "VALIDATION_FAILED", "ARCHIVED", "CANCELLED"],
  APPROVED: ["SCHEDULED", "REVIEW_REQUIRED", "ARCHIVED", "CANCELLED"],
  SCHEDULED: ["PUBLISHING", "REVIEW_REQUIRED", "PUBLISH_FAILED", "CANCELLED", "ARCHIVED", "APPROVED"],
  PUBLISHING: ["PUBLISHED", "PUBLISH_FAILED"],
  PUBLISHED: ["ARCHIVED", "PUBLISHED"],
  ARCHIVED: ["ARCHIVED"],
  VALIDATION_FAILED: ["REVIEW_REQUIRED", "VALIDATING", "ARCHIVED", "CANCELLED"],
  PUBLISH_FAILED: ["SCHEDULED", "PUBLISHING", "CANCELLED", "ARCHIVED"],
  CANCELLED: ["ARCHIVED"],
};

/* ------------------------------------------------------------------------ */
/* VERSIONS                                                                  */
/* ------------------------------------------------------------------------ */

export type ContentVersionStatus = "draft" | "approved" | "rejected" | "superseded" | "published";

export interface ContentVersion {
  id: string;
  itemId: string;
  versionNumber: number;
  content: {
    title: string | null;
    body: string;
    callToAction: string | null;
    language: ContentLanguage;
    productIds: string[];
    mediaReference: MediaReference;
  };
  promptVersion: string;
  sourceFacts: SourceFactRef[];
  validation: ContentValidation;
  originality: ContentOriginality;
  editor: string;
  createdAt: string;
  status: ContentVersionStatus;
}

/* ------------------------------------------------------------------------ */
/* APPROVALS / REJECTIONS                                                    */
/* ------------------------------------------------------------------------ */

export interface ContentApproval {
  id: string;
  itemId: string;
  versionId: string;
  approverId: string;
  approvedAt: string;
  validationSnapshot: ContentValidation;
  promptVersion: string;
}

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

export const REJECTION_REASONS: readonly RejectionReason[] = [
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

export const REJECTION_REASON_LABELS: Record<RejectionReason, { ar: string; en: string }> = {
  BAD_COPY: { ar: "نص ضعيف", en: "Bad copy" },
  WRONG_PRODUCT: { ar: "منتج خاطئ", en: "Wrong product" },
  WRONG_PRICE: { ar: "سعر خاطئ", en: "Wrong price" },
  WRONG_IMAGE: { ar: "صورة خاطئة", en: "Wrong image" },
  UNSUPPORTED_CLAIM: { ar: "ادعاء غير مدعوم", en: "Unsupported claim" },
  TOO_REPETITIVE: { ar: "مكرر جداً", en: "Too repetitive" },
  OFF_BRAND: { ar: "خارج الهوية", en: "Off brand" },
  SEASONAL_MISMATCH: { ar: "لا يلائم الموسم", en: "Seasonal mismatch" },
  OTHER: { ar: "أخرى", en: "Other" },
};

export interface RejectionRecord {
  id: string;
  itemId: string;
  versionId: string;
  rejectorId: string;
  reason: RejectionReason;
  note?: string;
  at: string;
}

/* ------------------------------------------------------------------------ */
/* CONTENT ITEM (ops envelope around Part 1 payload)                         */
/* ------------------------------------------------------------------------ */

export interface ContentOpsItem {
  /** Stable content id (== Part 1 item id). */
  id: string;
  /** Part 1 generated/validated payload (single source of truth). */
  item: ContentItem;
  /** Operational lifecycle status. */
  status: ContentOpsStatus;
  /** Immutable version history (index 0 = latest). */
  versions: ContentVersion[];
  approvals: ContentApproval[];
  rejections: RejectionRecord[];
  campaignId: string | null;
  ideaId: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------------ */
/* SCHEDULES + PUBLICATIONS                                                  */
/* ------------------------------------------------------------------------ */

export type ChannelKey = "website" | "instagram" | "facebook" | "tiktok" | "whatsapp";

export const CHANNELS: readonly ChannelKey[] = ["website", "instagram", "facebook", "tiktok", "whatsapp"];

export const CHANNEL_LABELS: Record<ChannelKey, { ar: string; en: string }> = {
  website: { ar: "الموقع", en: "Website" },
  instagram: { ar: "إنستغرام", en: "Instagram" },
  facebook: { ar: "فيسبوك", en: "Facebook" },
  tiktok: { ar: "تيك توك", en: "TikTok" },
  whatsapp: { ar: "واتساب", en: "WhatsApp" },
};

export type ContentScheduleStatus = "scheduled" | "publishing" | "published" | "failed" | "cancelled";

export interface ContentSchedule {
  id: string;
  itemId: string;
  versionId: string;
  channel: ChannelKey;
  scheduledFor: string;
  timezone: string;
  campaignId: string | null;
  status: ContentScheduleStatus;
  createdAt: string;
  updatedAt: string;
}

export type PublicationStatus = "pending" | "succeeded" | "failed";

export interface ContentPublication {
  /** Idempotency key: itemId + versionId + channel + scheduleId. */
  id: string;
  itemId: string;
  versionId: string;
  channel: ChannelKey;
  scheduleId: string;
  status: PublicationStatus;
  /** Provider confirmation (only real confirmations). */
  providerResponse?: { providerId?: string; ok: boolean; error?: string };
  /** Stale-content re-check performed at publish time. */
  revalidation: { passed: boolean; issues: string[] };
  attemptedAt: string;
  completedAt?: string;
}

/** Website channel — published content surfaced to the storefront. */
export interface PublishedContent {
  publicationId: string;
  contentId: string;
  title: string | null;
  body: string;
  callToAction: string | null;
  productIds: string[];
  categoryId: string | null;
  channel: ChannelKey;
  publishedAt: string;
  visible: boolean;
}

/* ------------------------------------------------------------------------ */
/* CAMPAIGNS (content campaigns — separate from message-delivery campaigns)  */
/* ------------------------------------------------------------------------ */

export type ContentCampaignStatus = "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled";

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

/* ------------------------------------------------------------------------ */
/* IDEAS (Part 1 planner output + ops status)                                */
/* ------------------------------------------------------------------------ */

export type ContentIdeaStatus = "IDEA" | "SELECTED" | "GENERATED" | "DISMISSED";

export interface ContentIdeaRecord extends ContentIdea {
  ideaId: string;
  status: ContentIdeaStatus;
  createdAt: string;
  itemId?: string;
}

/* ------------------------------------------------------------------------ */
/* PLANS                                                                     */
/* ------------------------------------------------------------------------ */

export type ContentPlanKind = "daily" | "weekly" | "monthly";

export interface ContentPlanItem {
  categoryId: string | null;
  contentType: ContentType;
  objective: ContentObjective;
  productIds: string[];
  suggestedFor: string;
  reason: string;
  status: "proposed" | "draft" | "review" | "dismissed";
}

export interface ContentPlan {
  id: string;
  kind: ContentPlanKind;
  label: string;
  generatedAt: string;
  items: ContentPlanItem[];
}

/* ------------------------------------------------------------------------ */
/* PERFORMANCE                                                               */
/* ------------------------------------------------------------------------ */

export type ContentMetric =
  | "impression"
  | "view"
  | "like"
  | "comment"
  | "share"
  | "save"
  | "click"
  | "product_view"
  | "add_to_cart"
  | "wishlist"
  | "checkout"
  | "purchase"
  | "repeat_purchase";

export const CONTENT_METRICS: readonly ContentMetric[] = [
  "impression",
  "view",
  "like",
  "comment",
  "share",
  "save",
  "click",
  "product_view",
  "add_to_cart",
  "wishlist",
  "checkout",
  "purchase",
  "repeat_purchase",
];

export interface ContentPerformanceEvent {
  /** Dedupe id — same event never counted twice. */
  id: string;
  contentId: string;
  productId: string | null;
  campaignId: string | null;
  categoryId: string | null;
  metric: ContentMetric;
  occurredAt: string;
  source: string;
  /** Monetary value (YER) for revenue-type metrics (purchase/checkout). */
  value?: number;
}

/* ------------------------------------------------------------------------ */
/* SETTINGS (Part 2 — Content Center controls)                               */
/* ------------------------------------------------------------------------ */

export type ContentOpsMode = "auto" | "admin_approval" | "hybrid";

/**
 * PART 3 — Hybrid AI engine provider names. `self` = deterministic in-app
 * engine (always available), `openai` = server-side OpenAI adapter (requires
 * a server-side API key). Canonical single source lives here so both the AI
 * layer and the Content Center share one spelling.
 */
export type HybridAIProviderName = "self" | "openai";

export interface ContentOpsSettings {
  mode: ContentOpsMode;
  // Generation
  generationEnabled: boolean;
  dailyPlanEnabled: boolean;
  weeklyPlanEnabled: boolean;
  // Scheduling
  schedulingEnabled: boolean;
  defaultTimes: string[];
  // Automation
  autoGenerate: boolean;
  autoSchedule: boolean;
  autoPublish: boolean;
  autoPublishCategories: string[];
  autoPublishContentTypes: ContentType[];
  autoPublishDailyLimit: number;
  // Limits
  maxProductAppearances: number;
  maxCategoryConcentration: number;
  maxDailyItems: number;
  // Brand / language
  defaultLanguage: ContentLanguage;
  brandVoiceProfile: string;
  // Channels
  enabledChannels: ChannelKey[];
  // PART 3 — Hybrid AI provider
  aiProvider: HybridAIProviderName;
  /** When OpenAI is selected but not configured, fall back to self. */
  aiFallbackEnabled: boolean;
  /** External research/context enrichment (never overrides internal facts). */
  externalResearchEnabled: boolean;
  /** Channels with a real, verified connection (website is always connected). */
  connectedChannels: ChannelKey[];
  // Validation (safety rules can be tuned but NOT switched off)
  originalityThreshold: number;
  sourceConfidenceThreshold: number;
  priceFreshnessDays: number;
  // Timezone
  timezone: string;
  // Social links (managed in Admin, displayed in Footer)
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
}

export const DEFAULT_CONTENT_OPS_SETTINGS: ContentOpsSettings = {
  mode: "hybrid",
  generationEnabled: true,
  dailyPlanEnabled: true,
  weeklyPlanEnabled: true,
  schedulingEnabled: true,
  defaultTimes: ["10:00", "14:00", "18:00"],
  autoGenerate: false,
  autoSchedule: false,
  autoPublish: false,
  autoPublishCategories: [],
  autoPublishContentTypes: ["EDUCATIONAL", "PRODUCT_SPOTLIGHT", "ROUTINE", "FAQ"],
  autoPublishDailyLimit: 10,
  maxProductAppearances: 5,
  maxCategoryConcentration: 0.4,
  maxDailyItems: 12,
  defaultLanguage: "ar",
  brandVoiceProfile: "luminous",
  enabledChannels: ["website"],
  aiProvider: "self",
  aiFallbackEnabled: true,
  externalResearchEnabled: false,
  connectedChannels: ["website"],
  originalityThreshold: 0.7,
  sourceConfidenceThreshold: 0.5,
  priceFreshnessDays: 7,
  timezone: "Asia/Aden",
  instagramUrl: "https://www.instagram.com/luminousderma.ye/",
  facebookUrl: "https://www.facebook.com/luminousderma.ye",
  tiktokUrl: "https://tiktok.com/@luminousderma",
  youtubeUrl: "https://youtube.com/@luminousderma",
};

/* ------------------------------------------------------------------------ */
/* AUDIT                                                                     */
/* ------------------------------------------------------------------------ */

export type ContentAuditAction =
  | "AI_GENERATED"
  | "IDEA_CREATED"
  | "IDEA_DISMISSED"
  | "ADMIN_EDITED"
  | "REVALIDATED"
  | "VALIDATION_FAILED"
  | "APPROVED"
  | "REJECTED"
  | "SCHEDULED"
  | "RESCHEDULED"
  | "CANCELLED"
  | "ARCHIVED"
  | "PUBLISH_STARTED"
  | "PUBLISHED"
  | "PUBLISH_FAILED"
  | "CAMPAIGN_CREATED"
  | "CAMPAIGN_UPDATED"
  | "CAMPAIGN_STATUS_CHANGED"
  | "SETTINGS_UPDATED"
  | "PLAN_GENERATED"
  | "REVALIDATION_REQUIRED"
  | "AI_PROVIDER_CHANGED"
  | "AI_STATUS_CHECKED"
  | "AUTOMATION_UPDATED"
  | "CHANNEL_CONNECTED"
  | "CHANNEL_DISCONNECTED"
  | "EXTERNAL_CONTEXT_REQUESTED"
  | "PUBLISH_APPROVED_MULTI"
  | "PIPELINE_RUN";

export interface ContentAuditEntry {
  id: string;
  contentId: string | null;
  versionId: string | null;
  actor: string;
  action: ContentAuditAction;
  previousStatus: ContentOpsStatus | null;
  newStatus: ContentOpsStatus | null;
  at: string;
  reason?: string;
  channel?: ChannelKey;
  publicationResult?: string;
}

/* ------------------------------------------------------------------------ */
/* PLANNING INPUTS / NEXT-BEST OUTPUT                                        */
/* ------------------------------------------------------------------------ */

export interface PlanRequest {
  date?: string;
  itemCount?: number;
  campaignId?: string | null;
}

/* ------------------------------------------------------------------------ */
/* GENERATION REQUEST (admin-driven, server-side only)                       */
/* ------------------------------------------------------------------------ */

export interface GenerateRequest {
  categoryId?: string | null;
  contentType?: ContentType;
  objective?: ContentObjective;
  productIds?: string[];
  language?: ContentLanguage;
  campaignId?: string | null;
  scheduledFor?: string | null;
  channel?: ChannelKey;
  sourceEditorialAr?: string;
  sourceEditorialEn?: string;
}

/* ------------------------------------------------------------------------ */
/* OPERATION RESULTS                                                         */
/* ------------------------------------------------------------------------ */

export interface OpResult<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; details?: string[] };
}

/* ------------------------------------------------------------------------ */
/* PERFORMANCE SUMMARY + STORE-LIKE (analytics module)                       */
/* ------------------------------------------------------------------------ */

export interface PerformanceSummary {
  contentId: string;
  counts: Record<ContentMetric, number>;
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

/** Minimal store surface consumed by the analytics module (any store with events). */
export interface ContentStoreLike {
  events: Map<string, ContentPerformanceEvent>;
  published: Map<string, PublishedContent>;
}

/* ------------------------------------------------------------------------ */
/* VISUAL CONTENT STUDIO — BRAND PROFILE                                     */
/* ------------------------------------------------------------------------ */

export type VisualDensity = "compact" | "comfortable" | "spacious";
export type ImageStyle = "editorial_beauty" | "clinical_clean" | "lifestyle_warm" | "minimal_product" | "modern_editorial";
export type PreferredLighting = "soft_natural" | "studio_controlled" | "golden_hour" | "high_key" | "dramatic";
export type PreferredBackground = "gradient_blur" | "solid_subtle" | "texture_paper" | "abstract_shapes" | "lifestyle_context";
export type ProductPresentation = "hero_centered" | "floating_3d" | "lifestyle_in_use" | "flat_lay" | "ingredient_focus";
export type VisualGenerationMode = "native" | "ai" | "hybrid";

export interface FontWeights {
  light: number;
  regular: number;
  medium: number;
  semibold: number;
  bold: number;
  extrabold: number;
}

export interface ColorPalette {
  primary: string[];
  secondary: string[];
  accent: string[];
  neutral: string[];
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

export interface SpacingScale {
  base: number;
  scale: number[];
}

export interface BorderRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export interface LogoUsageRules {
  never_stretch: boolean;
  never_recolor: boolean;
  clear_space_required: boolean;
  minimum_size_px: number;
  preferred_placement: string[];
}

export interface ToneMatrix {
  educational: { ar: string; en: string };
  commercial: { ar: string; en: string };
  engagement: { ar: string; en: string };
  seasonal: { ar: string; en: string };
  trust: { ar: string; en: string };
}

export interface CTAStyle {
  primary: { bg: string; text: string; hover_bg: string; radius: string };
  secondary: { bg: string; border: string; text: string; hover_bg: string; hover_text: string; radius: string };
  ghost: { bg: string; text: string; hover_bg: string; radius: string };
}

export interface ChannelFormatSpec {
  width: number;
  height: number;
  aspect: string;
  safe_zone_pct: number;
}

export interface ChannelFormats {
  instagram_post: ChannelFormatSpec;
  instagram_portrait: ChannelFormatSpec;
  instagram_story: ChannelFormatSpec;
  facebook_post: ChannelFormatSpec;
  tiktok_cover: ChannelFormatSpec;
  youtube_thumbnail: ChannelFormatSpec;
  custom: ChannelFormatSpec;
}

export interface ProhibitedStyles {
  prohibited: string[];
}

export interface BrandProfile {
  id: string;
  name_ar: string;
  name_en: string;
  tagline_ar: string;
  tagline_en: string;

  // Visual Identity
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_primary: string;
  text_secondary: string;
  text_on_primary: string;
  text_on_secondary: string;

  color_palette: ColorPalette;

  // Typography
  font_arabic_primary: string;
  font_arabic_secondary?: string;
  font_arabic_display?: string;
  font_latin_primary: string;
  font_latin_secondary?: string;
  font_latin_display?: string;
  font_weights: FontWeights;

  // Spacing & Layout
  base_spacing: number;
  spacing_scale: number[];
  border_radius: BorderRadius;
  visual_density: VisualDensity;

  // Image Style
  image_style: ImageStyle;
  preferred_lighting: PreferredLighting;
  preferred_background: PreferredBackground;
  product_presentation: ProductPresentation;

  // Logo
  logo_primary_url?: string;
  logo_white_url?: string;
  logo_dark_url?: string;
  logo_icon_url?: string;
  logo_clear_space_ratio: number;
  logo_min_width: number;
  logo_usage_rules: LogoUsageRules;

  // Tone & Voice
  tone_arabic: string;
  tone_english: string;
  tone_matrix: ToneMatrix;

  // CTA Style
  cta_style: CTAStyle;

  // Channel Formats
  channel_formats: ChannelFormats;

  // Prohibited Styles
  prohibited_styles: string[];

  // Metadata
  version: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  data: Record<string, unknown>;
}

export const DEFAULT_BRAND_PROFILE: BrandProfile = {
  id: "luminous-derma",
  name_ar: "لومينوس ديرما",
  name_en: "Luminous Derma",
  tagline_ar: "الاختيار الصحيح",
  tagline_en: "The Right Choice",

  primary_color: "#7A3E9D",
  secondary_color: "#D4AF37",
  accent_color: "#F5A6C7",
  background_color: "#352347",
  surface_color: "#4B2A6F",
  text_primary: "#FFF7F2",
  text_secondary: "#FFF7F2CC",
  text_on_primary: "#352347",
  text_on_secondary: "#FFF7F2",

  color_palette: {
    primary: ["#7A3E9D", "#8B4FC3", "#9C5FD8", "#AD6FED"],
    secondary: ["#D4AF37", "#DDB84D", "#E6C263", "#EFCC79"],
    accent: ["#F5A6C7", "#F8BBD0", "#FCD0E0", "#FFE5ED"],
    neutral: ["#352347", "#4B2A6F", "#613D87", "#774FA0", "#8E61B9"],
    semantic: {
      success: "#25D366",
      warning: "#FFB800",
      error: "#FF4444",
      info: "#00BCD4",
    },
  },

  font_arabic_primary: "Tajawal",
  font_arabic_secondary: "Cairo",
  font_arabic_display: "Amiri",
  font_latin_primary: "Montserrat",
  font_latin_secondary: "Inter",
  font_latin_display: "Playfair Display",
  font_weights: { light: 300, regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800 },

  base_spacing: 4,
  spacing_scale: [0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16],
  border_radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
  visual_density: "comfortable",

  image_style: "editorial_beauty",
  preferred_lighting: "soft_natural",
  preferred_background: "gradient_blur",
  product_presentation: "hero_centered",

  logo_clear_space_ratio: 0.15,
  logo_min_width: 80,
  logo_usage_rules: {
    never_stretch: true,
    never_recolor: true,
    clear_space_required: true,
    minimum_size_px: 80,
    preferred_placement: ["top-left", "top-right", "bottom-left", "bottom-right", "center-top", "center-bottom"],
  },

  tone_arabic: "صديقة وخبيرة وراقية",
  tone_english: "friendly, expert, sophisticated",
  tone_matrix: {
    educational: { ar: "معلومة وموثوقة", en: "informative and trustworthy" },
    commercial: { ar: "مقنعة وأنيقة", en: "persuasive and elegant" },
    engagement: { ar: "ودية وتفاعلية", en: "friendly and engaging" },
    seasonal: { ar: "احتفالية ودافئة", en: "celebratory and warm" },
    trust: { ar: "شفافة وصادقة", en: "transparent and honest" },
  },

  cta_style: {
    primary: { bg: "#D4AF37", text: "#352347", hover_bg: "#F7D98C", radius: "full" },
    secondary: { bg: "transparent", border: "#D4AF37", text: "#D4AF37", hover_bg: "#D4AF37", hover_text: "#352347", radius: "full" },
    ghost: { bg: "transparent", text: "#FFF7F2", hover_bg: "rgba(255,255,255,0.1)", radius: "full" },
  },

  channel_formats: {
    instagram_post: { width: 1080, height: 1080, aspect: "1:1", safe_zone_pct: 0.9 },
    instagram_portrait: { width: 1080, height: 1350, aspect: "4:5", safe_zone_pct: 0.85 },
    instagram_story: { width: 1080, height: 1920, aspect: "9:16", safe_zone_pct: 0.8 },
    facebook_post: { width: 1200, height: 630, aspect: "1.91:1", safe_zone_pct: 0.9 },
    tiktok_cover: { width: 1080, height: 1920, aspect: "9:16", safe_zone_pct: 0.8 },
    youtube_thumbnail: { width: 1280, height: 720, aspect: "16:9", safe_zone_pct: 0.9 },
    custom: { width: 1080, height: 1080, aspect: "1:1", safe_zone_pct: 0.9 },
  },

  prohibited_styles: [
    "generic_ai_looking",
    "overcrowded_composition",
    "distorted_logo",
    "unreadable_arabic_typography",
    "clashing_colors",
    "misleading_before_after",
    "medical_claims_visual",
    "excessive_filters",
    "stock_photo_obvious",
    "inconsistent_branding",
  ],

  version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  data: {},
};

/* ------------------------------------------------------------------------ */
/* VISUAL CONTENT STUDIO — CREATIVE BRIEF                                    */
/* ------------------------------------------------------------------------ */

export type CreativeBriefStatus = "draft" | "review" | "approved" | "archived";

export interface CreativeBrief {
  id: string;
  campaign_id?: string;
  title_ar: string;
  title_en?: string;

  business_objective: string;
  business_objective_en?: string;
  target_audience: Record<string, unknown>;
  key_messages: unknown[];

  visual_concept_ar?: string;
  visual_concept_en?: string;
  mood_ar?: string;
  mood_en?: string;
  composition_ar?: string;
  composition_en?: string;
  lighting_direction?: string;
  background_direction?: string;
  color_direction?: Record<string, unknown>;

  mandatory_elements: unknown[];
  prohibited_elements: unknown[];

  deliverables: unknown[];
  timeline_start?: string;
  timeline_end?: string;

  status: CreativeBriefStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
  data: Record<string, unknown>;
}

/* ------------------------------------------------------------------------ */
/* VISUAL CONTENT STUDIO — DESIGN TEMPLATES                                  */
/* ------------------------------------------------------------------------ */

export type TemplateFormat = 
  | "instagram_post" 
  | "instagram_portrait" 
  | "instagram_story" 
  | "facebook_post" 
  | "tiktok_cover" 
  | "youtube_thumbnail" 
  | "custom";

export type TemplateFamily = 
  | "product_spotlight" 
  | "premium_product" 
  | "sale" 
  | "flash_sale" 
  | "new_arrival" 
  | "best_seller" 
  | "product_recommendation" 
  | "skin_concern" 
  | "educational" 
  | "routine" 
  | "before_after" 
  | "ingredient_focus" 
  | "seasonal_campaign" 
  | "brand_story" 
  | "customer_trust" 
  | "offer_bundle" 
  | "story" 
  | "reel_cover";

export type SlotType = 
  | "text" 
  | "image" 
  | "cta" 
  | "badge" 
  | "logo" 
  | "price" 
  | "discount" 
  | "product_name" 
  | "background" 
  | "shape" 
  | "divider";

export type TextAlign = "left" | "center" | "right" | "justify";
export type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize";
export type FitMode = "cover" | "contain" | "fill" | "scale-down";
export type RTLBehavior = "mirror" | "keep" | "auto";

export interface LayoutLayer {
  id: string;
  type: "layer_group" | "slot";
  slot_key?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  visible: boolean;
  locked: boolean;
  children?: LayoutLayer[];
}

export interface DesignTemplate {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  category: string;
  category_ar?: string;

  format: TemplateFormat;
  width: number;
  height: number;
  aspect_ratio: string;
  safe_zone_pct: number;

  family: TemplateFamily;
  family_ar?: string;

  layout: LayoutLayer[];
  slot_definitions: TemplateSlot[];

  brand_rules: Record<string, unknown>;
  editable_fields: string[];
  locked_fields: string[];

  supported_channels: ChannelKey[];
  supported_objectives: ContentObjective[];
  required_inputs: string[];
  optional_inputs: string[];

  preview_url?: string;
  thumbnail_url?: string;
  tags: string[];
  is_active: boolean;
  is_system: boolean;
  sort_order: number;

  version: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  data: Record<string, unknown>;
}

export interface TemplateSlot {
  id: string;
  template_id: string;
  slot_key: string;
  slot_type: SlotType;

  x: number;
  y: number;
  width: number;
  height: number;

  max_chars?: number;
  min_chars?: number;
  font_size_min?: number;
  font_size_max?: number;
  font_weight?: string;
  text_align?: TextAlign;
  line_height?: number;
  text_transform?: TextTransform;

  aspect_ratio?: string;
  fit_mode?: FitMode;
  allow_background_removal: boolean;

  required: boolean;
  editable: boolean;
  locked_by_brand: boolean;
  validation_rules: Record<string, unknown>;

  default_text_ar?: string;
  default_text_en?: string;
  default_image_url?: string;
  default_color?: string;

  z_index: number;
  rtl_behavior: RTLBehavior;
  safe_zone_pct: number;

  created_at: string;
  updated_at: string;
  data: Record<string, unknown>;
}

/* ------------------------------------------------------------------------ */
/* VISUAL CONTENT STUDIO — GENERATED ASSETS                                  */
/* ------------------------------------------------------------------------ */

export type GeneratedAssetStatus = "draft" | "review" | "approved" | "exported" | "published" | "archived";
export type ValidationStatus = "pending" | "passed" | "failed" | "skipped";

export interface GeneratedAsset {
  id: string;
  content_item_id?: string;
  template_id?: string;
  creative_brief_id?: string;
  generation_job_id?: string;

  title: string;
  title_ar?: string;
  format: TemplateFormat;
  channel: ChannelKey;

  generation_mode: VisualGenerationMode;
  provider?: string;
  model?: string;

  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size?: number;
  width: number;
  height: number;

  has_variants: boolean;
  variant_count: number;

  validation_status: ValidationStatus;
  validation_errors?: unknown[];
  validation_warnings?: unknown[];

  status: GeneratedAssetStatus;
  exported_at?: string;
  exported_by?: string;
  export_format?: "png" | "jpg" | "webp";

  prompt_used?: string;
  generation_params: Record<string, unknown>;
  render_time_ms?: number;
  generation_cost_usd?: number;

  created_by?: string;
  created_at: string;
  updated_at: string;
  data: Record<string, unknown>;
}

export interface AssetVariant {
  id: string;
  asset_id: string;
  format: TemplateFormat;
  channel: ChannelKey;

  width: number;
  height: number;
  aspect_ratio: string;

  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size?: number;

  source_variant_id?: string;
  transform_applied?: Record<string, unknown>;

  created_at: string;
  data: Record<string, unknown>;
}

/* ------------------------------------------------------------------------ */
/* VISUAL CONTENT STUDIO — BRAND ASSETS                                      */
/* ------------------------------------------------------------------------ */

export type BrandAssetType = "logo" | "font" | "color_swatch" | "pattern" | "iconography" | "background" | "illustration";

export interface BrandAsset {
  id: string;
  asset_type: BrandAssetType;
  name: string;
  name_ar?: string;
  description?: string;

  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size?: number;

  dimensions?: { width: number; height: number };
  color_values?: Record<string, string>;
  font_metadata?: Record<string, unknown>;

  is_primary: boolean;
  usage_context: unknown[];
  is_active: boolean;

  version: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  data: Record<string, unknown>;
}

/* ------------------------------------------------------------------------ */
/* VISUAL CONTENT STUDIO — GENERATION JOBS                                   */
/* ------------------------------------------------------------------------ */

export type VisualJobType = 
  | "visual_generation" 
  | "visual_editing" 
  | "variant_generation" 
  | "composite_rendering" 
  | "batch_generation";

export type VisualJobStatus = "pending" | "queued" | "processing" | "completed" | "failed" | "cancelled";

export interface VisualGenerationJob {
  id: string;
  asset_id?: string;
  creative_brief_id?: string;
  template_id?: string;

  job_type: VisualJobType;
  generation_mode: VisualGenerationMode;
  provider?: string;
  model?: string;

  prompt?: string;
  reference_image_url?: string;
  input_params: Record<string, unknown>;

  status: VisualJobStatus;
  progress: number;
  current_step?: string;

  output_asset_id?: string;
  output_variants?: unknown[];
  error_message?: string;
  error_code?: string;

  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  tokens_used?: number;
  generation_cost_usd?: number;
  render_time_ms?: number;

  retry_count: number;
  max_retries: number;
  parent_job_id?: string;

  created_by?: string;
  created_at: string;
  updated_at: string;
  data: Record<string, unknown>;
}

/* ------------------------------------------------------------------------ */
/* VISUAL CONTENT STUDIO — VISUAL GENERATION REQUEST/RESULT                  */
/* ------------------------------------------------------------------------ */

export interface VisualGenerationRequest {
  template_id: string;
  slot_values: Record<string, unknown>;
  product_ids?: string[];
  channel: ChannelKey;
  format: TemplateFormat;
  generation_mode: VisualGenerationMode;
  provider?: string;
  model?: string;
  reference_image_url?: string;
  creative_brief_id?: string;
}

export interface VisualGenerationResult {
  asset_id: string;
  variants: AssetVariant[];
  validation_status: ValidationStatus;
  validation_errors?: unknown[];
  validation_warnings?: unknown[];
  render_time_ms: number;
  generation_cost_usd?: number;
}

/* ------------------------------------------------------------------------ */
/* VISUAL CONTENT STUDIO — SLOT VALUE TYPES                                  */
/* ------------------------------------------------------------------------ */

export interface SlotValue {
  slot_key: string;
  slot_type: SlotType;
  value: unknown;
  validation_errors?: string[];
  validation_warnings?: string[];
}

export interface TemplateRenderInput {
  template: DesignTemplate;
  slot_values: SlotValue[];
  brand_profile: BrandProfile;
  product_data?: Record<string, unknown>[];
  channel: ChannelKey;
  format: TemplateFormat;
  rtl: boolean;
}

/* ------------------------------------------------------------------------ */
/* EXTEND CONTENTOPS SETTINGS WITH VISUAL STUDIO                             */
/* ------------------------------------------------------------------------ */

// These extend the existing ContentOpsSettings in this file
// (Added via declaration merging in the implementation)