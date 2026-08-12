"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, Send, ShieldCheck, Check } from "lucide-react";
import { FaInstagram, FaWhatsapp, FaFacebook, FaYoutube } from "react-icons/fa";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Logo from "@/components/layout/Logo";
import { useLang } from "@/lib/use-lang";
import { siteConfig } from "@/src/data/siteConfig";

const categories = [
  { href: "/categories/skincare", label: "العناية بالبشرة", labelEn: "Skincare" },
  { href: "/categories/haircare", label: "العناية بالشعر", labelEn: "Haircare" },
  { href: "/categories/bodycare", label: "العناية بالجسم", labelEn: "Bodycare" },
  { href: "/categories/makeup", label: "المكياج", labelEn: "Makeup" },
  { href: "/categories/perfume", label: "العطور", labelEn: "Perfume" },
  { href: "/categories/baby", label: "الأم والطفل", labelEn: "Baby & Mom" },
  { href: "/categories/tools", label: "الأدوات والإكسسوارات", labelEn: "Tools & Accessories" },
];

const services = [
  { href: "/about", label: "من نحن", labelEn: "About Us" },
  { href: "/contact", label: "تواصل معنا", labelEn: "Contact Us" },
  { href: "/faq", label: "الأسئلة الشائعة", labelEn: "FAQ" },
  { href: "/shipping", label: "الشحن والتوصيل", labelEn: "Shipping & Delivery" },
  { href: "/returns", label: "الإرجاع والاستبدال", labelEn: "Returns & Exchange" },
];

const policies = [
  { href: "/privacy", label: "سياسة الخصوصية", labelEn: "Privacy Policy" },
  { href: "/terms", label: "الشروط والأحكام", labelEn: "Terms & Conditions" },
  { href: "/payment", label: "طرق الدفع", labelEn: "Payment Methods" },
];

  const socialLinkMap = {
    instagram: FaInstagram,
    tiktok: FaInstagram,
    snapchat: FaInstagram,
    youtube: FaYoutube,
    facebook: FaFacebook,
    whatsapp: FaWhatsapp,
  } as const;

  const UNVERIFIED_SOCIAL_DOMAINS = [
    "instagram.com/luminousderma",
    "tiktok.com/@luminousderma",
    "snapchat.com/add/luminousderma",
    "youtube.com/@luminousderma",
  ];

  const socialLinks = siteConfig.socialLinks.map((link) => {
    const isUnverified = UNVERIFIED_SOCIAL_DOMAINS.some((domain) =>
      link.url.includes(domain)
    );
    return {
      href: isUnverified ? "#" : link.url,
      icon: socialLinkMap[link.icon as keyof typeof socialLinkMap] || FaInstagram,
      label: link.platform.charAt(0).toUpperCase() + link.platform.slice(1),
    };
  });

const paymentMethods = [
  { label: "كريمي" },
  { label: "فلوسك" },
  { label: "يمن والت" },
  { label: "جيب" },
];

export default function Footer() {
  const { lang } = useLang();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const isAr = lang === "ar";
  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setEmail("");
    setSubscribed(true);
  };

  return (
      <footer className="relative w-full overflow-hidden bg-[#352347] text-neutral-300">
      <div className="pointer-events-none absolute -start-32 -top-32 h-80 w-80 rounded-full bg-[#7A3E9D]/20 blur-3xl" />
      <div className="pointer-events-none absolute -end-32 bottom-0 h-80 w-80 rounded-full bg-[#D4AF37]/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />

      <div className="relative border-b border-[#D4AF37]/20">
        <Container className="py-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div className="sm:col-span-2 lg:col-span-2">
              <div className="ms-6">
                <Logo variant="header" />
              </div>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#FFF7F2]/60 font-montserrat">
                {isAr
                  ? "لومينوس ديرما وجهتك الأولى للعناية بالبشرة والجمال. نقدم لك أفضل المنتجات العالمية والمحلية بأصل مضمون وأسعار تنافسية."
                  : "Luminous Derma is your premier destination for skincare and beauty. We offer the best global and local products with guaranteed authenticity and competitive prices."}
              </p>
              <div className="mt-4 flex items-center gap-3">
                {socialLinks.map(({ href, icon: Icon, label }) => {
                  const isUnverified = href === "#";
                  return isUnverified ? (
                    <span
                      key={label}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4AF37]/20 bg-[#7A3E9D]/20 text-[#D4AF37]/40 cursor-not-allowed"
                      aria-label={label}
                    >
                      <Icon size={16} />
                    </span>
                  ) : (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D4AF37]/20 bg-[#7A3E9D]/20 text-[#D4AF37] transition-all duration-200 ease-out-smooth hover:bg-[#D4AF37] hover:text-[#352347] hover:shadow-md hover:shadow-[#D4AF37]/20"
                      aria-label={label}
                    >
                      <Icon size={16} />
                    </a>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#D4AF37] font-playfair">
                <span className="h-1 w-4 rounded-full bg-[#D4AF37]" />
                {isAr ? "الأقسام" : "Categories"}
              </h3>
              <ul className="space-y-2.5">
                {categories.map(({ href, label, labelEn }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-[#FFF7F2]/50 transition-colors duration-200 ease-out-smooth hover:text-[#D4AF37] font-montserrat">
                      {isAr ? label : labelEn}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#D4AF37] font-playfair">
                <span className="h-1 w-4 rounded-full bg-[#D4AF37]" />
                {isAr ? "خدمة العملاء" : "Customer Service"}
              </h3>
              <ul className="space-y-2.5">
                {services.map(({ href, label, labelEn }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-[#FFF7F2]/50 transition-colors duration-200 ease-out-smooth hover:text-[#D4AF37] font-montserrat">
                      {isAr ? label : labelEn}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#D4AF37] font-playfair">
                <span className="h-1 w-4 rounded-full bg-[#D4AF37]" />
                {isAr ? "السياسات" : "Policies"}
              </h3>
              <ul className="space-y-2.5">
                {policies.map(({ href, label, labelEn }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-[#FFF7F2]/50 transition-colors duration-200 ease-out-smooth hover:text-[#D4AF37] font-montserrat">
                      {isAr ? label : labelEn}
                    </Link>
                  </li>
                ))}
              </ul>
              <h3 className="mb-4 mt-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#D4AF37] font-playfair">
                <span className="h-1 w-4 rounded-full bg-[#D4AF37]" />
                {isAr ? "معلومات الاتصال" : "Contact Info"}
              </h3>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-2 text-sm text-[#FFF7F2]/50 font-montserrat">
                  <MapPin size={14} className="shrink-0 text-[#D4AF37]" />
                  <span>{isAr ? "صنعاء، اليمن" : "Sana'a, Yemen"}</span>
                </li>
                <li>
                  <a href="tel:+967777777777" className="flex items-center gap-2 text-sm text-[#FFF7F2]/50 transition-colors duration-200 ease-out-smooth hover:text-[#D4AF37] font-montserrat">
                    <Phone size={14} className="shrink-0 text-[#D4AF37]" />
                    +967 777 777 777
                  </a>
                </li>
                <li>
                  <a href="mailto:info@luminousderma.com" className="flex items-center gap-2 text-sm text-[#FFF7F2]/50 transition-colors duration-200 ease-out-smooth hover:text-[#D4AF37] font-montserrat">
                    <Mail size={14} className="shrink-0 text-[#D4AF37]" />
                    info@luminousderma.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </Container>
      </div>

      {/* Premium utility bar — newsletter + secure payment (compact, glowing) */}
      <div className="relative overflow-hidden border-b border-[#D4AF37]/20 bg-[#352347]">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-24 w-3/4 -translate-x-1/2 rounded-full bg-[#D4AF37]/[0.08] blur-3xl" />
          <div className="absolute -left-20 -top-12 h-40 w-40 rounded-full bg-[#7A3E9D]/30 blur-3xl" />
          <div className="absolute -right-20 -top-12 h-40 w-40 rounded-full bg-[#F5A6C7]/10 blur-3xl" />
        </div>

        <Container className="relative py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:min-w-0 lg:flex-1">
              <div className="shrink-0">
                <h3 className="flex items-center gap-2 font-playfair text-sm font-bold tracking-wide text-[#F7D98C]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F7D98C] shadow-[0_0_8px_rgba(247,217,140,0.9)]" />
                  {isAr ? "اشتركي في النشرة البريدية" : "Subscribe to Our Newsletter"}
                </h3>
                <p className="mt-1 text-xs text-[#FFF7F2]/50 font-montserrat">
                  {isAr
                    ? "أحدث العروض والتخفيضات الحصرية"
                    : "Get the latest offers and exclusive discounts"}
                </p>
              </div>
              <form onSubmit={handleSubscribe} className="flex w-full items-center gap-2 sm:max-w-xs">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isAr ? "بريدك الإلكتروني" : "Your email address"}
                  required
                  disabled={subscribed}
                  className="w-full flex-1 rounded-full border border-[#D4AF37]/30 bg-[#4B2A6F]/40 px-4 py-2.5 text-sm text-[#FFF7F2] outline-none backdrop-blur-sm transition-all duration-200 ease-out-smooth placeholder:text-[#FFF7F2]/35 focus:border-[#F7D98C] focus:shadow-[0_0_14px_-2px_rgba(212,175,55,0.45)] font-montserrat"
                />
                <Button
                  type="submit"
                  aria-label={isAr ? "اشتراك" : "Subscribe"}
                  className="shrink-0 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F0C75E] px-5 py-2.5 text-sm font-semibold text-[#352347] shadow-[0_0_16px_-2px_rgba(212,175,55,0.55)] hover:from-[#F7D98C] hover:to-[#D4AF37] hover:shadow-[0_0_22px_-2px_rgba(212,175,55,0.7)]"
                >
                  {subscribed ? <Check size={15} /> : <Send size={15} />}
                </Button>
              </form>
              {subscribed && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#F7D98C] font-montserrat">
                  <Check size={13} />
                  {isAr ? "تم الاشتراك بنجاح! شكراً لانضمامك" : "Subscribed successfully! Thank you"}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 lg:shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="shrink-0 text-[#F7D98C]" />
                <span className="text-xs font-semibold text-[#FFF7F2]/60 font-montserrat">
                  {isAr ? "الدفع الآمن" : "Secure Payment"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {paymentMethods.map(({ label }) => (
                  <span
                    key={label}
                    className="rounded-lg border border-[#D4AF37]/25 bg-gradient-to-br from-[#4B2A6F]/60 to-[#7A3E9D]/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#FFF7F2]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_10px_-4px_rgba(212,175,55,0.4)] transition-all duration-200 hover:border-[#D4AF37]/50 hover:text-[#F7D98C] font-montserrat"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </div>

      <Container className="relative py-8">
        <div className="flex flex-col items-center justify-between gap-3 text-center text-sm text-[#FFF7F2]/35 sm:flex-row sm:text-left font-montserrat">
          <p>
            &copy; {new Date().getFullYear()} Luminous Derma.{" "}
            {isAr ? "جميع الحقوق محفوظة." : "All rights reserved."}
          </p>
          <p className="text-[#F5A6C7]/50">{isAr ? "صُنع بحب في اليمن" : "Made with love in Yemen"}</p>
        </div>
      </Container>
    </footer>
  );
}