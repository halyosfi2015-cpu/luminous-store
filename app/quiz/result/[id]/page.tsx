"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Check,
  ChevronLeft,
  RotateCcw,
  Droplets,
  MessageCircle,
  Phone,
  User,
  Stethoscope,
  ShoppingCart,
  ExternalLink,
  Share2,
  Star,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { useSkinProfile } from "@/context/SkinProfileContext";
import {
  listQuizResults,
  type QuizResultRecord,
} from "@/src/data/quiz-results";
import { skinTypeLabels, skinConcernLabels } from "@/src/data/quiz";
import {
  getAnalyzedProducts,
  getAnalyzedRoutines,
  getRecommendedExpert,
} from "@/src/data/skin-analysis";
import { resolveRoutineProducts } from "@/src/data/routines-store";
import { useProducts } from "@/hooks/useProducts";
import { buildQuizWhatsAppMessage, QUIZ_WHATSAPP_NUMBER } from "@/lib/quiz-whatsapp";
import { WHATSAPP_PHONE_DISPLAY } from "@/src/data/siteConfig";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";
import ProductCard from "@/components/product/ProductCard";

export default function QuizResultPage() {
  const params = useParams();
  const router = useRouter();
  const { saveProfile } = useSkinProfile();
  const { products: apiProducts } = useProducts();
  const [record, setRecord] = useState<QuizResultRecord | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = params?.id as string;
    if (!id) {
      setNotFound(true);
      return;
    }
    const results = listQuizResults();
    const found = results.find((r) => r.id === id);
    if (found) {
      setRecord(found);
      saveProfile(found.result.skinTypes, found.result.skinConcerns);
      trackClient({
        event_type: ANALYTICS_EVENT_TYPES.SKIN_ANALYSIS_RESULT_VIEWED,
        entity_type: "skin_analysis",
        entity_id: found.id,
        properties: {
          skin_types: found.result.skinTypes,
          skin_concerns: found.result.skinConcerns,
          products_count: found.recommendedProducts.length,
          routines_count: found.recommendedRoutines.length,
          expert_id: found.recommendedExpertId || null,
        },
      });
    } else {
      setNotFound(true);
    }
  }, [params?.id, saveProfile]);

  const products = useMemo(() => {
    if (!record) return [];
    return getAnalyzedProducts(
      { skinTypes: record.result.skinTypes, skinConcerns: record.result.skinConcerns },
      6,
    );
  }, [record]);

  const routines = useMemo(() => {
    if (!record) return [];
    return getAnalyzedRoutines({
      skinTypes: record.result.skinTypes,
      skinConcerns: record.result.skinConcerns,
    });
  }, [record]);

  const expert = useMemo(() => {
    if (!record) return null;
    return getRecommendedExpert({
      skinTypes: record.result.skinTypes,
      skinConcerns: record.result.skinConcerns,
    });
  }, [record]);

  const openWhatsApp = () => {
    if (!record) return;
    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.SKIN_ANALYSIS_WHATSAPP_SENT,
      entity_type: "skin_analysis",
      entity_id: record.id,
      properties: {
        phone: record.phone,
        expert_id: record.recommendedExpertId || null,
      },
    });
    const msg = buildQuizWhatsAppMessage({
      record: { id: record.id, name: record.name },
      result: record.result,
      recommendedProducts: products,
      recommendedRoutines: routines,
    });
    window.open(
      `https://wa.me/${QUIZ_WHATSAPP_NUMBER}?text=${msg}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const shareResult = async () => {
    const url = `${window.location.origin}/quiz/result/${record?.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: " نتيجة تحليل البشرة - Luminous Derma", url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  if (notFound) {
    return (
      <main dir="rtl" className="min-h-screen bg-background py-10">
        <Container className="max-w-3xl text-center">
          <div className="rounded-card border border-border bg-card p-8 shadow-card">
            <h1 className="text-xl font-bold text-foreground">النتيجة غير موجودة</h1>
            <p className="mt-2 text-sm text-muted">
              لا توجد نتيجة محفوظة بهذا المعرّف. تأكدي من الرابط أو أعيدي الاختبار.
            </p>
            <Button onClick={() => router.push("/quiz")} className="mt-6 gap-2">
              <RotateCcw size={16} />
              إعادة الاختبار
            </Button>
          </div>
        </Container>
      </main>
    );
  }

  if (!record) {
    return (
      <main dir="rtl" className="min-h-screen bg-background py-10">
        <Container className="max-w-3xl text-center">
          <p className="text-muted">جارٍ تحميل النتيجة...</p>
        </Container>
      </main>
    );
  }

  const skin = record.result.skinTypes
    .map((t) => skinTypeLabels[t]?.ar ?? t)
    .join("، ");
  const concerns = record.result.skinConcerns
    .map((c) => skinConcernLabels[c]?.ar ?? c)
    .join("، ");

  return (
    <main dir="rtl" className="min-h-screen bg-background py-10">
      <Container className="max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft">
            <Check size={26} className="text-success" />
          </div>
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-pill bg-secondary/10 px-3 py-1 text-[11px] font-bold text-secondary">
            <Sparkles size={11} />
            تقييم أولي مبني على إجاباتك
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            نتيجة تحليل بشرتك
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted sm:text-base">
            بناءً على إجاباتك في اختبار البشرة، يظهر أن بشرتك تميل إلى{" "}
            <span className="font-bold text-foreground">
              {record.result.skinTypes.map((t) => skinTypeLabels[t]?.ar ?? t).filter(Boolean).join(" و ") || "نوع محدد"}
            </span>
            ، مع احتياجات تستحق المزيد من التقييم.
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
            <MessageCircle size={12} />
            معرّف النتيجة: {record.id}
          </span>
        </div>

        {/* Skin Type & Concerns */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-card border border-border bg-card p-5 shadow-card">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
              <Droplets size={16} className="text-primary" />
              نوع البشرة
            </h3>
            <div className="flex flex-wrap gap-2">
              {record.result.skinTypes.map((t) => (
                <span
                  key={t}
                  className="rounded-pill bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                >
                  {skinTypeLabels[t]?.ar ?? t}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-card border border-border bg-card p-5 shadow-card">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
              <Sparkles size={16} className="text-primary" />
              اهتمامات البشرة
            </h3>
            <div className="flex flex-wrap gap-2">
              {record.result.skinConcerns.map((c) => (
                <span
                  key={c}
                  className="rounded-pill bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary"
                >
                  {skinConcernLabels[c]?.ar ?? c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Expert Verification CTA — prominent, mobile-first */}
        <div
          className="mb-6 overflow-hidden rounded-card border border-primary/25 bg-gradient-to-b from-primary/[0.07] to-secondary/[0.06] p-5 shadow-card sm:p-6"
          role="region"
          aria-label="تواصل مع خبراء Luminous Derma"
        >
          <div className="flex items-start gap-3">
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/15 sm:flex">
              <FaWhatsapp size={22} className="text-[#1ebe5b]" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-foreground sm:text-lg">
                هل تريدين التأكد من نتيجة بشرتك؟
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                نتيجة الاختبار هي تقييم أولي مبني على إجاباتك. للحصول على تحليل أكثر دقة وتوصيات تناسب احتياجات بشرتك، تواصلي مع خبراء Luminous Derma.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openWhatsApp}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#25D366]/30 transition-all hover:bg-[#1ebe5b] active:scale-[0.98] sm:text-base"
          >
            <FaWhatsapp size={18} />
            💬 أريد التأكد من نتيجة بشرتي
          </button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
            تحليل الاختبار إرشادي ولا يُعد تشخيصًا طبيًا.
          </p>
        </div>

        {/* Recommended Products */}
        {products.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
              <ShoppingCart size={18} className="text-primary" />
              المنتجات المقترحة لكِ
            </h2>
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
              onClick={(e) => {
                const card = (e.target as HTMLElement).closest("[data-product-id]");
                const pid = card?.getAttribute("data-product-id");
                if (pid && record) {
                  trackClient({
                    event_type: ANALYTICS_EVENT_TYPES.SKIN_ANALYSIS_PRODUCT_CLICKED,
                    entity_type: "skin_analysis",
                    entity_id: record.id,
                    properties: { product_id: pid },
                  });
                }
              }}
            >
              {products.map((p) => (
                <div key={p.id} data-product-id={p.id}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Routines */}
        {routines.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-foreground">
              <Sparkles size={18} className="text-primary" />
              الروتينات المقترحة لبشرتك
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {routines.map((r) => {
                const routineProducts = resolveRoutineProducts(r, apiProducts);
                return (
                  <Link
                    key={r.id}
                    href={`/routines/${r.id}`}
                    onClick={() => {
                      if (record) {
                        trackClient({
                          event_type: ANALYTICS_EVENT_TYPES.SKIN_ANALYSIS_ROUTINE_CLICKED,
                          entity_type: "skin_analysis",
                          entity_id: record.id,
                          properties: { routine_id: r.id },
                        });
                      }
                    }}
                    className="group rounded-card border border-border bg-card p-5 shadow-card transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                        <Sparkles size={14} className="text-primary" />
                      </span>
                      <h3 className="text-base font-extrabold text-foreground group-hover:text-primary">
                        {r.nameAr}
                      </h3>
                    </div>
                    <p className="mb-3 text-sm leading-relaxed text-muted line-clamp-2">
                      {r.descriptionAr}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {routineProducts.slice(0, 4).map((rp) => (
                        <span
                          key={rp.id}
                          className="rounded-pill bg-primary/8 px-2.5 py-1 text-[11px] font-semibold text-primary"
                        >
                          {rp.name.ar}
                        </span>
                      ))}
                      {routineProducts.length > 4 && (
                        <span className="rounded-pill bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                          +{routineProducts.length - 4} منتجات
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommended Expert */}
        {expert && (
          <div className="mb-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
              <Stethoscope size={18} className="text-primary" />
              خبير مقترح لكِ
            </h2>
            <Link
              href={`/experts/${expert.slug}`}
              onClick={() => {
                if (record) {
                  trackClient({
                    event_type: ANALYTICS_EVENT_TYPES.SKIN_ANALYSIS_EXPERT_CLICKED,
                    entity_type: "skin_analysis",
                    entity_id: record.id,
                    properties: { expert_id: expert.id },
                  });
                }
              }}
              className="group block rounded-card border border-border bg-card p-5 shadow-card transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {expert.nameAr.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary">
                    {expert.nameAr}
                  </h3>
                  <p className="text-xs text-muted">{expert.titleAr}</p>
                  <p className="mt-1 text-xs text-muted line-clamp-2">{expert.bioAr}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Star size={12} className="text-yellow-500" />
                      {expert.rating}
                    </span>
                    <span>{expert.cityAr}</span>
                  </div>
                </div>
                <ExternalLink
                  size={16}
                  className="shrink-0 text-muted transition group-hover:text-primary"
                />
              </div>
            </Link>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={shareResult} className="gap-2">
            <Share2 size={16} />
            مشاركة النتيجة
          </Button>
          <Link href="/quiz">
            <Button variant="ghost" className="w-full gap-2">
              <RotateCcw size={16} />
              إعادة الاختبار
            </Button>
          </Link>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          <Link href="/" className="font-medium text-primary hover:underline">
            العودة إلى الرئيسية
          </Link>
        </p>
      </Container>
    </main>
  );
}
