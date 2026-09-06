"use client";

import { useState } from "react";
import { UserPlus, CheckCircle } from "lucide-react";
import { useLang } from "@/lib/use-lang";

export default function ExpertEnrollmentForm() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [specialtyAr, setSpecialtyAr] = useState("");
  const [bio, setBio] = useState("");
  const [bioAr, setBioAr] = useState("");
  const [city, setCity] = useState("");
  const [cityAr, setCityAr] = useState("");
  const [consultationTypes, setConsultationTypes] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleConsultationType = (type: string) => {
    setConsultationTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !nameAr || !email || !phone || !specialty || !specialtyAr || !bio || !bioAr || !city || !cityAr || consultationTypes.length === 0 || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/expert-enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, nameAr, email, phone, specialty, specialtyAr, bio, bioAr, city, cityAr, consultationTypes,
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
          {t("تم إرسال طلب التسجيل بنجاح", "Enrollment request submitted successfully")}
        </h3>
        <p className="mt-2 text-sm text-muted">
          {t(
            "سنتواصل معكِ قريباً لمراجعة طلبك وإتمام التسجيل.",
            "We will contact you soon to review your request and complete the enrollment."
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
        <UserPlus size={16} className="text-primary" />
        {t("التسجيل كخبير", "Register as Expert")}
      </h3>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">{t("الاسم (إنجليزي)", "Name (English)")}</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">{t("الاسم (عربي)", "Name (Arabic)")}</label>
          <input
            type="text"
            required
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">{t("البريد الإلكتروني", "Email")}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">{t("الهاتف", "Phone")}</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">{t("التخصص (إنجليزي)", "Specialty (English)")}</label>
          <input
            type="text"
            required
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">{t("التخصص (عربي)", "Specialty (Arabic)")}</label>
          <input
            type="text"
            required
            value={specialtyAr}
            onChange={(e) => setSpecialtyAr(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">{t("المدينة (إنجليزي)", "City (English)")}</label>
          <input
            type="text"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">{t("المدينة (عربي)", "City (Arabic)")}</label>
          <input
            type="text"
            required
            value={cityAr}
            onChange={(e) => setCityAr(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold text-gray-700">{t("النبذة (إنجليزي)", "Bio (English)")}</label>
        <textarea
          required
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold text-gray-700">{t("النبذة (عربي)", "Bio (Arabic)")}</label>
        <textarea
          required
          value={bioAr}
          onChange={(e) => setBioAr(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-xs font-semibold text-gray-700">{t("أنواع الاستشارة", "Consultation Types")}</label>
        <div className="flex gap-2">
          {["online", "in-person"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleConsultationType(type)}
              className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${
                consultationTypes.includes(type)
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-gray-100 text-gray-500 hover:border-primary/30"
              }`}
            >
              {type === "online" ? t("أونلاين", "Online") : t("حضوري", "In-Person")}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-xs font-semibold text-error">{error}</p>
      )}
      <button
        type="submit"
        disabled={!name || !nameAr || !email || !phone || !specialty || !specialtyAr || !bio || !bioAr || !city || !cityAr || consultationTypes.length === 0 || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-all hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <UserPlus size={14} />
        {submitting ? t("جارٍ الإرسال...", "Submitting...") : t("إرسال طلب التسجيل", "Submit Enrollment Request")}
      </button>
    </form>
  );
}
