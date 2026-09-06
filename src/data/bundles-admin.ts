import type { Bundle } from "@/src/types/bundle";
import { bundles as canonicalBundles } from "@/src/data/bundles";

export const BUNDLES_STORAGE_KEY = "luminous-bundles";

export interface GiftOption {
  id: string;
  labelAr: string;
  labelEn: string;
  price: number;
  descAr: string;
  descEn: string;
  enabled: boolean;
}

export const DEFAULT_GIFT_OPTIONS: GiftOption[] = [
  { id: "wrap", labelAr: "تغليف فاخر", labelEn: "Luxury Wrap", price: 1500, descAr: "تغليف أنيق بألوان راقية", descEn: "Elegant premium wrapping", enabled: true },
  { id: "card", labelAr: "بطاقة إهداء", labelEn: "Gift Card", price: 1000, descAr: "بطاقة إهداء برسالة شخصية", descEn: "Gift card with personal message", enabled: true },
  { id: "ribbon", labelAr: "شريط هدية", labelEn: "Gift Ribbon", price: 1000, descAr: "شريط ساتان فاخر", descEn: "Luxury satin ribbon", enabled: true },
  { id: "flower", labelAr: "ورد مجفف", labelEn: "Dried Flowers", price: 2500, descAr: "باقة ورد مجفف أنيقة", descEn: "Elegant dried flower bouquet", enabled: true },
];

export const GIFT_OPTIONS_STORAGE_KEY = "luminous-gift-options";

export const GIFT_OPTIONS_DELETED_KEY = "luminous-gift-options-deleted";

export function loadDeletedGiftOptionIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(GIFT_OPTIONS_DELETED_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export function loadBundles(): Bundle[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BUNDLES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

export function saveBundles(list: Bundle[]) {
  try {
    window.localStorage.setItem(BUNDLES_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function loadGiftOptions(): GiftOption[] {
  if (typeof window === "undefined") return DEFAULT_GIFT_OPTIONS;
  try {
    const raw = window.localStorage.getItem(GIFT_OPTIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_GIFT_OPTIONS;
}

export function saveGiftOptions(list: GiftOption[]) {
  try {
    window.localStorage.setItem(GIFT_OPTIONS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function getBundlesWithDefaults(): Bundle[] {
  const stored = loadBundles();
  if (stored.length > 0) return stored;
  if (Array.isArray(canonicalBundles) && canonicalBundles.length > 0) return canonicalBundles;
  return [];
}

export function getGiftOptionsWithDefaults(): GiftOption[] {
  const stored = loadGiftOptions();
  if (stored.length > 0) return stored;
  return DEFAULT_GIFT_OPTIONS;
}