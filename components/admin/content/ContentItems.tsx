"use client";
import { timedController } from "@/src/lib/fetch-timeout";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Check,
  Clock,
  FileText,
  X,
  RefreshCcw,
  PencilLine,
  CalendarPlus,
  Send,
  Ban,
  Archive,
  Info,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/admin/ui/Modal";
import { LoadingState, EmptyState, ErrorState } from "@/components/admin/ui/States";
import { useAdminGuard } from "@/src/admin/useAdminGuard";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import SocialPostDesigner from "./SocialPostDesigner";
import {
  type ContentOpsItem,
  type ContentOpsStatus,
  type ChannelKey,
  STATUS_LABELS,
  STATUS_TONES,
  TYPE_LABELS,
  OBJECTIVE_LABELS,
  CHANNEL_LABELS,
  ALL_CHANNELS,
  ALL_REJECTION_REASONS,
  REJECTION_REASON_LABELS,
  formatDateTime,
} from "./content-types";

interface ListPayload {
  configured: boolean;
  items: ContentOpsItem[];
}

const FILTERS: Array<{ key: ContentOpsStatus | "ALL"; label: string }> = [
  { key: "ALL", label: "الكل" },
  { key: "REVIEW_REQUIRED", label: "بانتظار المراجعة" },
  { key: "APPROVED", label: "معتمد" },
  { key: "SCHEDULED", label: "مجدول" },
  { key: "PUBLISHED", label: "منشور" },
  { key: "PUBLISH_FAILED", label: "فشل النشر" },
  { key: "GENERATED", label: "تم الإنشاء" },
];

export default function ContentItems({ initialStatus }: { initialStatus?: ContentOpsStatus | "ALL" }) {
  const { allowed, canEdit } = useAdminGuard("content");
  const searchParams = useSearchParams();
  const { toast } = useAdminToast();

  const [items, setItems] = useState<ContentOpsItem[]>([]);
  const [configured, setConfigured] = useState(true);
  const [filter, setFilter] = useState<ContentOpsStatus | "ALL">(
    initialStatus ?? (searchParams.get("status") as ContentOpsStatus) ?? "ALL",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Modal state
  const [detail, setDetail] = useState<ContentOpsItem | null>(null);
  const [rejecting, setRejecting] = useState<ContentOpsItem | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("BAD_COPY");
  const [rejectNote, setRejectNote] = useState("");
  const [scheduling, setScheduling] = useState<ContentOpsItem | null>(null);
  const [scheduleChannel, setScheduleChannel] = useState<ChannelKey>("website");
  const [scheduleFor, setScheduleFor] = useState("");
  const [editing, setEditing] = useState<ContentOpsItem | null>(null);
  const [editBody, setEditBody] = useState("");

  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const q = filter === "ALL" ? "" : `&status=${filter}`;
        const res = await fetch(`/api/admin/content?action=list${q}`, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ListPayload;
        setItems(json.items);
        setConfigured(json.configured);
        setLoading(false);
      } catch (e) {
        if (signal.aborted) return;
        setError((e as Error).message);
        setLoading(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    const controller = timedController(15000);
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function post(body: Record<string, unknown>): Promise<unknown> {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        signal: AbortSignal.timeout(25000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: { code: string; message: string }; [k: string]: unknown };
      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? `HTTP ${res.status}`);
      }
      return json;
    } finally {
      setBusy(false);
    }
  }

  async function reload() {
    await load(timedController(15000).signal);
  }

  async function handleApprove(item: ContentOpsItem) {
    try {
      await post({ action: "approve", id: item.id });
      toast("تم اعتماد المحتوى", "success");
      setDetail(null);
      await reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function handleReject() {
    if (!rejecting) return;
    try {
      await post({ action: "reject", id: rejecting.id, reason: rejectReason, note: rejectNote || undefined });
      toast("تم رفض المحتوى", "success");
      setRejecting(null);
      setRejectNote("");
      await reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function handleSchedule() {
    if (!scheduling || !scheduleFor) return;
    try {
      await post({
        action: "schedule",
        id: scheduling.id,
        channel: scheduleChannel,
        scheduledFor: new Date(scheduleFor).toISOString(),
        campaignId: scheduling.campaignId,
      });
      toast("تمت الجدولة", "success");
      setScheduling(null);
      setScheduleFor("");
      await reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function handlePublish(item: ContentOpsItem) {
    try {
      await post({ action: "publish", id: item.id, channel: "website" });
      toast("تم نشر المحتوى", "success");
      setDetail(null);
      await reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function handleCancelSchedule(item: ContentOpsItem) {
    try {
      await post({ action: "cancel-schedule", id: item.id });
      toast("تم إلغاء الجدولة", "success");
      setDetail(null);
      await reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function handleRegenerate(item: ContentOpsItem) {
    try {
      await post({ action: "regenerate", id: item.id });
      toast("تمت إعادة الإنشاء", "success");
      setDetail(null);
      await reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function handleEdit() {
    if (!editing) return;
    try {
      await post({ action: "edit", id: editing.id, body: editBody, title: null, callToAction: null });
      toast("تم حفظ التعديل وإنشاء نسخة جديدة", "success");
      setEditing(null);
      await reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function handleArchive(item: ContentOpsItem) {
    try {
      await post({ action: "set-status", id: item.id, status: "ARCHIVED" });
      toast("تمت الأرشفة", "success");
      setDetail(null);
      await reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  if (!allowed) {
    return (
      <EmptyState
        title="ليس لديك صلاحية الوصول"
        description="دورك الحالي لا يملك صلاحية عرض المحتوى."
      />
    );
  }

  if (loading) return <LoadingState label="جارٍ تحميل المحتوى..." />;
  if (error) return <ErrorState title="خطأ في التحميل" description={error} onRetry={() => void reload()} />;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <FileText size={20} className="text-primary" />
            المحتوى
          </h1>
          <p className="text-xs text-muted">
            {items.length} عنصر — {configured ? "الذكاء الاصطناعي مفعّل" : "الذكاء الاصطناعي غير مفعّل (النشر اليدوي فقط)"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-pill px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-white"
                : "bg-muted-bg text-muted hover:bg-primary/10 hover:text-primary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState title="لا يوجد محتوى" description="لا توجد عناصر محتوى ضمن هذا التصنيف." />
          {canEdit && (
            <div className="mt-4 flex justify-center">
              <Link
                href="/admin/ai/content"
                className="inline-flex items-center rounded-button bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary/90"
              >
                إنشاء أول منشور
              </Link>
            </div>
          )}
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="py-2.5 text-start">العنصر</th>
                <th className="py-2.5 text-start">النوع / الهدف</th>
                <th className="py-2.5 text-center">الحالة</th>
                <th className="py-2.5 text-end">آخر تحديث</th>
                <th className="py-2.5 text-end">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/40">
                  <td className="py-2.5">
                    <button
                      className="text-start font-medium text-foreground hover:text-primary"
                      onClick={() => setDetail(item)}
                    >
                      {item.item.title ?? item.id}
                    </button>
                    <div className="truncate text-[9px] text-muted">{item.id}</div>
                  </td>
                  <td className="py-2.5">
                    <Badge variant="secondary" className="text-[9px]">{TYPE_LABELS[item.item.contentType] ?? item.item.contentType}</Badge>
                    <span className="ms-1 text-[9px] text-muted">{OBJECTIVE_LABELS[item.item.objective] ?? item.item.objective}</span>
                  </td>
                  <td className="py-2.5 text-center">
                    <Badge variant={STATUS_TONES[item.status] as never} className="text-[9px]">
                      {STATUS_LABELS[item.status]}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-end text-muted">{formatDateTime(item.updatedAt)}</td>
                  <td className="py-2.5 text-end">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {canEdit && item.status === "REVIEW_REQUIRED" && (
                        <Button variant="outline" size="sm" onClick={() => void handleApprove(item)}>
                          <Check className="h-3 w-3" /> اعتماد
                        </Button>
                      )}
                      {canEdit && (item.status === "REVIEW_REQUIRED" || item.status === "VALIDATION_FAILED") && (
                        <Button variant="ghost" size="sm" onClick={() => { setRejecting(item); setRejectReason("BAD_COPY"); setRejectNote(""); }}>
                          <X className="h-3 w-3" /> رفض
                        </Button>
                      )}
                      {canEdit && item.status === "APPROVED" && (
                        <Button variant="outline" size="sm" onClick={() => { setScheduling(item); setScheduleFor(""); setScheduleChannel("website"); }}>
                          <CalendarPlus className="h-3 w-3" /> جدولة
                        </Button>
                      )}
                      {canEdit && item.status === "SCHEDULED" && (
                        <Button variant="outline" size="sm" onClick={() => void handlePublish(item)}>
                          <Send className="h-3 w-3" /> نشر الآن
                        </Button>
                      )}
                      {canEdit && (item.status === "SCHEDULED" || item.status === "PUBLISH_FAILED") && (
                        <Button variant="ghost" size="sm" onClick={() => void handleCancelSchedule(item)}>
                          <Ban className="h-3 w-3" /> إلغاء
                        </Button>
                      )}
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(item); setEditBody(item.item.body); }}>
                          <PencilLine className="h-3 w-3" /> تعديل
                        </Button>
                      )}
                      {canEdit && item.status !== "ARCHIVED" && item.status !== "PUBLISHED" && (
                        <Button variant="ghost" size="sm" onClick={() => void handleArchive(item)}>
                          <Archive className="h-3 w-3" /> أرشفة
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="تفاصيل المحتوى"
        description={detail?.item.title ?? detail?.id}
        size="lg"
        footer={
          detail ? (
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && detail.status === "REVIEW_REQUIRED" && (
                <Button variant="outline" size="sm" loading={busy} onClick={() => void handleApprove(detail)}>
                  <Check className="h-3 w-3" /> اعتماد
                </Button>
              )}
              {canEdit && detail.status === "APPROVED" && (
                <Button variant="outline" size="sm" loading={busy} onClick={() => { setScheduling(detail); setScheduleFor(""); setScheduleChannel("website"); }}>
                  <CalendarPlus className="h-3 w-3" /> جدولة
                </Button>
              )}
              {canEdit && detail.status === "SCHEDULED" && (
                <Button variant="outline" size="sm" loading={busy} onClick={() => void handlePublish(detail)}>
                  <Send className="h-3 w-3" /> نشر الآن
                </Button>
              )}
              {canEdit && detail.status !== "ARCHIVED" && (
                <Button variant="ghost" size="sm" loading={busy} onClick={() => void handleRegenerate(detail)}>
                  <RefreshCcw className="h-3 w-3" /> إعادة إنشاء
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_TONES[detail.status] as never}>{STATUS_LABELS[detail.status]}</Badge>
              <Badge variant="secondary">{TYPE_LABELS[detail.item.contentType] ?? detail.item.contentType}</Badge>
              <Badge variant="neutral">{OBJECTIVE_LABELS[detail.item.objective] ?? detail.item.objective}</Badge>
              <Badge variant="neutral">{detail.item.language === "ar" ? "عربي" : "English"}</Badge>
            </div>

            <SocialPostDesigner item={detail} />

            <div>
              <p className="mb-1 text-[10px] font-semibold text-muted">النص المعتمد</p>
              <div className="rounded-card border border-border bg-muted-bg/40 p-3 text-sm leading-relaxed text-foreground">
                {detail.item.body}
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1 text-[10px] font-semibold text-muted">
                <Info size={11} /> سجل النسخ ({detail.versions.length})
              </p>
              <ul className="space-y-2">
                {detail.versions.map((v) => (
                  <li key={v.id} className="rounded-card border border-border/60 p-2.5">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">الإصدار {v.versionNumber}</Badge>
                      <span className="text-[9px] text-muted">{formatDateTime(v.createdAt)}</span>
                      <span className="text-[9px] text-muted">التحقق: {v.validation.passed ? "ناجح" : "فشل"}</span>
                      <span className="text-[9px] text-muted">الأصالة: {Math.round(v.originality.score * 100)}%</span>
                    </div>
                    {v.validation.issues.length > 0 && (
                      <ul className="mb-1 list-disc ps-4 text-[10px] text-error">
                        {v.validation.issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    )}
                    <p className="line-clamp-3 text-[11px] leading-relaxed text-muted">{v.content.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        title="رفض المحتوى"
        description="حدد سبب الرفض وسيُعاد المحتوى إلى المراجعة."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRejecting(null)}>إلغاء</Button>
            <Button variant="danger" size="sm" loading={busy} onClick={() => void handleReject()}>
              <X className="h-3 w-3" /> رفض
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">سبب الرفض</span>
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              {ALL_REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>{REJECTION_REASON_LABELS[r]}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">ملاحظة (اختياري)</span>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              placeholder="ملاحظة إضافية للفريق..."
            />
          </label>
        </div>
      </Modal>

      {/* Schedule modal */}
      <Modal
        open={scheduling !== null}
        onClose={() => setScheduling(null)}
        title="جدولة المحتوى"
        description="اختر القناة وموعد النشر."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setScheduling(null)}>إلغاء</Button>
            <Button variant="primary" size="sm" loading={busy} disabled={!scheduleFor} onClick={() => void handleSchedule()}>
              <CalendarPlus className="h-3 w-3" /> جدولة
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">القناة</span>
            <select
              value={scheduleChannel}
              onChange={(e) => setScheduleChannel(e.target.value as ChannelKey)}
              className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              {ALL_CHANNELS.map((c) => (
                <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">موعد النشر</span>
            <input
              type="datetime-local"
              value={scheduleFor}
              onChange={(e) => setScheduleFor(e.target.value)}
              className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <p className="flex items-center gap-1 text-[10px] text-muted">
            <Clock size={11} />
            يجب أن يكون المحتوى معتمدًا، والمنتج منشورًا والسعر حديثًا وقت الجدولة.
          </p>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="تعديل المحتوى"
        description="سيتم إنشاء نسخة جديدة وإعادة التحقق تلقائيًا."
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>إلغاء</Button>
            <Button variant="primary" size="sm" loading={busy} disabled={!editBody.trim()} onClick={() => void handleEdit()}>
              حفظ التعديل
            </Button>
          </>
        }
      >
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-foreground">نص المحتوى</span>
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={12}
            className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus:border-primary"
          />
        </label>
      </Modal>
    </div>
  );
}