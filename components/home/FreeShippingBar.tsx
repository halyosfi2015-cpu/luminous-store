"use client";

import { useMemo } from "react";
import { Truck, Gift, Sparkles } from "lucide-react";
import { useCart } from "@/context/CartContext";

const FREE_SHIPPING_THRESHOLD = 25000;

const DOTS = [...Array(20)].map(() => ({
  left: Math.random() * 100,
  top: Math.random() * 100,
  duration: 2 + Math.random() * 3,
  delay: Math.random() * 2,
}));

export default function FreeShippingBar() {
  const { items } = useCart();
  const total = useMemo(
    () =>
      items.reduce(
        (acc: number, item: { price: number; quantity: number }) =>
          acc + item.price * item.quantity,
        0
      ),
    [items]
  );

  const remaining = Math.max(FREE_SHIPPING_THRESHOLD - total, 0);
  const progress = Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const isFree = total >= FREE_SHIPPING_THRESHOLD;

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
      {/* Animated background dots */}
      <div className="absolute inset-0 overflow-hidden">
        {DOTS.map((dot, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white/5"
            style={{
              left: `${dot.left}%`,
              top: `${dot.top}%`,
              animation: `pulse ${dot.duration}s infinite`,
              animationDelay: `${dot.delay}s`
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {/* Moving truck on progress bar */}
          <div className="relative shrink-0">
            <div className="relative">
              {/* Truck that moves with progress */}
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30 transition-all duration-700"
                style={{
                  transform: `translateX(${Math.sin(progress / 10) * 3}px)`,
                }}
              >
                {isFree ? (
                  <Sparkles size={24} className="animate-spin" />
                ) : (
                  <Truck size={24} />
                )}
              </div>
              {/* Trail effect */}
              {!isFree && progress > 0 && (
                <div className="absolute -end-2 top-1/2 h-1 w-4 -translate-y-1/2 rounded-full bg-gradient-to-r from-orange-400 to-transparent opacity-60" />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {isFree ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400 animate-pulse" />
                  <span className="text-sm font-bold text-emerald-400">
                    مبروك! شحن مجاني
                  </span>
                  <Sparkles size={16} className="text-amber-400 animate-pulse" />
                </div>
                <span className="text-[10px] text-white/40">
                  طلبك مؤهل
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white truncate">
                    أضيفي {remaining.toLocaleString("ar-YE")} ريال للشحن المجاني
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Gift size={12} className="text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-400">
                      {FREE_SHIPPING_THRESHOLD.toLocaleString("ar-YE")} ريال
                    </span>
                  </div>
                </div>

                {/* Progress bar with milestones */}
                <div className="relative">
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 transition-all duration-700 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                    {/* Shine effect */}
                    <div
                      className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      style={{ left: `calc(${progress}% - 24px)` }}
                    />
                  </div>
                  {/* Milestone markers */}
                  <div className="absolute -top-1 start-0 h-4 w-0.5 rounded-full bg-white/20" style={{ left: "25%" }} />
                  <div className="absolute -top-1 start-0 h-4 w-0.5 rounded-full bg-white/20" style={{ left: "50%" }} />
                  <div className="absolute -top-1 start-0 h-4 w-0.5 rounded-full bg-white/20" style={{ left: "75%" }} />
                </div>

                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[9px] text-white/30">
                    {total.toLocaleString("ar-YE")} / {FREE_SHIPPING_THRESHOLD.toLocaleString("ar-YE")} ريال
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="h-1 w-1 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-amber-400">{Math.round(progress)}%</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

