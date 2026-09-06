export const DEFAULT_BUNDLE_DISCOUNT_PERCENT = 20;

const STORAGE_KEY = "luminous-bundle-discount";

let cachedAPIDiscount: number | null = null;

export async function fetchBundleDiscountFromAPI(): Promise<number> {
  try {
    const res = await fetch("/api/admin/settings/bundle-discount", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.discountPercent === "number") {
        cachedAPIDiscount = data.discountPercent;
        return data.discountPercent;
      }
    }
  } catch {}
  return getBundleDiscountPercent();
}

export function getBundleDiscountFromCache(): number {
  if (cachedAPIDiscount !== null) return cachedAPIDiscount;
  return getBundleDiscountPercent();
}

export function getBundleDiscountPercent(): number {
  return DEFAULT_BUNDLE_DISCOUNT_PERCENT;
}

export function setBundleDiscountPercent(percent: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Math.min(100, Math.max(0, Math.round(percent)))));
  } catch {}
}
