import { extractNameFacts, reconstructName, computeNameDecision, runPart4Audit } from "@/src/lib/product-name";
import { products } from "@/src/data/products";
import { onlyPublished } from "@/src/lib/publication";

const all = onlyPublished(products);
console.log("published products:", all.length);

const sampleIds = ["yq-754", "yq-960", "yq-1680", "yq-2137", "yq-1051", "yq-2682", "yq-629", "yq-710", "yq-2051", "yq-129", "yq-460", "yq-1660"];
for (const id of sampleIds) {
  const p = all.find((x) => x.id === id);
  if (!p) {
    console.log(`-- ${id}: NOT FOUND`);
    continue;
  }
  const facts = extractNameFacts(p);
  const name = reconstructName(p, facts);
  const decision = computeNameDecision(facts, name, p.name);
  console.log(`\n== ${id} | ${p.brand}`);
  console.log("   OLD ar:", p.name.ar);
  console.log("   NEW ar:", name.ar);
  console.log("   NEW en:", name.en);
  console.log(
    "   facts: size=",
    facts.size,
    "| spf=",
    facts.spf,
    "| conc=",
    facts.concentration,
    "| shade=",
    facts.shade,
    "| variant=",
    facts.variant,
    "| count=",
    facts.count,
    "| core=",
    facts.coreDescriptorAr,
    "| typeAr=",
    facts.productTypeAr,
    "| sourceRank=",
    facts.sourceRank
  );
  console.log("   DECISION:", decision.status, "| conf=", decision.confidence, "| idStatus=", decision.identityStatus, "| orig=", decision.originalityStatus);
  console.log("   reasons:", decision.reasons);
}

const audit = runPart4Audit();
console.log("\n=========== PART 4 AUDIT ===========");
console.log(JSON.stringify(audit, null, 2));