"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check, ChevronLeft, ChevronRight, RotateCcw, Droplets, Phone, User } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { useSkinProfile } from "@/context/SkinProfileContext";
import { quizQuestions, scoreQuiz } from "@/src/data/quiz";
import {
  getAnalyzedProducts,
  getAnalyzedRoutines,
  getRecommendedExpert,
} from "@/src/data/skin-analysis";
import { generateQuizId, saveQuizResult } from "@/src/data/quiz-results";
import { buildQuizWhatsAppMessage, QUIZ_WHATSAPP_NUMBER } from "@/lib/quiz-whatsapp";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";

export default function QuizPage() {
  const router = useRouter();
  const { saveProfile } = useSkinProfile();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [finished, setFinished] = useState(false);
  const [quizId, setQuizId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [saved, setSaved] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const question = quizQuestions[step];
  const isLast = step === quizQuestions.length - 1;
  const selected = answers[question?.id] || [];

  const result = useMemo(() => {
    if (!finished) return null;
    return scoreQuiz(answers);
  }, [finished, answers]);

  const recommendedProducts = useMemo(() => {
    if (!result) return [];
    return getAnalyzedProducts(
      { skinTypes: result.skinTypes, skinConcerns: result.skinConcerns },
      6,
    );
  }, [result]);

  const recommendedRoutines = useMemo(() => {
    if (!result) return [];
    return getAnalyzedRoutines({
      skinTypes: result.skinTypes,
      skinConcerns: result.skinConcerns,
    });
  }, [result]);

  const recommendedExpert = useMemo(() => {
    if (!result) return null;
    return getRecommendedExpert({
      skinTypes: result.skinTypes,
      skinConcerns: result.skinConcerns,
    });
  }, [result]);

  useEffect(() => {
    if (finished && result && !saved) {
      const id = generateQuizId();
      setQuizId(id);
      saveQuizResult({
        id,
        date: new Date().toISOString(),
        name: customerName || undefined,
        phone: "",
        answers,
        result,
        score: result.skinTypes.length * 10 + result.skinConcerns.length * 5,
        recommendedProducts: recommendedProducts.map((p) => p.id),
        recommendedRoutines: recommendedRoutines.map((r) => r.id),
        recommendedExpertId: recommendedExpert?.id,
        source: "skin_quiz",
        status: "new",
      });
      setSaved(true);

      trackClient({
        event_type: ANALYTICS_EVENT_TYPES.SKIN_ANALYSIS_COMPLETED,
        entity_type: "skin_analysis",
        entity_id: id,
        properties: {
          skin_types: result.skinTypes,
          skin_concerns: result.skinConcerns,
          products_count: recommendedProducts.length,
          routines_count: recommendedRoutines.length,
          expert_id: recommendedExpert?.id || null,
        },
      });
    }
  }, [finished, result, saved, answers, recommendedProducts, recommendedRoutines, recommendedExpert, customerName]);

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
    setSaved(false);
    setQuizId("");
    setCustomerName("");
    setCustomerPhone("");
    setPhoneError("");
    setRedirecting(false);
  };

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s\-()]/g, "");
    if (!cleaned) return false;
    if (/^\+?\d{7,15}$/.test(cleaned)) return true;
    return false;
  };

  const submitAndRedirect = () => {
    if (!validatePhone(customerPhone)) {
      setPhoneError("أدخلي رقم واتساب صحيح (مثال: 77xxxxxxx)");
      return;
    }
    setPhoneError("");

    if (!result || !quizId) return;

    saveProfile(result.skinTypes, result.skinConcerns);

    const finalExpertId = recommendedExpert?.id;

    saveQuizResult({
      id: quizId,
      date: new Date().toISOString(),
      name: customerName || undefined,
      phone: customerPhone,
      answers,
      result,
      score: result.skinTypes.length * 10 + result.skinConcerns.length * 5,
      recommendedProducts: recommendedProducts.map((p) => p.id),
      recommendedRoutines: recommendedRoutines.map((r) => r.id),
      recommendedExpertId: finalExpertId,
      source: "skin_quiz",
      status: "new",
      whatsappSent: true,
      lastContact: new Date().toISOString(),
    });

    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.SKIN_ANALYSIS_WHATSAPP_SENT,
      entity_type: "skin_analysis",
      entity_id: quizId,
      properties: {
        phone: customerPhone,
        expert_id: finalExpertId || null,
      },
    });

    setRedirecting(true);
    router.push(`/quiz/result/${quizId}`);
  };

  const openWhatsApp = () => {
    if (!result || !quizId) return;
    const msg = buildQuizWhatsAppMessage({
      record: { id: quizId, name: customerName },
      result,
      recommendedProducts,
      recommendedRoutines,
    });
    window.open(
      `https://wa.me/${QUIZ_WHATSAPP_NUMBER}?text=${msg}`,
      "_blank",
      "noopener,noreferrer",
    );
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
                {isLast ? "إرسال التشخيص" : "التالي"}
                <ChevronLeft size={16} />
              </Button>
            </div>
          </>
        )}

        {finished && (
          <div className="rounded-card border border-border bg-card p-6 shadow-card sm:p-8">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
                <Check size={32} className="text-success" />
              </div>
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">شكرًا لإكمالك التشخيص ✨</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
                حللنا إجاباتك وحددنا النتيجة الأقرب لاحتياجات بشرتك. أدخلي رقم واتساب لإرسال نتيجتك والتوصيات المناسبة لكِ.
              </p>
              {quizId && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
                  <Sparkles size={12} />
                  معرّف نتيجتك: {quizId}
                </span>
              )}
            </div>

            {/* Contact info — phone required */}
            <div className="mb-6 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <User size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="اسمكِ (اختياري)"
                    className="w-full rounded-input border border-border bg-muted-bg py-3 pe-4 ps-9 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div className="relative flex-1">
                  <Phone size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      if (phoneError) setPhoneError("");
                    }}
                    placeholder="رقم واتساب *"
                    inputMode="tel"
                    className={`w-full rounded-input border bg-muted-bg py-3 pe-4 ps-9 text-sm text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/10 ${
                      phoneError
                        ? "border-error focus:border-error focus:ring-error/10"
                        : "border-border focus:border-primary focus:ring-primary/10"
                    }`}
                  />
                </div>
              </div>
              {phoneError && (
                <p className="text-xs text-error">{phoneError}</p>
              )}
              <p className="text-[11px] text-muted">
                رقم الواتساب مطلوب لإرسال النتيجة والتوصيات. لن نستخدمه لأغراض أخرى.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={submitAndRedirect}
                disabled={redirecting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:px-8"
              >
                {redirecting ? "جارٍ التوجيه..." : "عرض النتيجة والتوصيات"}
                <ChevronLeft size={16} />
              </button>
              <Button variant="ghost" onClick={retake} className="gap-2">
                <RotateCcw size={16} />
                إعادة الاختبار
              </Button>
            </div>
          </div>
        )}
      </Container>
    </main>
  );
}
