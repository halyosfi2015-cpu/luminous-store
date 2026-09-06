import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import ProductBreadcrumb from "@/components/product/ProductBreadcrumb";
import ProductGallery from "@/components/product/ProductGallery";
import ProductInfo from "@/components/product/ProductInfo";
import ProductPurchase from "@/components/product/ProductPurchase";
import ProductTabs from "@/components/product/ProductTabs";

import RelatedProducts from "@/components/product/RelatedProducts";
import ProductAnalytics from "@/components/analytics/ProductAnalytics";

import { notFound } from "next/navigation";
import { isPublished } from "@/src/lib/publication";
import { getCanonicalProductBySlug } from "@/src/lib/product-dal";
import { products as staticProducts, getProductBySlug as getStaticProductBySlug } from "@/src/data/products";
import { getServerProducts } from "@/src/lib/server-products";
import { safeRatingDisplay, safeReviewCountDisplay } from "@/lib/ratings";
import type { ProductSummary } from "@/src/types/product";

export async function generateStaticParams() {
  // Keep product pages on-demand so the build does not materialize thousands
  // of catalog pages in memory. Deep links are still served by the dynamic
  // params path and are validated against the canonical DAL at request time.
  return [];
}

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getCanonicalProductBySlug(slug)) ?? getStaticProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name.ar} - Luminous Derma`,
    description: product.description.ar,
    alternates: { canonical: `https://luminousderma.com/products/${product.slug}` },
    openGraph: { title: product.name.ar, description: product.description.ar, images: [{ url: product.gallery[0], width: 600, height: 600 }] },
  };
}

/**
 * Product page component for Luminous Derma storefront.
 * Displays product details, gallery, purchase info, and cheaper alternatives.
 */
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Canonical commerce truth (price/stock/active) with static identity fallback.
  const product = (await getCanonicalProductBySlug(slug)) ?? getStaticProductBySlug(slug);
  if (!product || !isPublished(product)) notFound();

  // Only fetch related products for this category (faster than all products)
  let related: ProductSummary[] = [];
  try {
    const { getProductsByCategory } = await import("@/src/lib/product-dal");
    const catProducts = await getProductsByCategory(product.categorySlug ?? "");
    related = (catProducts as unknown as ProductSummary[]).filter((p) => p.id !== product.id).slice(0, 8);
    if (related.length === 0) {
      const liveCatalog = await getServerProducts();
      const relatedSource = (liveCatalog.products.length > 0 ? liveCatalog.products : staticProducts) as unknown as ProductSummary[];
      related = relatedSource.filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id).slice(0, 8);
    }
  } catch {
    const liveCatalog = await getServerProducts();
    const relatedSource = (liveCatalog.products.length > 0 ? liveCatalog.products : staticProducts) as unknown as ProductSummary[];
    related = relatedSource.filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id).slice(0, 8);
  }

  return (
    <div dir="rtl" className="w-full pb-16">
      <ProductAnalytics productId={product.id} categorySlug={product.categorySlug} slug={product.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name.ar,
            description: product.description.ar,
            image: product.gallery,
            brand: { "@type": "Brand", name: product.brand },
            offers: {
              "@type": "Offer",
              price: product.pricing.price,
              priceCurrency: "YER",
              availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: safeRatingDisplay(product),
              reviewCount: safeReviewCountDisplay(product),
            },
          }),
        }}
      />
      <Container>
        <ProductBreadcrumb category={product.categoryAr ?? product.category} categorySlug={product.categorySlug ?? product.category} productName={product.name.ar} />
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <ProductGallery images={product.gallery} name={product.name.ar} />
          <div className="flex flex-col gap-6">
            <ProductInfo product={product} />
            <ProductPurchase product={product} />
          </div>
        </div>
        <ProductTabs product={product} />

        {related.length > 0 && <RelatedProducts products={related} />}
      </Container>
    </div>
  );
}