import type { AdminCoupon } from "../../types";
import type { ResourceAdapter } from "./types";

export const COUPONS_STORAGE_KEY = "luminous-coupons";

export function listCoupons(): AdminCoupon[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COUPONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as AdminCoupon[];
    }
  } catch {}
  return [];
}

export function saveCoupons(list: AdminCoupon[]) {
  try {
    window.localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function createCoupon(coupon: AdminCoupon): AdminCoupon[] {
  const next = [...listCoupons(), coupon];
  saveCoupons(next);
  return next;
}

export function updateCoupon(
  id: string,
  patch: Partial<AdminCoupon>,
): AdminCoupon[] {
  const next = listCoupons().map((coupon) =>
    coupon.id === id ? { ...coupon, ...patch } : coupon,
  );
  saveCoupons(next);
  return next;
}

export function deleteCoupon(id: string): AdminCoupon[] {
  const next = listCoupons().filter((coupon) => coupon.id !== id);
  saveCoupons(next);
  return next;
}

export const couponsAdapter: ResourceAdapter<AdminCoupon[]> = {
  resource: "coupons",
  storageKeys: [COUPONS_STORAGE_KEY],
  load: listCoupons,
  save: saveCoupons,
};
