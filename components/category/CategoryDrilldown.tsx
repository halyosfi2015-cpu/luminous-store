"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { useLang } from "@/lib/use-lang";
import type { NavCategory } from "@/components/layout/navConfig";

export default function CategoryDrilldown({ tree, initialSlug, showCounts = true }: { tree: NavCategory[]; initialSlug?: string; showCounts?: boolean }) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [path, setPath] = useState<string[]>(initialSlug ? [initialSlug] : []);

  const label = (n: NavCategory) => (isAr ? n.labelAr : n.labelEn);
  let nodes: NavCategory[] = tree;
  let trail: NavCategory[] = [];
  for (const slug of path) {
    const found = nodes.find((n) => n.slug === slug);
    if (!found) break;
    trail = [...trail, found];
    nodes = found.children ?? [];
  }
  const current = trail[trail.length - 1] ?? null;

  const goBack = () => setPath((p) => p.slice(0, -1));

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center gap-2 sticky top-2 z-10">
        {current && (
          <button
            type="button"
            onClick={goBack}
            aria-label={isAr ? "رجوع" : "Back"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-all hover:border-primary/40 hover:text-primary active:scale-95"
          >
            <ChevronRight size={18} className={isAr ? "" : "rotate-180"} />
          </button>
        )}
        <h2 className="text-lg font-semibold text-foreground">
          {current ? label(current) : isAr ? "الأقسام الرئيسية" : "Main Categories"}
        </h2>
      </div>

      {current && (
        <Link
          href={`/categories/${current.slug}`}
          className="mb-3 flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 min-h-[48px] text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-700 active:scale-[0.99]"
        >
          <LayoutGrid size={15} />
          {isAr ? `عرض كل ${label(current)}` : `View all ${label(current)}`}
        </Link>
      )}

      <ul className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {nodes.map((n, i) => {
          const drill = Boolean(n.children && n.children.length > 0);
          const rowCls =
            "group flex w-full min-h-[52px] items-center gap-3 px-4 py-3 text-start transition-colors duration-200 hover:bg-primary/5 active:bg-primary/10";
          const content = (
            <>
              <span className="order-1 min-w-0 flex-1 text-[15px] font-bold leading-snug break-words text-foreground transition-colors group-hover:text-primary sm:text-[15px] sm:truncate">
                {label(n)}
              </span>
              {drill && showCounts && (
                <span className="order-2 shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                  {n.children!.length} {isAr ? "أقسام" : "sections"}
                </span>
              )}
              <ChevronLeft
                size={16}
                strokeWidth={2.5}
                className={`order-3 shrink-0 transition-all duration-200 group-hover:-translate-x-0.5 ${drill ? "text-primary" : "text-muted"} ${isAr ? "" : "rotate-180"}`}
              />
            </>
          );
          return (
            <li key={n.slug} className={i > 0 ? "border-t border-border/60" : ""}>
              {drill ? (
                <button type="button" onClick={() => setPath((p) => [...p, n.slug])} className={rowCls}>
                  {content}
                </button>
              ) : (
                <Link href={`/categories/${n.slug}`} className={rowCls}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
