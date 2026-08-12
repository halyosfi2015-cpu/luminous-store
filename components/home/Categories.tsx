"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles, Flower2, Scissors, Palette, FlaskRound, Baby, Sofa, Flame, Pill } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { sectionCategories } from "@/src/data/product-summaries";
import { useLang } from "@/lib/use-lang";

export const categoryIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  skincare: Sparkles,
  haircare: Flower2,
  bodycare: Scissors,
  makeup: Palette,
  perfume: FlaskRound,
  bakhoor: Flame,
  baby: Baby,
  supplements: Pill,
  tools: Sofa,
};

export const categoryColors: Record<string, string> = {
  skincare: "from-primary to-secondary",
  haircare: "from-secondary to-primary",
  bodycare: "from-accent to-accent/80",
  makeup: "from-primary/80 to-secondary/80",
  perfume: "from-accent/80 to-primary/60",
  bakhoor: "from-amber-500 to-orange-600",
  baby: "from-secondary/80 to-primary/80",
  supplements: "from-emerald-500 to-teal-600",
  tools: "from-neutral-400 to-slate-400",
};

export const categoryBgColors: Record<string, string> = {
  skincare: "from-primary/5 to-secondary/5",
  haircare: "from-secondary/5 to-primary/5",
  bodycare: "from-accent/10 to-accent/5",
  makeup: "from-primary/5 to-secondary/5",
  perfume: "from-accent/5 to-primary/5",
  bakhoor: "from-amber-50 to-orange-50",
  baby: "from-secondary/5 to-primary/5",
  supplements: "from-emerald-50 to-teal-50",
  tools: "from-neutral-100 to-slate-100",
};

export default function Categories() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  return (
    <section className="w-full bg-gradient-to-b from-card via-accent-50/30 to-card py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionTitle
          eyebrow={isAr ? "تسوقي حسب الفئة" : "Shop by Category"}
          title={isAr ? "اكتشفي تشكيلتنا" : "Discover Our Collection"}
          subtitle={
            isAr
              ? "مجموعة مختارة بعناية من أفضل المنتجات لكل احتياجاتك"
              : "Carefully curated selection of best products for all your needs"
          }
          action={
            <Link
              href="/categories"
              className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
            >
              {isAr ? "عرض الكل" : "View All"}
              <ArrowLeft size={15} className={`transition-transform duration-200 ease-out-smooth group-hover:-translate-x-0.5 ${isAr ? "" : "rotate-180"}`} />
            </Link>
          }
        />
        <HorizontalCarousel ariaLabel={isAr ? "الفئات" : "Categories"}>
          {sectionCategories.map((cat) => {
            const Icon = categoryIcons[cat.slug] || Sparkles;
             const bgColor = categoryBgColors[cat.slug] || "from-primary/5 to-secondary/5";
            return (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="group relative w-64 shrink-0 overflow-hidden rounded-card border border-border bg-gradient-to-br from-card via-card to-card p-5 text-center shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/10 sm:w-72 sm:p-6"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${bgColor} opacity-0 transition-opacity duration-300 ease-out-smooth group-hover:opacity-100`}
                />
                <div className="relative flex flex-col items-center gap-2.5">
                   <span className="flex h-18 w-18 items-center justify-center rounded-button bg-primary text-white text-2xl shadow-card transition-transform duration-300 ease-spring group-hover:-rotate-6 group-hover:scale-110 sm:h-20 sm:w-20 sm:text-3xl">
                     <Icon size={30} />
                   </span>
                  <span className="text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-primary sm:text-base">
                    {isAr ? cat.nameAr : cat.name}
                  </span>
                  <span className="rounded-pill bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-muted transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary">
                    {cat.productCount} {isAr ? "منتج" : "products"}
                  </span>
                </div>
              </Link>
            );
          })}
        </HorizontalCarousel>
      </Container>
    </section>
  );
}
