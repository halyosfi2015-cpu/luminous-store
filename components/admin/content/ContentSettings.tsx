"use client";
import { timedController } from "@/src/lib/fetch-timeout";

import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save, ShieldCheck, Info, Bot, Wifi, Plug, Unplug } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { LoadingState, EmptyState, ErrorState } from "@/components/admin/ui/States";
import { useAdminGuard } from "@/src/admin/useAdminGuard";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import {
  type ContentOpsSettings,
  type ContentType,
  type ChannelKey,
  type HybridProviderStatus,
  type ChannelConnectionStatus,
  ALL_CONTENT_TYPES,
  ALL_CHANNELS,
  TYPE_LABELS,
  CHANNEL_LABELS,
} from "./content-types";

interface SettingsPayload {
  settings: ContentOpsSettings;
}

interface ProviderPayload {
  provider: HybridProviderStatus;
}

interface ChannelsPayload {
  channels: ChannelConnectionStatus[];
}

export default function ContentSettings() {
  const { allowed, canEdit } = useAdminGuard("content");
  const { toast } = useAdminToast();
  const [settings, setSettings] = useState<ContentOpsSettings | null>(null);
  const [provider, setProvider] = useState<HybridProviderStatus | null>(null);
  const [channels, setChannels] = useState<ChannelConnectionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = timedController(15000);
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [sRes, pRes, chRes] = await Promise.all([
          fetch("/api/admin/content?action=settings", { signal: controller.signal }),
          fetch("/api/admin/content?action=ai-status", { signal: controller.signal }),
          fetch("/api/admin/content?action=channels", { signal: controller.signal }),
        ]);
        if (!sRes.ok || !pRes.ok || !chRes.ok) throw new Error(`HTTP ${sRes.status || pRes.status || chRes.status}`);
        const s = (await sRes.json()) as SettingsPayload;
        const p = (await pRes.json()) as ProviderPayload;
        const ch = (await chRes.json()) as ChannelsPayload;
        setSettings(s.settings);
        setProvider(p.provider);
        setChannels(ch.channels);
        setLoading(false);
      } catch (e) {
        if (!controller.signal.aborted) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => controller.abort();
  }, []);

  const [metaToken, setMetaToken] = useState("");
  const [metaBusy, setMetaBusy] = useState<"idle" | "facebook" | "instagram">("idle");
  const [metaInfo, setMetaInfo] = useState<Record<string, { page_name?: string | null; ig_username?: string | null; token_expires_at?: string | null; status?: string } | null>>({});

  async function refreshMetaInfo() {
    for (const ch of ["facebook", "instagram"] as const) {
      try {
        const res = await fetch("/api/admin/content", {
          method: "POST",
          signal: AbortSignal.timeout(15000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "channel-meta", channel: ch }),
        });
        const json = (await res.json()) as { meta?: { page_name?: string | null; ig_username?: string | null; token_expires_at?: string | null; status?: string } | null };
        if (res.ok) setMetaInfo((prev) => ({ ...prev, [ch]: json.meta ?? null }));
      } catch { /* meta info optional */ }
    }
  }

  async function handleMetaConnect(channel: "facebook" | "instagram") {
    if (!metaToken.trim()) {
      toast("الصق رمز الوصول أولاً", "error");
      return;
    }
    setMetaBusy(channel);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        signal: AbortSignal.timeout(45000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect-channel", channel, pageAccessToken: metaToken.trim() }),
      });
      const json = (await res.json()) as { error?: { message: string }; channels?: ChannelConnectionStatus[] };
      if (!res.ok || json.error) {
        toast(json.error?.message ?? `HTTP ${res.status}`, "error");
        return;
      }
      if (json.channels) setChannels(json.channels);
      setMetaToken("");
      await refreshMetaInfo();
      toast("تم ربط القناة برمز حقيقي", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setMetaBusy("idle");
    }
  }

  async function handleChannelAction(channel: ChannelKey, connect: boolean) {
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        signal: AbortSignal.timeout(25000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: connect ? "connect-channel" : "disconnect-channel", channel }),
      });
      const json = (await res.json()) as { error?: { message: string }; channels?: ChannelConnectionStatus[] };
      if (!res.ok || json.error) {
        toast(json.error?.message ?? `HTTP ${res.status}`, "error");
        return;
      }
      if (json.channels) setChannels(json.channels);
      if (!connect) await refreshMetaInfo();
      toast(connect ? "تمت محاولة الربط" : "تم الفصل", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  useEffect(() => {
    void refreshMetaInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patch(p: Partial<ContentOpsSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...p } : prev));
  }

  function toggleArray<K extends keyof ContentOpsSettings>(
    key: K,
    value: string,
  ) {
    setSettings((prev) => {
      if (!prev) return prev;
      const arr = prev[key] as unknown as string[];
      const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
      return { ...prev, [key]: next as unknown as ContentOpsSettings[K] };
    });
  }

  async function handleSave() {
    if (!settings) return;
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        signal: AbortSignal.timeout(25000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settings", ...settings }),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok || json.error) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
      toast("تم حفظ الإعدادات", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) {
    return (
      <EmptyState
        title="ليس لديك صلاحية الوصول"
        description="دورك الحالي لا يملك صلاحية عرض الإعدادات."
      />
    );
  }

  if (loading) return <LoadingState label="جارٍ تحميل الإعدادات..." />;
  if (error) return <ErrorState title="خطأ في التحميل" description={error} />;
  if (!settings) return <EmptyState title="لا توجد بيانات" />;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <SettingsIcon size={20} className="text-primary" />
            إعدادات المحتوى
          </h1>
          <p className="text-xs text-muted">
            المنطقة الزمنية: <Badge variant="neutral" className="text-[9px]">{settings.timezone}</Badge>
          </p>
        </div>
        {canEdit && (
          <Button variant="primary" size="sm" loading={busy} onClick={() => { setBusy(true); void handleSave(); }}>
            <Save className="h-3.5 w-3.5" />
            حفظ الإعدادات
          </Button>
        )}
      </div>

      <Card className="flex items-start gap-3" padding="sm">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-success-fg" />
        <p className="text-xs text-muted">
          قواعد السلامة لا يمكن إيقافها: حد أدنى للأصالة 50%، وحد أدنى لحداثة السعر يوم واحد،
          وقناة الموقع مضمّنة دائمًا في القنوات المفعّلة.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-bold text-foreground">الأتمتة</h3>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">وضع التشغيل</span>
              <select
                disabled={!canEdit}
                value={settings.mode}
                onChange={(e) => patch({ mode: e.target.value as ContentOpsSettings["mode"] })}
                className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
              >
                <option value="auto">تلقائي كامل</option>
                <option value="admin_approval">موافقة إدارية</option>
                <option value="hybrid">هجين</option>
              </select>
            </label>

            <div className="space-y-2">
              {([
                ["generationEnabled", "تفعيل توليد المحتوى"],
                ["dailyPlanEnabled", "الخطة اليومية"],
                ["weeklyPlanEnabled", "الخطة الأسبوعية"],
                ["schedulingEnabled", "تفعيل الجدولة"],
                ["autoGenerate", "توليد تلقائي"],
                ["autoSchedule", "جدولة تلقائية"],
                ["autoPublish", "نشر تلقائي"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-3 rounded-card border border-border/60 px-3 py-2">
                  <span className="text-xs font-medium text-foreground">{label}</span>
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={Boolean(settings[key])}
                    onChange={(e) => patch({ [key]: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-foreground">حد النشر اليومي التلقائي</span>
                <input
                  type="number"
                  disabled={!canEdit}
                  value={settings.autoPublishDailyLimit}
                  onChange={(e) => patch({ autoPublishDailyLimit: Number(e.target.value) })}
                  className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-foreground">أقصى عناصر يومية</span>
                <input
                  type="number"
                  disabled={!canEdit}
                  value={settings.maxDailyItems}
                  onChange={(e) => patch({ maxDailyItems: Number(e.target.value) })}
                  className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
                />
              </label>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-bold text-foreground">أنواع المحتوى الآلي والجداول</h3>
          <div className="space-y-4">
            <div>
              <span className="mb-2 block text-xs font-medium text-foreground">
                أنواع المحتوى المؤهلة للنشر التلقائي
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_CONTENT_TYPES.map((t: ContentType) => (
                  <button
                    key={t}
                    disabled={!canEdit}
                    onClick={() => toggleArray("autoPublishContentTypes", t)}
                    className={`rounded-pill px-2.5 py-1 text-[10px] font-medium transition-colors disabled:opacity-60 ${
                      settings.autoPublishContentTypes.includes(t)
                        ? "bg-primary text-white"
                        : "bg-muted-bg text-muted hover:bg-primary/10"
                    }`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-muted">المحتوى عالي الخطورة لا يدخل النشر التلقائي أبدًا.</p>
            </div>

            <div>
              <span className="mb-2 block text-xs font-medium text-foreground">القنوات المفعّلة</span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_CHANNELS.map((c: ChannelKey) => (
                  <button
                    key={c}
                    disabled={!canEdit}
                    onClick={() => toggleArray("enabledChannels", c)}
                    className={`rounded-pill px-2.5 py-1 text-[10px] font-medium transition-colors disabled:opacity-60 ${
                      settings.enabledChannels.includes(c)
                        ? "bg-primary text-white"
                        : "bg-muted-bg text-muted hover:bg-primary/10"
                    }`}
                  >
                    {CHANNEL_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">الأوقات الافتراضية (ساعة:دقيقة)</span>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.defaultTimes.join(", ")}
                onChange={(e) =>
                  patch({
                    defaultTimes: e.target.value.split(",").map((x) => x.trim()).filter(Boolean),
                  })
                }
                className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
                placeholder="10:00, 14:00, 18:00"
              />
            </label>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-bold text-foreground">التحقق والأصالة</h3>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 flex items-center justify-between text-xs font-medium text-foreground">
                <span>حد الأصالة</span>
                <Badge variant="neutral" className="text-[9px]">{Math.round(settings.originalityThreshold * 100)}%</Badge>
              </span>
              <input
                type="range"
                min={0.5}
                max={0.95}
                step={0.05}
                disabled={!canEdit}
                value={settings.originalityThreshold}
                onChange={(e) => patch({ originalityThreshold: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center justify-between text-xs font-medium text-foreground">
                <span>حد ثقة المصادر</span>
                <Badge variant="neutral" className="text-[9px]">{Math.round(settings.sourceConfidenceThreshold * 100)}%</Badge>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                disabled={!canEdit}
                value={settings.sourceConfidenceThreshold}
                onChange={(e) => patch({ sourceConfidenceThreshold: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">أيام حداثة السعر</span>
              <input
                type="number"
                min={1}
                disabled={!canEdit}
                value={settings.priceFreshnessDays}
                onChange={(e) => patch({ priceFreshnessDays: Math.max(1, Number(e.target.value)) })}
                className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">أقصى ظهور للمنتج</span>
              <input
                type="number"
                disabled={!canEdit}
                value={settings.maxProductAppearances}
                onChange={(e) => patch({ maxProductAppearances: Number(e.target.value) })}
                className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">أقصى تركيز للفئة</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                disabled={!canEdit}
                value={settings.maxCategoryConcentration}
                onChange={(e) => patch({ maxCategoryConcentration: Number(e.target.value) })}
                className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
              />
            </label>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
            <Bot size={14} className="text-primary" />
            الذكاء الاصطناعي الهجين
          </h3>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">محرك التوليد</span>
              <select
                disabled={!canEdit}
                value={settings.aiProvider}
                onChange={(e) => patch({ aiProvider: e.target.value as ContentOpsSettings["aiProvider"] })}
                className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
              >
                <option value="self">ذاتي (دائم التوفر)</option>
                <option value="openai">OpenAI</option>
              </select>
              {provider && (
                <div className={`mt-2 rounded-card border px-3 py-2 text-[10px] ${provider.ready ? "border-success/30 bg-success/5 text-success-fg" : "border-warning/30 bg-warning/5 text-warning-fg"}`}>
                  <p className="font-bold">{provider.ready ? "المزوّد جاهز للاستخدام" : "المزوّد غير مهيأ"}</p>
                  <p className="mt-0.5 leading-relaxed">{provider.messageAr}</p>
                  {!provider.ready && settings.aiProvider === "openai" && (
                    <p className="mt-1 leading-relaxed text-foreground/80">لتهيئة OpenAI: أضف <code className="rounded bg-black/5 px-1">OPENAI_API_KEY</code> أو <code className="rounded bg-black/5 px-1">AI_API_KEY</code> إلى متغيرات بيئة الخادم، ثم أعد تشغيل التطبيق. لا تضع المفتاح في المتصفح أو داخل قاعدة البيانات.</p>
                  )}
                </div>
              )}
            </label>

            <label className="flex items-center justify-between gap-3 rounded-card border border-border/60 px-3 py-2">
              <span className="text-xs font-medium text-foreground">التراجع التلقائي للمحرك الذاتي عند غياب مفتاح OpenAI</span>
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={settings.aiFallbackEnabled}
                onChange={(e) => patch({ aiFallbackEnabled: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-card border border-border/60 px-3 py-2">
              <span className="text-xs font-medium text-foreground">تفعيل السياق الخارجي (لا يتجاوز الحقائق الداخلية أبدًا)</span>
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={settings.externalResearchEnabled}
                onChange={(e) => patch({ externalResearchEnabled: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
            </label>

            <div>
              <span className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Wifi size={12} className="text-accent" />
                حالة القنوات
              </span>
              <p className="mb-2 rounded-card border border-primary/20 bg-primary/5 px-3 py-2 text-[10px] leading-relaxed text-muted">زر «ربط» هنا مخصص لاتصال القناة الفعلي فقط. بعد تهيئة OAuth الرسمية، سيظهر الحساب متصلًا؛ لا يتم اعتبار القناة متصلة لمجرد الضغط على الزر.</p>
              {canEdit && (
                <div className="mb-2 rounded-card border border-border/60 px-3 py-2">
                  <p className="text-[10px] font-bold text-foreground">ربط ميتا (فيسبوك + انستغرام) — رمز حقيقي</p>
                  <p className="mt-0.5 text-[9px] leading-relaxed text-muted">من لوحة تطبيق ميتا: الصق رمز وصول مستخدم بصلاحيات الصفحات، وسيتحقق الخادم منه ويخزنه مشفراً. يتطلب <span dir="ltr">META_APP_ID / META_APP_SECRET / SOCIAL_TOKEN_KEY</span> في بيئة السيرفر.</p>
                  <textarea
                    value={metaToken}
                    onChange={(e) => setMetaToken(e.target.value)}
                    placeholder="الصق رمز الوصول هنا (لا يُعرض بعد الحفظ)"
                    rows={2}
                    dir="ltr"
                    className="mt-1.5 w-full rounded-lg border border-border bg-card px-2 py-1.5 font-mono text-[10px] text-foreground outline-none focus:border-primary"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(["facebook", "instagram"] as const).map((ch) => (
                      <button
                        key={ch}
                        onClick={() => void handleMetaConnect(ch)}
                        disabled={metaBusy !== "idle"}
                        className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
                      >
                        {metaBusy === ch ? "جاري التحقق..." : `تحقق واربط ${ch === "facebook" ? "فيسبوك" : "انستغرام"}`}
                      </button>
                    ))}
                  </div>
                  {(metaInfo.facebook || metaInfo.instagram) && (
                    <div className="mt-1.5 space-y-0.5 text-[9px] text-muted">
                      {metaInfo.facebook && <p>فيسبوك: {metaInfo.facebook.page_name ?? "?"} {metaInfo.facebook.token_expires_at ? `(ينتهي ${metaInfo.facebook.token_expires_at.slice(0, 10)})` : ""}</p>}
                      {metaInfo.instagram && <p>انستغرام: {metaInfo.instagram.ig_username ? `@${metaInfo.instagram.ig_username}` : "?"} عبر {metaInfo.instagram.page_name ?? "?"}</p>}
                    </div>
                  )}
                </div>
              )}
              <ul className="space-y-2">
                {channels.map((ch) => (
                  <li key={ch.channel} className="flex items-center justify-between gap-2 rounded-card border border-border/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${ch.connected ? "bg-success-fg" : "bg-muted"}`} />
                      <span className="text-[10px] font-medium text-foreground">{CHANNEL_LABELS[ch.channel] ?? ch.labelAr}</span>
                      <span className="text-[9px] text-muted">{ch.noteAr}</span>
                    </div>
                    {canEdit && !ch.website && (
                      <button
                        onClick={() => void handleChannelAction(ch.channel, !ch.connected)}
                        className="flex items-center gap-1 text-[9px] text-primary hover:underline"
                      >
                        {ch.connected ? <Unplug size={10} /> : <Plug size={10} />}
                        {ch.connected ? "فصل" : "ربط"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[9px] text-muted">قنوات التواصل الاجتماعي تُربط لاحقًا عند توفر بيانات الاعتماد — لا يُحاكى الربط.</p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
            <Info size={14} className="text-accent" />
            اللغة والهوية
          </h3>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">اللغة الافتراضية</span>
              <select
                disabled={!canEdit}
                value={settings.defaultLanguage}
                onChange={(e) => patch({ defaultLanguage: e.target.value as ContentOpsSettings["defaultLanguage"] })}
                className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">ملف الهوية الصوتية</span>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.brandVoiceProfile}
                onChange={(e) => patch({ brandVoiceProfile: e.target.value })}
                className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">رابط انستغرام</span>
              <input
                type="url"
                disabled={!canEdit}
                value={settings.instagramUrl}
                onChange={(e) => patch({ instagramUrl: e.target.value })}
                placeholder="https://instagram.com/..."
                className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">رابط فيسبوك</span>
              <input
                type="url"
                disabled={!canEdit}
                value={settings.facebookUrl}
                onChange={(e) => patch({ facebookUrl: e.target.value })}
                placeholder="https://facebook.com/..."
                className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">رابط تيك توك</span>
              <input
                type="url"
                disabled={!canEdit}
                value={settings.tiktokUrl}
                onChange={(e) => patch({ tiktokUrl: e.target.value })}
                placeholder="https://tiktok.com/@..."
                className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">رابط يوتيوب</span>
              <input
                type="url"
                disabled={!canEdit}
                value={settings.youtubeUrl}
                onChange={(e) => patch({ youtubeUrl: e.target.value })}
                placeholder="https://youtube.com/..."
                className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
              />
            </label>
          </div>
        </Card>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <Button variant="primary" size="md" loading={busy} onClick={() => { setBusy(true); void handleSave(); }}>
            <Save className="h-4 w-4" />
            حفظ الإعدادات
          </Button>
        </div>
      )}
    </div>
  );
}