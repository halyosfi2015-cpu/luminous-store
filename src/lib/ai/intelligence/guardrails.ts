/**
 * AI GUARDRAILS (11.19)
 * =====================
 *
 * Enforces safety rules for AI actions. Every action passes through
 * guardrails before execution. Rules are declarative and auditable.
 *
 * Guardrail levels:
 *   - allow: No restriction
 *   - warn: Log warning but proceed
 *   - require_approval: Must have human approval
 *   - deny: Block the action entirely
 */

import type { ActionType, GuardrailRule, GuardrailCheckResult, ActionRequest } from './types';

/* ------------------------------------------------------------------------ */
/* DEFAULT GUARDRAIL RULES                                                    */
/* ------------------------------------------------------------------------ */

const DEFAULT_RULES: GuardrailRule[] = [
  // Content creation — generally safe, no approval needed
  {
    id: 'content_create',
    name: 'إنشاء محتوى',
    description: 'Content generation is advisory — always requires review before publishing.',
    level: 'allow',
    conditions: [{ field: 'actionType', operator: 'equals', value: 'content_create' }],
  },

  // Content publishing — requires approval
  {
    id: 'content_publish',
    name: 'نشر محتوى',
    description: 'Publishing content to live channels requires human approval.',
    level: 'require_approval',
    conditions: [{ field: 'actionType', operator: 'equals', value: 'content_publish' }],
  },

  // Campaign creation — requires approval
  {
    id: 'campaign_create',
    name: 'إنشاء حملة',
    description: 'Creating campaigns requires human approval as they affect marketing spend.',
    level: 'require_approval',
    conditions: [{ field: 'actionType', operator: 'equals', value: 'campaign_create' }],
  },

  // Campaign activation — requires approval
  {
    id: 'campaign_activate',
    name: 'تشغيل حملة',
    description: 'Activating a campaign requires human approval.',
    level: 'require_approval',
    conditions: [{ field: 'actionType', operator: 'equals', value: 'campaign_activate' }],
  },

  // Price changes — always require approval
  {
    id: 'price_change',
    name: 'تغيير أسعار',
    description: 'Price changes directly affect revenue and customer trust — always require approval.',
    level: 'require_approval',
    conditions: [{ field: 'actionType', operator: 'equals', value: 'price_change' }],
  },

  // Inventory adjustments — require approval
  {
    id: 'inventory_adjust',
    name: 'تعديل مخزون',
    description: 'Inventory adjustments affect order fulfillment — require approval.',
    level: 'require_approval',
    conditions: [{ field: 'actionType', operator: 'equals', value: 'inventory_adjust' }],
  },

  // Offer modification — requires approval
  {
    id: 'offer_modify',
    name: 'تعديل عرض',
    description: 'Modifying offers affects pricing and revenue — require approval.',
    level: 'require_approval',
    conditions: [{ field: 'actionType', operator: 'equals', value: 'offer_modify' }],
  },

  // Customer reactivation — warn (lower risk)
  {
    id: 'customer_reactivate',
    name: 'إعادة تنشيط عميل',
    description: 'Customer reactivation messages require approval to avoid spam.',
    level: 'require_approval',
    conditions: [{ field: 'actionType', operator: 'equals', value: 'customer_reactivate' }],
  },

  // Recommendation execution — require approval
  {
    id: 'recommendation_execute',
    name: 'تنفيذ توصية',
    description: 'Executing reorder or merchandising recommendations requires approval.',
    level: 'require_approval',
    conditions: [{ field: 'actionType', operator: 'equals', value: 'recommendation_execute' }],
  },

  // Analysis only — always safe
  {
    id: 'analysis_only',
    name: 'تحليل فقط',
    description: 'Analysis and read-only operations are always allowed.',
    level: 'allow',
    conditions: [{ field: 'actionType', operator: 'equals', value: 'analysis_only' }],
  },

  // Block any AI自主 action not explicitly allowed
  {
    id: 'unknown_action_deny',
    name: 'إجراء غير معروف',
    description: 'Any action type not explicitly listed is denied by default.',
    level: 'deny',
    conditions: [{ field: 'actionType', operator: 'equals', value: '__unknown__' }],
  },
];

/* ------------------------------------------------------------------------ */
/* GUARDRAIL ENGINE                                                           */
/* ------------------------------------------------------------------------ */

let activeRules: GuardrailRule[] = [...DEFAULT_RULES];

/**
 * Check an action against all guardrail rules.
 * Returns the first matching rule's result (most restrictive wins).
 */
export function checkGuardrails(action: ActionRequest): GuardrailCheckResult {
  const actionType = action.type;

  // Check explicit rules first
  for (const rule of activeRules) {
    for (const condition of rule.conditions) {
      if (condition.field === 'actionType') {
        if (condition.operator === 'equals' && actionType === condition.value) {
          return {
            passed: rule.level === 'allow',
            level: rule.level,
            ruleId: rule.id,
            ruleName: rule.name,
            message: rule.description,
          };
        }
      }
    }
  }

  // Default: deny unknown actions
  return {
    passed: false,
    level: 'deny',
    ruleId: 'default_deny',
    ruleName: 'Default deny',
    message: `Action type "${actionType}" is not explicitly allowed.`,
  };
}

/**
 * Check if an action requires approval.
 */
export function requiresApproval(action: ActionRequest): boolean {
  const result = checkGuardrails(action);
  return result.level === 'require_approval';
}

/**
 * Check if an action is denied.
 */
export function isDenied(action: ActionRequest): boolean {
  const result = checkGuardrails(action);
  return result.level === 'deny';
}

/**
 * Get all active guardrail rules.
 */
export function getActiveRules(): GuardrailRule[] {
  return [...activeRules];
}

/**
 * Add a custom guardrail rule.
 */
export function addGuardrailRule(rule: GuardrailRule): void {
  // Remove existing rule with same ID
  activeRules = activeRules.filter((r) => r.id !== rule.id);
  activeRules.push(rule);
}

/**
 * Remove a guardrail rule by ID.
 */
export function removeGuardrailRule(ruleId: string): void {
  activeRules = activeRules.filter((r) => r.id !== ruleId);
}

/**
 * Reset to default rules.
 */
export function resetGuardrails(): void {
  activeRules = [...DEFAULT_RULES];
}
