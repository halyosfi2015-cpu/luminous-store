"use client"

import { useState } from "react"
import { Gift, Check, Mail } from "lucide-react"
import Container from "@/components/ui/Container"
import { useLang } from "@/lib/use-lang"

export default function Newsletter() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const { lang } = useLang()
  const isAr = lang === "ar"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) setSubmitted(true)
  }

  return (
    <section className="relative w-full overflow-hidden py-20 sm:py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-primary to-primary-light" />
      <div className="absolute inset-0 bg-[url('/images/pattern-dots.svg')] bg-repeat opacity-[0.04]" />
      <div className="pointer-events-none absolute -start-32 -top-32 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -end-32 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      <Container className="relative z-10">
        <div
          dir={isAr ? "rtl" : "ltr"}
          className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-pill border border-accent/30 bg-accent/15 px-4 py-1.5 text-xs font-semibold text-accent-light backdrop-blur-sm">
            <Gift size={13} />
            {isAr ? "خصم 10% على أول طلبية" : "10% Off On First Order"}
          </span>
          <h2 className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
            {isAr ? "اشتركي في النشرة البريدية" : "Subscribe to Our Newsletter"}
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            {isAr
              ? "احصلي على أحدث النصائح والعروض الحصرية مباشرة إلى بريدك الإلكتروني، ولا تفوتي أي تخفيض"
              : "Get the latest tips and exclusive offers delivered straight to your inbox, don't miss out on any discount"}
          </p>
          {submitted ? (
            <div
              role="status"
              className="flex items-center gap-3 rounded-card border border-success/30 bg-success/10 px-6 py-4 backdrop-blur-sm"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success text-white shadow-card">
                <Check size={16} />
              </span>
              <span className="font-sans text-sm font-medium text-white">
                {isAr ? "تم الاشتراك بنجاح! شكراً لانضمامكِ" : "Subscribed successfully! Thank you for joining us"}
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex w-full max-w-lg flex-col gap-3 sm:flex-row"
            >
              <div className="relative w-full">
                <Mail
                  size={16}
                  className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-white/40 ${isAr ? "left-5" : "right-5"}`}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isAr ? "أدخلي بريدك الإلكتروني" : "Your email address"}
                  required
                  className={`w-full rounded-pill border border-white/20 bg-white/10 py-3 text-sm text-white outline-none placeholder:text-white/40 backdrop-blur-sm transition-all duration-200 ease-out-smooth focus:border-secondary/60 focus:bg-white/15 ${isAr ? "pr-12 pl-5" : "pl-12 pr-5"}`}
                />
              </div>
              <button
                type="submit"
                className="shrink-0 rounded-button bg-accent px-7 py-3 text-sm font-bold text-primary shadow-card transition-all duration-200 ease-out-smooth hover:scale-105 hover:bg-accent-light hover:shadow-card-hover active:scale-[0.98] sm:px-9"
              >
                {isAr ? "اشتراك" : "Subscribe"}
              </button>
            </form>
          )}
          <p className="text-xs text-white/40">
            {isAr ? "لن يتم مشاركة بريدك الإلكتروني مع أي طرف ثالث" : "We will never share your email with anyone"}
          </p>
        </div>
      </Container>
    </section>
  )
}
