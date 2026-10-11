"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, LayoutGrid, ChevronRight } from "lucide-react";
import { useLang } from "@/lib/use-lang";
import type { NavCategory } from "@/components/layout/navConfig";

export default function CategoryTreeNav({ tree, initialSlug, showCounts = true }: { tree: NavCategory[]; initialSlug?: string; showCounts?: boolean }) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [path, setPath] = useState<string[]>(initialSlug ? [initialSlug] : []);

  const label = (n: any) => isAr ? n.labelAr : n.labelEn;
  
  // Build current nodes and breadcrumb
  let nodes: any[] = tree;
  let trail: any[] = [];
  for (const slug of path) {
    const found = nodes.find((n) => n.slug === slug);
    if (!found) break;
    trail.push(found);
    nodes = found.children ?? [];
  }
  const current = trail[trail.length - 1] ?? null;

  const goBack = () => setPath((p) => p.slice(0, -1));

  const nodesToShow = current?.children?.length ? current.children : tree;

  return (
    <section className="mt-8">
      {/* Header with back button */}
      <div className="mb-4 flex items-center gap-2">
        {path.length > 0 && (
          <button
            type="button"
            onClick={() => setPath((p) => p.slice(0, -1))}
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

      {/* "View all" link */}
      {current && (
        <Link
          href={`/categories/${current.slug}`}
          className="mb-3 flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-700 active:scale-[0.99]"
        >
          <LayoutGrid size={15} />
          {isAr ? `عرض كل ${label(current)}` : `View all ${label(current)}`}
        </Link>
      )}

      {/* Categories list */}
      <ul className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
{nodesToShow.map((n: NavCategory, i: number) => {
            const drill = Boolean(n.children && n.children.length > 0);
          const rowCls =
            "group flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors duration-200 hover:bg-primary/5 active:bg-primary/10";
          const content = (
            <>
              <span className="order-1 min-w-0 flex-1 truncate text-sm font-bold text-foreground transition-colors group-hover:text-primary sm:text-[15px]">
                {label(n)}
              </span>
              {drill && showCounts && (
                <span className="order-2 shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
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