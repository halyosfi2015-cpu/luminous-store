"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, Send, RefreshCw, AlertCircle, CheckCircle, Database, BarChart3, TrendingUp, Users, Package, Clock } from "lucide-react";
import { LoadingState, EmptyState } from "@/components/admin/ui/States";
import CustomerBehavior from "@/components/admin/ai/CustomerBehavior";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { useAdminGuard } from "@/src/admin/useAdminGuard";

export type AIScope = "commerce" | "customer" | "product";
export type AnalyticsRange = "today" | "7d" | "30d" | "90d";

interface AIError {
  code: string;
  message: string;
}

interface StructuredFact {
  statement: string;
  source: string;
  value: number | string | null;
}

interface StructuredInsight {
  title: string;
  description: string;
}

interface StructuredRecommendation {
  action: string;
  rationale: string;
}

interface DataSourceRef {
  name: string;
  label: string;
}

interface AIMetrics {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  latencyMs: number;
  model: string;
}

interface AIResponse {
  answer: string;
  summary: string;
  facts: StructuredFact[];
  insights: StructuredInsight[];
  recommendations: StructuredRecommendation[];
  confidence: "high" | "medium" | "low";
  dataSources: DataSourceRef[];
  contextRange: string;
  contextVersion: string;
  generatedAt: string;
  promptVersion: string;
  model: string;
  metrics: AIMetrics;
}

interface AIAskResult {
  success: boolean;
  response: AIResponse | null;
  error: AIError | null;
}

const SCOPE_OPTIONS: { key: AIScope; ar: string; en: string; icon: typeof Brain }[] = [
  { key: "commerce", ar: "التجارة", en: "Commerce", icon: BarChart3 },
  { key: "customer", ar: "العميل", en: "Customer", icon: Users },
  { key: "product", ar: "المنتج", en: "Product", icon: Package },
];

const RANGE_OPTIONS: { key: AnalyticsRange; ar: string; en: string }[] = [
  { key: "today", ar: "اليوم", en: "Today" },
  { key: "7d", ar: "7 أيام", en: "Last 7 days" },
  { key: "30d", ar: "30 يومًا", en: "Last 30 days" },
  { key: "90d", ar: "90 يومًا", en: "Last 90 days" },
];

const QUICK_INSIGHTS: { label: string; question: string; scope: AIScope; range: AnalyticsRange }[] = [
  { label: "نظرة عامة على المبيعات", question: "ما هي أهم المؤشرات المالية في الفترة الأخيرة؟", scope: "commerce", range: "7d" },
  { label: "صحة المسار", question: "أين يترك الزوار المتجر دون إتمام الشراء؟", scope: "commerce", range: "30d" },
  { label: "شرائح العملاء", question: "كيف توزعت شرائح العملاء في الأسبوع الماضي؟", scope: "commerce", range: "7d" },
  { label: "نيّة الشراء", question: "أي فئة عملاء تمتلك أعلى نيّة شراء؟", scope: "commerce", range: "7d" },
  { label: "أداء المنتجات", question: "أي منتجات لديها مشاهدات عالية لكن تحويل ضعيف؟", scope: "commerce", range: "30d" },
  { label: "أداء الفئات", question: "ما هي أكثر الفئات طلباً وتحويل؟", scope: "commerce", range: "30d" },
  { label: "تسرب السلة", question: "ما معدل ترك السلة وكيف يمكن تحسينه؟", scope: "commerce", range: "30d" },
];

const CONFIDENCE_BADGE_VARIANT: Record<string, "primary" | "secondary" | "accent" | "success" | "warning" | "error" | "neutral" | "outline"> = {
  high: "success",
  medium: "warning",
  low: "error",
};

const CONFIDENCE_LABELS: Record<string, { ar: string; en: string }> = {
  high: { ar: "عالية", en: "High" },
  medium: { ar: "متوسطة", en: "Medium" },
  low: { ar: "منخفضة", en: "Low" },
};

function formatTokens(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("ar-YE");
}

function formatLatency(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  return `${ms} مللي ثانية`;
}

export default function AIControlCenter() {
  const { allowed } = useAdminGuard("ai");
  const [question, setQuestion] = useState("");
  const [scope, setScope] = useState<AIScope>("commerce");
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [result, setResult] = useState<AIAskResult | null>(null);

  async function checkConfig(): Promise<boolean> {
    try {
      const res = await fetch("/api/admin/ai/ask", { method: "GET" });
      if (!res.ok) return false;
      const json = await res.json().catch(() => null);
      return json?.configured === true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    let cancelled = false;
    void checkConfig().then((configured) => {
      if (!cancelled) setIsConfigured(configured);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!question.trim() || isSubmitting || !isConfigured) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          scope,
          range,
          customerId: scope === "customer" ? customerId.trim() : null,
          productId: scope === "product" ? productId.trim() : null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && json.response) {
        setResult({ success: true, response: json.response as AIResponse, error: null });
      } else if (res.status === 401) {
        setResult({ success: false, response: null, error: { code: "unauthorized", message: "غير مخول" } });
      } else {
        setResult({
          success: false,
          response: null,
          error: json?.error ?? { code: "ai_provider_error", message: `خطأ من الخادم (HTTP ${res.status})` },
        });
      }
    } catch (e) {
      setResult({
        success: false,
        response: null,
        error: { code: "internal_error", message: (e as Error).message ?? "فشل الاتصال بالخادم" },
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [question, scope, range, customerId, productId, isSubmitting, isConfigured]);

  const handleQuickInsight = useCallback((q: string, s: AIScope, r: AnalyticsRange) => {
    setQuestion(q);
    setScope(s);
    setRange(r);
  }, []);

  const resetForm = useCallback(() => {
    setQuestion("");
    setScope("commerce");
    setRange("7d");
    setCustomerId("");
    setProductId("");
    setResult(null);
  }, []);

  if (!allowed)
    return (
      <EmptyState
        title="ليس لديك صلاحية الوصول"
        description="دورك الحالي لا يملك صلاحية عرض مركز تحكم الذكاء التجاري."
      />
    );

  if (isConfigured === null) {
    return (
      <div className="space-y-6" dir="rtl">
        <LoadingState label="جارٍ فحص إعدادات الذكاء الاصطناعي..." />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="space-y-6" dir="rtl">
        <Header />

        <Card>
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted-bg text-muted">
              <Database size={28} />
            </div>
            <h3 className="text-lg font-bold text-foreground">الذكاء الاصطناعي غير مُهيأ</h3>
            <p className="max-w-md text-sm text-muted">
              لم يتم تهيئة مفتاح API الخاص بمزوّد الذكاء الاصطناعي. أضف <code className="rounded bg-muted-bg px-1.5 py-0.5 font-mono text-xs">AI_API_KEY</code> إلى متغيّرات بيئة الخادم لتفعيل هذه الميزة.
            </p>
          </div>
        </Card>

        <QuickInsightCards onQuick={(q, s, r) => handleQuickInsight(q, s, r)} disabled />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Header />
      <CustomerBehavior />

      {!result && (
        <>
          <Card>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  النطاق <span className="text-muted">(Scope)</span>
                </label>
              <div className="flex flex-wrap gap-2">
                {SCOPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setScope(opt.key)}
                      className={`flex items-center gap-1.5 rounded-input border px-3 py-1.5 text-xs font-medium transition-colors ${
                        scope === opt.key
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted hover:bg-muted-bg"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {opt.ar}
                    </button>
                  );
                })}
              </div>
            </div>

            {scope === "customer" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">معرّف العميل</label>
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="أدخل معرّف العميل (UUID)"
                  className="w-full rounded-input border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>
            )}

            {scope === "product" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">معرّف المنتج</label>
                <input
                  type="text"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  placeholder="أدخل معرّف المنتج (UUID)"
                  className="w-full rounded-input border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">الفترة الزمنية</label>
              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setRange(opt.key)}
                    className={`rounded-input border px-3 py-1.5 text-xs font-medium transition-colors ${
                      range === opt.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted hover:bg-muted-bg"
                    }`}
                  >
                    {opt.ar}
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              label="سؤالك"
              placeholder="اسأل عن أداء المنتجات، نيّة العملاء، تسرب السلة، أو أي موضوع تجاري..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              hint="اسأل سؤالاً محدداً. سيستخدم الذكاء البيانات المتوفرة في التحليلات الخاصة بك."
            />

            <div className="flex items-center justify-between">
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!question.trim() || isSubmitting || (scope === "customer" && !customerId.trim()) || (scope === "product" && !productId.trim())}
                loading={isSubmitting}
                size="md"
              >
                <Send className="h-4 w-4" />
                إرسال السؤال
              </Button>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-muted hover:text-foreground"
              >
                مسح
              </button>
            </div>
          </div>
        </Card>

        <QuickInsightCards onQuick={handleQuickInsight} />
        </>
      )}

      {isSubmitting && (
        <Card>
          <LoadingState label="يحلل الذكاء التجاري بياناتك..." />
        </Card>
      )}

      {result && !isSubmitting && (
        <ResponseCard result={result} onRetry={handleSubmit} onReset={resetForm} isSubmitting={isSubmitting} />
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Brain size={20} className="text-primary" />
          الذكاء التجاري
        </h1>
        <p className="text-xs text-muted">مساعد ذكاء اصطناعي لتحليل بيانات التجارة بناءً على تحليلات موثوقة</p>
      </div>
    </div>
  );
}

function ResponseCard({
  result,
  onRetry,
  onReset,
  isSubmitting,
}: {
  result: AIAskResult;
  onRetry: () => void;
  onReset: () => void;
  isSubmitting: boolean;
}) {
  if (result.error) {
    const isAuthError = result.error.code === "unauthorized";
    const isConfiguredError = result.error.code === "ai_not_configured";
    const isTimeout = result.error.code === "ai_timeout";
    const isRateLimit = result.error.code === "rate_limited";

    let title = "خطأ في الذكاء الاصطناعي";
    let description = result.error.message;

    if (isConfiguredError) {
      title = "غير مُهيأ";
      description = "مفتاح API الخاص بالذكاء الاصطناعي غير مُهيأ.";
    } else if (isTimeout) {
      title = "انتهت مهلة الاتصال";
      description = "استغرق الرد يأخذ وقتاً أطول من المتوقع. حاول سؤالاً أقل تعقيداً.";
    } else if (isRateLimit) {
      title = "تم تطبيق الحد الأقصى للطلبات";
      description = "لقد أرسلت طلبات كثيرة جداً. يرجى الانتظار قليلاً والمحاولة مرة أخرى.";
    } else if (isAuthError) {
      title = "غير مخول";
      description = "جلستك منتهية أو غير مصرح لك بهذه الصفحة.";
    }

    return (
      <Card>
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-soft text-error">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <p className="max-w-md text-sm text-muted">{description}</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onRetry} disabled={isSubmitting}>
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </Button>
            <Button variant="outline" size="sm" onClick={onReset}>
              سؤال جديد
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!result.response) return null;

  const resp = result.response;
  const confidenceLabel = CONFIDENCE_LABELS[resp.confidence] ?? { ar: resp.confidence, en: resp.confidence };

  return (
    <Card>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-foreground mb-1">الإجابة</h2>
            <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">{resp.answer || "(لا تتوفر إجابة)"}</p>
          </div>
          <Badge variant={CONFIDENCE_BADGE_VARIANT[resp.confidence] ?? "error"}>
            {confidenceLabel.ar}
          </Badge>
        </div>

        {resp.summary && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-1.5 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-muted" />
              ملخص
            </h3>
            <p className="text-sm text-muted leading-relaxed">{resp.summary}</p>
          </div>
        )}

        {resp.facts.length > 0 && (
          <FactList facts={resp.facts} />
        )}

        {resp.insights.length > 0 && (
          <InsightList insights={resp.insights} />
        )}

        {resp.recommendations.length > 0 && (
          <RecommendationList recs={resp.recommendations} />
        )}

        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted">
            <Badge variant="neutral" className="text-[9px]">{resp.model}</Badge>
            <Badge variant="neutral" className="text-[9px]">{resp.promptVersion}</Badge>
            <Badge variant="neutral" className="text-[9px]">سياق: {resp.contextVersion}</Badge>
            <span>نطاق السياق: {resp.contextRange || "—"}</span>
            <span>تم في: {new Date(resp.generatedAt).toLocaleString("ar-YE")}</span>
            <span>المدة: {formatLatency(resp.metrics?.latencyMs ?? 0)}</span>
          </div>

          {resp.metrics?.totalTokens !== null && (
            <div className="text-[10px] text-muted">
              رموز: {formatTokens(resp.metrics?.inputTokens)} إدخال / {formatTokens(resp.metrics?.outputTokens)} إخراج / {formatTokens(resp.metrics?.totalTokens)} إجمالي
            </div>
          )}

          {resp.dataSources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-muted">مصادر البيانات:</span>
              {resp.dataSources.map((ds) => (
                <Badge key={ds.name} variant="neutral" className="text-[9px]">
                  {ds.label}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onRetry} disabled={isSubmitting}>
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            سؤال جديد
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FactList({ facts }: { facts: StructuredFact[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-foreground flex items-center gap-1.5">
        <CheckCircle size={14} className="text-success" />
        الحقائق
      </h3>
      <ul className="space-y-1.5">
        {facts.map((fact, i) => (
          <li key={i} className="flex items-start gap-2 rounded-input border border-border bg-muted-bg/30 p-2 text-xs">
            <span className="text-muted">•</span>
            <span className="text-foreground">{fact.statement}</span>
            {fact.value !== null && (
              <Badge variant="primary" className="text-[8px]">{fact.value}</Badge>
            )}
            <span className="text-[8px] text-muted">(مصدر: {fact.source})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InsightList({ insights }: { insights: StructuredInsight[] }) {
  if (insights.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-foreground">التفسيرات</h3>
      <ul className="space-y-1.5">
        {insights.map((insight, i) => (
          <li key={i} className="rounded-input border border-border bg-muted-bg/30 p-2 text-xs">
            <span className="font-medium text-foreground">{insight.title}:</span>{" "}
            <span className="text-muted">{insight.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecommendationList({ recs }: { recs: StructuredRecommendation[] }) {
  if (recs.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-foreground">توصيات (إرشادية فقط)</h3>
      <ul className="space-y-1.5">
        {recs.map((rec, i) => (
          <li key={i} className="rounded-input border border-warning-border bg-warning-soft p-2 text-xs">
            <span className="font-medium text-warning-fg">{rec.action}</span>
            <p className="mt-0.5 text-muted">{rec.rationale}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuickInsightCards({
  onQuick,
  disabled,
}: {
  onQuick: (question: string, scope: AIScope, range: AnalyticsRange) => void;
  disabled?: boolean;
}) {
  return (
    <Card>
      <h3 className="mb-3 text-sm font-bold text-foreground">بطاقات رؤى سريعة</h3>
      <p className="mb-3 text-[10px] text-muted">انقر على بطاقة لتنفيذ استعلام محدد مدعوم ببيانات حقيقية.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_INSIGHTS.map((card) => (
          <button
            key={card.label}
            type="button"
            disabled={disabled}
            onClick={() => onQuick(card.question, card.scope, card.range)}
            className="flex flex-col items-center gap-1.5 rounded-card border border-border bg-muted-bg/30 p-3 text-center text-xs transition-colors hover:bg-muted-bg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Clock size={14} className="text-muted" />
            <span className="font-medium text-foreground">{card.label}</span>
            <span className="text-[9px] text-muted">{card.question}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
