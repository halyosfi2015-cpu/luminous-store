"use client";

import { useState, useEffect } from "react";

type Campaign = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  type: string;
  image: string | null;
  badge: string | null;
  badgeAr: string | null;
};

type CampaignState = {
  campaigns: Campaign[];
  loading: boolean;
};

export function useActiveCampaigns() {
  const [state, setState] = useState<CampaignState>({
    campaigns: [],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/content/campaigns", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setState({
            campaigns: data.campaigns ?? [],
            loading: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ campaigns: [], loading: false });
      });

    return () => { cancelled = true; };
  }, []);

  return state;
}
