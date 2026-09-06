/**
 * Part 2 — Final Catalog Audit + Example Generation Report
 * Produces: 10+ before/after examples, 5+ image source examples, exact audit metrics.
 * Run with: npx tsx scripts/produce-report.ts
 */

import {
  runCatalogAudit,
  produceBeforeAfterExamples,
  produceImageSourceExamples,
} from "../src/lib/content-reconstruction";
import { products } from "../src/data/products";
import { onlyPublished } from "../src/lib/publication";

const published = onlyPublished(products);

const audit = runCatalogAudit();
const beforeAfter = produceBeforeAfterExamples();
const imageExamples = produceImageSourceExamples();

console.log("=".repeat(100));
console.log("PART 2 — FINAL REAL CATALOG AUDIT + EXAMPLES REPORT");
console.log("=".repeat(100));

console.log("\n## 1) EXACT CATALOG AUDIT METRICS (real catalog, " + published.length + " products)");
console.log(JSON.stringify(audit, null, 2));

console.log("\n## 2) BEFORE/AFTER EXAMPLES (" + beforeAfter.length + " real examples)");
for (const e of beforeAfter) {
  console.log("\n" + "-".repeat(90));
  console.log("PRODUCT ID   : " + e.productId + "   BRAND: " + e.brand);
  console.log("OLD NAME     : " + e.oldName.ar + " / " + e.oldName.en);
  console.log("NEW NAME     : " + e.newName.ar + " / " + e.newName.en);
  console.log("IDENTITY     : type=" + (e.identityFacts.productType ?? "n/a") + " size=" + (e.identityFacts.size ?? "n/a") + " shade=" + (e.identityFacts.shade ?? "n/a") + " spf=" + (e.identityFacts.spf ?? "n/a") + " ingredients=" + e.identityFacts.ingredientsCount + " benefits=" + e.identityFacts.benefitsCount);
  console.log("OLD DESC     : " + e.oldDescription.ar.slice(0, 110));
  console.log("NEW DESC     : " + e.newDescription.ar.slice(0, 110));
  console.log("OLD BENEFITS : " + e.oldBenefits.ar.slice(0, 3).join(" | "));
  console.log("NEW BENEFITS : " + e.newBenefits.ar.slice(0, 3).join(" | "));
  console.log("OLD USAGE    : " + e.oldUsage.ar.slice(0, 60) + " | " + e.oldUsage.en.slice(0, 60));
  console.log("NEW USAGE    : " + e.newUsage.ar.slice(0, 60) + " | " + e.newUsage.en.slice(0, 60));
  console.log("IMAGE SOURCE : OLD=" + e.oldImageSource + "   NEW=" + e.newImageSource);
  console.log("PRICE        : OLD=" + e.oldPrice + " YER   LUMINOUS=" + e.newLuminousPrice + " YER   [" + e.validationStatus + "]");
  console.log("CONFIDENCE   : " + e.confidence + "/100   OVERALL: " + e.overallStatus);
  console.log("COMPONENTS   : name=" + e.componentStatuses.name + " desc=" + e.componentStatuses.description + " benefits=" + e.componentStatuses.benefits + " usage=" + e.componentStatuses.usage + " image=" + e.componentStatuses.image + " price=" + e.componentStatuses.price);
  console.log("ORIGINALITY  : name=" + e.originality.nameOriginal + " desc=" + e.originality.descriptionOriginal + " benefits=" + e.originality.benefitsOriginal + " usage=" + e.originality.usageOriginal);
  console.log("CONSISTENCY  : brand=" + e.consistency.brandConsistent + " identityInNameAndDesc=" + e.consistency.identityInNameAndDescription);
}

console.log("\n## 3) IMAGE SOURCE EXAMPLES (" + imageExamples.length + " real examples)");
for (const e of imageExamples) {
  console.log("\n" + "-".repeat(90));
  console.log("PRODUCT ID    : " + e.productId);
  console.log("PRODUCT NAME  : " + e.productName.ar + " / " + e.productName.en);
  console.log("CANDIDATES    : " + e.candidateSources.map((c) => c.source + "(rank " + c.rank + ")").join(" -> "));
  console.log("SELECTED SRC  : " + e.selectedSource);
  console.log("SELECTED IMG  : " + e.selectedImage);
  console.log("IDENTITY MATCH: " + e.identityMatch + "   VARIANT MATCH: " + e.variantMatch);
  console.log("SIZE/SHADE    : " + e.sizeShadeMatch);
  console.log("QUALITY       : " + e.qualityValidation + "   CONFIDENCE: " + e.confidence + "/100");
  console.log("REASON        : " + e.reason);
}

console.log("\n" + "=".repeat(100));
console.log("END OF REPORT");
console.log("=".repeat(100));