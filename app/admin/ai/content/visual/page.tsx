"use client";

/**
 * PART 2 / P5 — Visual Content Hub (daily operational interface).
 * Flow: real source → platform → objective → manual template OR AI recommend
 * → generate (facts+gates+anti-repeat+copy) → preview → edit → save draft
 * (Content-Ops REVIEW) → approve/schedule/publish in existing Items/Calendar.
 * Socials without credentials show NOT CONFIGURED honestly — never faked.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/admin/ui/Modal";
import { timedController } from "@/src/lib/fetch-timeout";
import VisualComposer, { type ComposeInput } from "@/components/admin/visual/VisualComposer";
import type { FreeformSpec } from "@/src/lib/visual-studio/freeform-spec";

type SourceType = "product" | "routine" | "bundle" | "offer";
type Platform = "instagram-post" | "instagram-story" | "facebook-post" | "facebook-story";

const SOURCE_TABS: { id: SourceType; label: string; hint: string }[] = [
  { id: "product", label: "منتج", hint: "مثال: yq-754" },
  { id: "routine", label: "روتين", hint: "مثال: rt1 أو UUID" },
  { id: "bundle", label: "باقة", hint: "معرّف/سلَغ الباقة" },
  { id: "offer", label: "عرض حقيقي", hint: "معرّف عرض أو منتج عليه خصم" },
];

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "instagram-post", label: "انستغرام بوست" },
  { id: "instagram-story", label: "انستغرام ستوري" },
  { id: "facebook-post", label: "فيسبوك بوست" },
  { id: "facebook-story", label: "فيسبوك ستوري" },
];

const OBJECTIVES = [
  { id: "awareness", label: "وعي" }, { id: "sales", label: "بيع" },
  { id: "education", label: "تثقيف" }, { id: "conversion", label: "تحويل" },
  { id: "launch", label: "إطلاق" }, { id: "social-proof", label: "إثبات اجتماعي" },
  { id: "guidance", label: "إرشاد" }, { id: "engagement", label: "تفاعل" },
  { id: "luxury", label: "فخامة" }, { id: "urgency", label: "استعجال حقيقي" },
];

const TEMPLATE_GROUPS: { title: string; ids: string[] }[] = [
  { title: "تركيز المنتج", ids: ["T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08"] },
  { title: "المشكلة/الحاجة", ids: ["T09", "T10", "T11", "T12", "T13"] },
  { title: "الروتين/التشكيلة", ids: ["T14", "T15", "T16", "T17", "T18", "T19", "T20"] },
  { title: "العروض/التجارة", ids: ["T21", "T22", "T23", "T24", "T25", "T26", "T27"] },
  { title: "تثقيفي/قرار", ids: ["T28", "T29", "T30", "T31", "T32"] },
  { title: "العلامة/العاطفة", ids: ["T33", "T34", "T35"] },
];

type CatalogTpl = { id: string; nameAr: string; objectiveAr: string; platforms: Platform[]; sourceTypes: string[]; productCount: { min: number; max: number } };

async function postVisual(body: unknown): Promise<unknown> {
  const res = await fetch("/api/admin/visual", {
    method: "POST",
    signal: AbortSignal.timeout(30000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`);
  return json;
}

export default function VisualHubPage() {
  const [catalog, setCatalog] = useState<CatalogTpl[]>([]);
  const [sourceType, setSourceType] = useState<SourceType>("product");
  const [sourceId, setSourceId] = useState("yq-754");
  const [platform, setPlatform] = useState<Platform>("instagram-post");
  const [objective, setObjective] = useState("awareness");
  const [mode, setMode] = useState<"manual" | "ai" | "free">("ai");
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; provider: string } | null>(null);
  const [templateId, setTemplateId] = useState("T01");
  const [recs, setRecs] = useState<{ templateId: string; reasonAr: string; score: number; template?: { nameAr: string } }[]>([]);
  const [sourceInfo, setSourceInfo] = useState<{ nameAr: string; image: string | null; productCount: number } | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [result, setResult] = useState<{
    record: { id: string };
    copy: { hook: string; headline: string; subheadline: string; body: string | null; benefits: string[]; cta: string; caption: string; hashtags: string[]; warningsAr: string[]; freeformSpec?: FreeformSpec };
    repeat: { penalty: number; noticesAr: string[]; tooSoon: boolean };
    compose: Omit<ComposeInput, "templateId" | "family" | "copy" | "trust" | "format">;
    template?: { id: string; family?: string; trust?: ComposeInput["trust"]; nameAr: string };
    concept?: { angleAr: string; format: "1:1" | "4:5" | "9:16"; structure: string; bgTint: "default" | "orchid" | "gold"; emphasisAr: string; reasonAr: string; engine: "self" | "openai" };
    provider?: string;
    researchUsed?: { url: string; title: string }[];
  } | null>(null);
  const [brief, setBrief] = useState<{
    suggestion: { sourceType: SourceType; sourceId: string; objective: string; templateId: string; reasonAr: string } | null;
    freeformAdvised: boolean; freeformReasonAr: string | null;
  } | null>(null);
  const [edit, setEdit] = useState({ hook: "", headline: "", subheadline: "", body: "", cta: "", caption: "", hashtags: "" });
  const [format, setFormat] = useState<ComposeInput["format"]>("4:5");
  const [busy, setBusy] = useState<"idle" | "recommend" | "generate" | "draft" | "export">("idle");
  const [error, setError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; templateId: string; platform: string; status: string; createdAt: string; contentItemId: string | null }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [researchUrls, setResearchUrls] = useState("");
  const [research, setResearch] = useState<{ source: string; statements: string[] }[]>([]);
  const [researchNote, setResearchNote] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctrl = timedController(15000);
    fetch("/api/admin/visual?action=templates%20catalog", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray((d as { templates?: unknown }).templates)) setCatalog((d as { templates: CatalogTpl[] }).templates); })
      .catch(() => {});
    const ctrl2 = timedController(15000);
    fetch("/api/admin/visual?action=history&limit=30", { signal: ctrl2.signal })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray((d as { history?: unknown }).history)) setHistory((d as { history: typeof history }).history); })
      .catch(() => {});
    const ctrl3 = timedController(15000);
    fetch("/api/admin/content?action=ai-status", { signal: ctrl3.signal })
      .then((r) => r.json())
      .then((d) => {
        const v = d as { configured?: boolean; provider?: { selected?: string; effective?: string } };
        setAiStatus({ configured: !!v.configured, provider: v.provider?.effective ?? v.provider?.selected ?? "self" });
      })
      .catch(() => setAiStatus({ configured: false, provider: "self" }));
  }, []);

  const recommend = async () => {
    setBusy("recommend"); setError(null); setRecs([]); setSourceInfo(null);
    try {
      const json = (await postVisual({ action: "recommend", sourceType, sourceId: sourceId.trim(), platform, objective })) as {
        recommendations: typeof recs; source: typeof sourceInfo; missing: string[];
      };
      setRecs(json.recommendations);
      setSourceInfo(json.source);
      setMissing(json.missing ?? []);
      if (json.recommendations[0]) setTemplateId(json.recommendations[0].templateId);
    } catch (e) { setError(e instanceof Error ? e.message : "فشل التوصية"); }
    setBusy("idle");
  };

  const generate = async () => {
    setBusy("generate"); setError(null); setResult(null); setDraftId(null);
    try {
      const json = (await postVisual(mode === "free"
        ? { action: "generate-freeform", sourceType, sourceId: sourceId.trim(), platform, objective, campaignId: null, research }
        : {
          action: "generate-content", sourceType, sourceId: sourceId.trim(),
          templateId, platform, campaignId: null,
        })) as unknown as NonNullable<typeof result>;
      setResult(json);
      setEdit({
        hook: json.copy.hook,
        headline: json.copy.headline,
        subheadline: json.copy.subheadline,
        body: json.copy.body ?? "",
        cta: json.copy.cta,
        caption: json.copy.caption,
        hashtags: json.copy.hashtags.join(" "),
      });
      setMissing([]);
    } catch (e) { setError(e instanceof Error ? e.message : "فشل التوليد"); }
    setBusy("idle");
  };

  const fetchResearch = async () => {
    const urls = researchUrls.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
    if (urls.length === 0) { setResearchNote("أدخل رابطاً واحداً على الأقل"); return; }
    setBusy("recommend"); setResearchNote(null);
    try {
      const json = (await postVisual({ action: "research-fetch", urls })) as {
        entries: { url: string; domain: string; title: string; statements: string[] }[];
        rejected: { url: string; reasonAr: string }[];
      };
      setResearch(json.entries.map((e) => ({ source: e.url, statements: e.statements })));
      const rej = json.rejected.map((r) => `${r.url}: ${r.reasonAr}`).join("؛ ");
      setResearchNote(
        json.entries.length > 0
          ? `تم جلب ${json.entries.length} مصدر — يُستخدم كإلهام فقط، ولا يغيّر حقائق المتجر${rej ? ` (مرفوض: ${rej})` : ""}`
          : `لم يُجلب شيء${rej ? ` — ${rej}` : ""}`,
      );
    } catch (e) { setResearchNote(e instanceof Error ? e.message : "فشل الجلب"); }
    setBusy("idle");
  };

  const loadBrief = async () => {
    setBusy("recommend"); setError(null);
    try {
      const json = (await postVisual({ action: "suggest-next", platform })) as unknown as NonNullable<typeof brief>;
      setBrief(json);
    } catch (e) { setError(e instanceof Error ? e.message : "فشل الموجز"); }
    setBusy("idle");
  };

  const applyBrief = () => {
    if (!brief?.suggestion) return;
    const s = brief.suggestion;
    if (["product", "routine", "bundle", "offer"].includes(s.sourceType)) setSourceType(s.sourceType);
    setSourceId(s.sourceId);
    setObjective(s.objective);
    setTemplateId(s.templateId);
    setMode("manual");
  };

  const saveDraft = async () => {
    if (!result) return;
    setBusy("draft"); setError(null);
    try {
      const hashtags = edit.hashtags.split(/[\s,،]+/).map((tag) => tag.trim()).filter(Boolean);
      const saved = (await postVisual({
        action: "update-copy",
        visualId: result.record.id,
        hook: edit.hook,
        headline: edit.headline,
        subheadline: edit.subheadline,
        body: edit.body,
        cta: edit.cta,
        caption: edit.caption,
        hashtags,
      })) as { record: typeof result.record & { copy: typeof result.copy } };
      setResult({ ...result, record: saved.record, copy: saved.record.copy });
      const json = (await postVisual({ action: "content-item", visualId: result.record.id })) as { contentItemId: string };
      setDraftId(json.contentItemId);
    } catch (e) { setError(e instanceof Error ? e.message : "فشل حفظ المسودة"); }
    setBusy("idle");
  };

  const exportPng = async () => {
    if (!previewRef.current) return;
    setBusy("export");
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(previewRef.current, { scale: 2, backgroundColor: "#FFF7F2", useCORS: true, logging: false });
      const a = document.createElement("a");
      a.download = `luminous-${templateId}-${Date.now()}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch { setError("تعذر تصدير PNG — الصور الخارجية قد تمنع ذلك (CORS)"); }
    setBusy("idle");
  };

  const composeInput: ComposeInput | null = result ? {
    templateId: result.template?.id ?? "FREEFORM",
    family: result.copy.freeformSpec ? "freeform" : (result.template?.family ?? "house-signature"),
    freeform: result.copy.freeformSpec ? { spec: result.copy.freeformSpec } : undefined,
    copy: {
      ...result.copy,
      hook: edit.hook,
      headline: edit.headline,
      subheadline: edit.subheadline,
      body: edit.body || null,
      cta: edit.cta,
      caption: edit.caption,
      hashtags: edit.hashtags.split(/[\s,،]+/).map((tag) => tag.trim()).filter(Boolean),
    },
    images: result.compose.images,
    productName: result.compose.productName,
    brandAr: result.compose.brandAr,
    price: result.compose.price, originalPrice: result.compose.originalPrice, currency: result.compose.currency,
    rating: result.compose.rating, reviewCount: result.compose.reviewCount,
    offerLabel: result.compose.offerLabel, deadlineLabel: result.compose.deadlineLabel,
    ingredient: result.compose.ingredient, concernLabel: result.compose.concernLabel,
    steps: result.compose.steps, reviewSnippet: result.compose.reviewSnippet, quote: result.compose.quote,
    trust: result.template?.trust ?? "light",
    format,
  } : null;

  const tplName = (id: string) => catalog.find((t) => t.id === id)?.nameAr ?? id;

  return (
    <div className="min-h-screen space-y-6 bg-muted-bg p-6" dir="rtl">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="success">المحتوى المرئي</Badge>
        <h1 className="text-lg font-bold">المركز اليومي — من المصدر الحقيقي إلى النشر</h1>
        {aiStatus && (
          <span className="rounded-full bg-card px-3 py-1 text-[11px] text-muted">
            الذكاء: {aiStatus.configured ? `OpenAI مهيأ (${aiStatus.provider})` : "التوليد الذاتي دون مفتاح (احتياطي يعمل)"}
          </span>
        )}
        <button onClick={() => setShowHistory(true)} className="ms-auto rounded-full border border-border px-4 py-1.5 text-xs font-bold text-primary">سجل المحتوى ({history.length})</button>
      </div>

      {/* Daily brief */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-black">ماذا أنشر اليوم؟</h2>
          <Button onClick={loadBrief} disabled={busy !== "idle"}>اقتراح من السجل والكتالوج</Button>
        </div>
        {brief?.suggestion && (
          <div className="mt-2 rounded-xl bg-card p-3 text-xs">
            <p><b>المصدر:</b> {brief.suggestion.sourceType} · {brief.suggestion.sourceId} — <b>الهدف:</b> {brief.suggestion.objective} — <b>القالب:</b> {brief.suggestion.templateId}</p>
            <p className="mt-1 text-muted">السبب: {brief.suggestion.reasonAr}</p>
            <button onClick={applyBrief} className="mt-2 rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-white">اعتماد هذا المقترح</button>
          </div>
        )}
        {brief?.freeformAdvised && (
          <p className="mt-2 text-[11px] font-bold text-warning">{brief.freeformReasonAr} — جرّب وضع «مفهوم حر».</p>
        )}
      </Card>

      {error && <div className="rounded-xl border border-error/30 bg-error/5 p-3 text-sm font-bold text-error">{error}</div>}

      {/* 1. Source */}
      <Card>
        <h2 className="mb-3 text-sm font-black">1) اختر المصدر الحقيقي</h2>
        <div className="flex flex-wrap gap-2">
          {SOURCE_TABS.map((t) => (
            <button key={t.id} onClick={() => setSourceType(t.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold ${sourceType === t.id ? "bg-primary text-white" : "border border-border"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={sourceId} onChange={(e) => setSourceId(e.target.value)}
            placeholder={SOURCE_TABS.find((t) => t.id === sourceType)?.hint}
            className="w-64 rounded-input border border-border bg-card px-3 py-2 text-sm" dir="ltr" />
          <Button onClick={recommend} disabled={busy !== "idle" || !sourceId.trim()}>
            {busy === "recommend" ? "جاري الفحص..." : "فحص المصدر + توصية AI"}
          </Button>
          {sourceInfo && (
            <span className="flex items-center gap-2 text-xs">
              {sourceInfo.image && <img src={sourceInfo.image} alt="" className="h-8 w-8 rounded object-contain bg-white" />}
              <b>{sourceInfo.nameAr}</b>
              <span className="text-muted">({sourceInfo.productCount} منتج)</span>
            </span>
          )}
        </div>
        {missing.length > 0 && (
          <p className="mt-2 text-[11px] text-warning">بيانات ناقصة لن نختلقها: {missing.join("، ")}</p>
        )}
      </Card>

      {/* Research (real fetch, inspiration only) */}
      <Card>
        <h2 className="mb-2 text-sm font-black">بحث ويب حقيقي (اختياري — للمفهوم الحر)</h2>
        <p className="mb-2 text-[11px] text-muted">الصق حتى 3 روابط لمصادر تثق بها (مقال مكونات، صيحة جمالية). يُجلب النص فعلياً من الخادم ويُستخدم كإلهام فقط — حقائق المتجر تبقى المرجع الوحيد ولا تُستبدل أبداً.</p>
        <div className="flex flex-wrap items-center gap-2">
          <input value={researchUrls} onChange={(e) => setResearchUrls(e.target.value)}
            placeholder="https://example.com/article ..." dir="ltr"
            className="min-w-64 flex-1 rounded-input border border-border bg-card px-3 py-2 text-xs" />
          <Button onClick={fetchResearch} disabled={busy !== "idle"}>جلب البحث</Button>
          {research.length > 0 && (
            <button onClick={() => { setResearch([]); setResearchNote(null); }} className="rounded-full border border-border px-3 py-1.5 text-[11px] font-bold">إزالة ({research.length})</button>
          )}
        </div>
        {researchNote && <p className="mt-2 text-[11px] text-muted">{researchNote}</p>}
        {research.length > 0 && (
          <ul className="mt-2 space-y-1 text-[11px]">
            {research.map((r) => (
              <li key={r.source} className="rounded-lg bg-card p-2" dir="ltr">✓ {r.source} <span className="text-muted">({r.statements.length} مقتطفات)</span></li>
            ))}
          </ul>
        )}
      </Card>

      {/* 2. Platform + objective */}
      <Card>
        <h2 className="mb-3 text-sm font-black">2) المنصة والهدف</h2>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((pl) => (
            <button key={pl.id} onClick={() => setPlatform(pl.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold ${platform === pl.id ? "bg-primary text-white" : "border border-border"}`}>
              {pl.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {OBJECTIVES.map((o) => (
            <button key={o.id} onClick={() => setObjective(o.id)}
              className={`rounded-full px-3 py-1 text-[11px] font-bold ${objective === o.id ? "bg-accent text-primary-950" : "border border-border"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </Card>

      {/* 3. Template */}
      <Card>
        <h2 className="mb-3 text-sm font-black">3) القالب — يدوي أو توصية AI</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <button onClick={() => setMode("ai")} className={`rounded-full px-4 py-1.5 text-xs font-bold ${mode === "ai" ? "bg-primary text-white" : "border border-border"}`}>توصية AI</button>
          <button onClick={() => setMode("manual")} className={`rounded-full px-4 py-1.5 text-xs font-bold ${mode === "manual" ? "bg-primary text-white" : "border border-border"}`}>اختيار يدوي (35 قالب)</button>
          <button onClick={() => setMode("free")} className={`rounded-full px-4 py-1.5 text-xs font-bold ${mode === "free" ? "bg-accent text-primary-950" : "border border-border"}`}>مفهوم حر — بدون قالب</button>
        </div>
        {mode === "free" && (
          <p className="mb-2 rounded-xl bg-accent/10 p-2 text-[11px]">الوضع الحر: الذكاء يبتكر زاوية وهيكلاً جديداً لا يعتمد على أي قالب — مع نفس الضوابط (حقائق موثقة، صور حقيقية، هوية لومينوس).</p>
        )}
        {mode === "ai" ? (
          recs.length === 0
            ? <p className="text-xs text-muted">اضغط «فحص المصدر + توصية AI» أولاً لترشيح أفضل 3 قوالب بالأسباب.</p>
            : <div className="space-y-2">
              {recs.map((r, i) => (
                <button key={r.templateId} onClick={() => setTemplateId(r.templateId)}
                  className={`block w-full rounded-xl border p-3 text-start ${templateId === r.templateId ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
                  <span className="text-xs font-black">{i + 1}. {r.template?.nameAr ?? tplName(r.templateId)} ({r.templateId}) — نقاط {r.score}</span>
                  <span className="mt-1 block text-[11px] text-muted">السبب: {r.reasonAr}</span>
                </button>
              ))}
            </div>
        ) : (
          <div className="space-y-3">
            {TEMPLATE_GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-1 text-[11px] font-black text-muted">{g.title}</p>
                <div className="flex flex-wrap gap-1.5">
                  {g.ids.map((id) => (
                    <button key={id} onClick={() => setTemplateId(id)} title={tplName(id)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${templateId === id ? "bg-primary text-white" : "border border-border"}`}>
                      {id} · {tplName(id)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <Button onClick={generate} disabled={busy !== "idle" || !sourceId.trim()} className="mt-4 w-full">
          {busy === "generate" ? "جاري التوليد..." : mode === "free" ? "ابتكر مفهوماً حراً" : `ولّد المحتوى (${templateId} · ${tplName(templateId)})`}
        </Button>
      </Card>

      {/* 4. Preview + edit */}
      {result && composeInput && (
        <Card>
          <h2 className="mb-3 text-sm font-black">4) المعاينة والتحرير</h2>
          {result.repeat.noticesAr.length > 0 && (
            <div className="mb-2 rounded-xl bg-warning/10 p-2 text-[11px] font-bold text-warning">
              ضد التكرار (خصم {result.repeat.penalty}): {result.repeat.noticesAr.join("؛ ")}
              {result.repeat.tooSoon && " — نفس المحتوى نُشر قبل يومين!"}
            </div>
          )}
          {result.copy.warningsAr.length > 0 && (
            <div className="mb-2 rounded-xl bg-card border border-border p-2 text-[11px] text-muted">{result.copy.warningsAr.join("؛ ")}</div>
          )}
          {result.concept && (
            <div className="mb-2 rounded-xl bg-accent/10 p-2 text-[11px]">
              <p><b>المفهوم الحر:</b> {result.concept.angleAr} — هيكل {result.concept.structure} — {result.concept.format}</p>
              <p className="text-muted">{result.concept.emphasisAr}</p>
              <p className="text-muted">السبب: {result.concept.reasonAr} (المحرك: {result.concept.engine === "openai" ? "OpenAI" : "ذاتي"})</p>
            </div>
          )}
          {result.researchUsed && result.researchUsed.length > 0 && (
            <div className="mb-2 rounded-xl border border-border p-2 text-[11px] text-muted">
              مصادر بحث مستخدمة (إلهام فقط): {result.researchUsed.map((r) => r.url).join("، ")}
            </div>
          )}
          <div className="flex gap-2 text-[11px]">
            {(["1:1", "4:5", "9:16"] as const).map((f) => (
              <button key={f} onClick={() => setFormat(f)} className={`rounded-full px-3 py-1 font-bold ${format === f ? "bg-primary text-white" : "border border-border"}`}>{f}</button>
            ))}
          </div>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div ref={previewRef} className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-border">
              <VisualComposer input={composeInput} />
            </div>
              <div className="space-y-2">
                <label className="text-xs font-bold">الخطاف<input value={edit.hook} onChange={(e) => setEdit({ ...edit, hook: e.target.value })} className="mt-1 w-full rounded-input border border-border bg-card px-3 py-2 text-sm" /></label>
                <label className="text-xs font-bold">العنوان<input value={edit.headline} onChange={(e) => setEdit({ ...edit, headline: e.target.value })} className="mt-1 w-full rounded-input border border-border bg-card px-3 py-2 text-sm" /></label>
                <label className="text-xs font-bold">العنوان الفرعي<input value={edit.subheadline} onChange={(e) => setEdit({ ...edit, subheadline: e.target.value })} className="mt-1 w-full rounded-input border border-border bg-card px-3 py-2 text-sm" /></label>
                <label className="text-xs font-bold">النص (إن وجد)<textarea value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} className="mt-1 w-full rounded-input border border-border bg-card px-3 py-2 text-sm" rows={2} /></label>
                <label className="text-xs font-bold">الزر<input value={edit.cta} onChange={(e) => setEdit({ ...edit, cta: e.target.value })} className="mt-1 w-full rounded-input border border-border bg-card px-3 py-2 text-sm" /></label>
                <label className="text-xs font-bold">التسمية التوضيحية<textarea value={edit.caption} onChange={(e) => setEdit({ ...edit, caption: e.target.value })} className="mt-1 w-full rounded-input border border-border bg-card px-3 py-2 text-sm" rows={4} /></label>
                <label className="text-xs font-bold">الهاشتاغات<input value={edit.hashtags} onChange={(e) => setEdit({ ...edit, hashtags: e.target.value })} className="mt-1 w-full rounded-input border border-border bg-card px-3 py-2 text-sm" placeholder="#عناية_بالبشرة #LuminousDerma" /></label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={exportPng} disabled={busy === "export"}>{busy === "export" ? "جاري التصدير..." : "تصدير PNG"}</Button>
                <Button onClick={generate} disabled={busy !== "idle"}>إعادة التوليد (صياغة مختلفة)</Button>
                <Button onClick={saveDraft} disabled={busy !== "idle" || !!draftId}>حفظ كمسودة للمراجعة</Button>
              </div>
              {draftId && (
                <p className="text-xs font-bold text-success">
                  حُفظت في مسار المراجعة — <Link href="/admin/ai/content/items" className="underline">فتح عناصر المحتوى للاعتماد والجدولة والنشر</Link>
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 5. Publishing honesty */}
      <Card>
        <h2 className="mb-2 text-sm font-black">5) حالة النشر الحقيقية</h2>
        <ul className="space-y-1 text-xs">
          <li><Badge variant="success">الموقع</Badge> نشر حقيقي عبر Content-Ops ← يُنفذ من صفحة العناصر/التقويم.</li>
          <li><Badge variant="warning">انستغرام/فيسبوك: NOT CONFIGURED</Badge> المطلوب: تطبيق Meta + ربط صفحة فيسبوك بحساب انستغرام تجاري + صلاحية <span dir="ltr">instagram_content_publish</span> + توكن طويل العمر (60 يوم) + App Review.</li>
          <li><Badge variant="warning">تيك توك: NOT CONFIGURED</Badge> المطلوب: تطبيق TikTok مستقل + Content Posting API + موافقة المنصة.</li>
        </ul>
        <p className="mt-2 text-[11px] text-muted">النشر المجدول يُنفذ عبر زر «نشر المستحق» في التقويم/المركز حالياً — والتشغيل التلقائي عبر cron بعد تجهيز الاستضافة (vercel.json مُضاف).</p>
      </Card>

      <Modal open={showHistory} onClose={() => setShowHistory(false)} title="سجل المحتوى المرئي">
        <div className="max-h-96 space-y-2 overflow-auto">
          {history.length === 0 && <p className="text-xs text-muted">لا سجلات بعد.</p>}
          {history.map((h) => (
            <div key={h.id} className="flex items-center gap-2 rounded-xl border border-border p-2 text-xs">
              <span className="font-black">{h.templateId}</span>
              <span className="text-muted">{h.platform}</span>
              <Badge variant={h.status === "PUBLISHED" ? "success" : h.status === "FAILED" ? "error" : "neutral"}>{h.status}</Badge>
              <span className="ms-auto text-muted">{h.createdAt.slice(0, 10)}</span>
              {h.contentItemId && <Link href="/admin/ai/content/items" className="text-primary underline">العنصر</Link>}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
