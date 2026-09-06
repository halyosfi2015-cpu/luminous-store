/**
 * Path B — AI-authored freeform spec DSL (pure module).
 * The AI (OpenAI when configured) authors BOTH the idea AND the full layout
 * spec. The renderer only executes validated specs — it invents nothing.
 * Without a configured provider there is NO self fallback for authoring:
 * the self engine cannot originate ideas, and simulating creativity would
 * be fake AI. The route must return 503 in that case.
 */

export type BgTint = "default" | "orchid" | "gold";

export type SpecNodeType =
  | "column"
  | "row"
  | "product"
  | "text"
  | "cta"
  | "logo"
  | "price"
  | "badge"
  | "trust"
  | "spacer";

export type TextAlign = "start" | "center" | "end";
export type TextSize = "sm" | "md" | "lg";

export interface SpecNode {
  type: SpecNodeType;
  /** For text: headline|sub|body|angle. For product: index into verified images. */
  slot?: string;
  productIndex?: number;
  /** Visual weight among siblings (1-3). Containers only. */
  weight?: number;
  /** Text override ONLY for badge nodes (short labels like «جديد»). */
  label?: string;
  /** Text styling (allowlist only). Containers ignore it. */
  align?: TextAlign;
  size?: TextSize;
  children?: SpecNode[];
}

export interface FreeformSpec {
  version: 1;
  format: "1:1" | "4:5" | "9:16";
  bgTint: BgTint;
  /** Root must be column|row. Depth ≤ 3. Nodes ≤ 14. */
  root: SpecNode;
}

export interface SpecValidation {
  ok: boolean;
  reasonAr: string | null;
}

const MAX_DEPTH = 4;
const MAX_NODES = 14;

function countNodes(n: SpecNode): number {
  return 1 + (n.children ?? []).reduce((a, c) => a + countNodes(c), 0);
}

/**
 * Strict validator. Anything outside the allowlist is rejected — the
 * renderer never executes an untrusted spec.
 */
export function validateFreeformSpec(
  spec: unknown,
  ctx: { imageCount: number; allowTrust: boolean },
): SpecValidation {
  const fail = (reasonAr: string): SpecValidation => ({ ok: false, reasonAr });
  if (!spec || typeof spec !== "object") return fail("المواصفات فارغة أو ليست كائناً");
  const s = spec as Record<string, unknown>;
  if (s.version !== 1) return fail("إصدار المواصفات غير مدعوم");
  if (!["1:1", "4:5", "9:16"].includes(String(s.format))) return fail("الصيغة غير مدعومة");
  if (!["default", "orchid", "gold"].includes(String(s.bgTint))) return fail("لون الخلفية خارج الهوية");
  const root = s.root as SpecNode | undefined;
  if (!root || (root.type !== "column" && root.type !== "row")) return fail("الجذر يجب أن يكون عموداً أو صفاً");

  let productRefs = 0;
  let trustRefs = 0;
  let logoRefs = 0;
  let ctaRefs = 0;
  const visit = (n: SpecNode, depth: number): string | null => {
    if (depth > MAX_DEPTH) return "عمق التكوين يتجاوز 4 مستويات";
    switch (n.type) {
      case "column":
      case "row": {
        if (!Array.isArray(n.children) || n.children.length === 0 || n.children.length > 4) {
          return "الحاوية يجب أن تضم 1-4 عناصر";
        }
        for (const c of n.children) {
          const err = visit(c, depth + 1);
          if (err) return err;
        }
        return null;
      }
      case "product": {
        const i = n.productIndex ?? 0;
        if (!Number.isInteger(i) || i < 0 || i >= ctx.imageCount) return "مرجع صورة خارج الصور الموثقة";
        productRefs++;
        return null;
      }
      case "text": {
        if (!["headline", "sub", "body", "angle"].includes(String(n.slot))) return "خانة نصية غير معروفة";
        if (n.align !== undefined && !["start", "center", "end"].includes(n.align)) return "محاذاة النص خارج المسموح";
        if (n.size !== undefined && !["sm", "md", "lg"].includes(n.size)) return "حجم النص خارج المسموح";
        return null;
      }
      case "badge": {
        if (typeof n.label !== "string" || n.label.trim().length === 0 || n.label.trim().length > 12) {
          return "شارة الإعلان يجب أن تكون نصاً قصيراً (حتى 12 حرفاً)";
        }
        return null;
      }
      case "cta":
        ctaRefs++;
        return null;
      case "logo":
        logoRefs++;
        return null;
      case "price":
      case "spacer":
        return null;
      case "trust": {
        trustRefs++;
        if (!ctx.allowTrust) return "عناصر الثقة غير مسموحة هنا";
        return null;
      }
      default:
        return `عنصر غير معروف: ${String((n as SpecNode).type)}`;
    }
  };

  const err = visit(root, 1);
  if (err) return fail(err);
  if (countNodes(root) > MAX_NODES) return fail("عدد العناصر يتجاوز 14");
  if (productRefs === 0) return fail("التكوين يجب أن يضم صورة منتج حقيقية واحدة على الأقل");
  if (logoRefs === 0) return fail("التكوين يجب أن يضم شعار لومينوس الرسمي");
  if (ctaRefs === 0) return fail("التكوين يجب أن يضم زر إجراء");
  if (trustRefs > 1) return fail("شريط ثقة واحد كحد أقصى");
  return { ok: true, reasonAr: null };
}

export interface AvoidContext {
  /** The 35 family identities the AI must NOT repeat. */
  familyNames: string[];
  recentAngles: string[];
  recentHooks: string[];
  recentStructures: string[];
}

/**
 * Builds the authoring prompt. Pure (testable): asserts that avoidance
 * context + verified facts + brand allowlists are all present.
 */
export function buildFreeformAuthoringPrompt(
  factsJson: string,
  objective: string,
  platform: string,
  format: string,
  ctaOptions: string[],
  avoid: AvoidContext,
  research?: { source: string; statements: string[] }[],
): { systemPrompt: string; userMessage: string } {
  const systemPrompt = [
    "You are the creative director of Luminous Derma, an Arabic beauty brand.",
    "You ORIGINATE the advertising idea AND its full visual composition.",
    "Do NOT repeat any of the known template ideas listed by the user — invent a genuinely different angle and layout.",
    "Reply with STRICT JSON only, shape:",
    '{"angleAr":string,"headline":string(<=8 words),"subheadline":string(<=14 words),"body":string|null,"cta":string,"caption":string,"hashtags":string[],"spec":{"version":1,"format":"1:1|4:5|9:16","bgTint":"default|orchid|gold","root":{...}}}',
    "Spec node types: column,row (children 1-4, depth<=4, nodes<=14), product {productIndex 0-based into the verified images}, text {slot: headline|sub|body|angle, align: start|center|end, size: sm|md|lg}, cta, logo, price, badge {label<=12 chars}, trust (max once), spacer.",
    "RULES: use ONLY the verified facts (names, prices, benefits, ingredients). Never invent products, prices, ratings, reviews, urgency, doctors, or results. CTA must be one of the provided options. Arabic, RTL. The product photo must appear at least once and stay undistorted (renderer enforces). A logo node AND a cta node are MANDATORY (validator rejects without them). Vary align/size/arrangement genuinely — do not emit the same layout twice.",
  ].join(" ");
  const researchBlock = research && research.length > 0
    ? research
      .map(
        (r, i) =>
          `Supplementary web inspiration ${i + 1} (${r.source}) — INSPIRATION ONLY, never overrides verified facts, never product truth: ${r.statements.slice(0, 4).join(" | ").slice(0, 600)}`,
      )
      .join("\n")
    : "";
  const userMessage = [
    `Objective: ${objective}. Platform: ${platform}. Format: ${format}.`,
    `Allowed CTAs: ${ctaOptions.join(" | ")}.`,
    `Verified facts (ONLY truth about the product): ${factsJson}.`,
    ...(researchBlock ? [researchBlock] : []),
    `FORBIDDEN to repeat — known template ideas: ${avoid.familyNames.join("؛ ") || "none"}.`,
    `Recently used angles (do not reuse): ${avoid.recentAngles.join("؛ ") || "none"}.`,
    `Recently used hooks (do not reuse): ${avoid.recentHooks.join("؛ ") || "none"}.`,
    `Author something new. Strict JSON only.`,
  ].join("\n");
  return { systemPrompt, userMessage };
}

export function summarizeSpec(spec: FreeformSpec): string {
  const kinds: string[] = [];
  const walk = (n: SpecNode) => {
    kinds.push(n.type);
    (n.children ?? []).forEach(walk);
  };
  walk(spec.root);
  return kinds.join(">");
}
