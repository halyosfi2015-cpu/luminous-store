"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Flower2,
  Scissors,
  Palette,
  FlaskRound,
  Baby,
  Sofa,
  Flame,
  Pill,
  ChevronDown,
  LayoutGrid,
  Droplets,
  Eye,
  Heart,
  Sun,
  ShowerHead,
  SprayCan,
  Gem,
  Wind,
  Gift,
  Home,
} from "lucide-react";
import { useLang } from "@/lib/use-lang";
import { sectionCategoriesMap } from "@/src/data/products";
import { categories as subCategories } from "@/src/data/products";
import { categoryColors } from "@/components/home/Categories";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  sparkles: Sparkles,
  flower: Flower2,
  shower: ShowerHead,
  palette: Palette,
  fragrance: FlaskRound,
  gift: Gift,
  baby: Baby,
  flame: Flame,
  pill: Pill,
  tools: Sofa,
};

const childIconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  droplets: Droplets,
  spray: SprayCan,
  droplet: Droplets,
  drop: Droplets,
  sun: Sun,
  eye: Eye,
  heart: Heart,
  mask: Sparkles,
  scrub: Sparkles,
  "face-makeup": Palette,
  "eye-makeup": Eye,
  "lip-makeup": Heart,
  fragrance: FlaskRound,
  "hair-oils": Droplets,
  shampoo: SprayCan,
  conditioner: Flower2,
  "body-wash": ShowerHead,
  "body-lotion": Droplets,
  "body-oils": Droplets,
  flame: Flame,
  tree: Gem,
  home: Home,
  lamp: Sparkles,
  tools: Sofa,
  wind: Wind,
  scissors: Scissors,
  tooth: Sparkles,
  men: FlaskRound,
  gift: Gift,
};

export default function CategorySidebar({ className = "" }: { className?: string }) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState<string | null>(null);

  const sections = useMemo(
    () => sectionCategoriesMap.filter((s) => s.children.length > 0),
    []
  );

  return (
    <aside
      className={`w-full rounded-card border border-border bg-card shadow-card ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 border-b border-border bg-gradient-to-l from-primary/10 to-transparent px-4 py-3.5 transition-colors hover:bg-primary/5"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutGrid size={15} />
          </span>
          {isAr ? "جميع الفئات" : "All Categories"}
        </span>
        <ChevronDown
          size={16}
          className={`text-muted transition-transform duration-300 ease-out-smooth ${open ? "rotate-180" : ""}`}
        />
      </button>

      <nav className={open ? "block" : "hidden"} aria-label={isAr ? "الفئات" : "Categories"}>
        <ul className="flex flex-col gap-0.5 p-2">
          {sections.map((section) => {
            const Icon = iconMap[section.icon] || Sparkles;
            const color = categoryColors[section.slug] || "from-primary to-secondary";
            const expanded = active === section.slug;
            return (
              <li key={section.slug}>
                <div
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors duration-200 ${
                    expanded ? "bg-primary/5" : "hover:bg-accent"
                  }`}
                >
                  <Link
                    href={`/categories/${section.slug}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white`}>
                      <Icon size={16} />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                        {isAr ? section.nameAr : section.name}
                      </span>
                      <span className="text-[11px] text-muted">
                        {section.children.length} {isAr ? "قسم فرعي" : "subcategories"}
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    aria-label={expanded ? (isAr ? "إغلاق" : "Collapse") : (isAr ? "فتح" : "Expand")}
                    onClick={() => setActive(expanded ? null : section.slug)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-all duration-200 hover:bg-primary/10 hover:text-primary"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-300 ease-out-smooth ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                <ul
                  className={`overflow-hidden pl-4 transition-all duration-300 ease-out-smooth ${
                    expanded ? "mb-1 max-h-96" : "max-h-0"
                  }`}
                >
                  {section.children.map((childSlug) => {
                    const child = subCategories.find((c) => c.slug === childSlug);
                    if (!child) return null;
                    const ChildIcon = childIconMap[child.icon ?? "sparkles"] || Sparkles;
                    return (
                      <li key={childSlug}>
                        <Link
                          href={`/categories/${childSlug}`}
                          className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors duration-200 hover:bg-accent hover:text-primary"
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/5 text-primary transition-colors group-hover:bg-primary/10">
                            <ChildIcon size={12} />
                          </span>
                          <span className="truncate">
                            {isAr ? child.nameAr : child.name}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
