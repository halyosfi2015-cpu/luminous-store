/* Honest rating helpers — no fabricated values.
   Ratings/counts are only reported when backed by real data:
   1) A non-empty `reviews` array on the item itself.
   2) Real written reviews in the reviews registry (src/data/reviews.ts).
   3) An explicit `rating` / `reviewCount` field on the item.
   Never invents pseudo-random numbers. */

import type { ProductReview } from "@/types/product";
import { reviewsByProductId } from "@/src/data/reviews";

type RatingItem = {
  id?: string;
  rating?: number;
  reviewCount?: number;
  reviews?: ProductReview[];
  buyersCount?: number;
  buyers?: number;
  purchaseCount?: number;
};

function registryReviews(item: RatingItem): ProductReview[] | null {
  if (!item || typeof item !== "object") return null;
  const reviews = reviewsByProductId[item.id ?? ""];
  return reviews && reviews.length > 0 ? reviews : null;
}

function realReviews(item: RatingItem): ProductReview[] | null {
  if (Array.isArray(item?.reviews) && item.reviews.length > 0) return item.reviews;
  return registryReviews(item);
}

export function normalizeRating(r?: number) {
  if (typeof r !== "number" || isNaN(r)) return 0;
  return Math.round(Math.max(0, Math.min(5, r)) * 10) / 10;
}

export function normalizeReviewCount(c?: number) {
  if (typeof c !== "number" || isNaN(c) || c < 0) return 0;
  return Math.round(c);
}

/* Real rating for an item, or 0 when none is available. */
export function safeRatingDisplay(productOrRating: number | RatingItem | null | undefined): number {
  if (typeof productOrRating === "number") return normalizeRating(productOrRating);
  if (!productOrRating) return 0;

  const reviews = realReviews(productOrRating);
  if (reviews) {
    const avg = reviews.reduce((sum: number, r) => sum + (r.rating ?? 0), 0) / reviews.length;
    return normalizeRating(avg);
  }

  return normalizeRating(productOrRating?.rating);
}

/* Real review count, or 0 when none is available. */
export function safeReviewCountDisplay(productOrCount: number | RatingItem | null | undefined): number {
  if (typeof productOrCount === "number") return normalizeReviewCount(productOrCount);
  if (!productOrCount) return 0;

  const reviews = realReviews(productOrCount);
  if (reviews) return normalizeReviewCount(reviews.length);

  return normalizeReviewCount(productOrCount?.reviewCount);
}

/* True only when the item is backed by actual review entries. */
export function hasRealRatings(item: RatingItem | null | undefined): boolean {
  if (!item) return false;
  return realReviews(item) !== null;
}

/* Buyers count: only a genuine numeric field is reported, otherwise 0. */
export function normalizeBuyersCount(c?: number) {
  if (typeof c !== "number" || isNaN(c) || c < 0) return 0;
  return Math.round(c);
}

export function safeBuyersDisplay(productOrCount: number | RatingItem | null | undefined) {
  const c = typeof productOrCount === "number" ? productOrCount : productOrCount?.buyersCount || productOrCount?.buyers || productOrCount?.purchaseCount;
  return normalizeBuyersCount(c);
}
