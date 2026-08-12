import {
  HERO_STORAGE_KEY,
  getHeroOverride,
  saveHeroOverride,
  clearHeroOverride,
} from "@/src/engine/hero/engine";
import type { HeroOverride } from "@/src/engine/hero/types";
import type { ResourceAdapter } from "./types";

export const heroAdapter: ResourceAdapter<HeroOverride> = {
  resource: "hero",
  storageKeys: [HERO_STORAGE_KEY],
  load: getHeroOverride,
  save: saveHeroOverride,
  clear: clearHeroOverride,
};
