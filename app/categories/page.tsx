import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import StickyMainCategoryFilter from "@/components/product/StickyMainCategoryFilter";
import { categoryIcons, categoryColors } from "@/components/home/Categories";
import { getTaxonomyNavTree } from "@/src/lib/taxonomy";

export const metadata: Metadata = {
  title: "جميع الأقسام - Luminous Derma",
  description: "تصفحي جميع أقسام لومينوس ديرما من العناية بالبشرة والشعر والجسم والمكياج والعطور",
  alternates: { canonical: "https://luminousderma.com/categories" },
};

const fallbackTint = "from-primary/10 to-secondary/5";

export default function CategoriesPage() {
  const nav = getTaxonomyNavTree();

  return (
    <div dir="rtl" className="w-full pb-16">
      <Container>
        <nav aria-label="breadcrumb" className="pt-4">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link>
            </li>
            <ChevronLeft size={14} className="text-muted" />
            <li className="font-medium text-foreground">جميع الأقسام</li>
          </ol>
        </nav>

        {nav.map((cat) => cat.slug).length > 0 && (
          <StickyMainCategoryFilter
            categories={nav.map((cat) => ({
              slug: cat.slug,
              nameAr: cat.labelAr,
              nameEn: cat.labelEn,
            }))}
            activeSlug=""
          />
        )}

        <div className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">جميع الأقسام</h1>
          <p className="mt-1 text-sm text-muted">اكتشفي كل الأقسام والتشكيلات التي تقدمها لومينوس ديرما</p>
        </div>

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">الأقسام الرئيسية</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {nav.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="group relative overflow-hidden rounded-card border border-border bg-card p-5 text-center shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:border-primary/25 hover:shadow-card-hover"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${categoryColors[cat.slug] || cat.color || fallbackTint} opacity-70 transition-opacity duration-300 ease-out-smooth group-hover:opacity-100`}
                />
                <div className="relative flex flex-col items-center gap-2.5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-button bg-white/85 text-2xl shadow-card transition-transform duration-300 ease-spring group-hover:-rotate-6 group-hover:scale-110">
                    {categoryIcons[cat.slug] ? (Icon => <Icon size={24} className="text-white" />)(categoryIcons[cat.slug]) : "🫧"}
                  </span>
                  <span className="text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-primary sm:text-base">
                    {cat.labelAr}
                  </span>
                  {cat.children && cat.children.length > 0 && (
                    <span className="text-[11px] text-muted">{cat.children.length} تصنيف</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {nav.map((cat) => (
          <section key={cat.slug} className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{cat.labelAr}</h2>
              <Link
                href={`/categories/${cat.slug}`}
                className="text-sm font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
              >
                عرض الكل
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {cat.children?.map((sub) => (
                <Link
                  key={sub.slug}
                  href={`/categories/${sub.slug}`}
                  className="group relative overflow-hidden rounded-card border border-border bg-card p-4 text-center shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:border-primary/25 hover:shadow-card-hover"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${categoryColors[cat.slug] || cat.color || fallbackTint} opacity-50 transition-opacity duration-300 ease-out-smooth group-hover:opacity-80`}
                  />
                  <div className="relative flex flex-col items-center gap-2">
                    <span className="text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-primary">
                      {sub.labelAr}
                    </span>
                    {sub.children && sub.children.length > 0 && (
                      <span className="flex flex-wrap items-center justify-center gap-1">
                        {sub.children.slice(0, 3).map((pt) => (
                          <span key={pt.slug} className="rounded-pill bg-white/70 px-2 py-0.5 text-[10px] text-muted">
                            {pt.labelAr}
                          </span>
                        ))}
                        {sub.children.length > 3 && (
                          <span className="rounded-pill bg-white/70 px-2 py-0.5 text-[10px] text-muted">
                            +{sub.children.length - 3}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </Container>
    </div>
  );
}