"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Star, Eye, EyeOff, BadgeCheck } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/admin/ui/States";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { useAdminData } from "@/src/admin/AdminDataProvider";
import type { AdminReview } from "@/src/admin/types";

const RATING_FILTERS = [0, 5, 4, 3, 2, 1];

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} من 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`h-4 w-4 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-border"}`}
        />
      ))}
      <span className="ms-1 text-xs text-muted">{rating}</span>
    </span>
  );
}

export default function ReviewsAdmin() {
  const { services } = useAdminData();
  const { toast } = useAdminToast();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [rating, setRating] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/reviews");
        const list = res.ok ? await res.json() : await services.getReviews();
        if (!cancelled) {
          setReviews(list);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [services, reloadKey]);

  const retry = useCallback(() => {
    setError(false);
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  const toggleStatus = async (review: AdminReview) => {
    const nextStatus = review.status === "visible" ? "hidden" : "visible";
    setReviews((prev) =>
      prev.map((item) =>
        item.id === review.id ? { ...item, status: nextStatus } : item,
      ),
    );
    await services.updateReviewStatus(review.id, nextStatus);
    fetch(`/api/admin/reviews/${review.id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast(
          nextStatus === "visible" ? "تم إظهار التقييم" : "تم إخفاء التقييم",
          "success",
        );
      })
      .catch(() => {
        toast("حدث خطأ أثناء تحديث التقييم", "error");
      });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews.filter((review) => {
      if (rating > 0 && review.rating !== rating) return false;
      if (!q) return true;
      return (
        review.customerName.toLowerCase().includes(q) ||
        review.productNameAr.toLowerCase().includes(q) ||
        review.comment.toLowerCase().includes(q)
      );
    });
  }, [reviews, query, rating]);

  const visibleCount = reviews.filter((review) => review.status === "visible").length;

  if (loading) return <LoadingState label="جارٍ تحميل التقييمات..." />;
  if (error) {
    return (
      <ErrorState
        title="تعذر تحميل التقييمات"
        description="حدث خطأ أثناء جلب البيانات المحلية."
        onRetry={retry}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">التقييمات والمراجعات</h1>
        <p className="mt-1 text-sm text-muted">
          {reviews.length} مراجعة — {visibleCount} ظاهرة. التعديلات تُحفظ محلياً (Phase 5)؛
          التغيير الدائم في بيانات المنتجات يتطلب قاعدة بيانات (Phase 6).
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث باسم العميل أو المنتج أو النص..."
            className="w-full rounded-xl border border-border bg-white ps-9 pe-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          {RATING_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className={`rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors ${
                rating === value
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-white text-muted hover:border-primary/40"
              }`}
            >
              {value === 0 ? "الكل" : `${value} ★`}
            </button>
          ))}
        </div>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          title="لا توجد تقييمات"
          description="ستظهر تقييمات العملاء هنا عند توفرها على المنتجات."
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="لا توجد نتائج مطابقة" description="جرّب تغيير البحث أو الفلتر." />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((review) => (
            <Card key={review.id} padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {review.customerName.charAt(0)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      {review.customerName}
                      {review.isVerified && (
                        <BadgeCheck className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {review.productNameAr}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RatingStars rating={review.rating} />
                  <Badge variant={review.status === "visible" ? "success" : "neutral"}>
                    {review.status === "visible" ? "ظاهرة" : "مخفية"}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => toggleStatus(review)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                      review.status === "visible"
                        ? "border-border bg-white text-muted hover:border-error/40 hover:text-error"
                        : "border-primary bg-primary text-white hover:bg-primary-700"
                    }`}
                  >
                    {review.status === "visible" ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    {review.status === "visible" ? "إخفاء" : "إظهار"}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                {review.comment}
              </p>
              <div className="mt-3 text-xs text-muted">
                {new Date(review.date).toLocaleDateString("ar-YE")}
                {review.helpfulCount > 0 && ` — مفيد لـ ${review.helpfulCount} شخص`}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
