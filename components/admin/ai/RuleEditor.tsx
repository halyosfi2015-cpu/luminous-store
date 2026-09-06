"use client";

import { Plus, Trash2, Save, X } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type {
  PersonalizationRule,
  PersonalizationCondition,
  PersonalizationAction,
  PersonalizationConditionType,
  PersonalizationActionType,
  PersonalizationConditionOperator,
} from "@/src/lib/analytics/personalization";

const CONDITION_TYPE_LABELS: Record<PersonalizationConditionType, string> = {
  segment: "شريحة",
  intent_level: "مستوى النية",
  customer_value: "قيمة العميل",
  category_interest: "اهتمام بالفئة",
  cart_status: "حالة السلة",
  recent_activity: "نشاط حديث",
  purchase_history: "تاريخ المشتريات",
  session_property: "خاصية الجلسة",
  geo_location: "الموقع الجغرافي",
  device_type: "نوع الجهاز",
};

const OPERATOR_LABELS: Record<PersonalizationConditionOperator, string> = {
  equals: "يساوي",
  not_equals: "لا يساوي",
  contains: "يحتوي على",
  not_contains: "لا يحتوي على",
  greater_than: "أكبر من",
  less_than: "أصغر من",
  in: "في",
  not_in: "ليس في",
  starts_with: "يبدأ بـ",
};

const ACTION_TYPE_LABELS: Record<PersonalizationActionType, string> = {
  reorder_products: "إعادة ترتيب المنتجات",
  filter_products: "تصفية المنتجات",
  show_banner: "عرض بنر إعلاني",
  hide_section: "إخفاء قسم",
  show_campaign: "عرض حملة",
  reorder_recommendations: "إعادة ترتيب التوصيات",
  adjust_pricing_display: "تعديل عرض الأسعار",
};

export interface RuleEditorProps {
  rule: PersonalizationRule;
  setRule: (rule: PersonalizationRule) => void;
  onSave?: () => void | Promise<void>;
  onCancel: () => void;
}

const OPERATOR_VALUES = ["equals", "not_equals", "contains", "greater_than", "less_than", "in", "not_in", "starts_with"];
const ACTION_TYPE_VALUES: PersonalizationActionType[] = [
  "reorder_products",
  "filter_products",
  "show_banner",
  "hide_section",
  "show_campaign",
  "reorder_recommendations",
  "adjust_pricing_display",
];

export default function RuleEditor({ rule, setRule, onSave, onCancel }: RuleEditorProps) {
  const updateRule = (patch: Partial<PersonalizationRule>) => {
    setRule({ ...rule, ...patch });
  };

  const addCondition = () => {
    const newCondition: PersonalizationCondition = {
      type: "segment",
      operator: "equals",
      value: "",
    };
    updateRule({ conditions: [...rule.conditions, newCondition] });
  };

  const updateCondition = (index: number, patch: Partial<PersonalizationCondition>) => {
    updateRule({
      conditions: rule.conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    });
  };

  const removeCondition = (index: number) => {
    updateRule({ conditions: rule.conditions.filter((_, i) => i !== index) });
  };

  const addAction = () => {
    const newAction: PersonalizationAction = {
      type: "show_banner",
      priority: 0,
      config: {},
    };
    updateRule({ actions: [...rule.actions, newAction] });
  };

  const updateAction = (index: number, patch: Partial<PersonalizationAction>) => {
    updateRule({
      actions: rule.actions.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    });
  };

  const removeAction = (index: number) => {
    updateRule({ actions: rule.actions.filter((_, i) => i !== index) });
  };

  return (
    <Card className="border-primary/50 bg-primary/5">
      <h3 className="mb-4 text-sm font-bold text-foreground">
        {rule.id ? "تعديل القاعدة" : "إنشاء قاعدة تخصيص"}
      </h3>

      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-foreground">الاسم (عربي)</label>
            <input
              type="text"
              value={rule.nameAr || ""}
              onChange={(e) => updateRule({ nameAr: e.target.value })}
              className="mt-1 w-full text-sm rounded-input border border-border bg-bg px-2 py-1.5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground">اسم (إنجليزي)</label>
            <input
              type="text"
              value={rule.name || ""}
              onChange={(e) => updateRule({ name: e.target.value })}
              className="mt-1 w-full text-sm rounded-input border border-border bg-bg px-2 py-1.5"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground">الوصف</label>
          <textarea
            value={rule.description || ""}
            onChange={(e) => updateRule({ description: e.target.value })}
            className="mt-1 w-full text-sm rounded-input border border-border bg-bg px-2 py-1.5"
            rows={2}
            placeholder="اختياري..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground">الأولوية</label>
            <input
              type="number"
              value={rule.priority}
              onChange={(e) => updateRule({ priority: Number(e.target.value) })}
              className="mt-1 w-full text-sm rounded-input border border-border bg-bg px-2 py-1.5"
              min={0}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(e) => updateRule({ enabled: e.target.checked })}
                className="rounded border-border"
              />
              <span className="text-foreground">فعال</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground">شرائح العملاء المستهدفة</label>
          <input
            type="text"
            value={rule.targetSegments?.join(", ") || ""}
            onChange={(e) =>
              updateRule({
                targetSegments: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            className="mt-1 w-full text-sm rounded-input border border-border bg-bg px-2 py-1.5"
            placeholder="new_customer, returning_customer, ..."
          />
        </div>

        <div className="pt-2">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground">الشروط ({rule.conditions.length})</h4>
            <Button variant="outline" size="sm" onClick={addCondition}>
              <Plus className="h-3 w-3" />
              إضافة شرط
            </Button>
          </div>
          <div className="space-y-2">
            {rule.conditions.map((condition, i) => (
              <ConditionRow
                key={i}
                condition={condition}
                onUpdate={(patch) => updateCondition(i, patch)}
                onRemove={() => removeCondition(i)}
              />
            ))}
            {rule.conditions.length === 0 && (
              <p className="text-[10px] text-muted">لم يتم إضافة أي شروط بعد</p>
            )}
          </div>
        </div>

        <div className="pt-2">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground">الإجراءات ({rule.actions.length})</h4>
            <Button variant="outline" size="sm" onClick={addAction}>
              <Plus className="h-3 w-3" />
              إضافة إجراء
            </Button>
          </div>
          <div className="space-y-2">
            {rule.actions.map((action, i) => (
              <ActionRow
                key={i}
                action={action}
                index={i}
                onUpdate={(patch) => updateAction(i, patch)}
                onRemove={() => removeAction(i)}
              />
            ))}
            {rule.actions.length === 0 && (
              <p className="text-[10px] text-muted">لم يتم إضافة أي إجراءات بعد</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-3">
          <Button variant="primary" size="sm" onClick={() => onSave?.()}>
            <Save className="h-3.5 w-3.5" />
            حفظ
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
            إلغاء
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ConditionRow({
  condition,
  onUpdate,
  onRemove,
}: {
  condition: PersonalizationCondition;
  onUpdate: (patch: Partial<PersonalizationCondition>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr,1fr,1fr,auto] items-end gap-2 text-xs">
      <select
        value={condition.type}
        onChange={(e) => onUpdate({ type: e.target.value as PersonalizationConditionType })}
        className="rounded-input border border-border bg-bg px-2 py-1 text-xs"
      >
        {Object.entries(CONDITION_TYPE_LABELS).map(([val, label]) => (
          <option key={val} value={val}>
            {label}
          </option>
        ))}
      </select>
      <select
        value={condition.operator}
        onChange={(e) =>
          onUpdate({ operator: e.target.value as PersonalizationConditionOperator })
        }
        className="rounded-input border border-border bg-bg px-2 py-1 text-xs"
      >
        {OPERATOR_VALUES.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op as PersonalizationConditionOperator]}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={
          typeof condition.value === "object" && condition.value !== null
            ? JSON.stringify(condition.value)
            : String(condition.value || "")
        }
        onChange={(e) => onUpdate({ value: e.target.value })}
        className="rounded-input border border-border bg-bg px-2 py-1 text-xs"
        placeholder="قيمة"
      />
      <button
        onClick={onRemove}
        className="rounded p-1 text-muted hover:bg-error-soft hover:text-error"
        title="حذف"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function ActionRow({
  action,
  onUpdate,
  onRemove,
}: {
  action: PersonalizationAction;
  index?: number;
  onUpdate: (patch: Partial<PersonalizationAction>) => void;
  onRemove: () => void;
}) {
  const params = action.config as Record<string, string> || {};

  return (
    <div className="grid grid-cols-[1fr,1.5fr,auto] items-end gap-2 text-xs">
      <select
        value={action.type}
        onChange={(e) =>
          onUpdate({ type: e.target.value as PersonalizationActionType, config: {} })
        }
        className="rounded-input border border-border bg-bg px-2 py-1 text-xs"
      >
        {ACTION_TYPE_VALUES.map((val) => (
          <option key={val} value={val}>
            {ACTION_TYPE_LABELS[val]}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={params?.targetIds?.toString() || params?.ids?.toString() || ""}
        onChange={(e) =>
          onUpdate({
            config: { ...params, targetIds: e.target.value },
          })
        }
        className="rounded-input border border-border bg-bg px-2 py-1 text-xs"
        placeholder="معرّفات مستهدفة (اختياري)"
      />
      <button
        onClick={onRemove}
        className="rounded p-1 text-muted hover:bg-error-soft hover:text-error"
        title="حذف"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
