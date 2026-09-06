/**
 * PART 4 — FINANCIAL INTELLIGENCE
 * ===============================
 * Financial calculations are performed by code from canonical data. There is
 * NO per-product cost data in the catalog today, so gross profit is genuinely
 * unavailable unless the admin configures a default cost ratio (an explicit,
 * clearly-labelled estimate — never a fabricated profit).
 */

import type { FinanceSummary, ProductSalesRow, StoreOpsSettings } from "./types";

export interface FinanceInput {
  netSalesYER: number;
  settings: StoreOpsSettings;
}

/** Deterministic finance summary. Returns unavailable when cost is missing. */
export function computeFinanceSummary(input: FinanceInput): FinanceSummary {
  const { netSalesYER, settings } = input;
  if (settings.costSource === "none") {
    return {
      available: false,
      noteAr: "لا يمكن حساب الربح بدقة — تكلفة المنتجات غير متوفرة.",
      revenueYER: netSalesYER,
      costYER: null,
      grossProfitYER: null,
      grossMarginPercent: null,
      estimated: false,
    };
  }

  const ratio = Math.max(0, Math.min(1, settings.defaultCostRatio));
  const cost = Math.round(netSalesYER * ratio);
  const profit = netSalesYER - cost;
  const margin = netSalesYER > 0 ? Math.round((profit / netSalesYER) * 10000) / 100 : null;

  return {
    available: true,
    noteAr: `الربح محسوب بنسبة تكلفة تقديرية ${Math.round(ratio * 100)}% من سعر البيع (لا توجد تكلفة فعلية لكل منتج).`,
    revenueYER: netSalesYER,
    costYER: cost,
    grossProfitYER: profit,
    grossMarginPercent: margin,
    estimated: true,
  };
}

export interface ContributionRow {
  labelAr: string;
  revenueYER: number;
  costYER: number;
  grossProfitYER: number;
  marginPercent: number | null;
}

/** Contribution by product/category/brand when a cost source is configured. */
export function computeContribution(
  rows: Array<{ labelAr: string; revenueYER: number }>,
  settings: StoreOpsSettings,
): { available: boolean; noteAr: string; rows: ContributionRow[] } {
  if (settings.costSource === "none") {
    return {
      available: false,
      noteAr: "لا يمكن حساب الربح بدقة — تكلفة المنتجات غير متوفرة.",
      rows: [],
    };
  }
  const ratio = Math.max(0, Math.min(1, settings.defaultCostRatio));
  return {
    available: true,
    noteAr: "مساهمة تقديرية مبنية على نسبة التكلفة المكوّنة.",
    rows: rows.map((r) => {
      const cost = Math.round(r.revenueYER * ratio);
      const profit = r.revenueYER - cost;
      return {
        labelAr: r.labelAr,
        revenueYER: r.revenueYER,
        costYER: cost,
        grossProfitYER: profit,
        marginPercent: r.revenueYER > 0 ? Math.round((profit / r.revenueYER) * 10000) / 100 : null,
      };
    }),
  };
}

export function productContribution(
  sales: ProductSalesRow[],
  settings: StoreOpsSettings,
): { available: boolean; noteAr: string; rows: Array<ContributionRow & { productId: string }> } {
  if (settings.costSource === "none") {
    return { available: false, noteAr: "لا يمكن حساب الربح بدقة — تكلفة المنتجات غير متوفرة.", rows: [] };
  }
  const ratio = Math.max(0, Math.min(1, settings.defaultCostRatio));
  return {
    available: true,
    noteAr: "مساهمة تقديرية مبنية على نسبة التكلفة المكوّنة.",
    rows: sales.map((s) => {
      const cost = Math.round(s.revenueYER * ratio);
      const profit = s.revenueYER - cost;
      return {
        productId: s.productId,
        labelAr: s.productId,
        revenueYER: s.revenueYER,
        costYER: cost,
        grossProfitYER: profit,
        marginPercent: s.revenueYER > 0 ? Math.round((profit / s.revenueYER) * 10000) / 100 : null,
      };
    }),
  };
}

/** Deterministic campaign contribution where attribution exists (from content-ops). */
export function campaignContribution(
  campaigns: Array<{ campaignId: string; name: string; revenueYER: number }>,
  settings: StoreOpsSettings,
): { available: boolean; noteAr: string; rows: ContributionRow[] } {
  if (settings.costSource === "none") {
    return { available: false, noteAr: "لا يمكن حساب الربح بدقة — تكلفة المنتجات غير متوفرة.", rows: [] };
  }
  const ratio = Math.max(0, Math.min(1, settings.defaultCostRatio));
  return {
    available: true,
    noteAr: "مساهمة تقديرية مبنية على نسبة التكلفة المكوّنة.",
    rows: campaigns.map((c) => {
      const cost = Math.round(c.revenueYER * ratio);
      const profit = c.revenueYER - cost;
      return {
        labelAr: c.name,
        revenueYER: c.revenueYER,
        costYER: cost,
        grossProfitYER: profit,
        marginPercent: c.revenueYER > 0 ? Math.round((profit / c.revenueYER) * 10000) / 100 : null,
      };
    }),
  };
}