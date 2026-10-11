"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, Send, ShieldCheck, Check } from "lucide-react";
import { FaInstagram, FaTiktok, FaWhatsapp, FaFacebook, FaYoutube } from "react-icons/fa";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Logo from "@/components/layout/Logo";
import { useLang } from "@/lib/use-lang";
import { siteConfig } from "@/src/data/siteConfig";
import { getTaxonomyCategoryCards, type TaxonomyCategoryCard } from "@/src/lib/taxonomy";

interface FooterCategory {
  href: string;
  label: string;
  labelEn: string;
}

const defaultCategories: FooterCategory[] = getTaxonomyCategoryCards().map((c) => ({
  href: `/categories/${c.slug}`,
  label: c.nameAr,
  labelEn: c.name,
}));

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
    tiktok: FaTiktok,
    snapchat: FaInstagram,
    youtube: FaYoutube,
    facebook: FaFacebook,
    whatsapp: FaWhatsapp,
  } as const;

  const UNVERIFIED_SOCIAL_DOMAINS = [
    "tiktok.com/@luminousderma",
    "snapchat.com/add/luminousderma",
    "youtube.com/@luminousderma",
  ];

  function isVerifiedUrl(url: string): boolean {
    return !UNVERIFIED_SOCIAL_DOMAINS.some((domain) => url.includes(domain));
  }

  const socialLinks = siteConfig.socialLinks.map((link) => {
    const isUnverified = !isVerifiedUrl(link.url);
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
  const [categories, setCategories] = useState(defaultCategories);
  const [socialLinks, setSocialLinks] = useState<Array<{ href: string; icon: typeof FaInstagram; label: string }>>([]);
  const isAr = lang === "ar";

  useEffect(() => {
    fetch("/api/content/taxonomy", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.categoryCards) && data.categoryCards.length > 0) {
          setCategories(data.categoryCards.map((c: TaxonomyCategoryCard) => ({
            href: `/categories/${c.slug}`,
            label: c.nameAr,
            labelEn: c.name,
          })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Fetch social links from persisted settings
    fetch("/api/social-links", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.socialLinks) {
          const mapped = data.socialLinks.map((link: { platform: string; url: string; label: string }) => {
            const isUnverified = !isVerifiedUrl(link.url);
            return {
              href: isUnverified ? "#" : link.url,
              icon: socialLinkMap[link.platform as keyof typeof socialLinkMap] || FaInstagram,
              label: link.label,
            };
          });
          setSocialLinks(mapped);
        }
      })
      .catch(() => {
        // Fallback to siteConfig if API fails
        const fallback = siteConfig.socialLinks.map((link) => {
          const isUnverified = !isVerifiedUrl(link.url);
          return {
            href: isUnverified ? "#" : link.url,
            icon: socialLinkMap[link.icon as keyof typeof socialLinkMap] || FaInstagram,
            label: link.platform.charAt(0).toUpperCase() + link.platform.slice(1),
          };
        });
        setSocialLinks(fallback);
      });
  }, []);

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
      <div className="magic-divider pointer-events-none absolute inset-x-0 top-0" aria-hidden="true" />

      <div className="relative border-b border-[#D4AF37]/20">
        <Container className="py-6 sm:py-12">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-8 lg:grid-cols-5">
            <div className="sm:col-span-2 lg:col-span-2">
              <div className="ms-0 sm:ms-6">
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
                      className="min-h-[44px] min-w-[44px] flex h-11 w-11 items-center justify-center rounded-full border border-[#D4AF37]/20 bg-[#7A3E9D]/20 text-[#D4AF37]/40 cursor-not-allowed"
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
                      className="min-h-[44px] min-w-[44px] flex h-11 w-11 items-center justify-center rounded-full border border-[#D4AF37]/20 bg-[#7A3E9D]/20 text-[#D4AF37] transition-all duration-200 ease-out-smooth hover:bg-[#D4AF37] hover:text-[#352347] hover:shadow-md hover:shadow-[#D4AF37]/20"
                      aria-label={label}
                    >
                      <Icon size={16} />
                    </a>
                  );
                })}
              </div>
            </div>
            
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#D4AF37] font-playfair sm:mb-4">
                <span className="h-1 w-4 rounded-full bg-[#D4AF37]" />
                {isAr ? "خدمة العملاء" : "Customer Service"}
              </h3>
              <ul className="space-y-0 sm:space-y-1">
                {services.map(({ href, label, labelEn }) => (
                  <li key={href}>
                    <Link href={href} className="inline-block py-1 min-h-[36px] text-xs text-[#FFF7F2]/50 transition-colors duration-200 ease-out-smooth hover:text-[#D4AF37] font-montserrat sm:py-2 sm:min-h-[44px] sm:text-sm">
                      {isAr ? label : labelEn}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#D4AF37] font-playfair sm:mb-4">
                <span className="h-1 w-4 rounded-full bg-[#D4AF37]" />
                {isAr ? "السياسات" : "Policies"}
              </h3>
              <ul className="space-y-0 sm:space-y-1">
                {policies.map(({ href, label, labelEn }) => (
                  <li key={href}>
                    <Link href={href} className="inline-block py-1 min-h-[36px] text-xs text-[#FFF7F2]/50 transition-colors duration-200 ease-out-smooth hover:text-[#D4AF37] font-montserrat sm:py-2 sm:min-h-[44px] sm:text-sm">
                      {isAr ? label : labelEn}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#D4AF37] font-playfair sm:mb-4">
                <span className="h-1 w-4 rounded-full bg-[#D4AF37]" />
                {isAr ? "معلومات الاتصال" : "Contact Info"}
              </h3>
              <ul className="space-y-0.5 sm:space-y-1">
                <li className="flex items-center gap-2 text-xs text-[#FFF7F2]/50 font-montserrat sm:text-sm">
                  <MapPin size={14} className="shrink-0 text-[#D4AF37]" />
                  <span>{isAr ? "صنعاء، اليمن" : "Sana'a, Yemen"}</span>
                </li>
                <li className="min-w-0">
                  <a href="tel:+967780015305" dir="ltr" className="flex items-center gap-2 py-1 text-xs text-[#FFF7F2]/50 transition-colors duration-200 ease-out-smooth hover:text-[#D4AF37] font-montserrat sm:py-2 sm:text-sm">
                    <Phone size={14} className="shrink-0 text-[#D4AF37]" />
                    <span className="min-w-0 break-all">+967 780 015 305</span>
                  </a>
                </li>
                <li className="min-w-0">
                  <a href="mailto:info@luminousderma.com" dir="ltr" className="flex items-center gap-2 py-1 text-xs text-[#FFF7F2]/50 transition-colors duration-200 ease-out-smooth hover:text-[#D4AF37] font-montserrat sm:py-2 sm:text-sm">
                    <Mail size={14} className="shrink-0 text-[#D4AF37]" />
                    <span className="min-w-0 break-all">info@luminousderma.com</span>
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

        <Container className="relative py-4 sm:py-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between sm:gap-6">
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
                  className="w-full flex-1 rounded-full border border-[#D4AF37]/30 bg-[#4B2A6F]/40 px-4 py-3 min-h-[44px] text-sm text-[#FFF7F2] outline-none backdrop-blur-sm transition-all duration-200 ease-out-smooth placeholder:text-[#FFF7F2]/35 focus:border-[#F7D98C] focus:shadow-[0_0_14px_-2px_rgba(212,175,55,0.45)] font-montserrat"
                />
                <Button
                  type="submit"
                  aria-label={isAr ? "اشتراك" : "Subscribe"}
                  className="shrink-0 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F0C75E] px-5 py-3 min-h-[44px] min-w-[44px] text-sm font-semibold text-[#352347] shadow-[0_0_16px_-2px_rgba(212,175,55,0.55)] hover:from-[#F7D98C] hover:to-[#D4AF37] hover:shadow-[0_0_22px_-2px_rgba(212,175,55,0.7)]"
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

      <Container className="relative py-4 sm:py-8">
        <div className="flex flex-col items-center justify-between gap-2 text-center text-xs text-[#FFF7F2]/35 sm:flex-row sm:gap-3 sm:text-start sm:text-sm font-montserrat">
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