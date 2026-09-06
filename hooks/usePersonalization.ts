"use client";

import { useState, useEffect, useCallback } from "react";

type PersonalizationAction = {
  type: string;
  priority: number;
  config: Record<string, unknown>;
};

type PersonalizationState = {
  actions: PersonalizationAction[];
  matchedRules: { id: string; name: string; nameAr: string }[];
  loading: boolean;
  applied: Set<string>;
};

export function usePersonalization(pathname: string, cartItemCount = 0, cartValue = 0) {
  const [state, setState] = useState<PersonalizationState>({
    actions: [],
    matchedRules: [],
    loading: true,
    applied: new Set(),
  });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

    const params = new URLSearchParams({
      pathname,
      cartItemCount: String(cartItemCount),
      cartValue: String(cartValue),
    });

    fetch(`/api/analytics/personalization?${params}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setState({
            actions: data.actions ?? [],
            matchedRules: data.matchedRules ?? [],
            loading: false,
            applied: new Set(),
          });
        }
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      });

    return () => { cancelled = true; };
  }, [pathname, cartItemCount, cartValue]);

  const getActionsByType = useCallback(
    (type: string) => state.actions.filter((a) => a.type === type),
    [state.actions]
  );

  const getHiddenSections = useCallback(() => {
    return state.actions
      .filter((a) => a.type === "hide_section")
      .map((a) => a.config.section as string)
      .filter(Boolean);
  }, [state.actions]);

  const getReorderedProducts = useCallback(
    (sectionId: string, defaultIds: string[]) => {
      const action = state.actions.find(
        (a) => a.type === "reorder_products" && a.config.section === sectionId
      );
      if (!action || !Array.isArray(action.config.order)) return defaultIds;
      return action.config.order as string[];
    },
    [state.actions]
  );

  const getActiveBanners = useCallback(() => {
    return state.actions
      .filter((a) => a.type === "show_banner")
      .map((a) => ({
        title: (a.config.title as string) ?? "",
        titleAr: (a.config.titleAr as string) ?? "",
        image: (a.config.image as string) ?? "",
        link: (a.config.link as string) ?? "#",
        accent: (a.config.accent as string) ?? "#7c3aed",
      }));
  }, [state.actions]);

  return {
    ...state,
    getActionsByType,
    getHiddenSections,
    getReorderedProducts,
    getActiveBanners,
  };
}
