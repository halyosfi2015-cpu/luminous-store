import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, GraduationCap, HeartHandshake, Rocket, Users, Clock } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteConfig } from "@/src/data/siteConfig";

export const metadata: Metadata = {
  title: "الوظائف - Luminous Derma",
  description: "انضم إلى فريق لومينوس ديرما. نحن نبحث عن مواهب شغوفة بالعناية بالبشرة والجمال لبناء مستقبل الجمال في اليمن.",
};

export default function CareersPage() {
  const isAr = true;

  return (
    <div dir="rtl" className="w-full pb-16">
      <Container>
        <section className="py-16 sm:py-24 lg:py-32 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            {isAr ? "انضم إلى فريقنا" : "Join Our Team"}
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted">
            {isAr
              ? "في {siteConfig.name}، نؤمن بأن أفضل فريق يصنع أفضل تجربة. ابحث عن فرصتك لتكون جزءاً من رحلة النمو لدينا."
              : `At ${siteConfig.name}, we believe the best team makes the best experience. Find your opportunity to be part of our growth journey.`}
          </p>
        </section>

        <section className="py-16">
          <SectionTitle
            eyebrow={isAr ? "لماذا نحن؟" : "Why Us?"}
            title={isAr ? "ثقافة العمل في لومينوس ديرما" : "Our Work Culture"}
            subtitle={isAr ? "بيئة عمل داعمة، نمو مستمر، وشغف بالجمال" : "A supportive environment, continuous growth, and a passion for beauty"}
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Users, title: { ar: "فريق متماسك", en: "Cohesive Team" }, desc: { ar: "نعمل كفريق واحد بروح التعاون والدعم المتبادل.", en: "We work as one team with a spirit of collaboration and mutual support." } },
              { icon: GraduationCap, title: { ar: "تطوير مستمر", en: "Continuous Development" }, desc: { ar: "برامج تدريب وتطوير مهني لتنمية مهاراتك.", en: "Training and professional development programs to grow your skills." } },
              { icon: HeartHandshake, title: { ar: "رضا وولاء", en: "Satisfaction & Loyalty" }, desc: { ar: "نقدر جهودك ونكافئ التميز والابتكار.", en: "We value your efforts and reward excellence and innovation." } },
              { icon: Rocket, title: { ar: "نمو سريع", en: "Fast Growth" }, desc: { ar: "فرص حقيقية للتقدم في منصبك مع نمو الشركة.", en: "Real opportunities to advance your role as the company grows." } },
              { icon: Clock, title: { ar: "توازن العمل والحياة", en: "Work-Life Balance" }, desc: { ar: "نحترم وقتك ونرتب الأولويات بمرونة.", en: "We respect your time and balance priorities flexibly." } },
              { icon: Briefcase, title: { ar: "رواتب تنافسية", en: "Competitive Pay" }, desc: { ar: "تعويضات تنافسية ومزايا إضافية للأداء المتميز.", en: "Competitive compensation and added benefits for top performance." } },
            ].map((item, i) => (
              <div key={i} className="group relative overflow-hidden rounded-card border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-card-hover">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                  <item.icon size={24} />
                </span>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title.ar}</h3>
                <p className="text-sm text-muted">{item.desc.ar}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16 bg-background/50">
          <SectionTitle
            eyebrow={isAr ? "الوظائف المتاحة" : "Open Positions"}
            title={isAr ? "تقدم الآن" : "Apply Now"}
            subtitle={isAr ? "لا توجد وظائف شاغرة حالياً، لكن نرحب دائماً بالطلبات التلقائية" : "No current openings, but we always welcome speculative applications"}
          />
          <div className="rounded-card border border-border bg-card p-8 text-center max-w-2xl mx-auto shadow-card">
            <p className="text-muted leading-relaxed">
              {isAr
                ? "إذا كنت تمتلك المهارات والشغف المناسب، أرسل سيرتك الذاتية إلى فريق الموارد البشرية وسنعاود التواصل معك عند توفر فرصة مناسبة."
                : "If you have the right skills and passion, send your CV to our HR team and we will reach out when a suitable opportunity opens."}
            </p>
            <Link
              href={`mailto:careers@${siteConfig.contact.email.split("@")[1] || "luminousderma.com"}`}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {isAr ? "أرسل سيرتك الذاتية" : "Send Your CV"}
            </Link>
          </div>
        </section>
      </Container>
    </div>
  );
}
