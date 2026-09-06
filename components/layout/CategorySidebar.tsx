"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, LayoutGrid, Search, Sparkles } from "lucide-react";
import { useLang } from "@/lib/use-lang";
import { getTaxonomyCategoryCards, type TaxonomyCategoryCard } from "@/src/lib/taxonomy";
import { taxonomyCategoryIcons, taxonomyCategoryColors, resolveTaxonomyIcon } from "@/components/layout/taxonomyCategoryUi";

const sectionGradients: Record<string, string> = taxonomyCategoryColors;

interface CategorySidebarProps {
  className?: string;
}

export default function CategorySidebar({ className = "" }: CategorySidebarProps) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("category-sidebar-open");
      if (saved !== null) {
        return JSON.parse(saved);
      }
    }
    return true;
  });
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sections, setSections] = useState<TaxonomyCategoryCard[]>(() =>
    getTaxonomyCategoryCards().filter((s) => s.children.length > 0)
  );

  useEffect(() => {
    fetch("/api/content/taxonomy", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.categoryCards) && data.categoryCards.length > 0) {
          setSections(data.categoryCards.filter((s: TaxonomyCategoryCard) => s.children.length > 0));
        }
      })
      .catch(() => {});
  }, []);

  const filteredSections = useMemo(() => {
    if (!searchQuery) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter((section) =>
      section.nameAr.toLowerCase().includes(q) ||
      section.name.toLowerCase().includes(q) ||
      section.children.some((child) =>
        child.nameAr.toLowerCase().includes(q) ||
        child.name.toLowerCase().includes(q)
      )
    );
  }, [sections, searchQuery]);

  useEffect(() => {
    localStorage.setItem("category-sidebar-open", JSON.stringify(isOpen));
  }, [isOpen]);

  return (
    <aside
      className={`w-full rounded-2xl border border-border bg-card shadow-elevated overflow-hidden transition-all duration-300 ${className}`}
      data-category-sidebar
    >
      {/* ===== Header ===== */}
      <div className="relative overflow-hidden bg-gradient-to-l from-primary via-primary-dark to-secondary">
        <div className="pointer-events-none absolute -top-10 -end-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -start-8 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label={isAr ? (isOpen ? "إغلاق القائمة" : "فتح القائمة") : (isOpen ? "Close menu" : "Open menu")}
          className="relative w-full flex items-center justify-between gap-3 px-5 py-5 transition-colors hover:bg-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white shadow-lg backdrop-blur-sm ring-1 ring-white/20">
              <LayoutGrid size={18} />
            </div>
            <div>
              <span className="block text-base font-bold text-white">
                {isAr ? "جميع الفئات" : "All Categories"}
              </span>
              <span className="text-[11px] text-white/70">
                {sections.length} {isAr ? "قسم رئيسي" : "Main Sections"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-white sm:inline-block">
              {isAr ? "Premium" : "Premium"}
            </span>
            <ChevronDown
              size={18}
              className={`text-white/80 transition-transform duration-300 ease-spring ${isOpen ? "rotate-180" : ""}`}
            />
          </div>
        </button>
      </div>

      {/* ===== Search ===== */}
      <div className={`px-4 py-3 border-b border-border/60 bg-background/50 ${isOpen ? "" : "hidden"}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="search"
            placeholder={isAr ? "ابحث عن فئة..." : "Search categories..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-border/60 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            aria-label={isAr ? "البحث في الفئات" : "Search categories"}
          />
        </div>
      </div>

      {/* ===== Categories ===== */}
      <nav className={isOpen ? "block" : "hidden"} aria-label={isAr ? "الفئات" : "Categories"}>
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
          <ul className="flex flex-col gap-1.5 p-3">
            {filteredSections.map((section) => {
              const color = sectionGradients[section.slug] || "from-primary to-secondary";
              const expanded = activeSection === section.slug;

              const matchingChildren = section.children
                .filter((child) => {
                  if (!searchQuery) return true;
                  return child.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    child.name.toLowerCase().includes(searchQuery.toLowerCase());
                });

              return (
                <li key={section.slug} className="group overflow-hidden rounded-xl">
                  <div
                    className={`relative flex items-center justify-between gap-2 rounded-xl px-3 py-3 transition-all duration-300 ease-out-smooth ${
                      expanded
                        ? "bg-gradient-to-l from-primary/8 to-secondary/5 shadow-sm ring-1 ring-primary/10"
                        : "hover:bg-accent/60"
                    }`}
                  >
                    <Link
                      href={`/categories/${section.slug}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <span
                        className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${color} shadow-md shadow-primary/15 transition-all duration-300 ease-spring group-hover:scale-105 group-hover:shadow-lg`}
                      >
                        <span className="absolute inset-0 flex items-center justify-center opacity-40">
                          <Sparkles size={16} className="text-white" />
                        </span>
                        {(() => {
                          const SectionIcon = taxonomyCategoryIcons[section.slug] ?? resolveTaxonomyIcon(section.icon) ?? Sparkles;
                          return <SectionIcon size={24} className="relative z-10 text-white" />;
                        })()}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                          {isAr ? section.nameAr : section.name}
                        </span>
                        <span className="text-[11px] text-muted">
                          {matchingChildren.length} {isAr ? "قسم فرعي" : "subcategories"}
                        </span>
                      </div>
                    </Link>

                    <button
                      type="button"
                      aria-label={expanded ? (isAr ? "إغلاق" : "Collapse") : (isAr ? "فتح" : "Expand")}
                      onClick={() => setActiveSection(expanded ? null : section.slug)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/60 text-muted shadow-sm ring-1 ring-border/60 transition-all duration-300 ease-spring hover:bg-primary hover:text-white hover:ring-primary hover:scale-110"
                    >
                      <ChevronRight
                        size={15}
                        className={`transition-transform duration-300 ease-spring ${expanded ? (isAr ? "-rotate-90" : "rotate-90") : ""}`}
                      />
                    </button>
                  </div>

                  {/* Subcategories with smooth expand */}
                  <div
                    className={`grid transition-all duration-300 ease-out-smooth ${
                      expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <ul className="flex flex-col gap-0.5 py-2 ps-4 pe-2">
                        {matchingChildren.map((child) => {
                          const childGradient = sectionGradients[child.slug] || color;
                          const ChildIcon = taxonomyCategoryIcons[child.slug] ?? Sparkles;
                          return (
                            <li key={child.slug}>
                              <Link
                                href={`/categories/${child.slug}`}
                                className="group/child flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition-all duration-200 hover:bg-accent/60 hover:text-primary"
                              >
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${childGradient} shadow-sm transition-transform duration-200 group-hover/child:scale-110`}>
                                  <ChildIcon size={16} className="text-white" />
                                </span>
                                <span className="truncate font-semibold">
                                  {isAr ? child.nameAr : child.name}
                                </span>
                                <span className="ms-auto rounded-full bg-primary/5 px-2 py-0.5 text-[10px] font-bold text-muted transition-colors group-hover/child:bg-primary/10 group-hover/child:text-primary">
                                  {child.productCount}
                                </span>
                                <ChevronRight
                                  size={12}
                                  className="text-muted transition-transform duration-200 opacity-0 group-hover/child:opacity-100 group-hover/child:-translate-x-1"
                                />
                              </Link>
                            </li>
                          );
                        })}
                        {matchingChildren.length === 0 && (
                          <li className="px-3 py-2 text-xs text-muted">
                            {isAr ? "لا توجد أقسام فرعية" : "No subcategories"}
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </li>
              );
            })}

            {filteredSections.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted">
                {isAr ? "لا توجد نتائج مطابقة" : "No matching results"}
              </li>
            )}
          </ul>
        </div>

        {/* ===== Footer CTA ===== */}
        {isOpen && (
          <div className="border-t border-border/60 p-4 bg-gradient-to-b from-background/40 to-transparent">
            <Link
              href="/categories"
              className="group w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-primary to-secondary px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Sparkles size={15} className="text-accent-light transition-transform duration-300 group-hover:rotate-12" />
              <span>{isAr ? "عرض جميع الفئات" : "View All Categories"}</span>
            </Link>
          </div>
        )}
      </nav>
    </aside>
  );
}
