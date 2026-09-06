"use client";

import { useState } from "react";
import { Calendar, Clock, User, Phone, Mail, Send, CheckCircle } from "lucide-react";
import type { Expert } from "@/src/types/expert";
import { useLang } from "@/lib/use-lang";

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

type Props = { expert: Expert };

export default function ConsultationForm({ expert }: Props) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consultationType, setConsultationType] = useState<"online" | "in-person">("online");
  // Option A: this specific expert. Option B: no preference ("any").
  const [doctorChoice, setDoctorChoice] = useState<"specific" | "any">("specific");
  const [preferredDay, setPreferredDay] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [concern, setConcern] = useState("");
  const [concernDetails, setConcernDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableDays = expert.availableSlots?.map((s) => s.day) ?? [];
  const availableTimesForDay = expert.availableSlots?.find((s) => s.day === preferredDay);

  const timeSlots = (() => {
    if (!availableTimesForDay) return [];
    const from = parseInt(availableTimesForDay.from.split(":")[0], 10);
    const to = parseInt(availableTimesForDay.to.split(":")[0], 10);
    const slots: string[] = [];
    for (let h = from; h < to; h++) {
      slots.push(`${h.toString().padStart(2, "0")}:00`);
      slots.push(`${h.toString().padStart(2, "0")}:30`);
    }
    return slots;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !preferredDay || !preferredTime || !concern || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expertId: doctorChoice === "specific" ? expert.id : "any",
          expertName: doctorChoice === "specific" ? expert.nameAr : "بدون تفضيل",
          clientName: name,
          clientPhone: phone,
          clientEmail: email || undefined,
          consultationType,
          preferredDay,
          preferredTime,
          concern,
          concernDetails: concernDetails || undefined,
          referralSource: "expert-profile",
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(body?.error?.message ?? t("الخدمة غير متاحة حاليًا، حاولي لاحقًا", "Service unavailable, please try again later"));
        return;
      }
      setSubmitted(true);
    } catch {
      setError(t("الخدمة غير متاحة حاليًا، حاولي لاحقًا", "Service unavailable, please try again later"));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-6 text-center">
        <CheckCircle size={40} className="mx-auto text-success" />
        <h3 className="mt-3 text-lg font-bold text-foreground">
          {t("تم إرسال طلب الاستشارة بنجاح", "Consultation request submitted successfully")}
        </h3>
        <p className="mt-2 text-sm text-muted">
          {t(
            "سنتواصل معكِ قريباً لتأكيد الموعد. يمكنك متابعة حالة الطلب من صفحة حسابك.",
            "We will contact you soon to confirm the appointment. You can track the request status from your account page."
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
        <Calendar size={16} className="text-primary" />
        {t("احجزي استشارة", "Book a Consultation")}
      </h3>

      {/* Consultation type */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-semibold text-gray-700">{t("نوع الاستشارة", "Consultation Type")}</label>
        <div className="flex gap-2">
          {(["online", "in-person"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setConsultationType(type)}
              className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${
                consultationType === type
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-gray-100 text-gray-500 hover:border-primary/30"
              }`}
            >
              {type === "online" ? t("أونلاين", "Online") : t("حضوري", "In-Person")}
            </button>
          ))}
        </div>
      </div>

      {/* Doctor choice — specific expert or no preference */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-semibold text-gray-700">
          {t("اختيار الطبيب/الخبير", "Choose Doctor/Expert")}
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDoctorChoice("specific")}
            className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${
              doctorChoice === "specific"
                ? "border-primary bg-primary/5 text-primary"
                : "border-gray-100 text-gray-500 hover:border-primary/30"
            }`}
          >
            {t(`د. ${expert.nameAr}`, `Dr. ${expert.name}`)}
          </button>
          <button
            type="button"
            onClick={() => setDoctorChoice("any")}
            className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${
              doctorChoice === "any"
                ? "border-primary bg-primary/5 text-primary"
                : "border-gray-100 text-gray-500 hover:border-primary/30"
            }`}
          >
            {t("بدون تفضيل", "No Preference")}
          </button>
        </div>
      </div>

      {/* Name & Phone */}
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">{t("الاسم", "Name")} *</label>
          <div className="relative">
            <User size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("الاسم الكامل", "Full name")}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pe-3 ps-9 text-sm text-gray-800 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">{t("الهاتف", "Phone")} *</label>
          <div className="relative">
            <Phone size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="77xxxxxxxx"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pe-3 ps-9 text-sm text-gray-800 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold text-gray-700">{t("البريد الإلكتروني (اختاري)", "Email (optional)")}</label>
        <div className="relative">
          <Mail size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pe-3 ps-9 text-sm text-gray-800 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Day */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold text-gray-700">{t("اليوم المفضل", "Preferred Day")} *</label>
        <div className="flex flex-wrap gap-2">
          {availableDays.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => { setPreferredDay(day); setPreferredTime(""); }}
              className={`rounded-full border-2 px-3 py-1.5 text-[11px] font-bold transition-all ${
                preferredDay === day
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-gray-100 text-gray-500 hover:border-primary/30"
              }`}
            >
              {isAr ? (DAYS_AR[new Date(`2024-01-${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day) + 1}`).getDate()] || day) : day}
            </button>
          ))}
        </div>
      </div>

      {/* Time */}
      {preferredDay && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-gray-700">{t("الوقت المفضل", "Preferred Time")} *</label>
          <div className="flex flex-wrap gap-2">
            {timeSlots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setPreferredTime(slot)}
                className={`rounded-full border-2 px-3 py-1.5 text-[11px] font-bold transition-all ${
                  preferredTime === slot
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-100 text-gray-500 hover:border-primary/30"
                }`}
              >
                <Clock size={10} className="me-1 inline" />
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Concern */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold text-gray-700">{t("سبب الاستشارة", "Reason for Consultation")} *</label>
        <select
          required
          value={concern}
          onChange={(e) => setConcern(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        >
          <option value="">{t("اختاري السبب", "Select a reason")}</option>
          <option value="skin-analysis">{t("تحليل البشرة", "Skin Analysis")}</option>
          <option value="product-recommendation">{t("توصيات المنتجات", "Product Recommendations")}</option>
          <option value="routine-planning">{t("وضع روتين", "Routine Planning")}</option>
          <option value="acne-treatment">{t("علاج حب الشباب", "Acne Treatment")}</option>
          <option value="anti-aging">{t("مكافحة الشيخوخة", "Anti-Aging")}</option>
          <option value="hyperpigmentation">{t("البقع الداكنة", "Hyperpigmentation")}</option>
          <option value="other">{t("أخرى", "Other")}</option>
        </select>
      </div>

      {/* Details */}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-semibold text-gray-700">{t("تفاصيل إضافية (اختاري)", "Additional Details (optional)")}</label>
        <textarea
          value={concernDetails}
          onChange={(e) => setConcernDetails(e.target.value)}
          rows={3}
          placeholder={t("اكتبي وصف حالتك أو استفسارك…", "Describe your concern...")}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* Fee — hidden for now, can be enabled later */}
      {false && (
        <div className="mb-4 rounded-xl bg-primary/5 p-3 text-center">
          <span className="text-xs text-gray-500">{t("رسوم الاستشارة", "Consultation Fee")}</span>
          <p className="text-lg font-bold text-primary">{(expert.consultationFee ?? 0).toLocaleString("ar-YE")} {t("ر.ي", "YER")}</p>
        </div>
      )}

      {/* Submit */}
      {error && (
        <p className="mb-3 rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-xs font-semibold text-error">{error}</p>
      )}
      <button
        type="submit"
        disabled={!name || !phone || !preferredDay || !preferredTime || !concern || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-all hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send size={14} />
        {submitting ? t("جارٍ الإرسال...", "Submitting...") : t("إرسال طلب الاستشارة", "Submit Consultation Request")}
      </button>
    </form>
  );
}
