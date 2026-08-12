import { getConfig, saveConfig, resetEngine } from "@/src/engine/engine";
import type { EngineConfig } from "@/src/engine/types";
import type { ResourceAdapter } from "./types";

export const offersAdapter: ResourceAdapter<EngineConfig> = {
  resource: "offers",
  storageKeys: ["luminous-offers-engine"],
  load: getConfig,
  save: saveConfig,
  clear: resetEngine,
};
