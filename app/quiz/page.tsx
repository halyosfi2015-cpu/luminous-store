"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Check, ChevronLeft, ChevronRight, RotateCcw, Droplets, Award, Star, Package, ArrowLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import ProductImage from "@/components/product/ProductImage";
import { useSkinProfile } from "@/context/SkinProfileContext";
import { quizQuestions, scoreQuiz, skinTypeLabels, skinConcernLabels } from "@/src/data/quiz";
import { getPersonalizedProducts, getRoutineFromProfile } from "@/lib/recommendations";
import { resolveRoutineProducts, getRoutines } from "@/src/data/routines-store";
import { formatPrice } from "@/lib/utils";

export default function QuizPage() {
  const router = useRouter();
  const { saveProfile } = useSkinProfile();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [finished, setFinished] = useState(false);

  const question = quizQuestions[step];
  const isLast = step === quizQuestions.length - 1;
  const selected = answers[question?.id] || [];

  const result = useMemo(() => {
    if (!finished) return null;
    return scoreQuiz(answers);
  }, [finished, answers]);

  // Get recommended products from database
  const recommendedProducts = useMemo(() => {
    if (!result) return [];
    const profile = { skinTypes: result.skinTypes, skinConcerns: result.skinConcerns, completedAt: new Date().toISOString() };
    return getPersonalizedProducts(profile, 6);
  }, [result]);

  // Get recommended routines from database
  const recommendedRoutines = useMemo(() => {
    if (!result) return [];
    const profile = { skinTypes: result.skinTypes, skinConcerns: result.skinConcerns, completedAt: new Date().toISOString() };
    const routineIds = getRoutineFromProfile(profile);
    const allRoutines = getRoutines();
    return allRoutines.filter((r) => routineIds.includes(r.id) && r.active);
  }, [result]);

  const toggleOption = (optionId: string) => {
    const q = quizQuestions[step];
    setAnswers((prev) => {
      const current = prev[q.id] || [];
      if (q.multi) {
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return { ...prev, [q.id]: next };
      }
      return { ...prev, [q.id]: [optionId] };
    });
  };

  const canNext = selected.length > 0;

  const next = () => {
    if (!canNext) return;
    if (isLast) {
      setFinished(true);
      return;
    }
    setStep((s) => s + 1);
  };

  const back = () => {
    if (step > 0) setStep((s) => s - 1);
    else router.push("/");
  };

  const retake = () => {
    setAnswers({});
    setStep(0);
    setFinished(false);
  };

  const saveAndContinue = () => {
    if (!result) return;
    saveProfile(result.skinTypes, result.skinConcerns);
    router.push("/account/profile");
  };

  return (
    <main dir="rtl" className="min-h-screen bg-background py-10">
      <Container className="max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles size={26} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">اختبار تحليل البشرة</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted sm:text-base">
            أجبِ عن {quizQuestions.length} أسئلة علمية قصيرة لتحصلي على تحليل مخصص لبشرتكِ وتوصيات منتجات وروتينات من متجرنا تناسب احتياجاتك.
          </p>
        </div>

        {!finished && (
          <>
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted">
                <span>السؤال {step + 1} من {quizQuestions.length}</span>
                <span className="flex items-center gap-1 text-primary">
                  <Droplets size={12} />
                  {Math.round(((step + 1) / quizQuestions.length) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-pill bg-muted-bg">
                <div
                  className="h-full rounded-pill bg-primary transition-all duration-500 ease-out-smooth"
                  style={{ width: `${((step + 1) / quizQuestions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-card border border-border bg-card p-6 shadow-card sm:p-8">
              <h2 className="text-lg font-bold text-foreground sm:text-xl">{question.question.ar}</h2>
              {question.hint && <p className="mt-1 text-xs text-muted">{question.hint.ar}</p>}
              {question.multi && (
                <p className="mt-3 inline-flex items-center gap-1 rounded-pill bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                  <Check size={12} />
                  يمكنك اختيار أكثر من إجابة
                </p>
              )}

              <div className={`mt-6 grid gap-3 ${question.multi ? "" : ""}`}>
                {question.options.map((option) => {
                  const isSelected = selected.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleOption(option.id)}
                      className={`
                        flex w-full items-center gap-3 rounded-input border px-4 py-3.5 text-start text-sm font-medium
                        transition-all duration-200 ease-out-smooth
                        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light
                        ${
                          isSelected
                            ? "border-primary bg-primary/5 text-primary shadow-card"
                            : "border-border bg-muted-bg text-foreground hover:border-primary/30 hover:bg-primary/5"
                        }
                      `}
                    >
                      <span
                        className={`
                          flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors
                          ${isSelected ? "border-primary bg-primary" : "border-muted/40"}
                        `}
                      >
                        {isSelected && <Check size={12} className="text-white" />}
                      </span>
                      <span className="flex-1">{option.label.ar}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={back} className="gap-1.5">
                <ChevronRight size={16} />
                السابق
              </Button>
              <Button onClick={next} disabled={!canNext} className="gap-1.5">
                {isLast ? "عرض النتيجة" : "التالي"}
                <ChevronLeft size={16} />
              </Button>
            </div>
          </>
        )}

        {finished && result && (
          <>
            <div className="rounded-card border border-border bg-card p-6 shadow-card sm:p-8">
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
                  <Award size={32} className="text-success" />
                </div>
                <h2 className="text-xl font-bold text-foreground sm:text-2xl">نتيجة تحليل بشرتكِ</h2>
                <p className="mt-1 text-sm text-muted">هذه توصيات مبنية على إجاباتك ويمكن تعديلها في أي وقت.</p>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-foreground">نوع بشرتكِ</h3>
                <div className="flex flex-wrap gap-2">
                  {result.skinTypes.map((t) => (
                    <span key={t} className="rounded-pill bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                      {skinTypeLabels[t]?.ar}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <h3 className="mb-3 text-sm font-semibold text-foreground">اهتماماتك الأساسية</h3>
                <div className="flex flex-wrap gap-2">
                  {result.skinConcerns.map((c) => (
                    <span key={c} className="rounded-pill bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary">
                      {skinConcernLabels[c]?.ar}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recommended Products */}
              {recommendedProducts.length > 0 && (
                <div className="mb-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">منتجات مقترحة لكِ</h3>
                    <Link
                      href="/products"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      عرض الكل
                      <ArrowLeft size={12} className="inline ml-1" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {recommendedProducts.map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.slug}`}
                        className="group block rounded-input border border-border bg-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-lg"
                      >
                        <div className="relative aspect-square overflow-hidden bg-gray-50">
                          <ProductImage
                            src={product.gallery[0]}
                            alt={product.name.ar}
                            productId={product.id}
                            variant="soft"
                            className="h-full w-full transition-transform group-hover:scale-105"
                            sizes="160px"
                          />
                          {product.discount && (
                            <div className="absolute top-2 start-2 z-10">
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
                                -{product.discount}%
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-3 space-y-1">
                          <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">
                            {product.name.ar}
                          </h4>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-extrabold text-gray-900">
                              {formatPrice(product.pricing.price)}
                            </span>
                            {product.pricing.originalPrice && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatPrice(product.pricing.originalPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Routines */}
              {recommendedRoutines.length > 0 && (
                <div className="mb-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">روتينات مقترحة لكِ</h3>
                    <Link
                      href="/routines"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      عرض الكل
                      <ArrowLeft size={12} className="inline ml-1" />
                    </Link>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {recommendedRoutines.map((routine) => {
                      const routineProducts = resolveRoutineProducts(routine);
                      const totalPrice = routineProducts.reduce((sum, p) => sum + p.pricing.price, 0);
                      const discountedPrice = Math.round(totalPrice * (1 - routine.savingsPercent / 100));
                      return (
                        <Link
                          key={routine.id}
                          href={`/routines/${routine.id}`}
                          className="group flex items-start gap-4 rounded-input border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-lg"
                        >
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-50">
                            {routineProducts[0]?.gallery?.[0] ? (
                              <ProductImage
                                src={routineProducts[0].gallery[0]}
                                alt={routine.nameAr}
                                productId={routineProducts[0].id}
                                variant="soft"
                                className="h-full w-full"
                                sizes="80px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-primary-100">
                                <Package size={20} className="text-primary/60" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <h4 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">
                              {routine.nameAr}
                            </h4>
                            <p className="text-xs text-muted line-clamp-2">{routine.descriptionAr}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted">
                              <span className="inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full text-primary">
                                {routineProducts.length} منتجات
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Star size={10} className="fill-amber-400 text-amber-400" />
                                {routine.savingsPercent}% توفير
                              </span>
                            </div>
                            <p className="text-sm font-extrabold text-foreground">
                              {formatPrice(discountedPrice)} <span className="text-[10px] font-normal text-muted">ر.ي</span>
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button onClick={saveAndContinue} className="gap-2">
                  <Award size={16} />
                  حفظ النتيجة والاطلاع على التوصيات
                </Button>
                <Button variant="outline" onClick={retake} className="gap-2">
                  <RotateCcw size={16} />
                  إعادة الاختبار
                </Button>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-muted">
              <Link href="/" className="font-medium text-primary hover:underline">العودة إلى الرئيسية</Link>
            </p>
          </>
        )}
      </Container>
    </main>
  );
}