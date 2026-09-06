/**
 * PART 4 — Product-Name Reconstruction Audit + Real Examples Report
 * Produces: exact audit metrics + 10+ real before/after name examples.
 * Run with: npx tsx scripts/produce-part4-report.ts
 */

import { runPart4Audit, produceNameExamples } from "../src/lib/product-name";
import { products } from "../src/data/products";
import { onlyPublished } from "../src/lib/publication";

const published = onlyPublished(products);
const audit = runPart4Audit();
const examples = produceNameExamples(12);

console.log("=".repeat(100));
console.log("PART 4 — PRODUCT NAME RECONSTRUCTION (DRY-RUN / AUDIT MODE) REPORT");
console.log("=".repeat(100));

console.log("\n## 1) EXACT AUDIT METRICS (real catalog, " + published.length + " products)");
console.log(JSON.stringify(audit, null, 2));

console.log("\n## 2) BEFORE/AFTER NAME EXAMPLES (" + examples.length + " real examples)");
for (const e of examples) {
  console.log("\n" + "-".repeat(90));
  console.log("PRODUCT ID        : " + e.productId + "   BRAND: " + e.brand);
  console.log("ORIGINAL NAME     : " + e.originalName.ar + " / " + e.originalName.en);
  console.log("RECONSTRUCTED NAME: " + e.reconstructedName.ar + " / " + e.reconstructedName.en);
  const f = e.verifiedIdentityFacts;
  console.log(
    "VERIFIED FACTS     : type=" + (f.productTypeAr ?? "n/a") +
      " size=" + (f.size ?? "n/a") +
      " spf=" + (f.spf ?? "n/a") +
      " conc=" + (f.concentration ?? "n/a") +
      " count=" + (f.count ?? "n/a") +
      " shade=" + (f.shade ?? "n/a") +
      " variant=" + (f.variant ?? "n/a")
  );
  console.log("SOURCE EVIDENCE   : " + e.sourceEvidence.sourceLabel + " (rank " + e.sourceEvidence.sourceRank + ")" + " verified=" + e.sourceEvidence.verified + " agreement=" + e.sourceEvidence.agreement);
  console.log("IDENTITY STATUS   : " + e.identityStatus + "   ORIGINALITY: " + e.originalityStatus);
  console.log("SIMILARITY SCORE  : " + (e.similarityScore * 100).toFixed(0) + "%   CONFIDENCE: " + e.confidence + "/100");
  console.log("FINAL DECISION    : " + e.finalDecision);
  console.log("REASONS           : " + e.reasons.join(" | "));
}

console.log("\n" + "=".repeat(100));
console.log("END OF PART 4 REPORT");
console.log("=".repeat(100));