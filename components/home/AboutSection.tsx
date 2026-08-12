"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Truck, UsersRound, Heart } from "lucide-react";
import Container from "@/components/ui/Container";
import { useLang } from "@/lib/use-lang";
import { siteConfig } from "@/src/data/siteConfig";

export default function AboutSection() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const stats = [
    { value: "+100", label: t("علامة عالمية", "Global Brands") },
    { value: "+1,500", label: t("منتج أصلي", "Authentic Products") },
    { value: "24/7", label: t("دعم فوري", "Instant Support") },
    { value: "100%", label: t("منتجات أصلية", "Genuine Products") },
  ];

  const values = [
    {
      icon: ShieldCheck,
      title: t("منتجات أصلية 100%", "100% Authentic"),
      desc: t("توريد مباشر من الموزعين المعتمدين مع ضمان الأصالة", "Direct sourcing from authorized distributors with authenticity guarantee"),
    },
    {
      icon: Truck,
      title: t("توصيل لليمن كله", "Yemen-Wide Delivery"),
      desc: t("شحن سريع وآمن لجميع المحافظات مع تتبع الطلب", "Fast secure shipping to all governorates with order tracking"),
    },
    {
      icon: UsersRound,
      title: t("خبراء متخصصون", "Skincare Experts"),
      desc: t("فريق مختص يرافقك في رحلة العناية ببشرتك", "A dedicated team guiding your skincare journey"),
    },
    {
      icon: Heart,
      title: t("تجربة فاخرة", "Luxury Experience"),
      desc: t("باقات هدايا وخدمات تجميلية لتجربة تسوق استثنائية", "Gift bundles and beauty services for an exceptional experience"),
    },
  ];

  return (
    <section id="about" className="w-full scroll-mt-28 overflow-hidden bg-white py-8 sm:py-10 lg:py-12">
      <Container>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Text side */}
          <div>
            <span className="mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-secondary">
              <span className="h-0.5 w-6 rounded-pill bg-accent" />
              {t("من نحن", "About Us")}
            </span>
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">
              {t("وجهتك الأولى للعناية الفاخرة بالبشرة", "Your Premier Destination for Luxury Skincare")}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-600 sm:text-base">
              {isAr ? siteConfig.description.ar : siteConfig.description.en}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-500 sm:text-base">
              {t(
                "منذ البداية ونحن نؤمن أن كل بشرة تستحق الاهتمام — لذلك نختار كل منتج بعناية، ونستورد من مصادر موثوقة، ونقدّم لكِ استشارات مخصصة تليق بجمالكِ.",
                "From day one we believe every skin deserves care — so we carefully curate every product, source from trusted partners, and offer personalized consultations worthy of your beauty."
              )}
            </p>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50 px-3 py-4 text-center shadow-sm"
                >
                  <p className="text-xl font-bold text-primary sm:text-2xl">{stat.value}</p>
                  <p className="mt-1 text-[10px] font-medium text-gray-500 sm:text-xs">{stat.label}</p>
                </div>
              ))}
            </div>

            <Link
              href="/about"
              className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-primary hover:shadow-xl hover:shadow-primary/20 active:scale-95"
            >
              {t("اعرفي المزيد عنا", "Learn More About Us")}
              <ArrowLeft size={14} className="transition-transform duration-300 group-hover:-translate-x-1" />
            </Link>
          </div>

          {/* Values side */}
          <div className="relative">
            <div className="absolute -start-8 -top-8 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
            <div className="absolute -end-8 -bottom-8 h-40 w-40 rounded-full bg-accent/5 blur-2xl" />
            <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
              {values.map((value, i) => (
                <div
                  key={i}
                  className="group rounded-2xl border border-gray-100 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg"
                  style={{ animation: `slideUp 0.6s cubic-bezier(0.23, 1, 0.32, 1) ${i * 80}ms both` }}
                >
                  <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                    <value.icon size={20} />
                  </span>
                  <h3 className="text-sm font-bold text-gray-900">{value.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{value.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
