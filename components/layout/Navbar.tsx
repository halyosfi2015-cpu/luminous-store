"use client";

import Link from "next/link";
import { Sparkles, Flower2, Scissors, Palette, FlaskRound, Baby, Sofa, Store, Newspaper, GraduationCap } from "lucide-react";
import Container from "@/components/ui/Container";
import { useLang } from "@/lib/use-lang";

const categories = [
  { label: { ar: "العناية بالشعر", en: "Haircare" }, href: "/categories/haircare", icon: Flower2, color: "from-violet-400 to-purple-400" },
  { label: { ar: "العناية بالجسم", en: "Bodycare" }, href: "/categories/bodycare", icon: Scissors, color: "from-amber-400 to-orange-400" },
  { label: { ar: "المكياج", en: "Makeup" }, href: "/categories/makeup", icon: Palette, color: "from-fuchsia-400 to-pink-400" },
  { label: { ar: "العطور", en: "Perfume" }, href: "/categories/perfume", icon: FlaskRound, color: "from-teal-400 to-emerald-400" },
  { label: { ar: "الأطفال والأمهات", en: "Baby & Mom" }, href: "/categories/baby", icon: Baby, color: "from-sky-400 to-blue-400" },
  { label: { ar: "الأدوات والمستلزمات", en: "Tools & Accessories" }, href: "/categories/tools", icon: Sofa, color: "from-neutral-400 to-slate-400" },
];

const quickLinks = [
  { label: { ar: "اختبار البشرة", en: "Skin Quiz" }, href: "/quiz", icon: Sparkles, color: "from-secondary to-primary" },
  { label: { ar: "العلامات التجارية", en: "Brands" }, href: "/brands", icon: Store, color: "from-primary to-secondary" },
  { label: { ar: "المقالات", en: "Articles" }, href: "/articles", icon: Newspaper, color: "from-accent to-accent-dark" },
  { label: { ar: "الخبراء", en: "Experts" }, href: "/experts", icon: GraduationCap, color: "from-secondary to-accent" },
];

export default function Navbar() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  return (
    <div className="w-full border-y border-border bg-background/50">
      <Container className="py-3">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4" dir={isAr ? "rtl" : "ltr"}>
          {categories.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              aria-label={isAr ? cat.label.ar : cat.label.en}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r ${cat.color}`}>
                <cat.icon size={12} className="text-white" />
              </span>
              <span className="hidden sm:inline whitespace-nowrap">{isAr ? cat.label.ar : cat.label.en}</span>
            </Link>
          ))}
          <div className="w-full md:hidden border-t border-border my-2" />
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              aria-label={isAr ? link.label.ar : link.label.en}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r ${link.color || "from-secondary to-primary"}`}>
                <link.icon size={12} className="text-white" />
              </span>
              <span className="hidden sm:inline whitespace-nowrap">{isAr ? link.label.ar : link.label.en}</span>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}