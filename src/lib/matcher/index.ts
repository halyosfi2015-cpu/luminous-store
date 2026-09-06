export { matchProducts } from './matcher';
export type { MatchRecord, MatchReport, MatchDecision, SizeMatchResult, SizeValue, ProductIdentity, BrandMatchResult, MatchSignals } from './types';
export { initBrandResolver, resolveBrandMatch, extractBrandFromText, getCanonicalSlug } from './brand-resolver';
export { normalizeAr, normalizeEn, tokenize, tokenizeEn, jaccard, containment } from './normalize';
export { detectTypes, typeMatch, variantConflict } from './product-type';
export { extractSizes, sizeMatch } from './size-extract';
export { computeScore } from './scoring';
