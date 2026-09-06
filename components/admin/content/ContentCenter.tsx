"use client";
import { timedController } from "@/src/lib/fetch-timeout";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileWarning,
  Info,
  Megaphone,
  Sparkles,
  Wifi,
  Zap,
  Power,
  Wand2,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { LoadingState, EmptyState, ErrorState } from "@/components/admin/ui/States";
import { useAdminGuard } from "@/src/admin/useAdminGuard";
import {
  type DashboardStats,
  type ContentSchedule,
  type ContentOpsSettings,
  type HybridProviderStatus,
  type ChannelConnectionStatus,
  CHANNEL_LABELS,
  TYPE_LABELS,
  formatDateTime,
  formatInt,
} from "./content-types";

interface DashboardPayload {
  dashboard: DashboardStats;
}

interface CalendarPayload {
  schedules: ContentSchedule[];
}

interface SettingsPayload {
  settings: ContentOpsSettings;
}

interface ProviderPayload {
  provider: HybridProviderStatus;
}

interface ChannelsPayload {
  channels: ChannelConnectionStatus[];
}

const QUICK_ACTIONS = [
  { key: "ideas", label: "توليد أفضل الأفكار" },
  { key: "content", label: "توليد المحتوى" },
  { key: "plan", label: "إنشاء خطة يومية" },
  { key: "pipeline", label: "تشغيل الأنبوب" },
];

export default function ContentCenter() {
  const { allowed, canEdit } = useAdminGuard("content");
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [schedules, setSchedules] = useState<ContentSchedule[]>([]);
  const [settings, setSettings] = useState<ContentOpsSettings | null>(null);
  const [provider, setProvider] = useState<HybridProviderStatus | null>(null);
  const [channels, setChannels] = useState<ChannelConnectionStatus[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const [dRes, cRes, sRes, pRes, chRes] = await Promise.all([
        fetch("/api/admin/content?action=dashboard", { signal }),
        fetch("/api/admin/content?action=calendar&range=week", { signal }),
        fetch("/api/admin/content?action=settings", { signal }),
        fetch("/api/admin/content?action=ai-status", { signal }),
        fetch("/api/admin/content?action=channels", { signal }),
      ]);
      if (!dRes.ok || !cRes.ok || !sRes.ok || !pRes.ok || !chRes.ok) throw new Error(`HTTP ${dRes.status || cRes.status || sRes.status}`);
      const d = (await dRes.json()) as DashboardPayload;
      const c = (await cRes.json()) as CalendarPayload;
      const s = (await sRes.json()) as SettingsPayload;
      const p = (await pRes.json()) as ProviderPayload;
      const ch = (await chRes.json()) as ChannelsPayload;
      setStats(d.dashboard);
      setSchedules(c.schedules.filter((x) => x.status === "scheduled").sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor)));
      setSettings(s.settings);
      setProvider(p.provider);
      setChannels(ch.channels);
      setLoading(false);
    } catch (e) {
      if (signal.aborted) return;
      setError((e as Error).message);
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = timedController(15000);
    (async () => {
      await load(controller.signal);
    })();
    return () => controller.abort();
  }, []);

  async function postAction(action: string, payload: Record<string, unknown> = {}): Promise<Record<string, unknown> | null> {
    setBusy(action);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        signal: AbortSignal.timeout(25000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const message = ((json.error as { message?: string } | undefined)?.message) ?? `HTTP ${res.status}`;
        setNotice(message);
        return null;
      }
      return json;
    } catch (e) {
      setNotice((e as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function switchProvider(name: "self" | "openai") {
    const json = await postAction("ai-switch", { provider: name });
    if (json?.provider) {
      setProvider(json.provider as HybridProviderStatus);
      setSettings((prev) => (prev ? { ...prev, aiProvider: name } : prev));
    }
  }

  async function quickAction(key: string) {
    if (key === "ideas") {
      const json = await postAction("generate-ideas", { limit: 8, creativeLimit: 5, regenerate: true });
      const records = (json?.records as unknown[] | undefined)?.length ?? 0;
      setNotice(records > 0 ? `تم توليد ${records} فكرة ذكية — راجع لوحة الأفكار` : "لا توجد أفكار جديدة مناسبة حاليًا");
    } else if (key === "content") {
      const json = await postAction("generate", { contentType: "PRODUCT_SPOTLIGHT", objective: "DISCOVERY" });
      if (json?.item) {
        setNotice("تم توليد محتوى جديد — ينتظر المراجعة");
        router.push("/admin/ai/content/items?status=GENERATED");
      } else if (json?.error) {
        const error = json.error as { message?: string };
        setNotice(error.message ?? "تعذر توليد المحتوى من البيانات المتاحة");
      } else {
        setNotice("تعذر إنشاء المحتوى؛ راجع حالة المزوّد والمنتجات المنشورة");
      }
    } else if (key === "plan") {
      const json = await postAction("plan", { kind: "daily" });
      if (json?.plan) setNotice("تم إنشاء الخطة اليومية");
    } else if (key === "pipeline") {
      const json = await postAction("run-pipeline", {});
      const r = (json?.result as { generated?: number; published?: number; failed?: number } | undefined) ?? {};
      setNotice(`تم تشغيل الأنبوب: توليد ${r.generated ?? 0}، نشر ${r.published ?? 0}، فشل ${r.failed ?? 0}`);
    }
  }

  async function toggleAI(value: boolean) {
    if (!settings) return;
    const previous = settings;
    const next = { ...settings, generationEnabled: value };
    setSettings(next);
    const json = await postAction("settings", next);
    if (json?.settings) {
      setSettings(json.settings as ContentOpsSettings);
    } else {
      setSettings(previous);
    }
  }

  async function toggleAutomation(key: "autoGenerate" | "autoSchedule" | "autoPublish", value: boolean) {
    if (!settings) return;
    const next = { ...settings, [key]: value };
    setSettings(next);
    const json = await postAction("update-automation", {
      autoGenerate: next.autoGenerate,
      autoSchedule: next.autoSchedule,
      autoPublish: next.autoPublish,
    });
    if (json?.settings) setSettings(json.settings as ContentOpsSettings);
  }

  if (!allowed) {
    return (
      <EmptyState
        title="ليس لديك صلاحية الوصول"
        description="دورك الحالي لا يملك صلاحية عرض مركز المحتوى."
      />
    );
  }

  if (loading) return <LoadingState label="جارٍ تحميل مركز المحتوى..." />;
  if (error) return <ErrorState title="خطأ في التحميل" description={error} onRetry={() => void load(timedController(15000).signal)} />;
  if (!stats) return <EmptyState title="لا توجد بيانات" description="تعذر تحميل إحصائيات المحتوى." />;

  const cards = [
    { label: "بانتظار المراجعة", value: stats.review, icon: ClipboardList, tone: "warning", href: "/admin/ai/content/items?status=REVIEW_REQUIRED" },
    { label: "معتمد", value: stats.approved, icon: CheckCircle2, tone: "success", href: "/admin/ai/content/items?status=APPROVED" },
    { label: "مجدول اليوم", value: stats.scheduledToday, icon: CalendarDays, tone: "accent", href: "/admin/ai/content/calendar" },
    { label: "منشور اليوم", value: stats.publishedToday, icon: Zap, tone: "primary", href: "/admin/ai/content/items?status=PUBLISHED" },
    { label: "فشل النشر/التحقق", value: stats.publishFailures, icon: FileWarning, tone: "error", href: "/admin/ai/content/items" },
    { label: "حملات نشطة", value: stats.activeCampaigns, icon: Megaphone, tone: "secondary", href: "/admin/ai/content/campaigns" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Sparkles size={20} className="text-primary" />
            مركز المحتوى
          </h1>
          <p className="text-xs text-muted">
            إجمالي {formatInt(stats.totalItems)} عنصر — {formatInt(stats.totalScheduled)} مجدول — {formatInt(stats.totalPublished)} منشور
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/ai/content/items" className="inline-flex items-center justify-center rounded-button border-2 border-primary px-4 py-1.5 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary hover:text-white">
            إدارة المحتوى
          </Link>
          <Link href="/admin/ai/content/settings" className="inline-flex items-center justify-center rounded-button bg-primary px-4 py-1.5 text-sm font-medium text-white shadow-card transition-all duration-200 hover:bg-primary-700">
            إعدادات الذكاء والربط
          </Link>
        </div>
      </div>

      {!settings?.autoPublish && (
        <Card className="flex items-start gap-3" padding="sm">
          <Info size={16} className="mt-0.5 shrink-0 text-warning-fg" />
          <div className="text-xs text-muted">
            <span className="font-semibold text-foreground">النشر الآلي متوقف.</span>{" "}
            النشر يتم يدويًا عبر دورة الموافقة. يمكنك تفعيل الأتمتة من صفحة الإعدادات —
            على أن تبقى قواعد السلامة (التحقق، الأصالة، حداثة السعر) مفعّلة دائمًا.
          </div>
        </Card>
      )}

      {notice && (
        <Card className="flex items-center justify-between gap-3" padding="sm">
          <span className="text-xs font-medium text-foreground">{notice}</span>
          <button onClick={() => setNotice(null)} className="text-[10px] text-muted hover:text-foreground">إغلاق</button>
        </Card>
      )}

      {/* PART 3 — Hybrid AI engine + channels + quick actions + automation */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Bot size={15} className="text-primary" />
            الوضع الذكي للذكاء الاصطناعي
          </h3>
          {provider && (
            <Badge variant={provider.ready ? "success" : "warning"} className="text-[9px]">
              {provider.messageAr}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!canEdit || busy !== null}
            onClick={() => void toggleAI(!settings?.generationEnabled)}
            className={`inline-flex items-center gap-1.5 rounded-pill px-4 py-2 text-xs font-bold transition-colors disabled:opacity-60 ${settings?.generationEnabled ? "bg-success text-white" : "bg-muted-bg text-muted hover:bg-primary/10"}`}
          >
            <Power size={13} />
            {settings?.generationEnabled ? "إيقاف الذكاء الصناعي" : "تشغيل الذكاء الصناعي"}
          </button>
          <button
            type="button"
            disabled={!canEdit || busy !== null}
            onClick={() => void switchProvider("self")}
            className={`rounded-pill px-4 py-2 text-xs font-bold transition-colors disabled:opacity-60 ${
              provider?.effective === "self" ? "bg-primary text-white ring-2 ring-primary/30" : "bg-muted-bg text-muted hover:bg-primary/10"
            }`}
          >
            🟢 ذاتي
          </button>
          <button
            disabled={!canEdit || busy !== null}
            onClick={() => void switchProvider("openai")}
            className={`rounded-pill px-4 py-2 text-xs font-bold transition-colors disabled:opacity-60 ${
              provider?.effective === "openai" ? "bg-primary text-white ring-2 ring-primary/30" : "bg-muted-bg text-muted hover:bg-primary/10"
            }`}
          >
            🔵 OpenAI
          </button>
          <span className="self-center text-[10px] text-muted">
            المختار: {provider?.selected === "openai" ? "OpenAI" : "ذاتي"}
            {provider?.fallbackUsed ? " (تلقائي ذاتي بسبب غياب المفتاح)" : ""}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {channels.map((ch) => (
            <span
              key={ch.channel}
              className={`flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[10px] font-medium ${
                ch.connected ? "bg-success/10 text-success-fg" : "bg-muted-bg text-muted"
              }`}
              title={ch.noteAr}
            >
              <Wifi size={10} className={ch.connected ? "text-success-fg" : "text-muted"} />
              {CHANNEL_LABELS[ch.channel] ?? ch.labelAr}
              {ch.connected ? "متصل" : "غير مربوط"}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((a) => (
            <Button
              key={a.key}
              variant="outline"
              size="sm"
              loading={busy === a.key}
              disabled={busy !== null}
              onClick={() => void quickAction(a.key)}
            >
              {a.label}
            </Button>
          ))}
          <Link href="/admin/ai/content/visual" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-primary-700">
            <Wand2 size={12} /> المحتوى المرئي
          </Link>
        </div>

        <div className="flex flex-wrap gap-4 border-t border-border/40 pt-3">
          {([
            ["autoGenerate", "توليد تلقائي"],
            ["autoSchedule", "جدولة تلقائية"],
            ["autoPublish", "نشر تلقائي"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-[10px] font-medium text-foreground">
              <input
                type="checkbox"
                disabled={!canEdit || busy !== null}
                checked={Boolean(settings?.[key])}
                onChange={(e) => void toggleAutomation(key, e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              {label}
            </label>
          ))}
          <span className="text-[9px] text-muted">قواعد السلامة لا تُعطَّل أبدًا مهما كان وضع الأتمتة.</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} padding="sm" className="flex flex-col gap-2" hover>
              <div className="flex items-center justify-between">
                <Icon size={18} className="text-muted" />
                <Badge variant={card.tone as never} className="text-[9px]">
                  {card.label}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-foreground">{formatInt(card.value)}</div>
              <a href={card.href} className="text-[10px] text-primary hover:underline">
                عرض التفاصيل
              </a>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <Clock size={14} className="text-accent" />
            الجدولة القادمة (أسبوع)
          </h3>
          {schedules.length === 0 ? (
            <EmptyState title="لا توجد جداول" description="لم يتم جدولة أي محتوى هذا الأسبوع." />
          ) : (
            <ul className="divide-y divide-border/40">
              {schedules.slice(0, 8).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-2 truncate">
                    <Badge variant="accent" className="text-[9px]">{CHANNEL_LABELS[s.channel]}</Badge>
                    <span className="truncate text-xs font-medium text-foreground">
                      {s.itemId}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted">{formatDateTime(s.scheduledFor)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-bold text-foreground">توازن أنواع المحتوى</h3>
          {stats.contentTypeBalance.length === 0 ? (
            <EmptyState title="لا يوجد محتوى" />
          ) : (
            <ul className="space-y-2">
              {stats.contentTypeBalance
                .slice()
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
                .map((row) => {
                  const max = stats.contentTypeBalance.reduce((m, x) => Math.max(m, x.count), 1);
                  const label = TYPE_LABELS[row.contentType as never] ?? row.contentType;
                  return (
                    <li key={row.contentType} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 truncate text-[10px] text-muted">{label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted-bg">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${(row.count / max) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-end text-[10px] font-semibold text-foreground">{row.count}</span>
                    </li>
                  );
                })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}