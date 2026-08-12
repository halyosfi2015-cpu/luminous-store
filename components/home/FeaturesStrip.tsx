"use client";

import Container from "@/components/ui/Container";
import { Sparkles, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { useLang } from "@/lib/use-lang";

const features = [
  {
    icon: Sparkles,
    titleAr: "منتجات أصلية 100%",
    titleEn: "100% Authentic Products",
    subtitleAr: "ضمان أصالة جميع المنتجات",
    subtitleEn: "Guaranteed authenticity for all products",
  },
  {
    icon: ShieldCheck,
    titleAr: "عناية متخصصة",
    titleEn: "Expert Skincare",
    subtitleAr: "مستشارون متخصصون لمساعدتك",
    subtitleEn: "Specialists to guide your routine",
  },
  {
    icon: Truck,
    titleAr: "توصيل سريع",
    titleEn: "Fast Delivery",
    subtitleAr: "توصيل لجميع أنحاء اليمن",
    subtitleEn: "Delivery across Yemen",
  },
  {
    icon: RotateCcw,
    titleAr: "إرجاع سهل",
    titleEn: "Easy Returns",
    subtitleAr: "سياسة إرجاع مرنة",
    subtitleEn: "Flexible return policy",
  },
];

export default function FeaturesStrip() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  return (
    <section className="w-full bg-background py-12 sm:py-16 lg:py-20">
      <Container>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.titleEn}
                className="group flex flex-col items-center gap-3 rounded-card border border-border bg-card p-6 shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/10 sm:p-8 lg:min-w-[200px] lg:flex-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-button bg-gradient-to-br from-primary to-secondary text-white shadow-card transition-transform duration-300 ease-spring group-hover:scale-110 sm:h-14 sm:w-14">
                  <Icon size={24} />
                </div>
                <h3 className="text-sm font-bold text-foreground sm:text-base">
                  {isAr ? feature.titleAr : feature.titleEn}
                </h3>
                <p className="text-center text-xs text-muted leading-relaxed sm:text-sm">
                  {isAr ? feature.subtitleAr : feature.subtitleEn}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
