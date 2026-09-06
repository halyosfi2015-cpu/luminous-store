import type { SizeMatchResult, MatchDecision } from './types';

export interface ScoreInput {
  brandMatch: number | null;
  nameSimilarity: number;
  productTypeScore: number;
  sizeMatchResult: SizeMatchResult;
  productLineScore: number;
  imageMatch: null;
  variantConflict: boolean;
}

export interface ScoreOutput {
  baseScore: number;
  decision: MatchDecision;
  confidence: number;
  reason: string;
}

function sizeToScore(s: SizeMatchResult): number {
  switch (s) {
    case 'exact': return 3;
    case 'close': return 2;
    case 'partial': return 1;
    case 'mismatch': return 0;
    case 'unknown': return 0;
  }
}

export function computeScore(input: ScoreInput): ScoreOutput {
  let base = 0;
  const reasons: string[] = [];

  // brandMatch (0-3)
  if (input.brandMatch !== null) base += input.brandMatch;
  if (input.brandMatch === 3) reasons.push('brand_exact');
  else if (input.brandMatch === 2) reasons.push('brand_alias');
  else if (input.brandMatch === 1) reasons.push('brand_partial');
  else if (input.brandMatch === 0) reasons.push('brand_conflict');

  // nameSimilarity (0-3)
  const namePts = Math.min(3, Math.round(input.nameSimilarity * 3));
  base += namePts;
  if (input.nameSimilarity >= 0.7) reasons.push('name_high');
  else if (input.nameSimilarity >= 0.4) reasons.push('name_medium');
  else if (input.nameSimilarity > 0) reasons.push('name_low');

  // productType (0-2)
  base += input.productTypeScore;
  if (input.productTypeScore === 2) reasons.push('type_exact');
  else if (input.productTypeScore === 1) reasons.push('type_related');

  // sizeMatch (0-3)
  const sizePts = sizeToScore(input.sizeMatchResult);
  base += sizePts;
  if (input.sizeMatchResult === 'exact') reasons.push('size_exact');
  else if (input.sizeMatchResult === 'close') reasons.push('size_close');
  else if (input.sizeMatchResult === 'partial') reasons.push('size_partial');
  else if (input.sizeMatchResult === 'mismatch') reasons.push('size_mismatch');

  // productLine (0-2)
  base += input.productLineScore;
  if (input.productLineScore >= 2) reasons.push('line_high');
  else if (input.productLineScore >= 1) reasons.push('line_medium');

  // imageMatch (0-3 or null — don't add)
  // variantConflict → -4
  if (input.variantConflict) {
    base -= 4;
    reasons.push('variant_conflict_penalty');
  }

  // brand conflict cap
  if (input.brandMatch === 0) {
    if (base > 4) {
      base = 4;
      reasons.push('brand_conflict_cap');
    }
  }

  // name-only penalty
  if (input.brandMatch === null && input.nameSimilarity < 2 / 3) {
    if (base > 5) {
      base = 5;
      reasons.push('name_only_cap');
    }
  }

  // Decision logic
  let decision: MatchDecision;
  if (
    input.brandMatch !== null &&
    input.brandMatch >= 2 &&
    input.productTypeScore >= 1 &&
    input.sizeMatchResult !== 'mismatch' &&
    !input.variantConflict &&
    input.brandMatch !== 0 &&
    input.nameSimilarity > 0 &&
    base >= 12
  ) {
    decision = 'CONFIRMED';
  } else if (base < 5) {
    decision = 'REJECT';
  } else if (
    input.brandMatch === 0 ||
    input.variantConflict ||
    input.sizeMatchResult === 'mismatch'
  ) {
    decision = 'REJECT';
  } else {
    decision = 'NEEDS_REVIEW';
  }

  // Confidence
  const maxPossible = 13;
  const brandMult = input.brandMatch === null ? 0.6 : input.brandMatch >= 2 ? 1.0 : input.brandMatch === 1 ? 0.8 : 0.5;
  const sizeMult = input.sizeMatchResult === 'exact' ? 1.0 : input.sizeMatchResult === 'close' ? 0.9 : input.sizeMatchResult === 'partial' ? 0.8 : 0.7;
  const confidence = Math.min(1, (base / maxPossible) * brandMult * sizeMult);

  return {
    baseScore: base,
    decision,
    confidence: Math.round(confidence * 100) / 100,
    reason: reasons.join(' + '),
  };
}
