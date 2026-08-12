import type {
  HomepageSectionKey,
  HomepageSettings,
} from "../../types";
import type { ResourceAdapter } from "./types";

export const HOMEPAGE_STORAGE_KEY = "luminous-homepage-sections";

export const HOMEPAGE_SECTION_LABELS: Record<HomepageSectionKey, string> = {
  hero: "الواجهة الرئيسية (Hero)",
  categories: "التصنيفات",
  bestSellers: "الأكثر مبيعاً",
  newArrivals: "وصل حديثاً",
  offers: "العروض الأسبوعية",
  bundles: "الباقات والهدايا",
  experts: "الخبراء",
  articles: "المقالات",
};

const DEFAULTS: HomepageSettings = {
  sections: {
    hero: true,
    categories: true,
    bestSellers: true,
    newArrivals: true,
    offers: true,
    bundles: true,
    experts: true,
    articles: true,
  },
};

export function loadHomepageSettings(): HomepageSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(HOMEPAGE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as HomepageSettings;
      return { sections: { ...DEFAULTS.sections, ...parsed.sections } };
    }
  } catch {}
  return DEFAULTS;
}

export function saveHomepageSettings(settings: HomepageSettings) {
  try {
    window.localStorage.setItem(HOMEPAGE_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export const homepageAdapter: ResourceAdapter<HomepageSettings> = {
  resource: "settings",
  storageKeys: [HOMEPAGE_STORAGE_KEY],
  load: loadHomepageSettings,
  save: saveHomepageSettings,
};
