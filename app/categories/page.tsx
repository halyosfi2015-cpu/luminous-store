import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import { categories, sectionCategories } from "@/lib/products";
import { categoryIcons, categoryColors } from "@/components/home/Categories";

export const metadata: Metadata = {
  title: "جميع الأقسام - Luminous Derma",
  description: "تصفحي جميع أقسام لومينوس ديرما من العناية بالبشرة والشعر والجسم والمكياج والعطور",
};

const fallbackTint = "from-primary/10 to-secondary/5";

export default function CategoriesPage() {
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

        <div className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">جميع الأقسام</h1>
          <p className="mt-1 text-sm text-muted">اكتشفي كل الأقسام والتشكيلات التي تقدمها لومينوس ديرما</p>
        </div>

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">الأقسام الرئيسية</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {sectionCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="group relative overflow-hidden rounded-card border border-border bg-card p-5 text-center shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:border-primary/25 hover:shadow-card-hover"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${categoryColors[cat.slug] || fallbackTint} opacity-70 transition-opacity duration-300 ease-out-smooth group-hover:opacity-100`}
                />
                <div className="relative flex flex-col items-center gap-2.5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-button bg-white/85 text-2xl shadow-card transition-transform duration-300 ease-spring group-hover:-rotate-6 group-hover:scale-110">
                    {categoryIcons[cat.slug] ? (Icon => <Icon size={24} className="text-white" />)(categoryIcons[cat.slug]) : "🫧"}
                  </span>
                  <span className="text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-primary sm:text-base">
                    {cat.nameAr}
                  </span>
                  <span className="rounded-pill bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-muted transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary">
                    {cat.productCount} منتج
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-foreground">جميع الفئات</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="group relative overflow-hidden rounded-card border border-border bg-card p-4 text-center shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:border-primary/25 hover:shadow-card-hover sm:p-5"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${categoryColors[cat.slug] || fallbackTint} opacity-70 transition-opacity duration-300 ease-out-smooth group-hover:opacity-100`}
                />
                <div className="relative flex flex-col items-center gap-2.5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-button bg-white/85 text-2xl shadow-card transition-transform duration-300 ease-spring group-hover:-rotate-6 group-hover:scale-110 sm:h-14 sm:w-14 sm:text-3xl">
                    {categoryIcons[cat.slug] ? (Icon => <Icon size={24} className="text-white" />)(categoryIcons[cat.slug]) : "🫧"}
                  </span>
                  <span className="text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-primary sm:text-base">
                    {cat.nameAr}
                  </span>
                  <span className="rounded-pill bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-muted transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary">
                    {cat.productCount} منتج
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </Container>
    </div>
  );
}
