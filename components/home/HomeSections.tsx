"use client";

import { Children } from "react";
import { SiteContentProvider } from "@/components/site-content/SiteContentProvider";
import { ProductsProvider } from "@/components/home/ProductsContext";
import LuminousStage from "@/components/home/LuminousStage";
import HomeStories from "@/components/home/HomeStories";
import MagicRibbon from "@/components/home/MagicRibbon";
import StorefrontBanners from "@/components/home/StorefrontBanners";
import RoutinesSection from "@/components/home/RoutinesSection";
import Products from "@/components/home/Products";
import WeeklyOffers from "@/components/home/WeeklyOffers";
import Brands from "@/components/home/Brands";
import ProblemSolutions from "@/components/home/ProblemSolutions";
import Experts from "@/components/home/Experts";
import CustomerReviews from "@/components/home/CustomerReviews";
import TrendingNow from "@/components/home/TrendingNow";
import RecentlyViewed from "@/components/home/RecentlyViewed";
import PremiumServicesAndBundles from "@/components/home/PremiumServicesAndBundles";
import NewArrivals from "@/components/home/NewArrivals";
import SmartRecommendations from "@/components/home/SmartRecommendations";
import CampaignBanners from "@/components/home/CampaignBanners";
import type { Bundle } from "@/src/types/bundle";
import type { ProductSummary } from "@/src/types/product";
import type { AllHomeSectionKey } from "@/src/lib/home-content";

/**
 * Homepage composition slots. Each slot preserves its exact original markup
 * (including the full-bleed wrapper around LuminousStage). Only the ORDER of
 * these slots is affected by the admin-saved order — nothing else.
 */
const SLOTS: { slotId: string; keys: readonly AllHomeSectionKey[]; render: (bundles?: Bundle[]) => React.ReactNode }[] = [
  {
    slotId: "hero",
    keys: ["hero"],
    render: () => (
      <div key="slot-hero" className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8">
        <LuminousStage />
        <HomeStories />
        <div className="-mx-4 mt-1 sm:-mx-6 lg:-mx-8">
          <MagicRibbon />
        </div>
      </div>
    ),
  },
  { slotId: "banners", keys: ["banners"], render: () => <div key="slot-banners"><StorefrontBanners /><CampaignBanners /></div> },
  { slotId: "trendingNow", keys: ["trendingNow"], render: () => <TrendingNow /> },
  // Sephora-style "pick up where you left off" rail — self-hides when empty.
  { slotId: "recentlyViewed", keys: [], render: () => <RecentlyViewed /> },
  { slotId: "routines", keys: ["routines"], render: () => <RoutinesSection /> },
  { slotId: "problemSolutions", keys: ["problemSolutions"], render: () => <ProblemSolutions /> },
  { slotId: "experts", keys: ["experts"], render: () => <Experts /> },
  // "testimonials" and "productsFavorites" both map to the existing CustomerReviews section
  { slotId: "customerReviews", keys: ["productsFavorites", "testimonials"], render: () => <CustomerReviews /> },
  { slotId: "brands", keys: ["brands"], render: () => <Brands /> },
  // "services" and "bundles" share the existing PremiumServicesAndBundles section
  {
    slotId: "servicesBundles",
    keys: ["services", "bundles"],
    render: (b) => <PremiumServicesAndBundles serverBundles={b} />,
  },
  { slotId: "productsFeatured", keys: ["productsFeatured"], render: () => <Products /> },
  { slotId: "newArrivals", keys: ["newArrivals"], render: () => <NewArrivals /> },
  { slotId: "smartRecommendations", keys: ["smartRecommendations"], render: () => <SmartRecommendations /> },
  { slotId: "weeklyOffers", keys: ["weeklyOffers"], render: () => <WeeklyOffers /> },
];

/** Hairline gradient divider — global section rhythm (skipped after hero/banners). */
function SectionDivider({ slotId }: { slotId: string }) {
  return (
    <div key={`divider-${slotId}`} aria-hidden="true" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="magic-divider" />
    </div>
  );
}

/** Slots rendered full-bleed without a divider after them. */
const NO_DIVIDER_AFTER = new Set(["hero", "banners"]);

function composeSections(order: AllHomeSectionKey[] | undefined, serverBundles?: Bundle[]): React.ReactNode[] {
  const withDividers = (nodes: React.ReactNode[], ids: string[]) =>
    Children.toArray(
      nodes.flatMap((node, i) => {
        const id = ids[i];
        const el = node as React.ReactElement;
        // Neutral wrapper carrying the slot id for mobile-only story ordering (invisible on desktop)
        const wrapped = (
          <div key={`slotwrap-${id}`} className={`home-slot home-slot-${id}`}>
            {el}
          </div>
        );
        if (i === nodes.length - 1 || NO_DIVIDER_AFTER.has(id)) return [wrapped];
        return [wrapped, <SectionDivider key={`divider-${id}`} slotId={id} />];
      })
    );
  // Rule 2: no saved order → exact default composition as before.
  if (!order || order.length === 0) {
    return withDividers(
      SLOTS.map((s) => s.render(serverBundles)),
      SLOTS.map((s) => s.slotId)
    );
  }
  const keyToSlot = new Map<string, (typeof SLOTS)[number]>();
  for (const slot of SLOTS) for (const k of slot.keys) keyToSlot.set(k, slot);

  const seen = new Set<string>();
  const out: React.ReactNode[] = [];
  const ids: string[] = [];
  const pushSlot = (slot: (typeof SLOTS)[number]) => {
    seen.add(slot.slotId);
    ids.push(slot.slotId);
    out.push(slot.render(serverBundles));
  };
  for (const k of order) {
    const slot = keyToSlot.get(k);
    // Rule 4: unknown/invalid key → ignore safely.
    if (!slot || seen.has(slot.slotId)) continue;
    pushSlot(slot);
  }
  // Rule 3: sections missing from the saved order are appended in default order (never hidden).
  for (const slot of SLOTS) {
    if (!seen.has(slot.slotId)) pushSlot(slot);
  }
  return withDividers(out, ids);
}

export default function HomeSections({
  serverBundles,
  serverProducts,
  serverBrands,
  order,
}: {
  serverBundles?: Bundle[];
  serverProducts?: ProductSummary[];
  serverBrands?: { slug: string; name: string; nameAr: string }[];
  /** Canonical saved section order — undefined keeps the default composition. */
  order?: AllHomeSectionKey[];
}) {
  return (
    <ProductsProvider
      value={{
        products: serverProducts ?? [],
        brands: serverBrands ?? [],
      }}
    >
      <SiteContentProvider>
        {composeSections(order, serverBundles)}
      </SiteContentProvider>
    </ProductsProvider>
  );
}