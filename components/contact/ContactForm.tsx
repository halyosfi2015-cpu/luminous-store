"use client";

import { useState } from "react";
import { Send, Check } from "lucide-react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const initialForm: FormState = { name: "", email: "", subject: "", message: "" };

export default function ContactForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const validate = (): boolean => {
    const next: Partial<FormState> = {};
    if (!form.name.trim()) next.name = "الرجاء إدخال الاسم";
    if (!form.email.trim()) next.email = "الرجاء إدخال البريد الإلكتروني";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "الرجاء إدخال بريد إلكتروني صحيح";
    if (!form.subject.trim()) next.subject = "الرجاء إدخال الموضوع";
    if (form.message.trim().length < 10) next.message = "الرجاء كتابة رسالة لا تقل عن 10 أحرف";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 900);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-card border border-border bg-card p-10 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success-fg">
          <Check size={28} />
        </span>
        <h2 className="text-lg font-bold text-foreground">تم استلام رسالتك</h2>
        <p className="max-w-sm text-sm text-muted">
          شكراً لتواصلك معنا! سيقوم فريقنا بالرد عليك في أقرب وقت ممكن.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setSubmitted(false);
            setForm(initialForm);
          }}
        >
          إرسال رسالة أخرى
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="الاسم الكامل"
          name="name"
          value={form.name}
          onChange={handleChange("name")}
          error={errors.name}
          placeholder="اسمك"
          autoComplete="name"
          required
        />
        <Input
          label="البريد الإلكتروني"
          name="email"
          type="email"
          dir="ltr"
          value={form.email}
          onChange={handleChange("email")}
          error={errors.email}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>
      <Input
        label="الموضوع"
        name="subject"
        value={form.subject}
        onChange={handleChange("subject")}
        error={errors.subject}
        placeholder="بماذا يمكننا مساعدتك؟"
        required
      />
      <Textarea
        label="الرسالة"
        name="message"
        value={form.message}
        onChange={handleChange("message")}
        error={errors.message}
        placeholder="اكتبي رسالتك هنا..."
        rows={6}
        required
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" loading={submitting}>
          <Send size={16} />
          إرسال الرسالة
        </Button>
        <p className="text-xs text-muted">نرد عادةً خلال 24 ساعة</p>
      </div>
    </form>
  );
}
