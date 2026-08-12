import type { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import CategoryAnalytics from "@/components/analytics/CategoryAnalytics";
import { categories, sectionCategories, sectionCategoriesMap, getProductsByCategory, getCategoryBySlug } from "@/lib/products";

const CategoryContent = dynamic(() => import("@/components/product/CategoryContent"));
const CategorySubcategories = dynamic(() => import("@/components/product/CategorySubcategories"));

export async function generateStaticParams() {
  return [...categories, ...sectionCategories].map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: `${category.nameAr} - Luminous Derma`,
    description: category.descriptionAr,
    alternates: { canonical: `https://luminousderma.com/categories/${category.slug}` },
    openGraph: { title: category.nameAr, description: category.descriptionAr },
  };
}

function getSubcategories(slug: string) {
  const section = sectionCategoriesMap.find((s) => s.slug === slug);
  if (section && section.children.length > 0) {
    return section.children;
  }
  const parent = sectionCategoriesMap.find((s) => s.children.includes(slug));
  return parent?.children ?? [];
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const products = getProductsByCategory(slug);
  const subcategorySlugs = getSubcategories(slug);
  const subcategories = subcategorySlugs
    .map((s) => categories.find((c) => c.slug === s))
    .filter((c): c is (typeof categories)[number] => Boolean(c));
  const section = sectionCategoriesMap.find((s) => s.slug === slug || s.children.includes(slug));

  return (
    <div dir="rtl" className="w-full pb-16">
      <CategoryAnalytics slug={slug} name={category.nameAr} productCount={products.length} />
      <Container>
        <nav aria-label="breadcrumb" className="pt-4">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link>
            </li>
            <ChevronLeft size={14} className="text-muted" />
            {section && section.slug !== slug && (
              <>
                <li>
                  <Link href={`/categories/${section.slug}`} className="transition-colors hover:text-primary">
                    {section.nameAr}
                  </Link>
                </li>
                <ChevronLeft size={14} className="text-muted" />
              </>
            )}
            <li className="font-medium text-foreground">{category.nameAr}</li>
          </ol>
        </nav>

        <div className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{category.nameAr}</h1>
          <p className="mt-1 text-sm text-muted">{category.descriptionAr}</p>
          <p className="mt-1 text-xs text-muted/70">{products.length} منتج</p>
        </div>

        {subcategories.length > 0 && (
          <Suspense fallback={null}>
            <CategorySubcategories subcategories={subcategories} activeSlug={slug} />
          </Suspense>
        )}

        <div className="mt-8 w-full">
          <Suspense fallback={null}>
            <CategoryContent products={products} />
          </Suspense>
        </div>
      </Container>
    </div>
  );
}
