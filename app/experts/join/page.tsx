"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  Stethoscope,
  User,
  Video,
} from "lucide-react";

/**
 * انضم إلى شبكة خبراء Luminous Derma
 * Posts to the canonical expert_enrollments table via /api/expert-enrollments.
 * Submission = application only — publishing requires admin approval.
 */

type FormState = {
  nameAr: string;
  email: string;
  phone: string;
  specialtyAr: string;
  cityAr: string;
  bioAr: string;
  online: boolean;
  inPerson: boolean;
};

const INITIAL: FormState = {
  nameAr: "",
  email: "",
  phone: "",
  specialtyAr: "",
  cityAr: "",
  bioAr: "",
  online: true,
  inPerson: false,
};

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10";

export default function ExpertJoinPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/expert-enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.nameAr,
          nameAr: form.nameAr,
          email: form.email,
          phone: form.phone,
          specialty: form.specialtyAr,
          specialtyAr: form.specialtyAr,
          bio: form.bioAr,
          bioAr: form.bioAr,
          city: form.cityAr,
          cityAr: form.cityAr,
          consultationTypes: [
            ...(form.online ? ["online"] : []),
            ...(form.inPerson ? ["in-person"] : []),
          ],
        }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        const body = await res.json().catch(() => null);
        setErrorMsg(body?.error?.message || "تعذّر الإرسال، حاولي مرة أخرى");
        setStatus("error");
      }
    } catch {
      setErrorMsg("الخدمة غير متاحة حاليًا، حاولي لاحقًا");
      setStatus("error");
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-b from-white via-primary/[0.03] to-white py-10">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
        <Link
          href="/experts"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-primary"
        >
          <ArrowRight size={16} />
          العودة للخبراء
        </Link>

        {status === "success" ? (
          <div className="rounded-3xl border border-emerald-100 bg-white p-10 text-center shadow-card">
            <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">تم استلام طلبك بنجاح</h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              شكرًا لرغبتك في الانضمام إلى شبكة خبراء Luminous Derma.
              سيُراجع فريقنا طلبك بعناية، وستتواصل معك إدارتنا عند الموافقة.
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-4 py-2 text-xs font-bold text-primary">
              <BadgeCheck size={13} className="text-accent" />
              التسجيل خاضع للموافقة الإدارية قبل النشر
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-700 active:scale-95"
              >
                الصفحة الرئيسية
                <ArrowRight size={15} className="rotate-180" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8 text-center">
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/5 px-4 py-1.5 text-xs font-bold text-accent">
                <Sparkles size={12} />
                شبكة خبراء Luminous Derma
              </span>
              <h1 className="text-2xl font-bold text-gray-900 leading-snug sm:text-3xl">
                لديك خبرة تستحق أن تصل إلى من يحتاجها؟
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                انضم إلى شبكة خبراء Luminous Derma وشارك خبرتك لتقديم تجربة أكثر تخصصًا لعملائنا.
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={submit}
              className="space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-card sm:p-8"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-gray-700">
                    <User size={14} className="text-primary" />
                    الاسم الكامل *
                  </span>
                  <input
                    required
                    value={form.nameAr}
                    onChange={(e) => set("nameAr", e.target.value)}
                    placeholder="مثال: د. سارة أحمد"
                    className={inputCls}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-gray-700">
                    <Stethoscope size={14} className="text-primary" />
                    التخصص *
                  </span>
                  <input
                    required
                    value={form.specialtyAr}
                    onChange={(e) => set("specialtyAr", e.target.value)}
                    placeholder="مثال: طب الجلدية"
                    className={inputCls}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-gray-700">
                    <Phone size={14} className="text-primary" />
                    رقم الهاتف *
                  </span>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+967 7XX XXX XXX"
                    className={inputCls}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-gray-700">
                    <Mail size={14} className="text-primary" />
                    البريد الإلكتروني *
                  </span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="name@example.com"
                    dir="ltr"
                    className={`${inputCls} text-left`}
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-gray-700">
                    <Building2 size={14} className="text-primary" />
                    المدينة *
                  </span>
                  <input
                    required
                    value={form.cityAr}
                    onChange={(e) => set("cityAr", e.target.value)}
                    placeholder="مثال: صنعاء"
                    className={inputCls}
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-gray-700">النبذة المهنية والخبرات *</span>
                <textarea
                  required
                  rows={5}
                  value={form.bioAr}
                  onChange={(e) => set("bioAr", e.target.value)}
                  placeholder="اكتبي نبذة عن مؤهلاتك وخبراتك وكيف يمكنك مساعدة عملائنا…"
                  maxLength={1500}
                  className={`${inputCls} resize-none leading-relaxed`}
                />
                <span className="mt-1 block text-end text-[11px] text-gray-400">
                  {form.bioAr.length} / 1500
                </span>
              </label>

              <fieldset>
                <legend className="mb-2.5 block text-sm font-bold text-gray-700">أنواع الاستشارات *</legend>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => set("online", !form.online)}
                    aria-pressed={form.online}
                    className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-all ${
                      form.online
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <Video size={15} />
                    استشارة أونلاين
                    {form.online && <CheckCircle2 size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => set("inPerson", !form.inPerson)}
                    aria-pressed={form.inPerson}
                    className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-all ${
                      form.inPerson
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <Building2 size={15} />
                    استشارة حضورية
                    {form.inPerson && <CheckCircle2 size={14} />}
                  </button>
                </div>
              </fieldset>

              {status === "error" && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-700 hover:shadow-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    جارٍ الإرسال…
                  </>
                ) : (
                  <>
                    <Sparkles size={15} className="text-accent-light" />
                    انضم إلى خبرائنا
                  </>
                )}
              </button>

              <p className="text-center text-[11px] leading-relaxed text-gray-400">
                بإرسالك الطلب أنت توافقين على مراجعته من إدارة Luminous Derma.
                التسجيل لا يعني النشر تلقائيًا — النشر يتم بعد الموافقة الإدارية.
              </p>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
