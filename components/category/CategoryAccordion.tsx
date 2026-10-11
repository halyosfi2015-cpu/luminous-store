"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useLang } from "@/lib/use-lang";
import type { NavCategory } from "@/components/layout/navConfig";

/**
 * Sliding panes for the mobile drawer: the main column stays, and tapping an
 * arrow slides the sub-column in from the arrow's own direction (side by side,
 * never stacked below). The arrow always points one fixed direction.
 * Tapping a name navigates to the category page.
 */
export default function CategoryAccordion({
  tree,
  onNavigate,
}: {
  tree: NavCategory[];
  onNavigate?: () => void;
}) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [path, setPath] = useState<string[]>([]);

  const label = (n: NavCategory) => (isAr ? n.labelAr : n.labelEn);

  const touchXRef = useRef<{ x: number; slug: string } | null>(null);

  // Panes: roots + one pane per path level.
  const panes: { title: string; nodes: NavCategory[] }[] = [{ title: "", nodes: tree }];
  let cursor: NavCategory[] = tree;
  for (const slug of path) {
    const found = cursor.find((n) => n.slug === slug);
    if (!found || !found.children || found.children.length === 0) break;
    panes.push({ title: label(found), nodes: found.children });
    cursor = found.children;
  }
  const level = panes.length - 1;
  const arrowCls = isAr ? "" : "rotate-180";

  // Main pane takes full width; each sub pane is narrower so the previous
  // column stays partially visible beside it.
  const widths = panes.map((_, i) => (i === 0 ? 1 : 0.82));
  const total = widths.reduce((a, b) => a + b, 0);
  const offsetBefore = widths.slice(0, level).reduce((a, b) => a + b, 0);

  return (
    <div className="overflow-hidden" dir={isAr ? "rtl" : "ltr"}>
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{
          width: `${total * 100}%`,
          transform: `translateX(${(isAr ? offsetBefore : -offsetBefore) * 100 / total}%)`,
        }}
      >
        {panes.map((pane, i) => (
          <div key={i} className={`min-w-0 shrink-0 bg-white ${i > 0 ? "border-s border-border/70 shadow-[8px_0_16px_-8px_rgba(0,0,0,0.12)]" : ""}`} style={{ width: `${(widths[i] * 100) / total}%` }}>
            <div dir={isAr ? "rtl" : "ltr"}>
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => setPath((p) => p.slice(0, -1))}
                  className="mb-2 flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
                >
                  <ChevronLeft size={17} className={isAr ? "rotate-180" : ""} />
                  {pane.title || (isAr ? "رجوع" : "Back")}
                </button>
              )}
              <ul className="flex flex-col">
                {pane.nodes.map((n) => {
                  const hasKids = Boolean(n.children && n.children.length > 0);
                  return (
                    <li key={n.slug} className="border-b border-border/60 last:border-0">
                      <div
                        className="group flex min-h-[44px] w-full items-center gap-1.5 py-1 text-start [touch-action:pan-y]"
                        onTouchStart={(e) => { const t = e.touches[0]; if (t) touchXRef.current = { x: t.clientX, slug: n.slug }; }}
                        onTouchEnd={(e) => {
                          const start = touchXRef.current;
                          touchXRef.current = null;
                          const t = e.changedTouches[0];
                          if (!start || !t || start.slug !== n.slug) return;
                          const dx = t.clientX - start.x;
                          if (Math.abs(dx) < 48) return;
                          const inward = isAr ? dx < 0 : dx > 0;
                          if (inward && hasKids) setPath((p) => [...p.slice(0, i), n.slug]);
                          else if (!inward && i > 0) setPath((p) => p.slice(0, -1));
                        }}
                      >
                        <Link
                          href={`/categories/${n.slug}`}
                          onClick={onNavigate}
                          className="min-w-0 flex-1 break-words text-[11px] font-bold leading-snug text-foreground transition-colors group-hover:text-primary"
                        >
                          {label(n)}
                        </Link>
                        {hasKids && (
                          <button
                            type="button"
                            onClick={() => setPath((p) => [...p.slice(0, i), n.slug])}
                            aria-label={isAr ? `عرض ${label(n)}` : `View ${label(n)}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-all hover:bg-primary/10 active:scale-90"
                          >
                            <ChevronLeft size={16} strokeWidth={2.5} className={arrowCls} />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
