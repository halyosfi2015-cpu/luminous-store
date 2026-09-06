"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Award, BadgeCheck, Star, MapPin, Clock, Globe, Stethoscope } from "lucide-react";
import Container from "@/components/ui/Container";
import type { Expert } from "@/src/types/expert";
import { getExpertImage } from "@/lib/expert-images";
import ConsultationForm from "@/components/experts/ConsultationForm";
import { useLang } from "@/lib/use-lang";
import { useEffect } from "react";
import { trackClient } from "@/src/lib/analytics/client";
import { ANALYTICS_EVENT_TYPES } from "@/src/lib/analytics/types";
import { useAdminExpert } from "@/hooks/useAdminExperts";

type Props = { expert: Expert };

export default function ExpertDetailClient({ expert: canonicalExpert }: Props) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const expert = useAdminExpert(canonicalExpert.slug) ?? canonicalExpert;

  useEffect(() => {
    trackClient({
      event_type: ANALYTICS_EVENT_TYPES.EXPERT_VIEW,
      entity_type: "expert",
      entity_id: expert.id,
      properties: { slug: expert.slug },
    });
  }, [expert.id, expert.slug]);

  const DAYS_MAP: Record<string, string> = {
    Sunday: t("الأحد", "Sunday"),
    Monday: t("الاثنين", "Monday"),
    Tuesday: t("الثلاثاء", "Tuesday"),
    Wednesday: t("الأربعاء", "Wednesday"),
    Thursday: t("الخميس", "Thursday"),
    Friday: t("الجمعة", "Friday"),
    Saturday: t("السبت", "Saturday"),
  };

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <div className="mb-6">
          <Link href="/experts" className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-primary">
            <ChevronRight size={16} />
            {t("الخبراء", "Experts")}
          </Link>
        </div>

        <div className="mx-auto max-w-2xl">
          {/* Profile Card */}
          <div className="overflow-hidden rounded-card bg-card shadow-card">
            <div className="h-32 bg-gradient-to-l from-primary/15 to-secondary-200/40" />
            <div className="relative px-6 pb-6">
              <div className="absolute -top-12 right-6 h-24 w-24 rounded-full border-4 border-card bg-card shadow-card overflow-hidden">
                <Image
                  src={getExpertImage(expert)}
                  alt={expert.nameAr}
                  width={96}
                  height={96}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="pt-14">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{expert.nameAr}</h1>
                  {expert.isVerified && <BadgeCheck size={20} className="text-primary" />}
                </div>
                <p className="mt-1 text-primary">{expert.titleAr}</p>

                {/* Quick Info */}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
                  {expert.rating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      {expert.rating} ({expert.reviewCount} {t("تقييم", "reviews")})
                    </span>
                  )}
                  {expert.cityAr && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {expert.cityAr}
                    </span>
                  )}
                  {expert.languages.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Globe size={12} />
                      {expert.languages.map((l) => l === "ar" ? "العربية" : "English").join(" / ")}
                    </span>
                  )}
                </div>

                <p className="mt-4 text-sm leading-relaxed text-muted">{expert.bioAr}</p>

                {/* Specialties */}
                <div className="mt-6">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Award size={16} className="text-primary" />
                    {t("التخصصات", "Specialties")}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {expert.specialtiesAr.map((s) => (
                      <span key={s} className="rounded-full bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Consultation Types */}
                <div className="mt-4">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Stethoscope size={16} className="text-primary" />
                    {t("أنواع الاستشارة", "Consultation Types")}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {expert.consultationTypes.map((type) => (
                      <span key={type} className="rounded-full bg-secondary/10 px-3 py-1.5 text-xs font-medium text-secondary">
                        {type === "online" ? t("أونلاين", "Online") : t("حضوري", "In-Person")}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Available Slots */}
                {expert.availableSlots && expert.availableSlots.length > 0 && (
                  <div className="mt-4">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Clock size={16} className="text-primary" />
                      {t("أوقات المتاحة", "Available Times")}
                    </h2>
                    <div className="space-y-2">
                      {expert.availableSlots.map((slot) => (
                        <div key={slot.day} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs">
                          <span className="font-semibold text-gray-700">{DAYS_MAP[slot.day] || slot.day}</span>
                          <span className="text-muted">{slot.from} - {slot.to}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consultation Fee — hidden for now, can be enabled later */}
                {false && (
                  <div className="mt-4 rounded-xl bg-primary/5 p-4 text-center">
                    <span className="text-xs text-gray-500">{t("رسوم الاستشارة", "Consultation Fee")}</span>
                    <p className="text-xl font-bold text-primary">{(expert.consultationFee ?? 0).toLocaleString("ar-YE")} {t("ر.ي", "YER")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Consultation Form */}
          {expert.availableForConsultation && (
            <div className="mt-6">
              <ConsultationForm expert={expert} />
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}
