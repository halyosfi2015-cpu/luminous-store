/**
 * PART 8 — Usage-Instruction Audit Report (dry-run)
 * Real before/after examples + real source-conflict examples.
 * Run with: npx tsx scripts/produce-part8-report.ts
 */

import { runUsageAudit, produceUsageExamples, produceUsageConflictExamples } from "../src/lib/product-usage";

const audit = runUsageAudit();
const examples = produceUsageExamples(12);
const conflictExamples = produceUsageConflictExamples();

const report = {
  part: "PART 8 — USAGE INSTRUCTIONS",
  mode: "DRY-RUN / AUDIT (catalog untouched)",
  audit,
  realBeforeAfterExamples: examples,
  realSourceConflictExamples: conflictExamples,
  sourceConflictSummary: {
    productsWithVerifiedUsageSource: audit.sourceValidation.withVerifiedUsageSource,
    productsWithMultipleSources: audit.sourceValidation.withMultipleSources,
    realConflictsFound: audit.sourceValidation.withSourceConflicts,
    conflictsResolvedByHierarchy: audit.sourceValidation.conflictsResolvedByHierarchy,
    conflictsRequiringReview: audit.sourceValidation.conflictsRequiringReview,
    message:
      conflictExamples.length === 0 && audit.sourceValidation.withSourceConflicts === 0
        ? "0 real source conflicts found — no catalog product carries a verified usage source object, so no multi-source usage disagreement exists."
        : `${conflictExamples.length} real source conflicts found`,
  },
  reviewBucketExplanation:
    "281 REVIEW_REQUIRED products have no structurally extractable usage facts (hair tools, shaving, makeup/perfume marketing notes, 'حسب الاستخدام', 'اتبع التعليمات على العبوة'). Their rebuilt usage is the generic fallback 'اتبعي التعليمات المدونة على عبوة المنتج' — no instruction is invented — and they are flagged for human review.",
  rejectedExplanation:
    "1 REJECTED (yq-70 'سيروم عرق السوس'): verified usage area 'على الجسم' contradicts the product type 'سيروم' — a genuine cross-content identity mismatch, flagged not hidden.",
};

console.log(JSON.stringify(report, null, 2));