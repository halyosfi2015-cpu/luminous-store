/**
 * PART 2 / P1 — Verified facts manifest.
 * Pure module: builders take raw source data (as returned by the existing
 * /api/content/* endpoints) and return ONLY verified facts + a missing[] list.
 * The copy engine may use facts; anything in missing[] is forbidden to invent.
 */
import type { VisualSourceType } from "./templates";

export interface VerifiedProductFacts {
  kind: "product";
  id: string;
  nameAr: string;
  nameEn: string;
  brandAr: string;
  brandEn: string;
  price: number | null;
  originalPrice: number | null;
  currency: string;
  image: string | null;
  categoryAr: string;
  categorySlug: string;
  benefits: string[];
  ingredients: string[];
  usageAr: string | null;
  rating: number | null;
  reviewCount: number;
  isNew: boolean;
  isBestSeller: boolean;
  discount: number | null;
  stock: number | null;
}

export interface VerifiedRoutineFacts {
  kind: "routine";
  id: string;
  nameAr: string;
  steps: { titleAr: string; productId: string }[];
  products: VerifiedProductFacts[];
  savingsPercent: number | null;
  image: string | null;
}

export interface VerifiedBundleFacts {
  kind: "bundle";
  id: string;
  nameAr: string;
  productIds: string[];
  products: VerifiedProductFacts[];
  bundlePrice: number | null;
  originalPrice: number | null;
  savingsPercent: number | null;
  image: string | null;
}

export interface VerifiedOfferFacts {
  kind: "offer";
  id: string;
  titleAr: string;
  productIds: string[];
  products: VerifiedProductFacts[];
  discount: number | null;
  startsAt: string | null;
  endsAt: string | null;
}

export type VerifiedFacts =
  | VerifiedProductFacts
  | VerifiedRoutineFacts
  | VerifiedBundleFacts
  | VerifiedOfferFacts;

export interface FactsManifest {
  sourceType: VisualSourceType;
  facts: VerifiedFacts;
  /** Fields the copy engine MUST NOT invent. */
  missing: string[];
  /** Category intent for context-aware copy (hydration/hair/...). */
  intent: string;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim().length > 0) : [];

function nameOf(v: unknown): { ar: string; en: string } {
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return { ar: str(o.ar) || str(o.en), en: str(o.en) || str(o.ar) };
  }
  return { ar: str(v), en: str(v) };
}

function firstImage(p: Record<string, unknown>): string | null {
  const gallery = Array.isArray(p.gallery) ? p.gallery : [];
  const images = Array.isArray(p.images) ? p.images : [];
  for (const c of [...gallery, ...images, p.heroImage, p.image]) {
    if (typeof c === "string" && c.length > 4) return c;
  }
  return null;
}

/** Category → copy intent. Never invents: falls back to "care". */
export function intentForCategory(categorySlug: string, categoryAr: string): string {
  const s = `${categorySlug} ${categoryAr}`;
  if (/hair|شعر/.test(s)) return "hair";
  if (/sunscreen|sun|حماية|واقي|شمس/.test(s)) return "protection";
  if (/perfume|fragrance|عطر|بخور|عود/.test(s)) return "fragrance";
  if (/makeup|مكياج|روج|أحمر/.test(s)) return "makeup";
  if (/serum|سيروم|مصل/.test(s)) return "treatment";
  if (/cleanser|غسول|تنظيف/.test(s)) return "cleansing";
  if (/moistur|مرطب|ترطيب|cream|كريم/.test(s)) return "hydration";
  if (/routine|روتين/.test(s)) return "routine";
  if (/offer|عرض|خصم|bundle|باقة|مجموعة/.test(s)) return "offer";
  return "care";
}

export function buildProductFacts(raw: Record<string, unknown>): FactsManifest {
  const name = nameOf(raw.name);
  const pricing = (raw.pricing ?? {}) as Record<string, unknown>;
  const price = num(pricing.price ?? raw.price);
  const originalPrice = num(pricing.originalPrice ?? raw.originalPrice);
  const benefits = arr((raw.benefits as Record<string, unknown> | undefined)?.ar ?? raw.benefitsAr ?? raw.benefits);
  const ingredients = arr((raw.ingredients as Record<string, unknown> | undefined)?.ar ?? raw.ingredientsAr);
  const usage = (raw.usage_instructions ?? raw.usageInstructions ?? {}) as Record<string, unknown>;
  const usageAr = str((usage as Record<string, unknown>).ar ?? raw.usageAr) || null;
  const reviewCount = Number(raw.review_count ?? raw.reviewCount ?? 0) || 0;
  const rating = reviewCount > 0 ? num(raw.rating) : null;
  const discount = num(raw.discount);
  const stock = raw.stock_quantity ?? raw.stock;
  const stockNum = typeof stock === "number" ? stock : null;

  const missing: string[] = [];
  if (!price) missing.push("price");
  if (benefits.length === 0) missing.push("benefits");
  if (ingredients.length === 0) missing.push("ingredients");
  if (!usageAr) missing.push("usage");
  if (!rating) missing.push("rating");
  if (!firstImage(raw)) missing.push("image");

  const category = nameOf(raw.categoryAr ?? raw.categoryName ?? raw.category);
  const categorySlug = str(raw.categorySlug ?? raw.category_slug ?? "");

  return {
    sourceType: "product",
    intent: intentForCategory(categorySlug, category.ar || nameOf(raw.category).ar),
    facts: {
      kind: "product",
      id: str(raw.legacy_id ?? raw.legacyId ?? raw.id ?? raw.slug),
      nameAr: name.ar || "منتج لومينوس",
      nameEn: name.en || name.ar,
      brandAr: str(raw.brandAr ?? raw.brand_ar) || str(raw.brand),
      brandEn: str(raw.brand),
      price, originalPrice,
      currency: str(pricing.currency) || "YER",
      image: firstImage(raw),
      categoryAr: category.ar,
      categorySlug,
      benefits: benefits.slice(0, 4),
      ingredients: ingredients.slice(0, 6),
      usageAr,
      rating, reviewCount,
      isNew: Boolean(raw.is_new ?? raw.isNew ?? raw.new),
      isBestSeller: Boolean(raw.is_best_seller ?? raw.isBestSeller),
      discount,
      stock: stockNum,
    },
    missing,
  };
}

export function buildRoutineFacts(
  raw: Record<string, unknown>,
  resolveProduct: (id: string) => Record<string, unknown> | null,
): FactsManifest {
  const steps = Array.isArray(raw.steps) ? raw.steps : [];
  const products: VerifiedProductFacts[] = [];
  const stepInfos = steps.map((s: unknown) => {
    const step = (s ?? {}) as Record<string, unknown>;
    const pid = str(step.productId ?? step.product_id);
    const prod = pid ? resolveProduct(pid) : null;
    if (prod) products.push(buildProductFacts(prod).facts as VerifiedProductFacts);
    return { titleAr: str(step.titleAr ?? step.title_ar), productId: pid };
  });
  const missing: string[] = [];
  if (stepInfos.length === 0) missing.push("steps");
  if (products.length === 0) missing.push("products");
  const name = nameOf(raw.name ?? raw.nameAr);
  return {
    sourceType: "routine",
    intent: "routine",
    facts: {
      kind: "routine",
      id: str(raw.id ?? raw.slug),
      nameAr: name.ar || "روتين العناية",
      steps: stepInfos,
      products,
      savingsPercent: num(raw.savingsPercent ?? raw.savings_percent),
      image: firstImage(raw) ?? products[0]?.image ?? null,
    },
    missing,
  };
}

export function buildBundleFacts(
  raw: Record<string, unknown>,
  resolveProduct: (id: string) => Record<string, unknown> | null,
): FactsManifest {
  const ids = arr(raw.productIds ?? raw.product_ids);
  const products = ids
    .map((id) => resolveProduct(id))
    .filter((p): p is Record<string, unknown> => !!p)
    .map((p) => buildProductFacts(p).facts as VerifiedProductFacts);
  const missing: string[] = [];
  if (products.length === 0) missing.push("products");
  if (!(Number(raw.bundlePrice ?? raw.bundle_price) > 0)) missing.push("bundlePrice");
  const name = nameOf(raw.name ?? raw.nameAr);
  return {
    sourceType: "bundle",
    intent: "offer",
    facts: {
      kind: "bundle",
      id: str(raw.id ?? raw.slug),
      nameAr: name.ar || "باقة لومينوس",
      productIds: ids,
      products,
      bundlePrice: num(raw.bundlePrice ?? raw.bundle_price),
      originalPrice: num(raw.originalPrice ?? raw.original_price),
      savingsPercent: num(raw.savingsPercent ?? raw.savings_percent),
      image: firstImage(raw) ?? products[0]?.image ?? null,
    },
    missing,
  };
}

export function buildOfferFacts(
  raw: Record<string, unknown>,
  resolveProduct: (id: string) => Record<string, unknown> | null,
): FactsManifest {
  const rawProducts: unknown[] = Array.isArray(raw.products) ? raw.products : [];
  const fromProducts = rawProducts.map((p: unknown) =>
    typeof p === "string" ? p : str((p as Record<string, unknown>)?.productId ?? (p as Record<string, unknown>)?.product_id),
  );
  const ids = arr(fromProducts.length > 0 ? fromProducts : (raw.productIds ?? raw.product_ids));
  const products = ids
    .map((id) => resolveProduct(id))
    .filter((p): p is Record<string, unknown> => !!p)
    .map((p) => buildProductFacts(p).facts as VerifiedProductFacts);
  const missing: string[] = [];
  if (products.length === 0) missing.push("products");
  if (!(Number(raw.discount) > 0)) missing.push("discount");
  return {
    sourceType: "offer",
    intent: "offer",
    facts: {
      kind: "offer",
      id: str(raw.id ?? raw.slug),
      titleAr: str(raw.titleAr ?? (nameOf(raw.title).ar) ?? "عرض خاص"),
      productIds: ids,
      products,
      discount: num(raw.discount),
      startsAt: str(raw.startsAt ?? raw.start_date) || null,
      endsAt: str(raw.endsAt ?? raw.end_date) || null,
    },
    missing,
  };
}
