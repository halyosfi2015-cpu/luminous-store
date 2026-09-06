/**
 * PART 4 — PRICE INTELLIGENCE
 * ===========================
 * Detects missing/invalid prices, suspicious price changes and discount
 * anomalies. Reuses the existing Part 9 pricing validation
 * (`selectProductPricing`) as the canonical price authority — no new price
 * rules are invented here.
 */

import type { Product } from "@/src/types/product";
import { onlyPublished } from "@/src/lib/publication";
import { selectProductPricing } from "@/src/lib/product-pricing";
import type { PriceIntelligenceRow, PriceStatus } from "./types";

export interface PriceIntelligenceResult {
  total: number;
  ok: number;
  reviewRequired: PriceIntelligenceRow[];
  rejected: PriceIntelligenceRow[];
  hasPriceData: boolean;
}

export function buildPriceIntelligence(products: Product[]): PriceIntelligenceResult {
  const published = onlyPublished(products);
  const rows: PriceIntelligenceRow[] = [];
  for (const product of published) {
    const price = product.pricing?.price;
    let status: PriceStatus = "OK";
    const issues: string[] = [];
    if (!Number.isFinite(price) || price <= 0) {
      status = "REJECTED";
      issues.push("سعر مفقود أو غير صالح");
    } else {
      const decision = selectProductPricing(product);
      if (decision.status === "REJECTED") {
        status = "REJECTED";
        issues.push(...decision.reasons.filter((r) => r.includes("REJECTED")));
      } else if (decision.status === "REVIEW_REQUIRED") {
        status = "REVIEW_REQUIRED";
        issues.push("مطلوب مراجعة السعر");
        if (decision.realism.issues.length > 0) issues.push(...decision.realism.issues.slice(0, 2));
        if (decision.discountValidation.issues.length > 0) issues.push(...decision.discountValidation.issues.slice(0, 2));
      }
    }
    rows.push({ productId: product.id, price, currency: product.pricing?.currency ?? "YER", status, issues });
  }
  return {
    total: rows.length,
    ok: rows.filter((r) => r.status === "OK").length,
    reviewRequired: rows.filter((r) => r.status === "REVIEW_REQUIRED"),
    rejected: rows.filter((r) => r.status === "REJECTED"),
    hasPriceData: published.length > 0,
  };
}