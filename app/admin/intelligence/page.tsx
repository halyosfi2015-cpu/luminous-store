"use client";

import { useEffect, useState } from "react";
import { useAdminGuard } from "@/src/admin/useAdminGuard";

interface CommandDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const COMMANDS: CommandDef[] = [
  { id: "generate_ideas", label: "توليد أفضل الأفكار", icon: "✨", color: "bg-blue-600 hover:bg-blue-700", description: "أفكار وأولويات عمل من بيانات المتجر الحقيقية" },
  { id: "generate_content", label: "إنشاء محتوى", icon: "📝", color: "bg-green-600 hover:bg-green-700", description: "توليد محتوى تسويقي من الحقائق الموثقة" },
  { id: "create_campaign", label: "إنشاء حملة", icon: "📣", color: "bg-purple-600 hover:bg-purple-700", description: "حملة تسويقية مبنية على منتجات حقيقية" },
  { id: "inventory_check", label: "فحص المخزون", icon: "📦", color: "bg-indigo-600 hover:bg-indigo-700", description: "تحليل واقعي لحالة المخزون" },
  { id: "attention", label: "ماذا يحتاج انتباهي؟", icon: "🚨", color: "bg-red-600 hover:bg-red-700", description: "تنبيهات حرجة تحتاج إجراءً" },
  { id: "sales_analysis", label: "تحليل المبيعات", icon: "💰", color: "bg-yellow-600 hover:bg-yellow-700", description: "ملخص مبيعات شامل من الطلبات" },
  { id: "find_opportunities", label: "اكتشاف الفرص", icon: "🎯", color: "bg-teal-600 hover:bg-teal-700", description: "فرص نمو مكتشفة من البيانات" },
  { id: "daily_report", label: "تقرير اليوم", icon: "📊", color: "bg-orange-600 hover:bg-orange-700", description: "ملخص يومي من بيانات اليوم" },
  { id: "run_recommendations", label: "تشغيل التوصيات", icon: "⚡", color: "bg-slate-700 hover:bg-slate-800", description: "توصيات إعادة طلب وتنبيهات" },
];

interface CommandResult {
  command: string;
  success: boolean;
  data: unknown;
  error: string | null;
}

interface HybridProviderStatus {
  version?: string;
  selected: string;
  effective: string;
  fallbackUsed: boolean;
  openaiConfigured: boolean;
  selfAvailable: boolean;
  ready: boolean;
  messageAr: string;
  messageEn?: string;
}

interface ChannelStatus {
  channel: string;
  labelAr: string;
  enabled: boolean;
  connected: boolean;
  website: boolean;
  noteAr: string;
}

interface ResultAction {
  id: string;
  label: string;
  kind: "navigate" | "command";
  href?: string;
  command?: string;
  tone?: string;
}

interface InsightRow {
  title?: string;
  description?: string;
}

interface RecommendationRow {
  action?: string;
  rationale?: string;
}

interface DataSourceRow {
  label?: string;
}

interface AnalysisData {
  summary?: string;
  answer?: string;
  insights?: InsightRow[];
  recommendations?: RecommendationRow[];
  confidence?: string;
  dataSources?: DataSourceRow[];
}

interface ContentItem {
  id?: string;
  contentType?: string;
  title?: string;
  body?: string;
  callToAction?: string | null;
  productIds?: string[];
}

interface ContentOpsItem {
  id?: string;
  status?: string;
  item?: ContentItem;
}

interface CampaignData {
  id?: string;
  name?: string;
  status?: string;
  objective?: string;
  startAt?: string;
  endAt?: string;
  channels?: string[];
  productIds?: string[];
  contentTypes?: string[];
}

interface InventoryRow {
  productId?: string;
  nameAr?: string;
  currentStock?: number;
  statusLabelAr?: string;
  coverageDays?: number | null;
}

interface InventoryData {
  totalProducts?: number;
  movementCount?: number;
  hasOrderData?: boolean;
  outOfStock?: InventoryRow[];
  lowStock?: InventoryRow[];
  atRisk?: InventoryRow[];
  deadStock?: InventoryRow[];
  normal?: InventoryRow[];
}

interface AttentionItem {
  code?: string;
  labelAr?: string;
  count?: number;
  severity?: string;
}

interface AnomalyRow {
  severity?: string;
  messageAr?: string;
}

interface FindingRow {
  title?: string;
  description?: string;
  severity?: string;
}

interface SalesSummaryData {
  hasOrders?: boolean;
  orderCount?: number;
  netSalesYER?: number;
  grossSalesYER?: number;
  averageOrderValueYER?: number | "insufficient_data";
}

interface ProductSalesRow {
  productId?: string;
  units?: number;
  revenueYER?: number;
}

interface OpportunityRow {
  titleAr?: string;
  descriptionAr?: string;
  kind?: string;
  commercialValueYER?: number | null;
  confidence?: number;
  actionLabelAr?: string | null;
  actionRoute?: string | null;
}

interface BriefingFacts {
  orderCountToday?: number;
  netSalesYER?: number;
  outOfStockCount?: number;
  opportunityCount?: number;
  nearOutOfStock?: string[];
  attentionProducts?: string[];
}

interface BriefingData {
  facts?: BriefingFacts | null;
  aiCommentary?: string | null;
}

interface ReorderRec {
  productId?: string;
  nameAr?: string;
  currentStock?: number;
  reasonAr?: string;
  suggestedQuantity?: number;
  status?: string;
}

interface DataAvailability {
  hasData?: boolean;
  noteAr?: string;
}

interface IntelResultData {
  analysis?: AnalysisData | null;
  content?: ContentOpsItem | null;
  contentId?: string;
  itemStatus?: string;
  campaign?: CampaignData | null;
  campaignId?: string;
  ideas?: Array<{ title?: string }>;
  inventory?: InventoryData | null;
  attention?: AttentionItem[];
  anomalies?: AnomalyRow[];
  findings?: FindingRow[];
  customerSignals?: { status?: string; noteAr?: string; signals?: Array<{ id: string; severityAr: string; title: string; evidence: string; confidence: string; confidenceNoteAr: string }> };
  summary?: SalesSummaryData | null;
  byProduct?: ProductSalesRow[];
  opportunities?: OpportunityRow[];
  briefing?: BriefingData | null;
  recommendations?: ReorderRec[];
  alertsGenerated?: number;
  actions?: ResultAction[];
  executionId?: string;
  auditReference?: string | null;
  dataAvailability?: DataAvailability | null;
}

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "danger" | "primary" | "success" | "neutral";
  onConfirm: () => void;
}

interface ContentModalState {
  mode: "edit" | "schedule" | "reschedule";
  id: string;
  title?: string;
  body?: string;
  callToAction?: string | null;
  scheduledFor?: string;
}

const fmtYER = (n: number | null | undefined): string =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : `${n.toLocaleString("en-US")} د.ي`;

function severityColor(severity?: string): string {
  switch (severity) {
    case "critical": return "bg-red-100 text-red-800 border-red-200";
    case "high": return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default: return "bg-blue-100 text-blue-800 border-blue-200";
  }
}

const ACTION_TONES: Record<string, string> = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  success: "bg-green-600 hover:bg-green-700 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  neutral: "bg-gray-600 hover:bg-gray-700 text-white",
};

const CONTENT_STATUS: Record<string, { ar: string; cls: string }> = {
  GENERATED: { ar: "تم الإنشاء", cls: "bg-gray-100 text-gray-700" },
  VALIDATING: { ar: "جارٍ التحقق", cls: "bg-blue-100 text-blue-700" },
  REVIEW_REQUIRED: { ar: "بانتظار المراجعة", cls: "bg-yellow-100 text-yellow-700" },
  APPROVED: { ar: "معتمد", cls: "bg-green-100 text-green-700" },
  SCHEDULED: { ar: "مجدول", cls: "bg-indigo-100 text-indigo-700" },
  PUBLISHING: { ar: "جارٍ النشر", cls: "bg-blue-100 text-blue-700" },
  PUBLISHED: { ar: "منشور", cls: "bg-emerald-100 text-emerald-700" },
  ARCHIVED: { ar: "مؤرشف", cls: "bg-gray-200 text-gray-600" },
  VALIDATION_FAILED: { ar: "فشل التحقق", cls: "bg-red-100 text-red-700" },
  PUBLISH_FAILED: { ar: "فشل النشر", cls: "bg-red-100 text-red-700" },
  CANCELLED: { ar: "ملغى", cls: "bg-gray-200 text-gray-600" },
};

const REORDER_STATUS: Record<string, { ar: string; cls: string }> = {
  open: { ar: "مفتوحة", cls: "bg-yellow-100 text-yellow-700" },
  acknowledged: { ar: "تمت المتابعة", cls: "bg-blue-100 text-blue-700" },
  executed: { ar: "منفذة", cls: "bg-green-100 text-green-700" },
  dismissed: { ar: "تم تجاهلها", cls: "bg-gray-100 text-gray-500" },
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-800 mb-3 text-sm">{title}</h3>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-gray-700">
      <span className="font-medium text-yellow-800">لا توجد بيانات كافية: </span>
      {message}
    </div>
  );
}

type Json = Record<string, unknown>;

async function postJson(path: string, body: Json): Promise<{ ok: boolean; data: Json | null; error?: string }> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, data: null, error: ((json as Json | null)?.error as { message?: string } | undefined)?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, data: (json ?? {}) as Json };
  } catch (e) {
    return { ok: false, data: null, error: (e as Error).message };
  }
}

async function getContentItem(id: string): Promise<ContentOpsItem | null> {
  try {
    const res = await fetch(`/api/admin/content?action=item&id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.item ?? null) as ContentOpsItem | null;
  } catch {
    return null;
  }
}

export default function IntelligenceCenter() {
  const { allowed } = useAdminGuard("dashboard");
  const [providerStatus, setProviderStatus] = useState<HybridProviderStatus | null>(null);
  const [openaiEnv, setOpenaiEnv] = useState<{ configured: boolean; model: string } | null>(null);
  const [channels, setChannels] = useState<ChannelStatus[]>([]);
  const [activeCommand, setActiveCommand] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CommandResult | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [contentModal, setContentModal] = useState<ContentModalState | null>(null);
  const [openaiPanel, setOpenaiPanel] = useState(false);

  const fetchApi = async (command: string, body?: Json) => {
    const res = await fetch("/api/admin/intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, ...body }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(((json as Json | null)?.error as { message?: string } | undefined)?.message ?? `HTTP ${res.status}`);
    }
    return json;
  };

  const refreshStatus = () => {
    fetch("/api/admin/intelligence")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const data = d as Json | null;
        if (data?.provider) setProviderStatus(data.provider as HybridProviderStatus);
        if (data?.openaiEnv) setOpenaiEnv(data.openaiEnv as { configured: boolean; model: string });
        if (Array.isArray(data?.channels)) setChannels(data.channels as ChannelStatus[]);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const currentData = (): IntelResultData => (result?.data ?? {}) as IntelResultData;

  const executeCommand = async (command: string) => {
    setActiveCommand(command);
    setRunning(true);
    setResult(null);
    setNotice(null);
    try {
      const data = await fetchApi(command);
      setResult({ command, success: true, data, error: null });
    } catch (e) {
      setResult({ command, success: false, data: null, error: (e as Error).message });
    } finally {
      setRunning(false);
    }
  };

  const switchProvider = async (provider: "self" | "openai") => {
    const res = await postJson("/api/admin/intelligence", { command: "set_provider", provider });
    if (!res.ok || !res.data) {
      setNotice({ kind: "error", text: res.error ?? "فشل تبديل المزود" });
      return;
    }
    const data = res.data;
    if (data.provider) setProviderStatus(data.provider as HybridProviderStatus);
    if (data.openaiEnv) setOpenaiEnv(data.openaiEnv as { configured: boolean; model: string });
    const da = data.dataAvailability as DataAvailability | undefined;
    const st = data.provider as HybridProviderStatus | undefined;
    setNotice({ kind: "success", text: da?.noteAr ?? st?.messageAr ?? "تم تبديل المزود" });
  };

  const connectChannel = async (channel: string) => {
    const res = await postJson("/api/admin/content", { action: "connect-channel", channel });
    if (!res.ok) {
      setNotice({ kind: "error", text: res.error ?? "فشل ربط القناة" });
      return;
    }
    const ch = res.data?.channels;
    if (Array.isArray(ch)) setChannels(ch as ChannelStatus[]);
    setNotice({ kind: "success", text: "تم ربط القناة" });
  };

  const disconnectChannel = async (channel: string) => {
    const res = await postJson("/api/admin/content", { action: "disconnect-channel", channel });
    if (!res.ok) {
      setNotice({ kind: "error", text: res.error ?? "فشل فصل القناة" });
      return;
    }
    const ch = res.data?.channels;
    if (Array.isArray(ch)) setChannels(ch as ChannelStatus[]);
    setNotice({ kind: "success", text: "تم فصل القناة" });
  };

  const lifecycleAction = async (action: string, extra: Json, label: string) => {
    const contentId = currentData().contentId;
    if (!contentId) {
      setNotice({ kind: "error", text: "لا يوجد محتوى مرتبط لهذه العملية" });
      return;
    }
    setRunning(true);
    const res = await postJson("/api/admin/content", { action, id: contentId, ...extra });
    setRunning(false);
    if (!res.ok) {
      setNotice({ kind: "error", text: `فشل ${label}: ${res.error ?? "خطأ غير معروف"}` });
      return;
    }
    const fresh = (res.data?.item as ContentOpsItem | null) ?? (await getContentItem(contentId));
    if (fresh) {
      setResult((prev) =>
        prev ? { ...prev, data: { ...(prev.data as object), content: fresh, contentId, itemStatus: fresh.status } } : prev
      );
    }
    setContentModal(null);
    setNotice({ kind: "success", text: `تم ${label} بنجاح` });
  };

  const campaignAction = async (status: string, label: string) => {
    const campaignId = currentData().campaignId;
    if (!campaignId) {
      setNotice({ kind: "error", text: "لا توجد حملة مرتبطة لهذه العملية" });
      return;
    }
    setRunning(true);
    const res = await postJson("/api/admin/content", { action: "campaign-status", id: campaignId, status });
    setRunning(false);
    if (!res.ok) {
      setNotice({ kind: "error", text: `فشل ${label}: ${res.error ?? "خطأ غير معروف"}` });
      return;
    }
    const freshCampaign = res.data?.campaign as CampaignData | undefined;
    if (freshCampaign) {
      setResult((prev) =>
        prev ? { ...prev, data: { ...(prev.data as object), campaign: freshCampaign, campaignId, campaignStatus: freshCampaign.status } } : prev
      );
    }
    setNotice({ kind: "success", text: `تم ${label} بنجاح` });
  };

  const reorderAction = async (productId: string, actionType: "execute" | "acknowledge" | "dismiss", suggestedQuantity: number) => {
    const doIt = async () => {
      const res = await postJson("/api/admin/store-ops", { action: "reorder-action", productId, actionType });
      setConfirmState(null);
      if (!res.ok) {
        setNotice({ kind: "error", text: res.error ?? "فشل إجراء التوصية" });
        return;
      }
      const msgs: Record<string, string> = {
        execute: "تم تنفيذ إعادة الطلب وتسجيله في سجل التدقيق",
        acknowledge: "تمت متابعة التوصية",
        dismiss: "تم تجاهل التوصية",
      };
      await executeCommand("run_recommendations");
      setNotice({ kind: "success", text: msgs[actionType] });
    };
    if (actionType === "execute") {
      setConfirmState({
        title: "تنفيذ إعادة الطلب",
        message: `سيتم تسجيل طلب إعادة ${suggestedQuantity} وحدة من هذا المنتج واعتماد القرار في سجل التدقيق. هذا الإجراء لا يمكن التراجع عنه تلقائياً.`,
        confirmLabel: "تنفيذ إعادة الطلب",
        tone: "danger",
        onConfirm: doIt,
      });
      return;
    }
    await doIt();
  };

  const actionBar = (actions?: ResultAction[]) => {
    if (!Array.isArray(actions) || actions.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-4">
        {actions.map((a) => {
          const cls = ACTION_TONES[a.tone ?? "primary"] ?? ACTION_TONES.primary;
          return (
            <button
              key={a.id}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${cls}`}
              onClick={() => {
                if (a.kind === "navigate" && a.href) window.location.href = a.href;
                else if (a.kind === "command" && a.command) executeCommand(a.command);
              }}
            >
              {a.label}
            </button>
          );
        })}
      </div>
    );
  };

  const activeLabel = COMMANDS.find((c) => c.id === activeCommand)?.label ?? "";

  const renderContentLifecycle = (contentId: string, status: string) => {
    const current = currentData();
    const canEdit = ["GENERATED", "VALIDATING", "REVIEW_REQUIRED", "VALIDATION_FAILED"].includes(status);
    const canReview = ["GENERATED", "VALIDATING", "REVIEW_REQUIRED", "VALIDATION_FAILED"].includes(status);
    const canApprove = ["GENERATED", "VALIDATING", "REVIEW_REQUIRED", "VALIDATION_FAILED"].includes(status);
    const canSchedule = status === "APPROVED";
    const canPublish = ["APPROVED", "SCHEDULED"].includes(status);
    const canArchive = !["ARCHIVED", "CANCELLED"].includes(status);
    const canRegenerate = !["PUBLISHED", "ARCHIVED", "CANCELLED"].includes(status);
    const btn = "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors";
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {canEdit && (
          <button
            className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`}
            onClick={() =>
              setContentModal({
                mode: "edit",
                id: contentId,
                title: current.content?.item?.title ?? "",
                body: current.content?.item?.body ?? "",
                callToAction: current.content?.item?.callToAction ?? null,
              })
            }
          >
            ✏️ تعديل
          </button>
        )}
        {canRegenerate && (
          <button className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`} onClick={() => lifecycleAction("regenerate", {}, "إعادة التوليد")}>
            🔄 إعادة توليد
          </button>
        )}
        {canReview && (
          <button className={`${btn} bg-blue-50 text-blue-700 hover:bg-blue-100`} onClick={() => lifecycleAction("revalidate", {}, "إرسال للمراجعة")}>
            📋 إرسال للمراجعة
          </button>
        )}
        {canApprove && (
          <button
            className={`${btn} bg-green-600 text-white hover:bg-green-700`}
            onClick={() =>
              setConfirmState({
                title: "اعتماد المحتوى",
                message: "سيتم اعتماد هذا المحتوى بعد اجتياز التحقق. سيُسجل القرار في سجل التدقيق.",
                confirmLabel: "اعتماد",
                tone: "success",
                onConfirm: () => lifecycleAction("approve", {}, "الاعتماد"),
              })
            }
          >
            ✅ اعتماد
          </button>
        )}
        {canSchedule && (
          <button
            className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}
            onClick={() => setContentModal({ mode: "schedule", id: contentId })}
          >
            🗓️ جدولة
          </button>
        )}
        {status === "SCHEDULED" && (
          <>
            <button className={`${btn} bg-indigo-50 text-indigo-700 hover:bg-indigo-100`} onClick={() => setContentModal({ mode: "reschedule", id: contentId })}>
              📅 إعادة جدولة
            </button>
            <button
              className={`${btn} bg-red-50 text-red-700 hover:bg-red-100`}
              onClick={() =>
                setConfirmState({
                  title: "إلغاء الجدولة",
                  message: "سيتم إلغاء الجدولة الحالية لهذا المحتوى.",
                  confirmLabel: "إلغاء الجدولة",
                  tone: "danger",
                  onConfirm: () => lifecycleAction("cancel-schedule", {}, "إلغاء الجدولة"),
                })
              }
            >
              ❌ إلغاء الجدولة
            </button>
          </>
        )}
        {canPublish && (
          <button
            className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
            onClick={() =>
              setConfirmState({
                title: "نشر المحتوى الآن",
                message: "سيتم نشر هذا المحتوى المعتمد إلى القنوات المفعّلة. لا يمكن التراجع عن النشر دون أرشفة.",
                confirmLabel: "نشر الآن",
                tone: "success",
                onConfirm: () => lifecycleAction("publish", { channel: "website" }, "النشر"),
              })
            }
          >
            🚀 نشر الآن
          </button>
        )}
        {canArchive && (
          <button
            className={`${btn} bg-gray-100 text-gray-500 hover:bg-gray-200`}
            onClick={() =>
              setConfirmState({
                title: "أرشفة المحتوى",
                message: "سيتم نقل المحتوى إلى الأرشيف.",
                confirmLabel: "أرشفة",
                tone: "neutral",
                onConfirm: () => lifecycleAction("set-status", { status: "ARCHIVED" }, "الأرشفة"),
              })
            }
          >
            🗄️ أرشفة
          </button>
        )}
      </div>
    );
  };

  const renderCampaignLifecycle = (campaign: CampaignData) => {
    const status = campaign.status;
    const btn = "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors";
    const setStatus = (next: string, label: string, needsConfirm: boolean, message: string) => {
      const doIt = () => campaignAction(next, label);
      if (needsConfirm) {
        setConfirmState({ title: label, message, confirmLabel: label, tone: "danger", onConfirm: doIt });
      } else {
        doIt();
      }
    };
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {(status === "draft" || status === "scheduled") && (
          <button className={`${btn} bg-green-600 text-white hover:bg-green-700`} onClick={() => setStatus("running", "تشغيل الحملة", true, "ستبدأ الحملة الآن على القنوات المفعّلة.")}>
            🚀 تشغيل الحملة
          </button>
        )}
        {status === "running" && (
          <button className={`${btn} bg-yellow-600 text-white hover:bg-yellow-700`} onClick={() => setStatus("paused", "إيقاف مؤقت", false, "")}>
            ⏸️ إيقاف مؤقت
          </button>
        )}
        {(status === "paused" || status === "scheduled") && (
          <button className={`${btn} bg-green-600 text-white hover:bg-green-700`} onClick={() => setStatus("running", "استئناف الحملة", true, "ستستأنف الحملة نشاطها.")}>
            ▶️ استئناف
          </button>
        )}
        {status === "running" && (
          <button className={`${btn} bg-green-600 text-white hover:bg-green-700`} onClick={() => setStatus("completed", "إنهاء الحملة", true, "سيتم إنهاء الحملة واعتمادها في السجل.")}>
            ✅ إنهاء
          </button>
        )}
        {!["completed", "cancelled"].includes(status ?? "") && (
          <button className={`${btn} bg-red-50 text-red-700 hover:bg-red-100`} onClick={() => setStatus("cancelled", "إلغاء الحملة", true, "سيتم إلغاء الحملة نهائياً.")}>
            🗑️ إلغاء
          </button>
        )}
      </div>
    );
  };

  const renderResult = (): React.ReactNode => {
    if (!result) return null;
    if (!result.success) {
      return (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-sm text-red-800">
          <p className="font-semibold mb-1">خطأ حقيقي في التنفيذ</p>
          <p>{result.error}</p>
        </div>
      );
    }

    const { command } = result;
    const d = currentData();

    const renderMeta = (): React.ReactNode => {
      const da = d.dataAvailability;
      const meta: Array<[string, string | null]> = [
        ["رقم التنفيذ", d.executionId ?? null],
        ["مرجع التدقيق", d.auditReference ?? null],
        ["توفر البيانات", da?.hasData ? (da.noteAr ?? "متوفر") : (da?.noteAr ?? "غير متوفر")],
      ];
      return (
        <div className="flex flex-wrap gap-2 mb-3 text-[11px]">
          {meta.map(([k, v]) => v ? (
            <span key={k} className="px-2 py-1 rounded bg-gray-100 text-gray-500">{k}: <span className="font-medium text-gray-700">{v}</span></span>
          ) : null)}
        </div>
      );
    };

    switch (command) {
      case "generate_ideas": {
        const analysis = d.analysis;
        if (!analysis) return <EmptyState message="المحلل الذكي لم يرجع تحليلاً. تأكد من تفعيل التحليل الذكي في إعدادات المتجر." />;
        return (
          <div className="space-y-4">
            {renderMeta()}
            <Card title="الملخص">
              <p className="text-sm text-gray-700">{analysis.summary || analysis.answer}</p>
            </Card>
            {Array.isArray(analysis.insights) && analysis.insights.length > 0 && (
              <Card title="الرؤى">
                <ul className="space-y-2">
                  {analysis.insights.map((ins, i) => (
                    <li key={i} className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">{ins.title}: </span>
                      {ins.description}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
              <Card title="الأفكار والتوصيات">
                <ul className="space-y-2">
                  {analysis.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-600 mt-0.5">●</span>
                      <div>
                        <p className="font-medium text-gray-900">{r.action}</p>
                        {r.rationale && <p className="text-gray-500 text-xs">{r.rationale}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {analysis.confidence && (
              <p className="text-xs text-gray-500">مستوى الثقة: {analysis.confidence} — المصادر: {Array.isArray(analysis.dataSources) ? analysis.dataSources.map((s) => s.label).join("، ") : ""}</p>
            )}
            {actionBar(d.actions)}
          </div>
        );
      }

      case "generate_content": {
        const item = d.content?.item;
        const contentId = d.contentId ?? d.content?.id;
        const status = d.itemStatus ?? d.content?.status;
        if (!item) return <EmptyState message="لم يتم توليد محتوى. لا توجد منتجات منشورة مؤهلة بصور وحقائق موثقة." />;
        return (
          <div className="space-y-4">
            {renderMeta()}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${CONTENT_STATUS[status ?? ""]?.cls ?? "bg-gray-100 text-gray-700"}`}>
                {CONTENT_STATUS[status ?? ""]?.ar ?? status}
              </span>
              <span className="text-xs text-gray-500">{item.contentType}</span>
            </div>
            {item.title && <Card title="العنوان"><p className="text-base font-semibold text-gray-900">{item.title}</p></Card>}
            <Card title="المحتوى">
              <p className="text-sm text-gray-700 whitespace-pre-line">{item.body}</p>
            </Card>
            {item.callToAction && <Card title="دعوة لاتخاذ إجراء"><p className="text-sm font-medium text-blue-700">{item.callToAction}</p></Card>}
            {Array.isArray(item.productIds) && item.productIds.length > 0 && (
              <p className="text-xs text-gray-500">المنتجات المستهدفة: {item.productIds.length} منتج</p>
            )}
            {contentId && status && renderContentLifecycle(contentId, status)}
            {actionBar(d.actions)}
          </div>
        );
      }

      case "create_campaign": {
        const campaign = d.campaign;
        if (!campaign) return <EmptyState message="لم يتم إنشاء حملة. لا توجد منتجات مؤهلة لحملة تسويقية." />;
        return (
          <div className="space-y-4">
            {renderMeta()}
            <Card title="الحملة المنشأة">
              <div className="space-y-2 text-sm">
                <p><span className="font-medium text-gray-900">الاسم: </span>{campaign.name}</p>
                <p><span className="font-medium text-gray-900">الحالة: </span>
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">{campaign.status}</span>
                </p>
                <p><span className="font-medium text-gray-900">الهدف: </span>{campaign.objective}</p>
                <p><span className="font-medium text-gray-900">البداية: </span>{campaign.startAt?.slice(0, 10)} — <span className="font-medium text-gray-900">النهاية: </span>{campaign.endAt?.slice(0, 10)}</p>
                <p><span className="font-medium text-gray-900">القنوات: </span>{Array.isArray(campaign.channels) ? campaign.channels.join("، ") : "—"}</p>
                <p><span className="font-medium text-gray-900">المنتجات: </span>{campaign.productIds?.length ?? 0} منتج | <span className="font-medium text-gray-900">أنواع المحتوى: </span>{Array.isArray(campaign.contentTypes) ? campaign.contentTypes.join("، ") : "—"}</p>
              </div>
            </Card>
            {renderCampaignLifecycle(campaign)}
            {Array.isArray(d.ideas) && d.ideas.length > 1 && (
              <Card title="أفكار حملات إضافية">
                <ul className="space-y-1">
                  {d.ideas.slice(1).map((idea, i) => (
                    <li key={i} className="text-sm text-gray-600">• {idea.title}</li>
                  ))}
                </ul>
              </Card>
            )}
            {actionBar(d.actions)}
          </div>
        );
      }

      case "inventory_check": {
        const inv = d.inventory;
        if (!inv || inv.totalProducts === 0) return <EmptyState message="لا توجد بيانات مخزون متاحة." />;
        const rows = (list?: InventoryRow[]): InventoryRow[] => list ?? [];
        const actionable = [...rows(inv.outOfStock), ...rows(inv.lowStock), ...rows(inv.atRisk)];
        return (
          <div className="space-y-4">
            {renderMeta()}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "إجمالي المنتجات", value: inv.totalProducts, color: "text-gray-900" },
                { label: "نفد المخزون", value: rows(inv.outOfStock).length, color: "text-red-600" },
                { label: "منخفض المخزون", value: rows(inv.lowStock).length, color: "text-yellow-600" },
                { label: "معرض للخطر", value: rows(inv.atRisk).length, color: "text-orange-600" },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            {actionable.length > 0 && (
              <Card title="منتجات تحتاج إعادة طلب">
                <ul className="space-y-2">
                  {actionable.map((it, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 border-b border-gray-50 pb-1">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{it.nameAr ?? it.productId}</p>
                        <p className="text-xs text-gray-500">{it.statusLabelAr} — {it.coverageDays !== null && it.coverageDays !== undefined ? `تغطية ${it.coverageDays} يوم` : "بدون تغطية"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-bold ${(it.currentStock ?? 0) <= 0 ? "text-red-600" : "text-yellow-600"}`}>{it.currentStock}</span>
                        <a className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200" href="/admin/store-ops/products">عرض</a>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {rows(inv.deadStock).length > 0 && (
              <Card title="مخزون راكد (بلا حركة)">
                <p className="text-sm text-gray-600">{rows(inv.deadStock).map((it) => it.nameAr ?? it.productId).join("، ")}</p>
              </Card>
            )}
            {actionBar(d.actions)}
          </div>
        );
      }

      case "attention": {
        const attention = d.attention ?? [];
        const anomalies = d.anomalies ?? [];
        const findings = d.findings ?? [];
        const customerSignals = d.customerSignals as { status?: string; noteAr?: string; signals?: Array<{ id: string; severityAr: string; title: string; evidence: string; confidence: string; confidenceNoteAr: string }> } | undefined;
        if (attention.length === 0 && anomalies.length === 0 && (findings.length === 0 || !findings)) {
          return (
            <div className="space-y-4">
              {renderMeta()}
              <EmptyState message="لا توجد تنبيهات تحتاج انتباهك حاليًا." />
              {actionBar(d.actions)}
            </div>
          );
        }
        return (
          <div className="space-y-4">
            {renderMeta()}
            {findings.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {findings.map((f, i) => (
                  <div key={i} className={`px-4 py-3 rounded-lg border ${severityColor(f.severity)}`}>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-xs mt-0.5 opacity-80">{f.description}</p>
                  </div>
                ))}
              </div>
            )}
            {customerSignals && (
              <Card title="إشارات العملاء">
                {customerSignals.status === "insufficient_data" ? (
                  <p className="text-xs text-muted">{customerSignals.noteAr}</p>
                ) : customerSignals.signals && customerSignals.signals.length > 0 ? (
                  <ul className="space-y-2">
                    {customerSignals.signals.map((s) => (
                      <li key={s.id} className="px-3 py-2 rounded-lg border border-border bg-card/60">
                        <p className="text-sm font-medium"><span className="mr-1">{s.severityAr}</span>{s.title}</p>
                        <p className="text-xs text-muted mt-0.5">الدليل: {s.evidence} — الثقة: {s.confidence} ({s.confidenceNoteAr})</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted">لا توجد إشارات عملاء حاليًا.</p>
                )}
              </Card>
            )}
            {attention.length > 0 && (
              <Card title="ما يحتاج انتباهك">
                <ul className="space-y-2">
                  {attention.map((a, i) => (
                    <li key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${severityColor(a.severity)}`}>
                      <span className="text-sm font-medium">{a.labelAr}</span>
                      <span className="text-sm font-bold">{a.count}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {anomalies.length > 0 && (
              <Card title="الشذوذ المكتشف">
                <ul className="space-y-2">
                  {anomalies.map((a, i) => (
                    <li key={i} className="text-sm text-gray-700">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${severityColor(a.severity)}`}>{a.severity}</span>
                      {a.messageAr}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {actionBar(d.actions)}
          </div>
        );
      }

      case "sales_analysis": {
        const summary = d.summary;
        if (!summary || summary.hasOrders === false) {
          return (
            <div className="space-y-4">
              {renderMeta()}
              <EmptyState message="لا توجد طلبات مسجلة لتحليل المبيعات." />
              {actionBar(d.actions)}
            </div>
          );
        }
        const top = Array.isArray(d.byProduct) ? d.byProduct.slice(0, 5) : [];
        return (
          <div className="space-y-4">
            {renderMeta()}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "إجمالي الطلبات", value: summary.orderCount, color: "text-gray-900" },
                { label: "صافي المبيعات", value: fmtYER(summary.netSalesYER), color: "text-green-600" },
                { label: "إجمالي المبيعات", value: fmtYER(summary.grossSalesYER), color: "text-blue-600" },
                { label: "متوسط قيمة الطلب", value: summary.averageOrderValueYER === "insufficient_data" ? "—" : fmtYER(summary.averageOrderValueYER), color: "text-purple-600" },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            {top.length > 0 && (
              <Card title="أفضل المنتجات مبيعاً">
                <ul className="space-y-2">
                  {top.map((p, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-sm border-b border-gray-50 pb-1">
                      <span className="text-gray-700">{p.productId}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-medium text-gray-900">{p.units} وحدة / {fmtYER(p.revenueYER)}</span>
                        <a className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200" href="/admin/store-ops/products">عرض</a>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {actionBar(d.actions)}
          </div>
        );
      }

      case "find_opportunities": {
        const opportunities = d.opportunities ?? [];
        if (opportunities.length === 0) {
          return (
            <div className="space-y-4">
              {renderMeta()}
              <EmptyState message="لا توجد فرص مكتشفة حالياً." />
              {actionBar(d.actions)}
            </div>
          );
        }
        return (
          <div className="space-y-3">
            {renderMeta()}
            {opportunities.map((o, i) => (
              <div key={i} className="bg-teal-50/50 border border-teal-100 p-4 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{o.titleAr}</h4>
                    {o.descriptionAr && <p className="text-sm text-gray-600 mt-1">{o.descriptionAr}</p>}
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800">{o.kind}</span>
                      {o.commercialValueYER !== null && o.commercialValueYER !== undefined && (
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">قيمة تقريبية: {fmtYER(o.commercialValueYER)}</span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">ثقة {Math.round((o.confidence ?? 0) * 100)}%</span>
                    </div>
                  </div>
                  {o.actionLabelAr && (
                    <button
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition-colors"
                      onClick={() => { if (o.actionRoute) window.location.href = o.actionRoute; }}
                    >
                      {o.actionLabelAr}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {actionBar(d.actions)}
          </div>
        );
      }

      case "daily_report": {
        const briefing = d.briefing;
        if (!briefing || !briefing.facts) {
          return (
            <div className="space-y-4">
              {renderMeta()}
              <EmptyState message="لا يوجد تقرير يومي متاح." />
              {actionBar(d.actions)}
            </div>
          );
        }
        const f = briefing.facts;
        return (
          <div className="space-y-4">
            {renderMeta()}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "طلبات اليوم", value: f.orderCountToday ?? 0, color: "text-gray-900" },
                { label: "مبيعات اليوم", value: fmtYER(f.netSalesYER), color: "text-green-600" },
                { label: "خارج المخزون", value: f.outOfStockCount ?? 0, color: "text-red-600" },
                { label: "فرص مكتشفة", value: f.opportunityCount ?? 0, color: "text-teal-600" },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            {Array.isArray(f.nearOutOfStock) && f.nearOutOfStock.length > 0 && (
              <Card title="قريب من النفاد">
                <p className="text-sm text-gray-600">{f.nearOutOfStock.join("، ")}</p>
              </Card>
            )}
            {Array.isArray(f.attentionProducts) && f.attentionProducts.length > 0 && (
              <Card title="منتجات تحتاج انتباه اليوم">
                <p className="text-sm text-gray-600">{f.attentionProducts.join("، ")}</p>
              </Card>
            )}
            {briefing.aiCommentary && (
              <Card title="التعليق الذكي">
                <p className="text-sm text-gray-700">{briefing.aiCommentary}</p>
              </Card>
            )}
            {actionBar(d.actions)}
          </div>
        );
      }

      case "run_recommendations": {
        const recs = d.recommendations ?? [];
        const alertsGenerated = d.alertsGenerated ?? 0;
        if (recs.length === 0 && alertsGenerated === 0) {
          return (
            <div className="space-y-4">
              {renderMeta()}
              <EmptyState message="لا توجد توصيات إعادة طلب أو تنبيهات جديدة." />
              {actionBar(d.actions)}
            </div>
          );
        }
        return (
          <div className="space-y-4">
            {renderMeta()}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-500">توصيات إعادة الطلب</p>
                <p className="text-2xl font-bold text-blue-600">{recs.length}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-500">تنبيهات تم إنشاؤها</p>
                <p className="text-2xl font-bold text-red-600">{alertsGenerated}</p>
              </div>
            </div>
            {recs.length > 0 && (
              <Card title="توصيات إعادة الطلب — مراجعة وتنفيذ">
                <ul className="space-y-2">
                  {recs.map((r, i) => {
                    const st = REORDER_STATUS[r.status ?? "open"] ?? { ar: r.status ?? "مفتوحة", cls: "bg-gray-100 text-gray-500" };
                    const actionable = r.status !== "executed" && r.status !== "dismissed";
                    return (
                      <li key={i} className="border-b border-gray-50 pb-2">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{r.nameAr ?? r.productId}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              المخزون الحالي {r.currentStock} — {r.reasonAr}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${st.cls}`}>{st.ar}</span>
                            <span className="text-sm font-bold text-blue-700">{r.suggestedQuantity} وحدة</span>
                          </div>
                        </div>
                        {actionable && r.productId && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            <button
                              className="px-2.5 py-1 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
                              onClick={() => reorderAction(r.productId!, "execute", r.suggestedQuantity ?? 0)}
                            >
                              ✅ تنفيذ إعادة الطلب
                            </button>
                            <button
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                              onClick={() => reorderAction(r.productId!, "acknowledge", r.suggestedQuantity ?? 0)}
                            >
                              👁️ متابعة
                            </button>
                            <button
                              className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium hover:bg-gray-200 transition-colors"
                              onClick={() => reorderAction(r.productId!, "dismiss", r.suggestedQuantity ?? 0)}
                            >
                              🗑️ تجاهل
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
            {actionBar(d.actions)}
          </div>
        );
      }

      default:
        return <EmptyState message="أمر غير معروف." />;
    }
  };

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">لا تملك صلاحية الوصول إلى هذه الصفحة.</p>
      </div>
    );
  }

  const effectiveLabel = providerStatus?.effective === "openai" ? "OpenAI" : "المحرك الذاتي";

  return (
    <div className="min-h-screen bg-gray-50 pt-6">
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-2xl">🧠</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">مركز الذكاء الموحد</h1>
              <p className="text-xs text-gray-500">لوحة قيادة تنفيذية — المحركات الحقيقية من الأجزاء 1-4</p>
            </div>
            <div className="mr-auto flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-500">الحالة:</span>
              <span className="flex items-center gap-1.5 text-sm text-gray-600">
                <span className={`w-3 h-3 rounded-full animate-pulse ${providerStatus?.ready ? "bg-green-500" : "bg-yellow-500"}`}></span>
                {effectiveLabel} فعال
              </span>
              <span className="text-sm text-gray-600">
                OpenAI {openaiEnv?.configured ? "مفعل" : "غير مُعدّ"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">مزود التوليد:</span>
              <button
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${providerStatus?.selected === "self" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                onClick={() => switchProvider("self")}
              >
                🟢 المحرك الذاتي
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${providerStatus?.selected === "openai" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                onClick={() => switchProvider("openai")}
              >
                🔵 OpenAI
              </button>
              {providerStatus?.fallbackUsed && (
                <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">تراجع تلقائي: OpenAI غير مهيأ</span>
              )}
              <button className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200" onClick={() => setOpenaiPanel((v) => !v)}>
                ⚙️ إعداد OpenAI
              </button>
            </div>
            {providerStatus?.messageAr && (
              <span className="text-xs text-gray-500">{providerStatus.messageAr}</span>
            )}
          </div>

          {openaiPanel && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-1">حالة OpenAI على الخادم</p>
              {openaiEnv?.configured ? (
                <p className="text-sm text-green-700">المفتاح مُهيأ على الخادم — النموذج: <span className="font-medium">{openaiEnv.model}</span></p>
              ) : (
                <p className="text-sm text-gray-600">
                  لم يتم إعداد مفتاح OpenAI بعد. أضف <code className="px-1 py-0.5 rounded bg-gray-200 text-xs">OPENAI_API_KEY</code> (أو <code className="px-1 py-0.5 rounded bg-gray-200 text-xs">AI_API_KEY</code>) إلى متغيرات البيئة على الخادم ثم أعد تشغيله ليتم تفعيل المحرك. المفتاح لا يُعرض أبداً في المتصفح.
                </p>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {notice && (
          <div className={`mb-4 p-3 rounded-lg text-sm border ${notice.kind === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
            {notice.kind === "success" ? "✓ " : "✕ "}{notice.text}
            <button className="mr-3 text-xs opacity-60 hover:opacity-100" onClick={() => setNotice(null)}>إغلاق</button>
          </div>
        )}

        {channels.length > 0 && (
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h2 className="font-semibold text-gray-700 mb-3 text-sm">القنوات</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {channels.map((ch) => (
                <div key={ch.channel} className={`border rounded-lg p-3 ${ch.connected ? "border-green-200 bg-green-50/50" : "border-gray-200 bg-gray-50"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800">{ch.labelAr}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${ch.connected ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                      {ch.connected ? "متصل" : "غير مربوط"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-2">{ch.noteAr}</p>
                  {ch.website ? (
                    <span className="text-[11px] text-green-600">قناة الموقع الأساسية — متصلة دائماً</span>
                  ) : ch.connected ? (
                    <button className="px-2.5 py-1 rounded bg-red-50 text-red-700 text-xs hover:bg-red-100" onClick={() => disconnectChannel(ch.channel)}>
                      فصل القناة
                    </button>
                  ) : (
                    <button className="px-2.5 py-1 rounded bg-gray-700 text-white text-xs hover:bg-gray-800" onClick={() => connectChannel(ch.channel)}>
                      🔗 ربط القناة
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-5 rounded-xl mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg">🧠</div>
              <div>
                <h2 className="font-bold text-gray-900 text-sm">مساعد الذكاء الموحد — واجهة المحادثة</h2>
                <p className="text-xs text-gray-500">اسأل بالغة الطبيعية — يفهم ويحلل ويوصي مع ترتيب وتفسير</p>
              </div>
            </div>
            <a
              href="/admin/intelligence/chat"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              🚀 افتح مساعد الذكاء
            </a>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-700 mb-1">ماذا تريد أن يفعل النظام؟</h2>
          <p className="text-sm text-gray-500 mb-4">اضغط على أي أمر وسيتم تنفيذه فوراً على البيانات الحقيقية للمتجر، ثم تظهر النتيجة مع إجراءات حقيقية قابلة للتنفيذ.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {COMMANDS.map((cmd) => (
              <button
                key={cmd.id}
                disabled={running}
                className={`w-full py-3 px-4 rounded-xl text-white text-sm font-medium transition-colors ${cmd.color} ${running && activeCommand === cmd.id ? "opacity-70 cursor-wait" : ""} ${running && activeCommand !== cmd.id ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => executeCommand(cmd.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cmd.icon}</span>
                  <div className="text-right">
                    <p className="font-semibold">{cmd.label}</p>
                    <p className="text-[11px] font-normal opacity-80">{cmd.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {running && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div>
                <p className="font-medium text-gray-900">جارٍ التنفيذ: {activeLabel}</p>
                <p className="text-sm text-gray-500">يتم استدعاء المحرك المناسب وتحليل البيانات الحقيقية...</p>
              </div>
            </div>
          </div>
        )}

        {result && !running && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">نتيجة: {COMMANDS.find((c) => c.id === result.command)?.label ?? result.command}</h3>
              <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => setResult(null)}>إغلاق ✕</button>
            </div>
            {renderResult()}
          </div>
        )}
      </main>

      {confirmState && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="font-semibold text-gray-900 text-base mb-2">{confirmState.title}</h3>
            <p className="text-sm text-gray-600 mb-5">{confirmState.message}</p>
            <div className="flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200"
                onClick={() => setConfirmState(null)}
              >
                إلغاء
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                  confirmState.tone === "danger"
                    ? "bg-red-600 hover:bg-red-700"
                    : confirmState.tone === "success"
                      ? "bg-green-600 hover:bg-green-700"
                      : confirmState.tone === "neutral"
                        ? "bg-gray-600 hover:bg-gray-700"
                        : "bg-blue-600 hover:bg-blue-700"
                }`}
                onClick={confirmState.onConfirm}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {contentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6">
            <h3 className="font-semibold text-gray-900 text-base mb-4">
              {contentModal.mode === "edit" ? "✏️ تعديل المحتوى" : contentModal.mode === "schedule" ? "🗓️ جدولة النشر" : "📅 إعادة جدولة النشر"}
            </h3>
            {contentModal.mode === "edit" ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">العنوان</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    defaultValue={contentModal.title}
                    onChange={(e) => setContentModal({ ...contentModal, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">المحتوى</label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm min-h-[140px]"
                    defaultValue={contentModal.body}
                    onChange={(e) => setContentModal({ ...contentModal, body: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">دعوة لاتخاذ إجراء</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    defaultValue={contentModal.callToAction ?? ""}
                    onChange={(e) => setContentModal({ ...contentModal, callToAction: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">وقت النشر</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  defaultValue={contentModal.scheduledFor}
                  onChange={(e) => setContentModal({ ...contentModal, scheduledFor: e.target.value })}
                />
              </div>
            )}
            <div className="flex items-center justify-end gap-2 mt-5">
              <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200" onClick={() => setContentModal(null)}>
                إلغاء
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                onClick={() => {
                  if (contentModal.mode === "edit") {
                    lifecycleAction("edit", { title: contentModal.title ?? "", body: contentModal.body ?? "", callToAction: contentModal.callToAction ?? null }, "حفظ التعديلات");
                  } else if (contentModal.mode === "schedule") {
                    lifecycleAction("schedule", { scheduledFor: contentModal.scheduledFor, channel: "website" }, "الجدولة");
                  } else {
                    lifecycleAction("reschedule", { scheduledFor: contentModal.scheduledFor }, "إعادة الجدولة");
                  }
                }}
              >
                {contentModal.mode === "edit" ? "حفظ" : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
