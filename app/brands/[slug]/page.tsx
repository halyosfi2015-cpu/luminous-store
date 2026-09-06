import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight, Globe } from "lucide-react";
import Container from "@/components/ui/Container";
import { brands as staticBrands } from "@/lib/content";
import { getServerProducts } from "@/src/lib/server-products";

import { resolveBrandSlug } from "@/src/lib/brand-match";
import { createPublicSupabaseClient } from "@/src/lib/supabase-server";
import ProductCard from "@/components/product/ProductCard";
import type { Brand } from "@/src/data/brands";

function resolveBrandName(raw: unknown, fallbackAr: unknown): { name: string; nameAr: string } {
  let name = String(raw ?? "");
  let nameAr = String(fallbackAr ?? raw ?? "");
  if (name.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(name) as { ar?: string; en?: string };
      if (parsed.en) name = parsed.en;
      if (parsed.ar) nameAr = parsed.ar;
    } catch {}
  }
  return { name, nameAr };
}

async function getSupabaseBrands(): Promise<Brand[]> {
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const { name, nameAr } = resolveBrandName(row.name, row.name_ar);
      return {
        id: String(row.id ?? ""),
        slug: String(row.slug ?? ""),
        name,
        nameAr,
        logo: String(row.logo ?? ""),
        coverImage: String(row.cover_image ?? ""),
        description: String(row.description ?? ""),
        descriptionAr: String(row.description_ar ?? ""),
        origin: String(row.origin ?? ""),
        originAr: String(row.origin_ar ?? ""),
        isVerified: Boolean(row.is_verified),
        featured: Boolean(row.featured),
        productCount: Number(row.product_count ?? 0),
        seoMetadata: (row.seo_metadata as Brand["seoMetadata"]) ?? {
          title: { ar: "", en: "" },
          description: { ar: "", en: "" },
          keywords: [],
        },
      };
    });
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabaseBrands = await getSupabaseBrands();
  const brand = supabaseBrands.find((b) => b.slug === slug) || staticBrands.find((b) => b.slug === slug);
  if (!brand) return {};
  return {
    title: brand.nameAr,
    description: brand.descriptionAr,
    alternates: { canonical: `https://luminousderma.com/brands/${brand.slug}` },
  };
}

export default async function BrandDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabaseBrands = await getSupabaseBrands();
  const brand = supabaseBrands.find((b) => b.slug === slug) || staticBrands.find((b) => b.slug === slug);
  if (!brand) notFound();

  const liveCatalog = await getServerProducts();
  // Root-cause fix: use canonical brandSlug from DB join (brand_id → slug), not fragile string normalization.
  // Fallback to legacy resolveBrandSlug only for products missing brandSlug (e.g. static catalog edge cases).
  const brandProducts = liveCatalog.products.filter((p) => {
    const slug = (p as unknown as { brandSlug?: string | null }).brandSlug;
    if (slug) return slug === brand.slug;
    return resolveBrandSlug(p.brand) === brand.slug;
  });
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
            <div className="absolute -top-10 right-6 h-20 w-20 overflow-hidden rounded-2xl border-4 border-card bg-white shadow-card">
              {brand.logo && (brand as unknown as { logoUnavailable?: boolean }).logoUnavailable !== true ? (
                <Image
                  src={brand.logo}
                  alt={brand.nameAr}
                  fill
                  sizes="80px"
                  className="object-contain p-1.5"
                />
              ) : (
                <span className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/20 p-1 text-center">
                  <span className="line-clamp-2 text-[11px] font-extrabold leading-tight text-primary">{brand.nameAr || brand.name}</span>
                </span>
              )}
            </div>
            <div className="pt-14">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{brand.nameAr}</h1>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                    <Globe size={14} />
                    {brand.originAr}
                  </p>
                </div>
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
