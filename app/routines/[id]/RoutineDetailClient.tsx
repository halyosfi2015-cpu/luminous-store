"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProductImage from "@/components/product/ProductImage";
import {
  ChevronLeft,
  Star,
  ShoppingCart,
  Clock,
  Users,
  Check,
  ArrowRight,
  Shield,
  Trash2,
  RotateCcw,
} from "lucide-react";
import Container from "@/components/ui/Container";
import { useLang } from "@/lib/use-lang";
import { productSummaries as products } from "@/src/data/product-summaries";
import { safeRatingDisplay } from "@/lib/ratings";
import { getRoutines, getRoutineById, getPrimaryImage } from "@/src/data/routines-store";
import { useCart } from "@/context/CartContext";
import type { Routine, RoutineStep, ProductSummary } from "@/src/types/product";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";

function formatPrice(amount: number): string {
  return amount.toLocaleString("ar-YE");
}
/* ================================================================================================ */
/* STEP TIME BADGE                          */
/* ================================================================================================ */
function TimeBadge({ time, isAr }: { time: RoutineStep["time"]; isAr: boolean }) {
  const labels: Record<string, { ar: string; en: string; color: string }> = {
    morning: { ar: "صباحاً", en: "Morning", color: "bg-amber-100 text-amber-700" },
    evening: { ar: "مساءً", en: "Evening", color: "bg-indigo-100 text-indigo-700" },
    both: { ar: "صباحاً ومساءً", en: "AM & PM", color: "bg-gray-100 text-gray-700" },
  };
  const l = labels[time] || labels.both;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${l.color}`}>
      {isAr ? l.ar : l.en}
    </span>
  );
}
/* ================================================================================================ */
/* PRODUCT STEP CARD                        */
/* ================================================================================================ */
function ProductStepCard({
  step,
  index,
  isAr,
}: {
  step: RoutineStep;
  index: number;
  isAr: boolean;
}) {
  const { addItem, items } = useCart();
  const product = products.find((p) => p.id === step.productId);
  const inCart = items.some((item) => item.productId === step.productId);

  if (!product) return null;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Step number badge */}
      <div className="absolute top-3 start-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white shadow-lg">
        {index + 1}
      </div>

      {/* Time badge */}
      <div className="absolute top-3 end-3 z-10">
        <TimeBadge time={step.time} isAr={isAr} />
      </div>

      {/* Image */}
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-gray-50"
      >
        {getPrimaryImage(product) && (
          <ProductImage
            src={getPrimaryImage(product)}
            alt={product.name.ar}
            productId={product.id}
            hoverZoom
            pedestal={false}
            className="absolute inset-0"
            sizes="(max-width:640px) 50vw, 25vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </Link>

      {/* Content */}
      <div className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
          {isAr ? step.titleAr : step.titleEn}
        </p>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {isAr ? product.brandAr || product.brand : product.brand}
        </p>
        <Link
          href={`/products/${product.slug}`}
          className="mt-1 block line-clamp-2 text-[13px] font-semibold leading-snug text-gray-800 transition-colors hover:text-primary"
        >
          {product.name.ar}
        </Link>
        <p className="mt-1 text-[11px] text-gray-400 line-clamp-1">
          {isAr ? step.descriptionAr : step.descriptionEn}
        </p>

        {/* Rating */}
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, j) => (
              <Star
                key={j}
                size={10}
                className={
                  j < Math.floor(safeRatingDisplay(product))
                    ? "fill-amber-400 text-amber-400"
                    : "text-gray-200"
                }
              />
            ))}
          </div>
          <span className="text-[10px] text-gray-400">({safeRatingDisplay(product)})</span>
        </div>

        {/* Price + Cart */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-extrabold text-gray-900">
            {formatPrice(product.pricing.price)}
            <span className="me-1 text-[10px] font-normal text-gray-400">
              {isAr ? "ر.ي" : "YER"}
            </span>
          </span>
          <button
            type="button"
            onClick={() =>
              addItem({
                productId: product.id,
                slug: product.slug,
                name: product.name.en,
                nameAr: product.name.ar,
                price: product.pricing.price,
                image: getPrimaryImage(product) || "",
                quantity: 1,
                inStock: product.inStock ?? true,
              })
            }
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white transition-all duration-200 hover:bg-primary hover:shadow-md active:scale-90"
          >
            {inCart ? <Check size={14} /> : <ShoppingCart size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
/* ================================================================================================ */
/* SIMILAR ROUTINES                         */
/* ================================================================================================ */
function SimilarRoutines({
  currentId,
  isAr,
}: {
  currentId: string;
  isAr: boolean;
}) {
  const [others, setOthers] = useState<Routine[]>(() => {
    const all = getRoutines();
    const sameType = all.filter((r) => r.id !== currentId && r.active && r.type);
    const related = sameType.length >= 3 ? sameType : all.filter((r) => r.id !== currentId && r.active);
    return related.slice(0, 3);
  });
  const [prevId, setPrevId] = useState(currentId);
  if (currentId !== prevId) {
    setPrevId(currentId);
    const all = getRoutines();
    const sameType = all.filter((r) => r.id !== currentId && r.active && r.type);
    const related = sameType.length >= 3 ? sameType : all.filter((r) => r.id !== currentId && r.active);
    setOthers(related.slice(0, 3));
  }

  useEffect(() => {
    if (others.length > 0) {
      trackClient({
        event_type: ANALYTICS_EVENT_TYPES.RECOMMENDATION_IMPRESSION,
        properties: {
          type: "routine_based",
          routine_ids: others.map((r) => r.id),
          count: others.length,
          source: "similar_routines",
        },
      });
    }
  }, [others]);

  if (others.length === 0) return null;

  return (
    <section className="mt-16 border-t border-gray-100 pt-12">
      <h2 className="mb-6 text-xl font-extrabold text-gray-900">
        {isAr ? "روتينات مشابهة" : "Similar Routines"}
      </h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {others.map((r) => {
          const rProducts = r.products
            .map((id) => products.find((p) => p.id === id))
            .filter((p): p is ProductSummary => Boolean(p));
          const total = rProducts.reduce(
            (s, p) => s + (p.pricing?.price || 0),
            0
          );
          const disc = Math.round(total * (1 - r.savingsPercent / 100));
          return (
            <Link
              key={r.id}
              href={`/routines/${r.id}`}
              onClick={() => {
                trackClient({
                  event_type: ANALYTICS_EVENT_TYPES.RECOMMENDATION_CLICK,
                  entity_type: "routine",
                  entity_id: r.id,
                  properties: {
                    type: "routine_based",
                    source: "similar_routines",
                  },
                });
              }}
              className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Avatar stack */}
              <div className="flex -space-x-2">
                {rProducts.slice(0, 3).map(
                  (p, i) =>
                    p.gallery?.[0] && (
                      <div
                        key={i}
                        className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-gray-100 shadow-sm"
                      >
                        <ProductImage
                          src={getPrimaryImage(p)}
                          alt={r.nameAr}
                          productId={r.id}
                          variant="soft"
                          hoverZoom={false}
                          pedestal={false}
                          className="absolute inset-0"
                          sizes="48px"
                        />
                      </div>
                    )
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-primary">
                  {r.nameAr}
                </h3>
                <p className="text-[11px] text-gray-400 line-clamp-1">
                  {r.descriptionAr}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs font-extrabold text-gray-900">
                    {formatPrice(disc)} {isAr ? "ر.ي" : "YER"}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600">
                    {isAr ? `${r.savingsPercent}% توفير` : `Save ${r.savingsPercent}%`}
                  </span>
                </div>
              </div>
              <ChevronLeft
                size={16}
                className="shrink-0 text-gray-300 transition-all duration-200 group-hover:-translate-x-1 group-hover:text-primary"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
/* ================================================================================================ */
/* MAIN PAGE                                */
/* ================================================================================================ */
export default function RoutineDetailClient({
  routine,
}: {
  routine: Routine;
}) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { addItem, items, removeItem } = useCart();
  const [addedAll, setAddedAll] = useState(false);
  const [currentRoutine, setCurrentRoutine] = useState<Routine>(() => getRoutineById(routine.id) ?? routine);
  const [prevRoutineId, setPrevRoutineId] = useState(routine.id);

  useEffect(() => {
    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.ROUTINE_VIEW,
      entity_type: "routine",
      entity_id: routine.id,
      properties: { slug: routine.id, name: routine.nameAr },
    });
  }, [routine.id, routine.nameAr]);
  if (routine.id !== prevRoutineId) {
    setPrevRoutineId(routine.id);
    const fresh = getRoutineById(routine.id);
    if (fresh) setCurrentRoutine(fresh);
  }

   const routineProducts = currentRoutine.products
     .map((id) => products.find((p) => p.id === id))
     .filter(Boolean) as typeof products;

   const totalPrice = routineProducts.reduce(
    (sum, p) => sum + (p.pricing?.price || 0),
    0
  );
  const discountedPrice = Math.round(
    totalPrice * (1 - currentRoutine.savingsPercent / 100)
  );
  const savings = totalPrice - discountedPrice;

  const handleAddAll = () => {
    routineProducts.forEach((p) => {
      const alreadyInCart = items.some((item) => item.productId === p.id);
      if (!alreadyInCart) {
        addItem({
          productId: p.id,
          slug: p.slug,
          name: p.name.en,
          nameAr: p.name.ar,
          price: p.pricing.price,
          image: getPrimaryImage(p) || "",
          quantity: 1,
          inStock: p.inStock ?? true,
        });
      }
    });
    setAddedAll(true);
    setTimeout(() => setAddedAll(false), 2500);
  };

  return (
    <div dir="rtl" className="w-full pb-16">
      {/* ── HERO — Branded background (no product images) ── */}
      <div className="relative h-72 overflow-hidden sm:h-96 lg:h-[480px]">
        <div className="absolute inset-0 overflow-hidden">
          {/* soft radial shapes */}
          <div className="absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-accent/8 blur-3xl" />
          <div className="absolute -right-10 top-1/3 h-96 w-96 rounded-full bg-accent/6 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-secondary/10 blur-3xl" />
          <div className="absolute left-1/4 top-1/2 h-32 w-32 rounded-full bg-accent/6 blur-2xl" />
          <div className="absolute -right-32 bottom-1/4 h-80 w-80 rounded-full bg-accent/8 blur-3xl" />

          {/* subtle pattern overlay */}
          <div className="absolute inset-0 bg-[url('/images/pattern-dots.svg')] bg-repeat opacity-[0.03]" />

          {/* gentle gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/40 to-transparent mix-blend-overlay" />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Breadcrumb */}
        <nav
          aria-label="breadcrumb"
          className="absolute top-4 inset-x-0 z-10"
        >
          <Container>
            <ol className="flex items-center gap-1.5 text-sm text-white/70">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  {isAr ? "الرئيسية" : "Home"}
                </Link>
              </li>
              <ChevronLeft size={14} />
              <li>
                <Link
                  href="/"
                  className="transition-colors hover:text-white"
                >
                  {isAr ? "الروتينات" : "Routines"}
                </Link>
              </li>
              <ChevronLeft size={14} />
              <li className="font-medium text-white">{currentRoutine.nameAr}</li>
            </ol>
          </Container>
        </nav>

        {/* Title on hero */}
        <div className="absolute bottom-0 inset-x-0 z-10 pb-8">
          <Container>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                {isAr ? "روتين متكامل" : "Complete Routine"}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
              {currentRoutine.nameAr}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">
              {currentRoutine.descriptionAr}
            </p>
          </Container>
        </div>
      </div>

      <Container>
        {/* ── META STRIP ── */}
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 py-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
            <Star
              size={12}
              className="fill-amber-400 text-amber-400"
            />
            {currentRoutine.rating} ({currentRoutine.reviewCount}{" "}
            {isAr ? "تقييم" : "reviews"})
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            <Users size={12} />
            {currentRoutine.buyersCount.toLocaleString("ar-YE")}{" "}
            {isAr ? "عميلة اشترت" : "customers bought"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <Clock size={12} />
            {isAr ? `النتائج خلال ${currentRoutine.duration}` : `Results in ${currentRoutine.durationEn}`}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <Shield size={12} />
            {isAr ? `${currentRoutine.savingsPercent}% توفير` : `${currentRoutine.savingsPercent}% savings`}
          </span>
        </div>

        {/* ── PRODUCTS IN THIS ROUTINE ── */}
        {routineProducts.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              {isAr ? "المنتجات في هذا الروتين" : "Products in This Routine"}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory [-webkit-overflow-scrolling:touch]">
              {routineProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="shrink-0 w-40 sm:w-44 snap-start group"
                >
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-50">
                    <ProductImage
                      src={getPrimaryImage(p)}
                      alt={p.name.ar}
                      productId={p.id}
                      hoverZoom
                      pedestal={false}
                      className="absolute inset-0"
                      sizes="176px"
                    />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">
                    {p.name.ar}
                  </p>
                  <p className="text-[10px] text-muted">{p.brandAr || p.brand}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        <div className="mt-8 flex flex-col gap-10 lg:flex-row">
          {/* Left — Steps */}
          <div className="flex-1">
            {/* For whom */}
            <div className="mb-8">
              <h2 className="mb-3 text-lg font-bold text-gray-900">
                {isAr ? "لمن هذا الروتين" : "Who is this for"}
              </h2>
              <div className="flex flex-wrap gap-2">
                {currentRoutine.forWhom.map((item, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary"
                  >
                    <Check size={11} className="text-primary" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div>
              <h2 className="mb-6 text-lg font-bold text-gray-900">
                {isAr ? "خطوات الروتين" : "Routine Steps"}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {currentRoutine.steps.map((step, i) => (
                  <ProductStepCard
                    key={step.productId}
                    step={step}
                    index={i}
                    isAr={isAr}
                  />
                ))}
              </div>
            </div>

            {/* Why we chose it */}
            <div className="mt-10 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 p-6">
              <h3 className="mb-2 text-base font-bold text-gray-900">
                {isAr ? "لماذا اخترناه لك" : "Why We Chose It For You"}
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">
                {currentRoutine.whyChoseIt}
              </p>
            </div>

            {/* Expected results */}
            <div className="mt-6">
              <h3 className="mb-3 text-base font-bold text-gray-900">
                {isAr ? "النتيجة المتوقعة" : "Expected Result"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {currentRoutine.expectedResults.map((r, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700"
                  >
                    ✨ {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Sticky Price Card */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <p className="text-xs text-gray-400">
                {isAr ? "السعر الإجمالي للروتين" : "Total routine price"}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900">
                  {formatPrice(discountedPrice)}
                </span>
                <span className="text-sm text-gray-400">
                  {isAr ? "ر.ي" : "YER"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(totalPrice)}
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  {isAr
                    ? `توفري ${formatPrice(savings)} ر.ي`
                    : `Save ${formatPrice(savings)} YER`}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                {isAr
                  ? `${routineProducts.length} منتجات متكاملة`
                  : `${routineProducts.length} products`}
              </p>

              <button
                type="button"
                onClick={handleAddAll}
                disabled={addedAll}
                className="mt-5 w-full flex items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 text-sm font-bold text-white transition-all duration-300 hover:bg-primary hover:shadow-xl hover:shadow-primary/20 active:scale-[0.98] disabled:opacity-60"
              >
                {addedAll ? (
                  <>
                    <Check size={16} />
                    {isAr ? "تمت الإضافة!" : "Added!"}
                  </>
                ) : (
                  <>
                    <ShoppingCart size={16} />
                    {isAr
                      ? "أضيفي كل المنتجات للسلة"
                      : "Add All to Cart"}
                  </>
                )}
              </button>

              {/* Product mini list */}
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {isAr ? "المنتجات" : "Products"}
                </p>
                {routineProducts.map((p) => {
                  const inCart = items.some(
                    (item) => item.productId === p.id
                  );
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 py-2"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                        {p.gallery?.[0] && (
                          <ProductImage
                            src={p.gallery[0]}
                            alt={p.name.ar}
                            productId={p.id}
                            variant="soft"
                            hoverZoom={false}
                            pedestal={false}
                            className="absolute inset-0"
                            sizes="40px"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-gray-800 truncate">
                          {p.name.ar}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {formatPrice(p.pricing.price)}{" "}
                          {isAr ? "ر.ي" : "YER"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (inCart) {
                              removeItem(p.id);
                            } else {
                              addItem({
                                productId: p.id,
                                slug: p.slug,
                                name: p.name.en,
                                nameAr: p.name.ar,
                                price: p.pricing.price,
                                image: getPrimaryImage(p) || "",
                                quantity: 1,
                                inStock: p.inStock ?? true,
                              });
                            }
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:bg-primary hover:text-white active:scale-90"
                          title={
                            inCart
                              ? isAr
                                ? "إزالة من السلة"
                                : "Remove from cart"
                              : isAr
                                ? "أضيفي للسلة"
                                : "Add to cart"
                          }
                        >
                          {inCart ? (
                            <Trash2 size={11} />
                          ) : (
                            <ShoppingCart size={11} />
                          )}
                        </button>
                        <Link
                          href={`/products/${p.slug}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:bg-primary hover:text-white active:scale-90"
                          title={isAr ? "استبدال" : "Replace"}
                        >
                          <RotateCcw size={11} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── SIMILAR ROUTINES ── */}
        <SimilarRoutines currentId={currentRoutine.id} isAr={isAr} />

        {/* ── BACK ── */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-primary"
          >
            {isAr ? "العودة للرئيسية" : "Back to Home"}
            <ArrowRight size={14} className="rotate-180" />
          </Link>
        </div>
      </Container>
    </div>
  );
}
