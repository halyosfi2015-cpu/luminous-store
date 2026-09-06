"use client";

import { Children } from "react";
import { SiteContentProvider } from "@/components/site-content/SiteContentProvider";
import { ProductsProvider } from "@/components/home/ProductsContext";
import LuminousStage from "@/components/home/LuminousStage";
import StorefrontBanners from "@/components/home/StorefrontBanners";
import RoutinesSection from "@/components/home/RoutinesSection";
import Products from "@/components/home/Products";
import WeeklyOffers from "@/components/home/WeeklyOffers";
import Brands from "@/components/home/Brands";
import ProblemSolutions from "@/components/home/ProblemSolutions";
import Experts from "@/components/home/Experts";
import CustomerReviews from "@/components/home/CustomerReviews";
import TrendingNow from "@/components/home/TrendingNow";
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
      </div>
    ),
  },
  { slotId: "banners", keys: ["banners"], render: () => <div key="slot-banners"><StorefrontBanners /><CampaignBanners /></div> },
  { slotId: "trendingNow", keys: ["trendingNow"], render: () => <TrendingNow /> },
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

function composeSections(order: AllHomeSectionKey[] | undefined, serverBundles?: Bundle[]): React.ReactNode[] {
  // Rule 2: no saved order → exact default composition as before.
  if (!order || order.length === 0) {
    return Children.toArray(SLOTS.map((s) => {
      const el = s.render(serverBundles) as React.ReactElement;
      return el.key ? el : <div key={s.slotId}>{el}</div>;
    }));
  }
  const keyToSlot = new Map<string, (typeof SLOTS)[number]>();
  for (const slot of SLOTS) for (const k of slot.keys) keyToSlot.set(k, slot);

  const seen = new Set<string>();
  const out: React.ReactNode[] = [];
  for (const k of order) {
    const slot = keyToSlot.get(k);
    // Rule 4: unknown/invalid key → ignore safely.
    if (!slot || seen.has(slot.slotId)) continue;
    seen.add(slot.slotId);
    const el = slot.render(serverBundles) as React.ReactElement;
    out.push(el.key ? el : <div key={slot.slotId}>{el}</div>);
  }
  // Rule 3: sections missing from the saved order are appended in default order (never hidden).
  for (const slot of SLOTS) {
    if (!seen.has(slot.slotId)) {
      const el = slot.render(serverBundles) as React.ReactElement;
      out.push(el.key ? el : <div key={slot.slotId}>{el}</div>);
    }
  }
  return Children.toArray(out);
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