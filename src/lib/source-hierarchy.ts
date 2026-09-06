// Source Hierarchy System for Luminous
// Implements field-specific authority and conflict resolution

/**
 * SOURCE HIEARCHY — Authority Ranking
 * 
 * Yaqoot is allowed as a factual source but MUST NOT be the writing template.
 * Authority is FIELD-SPECIFIC, not absolute.
 */

// Hierarchy ranking from strongest to weakest
export const SOURCE_HIERARCHY = [
  { rank: 1, label: "Official manufacturer / brand", key: "manufacturer", authority: "name, brand, productType" },
  { rank: 2, label: "Official distributor / authorized source", key: "distributor", authority: "ingredients, usage, variant" },
  { rank: 3, label: "Trusted established retailer", key: "trustedRetailer", authority: "description, benefits, size" },
  { rank: 4, label: "Beauty Center", key: "beautyCenter", authority: "usage, benefits" },
  { rank: 5, label: "بيوتي ستور", key: "beautyStoreArabic", authority: "local availability, price reference" },
  { rank: 6, label: "كشمير كوزمتك", key: "kimeraCosmetics", authority: "alternative formulation info" },
  { rank: 7, label: "Yaqoot Store", key: "yaqoot", authority: "factual reference, price model, local market data" },
  { rank: 8, label: "Other trusted sources", key: "other", authority: "supplementary information" },
] as const;

/**
 * Field-Specific Authority Policy
 * 
 * Determines which source level is preferred for each product fact type.
 * This is NOT an absolute rule — a Level 1 source doesn't always win every field.
 */

export const FIELD_AUTHORITY_POLICY = {
  // Name — strongest authority
  name: [
    { minRank: 1, priority: "official manufacturer" },
    { minRank: 2, priority: "official distributor" },
    { minRank: 3, priority: "trusted retailer" },
    { minRank: 7, priority: "Yaqoot" }, // Yaqoot OK for name when stronger sources unavailable
  ],

  // Ingredients — strong authority required
  ingredients: [
    { minRank: 1, priority: "official brand" },
    { minRank: 2, priority: "official distributor" },
    { minRank: 3, priority: "verified documentation" },
    { minRank: 5, priority: "Yaqoot" }, // Yaqoot ingredients acceptable when no stronger source
  ],

  // Image — strong authority
  image: [
    { minRank: 1, priority: "official brand" },
    { minRank: 2, priority: "official distributor" },
    { minRank: 3, priority: "trusted retailer" },
    { minRank: 7, priority: "Yaqoot" }, // Yaqoot images retained if best verified
  ],

  // Usage — strong authority
  usage: [
    { minRank: 1, priority: "official brand" },
    { minRank: 2, priority: "official distributor" },
    { minRank: 3, priority: "verified documentation" },
    { minRank: 7, priority: "Yaqoot" },
  ],

  // Benefits — strong authority, unsupported claims rejected
  benefits: [
    { minRank: 1, priority: "official brand" },
    { minRank: 2, priority: "official distributor" },
    { minRank: 3, priority: "verified product documentation" },
    { minRank: 7, priority: "Yaqoot" }, // Yaqoot benefits acceptable when no stronger source
  ],

  // Price — project rule applies
  price: [
    { minRank: 7, priority: "Yaqoot originalPrice as reference" }, // Price rule: Luminous = Yaqoot originalPrice - 200 YER
  ],

  // Variant — strong authority, no merging across variants
  variant: [
    { minRank: 1, priority: "official brand" },
    { minRank: 2, priority: "official distributor" },
    { minRank: 7, priority: "Yaqoot with variant match" },
  ],

  // Size — critical, no merging across sizes
  size: [
    { minRank: 1, priority: "official brand" },
    { minRank: 7, priority: "Yaqoot with size match" }, // Conflict requires review
  ],

  // Shade — critical, no merging across shades
  shade: [
    { minRank: 1, priority: "official brand" },
    { minRank: 7, priority: "Yaqoot with shade match" }, // Conflict requires review
  ],

  // Formulation — strong authority
  formulation: [
    { minRank: 1, priority: "official brand" },
    { minRank: 2, priority: "official distributor" },
    { minRank: 7, priority: "Yaqoot" },
  ],

  // SPF — strong authority
  spf: [
    { minRank: 1, priority: "official brand" },
    { minRank: 7, priority: "Yaqoot with SPF match" },
  ],

  // Count — strong authority
  count: [
    { minRank: 1, priority: "official brand" },
    { minRank: 7, priority: "Yaqoot with count match" },
  ],
} as const;

/**
 * Source Conflict Resolution
 * 
 * Deterministic conflict resolution when multiple sources provide
 * conflicting values for the same field.
 */

export function resolveSourceConflict(
  field: keyof typeof FIELD_AUTHORITY_POLICY,
  sourceA: { level: number; key: string; value: string },
  sourceB: { level: number; key: string; value: string }
): { winner: string; reason: string; status: "approved" | "review_required" | "rejected" } {
  const policy = FIELD_AUTHORITY_POLICY[field];
  const rankA = sourceA.level;
  const rankB = sourceB.level;

  // Lower rank number = higher authority
  if (rankA < rankB) {
    return {
      winner: sourceA.key,
      reason: `Source ${sourceA.key} (rank ${rankA}) outranks ${sourceB.key} (rank ${rankB}) for field ${field}`,
      status: "approved",
    };
  } else if (rankB < rankA) {
    return {
      winner: sourceB.key,
      reason: `Source ${sourceB.key} (rank ${rankB}) outranks ${sourceA.key} (rank ${rankA}) for field ${field}`,
      status: "approved",
    };
  } else {
    // Same rank — check for agreement
    if (sourceA.value === sourceB.value) {
      return {
        winner: "agreement",
        reason: `Both sources rank ${rankA} agree on value: ${sourceA.value}`,
        status: "approved",
      };
    } else {
      // Same rank, conflicting values — review required
      return {
        winner: "review_required",
        reason: `Source conflict on ${field}: ${sourceA.key} reports "${sourceA.value}" vs ${sourceB.key} reports "${sourceB.value}"`,
        status: "review_required",
      };
    }
  }
}

/**
 * Product Identity Matching
 * 
 * Verifies that a source's product data matches the canonical product
 * before accepting its facts.
 */

export interface IdentityMatchResult {
  matched: boolean;
  confidence: "high" | "medium" | "low";
  matchedFields: string[];
  missingFields: string[];
  reason: string;
}

export function verifyProductIdentity(
  sourceProduct: {
    brand?: string;
    name?: string;
    category?: string;
    size?: string;
    shade?: string;
    variant?: string;
    formulation?: string;
    count?: string;
    spf?: string;
  },
  canonicalProduct: {
    brand?: string;
    name?: string;
    category?: string;
    size?: string;
    shade?: string;
    variant?: string;
    formulation?: string;
    count?: string;
    spf?: string;
  }
): IdentityMatchResult {
  const matchedFields: string[] = [];
  const missingFields: string[] = [];
  let matchedCount = 0;

  // Check brand
  if (sourceProduct.brand && canonicalProduct.brand && sourceProduct.brand === canonicalProduct.brand) {
    matchedFields.push("brand");
    matchedCount++;
  } else if (sourceProduct.brand || canonicalProduct.brand) {
    missingFields.push("brand");
  }

  // Check product name
  if (sourceProduct.name && canonicalProduct.name && sourceProduct.name === canonicalProduct.name) {
    matchedFields.push("name");
    matchedCount++;
  } else if (sourceProduct.name || canonicalProduct.name) {
    missingFields.push("name");
  }

  // Check category
  if (sourceProduct.category && canonicalProduct.category && sourceProduct.category === canonicalProduct.category) {
    matchedFields.push("category");
    matchedCount++;
  }

  // Check size
  if (sourceProduct.size && canonicalProduct.size && sourceProduct.size === canonicalProduct.size) {
    matchedFields.push("size");
    matchedCount++;
  } else if (sourceProduct.size || canonicalProduct.size) {
    missingFields.push("size");
  }

  // Check shade
  if (sourceProduct.shade && canonicalProduct.shade && sourceProduct.shade === canonicalProduct.shade) {
    matchedFields.push("shade");
    matchedCount++;
  }

  // Check variant
  if (sourceProduct.variant && canonicalProduct.variant && sourceProduct.variant === canonicalProduct.variant) {
    matchedFields.push("variant");
    matchedCount++;
  }

  // Check formulation
  if (sourceProduct.formulation && canonicalProduct.formulation && sourceProduct.formulation === canonicalProduct.formulation) {
    matchedFields.push("formulation");
    matchedCount++;
  }

  // Check count
  if (sourceProduct.count && canonicalProduct.count && sourceProduct.count === canonicalProduct.count) {
    matchedFields.push("count");
    matchedCount++;
  }

  // Check SPF
  if (sourceProduct.spf && canonicalProduct.spf && sourceProduct.spf === canonicalProduct.spf) {
    matchedFields.push("spf");
    matchedCount++;
  }

  const totalExpectedFields = 9; // brand, name, category, size, shade, variant, formulation, count, spf
  const confidence: "high" | "medium" | "low" = matchedCount >= 7
    ? "high"
    : matchedCount >= 4
      ? "medium"
      : "low";

  const identityMatch = matchedCount >= 5; // At least 5 of 9 fields must match

  return {
    matched: identityMatch,
    confidence,
    matchedFields,
    missingFields: missingFields.filter(f => !matchedFields.includes(f)),
    reason: identityMatch
      ? `Identity verified: ${matchedCount}/${totalExpectedFields} fields match`
      : `Identity uncertain: only ${matchedCount}/${totalExpectedFields} fields match`,
  };
}

/**
 * Source Agreement Detection
 * 
 * Determines when multiple trusted sources agree on a product fact,
 * increasing confidence in that fact.
 */

export function detectSourceAgreement(
  field: string,
  sources: Array<{ level: number; key: string; value: string }>
): { agreed: boolean; value: string | null; confidence: "high" | "medium" | "low"; participatingSources: string[] } {
  if (sources.length < 2) {
    return { agreed: false, value: null, confidence: "low", participatingSources: [] };
  }

  // Check if all sources provide the same value
  const firstValue = sources[0].value;
  const allAgree = sources.every(s => s.value === firstValue);

  if (allAgree) {
    const rankMin = Math.min(...sources.map(s => s.level));
    const confidence = sources.length >= 3 ? "high" : sources.length === 2 ? "medium" : "low";
    return {
      agreed: true,
      value: firstValue,
      confidence,
      participatingSources: sources.map(s => s.key),
    };
  }

  // Partial agreement — some sources agree, others differ
  // Find the most common value
  const valueCounts = sources.reduce((acc, s) => {
    acc[s.value] = (acc[s.value] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommonValue = Object.entries(valueCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  const mostCommonCount = valueCounts[mostCommonValue];

  const participatingForMostCommon = sources
    .filter(s => s.value === mostCommonValue)
    .map(s => s.key);

  const confidence = mostCommonCount > sources.length / 2 ? "high" : "medium";

  return {
    agreed: mostCommonCount > 1,
    value: mostCommonValue,
    confidence,
    participatingSources: sources.map(s => s.key),
  };
}

