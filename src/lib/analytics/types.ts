export const ANALYTICS_EVENT_TYPES = {
  PAGE_VIEW: 'page_view',
  PRODUCT_VIEW: 'product_view',
  CATEGORY_VIEW: 'category_view',
  SEARCH: 'search',
  FILTER_APPLIED: 'filter_applied',
  PRODUCT_IMAGE_VIEW: 'product_image_view',
  PRODUCT_ADDED_TO_WISHLIST: 'product_added_to_wishlist',
  PRODUCT_REMOVED_FROM_WISHLIST: 'product_removed_from_wishlist',
  PRODUCT_ADDED_TO_CART: 'product_added_to_cart',
  PRODUCT_REMOVED_FROM_CART: 'product_removed_from_cart',
  CART_VIEW: 'cart_view',
  CART_UPDATED: 'cart_updated',
  CART_ABANDONED: 'cart_abandoned',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_STEP_VIEW: 'checkout_step_view',
  CHECKOUT_COMPLETED: 'checkout_completed',
  CHECKOUT_FAILED: 'checkout_failed',
  PURCHASE_COMPLETED: 'purchase_completed',
  ROUTINE_VIEW: 'routine_view',
  ROUTINE_PRODUCT_CLICK: 'routine_product_click',
  BUNDLE_VIEW: 'bundle_view',
  BUNDLE_PRODUCT_CLICK: 'bundle_product_click',
  EXPERT_VIEW: 'expert_view',
  RECOMMENDATION_IMPRESSION: 'recommendation_impression',
  RECOMMENDATION_CLICK: 'recommendation_click',
} as const;

export type AnalyticsEventType =
  (typeof ANALYTICS_EVENT_TYPES)[keyof typeof ANALYTICS_EVENT_TYPES];

export const NAVIGATION_EVENTS: AnalyticsEventType[] = [
  ANALYTICS_EVENT_TYPES.PAGE_VIEW,
  ANALYTICS_EVENT_TYPES.PRODUCT_VIEW,
  ANALYTICS_EVENT_TYPES.CATEGORY_VIEW,
  ANALYTICS_EVENT_TYPES.SEARCH,
  ANALYTICS_EVENT_TYPES.FILTER_APPLIED,
];

export const COMMERCE_EVENTS: AnalyticsEventType[] = [
  ANALYTICS_EVENT_TYPES.PURCHASE_COMPLETED,
  ANALYTICS_EVENT_TYPES.CHECKOUT_COMPLETED,
];

export const FUNNEL_STAGES = [
  { key: 'visitors', label: 'Visitors', labelAr: 'الزوار' },
  { key: 'product_views', label: 'Product Views', labelAr: 'مشاهدات المنتجات' },
  { key: 'add_to_cart', label: 'Add to Cart', labelAr: 'إضافة للسلة' },
  { key: 'checkout_started', label: 'Checkout Started', labelAr: 'بدء الدفع' },
  { key: 'purchases', label: 'Purchases', labelAr: 'الشراء' },
] as const;

export type FunnelStageKey = (typeof FUNNEL_STAGES)[number]['key'];

export const SEGMENT_KEYS = [
  'new_customer',
  'returning_customer',
  'cart_abandoner',
  'category_interest',
  'high_intent',
  'high_value',
  'at_risk',
  'inactive',
] as const;

export type SegmentKey = (typeof SEGMENT_KEYS)[number];

export const LIFECYCLE_STATES = [
  'new',
  'active',
  'returning',
  'high_value',
  'at_risk',
  'inactive',
] as const;

export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

export const INTENT_LEVELS = [
  'low',
  'medium',
  'high',
  'very_high',
] as const;

export type IntentLevel = (typeof INTENT_LEVELS)[number];

export type AnalyticsEventInput = {
  event_type: AnalyticsEventType;
  event_name?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  properties?: Record<string, unknown> | null;
  source?: 'web' | 'mobile' | 'admin' | 'api' | 'system' | null;
  occurred_at?: string | null;
  customer_id?: string | null;
  session_id?: string | null;
};

export type AnalyticsRange = 'today' | '7d' | '30d' | '90d';

export const RANGE_DAYS: Record<AnalyticsRange, number> = {
  today: 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export const INTENT_RULES_VERSION = 'phase_6_2_v1';
