"use client";

import type { Order } from "@/types/cart";

const DAY_NAMES = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function lastNDays(count: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
}

const MAX_BAR_HEIGHT = 96;

export default function DashboardOrdersChart({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">لا توجد طلبات مسجلة بعد</p>
    );
  }

  const days = lastNDays(7);
  const counts = new Map<string, number>();
  for (const day of days) counts.set(dayKey(day), 0);
  for (const order of orders) {
    const key = dayKey(new Date(order.createdAt));
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const values = days.map((day) => counts.get(dayKey(day)) ?? 0);
  const max = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-2">
      {days.map((day, index) => {
        const value = values[index];
        const height = value === 0 ? 4 : Math.max(8, Math.round((value / max) * MAX_BAR_HEIGHT));
        return (
          <div key={dayKey(day)} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-xs font-bold text-foreground">{value}</span>
            <div className="flex h-32 w-full items-end justify-center">
              <div
                className="w-full max-w-[28px] rounded-t-lg bg-primary/70"
                style={{ height }}
                title={`${DAY_NAMES[day.getDay()]} — ${value} طلب`}
              />
            </div>
            <span className="text-[10px] text-muted">{DAY_NAMES[day.getDay()]}</span>
          </div>
        );
      })}
    </div>
  );
}
