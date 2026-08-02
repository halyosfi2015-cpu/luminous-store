import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Headphones, Phone, Mail, MapPin, Clock } from "lucide-react";
import Container from "@/components/ui/Container";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "تواصل معنا - Luminous Derma",
  description: "تواصلي مع فريق لومينوس ديرما لأي استفسارات حول المنتجات أو الطلبات أو الشحن",
};

const contactInfo = [
  { icon: Phone, label: "الهاتف", value: "+967 777 777 777", href: "tel:+967777777777" },
  { icon: Mail, label: "البريد الإلكتروني", value: "info@luminousderma.com", href: "mailto:info@luminousderma.com" },
  { icon: MapPin, label: "العنوان", value: "صنعاء، اليمن" },
  { icon: Clock, label: "ساعات العمل", value: "السبت - الخميس: 9 صباحاً - 10 مساءً" },
];

export default function ContactPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <nav aria-label="breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link>
            </li>
            <ChevronRight size={14} className="text-muted" />
            <li className="font-medium text-foreground">تواصل معنا</li>
          </ol>
        </nav>

        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Headphones size={14} />
              فريق الدعم
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">تواصل معنا</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              نحن هنا لمساعدتك! أخبرينا عن استفسارك وسيقوم فريقنا بالرد عليك في أقرب وقت.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
            <div className="flex flex-col gap-3">
              {contactInfo.map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="flex items-center gap-3 rounded-card border border-border bg-card p-4 shadow-card">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted">{label}</p>
                    {href ? (
                      <a href={href} dir="ltr" className="block truncate text-sm font-medium text-foreground transition-colors hover:text-primary">
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-foreground">{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-card border border-border bg-card p-6 shadow-card sm:p-8">
              <h2 className="mb-5 text-lg font-semibold text-foreground">أرسلي لنا رسالة</h2>
              <ContactForm />
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
