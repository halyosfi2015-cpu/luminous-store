import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Megaphone, Camera, CalendarDays, Mail } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteConfig } from "@/src/data/siteConfig";

export const metadata: Metadata = {
  title: "المركز الصحفي - Luminous Derma",
  description: "آخر الأخبار والبيانات الصحفية والموارد الإعلامية لعلامة لومينوس ديرما التجارية.",
};

export default function PressPage() {
  const isAr = true;

  return (
    <div dir="rtl" className="w-full pb-16">
      <Container>
        <section className="py-16 sm:py-24 lg:py-32 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            {isAr ? "المركز الصحفي" : "Press Center"}
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted">
            {isAr
              ? `آخر الأخبار والبيانات الصحفية من ${siteConfig.name}. تواصل معنا لطلب مقابلة أو مواد إعلامية.`
              : `Latest news and press releases from ${siteConfig.name}. Contact us for interview requests or media assets.`}
          </p>
        </section>

        <section className="py-16">
          <SectionTitle
            eyebrow={isAr ? "تغطية إعلامية" : "Media Coverage"}
            title={isAr ? "لومينوس ديرما في الأخبار" : "Luminous Derma in the News"}
            subtitle={isAr ? "قصة علامتنا تهمّ الإعلام وصناعة التجميل" : "Our brand story matters to the media and beauty industry"}
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Newspaper, title: { ar: "إطلاق المنصة", en: "Platform Launch" }, desc: { ar: "أطلقنا منصتنا الإلكترونية لتوفير منتجات أصلية لجميع محافظات اليمن.", en: "We launched our e-commerce platform to deliver authentic products across all Yemeni governorates." }, date: "2026" },
              { icon: Megaphone, title: { ar: "شراكات العلامات", en: "Brand Partnerships" }, desc: { ar: "نوسع شراكاتنا مع أبرز العلامات العالمية للعناية بالبشرة.", en: "We are expanding partnerships with leading global skincare brands." }, date: "2026" },
              { icon: Camera, title: { ar: "الحملات التوعوية", en: "Awareness Campaigns" }, desc: { ar: "حملات توعوية حول أهمية استخدام منتجات أصلية وآمنة.", en: "Awareness campaigns on the importance of using authentic and safe products." }, date: "2026" },
            ].map((item, i) => (
              <div key={i} className="group relative overflow-hidden rounded-card border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-card-hover">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                  <item.icon size={24} />
                </span>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title.ar}</h3>
                <p className="text-sm text-muted mb-3">{item.desc.ar}</p>
                <span className="inline-flex items-center gap-1 text-xs text-primary">
                  <CalendarDays size={14} /> {item.date}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16 bg-background/50">
          <SectionTitle
            eyebrow={isAr ? "تواصل إعلامي" : "Media Contact"}
            title={isAr ? "للطلبات الصحفية" : "For Press Inquiries"}
            subtitle={isAr ? "فريقنا جاهز للرد على استفسارات الإعلام" : "Our team is ready to respond to media inquiries"}
          />
          <div className="rounded-card border border-border bg-card p-8 text-center max-w-2xl mx-auto shadow-card">
            <p className="text-muted leading-relaxed">
              {isAr
                ? "لطلبات المقابلات أو الصور أو المواد الإعلامية، تواصل مع فريق العلاقات الإعلامية عبر البريد الإلكتروني."
                : "For interview, imagery, or media asset requests, reach out to our PR team via email."}
            </p>
            <Link
              href={`mailto:press@${siteConfig.contact.email.split("@")[1] || "luminousderma.com"}`}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Mail size={18} />
              {isAr ? "راسل فريق الإعلام" : "Email the PR Team"}
            </Link>
          </div>
        </section>
      </Container>
    </div>
  );
}
