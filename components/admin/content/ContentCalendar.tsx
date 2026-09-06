"use client";
import { timedController } from "@/src/lib/fetch-timeout";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, ChevronLeft, Send, Ban } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { LoadingState, EmptyState, ErrorState } from "@/components/admin/ui/States";
import { useAdminGuard } from "@/src/admin/useAdminGuard";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import {
  type ContentSchedule,
  CHANNEL_LABELS,
  formatDateTime,
} from "./content-types";

interface CalendarPayload {
  schedules: ContentSchedule[];
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function ContentCalendar() {
  const { allowed, canEdit } = useAdminGuard("content");
  const { toast } = useAdminToast();
  const [schedules, setSchedules] = useState<ContentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [view, setView] = useState<"week" | "month">("week");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = timedController(15000);
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const range = view === "month" ? "month" : "week";
        const res = await fetch(`/api/admin/content?action=calendar&range=${range}&date=${anchor.toISOString().slice(0, 10)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as CalendarPayload;
        setSchedules(json.schedules);
        setLoading(false);
      } catch (e) {
        if (!controller.signal.aborted) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => controller.abort();
  }, [anchor, view]);

  async function post(body: Record<string, unknown>): Promise<unknown> {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        signal: AbortSignal.timeout(25000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok || json.error) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
      return json;
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(id: string) {
    try {
      await post({ action: "publish", id, channel: "website" });
      toast("تم نشر المحتوى", "success");
      setSchedules((prev) => prev.filter((s) => !(s.itemId === id && s.status === "scheduled")));
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function handleCancel(id: string) {
    try {
      await post({ action: "cancel-schedule", id });
      toast("تم إلغاء الجدولة", "success");
      setSchedules((prev) => prev.filter((s) => s.itemId !== id));
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function handleReschedule(scheduleId: string, newDateStr: string) {
    try {
      const orig = schedules.find((s) => s.id === scheduleId);
      if (!orig) return;
      const newTime = new Date(newDateStr);
      // preserve original time-of-day, move date
      const src = new Date(orig.scheduledFor);
      newTime.setHours(src.getHours(), src.getMinutes(), 0, 0);
      const res = (await post({ action: "reschedule", id: scheduleId, scheduledFor: newTime.toISOString() })) as { schedule: ContentSchedule };
      setSchedules((prev) => prev.map((s) => (s.id === scheduleId ? res.schedule : s)));
      toast("تم نقل الجدولة", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  if (!allowed) {
    return (
      <EmptyState
        title="ليس لديك صلاحية الوصول"
        description="دورك الحالي لا يملك صلاحية عرض التقويم."
      />
    );
  }

  if (loading) return <LoadingState label="جارٍ تحميل التقويم..." />;
  if (error) return <ErrorState title="خطأ في التحميل" description={error} />;

  const days = view === "week"
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date(anchor);
        d.setDate(anchor.getDate() + i);
        return d;
      })
    : (() => {
        const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
        const start = startOfWeek(first);
        return Array.from({ length: 35 }, (_, i) => {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          return d;
        });
      })();

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <CalendarDays size={20} className="text-primary" />
            تقويم النشر
          </h1>
          <p className="text-xs text-muted">{schedules.filter((s) => s.status === "scheduled").length} عنصر مجدول هذا الأسبوع</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-button border border-border p-0.5 bg-muted-bg">
            <button onClick={() => setView("week")} className={`px-3 py-1 text-xs rounded-button ${view === "week" ? "bg-primary text-white" : "text-muted"}`}>أسبوع</button>
            <button onClick={() => setView("month")} className={`px-3 py-1 text-xs rounded-button ${view === "month" ? "bg-primary text-white" : "text-muted"}`}>شهر</button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAnchor((a) => view === "month" ? new Date(a.getFullYear(), a.getMonth() - 1, 1) : new Date(a.getTime() - 7 * 86400000))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(view === "month" ? new Date() : startOfWeek(new Date()))}>
            {view === "month" ? "هذا الشهر" : "هذا الأسبوع"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor((a) => view === "month" ? new Date(a.getFullYear(), a.getMonth() + 1, 1) : new Date(a.getTime() + 7 * 86400000))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={`grid gap-3 ${view === "month" ? "grid-cols-2 md:grid-cols-7" : "grid-cols-2 xl:grid-cols-7"}`}>
        {days.map((day) => {
          const dayKey = day.toISOString().slice(0, 10);
          const daySchedules = schedules.filter((s) => s.scheduledFor.slice(0, 10) === dayKey);
          const today = day.toDateString() === new Date().toDateString();
          const isCurrentMonth = view === "month" ? day.getMonth() === anchor.getMonth() : true;
          return (
            <div
              key={dayKey}
              onDragOver={(e: React.DragEvent) => { e.preventDefault(); }}
              onDrop={() => { if (draggedId) void handleReschedule(draggedId, dayKey + "T00:00:00.000Z"); setDraggedId(null); }}
              className="min-h-32"
            >
              <Card
                padding="sm"
                className={`${today ? "border-primary/60" : ""} ${!isCurrentMonth ? "opacity-40" : ""}`}
              >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  {day.toLocaleDateString("ar-YE", { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <Badge variant={today ? "primary" : "neutral"} className="text-[9px]">
                  {daySchedules.length}
                </Badge>
              </div>
              {daySchedules.length === 0 ? (
                <p className="py-4 text-center text-[10px] text-muted">لا توجد جداول</p>
              ) : (
                <ul className="space-y-2">
                  {daySchedules.map((s) => (
                    <li
                      key={s.id}
                      draggable={canEdit && s.status === "scheduled"}
                      onDragStart={() => setDraggedId(s.id)}
                      onDragEnd={() => setDraggedId(null)}
                      className={`rounded-card border p-2 cursor-move ${s.status === "scheduled" ? "border-border/50 hover:border-primary/40" : "border-border/30 opacity-60"} ${draggedId === s.id ? "opacity-50 ring-1 ring-primary" : ""}`}
                      title="اسحب لنقل الجدولة ليوم آخر"
                    >
                      <div className="mb-1 flex items-center justify-between gap-1">
                        <Badge variant={s.status === "scheduled" ? "accent" : s.status === "published" ? "success" : "neutral"} className="text-[8px]">{CHANNEL_LABELS[s.channel]} · {s.status}</Badge>
                        <span className="text-[9px] text-muted">{formatDateTime(s.scheduledFor)}</span>
                      </div>
                      <p className="truncate text-[10px] font-medium text-foreground">{s.itemId.slice(0, 8)}…</p>
                      {canEdit && s.status === "scheduled" && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="!px-2 !py-0.5 text-[9px]" loading={busy} onClick={() => void handlePublish(s.itemId)}>
                            <Send className="h-3 w-3" /> نشر
                          </Button>
                          <Button variant="ghost" size="sm" className="!px-2 !py-0.5 text-[9px]" loading={busy} onClick={() => void handleCancel(s.itemId)}>
                            <Ban className="h-3 w-3" /> إلغاء
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}