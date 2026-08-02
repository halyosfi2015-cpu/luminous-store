import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import ProductBreadcrumb from "@/components/product/ProductBreadcrumb";
import ProductGallery from "@/components/product/ProductGallery";
import ProductInfo from "@/components/product/ProductInfo";
import ProductPurchase from "@/components/product/ProductPurchase";
import ProductTabs from "@/components/product/ProductTabs";
import ProductReviews from "@/components/product/ProductReviews";
import RelatedProducts from "@/components/product/RelatedProducts";
import { products, getProductBySlug } from "@/src/data/products";

export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name.ar} - Luminous Derma`,
    description: product.description.ar,
    openGraph: { title: product.name.ar, description: product.description.ar, images: [{ url: product.gallery[0], width: 600, height: 600 }] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return null;

  const related = products.filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id);

  return (
    <div dir="rtl" className="w-full pb-16">
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
              ratingValue: product.rating,
              reviewCount: product.reviewCount ?? 0,
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
        <ProductReviews reviews={product.reviews ?? []} />
        {related.length > 0 && <RelatedProducts products={related} />}
      </Container>
    </div>
  );
}
