"use client";

import Link from "next/link";
import { Sparkles, ChevronLeft, ArrowLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import ProductCard from "@/components/product/ProductCard";
import { useSkinProfile } from "@/context/SkinProfileContext";
import { getPersonalizedProducts } from "@/lib/recommendations";
import { skinTypeLabels, skinConcernLabels } from "@/src/data/quiz";

export default function SkinRecommendations() {
  const { profile } = useSkinProfile();

  if (!profile) {
    return (
      <section className="w-full bg-card py-16 sm:py-20 lg:py-24">
        <Container>
          <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-primary via-primary-light to-secondary p-8 text-center sm:p-12">
            <div className="pointer-events-none absolute -start-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 -end-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative mx-auto flex max-w-2xl flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white">
                <Sparkles size={30} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">توصيات مخصصة لبشرتكِ</h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
                خذي اختبار تحليل البشرة القصير وسنرشح لكِ المنتجات المثالية لنوع بشرتكِ واهتماماتك — بسرعة وسهولة.
              </p>
              <Link href="/quiz" className="mt-6">
                <Button variant="secondary" size="lg" className="gap-2">
                  ابدأي اختبار البشرة
                  <ChevronLeft size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    );
  }

  const recommended = getPersonalizedProducts(profile, 8);

  return (
    <section className="w-full bg-card py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionTitle
          eyebrow="مخصص لكِ"
          title="منتجات تناسب بشرتكِ"
          subtitle="توصيات مبنية على نتيجة اختبار تحليل البشرة — اخترناها خصيصاً لنوع بشرتكِ واهتماماتك."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {profile.skinTypes.map((t) => (
                  <span key={t} className="rounded-pill bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {skinTypeLabels[t]?.ar}
                  </span>
                ))}
                {profile.skinConcerns.slice(0, 2).map((c) => (
                  <span key={c} className="rounded-pill bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                    {skinConcernLabels[c]?.ar}
                  </span>
                ))}
              </div>
              <Link
                href="/quiz"
                className="inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
              >
                تعديل التحليل
                <ChevronLeft size={15} />
              </Link>
            </div>
          }
        />
        {recommended.length > 0 ? (
          <div
            dir="rtl"
            className="grid animate-fade-in grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          >
            {recommended.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-card border border-border bg-background p-10 text-center">
            <Sparkles size={40} className="text-muted/40" />
            <p className="text-sm text-muted">لا توجد منتجات مطابقة بعد. خذي الاختبار للحصول على توصيات دقيقة.</p>
            <Link href="/quiz">
              <Button className="gap-2">
                إعادة الاختبار
                <ArrowLeft size={16} />
              </Button>
            </Link>
          </div>
        )}
      </Container>
    </section>
  );
}
