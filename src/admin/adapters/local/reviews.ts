import { products } from "@/src/data/products";
import type { AdminReview, AdminReviewStatus } from "../../types";

export const REVIEWS_STORAGE_KEY = "luminous-reviews-overrides";

type ReviewOverride = { status: AdminReviewStatus };

function loadOverrides(): Record<string, ReviewOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, ReviewOverride>;
  } catch {}
  return {};
}

function saveOverrides(overrides: Record<string, ReviewOverride>) {
  try {
    window.localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(overrides));
  } catch {}
}

export function listReviews(): AdminReview[] {
  const overrides = loadOverrides();
  const reviews: AdminReview[] = [];
  for (const product of products) {
    for (const review of product.reviews ?? []) {
      const override = overrides[review.id];
      reviews.push({
        id: review.id,
        productId: product.id,
        productNameAr: product.name.ar,
        productNameEn: product.name.en,
        customerName: review.customerNameAr ?? review.customerName,
        rating: review.rating,
        comment: review.commentAr ?? review.comment,
        date: review.date,
        isVerified: review.isVerified,
        helpfulCount: review.helpfulCount ?? 0,
        status: override?.status ?? "visible",
      });
    }
  }
  return reviews;
}

export function setReviewStatus(id: string, status: AdminReviewStatus) {
  const overrides = loadOverrides();
  overrides[id] = { status };
  saveOverrides(overrides);
}
