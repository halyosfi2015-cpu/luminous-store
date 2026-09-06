"use client";
import { timedController } from "@/src/lib/fetch-timeout";

import { useEffect, useState } from "react";
import { Sparkles, Plus, Check, X } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/admin/ui/Modal";
import { LoadingState, EmptyState, ErrorState } from "@/components/admin/ui/States";
import { useAdminGuard } from "@/src/admin/useAdminGuard";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import {
  type ContentIdeaRecord,
  type ContentType,
  type ContentObjective,
  ALL_CONTENT_TYPES,
  ALL_OBJECTIVES,
  TYPE_LABELS,
  OBJECTIVE_LABELS,
  formatDateTime,
} from "./content-types";

interface IdeasPayload {
  ideas: ContentIdeaRecord[];
}

const IDEA_STATUS_LABELS: Record<ContentIdeaRecord["status"], string> = {
  IDEA: "فكرة",
  SELECTED: "مختارة",
  GENERATED: "تم توليدها",
  DISMISSED: "مرفوضة",
};

const IDEA_STATUS_TONES: Record<ContentIdeaRecord["status"], string> = {
  IDEA: "neutral",
  SELECTED: "accent",
  GENERATED: "success",
  DISMISSED: "secondary",
};

export default function ContentIdeas() {
  const { allowed, canEdit } = useAdminGuard("content");
  const { toast } = useAdminToast();
  const [ideas, setIdeas] = useState<ContentIdeaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<ContentType>("EDUCATIONAL");
  const [objective, setObjective] = useState<ContentObjective>("AWARENESS");
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");

  useEffect(() => {
    const controller = timedController(15000);
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/content?action=ideas", { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as IdeasPayload;
        setIdeas(json.ideas);
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

  async function post(body: Record<string, unknown>): Promise<unknown> {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        signal: AbortSignal.timeout(25000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: { message: string }; [k: string]: unknown };
      if (!res.ok || json.error) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
      return json;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (!title.trim()) {
      toast("أدخل عنوان الفكرة", "error");
      return;
    }
    try {
      const json = (await post({
        action: "idea-create",
        title,
        categoryId: null,
        contentType,
        objective,
        productIds: [],
        reason: reason || undefined,
        priority,
      })) as { idea: ContentIdeaRecord };
      setIdeas((prev) => [json.idea, ...prev]);
      setCreating(false);
      setTitle("");
      setReason("");
      toast("تم إنشاء الفكرة", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function handleSelect(idea: ContentIdeaRecord) {
    try {
      await post({ action: "idea-select", id: idea.ideaId });
      setIdeas((prev) => prev.map((i) => (i.ideaId === idea.ideaId ? { ...i, status: "SELECTED" as const } : i)));
      toast("تم اختيار الفكرة", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function handleDismiss(idea: ContentIdeaRecord) {
    try {
      await post({ action: "idea-dismiss", id: idea.ideaId });
      setIdeas((prev) => prev.map((i) => (i.ideaId === idea.ideaId ? { ...i, status: "DISMISSED" as const } : i)));
      toast("تم رفض الفكرة", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  if (!allowed) {
    return (
      <EmptyState
        title="ليس لديك صلاحية الوصول"
        description="دورك الحالي لا يملك صلاحية عرض الأفكار."
      />
    );
  }

  if (loading) return <LoadingState label="جارٍ تحميل الأفكار..." />;
  if (error) return <ErrorState title="خطأ في التحميل" description={error} />;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Sparkles size={20} className="text-primary" />
            أفكار المحتوى
          </h1>
          <p className="text-xs text-muted">{ideas.length} فكرة</p>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => { setCreating(true); setTitle(""); setReason(""); setContentType("EDUCATIONAL"); setObjective("AWARENESS"); setPriority("medium"); }}>
            <Plus className="h-3.5 w-3.5" />
            فكرة جديدة
          </Button>
        )}
      </div>

      {ideas.length === 0 ? (
        <Card>
          <EmptyState title="لا توجد أفكار" description="أفكار مخطط المحتوى ستظهر هنا للاختيار أو الرفض." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ideas.map((idea) => (
            <Card key={idea.ideaId} padding="sm" hover>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-foreground">{idea.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[9px]">{TYPE_LABELS[idea.contentType] ?? idea.contentType}</Badge>
                    <Badge variant="neutral" className="text-[9px]">{OBJECTIVE_LABELS[idea.objective] ?? idea.objective}</Badge>
                    {idea.priority && (
                      <Badge
                        variant={idea.priority === "high" ? "error" : idea.priority === "medium" ? "warning" : "neutral"}
                        className="text-[9px]"
                      >
                        أولوية {idea.priority === "high" ? "عالية" : idea.priority === "medium" ? "متوسطة" : "منخفضة"}
                      </Badge>
                    )}
                  </div>
                </div>
                <Badge variant={IDEA_STATUS_TONES[idea.status] as never} className="text-[9px]">
                  {IDEA_STATUS_LABELS[idea.status]}
                </Badge>
              </div>
              {idea.reason && <p className="mb-2 text-[11px] leading-relaxed text-muted">{idea.reason}</p>}
              <p className="mb-2 text-[9px] text-muted">{formatDateTime(idea.createdAt)}</p>
              {canEdit && idea.status === "IDEA" && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button variant="outline" size="sm" loading={busy} onClick={() => void handleSelect(idea)}>
                    <Check className="h-3 w-3" /> اختيار
                  </Button>
                  <Button variant="ghost" size="sm" loading={busy} onClick={() => void handleDismiss(idea)}>
                    <X className="h-3 w-3" /> رفض
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="فكرة محتوى جديدة"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>إلغاء</Button>
            <Button variant="primary" size="sm" loading={busy} onClick={() => void handleCreate()}>إنشاء</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-foreground">عنوان الفكرة</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              placeholder="مثال: دليل العناية الليلية للبشرة الدهنية"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">النوع</span>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              {ALL_CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">الهدف</span>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value as ContentObjective)}
              className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              {ALL_OBJECTIVES.map((o) => (
                <option key={o} value={o}>{OBJECTIVE_LABELS[o]}</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-foreground">السبب / ملاحظات</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              placeholder="لماذا هذه الفكرة؟"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-foreground">الأولوية</span>
            <div className="flex flex-wrap gap-1.5">
              {(["high", "medium", "low"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`rounded-pill px-2.5 py-1 text-[10px] font-medium transition-colors ${
                    priority === p ? "bg-primary text-white" : "bg-muted-bg text-muted hover:bg-primary/10"
                  }`}
                >
                  {p === "high" ? "عالية" : p === "medium" ? "متوسطة" : "منخفضة"}
                </button>
              ))}
            </div>
          </label>
        </div>
      </Modal>
    </div>
  );
}