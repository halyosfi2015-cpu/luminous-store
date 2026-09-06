/**
 * PART 6 — Product-Description Audit Report (dry-run)
 * Run with: npx tsx scripts/produce-part6-report.ts
 */

import { runDescriptionAudit, produceDescriptionExamples } from "../src/lib/product-description";

const audit = runDescriptionAudit();
const examples = produceDescriptionExamples(12);

const report = {
  part: "PART 6 — PRODUCT DESCRIPTION",
  mode: "DRY-RUN / AUDIT (catalog untouched)",
  audit,
  realBeforeAfterExamples: examples,
};

console.log(JSON.stringify(report, null, 2));