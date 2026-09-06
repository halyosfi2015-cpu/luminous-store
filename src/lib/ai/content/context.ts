/**
 * PART 1 — CONTENT CONTEXT BUILDER
 * ================================
 *
 * buildContentContext turns the REAL catalog + canonical verified pipelines
 * into a publish-filtered, normalized CONTEXT the AI can consume. This is the
 * ONLY place product/business data enters the prompt. The AI is never handed
 * raw retailer prose — only normalized verified facts with evidence keys.
 *
 * Reuses (no duplicates):
 *  - src/lib/publication.ts            — onlyPublished / isPublished
 *  - src/lib/source-hierarchy.ts       — source authority labels
 *  - src/lib/product-name.ts           — identity facts (extractNameFacts)
 *  - src/lib/product-description.ts    — description facts (extractDescriptionFacts)
 *  - src/lib/product-benefits.ts       — benefit facts (extractBenefitFacts)
 *  - src/lib/product-pricing.ts        — pricing facts + discount validation
 *  - src/lib/product-image.ts          — canonical image resolution
 */

import type { Product } from "@/src/types/product";
import { products } from "@/src/data/products";
import { onlyPublished, isPublished } from "@/src/lib/publication";
import { extractNameFacts } from "@/src/lib/product-name";
import { extractDescriptionFacts } from "@/src/lib/product-description";
import { extractBenefitFacts } from "@/src/lib/product-benefits";
import { extractPricingFacts, validateDiscount } from "@/src/lib/product-pricing";
import { selectProductImage } from "@/src/lib/product-image";
import type { VerifiedProductFact } from "./types";

export const CONTENT_CONTEXT_VERSION = "content_context_v1";

/* ------------------------------------------------------------------------ */
/* TYPES                                                                     */
/* ------------------------------------------------------------------------ */

export interface ContentProductContext {
  id: string;
  nameAr: string;
  nameEn: string;
  brand: string;
  brandAr: string | undefined;
  categoryId: string | null;
  categorySlug: string | null;
  categoryAr: string | null;
  image: string | null;
  facts: VerifiedProductFact[];
}

export interface ContentContext {
  version: string;
  generatedAt: string;
  products: ContentProductContext[];
  /** True when every requested product was resolved AND published. */
  allProductsResolved: boolean;
  missingProductIds: string[];
  unpublishedProductIds: string[];
  warnings: string[];
}

export interface ContentContextOptions {
  /** Restrict to these product IDs (publish-filtered). Empty = all published. */
  productIds?: string[];
  /** Restrict to a category slug. */
  categorySlug?: string;
  /** When true (default) context fails to include a requested product. */
  strict?: boolean;
}

/* ------------------------------------------------------------------------ */
/* FACT BUILDERS                                                             */
/* ------------------------------------------------------------------------ */

function buildProductFacts(product: Product): VerifiedProductFact[] {
  const facts: VerifiedProductFact[] = [];

  const nameFacts = extractNameFacts(product);

  // Identity
  if (nameFacts.brand) {
    facts.push({
      kind: "identity",
      statementAr: `من ${nameFacts.brandAr ?? nameFacts.brand}`,
      statementEn: `by ${nameFacts.brand}`,
      evidence: `brand:${nameFacts.brand}`,
      source: nameFacts.sourceLabel,
    });
  }
  if (nameFacts.productTypeAr) {
    facts.push({
      kind: "identity",
      statementAr: `${product.name.ar ?? ""}`.trim() ? `${product.name.ar}` : `${nameFacts.productTypeAr}`,
      statementEn: product.name.en ?? nameFacts.productTypeEn ?? null,
      evidence: `identity:${product.id}`,
      source: nameFacts.sourceLabel,
    });
  }

  // Category
  if (product.categoryAr || product.category) {
    facts.push({
      kind: "category",
      statementAr: `من قسم ${product.categoryAr ?? product.category}`,
      statementEn: `from the ${product.category} section`,
      evidence: `category:${product.categorySlug ?? product.category}`,
      source: "store catalog",
    });
  }

  // Ingredients (only verified ingredients)
  const df = extractDescriptionFacts(product);
  for (const ing of df.ingredients.slice(0, 5)) {
    facts.push({
      kind: "ingredient",
      statementAr: `يحتوي على ${ing}`,
      statementEn: null,
      evidence: `ingredient:${ing}`,
      source: "verified ingredient list",
    });
  }

  // Benefits (product-specific verified benefits only)
  const benefitFacts = extractBenefitFacts(product);
  for (const b of benefitFacts.slice(0, 6)) {
    facts.push({
      kind: "benefit",
      statementAr: b.ar,
      statementEn: b.en,
      evidence: b.evidence,
      source: b.source,
    });
  }

  // Usage
  const usageAr = product.usageInstructions?.ar ?? product.howToUseAr?.[0];
  const usageEn = product.usageInstructions?.en ?? product.howToUse?.[0];
  if (usageAr || usageEn) {
    facts.push({
      kind: "usage",
      statementAr: usageAr?.trim() ? `الاستخدام: ${usageAr}` : "",
      statementEn: usageEn?.trim() ? `usage: ${usageEn}` : null,
      evidence: "usage:verified",
      source: "verified usage instructions",
    });
  }

  // Size
  if (nameFacts.size) {
    facts.push({
      kind: "size",
      statementAr: `الحجم ${nameFacts.size}`,
      statementEn: `size ${nameFacts.size}`,
      evidence: `size:${nameFacts.size}`,
      source: nameFacts.sourceLabel,
    });
  }

  // Price + discount (canonical runtime pricing; -200 rule NEVER a discount)
  const pricingFacts = extractPricingFacts(product);
  if (Number.isFinite(pricingFacts.price) && pricingFacts.price > 0) {
    facts.push({
      kind: "price",
      statementAr: `السعر ${pricingFacts.price} ريال يمني`,
      statementEn: `price ${pricingFacts.price} YER`,
      evidence: "price:canonical",
      source: "verified pricing",
      price: pricingFacts.price,
    });
    const discount = validateDiscount(pricingFacts);
    if (discount.genuine && discount.discountPercent !== undefined && !discount.fakeBaseRule) {
      facts.push({
        kind: "discount",
        statementAr: `خصم حقيقي ${discount.discountPercent}%`,
        statementEn: `genuine ${discount.discountPercent}% discount`,
        evidence: `discount:${discount.discountPercent}`,
        source: "verified pricing",
        price: pricingFacts.price,
        isDiscount: true,
        discountPercent: discount.discountPercent,
      });
    }
  }

  return facts;
}

/* ------------------------------------------------------------------------ */
/* SELECTOR                                                                  */
/* ------------------------------------------------------------------------ */

function resolveProductContext(product: Product): ContentProductContext {
  const imageDecision = selectProductImage(product);

  const facts = buildProductFacts(product);
  const cleanFacts = facts.filter((f) => f.statementAr.trim() !== "");

  return {
    id: product.id,
    nameAr: product.name.ar ?? "",
    nameEn: product.name.en ?? "",
    brand: product.brand,
    brandAr: product.brandAr,
    categoryId: product.categorySlug ?? null,
    categorySlug: product.categorySlug ?? null,
    categoryAr: product.categoryAr ?? null,
    image: imageDecision.selectedImage,
    facts: cleanFacts,
  };
}

export function buildContentContext(options: ContentContextOptions = {}): ContentContext {
  const warnings: string[] = [];
  const missingProductIds: string[] = [];
  const unpublishedProductIds: string[] = [];

  let pool = products;
  if (options.categorySlug) {
    pool = pool.filter((p) => p.categorySlug === options.categorySlug || p.category === options.categorySlug);
  }

  const publishedPool = onlyPublished(pool);
  const byId = new Map(publishedPool.map((p) => [p.id, p]));

  let selected: Product[];
  if (options.productIds && options.productIds.length > 0) {
    selected = [];
    for (const id of options.productIds) {
      const product = byId.get(id);
      if (!product) {
        const raw = products.find((p) => p.id === id);
        if (raw) {
          if (!isPublished(raw)) unpublishedProductIds.push(id);
          else missingProductIds.push(id);
        } else {
          missingProductIds.push(id);
        }
        continue;
      }
      selected.push(product);
    }
  } else {
    selected = publishedPool;
  }

  const contexts = selected.map(resolveProductContext);
  const allProductsResolved = missingProductIds.length === 0 && unpublishedProductIds.length === 0;

  if (missingProductIds.length > 0) {
    warnings.push(`missing product(s): ${missingProductIds.join(", ")}`);
  }
  if (unpublishedProductIds.length > 0) {
    warnings.push(`unpublished product(s): ${unpublishedProductIds.join(", ")}`);
  }
  if (options.strict && !allProductsResolved) {
    warnings.push("strict mode: unresolved requested products present");
  }

  return {
    version: CONTENT_CONTEXT_VERSION,
    generatedAt: new Date().toISOString(),
    products: contexts,
    allProductsResolved,
    missingProductIds,
    unpublishedProductIds,
    warnings,
  };
}

/** Serialize a context into the prompt's CONTEXT section. */
export function serializeContentContext(context: ContentContext): string {
  return JSON.stringify(
    {
      version: context.version,
      products: context.products.map((p) => ({
        id: p.id,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        brand: p.brand,
        category: p.categoryAr,
        image: p.image,
        facts: p.facts,
      })),
    },
    null,
    2,
  );
}