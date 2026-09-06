import type { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Container from "@/components/ui/Container";
import CategoryAnalytics from "@/components/analytics/CategoryAnalytics";
import {
  getTaxonomyNodeBySlug,
  getTaxonomyBreadcrumbs,
  getProductsByTaxonomyNode,
  getPopulatedChildren,
  getTaxonomyParent,
  getTaxonomyChildren,
} from "@/src/lib/taxonomy";
import { createPublicSupabaseClient } from "@/src/lib/supabase-server";
import type { CategoryInfo } from "@/types/product";
import ProductGridSkeleton from "@/components/product/ProductGridSkeleton";



const CategoryContent = dynamic(() => import("@/components/product/CategoryContent"));
const CategorySubcategories = dynamic(() => import("@/components/product/CategorySubcategories"));

async function getSupabaseCategories(): Promise<CategoryInfo[]> {
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return ((data ?? []) as Array<Record<string, unknown>>)
      .filter((row) => row.parent_category_id != null)
      .map((row) => ({
        slug: String(row.slug ?? ""),
        name: (row.name as { en?: string })?.en ?? String(row.slug ?? ""),
        nameAr: (row.name as { ar?: string })?.ar ?? String(row.slug ?? ""),
        description: (row.description as { en?: string })?.en ?? "",
        descriptionAr: (row.description as { ar?: string })?.ar ?? "",
        image: (row.image as string) ?? undefined,
        coverImage: (row.cover_image as string) ?? undefined,
        icon: (row.icon as string) ?? undefined,
        productCount: Number(row.product_count ?? 0),
      }));
  } catch {
    return [];
  }
}

function nodeToCategoryInfo(slug: string, supabaseCategories?: CategoryInfo[]): CategoryInfo {
  const node = getTaxonomyNodeBySlug(slug);
  const base: Omit<CategoryInfo, "image" | "coverImage" | "icon" | "productCount"> = {
    slug: node?.slug ?? slug,
    name: node?.nameEn ?? slug,
    nameAr: node?.nameAr ?? slug,
    description: node?.descriptionEn ?? "",
    descriptionAr: node?.descriptionAr ?? "",
  };
  const supCat = supabaseCategories?.find((c) => c.slug === slug);
  if (supCat) {
    return {
      ...base,
      image: supCat.image,
      coverImage: supCat.coverImage,
      icon: supCat.icon,
      productCount: supCat.productCount,
      name: supCat.nameAr || base.nameAr,
      nameAr: supCat.nameAr || base.nameAr,
      description: supCat.descriptionAr || base.descriptionAr,
      descriptionAr: supCat.descriptionAr || base.descriptionAr,
    };
  }
  return {
    ...base,
    image: undefined,
    coverImage: undefined,
    icon: undefined,
    productCount: 0,
    name: base.nameAr,
    nameAr: base.nameAr,
    description: base.descriptionAr,
    descriptionAr: base.descriptionAr,
  };
}
export async function generateStaticParams() {
  const { taxonomy } = await import("@/src/data/taxonomy");
  return taxonomy.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const node = getTaxonomyNodeBySlug(slug);
  if (!node) return {};
  return {
    title: `${node.nameAr} - Luminous Derma`,
    description: node.descriptionAr,
    alternates: { canonical: `https://luminousderma.com/categories/${node.slug}` },
    openGraph: { title: node.nameAr, description: node.descriptionAr },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const node = getTaxonomyNodeBySlug(slug);
  if (!node) notFound();

  const [products, supabaseCategories] = await Promise.all([
    getProductsByTaxonomyNode(node.slug),
    getSupabaseCategories(),
  ]);

  const breadcrumbs = getTaxonomyBreadcrumbs(node.slug);
  const crumbs = breadcrumbs.length > 0 ? breadcrumbs.slice(0, -1) : [];
  // Only first-level subcategories (direct children of the main CATEGORY) — as requested
  const mainCategory = breadcrumbs.find((n: any) => n.type === "CATEGORY") ?? (node.type === "CATEGORY" ? node : null);
  const firstLevelSubs = mainCategory ? getTaxonomyChildren(mainCategory.id).filter((c: any) => c.status !== "HIDDEN").sort((a: any,b: any)=>a.order-b.order) : [];
  const subcategories = (firstLevelSubs.length > 0 ? firstLevelSubs : getTaxonomyChildren(node.id).filter((c: any) => c.status !== "HIDDEN").sort((a: any,b: any)=>a.order-b.order)).map((c: any) => nodeToCategoryInfo(c.slug, supabaseCategories)) as CategoryInfo[];
  const parent = getTaxonomyParent(node);

  const supCat = supabaseCategories.find((c) => c.slug === node.slug);

  return (
    <div dir="rtl" className="w-full pb-16">
      <CategoryAnalytics slug={node.slug} name={supCat?.nameAr ?? node.nameAr} productCount={products.length} />
      <Container>
        <nav aria-label="breadcrumb" className="pt-4">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link>
            </li>
            <ChevronLeft size={14} className="text-muted" />
            {crumbs.map((crumb) => (
              <FragmentCrumb key={crumb.slug} crumb={crumb} />
            ))}
            <li className="font-medium text-foreground">{supCat?.nameAr ?? node.nameAr}</li>
          </ol>
        </nav>

        <div className="mt-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{supCat?.nameAr ?? node.nameAr}</h1>
          {(supCat?.descriptionAr || node.descriptionAr) && <p className="mt-1 text-sm text-muted">{supCat?.descriptionAr || node.descriptionAr}</p>}
          <p className="mt-1 text-xs text-muted/70">{products.length} منتج</p>
        </div>

        {subcategories.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2" role="navigation" aria-label="الأقسام الفرعية">
            {subcategories.map((sub) => (
              <Link
                key={sub.slug}
                href={`/categories/${sub.slug}`}
                className="inline-flex items-center rounded-pill bg-white border border-border px-3 py-1 text-sm font-bold text-primary shadow-sm hover:border-primary/30 hover:bg-primary/5"
              >
                {sub.nameAr}
              </Link>
            ))}
          </div>
        )}



        {parent && node.type === "PRODUCT_TYPE" && products.length === 0 && (
          <p className="mt-4 text-sm text-muted">
            <Link href={`/categories/${parent.slug}`} className="font-medium text-primary hover:underline">
              تصفح كل منتجات {supCat?.nameAr || parent.nameAr}
            </Link>
          </p>
        )}

        <div className="mt-8 w-full">
          <Suspense fallback={<ProductGridSkeleton count={8} />}>
            <CategoryContent products={products} subcategories={subcategories} />
          </Suspense>
        </div>
      </Container>
    </div>
  );
}

function FragmentCrumb({ crumb }: { crumb: { slug: string; nameAr: string } }) {
  return (
    <>
      <li>
        <Link href={`/categories/${crumb.slug}`} className="transition-colors hover:text-primary">
          {crumb.nameAr}
        </Link>
      </li>
      <ChevronLeft size={14} className="text-muted" />
    </>
  );
}