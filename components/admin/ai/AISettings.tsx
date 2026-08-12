"use client";

import { useState, useEffect } from "react";
import { Settings, Brain, BarChart3, Users, Gift, Target, RefreshCw, Save, Info } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { LoadingState, EmptyState, ErrorState } from "@/components/admin/ui/States";
import { useAdminGuard } from "@/src/admin/useAdminGuard";

interface AIAvailable {
  configured: boolean;
  provider: string;
  model: string;
}

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
  icon: Icon,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  icon: typeof Settings;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-input bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <div className="font-medium text-foreground">{label}</div>
          <div className="text-[11px] text-muted">{description}</div>
        </div>
      </div>
      <label className="relative inline-flex h-6 w-10 items-center rounded-full transition-colors">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={`after:absolute after:top-0.5 after:start-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-all ${
            enabled ? "bg-primary peer-checked:translate-x-4" : "bg-gray-300"
          }`}
        />
      </label>
    </div>
  );
}

export default function AISettings() {
  const { allowed } = useAdminGuard("ai");
  const [aiAvailable, setAiAvailable] = useState<AIAvailable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    tracking: true,
    recommendations: true,
    personalization: true,
    purchaseIntent: true,
    aiInsights: true,
    confidenceThreshold: 0.7,
  });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function fetchData() {
      try {
        const [askRes, settingsRes] = await Promise.all([
          fetch("/api/admin/ai/ask", { method: "GET", signal: controller.signal }),
          fetch("/api/admin/ai/settings", { method: "GET", signal: controller.signal }),
        ]);
        if (!askRes.ok || !settingsRes.ok) throw new Error(`HTTP ${askRes.status} / ${settingsRes.status}`);
        const [askJson, settingsJson] = await Promise.all([askRes.json(), settingsRes.json()]);
        if (!cancelled && !controller.signal.aborted) {
          setAiAvailable({
            configured: askJson.configured ?? false,
            provider: askJson.provider ?? "غير مُحدد",
            model: askJson.model ?? "غير مُحدد",
          });
          setSettings((prev) => ({
            ...prev,
            tracking: settingsJson.tracking ?? prev.tracking,
            recommendations: settingsJson.recommendations ?? prev.recommendations,
            personalization: settingsJson.personalization ?? prev.personalization,
            purchaseIntent: settingsJson.purchaseIntent ?? prev.purchaseIntent,
            aiInsights: settingsJson.aiInsights ?? prev.aiInsights,
            confidenceThreshold: settingsJson.confidenceThreshold ?? prev.confidenceThreshold,
          }));
        }
      } catch (e) {
        if (!cancelled && !controller.signal.aborted) {
          setError((e as Error).message);
        }
      } finally {
        if (!cancelled && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchData();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const handleToggle = (key: keyof typeof settings) => (value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) {
    return (
      <EmptyState
        title="ليس لديك صلاحية الوصول"
        description="دورك الحالي لا يملك صلاحية عرض مركز تحكم الذكاء التجاري."
      />
    );
  }

  if (loading) return <LoadingState label="جارٍ فحص إعدادات الذكاء..." />;
  if (error) return <ErrorState title="خطأ في التحميل" description={error} />;

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Settings size={20} className="text-primary" />
          إعدادات الذكاء الاصطناعي
        </h1>
        <p className="text-xs text-muted">إدارة تشغيل وإيقاف أنظمة الذكاء الاصطناعي</p>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-foreground">حالة الذكاء الاصطناعي</h3>
            <p className="text-[11px] text-muted mt-0.5">
              المزوّد: {aiAvailable?.provider ?? "غير مُحدد"} | النموذج: {aiAvailable?.model ?? "غير مُحدد"}
            </p>
          </div>
          <Badge variant={aiAvailable?.configured ? "success" : "error"} className="text-[10px]">
            {aiAvailable?.configured ? "مُهيأ" : "غير مُهيأ"}
          </Badge>
        </div>
        {!aiAvailable?.configured && (
          <p className="mt-2 text-[11px] text-muted">
            لتفعيل الذكاء الاصطناعي القيادي، أضف <code className="rounded bg-muted-bg px-1 py-0.5">AI_API_KEY</code> إلى متغيّرات البيئة الخادم.
          </p>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Brain size={14} className="text-muted" />
          التحكم في الميزات
        </h3>
        <div className="space-y-1 divide-y divide-border">
          <ToggleRow
            label="تتبع السلوك"
            description="تسجيل أحداث العملاء (page_view, product_view، إلخ)"
            enabled={settings.tracking}
            onChange={handleToggle("tracking")}
            icon={BarChart3}
          />
          <ToggleRow
            label="التوصيات"
            description="نظام التوصية بالمنتجات (similar, complementary, personalized)"
            enabled={settings.recommendations}
            onChange={handleToggle("recommendations")}
            icon={Gift}
          />
          <ToggleRow
            label="التخصيص"
            description="عرض المحتوى بناءً على قواعد التخصيص"
            enabled={settings.personalization}
            onChange={handleToggle("personalization")}
            icon={Target}
          />
          <ToggleRow
            label="نية الشراء"
            description="حساب نية الشراء بناءً على السلوك الإضافي"
            enabled={settings.purchaseIntent}
            onChange={handleToggle("purchaseIntent")}
            icon={Users}
          />
          <ToggleRow
            label="رؤى الذكاء الاصطناعي"
            description="استخدام الذكاء الاصطناعي لتحليل البيانات وإنشاء رؤى"
            enabled={settings.aiInsights}
            onChange={handleToggle("aiInsights")}
            icon={Brain}
          />
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Target size={14} className="text-muted" />
          إعدادات الثقة
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              حد الثقة الافتراضي: {Math.round(settings.confidenceThreshold * 100)}%
            </label>
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.05}
              value={settings.confidenceThreshold}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, confidenceThreshold: Number(e.target.value) }))
              }
              className="w-full"
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted">
              <span>منخفض (10%)</span>
              <span>عالي (90%)</span>
            </div>
          </div>
          <p className="text-[10px] text-muted">
            سيتم تطبيق هذا الحد على جميع الرؤى المنبثقة الذكية في مرحقات لاحقة.
            حاليًا، جميع الرؤى تعرض بثقتها الأصلية.
          </p>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Info size={14} className="text-muted" />
          ملاحظات أمان
        </h3>
        <ul className="space-y-1 text-xs text-muted">
          <li>• الذكاء الاصطناعي لا ينفذ أي إجراءات تلقائية — يقترح فقط</li>
          <li>• لا يتم إرسال أي رسائل أو حملات تلقائية في هذه المرحلة</li>
          <li>• جميع الإعدادات تنطبق على الواجهة الإدارية فقط</li>
          <li>• لا توجد بيانات مخزنة من الذكاء الاصطناعي في قاعدة البيانات</li>
        </ul>
      </Card>

      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-3.5 w-3.5" />
          {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => {}}>
          <RefreshCw className="h-3.5 w-3.5" />
          إعادة تعيين
        </Button>
      </div>
    </div>
  );
}
