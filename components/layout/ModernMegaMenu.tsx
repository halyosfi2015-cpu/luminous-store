"use client";

import { useEffect, useRef, useState, Fragment } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useLang } from "@/lib/use-lang";
import { categoryTree as defaultTree, fetchCategoryTreeFromAPI, type NavCategory } from "@/components/layout/navConfig";

/* ================================================================================================ */
/* CATEGORIES PANEL — narrow vertical column drill-down, text-only                                   */
/* Column 1 lists all sections (word + blue arrow glued to the word). Hovering/clicking a section    */
/* opens column 2 for that section only; hovering/clicking a sub-section that has deeper children    */
/* opens column 3 (e.g. العناية بالبشرة → العناية بالوجه → غسول). Deepest items (leaves) open the    */
/* products page (/categories/{slug}) directly — no products inside the menu.                        */
/* Data source: categoryTree (navConfig) — derived from the Master Taxonomy, 3 levels.               */
/* Every node in the tree is a valid /categories/{slug} page, so all leaves link directly.           */
/* ================================================================================================ */
function CategoriesPanel({ onClose }: { onClose: () => void }) {
  const { lang } = useLang();
  const isAr = lang === "ar";

  const [tree, setTree] = useState<NavCategory[]>(defaultTree);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeChild, setActiveChild] = useState<string | null>(null);

  useEffect(() => {
    fetchCategoryTreeFromAPI().then(setTree);
  }, []);

  const section = tree.find((s) => s.slug === activeSection) ?? null;
  const activeChildNode = section?.children?.find((c) => c.slug === activeChild) ?? null;
  const grandChildren = activeChildNode?.children ?? [];

  const label = (n: NavCategory) => (isAr ? n.labelAr : n.labelEn);
  const canDrill = (n: NavCategory) => Boolean(n.children && n.children.length > 0);
  const isLeaf = (n: NavCategory) => !canDrill(n);

  const renderRow = (n: NavCategory, active: boolean, onOpen: () => void, onToggle: () => void) => {
    const drill = canDrill(n);
    const content = (
      <>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{label(n)}</span>
        <ChevronLeft
          size={12}
          strokeWidth={2.5}
          className={`shrink-0 text-blue-600 ${isAr ? "" : "rotate-180"}`}
        />
      </>
    );
    const cls = `group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
      active
        ? "bg-blue-50 text-blue-700"
        : "text-muted hover:bg-blue-50/60 hover:text-blue-700"
    }`;
    if (drill) {
      return (
        <button
          type="button"
          onMouseEnter={onOpen}
          onClick={onToggle}
          className={cls}
          aria-current={active ? "true" : undefined}
        >
          {content}
        </button>
      );
    }
    return (
      <Link href={`/categories/${n.slug}`} onClick={onClose} className={cls}>
        {content}
      </Link>
    );
  };

  return (
    <div className="relative">
      {/* Column 1 — all sections */}
      <ul className="w-60 space-y-0.5">
        {tree.map((sec) => (
          <li key={sec.slug}>
            {renderRow(
              sec,
              sec.slug === activeSection,
              () => {
                setActiveSection(sec.slug);
                setActiveChild(null);
              },
              () => {
                if (activeSection === sec.slug) {
                  setActiveSection(null);
                  setActiveChild(null);
                } else {
                  setActiveSection(sec.slug);
                  setActiveChild(null);
                }
              }
            )}
          </li>
        ))}
      </ul>

      {/* Column 2 — sub-sections of the hovered section only */}
      {section && (
        <div className="absolute top-0 start-full ps-2">
          <div className="relative">
            <div className="w-64 rounded-xl border border-border/60 bg-white p-2 shadow-2xl shadow-primary/10">
              <ul className="max-h-96 space-y-0.5 overflow-y-auto">
                {section.children?.map((child) => {
                  if (!canDrill(child) && !isLeaf(child)) return null;
                  return (
                    <li key={child.slug}>
                      {renderRow(
                        child,
                        child.slug === activeChild,
                        () => setActiveChild(child.slug),
                        () => {
                          if (activeChild === child.slug) {
                            setActiveChild(null);
                          } else {
                            setActiveChild(child.slug);
                          }
                        }
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Column 3 — deeper children, only when the sub-section has children (e.g. face-care) */}
            {activeChildNode && grandChildren.length > 0 && (
              <div className="absolute top-0 start-full ps-2">
                <div className="w-64 rounded-xl border border-border/60 bg-white p-2 shadow-2xl shadow-primary/10">
                  <ul className="max-h-96 space-y-0.5 overflow-y-auto">
                    {grandChildren.filter((g) => canDrill(g) || isLeaf(g)).map((g) => (
                      <li key={g.slug}>
                        {renderRow(g, false, () => {}, () => {})}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================================================ */
/* WRAPPER — narrow anchored flyout panel positioned right below the active nav trigger              */
/* ================================================================================================ */
interface ModernMegaMenuProps {
  isOpen: boolean;
  activeItem: "categories" | null;
  setActiveItem: (item: "categories" | null) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  onPanelMouseEnter?: () => void;
  onPanelMouseLeave?: () => void;
}

type PanelPos = { top: number; right: number } | null;

export default function ModernMegaMenu({
  isOpen,
  activeItem,
  setActiveItem,
  triggerRef,
  onPanelMouseEnter,
  onPanelMouseLeave,
}: ModernMegaMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PanelPos>(null);
  const [posFor, setPosFor] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      if (!isOpen || !activeItem) {
        setPos(null);
        setPosFor(null);
        return;
      }
      const el = document.querySelector(
        `[data-mega-trigger="${activeItem}"]`
      ) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
        setPosFor(activeItem);
      }
    };
    sync();
  }, [isOpen, activeItem]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insidePanel = panelRef.current?.contains(target);
      const insideTrigger = triggerRef.current?.contains(target);
      if (!insidePanel && !insideTrigger) {
        setActiveItem(null);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveItem(null);
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, setActiveItem, triggerRef]);

  if (!isOpen || !activeItem || posFor !== activeItem) return null;

  const onClose = () => setActiveItem(null);

  return (
    <Fragment>
      <div
        ref={panelRef}
        data-mega-menu
        onMouseEnter={onPanelMouseEnter}
        onMouseLeave={onPanelMouseLeave}
        style={{ position: "fixed", top: pos?.top ?? 0, right: pos?.right ?? 0, width: "17rem" }}
        className="z-50 rounded-2xl border border-border/60 bg-white p-3 shadow-2xl shadow-primary/10"
      >
        {activeItem === "categories" && <CategoriesPanel onClose={onClose} />}
      </div>
      <style jsx global>{`
        @keyframes mega-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mega-slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        [data-mega-menu] {
          animation: mega-slide-down 220ms cubic-bezier(0.23, 1, 0.32, 1) both;
        }
      `}</style>
    </Fragment>
  );
}
