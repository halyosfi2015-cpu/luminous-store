import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ShieldCheck, Globe } from "lucide-react";
import Container from "@/components/ui/Container";
import { brands } from "@/lib/content";
import { products } from "@/lib/products";
import ProductCard from "@/components/product/ProductCard";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const brand = brands.find((b) => b.slug === slug);
  if (!brand) return {};
  return {
    title: brand.nameAr,
    description: brand.descriptionAr,
    alternates: { canonical: `https://luminousderma.com/brands/${brand.slug}` },
  };
}

export default async function BrandDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = brands.find((b) => b.slug === slug);
  if (!brand) notFound();

  const brandProducts = products.filter((p) => p.brand.toLowerCase() === brand.name.toLowerCase());

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <div className="mb-6">
          <Link href="/brands" className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-primary">
            <ChevronRight size={16} />
            العلامات التجارية
          </Link>
        </div>

        <div className="mb-8 overflow-hidden rounded-card bg-card shadow-card">
          <div className="h-40 bg-gradient-to-l from-primary/15 to-secondary-200/40 sm:h-56" />
          <div className="relative px-6 pb-6">
            <div className="absolute -top-10 right-6 h-20 w-20 rounded-2xl border-4 border-card bg-muted-bg shadow-card overflow-hidden" />
            <div className="pt-14">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{brand.nameAr}</h1>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                    <Globe size={14} />
                    {brand.originAr}
                  </p>
                </div>
                {brand.isVerified && (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success-fg">
                    <ShieldCheck size={14} />
                    علامة موثوقة
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted">{brand.descriptionAr}</p>
            </div>
          </div>
        </div>

        <h2 className="mb-4 text-lg font-semibold text-foreground">منتجات {brand.nameAr}</h2>
        {brandProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {brandProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">لا توجد منتجات متاحة حالياً</p>
        )}
      </Container>
    </main>
  );
}
