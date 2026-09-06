export interface SizeValue {
  value: number;
  unit: 'ml' | 'g' | 'mg' | 'count' | 'spf' | 'pack';
  pack?: [number, number];
}

export interface ProductIdentity {
  brand: string | null;
  productLine: string | null;
  productType: string[];
  variant: string | null;
  size: SizeValue[];
  tokens: string[];
}

export interface BrandMatchResult {
  score: number | null;
  canonicalA: string | null;
  canonicalB: string | null;
  rawA: string | null;
  rawB: string | null;
}

export type SizeMatchResult = 'exact' | 'close' | 'partial' | 'mismatch' | 'unknown';

export type MatchDecision = 'CONFIRMED' | 'NEEDS_REVIEW' | 'REJECT';

export interface MatchSignals {
  jaccard: number;
  containment: number;
  composite_score: number;
  brand_token: string;
  type_luminous: string[];
  type_outlet: string[];
  size_luminous: SizeValue[];
  size_outlet: SizeValue[];
}

export interface MatchRecord {
  luminous_id: string;
  outlet_reference: string;
  outlet_nameAr: string;

  brandMatch: number | null;
  nameSimilarity: number;
  productLineMatch: number | null;
  variantMatch: boolean;
  variantConflict: boolean;
  sizeMatch: SizeMatchResult;
  imageMatch: null;

  decision: MatchDecision;
  confidence: number;
  reason: string;

  signals: MatchSignals;
}

export interface MatchReport {
  generatedAt: string;
  totals: {
    total_luminous: number;
    total_outlet: number;
    candidate_pairs: number;
    confirmed: number;
    needs_review: number;
    rejected: number;
    unique_luminous_matched: number;
    unique_outlet_matched: number;
  };
  examples: {
    confirmed_top: MatchRecord[];
    needs_review_top: MatchRecord[];
    reject_brand_conflict: MatchRecord[];
    reject_size_mismatch: MatchRecord[];
    reject_variant_conflict: MatchRecord[];
    brand_unknown: MatchRecord[];
  };
  comparison: {
    unified_confirmed: number;
    reconcile_high: number;
    match_final_confirmed: number;
    match_comprehensive_confirmed: number;
  };
}
