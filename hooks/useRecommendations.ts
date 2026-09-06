"use client";

import { useState, useEffect } from "react";

type Recommendation = {
  product_id: string;
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  image: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  score: number;
  reason: string;
  reasonAr: string;
  type: string;
};

type RecommendationState = {
  recommendations: Recommendation[];
  loading: boolean;
  error: boolean;
};

export function useRecommendations(options: {
  limit?: number;
  context?: string;
  entityId?: string;
  excludeIds?: string[];
} = {}) {
  const { limit = 8, context = "homepage", entityId, excludeIds = [] } = options;

  const [state, setState] = useState<RecommendationState>({
    recommendations: [],
    loading: true,
    error: false,
  });

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({
      limit: String(limit),
      context,
    });
    if (entityId) params.set("entityId", entityId);
    if (excludeIds.length > 0) params.set("excludeIds", excludeIds.join(","));

    fetch(`/api/analytics/recommendations?${params}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setState({
            recommendations: data.recommendations ?? [],
            loading: false,
            error: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ recommendations: [], loading: false, error: true });
      });

    return () => { cancelled = true; };
  }, [limit, context, entityId]);

  return state;
}
