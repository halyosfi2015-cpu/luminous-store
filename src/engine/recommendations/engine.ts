import type { ProductSummary } from "@/src/types/product";
import type {
  ScoredProduct,
  RecommendationReason,
  UserSignal,
  RecommendationConfig,
} from "./types";

const SIGNAL_KEY = "luminous-user-signals";
const CONFIG_KEY = "luminous-rec-config";

export const REASON_BADGES: Record<RecommendationReason, { ar: string; en: string }> = {
  category_match: { ar: "لأنك شاهدت منتجات {cat}", en: "Based on your {cat} browsing" },
  brand_match: { ar: "من نفس الماركة التي تفضلها", en: "From your favorite brand" },
  cart_complement: { ar: "يكمل منتجات السلة", en: "Completes your cart" },
  wishlist_match: { ar: "مشابه لما أضفته للمفضلة", en: "Similar to your wishlist" },
  trending: { ar: "الأكثر رواجًا هذا الأسبوع", en: "Trending this week" },
  new_arrival: { ar: "وصل حديثاً", en: "Just arrived" },
  best_seller: { ar: "الأكثر مبيعًا في هذا القسم", en: "Best seller in this category" },
  similar: { ar: "يتناسب مع ذوقك", en: "Matches your taste" },
};

const DEFAULT_CONFIG: RecommendationConfig = {
  weights: {
    category_match: 50,
    brand_match: 25,
    cart_complement: 40,
    wishlist_match: 20,
    trending: 15,
    new_arrival: 10,
    best_seller: 30,
    similar: 15,
  },
  trendingPeriodDays: 7,
  minScore: 15,
  maxResults: 12,
  enabledSources: {
    category_match: true,
    brand_match: true,
    cart_complement: true,
    wishlist_match: true,
    trending: true,
    new_arrival: true,
    best_seller: true,
    similar: true,
  },
};

function getConfig(): RecommendationConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function getUserSignals(): UserSignal {
  if (typeof window === "undefined") {
    return { visitedProductIds: [], visitedCategorySlugs: [], visitedBrandNames: [], cartProductIds: [], wishlistProductIds: [], lastVisit: "" };
  }
  try {
    const raw = localStorage.getItem(SIGNAL_KEY);
    if (!raw) return { visitedProductIds: [], visitedCategorySlugs: [], visitedBrandNames: [], cartProductIds: [], wishlistProductIds: [], lastVisit: "" };
    return JSON.parse(raw);
  } catch {
    return { visitedProductIds: [], visitedCategorySlugs: [], visitedBrandNames: [], cartProductIds: [], wishlistProductIds: [], lastVisit: "" };
  }
}

export function saveUserSignals(signals: UserSignal): void {
  if (typeof window === "undefined") return;
  signals.lastVisit = new Date().toISOString();
  localStorage.setItem(SIGNAL_KEY, JSON.stringify(signals));
}

export function trackProductView(productId: string): void {
  const signals = getUserSignals();
  signals.visitedProductIds = [productId, ...signals.visitedProductIds.filter((id) => id !== productId)].slice(0, 50);
  saveUserSignals(signals);
}

export function trackCategoryVisit(categorySlug: string): void {
  const signals = getUserSignals();
  if (!signals.visitedCategorySlugs.includes(categorySlug)) {
    signals.visitedCategorySlugs = [categorySlug, ...signals.visitedCategorySlugs].slice(0, 20);
  }
  saveUserSignals(signals);
}

export function trackBrandVisit(brand: string): void {
  const signals = getUserSignals();
  if (!signals.visitedBrandNames.includes(brand)) {
    signals.visitedBrandNames = [brand, ...signals.visitedBrandNames].slice(0, 20);
  }
  saveUserSignals(signals);
}

export function updateCartSignals(cartProductIds: string[]): void {
  const signals = getUserSignals();
  signals.cartProductIds = cartProductIds;
  saveUserSignals(signals);
}

export function updateWishlistSignals(wishlistProductIds: string[]): void {
  const signals = getUserSignals();
  signals.wishlistProductIds = wishlistProductIds;
  saveUserSignals(signals);
}

function scoreProduct(
  product: ProductSummary,
  signals: UserSignal,
  config: RecommendationConfig,
  allProducts: ProductSummary[]
): ScoredProduct | null {
  let bestScore = 0;
  let bestReason: RecommendationReason = "similar";
  let bestReasonAr = "";
  let bestReasonEn = "";

  const excludedIds = new Set([...signals.visitedProductIds, ...signals.cartProductIds]);

  if (excludedIds.has(product.id)) return null;

  if (config.enabledSources.category_match && signals.visitedCategorySlugs.length > 0) {
    const score = config.weights.category_match * Math.min(signals.visitedCategorySlugs.filter((s) => s === product.categorySlug).length / Math.max(signals.visitedCategorySlugs.length, 1) + 0.3, 1);
    if (score > bestScore) {
      bestScore = score;
      bestReason = "category_match";
      bestReasonAr = REASON_BADGES.category_match.ar.replace("{cat}", product.categoryAr || product.categorySlug || "");
      bestReasonEn = REASON_BADGES.category_match.en.replace("{cat}", product.category);
    }
  }

  if (config.enabledSources.brand_match && signals.visitedBrandNames.includes(product.brand)) {
    const score = config.weights.brand_match;
    if (score > bestScore) {
      bestScore = score;
      bestReason = "brand_match";
      bestReasonAr = REASON_BADGES.brand_match.ar;
      bestReasonEn = REASON_BADGES.brand_match.en;
    }
  }

  if (config.enabledSources.cart_complement && signals.cartProductIds.length > 0) {
    const cartProducts = allProducts.filter((p) => signals.cartProductIds.includes(p.id));
    const sameCategory = cartProducts.some((cp) => cp.categorySlug === product.categorySlug);
    if (sameCategory) {
      const score = config.weights.cart_complement;
      if (score > bestScore) {
        bestScore = score;
        bestReason = "cart_complement";
        bestReasonAr = REASON_BADGES.cart_complement.ar;
        bestReasonEn = REASON_BADGES.cart_complement.en;
      }
    }
  }

  if (config.enabledSources.wishlist_match && signals.wishlistProductIds.length > 0) {
    const wlProducts = allProducts.filter((p) => signals.wishlistProductIds.includes(p.id));
    const sameCatOrBrand = wlProducts.some((wp) => wp.categorySlug === product.categorySlug || wp.brand === product.brand);
    if (sameCatOrBrand) {
      const score = config.weights.wishlist_match;
      if (score > bestScore) {
        bestScore = score;
        bestReason = "wishlist_match";
        bestReasonAr = REASON_BADGES.wishlist_match.ar;
        bestReasonEn = REASON_BADGES.wishlist_match.en;
      }
    }
  }

  if (config.enabledSources.trending && product.isBestSeller) {
    const score = config.weights.trending + (product.rating >= 4.5 ? 5 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestReason = "trending";
      bestReasonAr = REASON_BADGES.trending.ar;
      bestReasonEn = REASON_BADGES.trending.en;
    }
  }

  if (config.enabledSources.new_arrival && (product.isNew || product.new)) {
    const score = config.weights.new_arrival;
    if (score > bestScore) {
      bestScore = score;
      bestReason = "new_arrival";
      bestReasonAr = REASON_BADGES.new_arrival.ar;
      bestReasonEn = REASON_BADGES.new_arrival.en;
    }
  }

  if (config.enabledSources.best_seller && product.isBestSeller) {
    const score = config.weights.best_seller + (product.reviewCount ?? 0) * 0.01;
    if (score > bestScore) {
      bestScore = score;
      bestReason = "best_seller";
      bestReasonAr = REASON_BADGES.best_seller.ar;
      bestReasonEn = REASON_BADGES.best_seller.en;
    }
  }

  if (bestScore < config.minScore) return null;

  return {
    product,
    score: bestScore,
    reason: bestReason,
    reasonAr: bestReasonAr || REASON_BADGES.similar.ar,
    reasonEn: bestReasonEn || REASON_BADGES.similar.en,
    badge: bestReasonAr || REASON_BADGES.similar.ar,
    badgeEn: bestReasonEn || REASON_BADGES.similar.en,
  };
}

export function getRecommendations(allProducts: ProductSummary[]): ScoredProduct[] {
  const signals = getUserSignals();
  const config = getConfig();
  const hasHistory = signals.visitedProductIds.length > 0 || signals.cartProductIds.length > 0 || signals.wishlistProductIds.length > 0;

  if (!hasHistory) {
    return allProducts
      .filter((p) => p.isBestSeller)
      .sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
      .slice(0, config.maxResults)
      .map((p) => ({
        product: p,
        score: 100,
        reason: "trending" as RecommendationReason,
        reasonAr: REASON_BADGES.trending.ar,
        reasonEn: REASON_BADGES.trending.en,
        badge: REASON_BADGES.trending.ar,
        badgeEn: REASON_BADGES.trending.en,
      }));
  }

  const scored: ScoredProduct[] = [];
  for (const product of allProducts) {
    const result = scoreProduct(product, signals, config, allProducts);
    if (result) scored.push(result);
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, config.maxResults);
}

const FEATURED_KEY = "luminous-featured-pick";
const FEATURED_ROTATE_MS = 5 * 60 * 1000;

export function getFeaturedPick(allProducts: ProductSummary[]): ScoredProduct | null {
  const pool = allProducts.filter((p) => p.isBestSeller && p.gallery && p.gallery.length > 0);
  const fallback = pool.length > 0 ? pool : allProducts.filter((p) => p.gallery && p.gallery.length > 0);
  if (fallback.length === 0) return null;

  let stored: { productId: string; expiresAt: number } | null = null;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(FEATURED_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch {}
  }

  let pick = fallback.find((p) => p.id === stored?.productId) ?? null;
  if (!pick || (stored && Date.now() > stored.expiresAt)) {
    pick = fallback[Math.floor(Math.random() * fallback.length)];
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          FEATURED_KEY,
          JSON.stringify({ productId: pick.id, expiresAt: Date.now() + FEATURED_ROTATE_MS })
        );
      } catch {}
    }
  }

  return {
    product: pick,
    score: 100,
    reason: "trending" as RecommendationReason,
    reasonAr: REASON_BADGES.trending.ar,
    reasonEn: REASON_BADGES.trending.en,
    badge: REASON_BADGES.trending.ar,
    badgeEn: REASON_BADGES.trending.en,
  };
}

