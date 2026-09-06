"use client";
import { timedController } from "@/src/lib/fetch-timeout";

import { useEffect, useState } from "react";
import { Megaphone, Plus, Pause, Play, CheckCircle2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/admin/ui/Modal";
import { LoadingState, EmptyState, ErrorState } from "@/components/admin/ui/States";
import { useAdminGuard } from "@/src/admin/useAdminGuard";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import {
  type ContentCampaign,
  type ContentCampaignStatus,
  type ContentType,
  type ContentObjective,
  type ChannelKey,
  ALL_CONTENT_TYPES,
  ALL_OBJECTIVES,
  ALL_CHANNELS,
  TYPE_LABELS,
  OBJECTIVE_LABELS,
  CHANNEL_LABELS,
  CAMPAIGN_STATUS_LABELS,
  formatDate,
  formatInt,
} from "./content-types";

interface CampaignsPayload {
  campaigns: ContentCampaign[];
}

const STATUS_TONES: Record<ContentCampaignStatus, string> = {
  draft: "neutral",
  scheduled: "accent",
  running: "success",
  paused: "warning",
  completed: "secondary",
  cancelled: "error",
};

export default function ContentCampaigns() {
  const { allowed, canEdit } = useAdminGuard("content");
  const { toast } = useAdminToast();
  const [campaigns, setCampaigns] = useState<ContentCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState("");
  const [objective, setObjective] = useState<ContentObjective>("AWARENESS");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [priority, setPriority] = useState(50);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [channels, setChannels] = useState<ChannelKey[]>(["website"]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<Array<{ id: string; slug: string; title: string }>>([]);
  const [categoryResults, setCategoryResults] = useState<Array<{ slug: string; nameAr: string; nameEn?: string }>>([]);
  const [pickingProducts, setPickingProducts] = useState(false);
  const [pickingCategories, setPickingCategories] = useState(false);

  useEffect(() => {
    const controller = timedController(15000);
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/content?action=campaigns", { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as CampaignsPayload;
        setCampaigns(json.campaigns);
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

  // Load searchable catalog for pickers (real 2764 products, real categories — no fake data)
  useEffect(() => {
    if (!creating) return;
    let cancelled = false;
    (async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch("/api/content/products?limit=50", { cache: "no-store" }),
          fetch("/api/content/categories", { cache: "no-store" }),
        ]);
        if (prodRes.ok) {
          const pj = await prodRes.json();
          const list: Array<{ id: string; slug: string; title: string }> = (pj.products ?? []).slice(0, 50).map((p: any) => ({
            id: p.id ?? p.slug,
            slug: p.slug,
            title: p.name?.ar ?? p.name?.en ?? p.slug,
          }));
          if (!cancelled) setProductResults(list);
        }
        if (catRes.ok) {
          const cj = await catRes.json();
          const list = (cj.categories ?? cj ?? []).slice(0, 50).map((c: any) => ({
            slug: c.slug,
            nameAr: c.name?.ar ?? c.nameAr ?? c.slug,
            nameEn: c.name?.en ?? c.name ?? "",
          }));
          if (!cancelled) setCategoryResults(list);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [creating]);

  useEffect(() => {
    if (!productQuery.trim()) return;
    let cancelled = false;
    const q = productQuery.trim().toLowerCase();
    fetch(`/api/content/products?limit=50`, { cache: "no-store" }).then(async (r) => {
      if (!r.ok || cancelled) return;
      const pj = await r.json();
      const filtered = (pj.products ?? [])
        .filter((p: any) => String(p.name?.ar ?? "").toLowerCase().includes(q) || String(p.slug ?? "").toLowerCase().includes(q))
        .slice(0, 20)
        .map((p: any) => ({ id: p.id ?? p.slug, slug: p.slug, title: p.name?.ar ?? p.name?.en ?? p.slug }));
      if (!cancelled) setProductResults(filtered);
    });
    return () => { cancelled = true; };
  }, [productQuery]);

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
    if (!name.trim() || !startAt || !endAt) {
      toast("أكمل الاسم والتواريخ", "error");
      return;
    }
    try {
      const json = (await post({
        action: "campaign-create",
        name,
        nameEn: undefined,
        objective,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        priority,
        categoryIds,
        productIds,
        contentTypes,
        channels,
        status: "draft",
      })) as { campaign: ContentCampaign };
      setCampaigns((prev) => [...prev, json.campaign]);
      setCreating(false);
      setName("");
      setContentTypes([]);
      setCategoryIds([]);
      setProductIds([]);
      toast("تم إنشاء الحملة", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function handleStatus(campaign: ContentCampaign, status: ContentCampaignStatus) {
    try {
      await post({ action: "campaign-status", id: campaign.id, status });
      setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? { ...c, status } : c)));
      toast("تم تحديث الحالة", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  if (!allowed) {
    return (
      <EmptyState
        title="ليس لديك صلاحية الوصول"
        description="دورك الحالي لا يملك صلاحية عرض الحملات."
      />
    );
  }

  if (loading) return <LoadingState label="جارٍ تحميل الحملات..." />;
  if (error) return <ErrorState title="خطأ في التحميل" description={error} />;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Megaphone size={20} className="text-primary" />
            حملات المحتوى
          </h1>
          <p className="text-xs text-muted">{campaigns.length} حملة</p>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => { setCreating(true); setStartAt(""); setEndAt(""); setName(""); setObjective("AWARENESS"); setPriority(50); setContentTypes([]); setChannels(["website"]); setCategoryIds([]); setProductIds([]); setProductQuery(""); }}>
            <Plus className="h-3.5 w-3.5" />
            حملة جديدة
          </Button>
        )}
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <EmptyState title="لا توجد حملات" description="أنشئ حملة محتوى لربطها بجدولة النشر." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => (
            <Card key={c.id} padding="sm" hover>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-foreground">{c.name}</div>
                  {c.nameEn && <div className="text-[10px] text-muted">{c.nameEn}</div>}
                </div>
                <Badge variant={STATUS_TONES[c.status] as never} className="text-[9px]">
                  {CAMPAIGN_STATUS_LABELS[c.status]}
                </Badge>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-[9px]">{OBJECTIVE_LABELS[c.objective] ?? c.objective}</Badge>
                <Badge variant="neutral" className="text-[9px]">أولوية {formatInt(c.priority)}</Badge>
                {c.contentTypes.map((t) => (
                  <Badge key={t} variant="outline" className="text-[9px]">{TYPE_LABELS[t] ?? t}</Badge>
                ))}
                {c.channels.map((ch) => (
                  <Badge key={ch} variant="outline" className="text-[9px]">{CHANNEL_LABELS[ch]}</Badge>
                ))}
              </div>
              <p className="mb-3 text-[10px] text-muted">
                {formatDate(c.startAt)} — {formatDate(c.endAt)}
              </p>
              {canEdit && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {(c.status === "draft" || c.status === "paused") && (
                    <Button variant="outline" size="sm" loading={busy} onClick={() => void handleStatus(c, "running")}>
                      <Play className="h-3 w-3" /> تشغيل
                    </Button>
                  )}
                  {c.status === "running" && (
                    <Button variant="ghost" size="sm" loading={busy} onClick={() => void handleStatus(c, "paused")}>
                      <Pause className="h-3 w-3" /> إيقاف
                    </Button>
                  )}
                  {(c.status === "running" || c.status === "paused" || c.status === "scheduled") && (
                    <Button variant="ghost" size="sm" loading={busy} onClick={() => void handleStatus(c, "completed")}>
                      <CheckCircle2 className="h-3 w-3" /> إكمال
                    </Button>
                  )}
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
        title="حملة محتوى جديدة"
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>إلغاء</Button>
            <Button variant="primary" size="sm" loading={busy} onClick={() => void handleCreate()}>إنشاء</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-foreground">اسم الحملة</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              placeholder="مثال: حملة العناية الشتوية"
            />
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
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">الأولوية</span>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">البدء</span>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground">الانتهاء</span>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full rounded-button border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <div className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-foreground">أنواع المحتوى</span>
            <div className="flex flex-wrap gap-1.5">
              {ALL_CONTENT_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() =>
                    setContentTypes((prev) =>
                      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
                    )
                  }
                  className={`rounded-pill px-2.5 py-1 text-[10px] font-medium transition-colors ${
                    contentTypes.includes(t)
                      ? "bg-primary text-white"
                      : "bg-muted-bg text-muted hover:bg-primary/10"
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-foreground">القنوات</span>
            <div className="flex flex-wrap gap-1.5">
              {ALL_CHANNELS.map((ch) => (
                <button
                  key={ch}
                  onClick={() =>
                    setChannels((prev) =>
                      prev.includes(ch) ? prev.filter((x) => x !== ch) : [...prev, ch],
                    )
                  }
                  className={`rounded-pill px-2.5 py-1 text-[10px] font-medium transition-colors ${
                    channels.includes(ch)
                      ? "bg-primary text-white"
                      : "bg-muted-bg text-muted hover:bg-primary/10"
                  }`}
                >
                  {CHANNEL_LABELS[ch]}
                </button>
              ))}
            </div>
          </div>
          {/* Searchable category picker — real catalog, no fake data */}
          <div className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-foreground">التصنيفات ({categoryIds.length} محدد)</span>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-auto rounded-button border border-border p-2 bg-muted-bg/30">
              {categoryResults.length === 0 ? (
                <span className="text-[11px] text-muted">لا توجد تصنيفات</span>
              ) : (
                categoryResults.slice(0, 20).map((c) => (
                  <button
                    key={c.slug}
                    onClick={() => setCategoryIds((prev) => prev.includes(c.slug) ? prev.filter((x) => x !== c.slug) : [...prev, c.slug])}
                    className={`rounded-pill px-2.5 py-1 text-[10px] font-medium ${categoryIds.includes(c.slug) ? "bg-primary text-white" : "bg-card border border-border text-muted hover:bg-primary/10"}`}
                  >
                    {c.nameAr} {categoryIds.includes(c.slug) ? "✓" : ""}
                  </button>
                ))
              )}
            </div>
          </div>
          {/* Searchable product picker — real 2764 catalog */}
          <div className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-foreground">المنتجات ({productIds.length} محدد)</span>
            <input
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="ابحثي عن منتج بالاسم أو slug..."
              className="mb-2 w-full rounded-button border border-border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            />
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-auto rounded-button border border-border p-2 bg-muted-bg/30">
              {productResults.length === 0 ? (
                <span className="text-[11px] text-muted">اكتبي للبحث أو سيتم عرض أول 50 منتج</span>
              ) : (
                productResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProductIds((prev) => prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id])}
                    className={`rounded-pill px-2.5 py-1 text-[10px] font-medium truncate max-w-[150px] ${productIds.includes(p.id) ? "bg-primary text-white" : "bg-card border border-border text-muted hover:bg-primary/10"}`}
                    title={p.title}
                  >
                    {p.title.slice(0, 24)} {productIds.includes(p.id) ? "✓" : ""}
                  </button>
                ))
              )}
            </div>
            {productIds.length > 0 && <p className="mt-1 text-[10px] text-muted">المنتجات المختارة: {productIds.join(", ")}</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}