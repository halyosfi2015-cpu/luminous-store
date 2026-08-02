import type { Metadata } from "next";
import { ShieldCheck, Truck, UsersRound, Award, Heart, Leaf } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteConfig } from "@/src/data/siteConfig";

export const metadata: Metadata = {
  title: "من نحن - Luminous Derma",
  description: "تعرف على لومينوس ديرما، وجهتك الموثوقة للعناية بالبشرة والجمال في اليمن. منتجات أصلية من أشهر العلامات التجارية العالمية.",
};

export default function AboutPage() {
  const { description } = siteConfig;
  const isAr = true;

  return (
    <div dir="rtl" className="w-full pb-16">
      <Container>
        <section className="py-16 sm:py-24 lg:py-32 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            {isAr ? "من نحن" : "About Us"}
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted">
            {isAr ? description.ar : description.en}
          </p>
        </section>

        <section className="py-16">
          <SectionTitle
            eyebrow={isAr ? "قيمنا" : "Our Values"}
            title={isAr ? "ما يميزنا" : "What Sets Us Apart"}
            subtitle={isAr ? "نلتزم بأعلى معايير الجودة والثقة في كل ما نقدمه" : "We commit to the highest standards of quality and trust in everything we offer"}
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: ShieldCheck, title: { ar: "منتجات أصلية 100%", en: "100% Authentic Products" }, desc: { ar: "نضمن أصالة كل منتج عبر التوريد المباشر من الموزعين المعتمدين.", en: "We guarantee authenticity of every product through direct sourcing from authorized distributors." } },
              { icon: Truck, title: { ar: "توصيل سريع وآمن", en: "Fast & Secure Delivery" }, desc: { ar: "شحن لجميع محافظات اليمن مع تتبع لحظي للطلب.", en: "Shipping to all Yemen governorates with real-time order tracking." } },
              { icon: UsersRound, title: { ar: "دعم عملاء متميز", en: "Exceptional Support" }, desc: { ar: "فريق متخصص جاهز للمساعدة في أي وقت.", en: "Dedicated team ready to assist anytime." } },
              { icon: Award, title: { ar: "خبرة موثوقة", en: "Trusted Expertise" }, desc: { ar: "منتجات مختارة بعناية من قبل خبراء العناية بالبشرة.", en: "Products carefully curated by skincare experts." } },
              { icon: Heart, title: { ar: "رضا العملاء", en: "Customer Satisfaction" }, desc: { ar: "سياسة إرجاع مرنة وضمان رضا العميل.", en: "Flexible return policy and customer satisfaction guarantee." } },
              { icon: Leaf, title: { ar: "منتجات آمنة", en: "Safe Products" }, desc: { ar: "خالية من المواد الضارة، مناسبة للبشرة الحساسة.", en: "Free from harmful ingredients, suitable for sensitive skin." } },
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
            eyebrow={isAr ? "رحلتنا" : "Our Journey"}
            title={isAr ? "قصة لومينوس ديرما" : "The Luminous Derma Story"}
            subtitle={isAr ? "كيف بدأنا وحيث نتجه" : "How We Started and Where We're Going"}
          />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 max-w-4xl mx-auto">
            <div className="p-6 rounded-xl border border-border bg-card">
              <h3 className="text-xl font-bold text-foreground mb-4">{isAr ? "البداية" : "The Beginning"}</h3>
              <p className="text-muted leading-relaxed">
                {isAr 
                  ? "بدأ لومينوس ديرما برؤية بسيطة: توفير منتجات عناية بالبشرة أصلية وآمنة للعملاء في اليمن. لاحظنا فجوة في السوق لمنتجات عالية الجودة وموثوقة، وقررنا سد هذه الفجوة."
                  : "Luminous Derma started with a simple vision: to provide authentic and safe skincare products to customers in Yemen. We noticed a gap in the market for high-quality, trustworthy products and decided to fill it."
                }
              </p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card">
              <h3 className="text-xl font-bold text-foreground mb-4">{isAr ? "المستقبل" : "The Future"}</h3>
              <p className="text-muted leading-relaxed">
                {isAr
                  ? "نحن نعمل باستمرار على توسيع تشكيلتنا، تحسين تجربة التسوق، وتقديم خدمات جديدة مثل الاستشارات الجلدية وبرامج الولاء. هدفنا أن نصبح المنصة الرائدة للعناية بالبشرة في المنطقة."
                  : "We continuously work to expand our collection, improve the shopping experience, and offer new services like dermatology consultations and loyalty programs. Our goal is to become the leading skincare platform in the region."
                }
              </p>
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}