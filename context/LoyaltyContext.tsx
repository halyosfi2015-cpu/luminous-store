"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createBrowserSupabaseClient } from "@/src/lib/supabase";
import { useAuth } from "@/context/AuthContext";

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
  addOrderPoints: (orderTotal: number) => Promise<number>;
  redeemReward: (reward: Reward) => Promise<boolean>;
};

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

const LoyaltyContext = createContext<LoyaltyContextType | null>(null);

type SupabaseAccountRow = { id: string; points: number; lifetime_points: number; tier: string };
type SupabaseTxnRow = { id: string; type: string; amount: number; label: string; label_ar: string | null; created_at: string };

export function LoyaltyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoyaltyState>({ points: 0, lifetime: 0, transactions: [] });
  const { user } = useAuth();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data: account } = await supabase
        .from("loyalty_accounts" as never)
        .select("id, points, lifetime_points, tier")
        .eq("customer_id", user!.id)
        .single();
      if (!account) return;
      const row = account as unknown as SupabaseAccountRow;
      const { data: txns } = await supabase
        .from("loyalty_transactions" as never)
        .select("id, type, amount, label, label_ar, created_at")
        .eq("account_id", row.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setState({
        points: row.points,
        lifetime: row.lifetime_points,
        transactions: (txns ?? []).map((t: unknown) => {
          const txn = t as SupabaseTxnRow;
          return { id: txn.id, type: txn.type as "earn" | "redeem", amount: txn.amount, label: txn.label, labelAr: txn.label_ar ?? txn.label, date: txn.created_at };
        }),
      });
    }
    load();
  }, [user, supabase]);

  const addOrderPoints = useCallback(async (orderTotal: number): Promise<number> => {
    const earned = Math.floor(orderTotal / 100);
    if (earned <= 0 || !user) return 0;
    const { data: account } = await supabase
      .from("loyalty_accounts" as never)
      .select("id, points, lifetime_points")
      .eq("customer_id", user.id)
      .single();
    if (!account) return 0;
    const row = account as unknown as { id: string; points: number; lifetime_points: number };
    await supabase.from("loyalty_accounts" as never).update({
      points: row.points + earned,
      lifetime_points: row.lifetime_points + earned,
    } as never).eq("id", row.id);
    await supabase.from("loyalty_transactions" as never).insert({
      account_id: row.id,
      type: "earn",
      amount: earned,
      label: "Points from order",
      label_ar: "نقاط من طلب",
    } as never);
    setState((prev) => ({
      points: prev.points + earned,
      lifetime: prev.lifetime + earned,
      transactions: [
        { id: `txn-${Date.now()}`, type: "earn" as const, amount: earned, label: "Points from order", labelAr: "نقاط من طلب", date: new Date().toISOString() },
        ...prev.transactions,
      ].slice(0, 50),
    }));
    return earned;
  }, [user, supabase]);

  const redeemReward = useCallback(async (reward: Reward): Promise<boolean> => {
    if (!user || state.points < reward.points) return false;
    const { data: account } = await supabase
      .from("loyalty_accounts" as never)
      .select("id, points")
      .eq("customer_id", user.id)
      .single();
    if (!account) return false;
    const row = account as unknown as { id: string; points: number };
    if (row.points < reward.points) return false;
    await supabase.from("loyalty_accounts" as never).update({ points: row.points - reward.points } as never).eq("id", row.id);
    await supabase.from("loyalty_transactions" as never).insert({
      account_id: row.id,
      type: "redeem",
      amount: -reward.points,
      label: reward.name,
      label_ar: reward.nameAr,
    } as never);
    setState((prev) => ({
      points: prev.points - reward.points,
      lifetime: prev.lifetime,
      transactions: [
        { id: `txn-${Date.now()}`, type: "redeem" as const, amount: -reward.points, label: reward.name, labelAr: reward.nameAr, date: new Date().toISOString() },
        ...prev.transactions,
      ].slice(0, 50),
    }));
    return true;
  }, [user, state.points, supabase]);

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
