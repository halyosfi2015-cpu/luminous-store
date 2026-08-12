"use client";

import { Star, ShieldCheck, ThumbsUp, MessageCircle } from "lucide-react";
import type { ProductReview } from "@/types/product";

type ProductReviewsProps = {
  reviews: ProductReview[];
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`التقييم ${rating} من 5 نجوم`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          aria-hidden="true"
          className={i < rating ? "fill-accent text-accent" : "text-border-strong"}
        />
      ))}
    </div>
  );
}

export default function ProductReviews({ reviews }: ProductReviewsProps) {
  if (reviews.length === 0) {
    return (
      <section className="mt-12">
        <h2 className="mb-6 text-xl font-bold text-foreground">تقييمات العملاء</h2>
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-card border border-border bg-card">
          <MessageCircle size={40} className="text-border-strong" />
          <p className="mt-3 text-sm text-muted">لا توجد تقييمات بعد</p>
          <p className="text-xs text-muted mt-1">كن أول من يقيم هذا المنتج</p>
        </div>
      </section>
    );
  }

  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">تقييمات العملاء</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <Star size={16} className="fill-accent text-accent" />
            <span className="text-sm font-semibold text-foreground">{averageRating.toFixed(1)}</span>
          </div>
          <span className="text-sm text-muted">({reviews.length} {reviews.length === 1 ? "تقييم" : "تقييمات"})</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-card border border-border bg-card p-5 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {review.customerNameAr?.[0] || review.customerName[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{review.customerNameAr || review.customerName}</p>
                  <p className="text-[11px] text-muted">{review.date}</p>
                </div>
              </div>
              {review.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success-soft border border-success-border px-2 py-0.5 text-[11px] font-medium text-success-fg">
                  <ShieldCheck size={11} />
                  مشتراة
                </span>
              )}
            </div>
            <StarRating rating={review.rating} />
            <p className="mt-2 text-sm text-muted leading-relaxed">{review.commentAr || review.comment}</p>
            {review.helpfulCount !== undefined && review.helpfulCount > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                <ThumbsUp size={12} />
                <span>{review.helpfulCount} {review.helpfulCount === 1 ? "شخص" : "أشخاص"} وجدوا هذا التقييم مفيداً</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
