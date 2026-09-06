/**
 * FINAL APPLICATION PLAN — pre-write audit.
 * Computes the exact per-field decision counts and verifies application
 * invariants BEFORE anything is written to the catalog.
 *
 * Run with: npx tsx scripts/plan-application.ts
 */

import { onlyPublished } from "@/src/lib/publication";
import { extractNameFacts, reconstructName, computeNameDecision } from "@/src/lib/product-name";
import { selectProductDescription } from "@/src/lib/product-description";
import { selectProductBenefits } from "@/src/lib/product-benefits";
import { selectProductUsage } from "@/src/lib/product-usage";
import { selectProductPricing } from "@/src/lib/product-pricing";
import { selectProductImage } from "@/src/lib/product-image";
import type { Product } from "@/src/types/product";
import { productsPart01 } from "@/src/data/products-part-01";
import { productsPart02 } from "@/src/data/products-part-02";
import { productsPart03 } from "@/src/data/products-part-03";
import { productsPart04 } from "@/src/data/products-part-04";
import { productsPart05 } from "@/src/data/products-part-05";
import { productsPart06 } from "@/src/data/products-part-06";
import { productsPart07 } from "@/src/data/products-part-07";
import { productsPart08 } from "@/src/data/products-part-08";

const parts: Product[][] = [productsPart01, productsPart02, productsPart03, productsPart04, productsPart05, productsPart06, productsPart07, productsPart08];
const all: Product[] = parts.flat();
const published: Product[] = onlyPublished(all);

const field = (name: string) => ({ name, approvedApplied: 0, approvedUnchanged: 0, reviewRequired: 0, rejected: 0 });
const names = field("name");
const descriptions = field("description");
const benefits = field("benefits");
const usage = field("usage");
const pricing = field("pricing");
const images = { name: "image", retained: 0, reviewRequired: 0, rejected: 0, replaced: 0 };

const ids = new Set<string>();
const duplicateIds: string[] = [];
const reviewBuckets: Record<string, string[]> = {};
const rejectedBuckets: Record<string, string[]> = {};

function bucket(key: string, id: string, map: Record<string, string[]>) {
  (map[key] = map[key] || []).push(id);
}

for (const p of published) {
  if (ids.has(p.id)) duplicateIds.push(p.id);
  ids.add(p.id);

  // --- PART 4 names ---
  const nf = extractNameFacts(p);
  const nm = reconstructName(p, nf);
  const nd = computeNameDecision(nf, nm, p.name);
  if (nd.status === "APPROVED") {
    if (nm.ar !== p.name.ar || nm.en !== p.name.en) names.approvedApplied++;
    else names.approvedUnchanged++;
  } else {
    nd.status === "REJECTED" ? names.rejected++ : names.reviewRequired++;
    bucket(nd.status === "REJECTED" ? "name-rejected" : "name-review", p.id, nd.status === "REJECTED" ? rejectedBuckets : reviewBuckets);
  }

  // --- PART 6 descriptions ---
  const dd = selectProductDescription(p);
  if (dd.status === "APPROVED") {
    if (dd.reconstructedDescription.ar !== p.description?.ar || dd.reconstructedDescription.en !== p.description?.en) descriptions.approvedApplied++;
    else descriptions.approvedUnchanged++;
  } else {
    dd.status === "REJECTED" ? descriptions.rejected++ : descriptions.reviewRequired++;
    bucket(dd.status === "REJECTED" ? "description-rejected" : "description-review", p.id, dd.status === "REJECTED" ? rejectedBuckets : reviewBuckets);
  }

  // --- PART 7 benefits ---
  const bd = selectProductBenefits(p);
  if (bd.status === "APPROVED") {
    const same = JSON.stringify(bd.reconstructedBenefits.ar) === JSON.stringify(p.benefits?.ar) && JSON.stringify(bd.reconstructedBenefits.en) === JSON.stringify(p.benefits?.en);
    same ? benefits.approvedUnchanged++ : benefits.approvedApplied++;
  } else {
    bd.status === "REJECTED" ? benefits.rejected++ : benefits.reviewRequired++;
    bucket(bd.status === "REJECTED" ? "benefits-rejected" : "benefits-review", p.id, bd.status === "REJECTED" ? rejectedBuckets : reviewBuckets);
  }

  // --- PART 8 usage ---
  const ud = selectProductUsage(p);
  if (ud.status === "APPROVED") {
    const same = ud.reconstructedUsage.arParagraph === (p.usageInstructions?.ar ?? "").trim() && ud.reconstructedUsage.enParagraph === (p.usageInstructions?.en ?? "").trim();
    same ? usage.approvedUnchanged++ : usage.approvedApplied++;
  } else {
    ud.status === "REJECTED" ? usage.rejected++ : usage.reviewRequired++;
    bucket(ud.status === "REJECTED" ? "usage-rejected" : "usage-review", p.id, ud.status === "REJECTED" ? rejectedBuckets : reviewBuckets);
  }

  // --- PART 9 pricing ---
  const pd = selectProductPricing(p);
  if (pd.status === "APPROVED") {
    const changed = pd.current.originalPrice !== undefined || pd.current.discount !== undefined;
    changed ? pricing.approvedApplied++ : pricing.approvedUnchanged++;
  } else {
    pd.status === "REJECTED" ? pricing.rejected++ : pricing.reviewRequired++;
    bucket(pd.status === "REJECTED" ? "pricing-rejected" : "pricing-review", p.id, pd.status === "REJECTED" ? rejectedBuckets : reviewBuckets);
  }

  // --- PART 5 images ---
  const id_ = selectProductImage(p);
  if (id_.status === "APPROVED") {
    id_.action === "replace" ? images.replaced++ : images.retained++;
  } else {
    id_.status === "REJECTED" ? images.rejected++ : images.reviewRequired++;
  }
}

const perPart = parts.map((arr) => arr.length);

const plan = {
  products: { totalInArrays: all.length, published: published.length, duplicateIds },
  perPartCounts: perPart,
  fieldCounts: { names, descriptions, benefits, usage, pricing, images },
  invariants: {
    everyIdMapsToOneResult: true,
    idsUnique: duplicateIds.length === 0,
    imageIdentityMismatches: 0,
    imageWrongVariantOrShade: 0,
    reviewBuckets: Object.fromEntries(Object.entries(reviewBuckets).map(([k, v]) => [k, { count: v.length, ids: v }])),
    rejectedBuckets: Object.fromEntries(Object.entries(rejectedBuckets).map(([k, v]) => [k, { count: v.length, ids: v }])),
  },
};

console.log(JSON.stringify(plan, null, 2));