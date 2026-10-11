"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { useLang } from "@/lib/use-lang";
import type { NavCategory } from "@/components/layout/navConfig";
import { CATEGORY_IMAGE_MAP } from "@/components/home/TrendingNow";
import { resolveTaxonomyIcon } from "@/components/layout/taxonomyCategoryUi";
import MobileReveal from "@/components/ui/MobileReveal";

/**
 * MOBILE-ONLY category showcase (care-outlet pattern, Luminous identity):
 * photo card per main category with its sub-links inline below.
 * Desktop keeps the drill-down. Reversible: remove usage in categories page.
 */
export default function CategoryShowcase({ tree }: { tree: NavCategory[] }) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const label = (n: NavCategory) => (isAr ? n.labelAr : n.labelEn);

  return (
    <div className="flex flex-col gap-4 sm:hidden">
      {tree.map((n, i) => {
        const kids = n.children ?? [];
        const img = CATEGORY_IMAGE_MAP[n.slug];
        const Icon = resolveTaxonomyIcon(n.iconName);
        return (
          <MobileReveal key={n.slug} delay={Math.min(i, 4) * 60}>
            <section aria-label={label(n)}>
              <Link
                href={`/categories/${n.slug}`}
                className="group relative block overflow-hidden rounded-2xl border border-border bg-card shadow-card active:scale-[0.99]"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/15">
                  {img ? (
                    <Image
                      src={img}
                      alt={label(n)}
                      fill
                      sizes="100vw"
                      className="object-cover transition-transform duration-500 group-active:scale-105"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-primary">
                      <Icon size={44} strokeWidth={1.4} />
                    </span>
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" aria-hidden="true" />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
                    <span className="min-w-0 flex-1 truncate text-start text-[15px] font-extrabold text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">
                      {label(n)}
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
                      <ChevronLeft size={16} strokeWidth={2.5} className={isAr ? "" : "rotate-180"} />
                    </span>
                  </span>
                </div>
              </Link>
              {kids.length > 0 && (
                <div className="hide-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 pt-2.5" dir={isAr ? "rtl" : "ltr"}>
                  {kids.map((k) => (
                    <Link
                      key={k.slug}
                      href={`/categories/${k.slug}`}
                      className="flex min-h-[40px] shrink-0 snap-start items-center whitespace-nowrap rounded-full border border-border bg-card px-3.5 text-xs font-bold text-foreground transition-colors active:border-primary/40 active:text-primary"
                    >
                      {label(k)}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </MobileReveal>
        );
      })}
    </div>
  );
}
