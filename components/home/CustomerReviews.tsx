"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { Star, BadgeCheck, Quote, MessageSquareHeart } from "lucide-react"
import Container from "@/components/ui/Container"
import SectionTitle from "@/components/ui/SectionTitle"

/**
 * آراء عملائنا — real social proof.
 * Shows ONLY admin-approved reviews from the canonical reviews table
 * (via /api/content/reviews). If none are approved, renders nothing —
 * we never fabricate testimonials.
 */

type CustomerReview = {
  id: string
  customerName: string
  avatar?: string
  rating: number
  comment: string
  date?: string
  verifiedPurchase: boolean
  helpfulCount: number
  product: { slug: string; nameAr: string } | null
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} من 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}
        />
      ))}
    </div>
  )
}

export default function CustomerReviews() {
  const [reviews, setReviews] = useState<CustomerReview[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/content/reviews", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) {
          const list = Array.isArray(d?.reviews) ? d.reviews : []
          setReviews(
            list.filter(
              (r: CustomerReview) => r.comment && r.customerName && r.rating >= 1 && r.rating <= 5
            )
          )
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded || reviews.length === 0) return null

  return (
    <section id="customer-reviews" className="w-full scroll-mt-28 bg-white py-8 sm:py-10 lg:py-12">
      <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow={
            <>
              <span className="h-0.5 w-6 rounded-pill bg-accent" />
              صوت عملائنا
            </>
          }
          title="آراء عملائنا"
          subtitle="تجارب حقيقية من مجتمع Luminous Derma"
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-white px-3.5 py-1.5 text-xs font-bold text-primary">
              <MessageSquareHeart size={13} className="text-accent" />
              مراجعات موثّقة ومُعتمدة
            </span>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.slice(0, 6).map((review) => (
            <article
              key={review.id}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5"
            >
              <Quote size={40} className="pointer-events-none absolute -top-1 end-4 rotate-180 text-primary/[0.06]" />

              <div className="flex items-center justify-between">
                <Stars rating={review.rating} />
                {review.verifiedPurchase && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                    <BadgeCheck size={11} />
                    شراء موثّق
                  </span>
                )}
              </div>

              <p className="mt-4 flex-1 text-sm leading-relaxed text-gray-600 line-clamp-4">
                “{review.comment}”
              </p>

              <div className="mt-5 flex items-center gap-3 border-t border-gray-50 pt-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
                  {review.customerName.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">{review.customerName}</p>
                  {review.product ? (
                    <Link
                      href={`/products/${review.product.slug}`}
                      className="mt-0.5 block truncate text-[11px] text-muted transition-colors hover:text-primary"
                    >
                      عن منتج: {review.product.nameAr}
                    </Link>
                  ) : (
                    review.date && <p className="mt-0.5 text-[11px] text-muted">{review.date}</p>
                  )}
                </div>
              </div>

              <span
                aria-hidden
                className="absolute inset-x-6 bottom-0 h-[2px] origin-center scale-x-0 rounded-full bg-gradient-to-l from-primary via-accent to-primary transition-transform duration-500 group-hover:scale-x-100"
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
