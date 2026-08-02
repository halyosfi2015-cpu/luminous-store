"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { FaInstagram, FaWhatsapp, FaFacebook, FaTwitter, FaYoutube } from "react-icons/fa";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Logo from "@/components/layout/Logo";
import { useLang } from "@/lib/use-lang";

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

const socialLinks = [
  { href: "#", icon: FaFacebook, label: "Facebook" },
  { href: "#", icon: FaInstagram, label: "Instagram" },
  { href: "#", icon: FaTwitter, label: "X / Twitter" },
  { href: "#", icon: FaYoutube, label: "Youtube" },
  { href: "#", icon: FaWhatsapp, label: "WhatsApp" },
];

const paymentMethods = [
  { label: "Visa/Mastercard" },
  { label: "Mada" },
  { label: "Tabby" },
  { label: "Tamara" },
];

export default function Footer() {
  const { lang } = useLang();
  const [email, setEmail] = useState("");
  const isAr = lang === "ar";
  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setEmail("");
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
              <Link href="/" className="flex items-center ms-6">
                <Logo variant="header" />
              </Link>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#FFF7F2]/60 font-montserrat">
                {isAr
                  ? "لومينوس ديرما وجهتك الأولى للعناية بالبشرة والجمال. نقدم لك أفضل المنتجات العالمية والمحلية بأصل مضمون وأسعار تنافسية."
                  : "Luminous Derma is your premier destination for skincare and beauty. We offer the best global and local products with guaranteed authenticity and competitive prices."}
              </p>
              <div className="mt-4 flex items-center gap-3">
                {socialLinks.map(({ href, icon: Icon, label }) => (
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
                ))}
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

      <div className="relative border-b border-[#D4AF37]/20 bg-gradient-to-b from-[#4B2A6F]/60 to-[#352347]">
        <Container className="py-14">
          <div className="flex flex-col items-center gap-8 sm:flex-row">
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-base font-bold text-[#D4AF37] font-playfair tracking-wide">
                {isAr ? "اشتركي في النشرة البريدية" : "Subscribe to Our Newsletter"}
              </h3>
              <p className="mt-2 text-sm text-[#FFF7F2]/60 font-montserrat">
                {isAr
                  ? "احصلي على أحدث العروض والتخفيضات الحصرية"
                  : "Get the latest offers and exclusive discounts"}
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex w-full max-w-md gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isAr ? "بريدك الإلكتروني" : "Your email address"}
                required
                className="flex-1 rounded-full border border-[#D4AF37]/40 bg-[#4B2A6F]/50 px-5 py-3 text-sm text-[#FFF7F2] outline-none transition-all duration-200 ease-out-smooth placeholder:text-[#FFF7F2]/40 focus:border-[#F7D98C] focus:ring-1 focus:ring-[#D4AF37]/50 font-montserrat"
              />
              <Button
                type="submit"
                size="md"
                aria-label={isAr ? "اشتراك" : "Subscribe"}
                className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-semibold text-[#352347] transition-all duration-200 ease-out-smooth hover:bg-[#F7D98C] hover:shadow-lg hover:shadow-[#D4AF37]/30"
              >
                <Send size={16} />
              </Button>
            </form>
          </div>
        </Container>
      </div>

      <div className="relative border-b border-[#D4AF37]/20 bg-[#352347]/80">
        <Container className="py-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <p className="text-sm font-semibold text-[#FFF7F2]/50 font-montserrat">
              {isAr ? "طرق الدفع المتاحة" : "Accepted Payment Methods"}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {paymentMethods.map(({ label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-lg border border-[#D4AF37]/20 bg-[#7A3E9D]/20 px-4 py-2 text-sm text-[#FFF7F2]/50 font-montserrat"
                >
                  {label}
                </div>
              ))}
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