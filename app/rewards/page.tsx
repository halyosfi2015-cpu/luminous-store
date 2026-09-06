"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Gift, ChevronLeft, Award, Check, Clock } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { useLoyalty, tierConfig, rewards } from "@/context/LoyaltyContext";
import { useAuth } from "@/context/AuthContext";
import { redirect } from "next/navigation";

export default function RewardsPage() {
  const { points, lifetime, tier, tierProgress, transactions, redeemReward } = useLoyalty();
  const { isLoggedIn } = useAuth();
  const [claimed, setClaimed] = useState<Record<string, string | null>>({});

  if (!isLoggedIn) { redirect("/login"); }

  const currentTier = tierConfig.find((t) => t.key === tier);

  const handleRedeem = async (rewardId: string) => {
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return;
    const ok = await redeemReward(reward);
    if (ok) {
      const code = `LD-${rewardId.toUpperCase()}-${(Object.keys(claimed).length + 1).toString().padStart(4, "0")}`;
      setClaimed((prev) => ({ ...prev, [rewardId]: code }));
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-background py-10">
      <Container className="max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/account" className="text-muted transition-colors hover:text-foreground">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
            <Gift size={22} className="text-primary" />
            برنامج المكافآت
          </h1>
        </div>

        <div className="mb-8 overflow-hidden rounded-card border border-border bg-card shadow-card">
          <div className="bg-gradient-to-br from-primary via-primary-light to-secondary p-6 text-white sm:p-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/80">رصيدك من النقاط</p>
                <p className="mt-1 text-4xl font-extrabold sm:text-5xl">{points.toLocaleString("ar-YE")}</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-5 py-3 backdrop-blur">
                <Award size={28} className="text-white" />
                <div>
                  <p className="text-xs text-white/80">المستوى الحالي</p>
                  <p className="text-lg font-bold">{currentTier?.nameAr}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted">
              <span>مجموع النقاط المكتسبة: {lifetime.toLocaleString("ar-YE")}</span>
              <span>
                {tierProgress.next > tierProgress.current
                  ? `متبقي ${(tierProgress.next - lifetime).toLocaleString("ar-YE")} نقطة للترقية إلى المستوى التالي`
                  : "وصلتِ إلى أعلى مستوى — مبروك!"}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-pill bg-muted-bg">
              <div
                className="h-full rounded-pill bg-gradient-to-r from-secondary to-primary transition-all duration-500 ease-out-smooth"
                style={{
                  width: `${tierProgress.next > tierProgress.current
                    ? Math.min(100, ((lifetime - tierProgress.current) / (tierProgress.next - tierProgress.current)) * 100)
                    : 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tierConfig.map((t) => (
            <div
              key={t.key}
              className={`rounded-card border p-4 text-center transition-colors ${
                tier === t.key ? "border-primary bg-primary/5 shadow-card" : "border-border bg-card"
              }`}
            >
              <p className={`text-sm font-bold ${tier === t.key ? "text-primary" : "text-foreground"}`}>{t.nameAr}</p>
              <p className="mt-1 text-[11px] text-muted">{t.threshold.toLocaleString("ar-YE")}+ نقطة</p>
            </div>
          ))}
        </div>

        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground">
          <Gift size={18} className="text-primary" />
          استبدلي نقاطك
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {rewards.map((reward) => {
            const isClaimed = claimed[reward.id] != null;
            const canAfford = points >= reward.points && !isClaimed;
            return (
              <div key={reward.id} className="flex flex-col rounded-card border border-border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{reward.nameAr}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{reward.descriptionAr}</p>
                  </div>
                  <span className="shrink-0 rounded-pill bg-secondary/10 px-3 py-1 text-xs font-bold text-secondary">
                    {reward.points.toLocaleString("ar-YE")} نقطة
                  </span>
                </div>
                <div className="mt-4">
                  {isClaimed ? (
                    <div className="rounded-input border border-success/30 bg-success-soft p-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-success-fg">
                        <Check size={14} />
                        تم الاستبدال — كوبونك: {claimed[reward.id]}
                      </p>
                    </div>
                  ) : (
                    <Button
                      variant={canAfford ? "primary" : "outline"}
                      size="sm"
                      className="w-full"
                      disabled={!canAfford}
                      onClick={() => handleRedeem(reward.id)}
                    >
                      {canAfford ? "استبدال" : `تحتاج ${(reward.points - points).toLocaleString("ar-YE")} نقطة`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="mt-8 mb-4 flex items-center gap-2 text-base font-bold text-foreground">
          <Clock size={18} className="text-primary" />
          سجل النقاط
        </h2>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-8 text-center">
            <Star size={32} className="text-muted/30" />
            <p className="text-sm text-muted">لا يوجد نشاط بعد. ابدئي التسوق لكسب النقاط!</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
            {transactions.slice(0, 10).map((txn) => (
              <div key={txn.id} className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{txn.labelAr}</p>
                  <p className="text-xs text-muted">{new Date(txn.date).toLocaleDateString("ar-YE", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
                <span className={`shrink-0 text-sm font-bold ${txn.type === "earn" ? "text-success" : "text-error"}`}>
                  {txn.type === "earn" ? "+" : ""}{txn.amount.toLocaleString("ar-YE")}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-card border border-border bg-card p-5 text-sm text-muted shadow-card">
          <p className="font-semibold text-foreground">كيف تكسبين النقاط؟</p>
          <ul className="mt-2 space-y-1.5">
            <li>• 1 نقطة لكل 100 ريال تنفقينها في طلبك.</li>
            <li>• نقاط إضافية في العروض والمناسبات الخاصة.</li>
            <li>• النقاط تُضاف فور إتمام الطلب ويمكن استبدالها في أي وقت.</li>
          </ul>
        </div>
      </Container>
    </main>
  );
}
