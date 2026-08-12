"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

export type LoyaltyTransaction = {
  id: string;
  type: "earn" | "redeem";
  amount: number;
  label: string;
  labelAr: string;
  date: string;
};

export type LoyaltyState = {
  points: number;
  lifetime: number;
  transactions: LoyaltyTransaction[];
};

export type Reward = {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  points: number;
};

type LoyaltyContextType = {
  points: number;
  lifetime: number;
  tier: LoyaltyTier;
  tierProgress: { current: number; next: number; remaining: number };
  transactions: LoyaltyTransaction[];
  addOrderPoints: (orderTotal: number) => number;
  redeemReward: (reward: Reward) => boolean;
};

const STORAGE_KEY = "luminous-loyalty";

export const tierConfig: { key: LoyaltyTier; nameAr: string; nameEn: string; threshold: number }[] = [
  { key: "bronze", nameAr: "برونزي", nameEn: "Bronze", threshold: 0 },
  { key: "silver", nameAr: "فضي", nameEn: "Silver", threshold: 500 },
  { key: "gold", nameAr: "ذهبي", nameEn: "Gold", threshold: 1500 },
  { key: "platinum", nameAr: "بلاتيني", nameEn: "Platinum", threshold: 3000 },
];

export const rewards: Reward[] = [
  { id: "rv1", name: "1000 YER Discount", nameAr: "خصم 1000 ريال", description: "Coupon worth 1000 YER on your next order.", descriptionAr: "كوبون بقيمة 1000 ريال على طلبك القادم.", points: 100 },
  { id: "rv2", name: "3000 YER Discount", nameAr: "خصم 3000 ريال", description: "Coupon worth 3000 YER on your next order.", descriptionAr: "كوبون بقيمة 3000 ريال على طلبك القادم.", points: 250 },
  { id: "rv3", name: "Free Shipping", nameAr: "شحن مجاني", description: "Free shipping on your next order.", descriptionAr: "شحن مجاني على طلبك القادم.", points: 300 },
  { id: "rv4", name: "7000 YER Discount", nameAr: "خصم 7000 ريال", description: "Coupon worth 7000 YER on your next order.", descriptionAr: "كوبون بقيمة 7000 ريال على طلبك القادم.", points: 500 },
];

function loadState(): LoyaltyState {
  if (typeof window === "undefined") {
    return { points: 0, lifetime: 0, transactions: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.points === "number" && typeof parsed.lifetime === "number" && Array.isArray(parsed.transactions)) {
        return parsed;
      }
    }
  } catch {}
  return { points: 0, lifetime: 0, transactions: [] };
}

const LoyaltyContext = createContext<LoyaltyContextType | null>(null);

export function LoyaltyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoyaltyState>(() => loadState());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addOrderPoints = useCallback((orderTotal: number): number => {
    const earned = Math.floor(orderTotal / 100);
    if (earned <= 0) return 0;
    setState((prev) => ({
      points: prev.points + earned,
      lifetime: prev.lifetime + earned,
      transactions: [
        { id: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: "earn" as const, amount: earned, label: "Points from order", labelAr: "نقاط من طلب", date: new Date().toISOString() },
        ...prev.transactions,
      ].slice(0, 50),
    }));
    return earned;
  }, []);

  const redeemReward = useCallback((reward: Reward): boolean => {
    let ok = false;
    setState((prev) => {
      if (prev.points < reward.points) return prev;
      ok = true;
      return {
        points: prev.points - reward.points,
        lifetime: prev.lifetime,
      transactions: [
        { id: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: "redeem" as const, amount: -reward.points, label: reward.name, labelAr: reward.nameAr, date: new Date().toISOString() },
        ...prev.transactions,
      ].slice(0, 50),
      };
    });
    return ok;
  }, []);

  const tier = ((): LoyaltyTier => {
    let current: LoyaltyTier = "bronze";
    for (const t of tierConfig) {
      if (state.lifetime >= t.threshold) current = t.key;
    }
    return current;
  })();

  const tierProgress = (() => {
    const idx = tierConfig.findIndex((t) => t.key === tier);
    const next = idx < tierConfig.length - 1 ? tierConfig[idx + 1].threshold : null;
    return {
      current: tierConfig[idx].threshold,
      next: next ?? tierConfig[idx].threshold,
      remaining: next ? next - state.lifetime : 0,
    };
  })();

  return (
    <LoyaltyContext.Provider value={{ points: state.points, lifetime: state.lifetime, tier, tierProgress, transactions: state.transactions, addOrderPoints, redeemReward }}>
      {children}
    </LoyaltyContext.Provider>
  );
}

export function useLoyalty() {
  const ctx = useContext(LoyaltyContext);
  if (!ctx) throw new Error("useLoyalty must be used within LoyaltyProvider");
  return ctx;
}
