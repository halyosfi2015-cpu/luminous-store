"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  HOME_SECTION_DEFAULTS,
  mergeHomepageContent,
  type HomeSectionContent,
  type HomeSectionKey,
  type HomepageContent,
} from "@/src/lib/home-content";

const SiteContentContext = createContext<HomepageContent | null>(null);

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<HomepageContent | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/content/homepage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          const merged = mergeHomepageContent(data);
          setContent({
            sections: merged.sections,
            order: Array.isArray(data.order) ? data.order : merged.order,
            products: data.products ?? merged.products,
          });
        }
      })
      .catch(() => {
        /* fall back to defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <SiteContentContext.Provider value={content}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent(): HomepageContent | null {
  return useContext(SiteContentContext);
}

export function useSectionContent(key: HomeSectionKey): HomeSectionContent {
  const content = useContext(SiteContentContext);
  const section = content?.sections?.[key];
  if (!section) return HOME_SECTION_DEFAULTS[key];
  return section;
}