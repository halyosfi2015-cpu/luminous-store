"use client";

import { BadgeCheck, Truck, ShieldCheck, Headphones } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { useLang } from "@/lib/use-lang";

const reasons = [
  {
    icon: BadgeCheck,
    titleAr: "منتجات أصلية 100%",
    subtitleAr: "نضمن لكِ منتجات أصلية من الماركات العالمية مباشرة",
    titleEn: "100% Authentic",
    subtitleEn: "Genuine products sourced directly from global brands",
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    icon: Truck,
    titleAr: "توصيل سريع",
    subtitleAr: "شحن لجميع المحافظات مع تتبع لحظي لطلبكِ",
    titleEn: "Fast Delivery",
    subtitleEn: "Shipping to all governorates with live order tracking",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: ShieldCheck,
    titleAr: "دفع آمن",
    subtitleAr: "طرق دفع متعددة وآمنة لحماية بياناتكِ",
    titleEn: "Secure Payment",
    subtitleEn: "Multiple safe payment methods to protect your data",
    color: "text-secondary-500",
    bg: "bg-secondary/10",
  },
  {
    icon: Headphones,
    titleAr: "دعم خبراء",
    subtitleAr: "فريق دعم واستشارات متخصصة على مدار الساعة",
    titleEn: "Expert Support",
    subtitleEn: "Dedicated support and consultations around the clock",
    color: "text-accent-500",
    bg: "bg-accent/10",
  },
];

export default function WhyChoose() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  return (
    <section className="w-full bg-gradient-to-b from-background via-secondary-50/40 to-background py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionTitle
          eyebrow={isAr ? "لماذا لومينوس ديرما؟" : "Why Luminous Derma?"}
          title={isAr ? "تجربة تسوق فاخرة وموثوقة" : "A Luxurious & Trusted Shopping Experience"}
          subtitle={
            isAr
              ? "نلتزم بتقديم الأفضل لعملائنا في كل خطوة من رحلة التسوق"
              : "We commit to delivering the best for our customers at every step"
          }
          align="center"
        />
        <HorizontalCarousel ariaLabel={isAr ? "لماذا نحن" : "Why choose us"}>
          {reasons.map((reason) => (
            <div
              key={reason.titleAr}
              className="group flex w-64 shrink-0 flex-col items-center gap-3 rounded-card border border-border bg-card p-6 text-center shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:border-secondary/30 hover:shadow-card-hover sm:w-72"
            >
              <span className={`flex h-14 w-14 items-center justify-center rounded-button ${reason.bg} ${reason.color} transition-transform duration-300 ease-spring group-hover:-rotate-6 group-hover:scale-110`}>
                <reason.icon size={24} />
              </span>
              <h3 className="font-sans text-base font-bold text-foreground">{isAr ? reason.titleAr : reason.titleEn}</h3>
              <p className="text-sm leading-relaxed text-muted">{isAr ? reason.subtitleAr : reason.subtitleEn}</p>
            </div>
          ))}
        </HorizontalCarousel>
      </Container>
    </section>
  );
}
