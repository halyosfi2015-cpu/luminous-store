"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Store, Newspaper, GraduationCap } from "lucide-react";
import Container from "@/components/ui/Container";
import { useLang } from "@/lib/use-lang";
import { getTaxonomyCategoryCards, type TaxonomyCategoryCard } from "@/src/lib/taxonomy";
import { resolveTaxonomyIcon } from "@/components/layout/taxonomyCategoryUi";

interface NavItem {
  label: { ar: string; en: string };
  href: string;
  icon: typeof Sparkles;
  color: string;
}

function mapCategories(cards: TaxonomyCategoryCard[]): NavItem[] {
  return cards.map((cat) => ({
    label: { ar: cat.nameAr, en: cat.name },
    href: `/categories/${cat.slug}`,
    icon: resolveTaxonomyIcon(cat.icon),
    color: "from-primary to-secondary",
  }));
}

const defaultCategories = mapCategories(getTaxonomyCategoryCards());

const quickLinks = [
  { label: { ar: "اختبار البشرة", en: "Skin Quiz" }, href: "/quiz", icon: Sparkles, color: "from-secondary to-primary" },
  { label: { ar: "العلامات التجارية", en: "Brands" }, href: "/brands", icon: Store, color: "from-primary to-secondary" },
  { label: { ar: "المقالات", en: "Articles" }, href: "/articles", icon: Newspaper, color: "from-accent to-accent-dark" },
  { label: { ar: "الخبراء", en: "Experts" }, href: "/experts", icon: GraduationCap, color: "from-secondary to-accent" },
];

export default function Navbar() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [categories, setCategories] = useState(defaultCategories);

  useEffect(() => {
    fetch("/api/content/taxonomy", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.categoryCards) && data.categoryCards.length > 0) {
          setCategories(mapCategories(data.categoryCards));
        }
      })
      .catch(() => {});
  }, []);

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
