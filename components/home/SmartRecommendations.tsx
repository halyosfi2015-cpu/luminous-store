"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import Container from "@/components/ui/Container";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import SectionTitle from "@/components/ui/SectionTitle";
import ProductImage from "@/components/product/ProductImage";
import { useProducts } from "@/hooks/useProducts";
import { useLang } from "@/lib/use-lang";
import { useSectionContent, useSiteContent } from "@/components/site-content/SiteContentProvider";
import { safeRatingDisplay, safeReviewCountDisplay } from "@/lib/ratings";
import { getRecommendations, trackProductView, trackCategoryVisit, trackBrandVisit, getFeaturedPick } from "@/src/engine/recommendations/engine";
import type { ScoredProduct } from "@/src/engine/recommendations/types";

function formatPrice(n: number) { return n.toLocaleString("ar-YE"); }

function StarIcon({ size = 11, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

const REASON_COLORS: Record<string, string> = {
  category_match: "from-blue-500 to-indigo-500",
  brand_match: "from-purple-500 to-violet-500",
  cart_complement: "from-emerald-500 to-teal-500",
  wishlist_match: "from-rose-500 to-pink-500",
  trending: "from-orange-500 to-amber-500",
  new_arrival: "from-cyan-500 to-blue-500",
  best_seller: "from-yellow-500 to-orange-500",
  similar: "from-primary to-primary/80",
};

function RecommendationCard({ sp, isAr }: { sp: ScoredProduct; isAr: boolean }) {
  const { product, badge, badgeEn, reason } = sp;
  const gradient = REASON_COLORS[reason] || REASON_COLORS.similar;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative flex w-56 shrink-0 flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-transparent"
      style={{ boxShadow: "0 4px 20px -4px rgba(0,0,0,0.06)" }}
      onClick={() => {
        trackProductView(product.id);
        trackCategoryVisit(product.categorySlug ?? "");
        trackBrandVisit(product.brand);
      }}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {product.gallery[0] && (
          <ProductImage
            src={product.gallery[0]}
            alt={product.name.ar}
            productId={product.id}
            className="h-full w-full"
            sizes="224px"
            pedestal
          />
        )}

        {product.discount && (
          <div className="absolute top-3 start-3 z-10">
            <div className="flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 shadow-lg shadow-red-500/30">
              <span className="text-[11px] font-extrabold text-white">-{product.discount}%</span>
            </div>
          </div>
        )}

        <div className="absolute bottom-3 inset-x-3 z-10">
          <div className={`rounded-xl bg-gradient-to-r ${gradient} px-3 py-1.5 text-center shadow-lg`}>
            <span className="text-[10px] font-bold text-white leading-tight">
              {isAr ? badge : badgeEn}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider">{product.brandAr || product.brand}</p>
        <h3 className="mt-1 line-clamp-2 text-xs font-bold text-gray-900 leading-relaxed transition-colors group-hover:text-primary">
          {product.name.ar}
        </h3>

        {safeRatingDisplay(product) > 0 && safeReviewCountDisplay(product) > 0 && (
          <div className="mt-2 flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <StarIcon key={i} size={11} filled={i < Math.floor(safeRatingDisplay(product))} />
            ))}
            <span className="text-[10px] text-gray-400 ms-1">({safeReviewCountDisplay(product)})</span>
          </div>
        )}

        <div className="flex-1" />

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-gray-900">{formatPrice(product.pricing.price)}</span>
          <span className="text-[9px] font-normal text-gray-400">ريال</span>
        </div>
        {product.discount && product.pricing.originalPrice && product.pricing.originalPrice > product.pricing.price && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 line-through">{formatPrice(product.pricing.originalPrice)}</span>
            {product.discount && <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600">-{product.discount}%</span>}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function SmartRecommendations() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const content = useSectionContent("smartRecommendations");
  const siteContent = useSiteContent();
  const { products: allProducts, loading, error } = useProducts();


  // Engine remains the source of truth; admin overrides are layered on top.
  // - excluded: removed from engine output
  // - pinned: admin-selected products forced into the section (resolved from canonical summaries)
  const buildItems = (): ScoredProduct[] => {
    const override = siteContent?.products?.smartRecommendations;
    if (!override || (!override.pinned?.length && !override.excluded?.length)) {
      return getRecommendations(allProducts);
    }
    // ScoredProduct wraps the product, so filter/pin manually instead of
    // using applySectionProductOverride (which expects top-level slug).
    const excluded = new Set(override.excluded ?? []);
    const pinnedSlugs = override.pinned ?? [];
    const enginePicks = getRecommendations(allProducts).filter(
      (r) => !excluded.has(r.product.slug),
    );
    const present = new Set(enginePicks.map((r) => r.product.slug));
    const pinnedExtras = pinnedSlugs
      .filter((slug) => !present.has(slug))
      .map((slug) => allProducts.find((p) => p.slug === slug))
      .filter((p): p is (typeof allProducts)[0] => Boolean(p))
      .map<ScoredProduct>((p) => ({
        product: p,
        score: 1000,
        reason: "similar",
        reasonAr: "مثبت لك",
        reasonEn: "Pinned for you",
        badge: "مثبت لك",
        badgeEn: "Pinned for you",
      }));
    return [...pinnedExtras, ...enginePicks];
  };

  const [recommendations, setRecommendations] = useState<ScoredProduct[]>([]);
  const [featured, setFeatured] = useState<ScoredProduct | null>(null);

  useEffect(() => {
    setRecommendations(buildItems());
    setFeatured(getFeaturedPick(allProducts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteContent?.products?.smartRecommendations, allProducts.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRecommendations(buildItems());
      setFeatured(getFeaturedPick(allProducts));
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (loading) return null;
  if (error) {
    return (
      <section className="w-full py-8" style={{ background: "var(--background)" }}>
        <Container>
          <div className="text-center py-12 text-[var(--muted)]">
            <p>{isAr ? "فشل تحميل التوصيات" : "Failed to load recommendations"}</p>
            <button onClick={() => window.location.reload()} className="mt-4 text-[var(--primary)] underline">
              {isAr ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        </Container>
      </section>
    );
  }

  // Engine remains the source of truth

  const items = featured
    ? [featured, ...recommendations.filter((r) => r.product.id !== featured.product.id)]
    : recommendations;

  if (!content.visible) return null;
  if (items.length === 0) {
    return (
      <section id="recommended" className="w-full overflow-hidden bg-white py-8 sm:py-10 lg:py-12">
        <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8">
          <SectionTitle
            eyebrow={<>
              <span className="h-0.5 w-6 rounded-pill bg-primary" />
              <span className="text-sm font-bold text-primary">{isAr ? content.eyebrowAr : content.eyebrowEn}</span>
            </>}
            title={isAr ? content.titleAr : content.titleEn}
            subtitle={isAr ? content.subtitleAr : content.subtitleEn}
          />
          <p className="text-center text-sm text-muted py-8">
            {isAr ? "بيانات غير كافية" : "Not enough data yet"}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="recommended" className="w-full overflow-hidden bg-white py-8 sm:py-10 lg:py-12">
      <Container>
        <SectionTitle
          eyebrow={<>
            <span className="h-0.5 w-6 rounded-pill bg-primary" />
            <span className="text-sm font-bold text-primary">{isAr ? content.eyebrowAr : content.eyebrowEn}</span>
          </>}
          title={isAr ? content.titleAr : content.titleEn}
          subtitle={isAr ? content.subtitleAr : content.subtitleEn}
        />
        <HorizontalCarousel ariaLabel={isAr ? "توصيات ذكية" : "Smart recommendations"} autoplay autoplaySpeed={2500}>
          {items.map((sp) => (
            <div key={sp.product.id} className="shrink-0">
              <RecommendationCard sp={sp} isAr={isAr} />
            </div>
          ))}
        </HorizontalCarousel>
      </Container>
    </section>
  );
}