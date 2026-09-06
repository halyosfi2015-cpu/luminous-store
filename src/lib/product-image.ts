/**
 * PART 5 — PRODUCT IMAGE SELECTION (CANONICAL PIPELINE)
 * =====================================================
 *
 * Deterministic, verified product-image selection for the REAL catalog.
 *
 * NOT "Yaqoot image → use image".
 * Instead:
 *   PRODUCT IDENTITY FACTS
 *     → GALLERY CANDIDATES
 *       → URL VALIDATION (image-url-normalizer)
 *         → SOURCE DETECTION (source-hierarchy)
 *           → IDENTITY / VARIANT / SIZE / SHADE / COUNT / SPF VALIDATION
 *             → QUALITY VALIDATION (placeholder/generic/broken)
 *               → RANKED SELECTION → DECISION (APPROVED / REVIEW_REQUIRED / REJECTED)
 *
 * Rules:
 *  - Reuses src/lib/source-hierarchy.ts — NO second hierarchy.
 *  - Reuses src/lib/image-url-normalizer.ts — NO second URL normalizer.
 *  - Yaqoot is NOT auto-preferred; it is retained only when it is the strongest
 *    verified source available.
 *  - Never fabricates/guesses image URLs.
 *  - Never claims a verified variant/size/shade/count match when the evidence
 *    is unavailable — that yields REVIEW_REQUIRED, not a silent pass.
 *  - A published product is NEVER silently accepted without a valid image.
 *
 * DRY-RUN / AUDIT MODE — this module never writes to the catalog.
 */

import type { Product } from "@/src/types/product";
import { products } from "@/src/data/products";
import { onlyPublished } from "@/src/lib/publication";
import { normalizeImageURL } from "@/src/lib/image-url-normalizer";
import { SOURCE_HIERARCHY } from "@/src/lib/source-hierarchy";
import { extractNameFacts, normalizeName } from "@/src/lib/product-name";

/* ------------------------------------------------------------------------ */
/* TYPES                                                                     */
/* ------------------------------------------------------------------------ */

export type ImageStatus = "APPROVED" | "REVIEW_REQUIRED" | "REJECTED";
export type ImageAction = "retain" | "replace" | "review" | "blocked";

export interface ImageFacts {
  brand: string | undefined;
  brandAr: string | undefined;
  productType: string | undefined; // categorySlug
  productTypeAr: string | undefined;
  size: string | undefined;
  shade: string | undefined;
  variant: string | undefined;
  count: string | undefined;
  spf: string | undefined;
  formulation: string | undefined;
}

export interface ClaimedIdentity {
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

export type IdentityBinding = "localFilename" | "listingAssociation" | "claimed";

export interface ImageSourceData {
  url: string;
  /** Explicit hierarchy key (e.g. "manufacturer", "trustedRetailer", "yaqoot"). */
  sourceKey?: string;
  /** What the source claims the image depicts — used for verification. */
  claimed?: ClaimedIdentity;
  /** Evidence type that binds the image to the product identity. */
  identityBinding?: IdentityBinding;
}

export interface ImageCandidate {
  url: string;
  normalizedUrl: string | null;
  sourceKey: string;
  sourceLabel: string;
  sourceRank: number;
  identityMatched: boolean;
  identityConfidence: "high" | "medium" | "low";
  variantMatch: boolean | null;
  sizeMatch: boolean | null;
  shadeMatch: boolean | null;
  countMatch: boolean | null;
  spfMatch: boolean | null;
  qualityValid: boolean;
  qualityIssues: string[];
  score: number;
  reason: string;
}

export interface ImageDecision {
  productId: string;
  brand: string;
  productName: { ar: string; en: string };
  facts: ImageFacts;
  candidates: ImageCandidate[];
  selectedImage: string | null;
  selectedSource: string | null;
  selectedSourceKey: string | null;
  selectedRank: number | null;
  status: ImageStatus;
  confidence: number;
  action: ImageAction;
  reasons: string[];
  retainedGallery: string[];
  proposedPrimary: string | null;
}

export interface ImageAudit {
  products: { total: number; withValidImage: number; withoutValidImage: number };
  images: {
    inspected: number;
    retained: number;
    replaced: number;
    rejected: number;
    requiringReview: number;
    invalidUrls: number;
    malformedUrlsNormalized: number;
    placeholderOrGenericRejected: number;
    wrongVariantRejected: number;
    sizeMismatches: number;
    shadeMismatches: number;
    countMismatches: number;
    identityMismatches: number;
  };
  decisions: {
    approved: number;
    reviewRequired: number;
    rejected: number;
  };
  bySource: Record<string, number>;
}

/* ------------------------------------------------------------------------ */
/* URL / SOURCE HELPERS                                                      */
/* ------------------------------------------------------------------------ */

/** Validates a candidate URL. Local store assets ("/images/...") are valid; remote must pass the canonical normalizer. */
function normalizeCandidateUrl(url: string): string | null {
  if (typeof url !== "string") return null;
  const t = url.trim();
  if (!t) return null;
  if (t.startsWith("/")) return t; // local store asset
  if (/^https?:/i.test(t)) return normalizeImageURL(t);
  return null;
}

/** Detect the source of a URL from its host (or local asset). Reuses the canonical hierarchy. */
function detectSource(url: string): { key: string; rank: number; label: string } {
  if (url.startsWith("/")) {
    return { key: "storeAsset", rank: 1, label: "Local curated store asset" };
  }
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("yaqoot")) return { key: "yaqoot", rank: 7, label: "Yaqoot Store" };
    for (const layer of SOURCE_HIERARCHY) {
      if (host.includes(layer.key)) return { key: layer.key, rank: layer.rank, label: layer.label };
    }
  } catch {
    /* fall through */
  }
  return { key: "other", rank: 8, label: "Other trusted source" };
}

/** Source resolution honors an explicit sourceKey, else falls back to URL-host detection. */
function resolveSource(data: ImageSourceData, normalizedUrl: string | null): { key: string; rank: number; label: string } {
  if (data.sourceKey) {
    const layer = SOURCE_HIERARCHY.find((l) => l.key === data.sourceKey);
    if (layer) return { key: layer.key, rank: layer.rank, label: layer.label };
    if (data.sourceKey === "storeAsset") return { key: "storeAsset", rank: 1, label: "Local curated store asset" };
  }
  return detectSource(normalizedUrl ?? data.url);
}

const PLACEHOLDER_PATTERNS = /(placeholder|no[-_]?image|noimage|coming[-_ ]?soon|not[-_ ]?found|default[-_ ]?img|image[-_ ]?not[-_ ]?found|dummy|generic[-_ ]?thumb|thumb[-_ ]?default|category[-_ ]?banner|promo[-_ ]?banner|\b404\b)/i;

function isPlaceholderOrGeneric(url: string): boolean {
  return PLACEHOLDER_PATTERNS.test(url);
}

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|avif|svg|bmp)$/i;

/* ------------------------------------------------------------------------ */
/* FACTS                                                                     */
/* ------------------------------------------------------------------------ */

/** Product identity facts reused from the Part 4 fact extractor. */
export function buildImageFacts(product: Product): ImageFacts {
  const f = extractNameFacts(product);
  return {
    brand: f.brand,
    brandAr: f.brandAr,
    productType: f.productType,
    productTypeAr: f.productTypeAr,
    size: f.size,
    shade: f.shade,
    variant: f.variant,
    count: f.count,
    spf: f.spf,
    formulation: undefined,
  };
}

function fieldMatches(claimed: string | undefined, product: string | undefined): boolean | null {
  if (!product) return null; // not applicable — product has no such fact
  if (!claimed) return null; // unknown — source provides no evidence
  return normalizeName(claimed) === normalizeName(product);
}

/* ------------------------------------------------------------------------ */
/* CANDIDATE EVALUATION                                                      */
/* ------------------------------------------------------------------------ */

function evaluateCandidate(data: ImageSourceData, facts: ImageFacts): ImageCandidate {
  const normalizedUrl = normalizeCandidateUrl(data.url);
  const qualityIssues: string[] = [];

  if (!normalizedUrl) qualityIssues.push("invalid URL");
  else if (!IMAGE_EXT_RE.test(normalizedUrl)) qualityIssues.push("missing image extension");
  if (normalizedUrl && !normalizedUrl.startsWith("/") && isPlaceholderOrGeneric(normalizedUrl)) qualityIssues.push("generic/placeholder image pattern");

  const src = resolveSource(data, normalizedUrl);

  // Identity: claimed metadata (explicit) or binding evidence (real catalog)
  let identityMatched: boolean;
  let identityConfidence: "high" | "medium" | "low";
  let identityReason: string;

  if (data.identityBinding === "localFilename") {
    identityMatched = true;
    identityConfidence = "high";
    identityReason = "Local store asset filename binds image to product ID";
  } else if (data.identityBinding === "listingAssociation") {
    identityMatched = true;
    identityConfidence = "medium";
    identityReason = "Image attached to this product's source listing (identity binding)";
  } else {
    // Explicit claimed identity — verify field by field.
    const claimed = data.claimed ?? {};
    const checks = [
      fieldMatches(claimed.brand, facts.brand),
      fieldMatches(claimed.category, facts.productType),
      fieldMatches(claimed.size, facts.size),
      fieldMatches(claimed.shade, facts.shade),
      fieldMatches(claimed.variant, facts.variant),
      fieldMatches(claimed.count, facts.count),
      fieldMatches(claimed.spf, facts.spf),
    ];
    const matched = checks.filter((c) => c === true).length;
    const mismatched = checks.filter((c) => c === false).length;
    const unknown = checks.filter((c) => c === null).length;
    const totalMaterial = checks.filter((c) => c !== null).length;

    identityMatched = mismatched === 0 && (totalMaterial === 0 || matched >= Math.max(1, Math.ceil(totalMaterial / 2)));
    identityConfidence = totalMaterial === 0 ? "low" : mismatched === 0 && unknown === 0 ? "high" : matched >= totalMaterial / 2 ? "medium" : "low";
    identityReason = `claimed identity verified: ${matched} matched, ${mismatched} mismatched, ${unknown} unknown`;
  }

  // Variant / size / shade / count / spf matches from claimed evidence
  const claimed = data.claimed ?? {};
  const variantMatch = fieldMatches(claimed.variant, facts.variant);
  const sizeMatch = fieldMatches(claimed.size, facts.size);
  const shadeMatch = fieldMatches(claimed.shade, facts.shade);
  const countMatch = fieldMatches(claimed.count, facts.count);
  const spfMatch = fieldMatches(claimed.spf, facts.spf);

  // Deterministic score
  let score = 100;
  score -= (src.rank - 1) * 4; // weaker source lowers score
  if (!identityMatched) score -= 45;
  else if (identityConfidence === "medium") score -= 12;
  else if (identityConfidence === "low") score -= 25;
  for (const m of [variantMatch, sizeMatch, shadeMatch, countMatch, spfMatch]) {
    if (m === false) score -= 30; // confirmed mismatch — material
    else if (m === null && facts.size && (facts.variant || facts.shade || facts.count || facts.spf)) score -= 6; // unknown but material
  }
  if (qualityIssues.includes("invalid URL")) score -= 50;
  if (qualityIssues.includes("generic/placeholder image pattern")) score -= 50;
  if (qualityIssues.includes("missing image extension")) score -= 8;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const qualityValid = qualityIssues.length === 0;

  return {
    url: data.url,
    normalizedUrl,
    sourceKey: src.key,
    sourceLabel: src.label,
    sourceRank: src.rank,
    identityMatched,
    identityConfidence,
    variantMatch,
    sizeMatch,
    shadeMatch,
    countMatch,
    spfMatch,
    qualityValid,
    qualityIssues,
    score,
    reason: `${identityReason}; source ${src.label} (rank ${src.rank})`,
  };
}

/* ------------------------------------------------------------------------ */
/* SELECTION                                                                 */
/* ------------------------------------------------------------------------ */

function buildGalleryCandidates(product: Product): ImageSourceData[] {
  return (product.gallery ?? []).map((url) => {
    if (url.startsWith("/")) {
      const basename = url.split("/").pop() ?? "";
      return { url, identityBinding: basename.includes(product.id) ? "localFilename" : "listingAssociation" };
    }
    return { url, identityBinding: "listingAssociation" };
  });
}

export function selectProductImage(product: Product, externalCandidates?: ImageSourceData[]): ImageDecision {
  const facts = buildImageFacts(product);
  const sources = externalCandidates && externalCandidates.length > 0 ? externalCandidates : buildGalleryCandidates(product);
  const candidates = sources.map((s) => evaluateCandidate(s, facts));

  const ranked = [...candidates].sort((a, b) => b.score - a.score || a.sourceRank - b.sourceRank);
  const sortedCandidates = ranked;
  const valid = ranked.filter((c) => c.normalizedUrl !== null && c.qualityValid);
  const best = valid[0] ?? ranked[0] ?? null;

  const reasons: string[] = [];

  if (!best || !best.normalizedUrl) {
    return {
      productId: product.id,
      brand: product.brand,
      productName: product.name,
      facts,
      candidates: sortedCandidates,
      selectedImage: null,
      selectedSource: null,
      selectedSourceKey: null,
      selectedRank: null,
      status: "REJECTED",
      confidence: 0,
      action: "blocked",
      reasons: ["no valid image available — must not be published without a verified image"],
      retainedGallery: [],
      proposedPrimary: null,
    };
  }

  // Confirmed rejections — material mismatch first (specific reason), then identity
  if (best.qualityIssues.includes("generic/placeholder image pattern")) {
    return { ...decisionBase(product, facts, sortedCandidates, best), status: "REJECTED", confidence: best.score - 20, action: "blocked", reasons: ["generic/placeholder image rejected"], retainedGallery: [], proposedPrimary: null };
  }
  const materialFields: Array<{ label: string; match: boolean | null; fact: string | undefined }> = [
    { label: "variant", match: best.variantMatch, fact: facts.variant },
    { label: "size", match: best.sizeMatch, fact: facts.size },
    { label: "shade", match: best.shadeMatch, fact: facts.shade },
    { label: "count", match: best.countMatch, fact: facts.count },
    { label: "SPF", match: best.spfMatch, fact: facts.spf },
  ];
  const confirmedMismatch = materialFields.filter((f) => f.match === false);
  if (confirmedMismatch.length > 0) {
    const labels = confirmedMismatch.map((f) => f.label).join("/");
    return { ...decisionBase(product, facts, sortedCandidates, best), status: "REJECTED", confidence: best.score - 20, action: "blocked", reasons: [`confirmed ${labels} mismatch — image does not match the product variant`], retainedGallery: [], proposedPrimary: null };
  }
  if (!best.identityMatched) {
    return { ...decisionBase(product, facts, sortedCandidates, best), status: "REJECTED", confidence: best.score - 20, action: "blocked", reasons: ["identity mismatch — image does not correspond to the product"], retainedGallery: [], proposedPrimary: null };
  }

  // Material uncertainty: product carries a fact the image evidence cannot confirm → REVIEW_REQUIRED
  const uncertain = materialFields.filter((f) => f.fact && f.match !== true);
  let status: ImageStatus = "APPROVED";
  if (uncertain.length > 0) {
    status = "REVIEW_REQUIRED";
    reasons.push(`one or more material attributes (${uncertain.map((f) => f.label).join(", ")}) cannot be verified from image evidence`);
  }

  if (status === "APPROVED") {
    reasons.push(`selected ${best.sourceLabel} (rank ${best.sourceRank}) as the strongest verified available source`);
  }

  const originalPrimary = product.gallery?.[0] ?? null;
  const proposedPrimary = best.normalizedUrl ?? best.url;
  const action: ImageAction = status === "REVIEW_REQUIRED" ? "review" : originalPrimary === proposedPrimary ? "retain" : "replace";
  const retainedGallery = valid.map((c) => c.normalizedUrl ?? c.url);

  return {
    productId: product.id,
    brand: product.brand,
    productName: product.name,
    facts,
    candidates: sortedCandidates,
    selectedImage: best.normalizedUrl ?? best.url,
    selectedSource: best.sourceLabel,
    selectedSourceKey: best.sourceKey,
    selectedRank: best.sourceRank,
    status,
    confidence: best.score,
    action,
    reasons,
    retainedGallery,
    proposedPrimary,
  };
}

function decisionBase(product: Product, facts: ImageFacts, sortedCandidates: ImageCandidate[], best: ImageCandidate) {
  return {
    productId: product.id,
    brand: product.brand,
    productName: product.name,
    facts,
    candidates: sortedCandidates,
    selectedImage: best.normalizedUrl ?? best.url,
    selectedSource: best.sourceLabel,
    selectedSourceKey: best.sourceKey,
    selectedRank: best.sourceRank,
    action: "blocked" as ImageAction,
  };
}

/* ------------------------------------------------------------------------ */
/* AUDIT (DRY-RUN over the real catalog)                                     */
/* ------------------------------------------------------------------------ */

export function runImageAudit(): ImageAudit {
  const all = onlyPublished(products);
  const audit: ImageAudit = {
    products: { total: all.length, withValidImage: 0, withoutValidImage: 0 },
    images: {
      inspected: 0,
      retained: 0,
      replaced: 0,
      rejected: 0,
      requiringReview: 0,
      invalidUrls: 0,
      malformedUrlsNormalized: 0,
      placeholderOrGenericRejected: 0,
      wrongVariantRejected: 0,
      sizeMismatches: 0,
      shadeMismatches: 0,
      countMismatches: 0,
      identityMismatches: 0,
    },
    decisions: { approved: 0, reviewRequired: 0, rejected: 0 },
    bySource: {},
  };

  for (const product of all) {
    const decision = selectProductImage(product);
    audit.images.inspected += product.gallery?.length ?? 0;

    for (const c of decision.candidates) {
      if (c.normalizedUrl === null) audit.images.invalidUrls++;
      else if (c.normalizedUrl !== c.url) audit.images.malformedUrlsNormalized++;
      if (!c.qualityValid && c.qualityIssues.includes("generic/placeholder image pattern")) audit.images.placeholderOrGenericRejected++;
      if (c.variantMatch === false) audit.images.wrongVariantRejected++;
      if (c.sizeMatch === false) audit.images.sizeMismatches++;
      if (c.shadeMatch === false) audit.images.shadeMismatches++;
      if (c.countMatch === false) audit.images.countMismatches++;
      if (!c.identityMatched) audit.images.identityMismatches++;
    }

    if (decision.status === "REJECTED") {
      audit.decisions.rejected++;
      audit.products.withoutValidImage++;
    } else {
      audit.products.withValidImage++;
      audit.decisions[decision.status === "APPROVED" ? "approved" : "reviewRequired"]++;
      if (decision.action === "replace") audit.images.replaced++;
      else if (decision.action === "retain") audit.images.retained++;
      else if (decision.action === "review") audit.images.requiringReview++;
      const key = decision.selectedSourceKey ?? "unknown";
      audit.bySource[key] = (audit.bySource[key] ?? 0) + 1;
    }
  }

  return audit;
}

/* ------------------------------------------------------------------------ */
/* REAL EXAMPLES / DECISIONS                                                 */
/* ------------------------------------------------------------------------ */

export interface ImageSourceExample {
  productId: string;
  brand: string;
  productName: { ar: string; en: string };
  currentImage: string;
  currentSource: string;
  candidateSources: Array<{ source: string; rank: number; url: string }>;
  identityEvidence: string;
  variantEvidence: string;
  sizeEvidence: string;
  shadeEvidence: string;
  selectedImage: string;
  selectedSource: string;
  reason: string;
  confidence: number;
  finalStatus: string;
}

export interface ImageDecisionExample {
  productId: string;
  brand: string;
  productName: string;
  current: string;
  candidates: Array<{ url: string; source: string; rank: number }>;
  validation: string;
  selectedImage: string;
  selectedSource: string;
  reason: string;
  confidence: number;
  status: string;
}

const SAMPLE_IDS = ["yq-754", "yq-960", "yq-1680", "yq-2137", "yq-1051", "yq-2682", "yq-629", "yq-710", "yq-2051", "yq-129", "yq-460", "yq-1660"];

export function produceImageSourceExamples(limit = 6): ImageSourceExample[] {
  const all = onlyPublished(products);
  const samples = all.filter((p) => SAMPLE_IDS.includes(p.id)).slice(0, limit);
  return samples.map((product) => {
    const decision = selectProductImage(product);
    const best = decision.candidates.find((c) => c.normalizedUrl === decision.selectedImage) ?? decision.candidates[0];
    return {
      productId: product.id,
      brand: product.brand,
      productName: product.name,
      currentImage: product.gallery?.[0] ?? "none",
      currentSource: product.gallery?.[0]?.startsWith("/") ? "Local curated store asset" : "Yaqoot Store",
      candidateSources: decision.candidates.map((c) => ({ source: c.sourceLabel, rank: c.sourceRank, url: c.normalizedUrl ?? c.url })),
      identityEvidence: best ? best.reason : "none",
      variantEvidence: best ? (best.variantMatch === null ? "unverified" : best.variantMatch ? "matched" : "mismatch") : "n/a",
      sizeEvidence: best ? (best.sizeMatch === null ? "unverified" : best.sizeMatch ? "matched" : "mismatch") : "n/a",
      shadeEvidence: best ? (best.shadeMatch === null ? "unverified" : best.shadeMatch ? "matched" : "mismatch") : "n/a",
      selectedImage: decision.selectedImage ?? "none",
      selectedSource: decision.selectedSource ?? "none",
      reason: decision.reasons.join(" | "),
      confidence: decision.confidence,
      finalStatus: decision.status,
    };
  });
}

export function produceImageDecisions(limit = 10): ImageDecisionExample[] {
  const all = onlyPublished(products);
  return all.slice(0, limit).map((product) => {
    const decision = selectProductImage(product);
    return {
      productId: product.id,
      brand: product.brand,
      productName: product.name.ar,
      current: product.gallery?.[0] ?? "none",
      candidates: decision.candidates.map((c) => ({ url: c.normalizedUrl ?? c.url, source: c.sourceLabel, rank: c.sourceRank })),
      validation: decision.reasons.join(" | "),
      selectedImage: decision.selectedImage ?? "none",
      selectedSource: decision.selectedSource ?? "none",
      reason: decision.reasons.join(" | "),
      confidence: decision.confidence,
      status: decision.status,
    };
  });
}

export { SOURCE_HIERARCHY, normalizeImageURL };