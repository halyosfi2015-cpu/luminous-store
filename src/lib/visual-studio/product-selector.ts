import type { Product } from "@/src/types/product";
import type { CreativeMode } from "./creative-director";

export interface ProductDemandSignals {
  /** Optional real performance/imported demand signals; absent signals never become fake demand. */
  searchDemand?: number;
  orders?: number;
  saves?: number;
  clicks?: number;
}

export interface ProductSelectionContext {
  mode: CreativeMode;
  requiredCount: number;
  recentProductIds?: string[];
  demandByProductId?: Record<string, ProductDemandSignals>;
  preferredCategorySlugs?: string[];
}

export interface SelectedProduct {
  product: Product;
  /** Presentation-only name; canonical catalog name remains unchanged. */
  displayNameAr: string;
  score: number;
  reasonsAr: string[];
}

function demandScore(signals: ProductDemandSignals | undefined): number {
  if (!signals) return 0;
  return Math.min(35,
    (signals.searchDemand ?? 0) * 0.15 +
    (signals.orders ?? 0) * 0.25 +
    (signals.saves ?? 0) * 0.15 +
    (signals.clicks ?? 0) * 0.1,
  );
}

function nameScore(product: Product): number {
  const verified = product.source?.verified ? 4 : 0;
  const inStock = product.inStock === false || product.stock <= 0 ? -30 : 8;
  const hasImage = product.gallery?.length || product.heroImage ? 8 : -30;
  return verified + inStock + hasImage;
}

/** Shortens only the display label; never mutates the canonical product record. */
export function preferredDisplayName(product: Product): string {
  const official = product.name.ar.trim();
  if (official.length <= 42) return official;
  const withoutSize = official.replace(/\s*[-|،,].*$/, "").trim();
  if (withoutSize.length >= 12 && withoutSize.length <= 42) return withoutSize;
  const words = official.split(/\s+/).slice(0, 7).join(" ");
  return words.length >= 10 ? words : official;
}

function fitScore(product: Product, mode: CreativeMode, preferred: string[]): number {
  const tags = new Set((product.tags ?? []).map((t) => t.toLowerCase()));
  const category = (product.categorySlug ?? product.category).toLowerCase();
  let score = 0;
  if (preferred.some((c) => category.includes(c.toLowerCase()))) score += 16;
  if (mode === "comparison") score += product.benefits.ar.length >= 2 ? 8 : -10;
  if (mode === "education-carousel") score += product.ingredients.ar.length > 0 ? 8 : 0;
  if (mode === "routine-builder") score += product.howToUseAr?.length ? 8 : 0;
  if (mode === "offer") score += product.hasRealDiscount || (product.discount ?? 0) > 0 ? 18 : -20;
  if (mode === "discovery") score += tags.size > 0 ? 3 : 0;
  return score;
}

export function selectProducts(products: Product[], context: ProductSelectionContext): SelectedProduct[] {
  const recent = new Set(context.recentProductIds ?? []);
  const preferred = context.preferredCategorySlugs ?? [];
  const ranked = products
    .filter((p) => p.status !== "archived" && p.status !== "retired" && p.status !== "hidden")
    .map((product) => {
      const reasonsAr: string[] = [];
      let score = nameScore(product) + fitScore(product, context.mode, preferred);
      const demand = demandScore(context.demandByProductId?.[product.id]);
      if (demand > 0) { score += demand; reasonsAr.push("طلب حقيقي متاح من التحليلات"); }
      if (recent.has(product.id)) { score -= 24; reasonsAr.push("تم استخدامه مؤخراً — خُفّضت الأولوية"); }
      if (product.isBestSeller) { score += 7; reasonsAr.push("مصنف كالأكثر طلباً في الكتالوج"); }
      if (product.isNew) { score += 5; reasonsAr.push("منتج جديد فعلياً"); }
      if (product.source?.verified) reasonsAr.push("بيانات المصدر موثقة");
      if (product.gallery?.length || product.heroImage) reasonsAr.push("صورة حقيقية متاحة");
      return { product, displayNameAr: preferredDisplayName(product), score, reasonsAr };
    })
    .sort((a, b) => b.score - a.score);

  const chosen: SelectedProduct[] = [];
  const usedCategories = new Set<string>();
  for (const item of ranked) {
    if (chosen.length >= context.requiredCount) break;
    const category = item.product.categorySlug ?? item.product.category;
    if (context.mode === "comparison" && chosen.length > 0) {
      // A comparison must be meaningful: same family or a documented shared concern.
      const first = chosen[0].product;
      const sameFamily = (first.categorySlug ?? first.category) === category;
      const sharedConcern = (first.skinConcerns ?? []).some((c) => (item.product.skinConcerns ?? []).includes(c));
      if (!sameFamily && !sharedConcern) continue;
    }
    if (context.mode !== "comparison" && usedCategories.has(category) && context.requiredCount > 1) continue;
    chosen.push(item);
    usedCategories.add(category);
  }
  return chosen;
}
