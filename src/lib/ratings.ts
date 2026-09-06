export function normalizeRating(r?: number) {
  if (r === undefined || r === null) return undefined;
  // pass-through: show real DB value, no clamping, no fabrication
  return Math.round(r * 10) / 10;
}

export function normalizeReviewCount(c?: number) {
  if (c === undefined || c === null) return undefined;
  // pass-through: show real DB value, no clamping, no fabrication
  return Math.round(c);
}

export function normalizeBuyerCount(c?: number) {
  if (c === undefined || c === null) return undefined;
  // pass-through: show real DB value, no fabrication
  return Math.round(c);
}

type RatingSource = number | { rating?: number } | null | undefined;
type ReviewCountSource = number | { reviewCount?: number } | null | undefined;
type BuyerCountSource = number | { buyersCount?: number } | null | undefined;

export function safeRatingDisplay(productOrRating: RatingSource) {
  const r = typeof productOrRating === "number" ? productOrRating : productOrRating?.rating;
  if (r === undefined || r === null) return "";
  return normalizeRating(r);
}

export function safeReviewCountDisplay(productOrCount: ReviewCountSource) {
  const c = typeof productOrCount === "number" ? productOrCount : productOrCount?.reviewCount;
  if (c === undefined || c === null) return "";
  return normalizeReviewCount(c);
}

export function safeBuyersDisplay(productOrCount: BuyerCountSource) {
  const c = typeof productOrCount === "number" ? productOrCount : productOrCount?.buyersCount;
  if (c === undefined || c === null) return "";
  return normalizeBuyerCount(c);
}
