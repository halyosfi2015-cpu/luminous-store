/**
 * PART 7 — Product-Benefits Audit Report (dry-run)
 * Run with: npx tsx scripts/produce-part7-report.ts
 */

import { runBenefitAudit, produceBenefitExamples } from "../src/lib/product-benefits";

const audit = runBenefitAudit();
const examples = produceBenefitExamples(12);

const report = {
  part: "PART 7 — PRODUCT BENEFITS",
  mode: "DRY-RUN / AUDIT (catalog untouched)",
  audit,
  realBeforeAfterExamples: examples,
};

console.log(JSON.stringify(report, null, 2));
