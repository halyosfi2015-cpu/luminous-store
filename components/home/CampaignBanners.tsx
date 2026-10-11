"use client";

import Link from "next/link";
import Image from "next/image";
import { useActiveCampaigns } from "@/hooks/useActiveCampaigns";
import { useLang } from "@/lib/use-lang";
import Container from "@/components/ui/Container";

export default function CampaignBanners() {
  const { campaigns, loading } = useActiveCampaigns();
  const { lang } = useLang();
  const isAr = lang === "ar";

  if (loading || campaigns.length === 0) return null;

  return (
    <section className="w-full bg-gradient-to-r from-primary/5 via-white to-secondary/5 py-4">
      <Container>
        <div className="hide-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto pb-2">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/offers?campaign=${campaign.slug}`}
              className="magic-autoshine luminous-shine group relative flex min-w-[260px] max-w-[85vw] shrink-0 snap-start items-center gap-3 overflow-hidden rounded-2xl border border-primary/10 bg-white p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md sm:min-w-[320px] sm:p-4"
            >
              {campaign.image && (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                  <Image
                    src={campaign.image}
                    alt={isAr ? campaign.nameAr : campaign.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {campaign.badge && (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                      {isAr ? campaign.badgeAr : campaign.badge}
                    </span>
                  )}
                  <h3 className="truncate text-[13px] font-bold text-gray-900 sm:text-sm">
                    {isAr ? campaign.nameAr : campaign.name}
                  </h3>
                </div>
                {(campaign.descriptionAr || campaign.description) && (
                  <p className="mt-0.5 truncate text-[13px] leading-[1.7] text-gray-500 sm:text-xs">
                    {isAr ? campaign.descriptionAr : campaign.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
