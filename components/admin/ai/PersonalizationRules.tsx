"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, Plus, Edit, Trash2, ToggleRight } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { LoadingState, EmptyState, ErrorState } from "@/components/admin/ui/States";
import { useAdminGuard } from "@/src/admin/useAdminGuard";
import RuleEditor from "./RuleEditor";
import type {
  PersonalizationRule,
  PersonalizationActionType,
  PersonalizationConditionType,
} from "@/src/lib/analytics/personalization";

const ACTION_LABELS: Record<PersonalizationActionType, { ar: string; en: string }> = {
  reorder_products: { ar: "إعادة ترتيب المنتجات", en: "Reorder Products" },
  filter_products: { ar: "تصفية المنتجات", en: "Filter Products" },
  show_banner: { ar: "عرض بنر إعلاني", en: "Show Banner" },
  hide_section: { ar: "إخفاء قسم", en: "Hide Section" },
  show_campaign: { ar: "عرض حملة", en: "Show Campaign" },
  reorder_recommendations: { ar: "إعادة ترتيب التوصيات", en: "Reorder Recommendations" },
  adjust_pricing_display: { ar: "تعديل عرض الأسعار", en: "Adjust Pricing Display" },
};

const CONDITION_LABELS: Record<PersonalizationConditionType, { ar: string; en: string }> = {
  segment: { ar: "شريحة", en: "Segment" },
  intent_level: { ar: "مستوى النية", en: "Intent Level" },
  customer_value: { ar: "قيمة العميل", en: "Customer Value" },
  category_interest: { ar: "اهتمام بالفئة", en: "Category Interest" },
  cart_status: { ar: "حالة السلة", en: "Cart Status" },
  recent_activity: { ar: "نشاط حديث", en: "Recent Activity" },
  purchase_history: { ar: "تاريخ المشتريات", en: "Purchase History" },
  session_property: { ar: "خاصية الجلسة", en: "Session Property" },
  geo_location: { ar: "الموقع الجغرافي", en: "Geo Location" },
  device_type: { ar: "نوع الجهاز", en: "Device Type" },
};

export default function PersonalizationRules() {
  const { allowed } = useAdminGuard("ai");
  const [rules, setRules] = useState<PersonalizationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<PersonalizationRule | null>(null);

  useEffect(() => {
    if (!allowed) return;

    const controller = new AbortController();
    let cancelled = false;

    async function fetchData() {
      if (controller.signal.aborted) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/ai/personalization", { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setRules(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchData();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [allowed]);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai/personalization");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRules(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = async (rule: PersonalizationRule, enabled: boolean) => {
    try {
      await fetch(`/api/admin/ai/personalization?id=${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      await loadRules();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (rule: PersonalizationRule) => {
    if (!confirm("هل أنت متأكد من حذف هذه القاعدة؟")) return;
    try {
      await fetch(`/api/admin/ai/personalization?id=${rule.id}`, { method: "DELETE" });
      await loadRules();
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    if (!editingRule) return;
    try {
      if (editingRule.id) {
        await fetch(`/api/admin/ai/personalization?id=${editingRule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingRule),
        });
      } else {
        await fetch("/api/admin/ai/personalization", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingRule),
        });
      }
      await loadRules();
      setEditingRule(null);
    } catch {
      // ignore
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

  if (loading) return <LoadingState label="جارٍ تحميل قواعد التخصيص..." />;
  if (error) return <ErrorState title="خطأ في التحميل" description={error} />;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Sparkles size={20} className="text-primary" />
            التخصيص
          </h1>
          <p className="text-xs text-muted">قواعد التخصيص وتخصيص التجربة حسب الشريحة والنية</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            setEditingRule({
              id: "",
              name: "",
              nameAr: "",
              conditions: [],
              actions: [],
              priority: 0,
              enabled: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
          }
        >
          <Plus className="h-3.5 w-3.5" />
          قاعدة جديدة
        </Button>
      </div>

      {editingRule && (
        <RuleEditor
          rule={editingRule}
          setRule={setEditingRule}
          onSave={handleSave}
          onCancel={() => setEditingRule(null)}
        />
      )}

      {rules.length > 0 ? (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{rule.nameAr || rule.name || rule.id}</h3>
                    <Badge variant={rule.enabled ? "success" : "neutral"} className="text-[9px]">
                      {rule.enabled ? "نشط" : "مغلق"}
                    </Badge>
                  </div>
                  {rule.description && (
                    <p className="mt-1 text-[11px] text-muted">{rule.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                    {rule.conditions.map((c, i) => (
                      <Badge key={i} variant="outline" className="text-[8px]">
                        {CONDITION_LABELS[c.type]?.ar ?? c.type}
                      </Badge>
                    ))}
                    •
                    <span className="text-muted">
                      الأولوية: {rule.priority}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
                    التنفيذ:{" "}
                    {rule.actions.map((a, i) => (
                      <span key={i} className="text-muted">
                        {ACTION_LABELS[a.type]?.ar ?? a.type}
                        {i < rule.actions.length - 1 && "، "}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingRule(rule)}
                    className="rounded p-1 text-muted hover:bg-muted-bg hover:text-foreground"
                    title="تعديل"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggle(rule, !rule.enabled)}
                    className="rounded p-1 text-muted hover:bg-muted-bg hover:text-foreground"
                    title={rule.enabled ? "إيقاف" : "تشغيل"}
                  >
                    <ToggleRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule)}
                    className="rounded p-1 text-muted hover:bg-muted-bg hover:text-error"
                    title="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="لا توجد قواعد تخصيص"
            description="ستظهر قواعد التخصيص هنا عند إنشائها. يمكنك إنشاء قاعدة جديدة بزر الزر أعلاه."
          />
        </Card>
      )}

      <Card>
        <h3 className="mb-2 text-sm font-bold text-foreground">ملاحظات أمنية</h3>
          <ul className="space-y-1 text-xs text-muted">
            <li>• لا يتم استخدام &#34;dark patterns&#34; أو &#34;scarcity&#34; وهمي أو رسائل مضللة</li>
            <li>• جميع القواعد تعمل على أساس &#34;اقتراح فقط&#34; داخل الواجهة الإدارية</li>
            <li>• لا تُنفَّذ أي إجراءات تلقائية على العملاء</li>
          </ul>
      </Card>
    </div>
  );
}
