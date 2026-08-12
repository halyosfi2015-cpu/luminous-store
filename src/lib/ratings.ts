export function normalizeRating(r?: number) {
  let rating = typeof r === "number" && !isNaN(r) ? r : 4.7;
  // clamp to realistic range 4.6 - 5.0 and round to 1 decimal
  rating = Math.max(4.6, Math.min(5.0, rating));
  return Math.round(rating * 10) / 10;
}

export function normalizeReviewCount(c?: number) {
  if (!c || typeof c !== "number") return 8; // default
  if (c < 5) return 8;
  if (c > 25) return 25;
  return Math.round(c);
}

type RatingSource = number | { rating?: number } | null | undefined;
type ReviewCountSource = number | { reviewCount?: number } | null | undefined;

export function safeRatingDisplay(productOrRating: RatingSource) {
  const r = typeof productOrRating === "number" ? productOrRating : productOrRating?.rating;
  return normalizeRating(r);
}

export function safeReviewCountDisplay(productOrCount: ReviewCountSource) {
  const c = typeof productOrCount === "number" ? productOrCount : productOrCount?.reviewCount;
  return normalizeReviewCount(c);
}
