import {
  BUNDLES_STORAGE_KEY,
  GIFT_OPTIONS_STORAGE_KEY,
  GIFT_OPTIONS_DELETED_KEY,
  DEFAULT_GIFT_OPTIONS,
  loadBundles,
  saveBundles,
  loadGiftOptions,
  saveGiftOptions,
  loadDeletedGiftOptionIds,
  type GiftOption,
} from "@/src/data/bundles-admin";
import { bundles as canonicalBundles } from "@/src/data/bundles";
import type { Bundle } from "@/src/types/bundle";
import type { ResourceAdapter } from "./types";

export const bundlesAdapter: ResourceAdapter<Bundle[]> = {
  resource: "bundles",
  storageKeys: [BUNDLES_STORAGE_KEY, GIFT_OPTIONS_STORAGE_KEY],
  load: loadBundles,
  save: saveBundles,
};

export const BUNDLES_DELETED_KEY = "luminous-bundles-deleted";

function loadDeletedBundleIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(BUNDLES_DELETED_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export function listBundles(): Bundle[] {
  const deleted = new Set(loadDeletedBundleIds());
  const stored = loadBundles();
  const storedIds = new Set(stored.map((bundle) => bundle.id));
  return [
    ...canonicalBundles.filter(
      (bundle) => !storedIds.has(bundle.id) && !deleted.has(bundle.id),
    ),
    ...stored.filter((bundle) => !deleted.has(bundle.id)),
  ];
}

export function removeBundleLocal(id: string) {
  if (typeof window === "undefined") return;
  try {
    saveBundles(loadBundles().filter((bundle) => bundle.id !== id));
    const deleted = new Set(loadDeletedBundleIds());
    deleted.add(id);
    window.localStorage.setItem(BUNDLES_DELETED_KEY, JSON.stringify([...deleted]));
  } catch {}
}

export const giftOptionsAdapter: ResourceAdapter<GiftOption[]> = {
  resource: "bundles",
  storageKeys: [GIFT_OPTIONS_STORAGE_KEY, GIFT_OPTIONS_DELETED_KEY],
  load: loadGiftOptions,
  save: saveGiftOptions,
};

export function listGiftOptions(): GiftOption[] {
  const deleted = new Set(loadDeletedGiftOptionIds());
  const stored = loadGiftOptions();
  const storedIds = new Set(stored.map((option) => option.id));
  return [
    ...DEFAULT_GIFT_OPTIONS.filter(
      (option) => !storedIds.has(option.id) && !deleted.has(option.id),
    ),
    ...stored.filter((option) => !deleted.has(option.id)),
  ];
}

export function removeGiftOptionLocal(id: string) {
  if (typeof window === "undefined") return;
  try {
    saveGiftOptions(loadGiftOptions().filter((option) => option.id !== id));
    const deleted = new Set(loadDeletedGiftOptionIds());
    deleted.add(id);
    window.localStorage.setItem(GIFT_OPTIONS_DELETED_KEY, JSON.stringify([...deleted]));
  } catch {}
}
