"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Check, ChevronLeft, ChevronRight, RotateCcw, Droplets, Award } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { useSkinProfile } from "@/context/SkinProfileContext";
import { quizQuestions, scoreQuiz, skinTypeLabels, skinConcernLabels } from "@/src/data/quiz";

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
            أجبِ عن {quizQuestions.length} أسئلة قصيرة لتحصلي على تحليل مخصص لبشرتكِ وتوصيات منتجات تناسب احتياجاتك.
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
        )}

        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/" className="font-medium text-primary hover:underline">العودة إلى الرئيسية</Link>
        </p>
      </Container>
    </main>
  );
}
