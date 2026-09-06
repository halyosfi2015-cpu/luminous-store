import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

type PersonalizationAction = {
  type: string;
  priority: number;
  config: Record<string, unknown>;
};

type RuleRow = {
  id: string;
  name: { en?: string; ar?: string } | string;
  description: { en?: string; ar?: string } | string;
  context: string | null;
  conditions: unknown;
  actions: unknown;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  priority: number;
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathname = url.searchParams.get("pathname") || "/";
    const cartItemCount = Number(url.searchParams.get("cartItemCount")) || 0;
    const cartValue = Number(url.searchParams.get("cartValue")) || 0;
    const userAgent = request.headers.get("user-agent");
    const deviceType = /tablet|ipad/.test(userAgent || "")
      ? "tablet"
      : /mobile|android|iphone/.test(userAgent || "")
      ? "mobile"
      : "desktop";

    const supabase = createAdminClient();

    // Check if personalization is enabled
    const { data: settings } = await supabase
      .from("site_settings")
      .select("value")
      .or("key.eq.ai.personalization.enabled,key.eq.personalization_enabled");
    const settingRow = (settings?.[0] as { value: unknown } | undefined);
    const enabled = settingRow?.value === true || settingRow?.value === "true";
    if (!enabled) {
      return NextResponse.json({ actions: [], matchedRules: [] });
    }

    // Fetch active rules
    const { data: rulesRaw } = await supabase
      .from("personalization_rules")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: false });

    const rules = (rulesRaw ?? []) as RuleRow[];
    if (rules.length === 0) {
      return NextResponse.json({ actions: [], matchedRules: [] });
    }

    const now = new Date().toISOString();
    const matchedActions: PersonalizationAction[] = [];
    const matchedRuleNames: { id: string; name: string; nameAr: string }[] = [];

    for (const rule of rules) {
      // Check date range
      const startOk = !rule.starts_at || rule.starts_at <= now;
      const endOk = !rule.ends_at || rule.ends_at >= now;
      if (!startOk || !endOk) continue;

      // Check context
      const ruleContext = rule.context;
      if (ruleContext) {
        const isHomepage = pathname === "/" || pathname === "";
        const isCategory = pathname.startsWith("/categories");
        const isProduct = pathname.startsWith("/products");
        const isCart = pathname === "/cart";
        const isCheckout = pathname === "/checkout";
        const isSearch = pathname === "/search";

        const contextMatch =
          (ruleContext === "homepage" && isHomepage) ||
          (ruleContext === "category_page" && isCategory) ||
          (ruleContext === "product_page" && isProduct) ||
          (ruleContext === "cart" && isCart) ||
          (ruleContext === "checkout" && isCheckout) ||
          (ruleContext === "search" && isSearch);
        if (!contextMatch) continue;
      }

      // Evaluate conditions
      const conditions = (rule.conditions ?? []) as Array<{
        type: string;
        operator: string;
        value: unknown;
        field?: string;
      }>;
      let allMatch = true;
      for (const cond of conditions) {
        if (!evaluateCondition(cond, { cartItemCount, cartValue, deviceType, pathname }, request)) {
          allMatch = false;
          break;
        }
      }
      if (!allMatch) continue;

      // Parse name fields (JSONB)
      const nameObj = typeof rule.name === 'object' ? rule.name : {};
      const nameEn = nameObj?.en ?? '';
      const nameAr = nameObj?.ar ?? '';

      matchedRuleNames.push({
        id: rule.id,
        name: nameEn,
        nameAr: nameAr,
      });

      const actions = (rule.actions ?? []) as PersonalizationAction[];
      matchedActions.push(...actions);
    }

    matchedActions.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    return NextResponse.json(
      { actions: matchedActions, matchedRules: matchedRuleNames },
      { headers: { "Cache-Control": "private, max-age=60" } }
    );
  } catch (err) {
    console.error("personalization evaluate error:", err);
    return NextResponse.json(
      { actions: [], matchedRules: [] },
      { headers: { "Cache-Control": "private, max-age=60" } }
    );
  }
}

function evaluateCondition(
  cond: { type: string; operator: string; value: unknown; field?: string },
  ctx: { cartItemCount: number; cartValue: number; deviceType: string; pathname: string },
  request: NextRequest
): boolean {
  const { type, operator, value } = cond;

  switch (type) {
    case "device_type": {
      const target = String(value).toLowerCase();
      return operator === "equals"
        ? ctx.deviceType === target
        : ctx.deviceType !== target;
    }
    case "cart_status": {
      const target = Number(value);
      const actual = ctx.cartItemCount;
      return compareNumbers(actual, operator, target);
    }
    case "session_property": {
      const field = cond.field || "";
      if (field === "pathname") {
        const target = String(value);
        if (operator === "contains") return ctx.pathname.includes(target);
        if (operator === "equals") return ctx.pathname === target;
        if (operator === "not_equals") return ctx.pathname !== target;
        if (operator === "starts_with") return ctx.pathname.startsWith(target);
      }
      if (field === "referrer") {
        const referrer = request.headers.get("referer") || "";
        const target = String(value);
        if (operator === "contains") return referrer.includes(target);
        if (operator === "equals") return referrer === target;
      }
      return false;
    }
    case "geo_location": {
      // Geo conditions require customer auth — skip for anonymous
      return false;
    }
    default:
      return false;
  }
}

function compareNumbers(actual: number, operator: string, target: number): boolean {
  switch (operator) {
    case "equals": return actual === target;
    case "not_equals": return actual !== target;
    case "greater_than": return actual > target;
    case "less_than": return actual < target;
    case "in": return actual === target;
    case "not_in": return actual !== target;
    default: return false;
  }
}
