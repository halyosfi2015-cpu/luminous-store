import type { ProductSummary } from "@/src/types/product";
import type {
  WeekNumber,
  OfferProduct,
  WeeklyCampaign,
  MonthCampaign,
  EngineConfig,
  EngineStats,
} from "./types";
import {
  getConfig as storageGetConfig,
  saveConfig as storageSaveConfig,
  getStats as storageGetStats,
  saveStats as storageSaveStats,
  getLocalCampaign,
  saveCampaign,
  reset as storageReset,
} from "./offers-storage";

export const CATEGORY_GROUPS = [
  { slug: "skincare", labelAr: "العناية بالبشرة", labelEn: "Skincare", icon: "✨" },
  { slug: "haircare", labelAr: "العناية بالشعر", labelEn: "Haircare", icon: "💇" },
  { slug: "bodycare", labelAr: "العناية بالجسم", labelEn: "Bodycare", icon: "🧴" },
  { slug: "makeup", labelAr: "المكياج", labelEn: "Makeup", icon: "💄" },
  { slug: "perfume", labelAr: "العطور", labelEn: "Perfume", icon: "🌸" },
  { slug: "bakhoor", labelAr: "البخور والأudoku", labelEn: "Bakhoor & Oud", icon: "🪔" },
  { slug: "baby", labelAr: "الأم والطفل", labelEn: "Baby & Mom", icon: "👶" },
  { slug: "supplements", labelAr: "المكملات الغذائية", labelEn: "Supplements", icon: "💊" },
  { slug: "tools", labelAr: "الأجهزة والإكسسوارات", labelEn: "Appliances", icon: "⚙️" },
];

const SECTION_CHILDREN: Record<string, string[]> = {
  skincare: ["cleansers", "toners", "serums", "moisturizers", "sunscreen", "eye-care", "lip-care", "masks", "exfoliators"],
  haircare: ["shampoo", "conditioner", "hair-oils"],
  bodycare: ["body-wash", "body-lotion", "body-oils"],
  makeup: ["face-makeup", "eye-makeup", "lip-makeup"],
  perfume: ["perfume-women", "perfume-men", "perfume-musk", "perfume-gift-sets"],
  bakhoor: ["bakhoor-premium", "bakhoor-oud", "bakhoor-dehn", "bakhoor-burners", "bakhoor-charcoal", "bakhoor-home", "bakhoor-occasions", "bakhoor-brides", "bakhoor-oils", "bakhoor-gift-sets"],
  baby: ["baby-care"],
  supplements: ["vitamins"],
  tools: ["appliances-hair", "appliances-shaving", "appliances-teeth", "tools"],
};

export function getConfig(): EngineConfig {
  return storageGetConfig();
}

export function saveConfig(config: EngineConfig): void {
  storageSaveConfig(config);
}

function getStats(): EngineStats {
  return storageGetStats();
}

function saveStats(stats: EngineStats): void {
  storageSaveStats(stats);
}

export function getCurrentWeek(): WeekNumber {
  const day = new Date().getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

function getWeekDateRange(week: WeekNumber, month: number, year: number): { start: string; end: string } {
  const startDay = (week - 1) * 7 + 1;
  const endDay = week === 4 ? new Date(year, month, 0).getDate() : week * 7;
  const start = new Date(year, month - 1, startDay);
  const end = new Date(year, month - 1, endDay, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function getProductScore(p: ProductSummary): number {
  let score = 0;
  if (p.isBestSeller) score += 30;
  if (p.isNew || p.new) score += 20;
  if (p.isFeatured || p.featured) score += 15;
  score += Math.min((p.reviewCount ?? 0) * 0.5, 20);
  score += Math.min((p.rating ?? 0) * 2, 10);
  if (p.discount && p.discount > 0) score += 5;
  return score;
}

function getDemandLevel(p: ProductSummary): "high" | "low" {
  const score = getProductScore(p);
  return score >= 25 ? "high" : "low";
}

function getProductsByCategory(products: ProductSummary[], categorySlug: string): ProductSummary[] {
  const children = SECTION_CHILDREN[categorySlug];
  if (children) {
    return products.filter((p) => children.includes(p.categorySlug ?? ""));
  }
  return products.filter((p) => p.categorySlug === categorySlug);
}

function selectFromCategory(
  products: ProductSummary[],
  categorySlug: string,
  count: number,
  excludeIds: Set<string>,
  config: EngineConfig
): OfferProduct[] {
  const candidates = getProductsByCategory(products, categorySlug)
    .filter((p) => !excludeIds.has(p.id) && !config.excludedProductIds.includes(p.id))
    .sort((a, b) => getProductScore(b) - getProductScore(a));

  return candidates.slice(0, count).map((p) => ({
    productId: p.id,
    discount: calculateDiscount(p, config),
    reason: determineReason(p),
  }));
}

function calculateDiscount(product: ProductSummary, config: EngineConfig): number {
  const demand = getDemandLevel(product);
  let base = demand === "high" ? config.highDemandDiscount : config.lowDemandDiscount;

  if (product.isNew || product.new) base = Math.max(base - 5, config.minDiscount);
  if (config.seasonalOverrides.length > 0) {
    const currentMonth = new Date().getMonth() + 1;
    const seasonal = config.seasonalOverrides.find((s) => s.month === currentMonth && s.categorySlugs.includes(product.categorySlug ?? ""));
    if (seasonal) base = Math.max(base, seasonal.boostDiscount);
  }

  return Math.min(Math.max(base, config.minDiscount), config.maxDiscount);
}

function determineReason(product: ProductSummary): OfferProduct["reason"] {
  if (product.isNew || product.new) return "new";
  if (product.isBestSeller) return "best_seller";
  const score = getProductScore(product);
  if (score >= 25) return "high_demand";
  if (score < 10) return "boost_sales";
  return "low_demand";
}

function generateWeekCampaign(
  products: ProductSummary[],
  week: WeekNumber,
  month: number,
  year: number,
  config: EngineConfig,
  previousWeekProductIds: Set<string>,
  isEndOfMonth: boolean
): WeeklyCampaign {
  const { start, end } = getWeekDateRange(week, month, year);
  const selected: OfferProduct[] = [];
  const usedIds = new Set<string>(previousWeekProductIds);
  let remaining = config.productsPerWeek;

  // First: Add pinned products (always included)
  for (const pinnedId of config.pinnedProductIds) {
    if (remaining <= 0) break;
    const product = products.find((p) => p.id === pinnedId);
    if (product && !usedIds.has(pinnedId) && !config.excludedProductIds.includes(pinnedId)) {
      selected.push({ productId: pinnedId, discount: calculateDiscount(product, config), reason: "admin_pinned" });
      usedIds.add(pinnedId);
      remaining--;
    }
  }

  if (isEndOfMonth) {
    const topSellers = products
      .filter((p) => p.isBestSeller && !usedIds.has(p.id) && !config.excludedProductIds.includes(p.id))
      .sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
      .slice(0, 4);

    for (const p of topSellers) {
      if (remaining <= 0) break;
      selected.push({ productId: p.id, discount: calculateDiscount(p, config), reason: "month_top" });
      usedIds.add(p.id);
      remaining--;
    }
  }

  // GUARANTEED: Pick at least 1 product from EACH category first
  for (const group of CATEGORY_GROUPS) {
    if (remaining <= 0) break;
    const picks = selectFromCategory(products, group.slug, 1, usedIds, config);
    for (const pick of picks) {
      usedIds.add(pick.productId);
      selected.push(pick);
      remaining--;
    }
  }

  // Then: Fill remaining slots proportionally across categories
  const productsPerCategory = Math.ceil(config.productsPerWeek / CATEGORY_GROUPS.length);
  for (const group of CATEGORY_GROUPS) {
    if (remaining <= 0) break;
    const count = Math.min(productsPerCategory - 1, remaining); // -1 because we already picked 1
    if (count <= 0) continue;
    const picks = selectFromCategory(products, group.slug, count, usedIds, config);
    for (const pick of picks) {
      usedIds.add(pick.productId);
      selected.push(pick);
      remaining--;
    }
  }

  // Finally: Fill any remaining slots with best overall products
  if (remaining > 0) {
    const extra = products
      .filter((p) => !usedIds.has(p.id) && !config.excludedProductIds.includes(p.id))
      .sort((a, b) => getProductScore(b) - getProductScore(a))
      .slice(0, remaining);

    for (const p of extra) {
      selected.push({ productId: p.id, discount: calculateDiscount(p, config), reason: determineReason(p) });
      usedIds.add(p.id);
    }
  }

  return {
    id: `wc-${year}-${month}-${week}`,
    month,
    year,
    week,
    products: selected,
    startDate: start,
    endDate: end,
    isActive: week === getCurrentWeek() && month === new Date().getMonth() + 1 && year === new Date().getFullYear(),
  };
}

export function generateMonthCampaign(products: ProductSummary[], month: number, year: number): MonthCampaign {
  const config = getConfig();
  const existing = getStoredMonthCampaign(month, year);
  if (existing) return existing;

  const weeks: WeeklyCampaign[] = [];
  const allUsedIds = new Set<string>();

  for (let w = 1; w <= 4; w++) {
    const now = new Date();
    const isEndOfMonth = now.getDate() >= new Date(year, month, 0).getDate() - 1 || now.getDate() <= 2;
    const campaign = generateWeekCampaign(products, w as WeekNumber, month, year, config, allUsedIds, isEndOfMonth);
    weeks.push(campaign);
    for (const p of campaign.products) allUsedIds.add(p.productId);
  }

  const topSellers = products
    .filter((p) => p.isBestSeller)
    .sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
    .slice(0, 6)
    .map((p) => p.id);

  const monthCampaign: MonthCampaign = { id: `mc-${year}-${month}`, month, year, weeks, topSellersProductIds: topSellers };

  storeMonthCampaign(monthCampaign);
  updateStats(products, monthCampaign);
  return monthCampaign;
}

function getStoredMonthCampaign(month: number, year: number): MonthCampaign | null {
  return getLocalCampaign(year, month);
}

function storeMonthCampaign(campaign: MonthCampaign): void {
  // Persist locally synchronously (fast path + fallback) and fire the
  // Supabase write-through via the storage adapter (authenticated API).
  void saveCampaign(campaign.year, campaign.month, campaign).catch(() => {
    // API unavailable — local fallback already written by the adapter
  });
}

function updateStats(products: ProductSummary[], campaign: MonthCampaign): void {
  const stats = getStats();
  const allProductIds = new Set<string>();
  const catCoverage: Record<string, number> = {};

  for (const week of campaign.weeks) {
    for (const op of week.products) {
      allProductIds.add(op.productId);
      const product = products.find((p) => p.id === op.productId);
      if (product) {
        const cat = product.categorySlug ?? "unknown";
        catCoverage[cat] = (catCoverage[cat] || 0) + 1;
      }
    }
  }

  stats.totalOffersGenerated += campaign.weeks.reduce((sum, w) => sum + w.products.length, 0);
  stats.uniqueProductsOffered = allProductIds.size;
  stats.categoryCoverage = { ...stats.categoryCoverage, ...catCoverage };
  stats.lastGeneratedWeek = `${campaign.year}-${campaign.month}`;
  saveStats(stats);
}

export function isWeeklyCampaignActive(
  campaign: WeeklyCampaign | null,
  now: Date = new Date(),
): boolean {
  if (!campaign) return false;

  const config = getConfig();
  if (!config.enabled) return false;
  if (campaign.isActive === false) return false;

  if (campaign.startDate) {
    const start = new Date(campaign.startDate).getTime();
    if (Number.isFinite(start) && now.getTime() < start) return false;
  }
  if (campaign.endDate) {
    const end = new Date(campaign.endDate).getTime();
    if (Number.isFinite(end) && now.getTime() > end) return false;
  }

  return true;
}

export function getCurrentWeekOffers(products: ProductSummary[]): {
  offers: OfferProduct[];
  campaign: WeeklyCampaign | null;
  countdown: { days: number; hours: number; minutes: number; seconds: number };
  monthCampaign: MonthCampaign | null;
} {
  if (typeof window === "undefined") {
    return { offers: [], campaign: null, countdown: { days: 0, hours: 0, minutes: 0, seconds: 0 }, monthCampaign: null };
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const week = getCurrentWeek();

  const config = getConfig();
  let campaign = getStoredMonthCampaign(month, year);
  if (config.enabled && !campaign) {
    campaign = generateMonthCampaign(products, month, year);
  }

  const weekCampaign = campaign?.weeks.find((w) => w.week === week) ?? null;
  const active = isWeeklyCampaignActive(weekCampaign, now);
  const offers = active && weekCampaign ? weekCampaign.products : [];
  const activeCampaign = active ? weekCampaign : null;

  const endOfWeek = new Date(now);
  const daysToEnd = week === 4 ? new Date(year, month, 0).getDate() - now.getDate() : week * 7 - now.getDate();
  endOfWeek.setDate(now.getDate() + daysToEnd);
  endOfWeek.setHours(23, 59, 59, 999);

  const diff = Math.max(0, endOfWeek.getTime() - now.getTime());
  const countdown = {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };

  return { offers, campaign: activeCampaign, countdown, monthCampaign: campaign };
}

export function getWeekLabel(week: WeekNumber, isAr: boolean): string {
  const labels = {
    1: isAr ? "الأسبوع الأول" : "Week 1",
    2: isAr ? "الأسبوع الثاني" : "Week 2",
    3: isAr ? "الأسبوع الثالث" : "Week 3",
    4: isAr ? "الأسبوع الرابع" : "Week 4",
  };
  return labels[week];
}

export function resetEngine(): void {
  // Adapter clears local engine keys synchronously + fires Supabase DELETE.
  void storageReset().catch(() => {
    // Supabase unavailable — local engine keys already cleared
  });
}

export function forceRegenerate(products: ProductSummary[]): MonthCampaign {
  resetEngine();
  const now = new Date();
  return generateMonthCampaign(products, now.getMonth() + 1, now.getFullYear());
}

export function getEngineStats(): EngineStats {
  return getStats();
}

